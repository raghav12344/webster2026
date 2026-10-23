import { broker } from '../../server/src/broker.js';
import { coordinator } from '../../server/src/engine/coordinator.js';
import { config } from '../../server/src/config.js';
import { calculateBackoffWithJitter } from '../../shared/algorithms.js';
import { TaskStatus, NodeTypes } from '../../shared/types.js';
import {
  executeWebhookTrigger,
  executeHttpRequest,
  executeDataTransform,
  executeDelayTimer
} from './handlers.js';

const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).substring(7)}`;

async function handleTask(taskPayload, rawMsg) {
  const { executionId, nodeId, nodeType, attempt = 1 } = taskPayload;
  console.log(`\n⚙️ [${WORKER_ID}] Processing task: ${nodeId} (${nodeType}) Attempt ${attempt}/${config.maxRetries}`);

  // 1. Idempotency Check with Redis SETNX (zero double-executions)
  const lockKey = `lock:task:${executionId}:${nodeId}:${attempt}`;
  const lockAcquired = await broker.setnx(lockKey, WORKER_ID);

  if (!lockAcquired) {
    console.warn(`🔒 [${WORKER_ID}] Task ${nodeId} (Attempt ${attempt}) already locked by another worker. Skipping duplicate.`);
    broker.ack(rawMsg);
    return;
  }

  // 2. Mark Node as RUNNING
  await coordinator.updateNodeStatus(
    executionId,
    nodeId,
    TaskStatus.RUNNING,
    `Worker ${WORKER_ID} acquired task execution lock (Attempt ${attempt}/${config.maxRetries})`
  );

  try {
    let result;
    switch (nodeType) {
      case NodeTypes.WEBHOOK_TRIGGER:
      case NodeTypes.MANUAL_TRIGGER:
      case NodeTypes.CRON_TRIGGER:
        result = await executeWebhookTrigger(taskPayload);
        break;

      case NodeTypes.HTTP_REQUEST:
        result = await executeHttpRequest(taskPayload);
        break;

      case NodeTypes.DATA_TRANSFORM:
        result = await executeDataTransform(taskPayload);
        break;

      case NodeTypes.DELAY_TIMER:
        result = await executeDelayTimer(taskPayload);
        break;

      default:
        result = {
          success: true,
          data: { processed: true, raw: taskPayload.inputPayload },
          logs: [`Executed default task runner for type: ${nodeType}`]
        };
        break;
    }

    // Acknowledge task in RabbitMQ
    broker.ack(rawMsg);

    // Notify coordinator of successful task completion
    await coordinator.handleTaskSuccess(executionId, nodeId, result.data, result.logs);
  } catch (err) {
    console.error(`❌ [${WORKER_ID}] Task ${nodeId} failed: ${err.message}`);

    if (attempt < config.maxRetries) {
      // Calculate Exponential Backoff with Jitter
      const backoffMs = calculateBackoffWithJitter(attempt, config.retryBaseDelayMs, config.retryMaxDelayMs);
      const nextAttempt = attempt + 1;

      console.log(`🔄 [Retry Protocol] Retrying ${nodeId} in ${backoffMs}ms (Attempt ${nextAttempt}/${config.maxRetries})`);

      await coordinator.updateNodeStatus(
        executionId,
        nodeId,
        TaskStatus.RETRYING,
        `Task error: "${err.message}". Retrying in ${backoffMs}ms with exponential backoff & jitter (Attempt ${nextAttempt}/${config.maxRetries})`
      );

      // Re-enqueue after backoff delay
      setTimeout(async () => {
        await broker.sendTask({
          ...taskPayload,
          attempt: nextAttempt,
          lastError: err.message
        });
      }, backoffMs);

      broker.ack(rawMsg);
    } else {
      // Exceeded Max Retries -> Route to Dead-Letter Queue (DLQ)
      console.warn(`💀 [DLQ] Task ${nodeId} reached max retry cap (${config.maxRetries}). Routing to Dead-Letter Queue.`);

      await coordinator.updateNodeStatus(
        executionId,
        nodeId,
        TaskStatus.DEAD_LETTER,
        `FATAL: Task failed after ${config.maxRetries} attempts. Routed to Dead-Letter Queue (DLQ). Last error: ${err.message}`
      );

      // NACK routes message into RabbitMQ DLX
      broker.nack(rawMsg, false);

      await coordinator.handleTaskDeadLetter(executionId, nodeId, err.message, [
        `Fatal failure after ${config.maxRetries} retries`,
        `Error: ${err.message}`
      ]);
    }
  }
}

export async function startWorker() {
  await broker.initialize();
  console.log(`👷 Worker Process [${WORKER_ID}] started. Listening on RabbitMQ queue '${config.queueName}'...`);

  await broker.consumeTasks(async (rawMsg) => {
    try {
      const contentStr = rawMsg.content.toString();
      const payload = JSON.parse(contentStr);
      await handleTask(payload, rawMsg);
    } catch (parseErr) {
      console.error('Error parsing task message:', parseErr);
      broker.nack(rawMsg, false);
    }
  });
}

// If executed directly
if (process.argv[1]?.endsWith('worker/src/index.js')) {
  startWorker();
}
