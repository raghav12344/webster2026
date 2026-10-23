import { v4 as uuidv4 } from 'uuid';
import { computeKahnTopologicalSort } from '../../../shared/algorithms.js';
import { TaskStatus, ExecutionStatus } from '../../../shared/types.js';
import { broker } from '../broker.js';

class DAGCoordinator {
  constructor() {
    this.activeExecutions = new Map();
  }

  /**
   * Initializes and dispatches a DAG workflow run.
   */
  async startExecution(workflow, triggerPayload = {}) {
    const { id: workflowId, name, nodes, edges } = workflow;

    // 1. Compute Kahn's Topological Sort & Dependency Resolution
    const kahn = computeKahnTopologicalSort(nodes, edges);
    if (!kahn.valid) {
      throw new Error(`Graph validation failed: ${kahn.error}`);
    }

    const executionId = `exec_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const startTime = Date.now();

    // 2. Prepare In-Memory / Redis Execution State
    const nodeStates = {};
    const nodeOutputs = {};
    const inDegreeTrack = { ...kahn.inDegree };

    for (const node of nodes) {
      nodeStates[node.id] = {
        id: node.id,
        type: node.type,
        label: node.data?.label || node.id,
        status: kahn.inDegree[node.id] === 0 ? TaskStatus.PENDING : TaskStatus.IDLE,
        attempt: 0,
        logs: [],
        output: null,
        error: null,
        startedAt: null,
        completedAt: null
      };
    }

    const executionRecord = {
      id: executionId,
      workflowId,
      workflowName: name || 'Untitled Workflow',
      status: ExecutionStatus.RUNNING,
      startTime,
      endTime: null,
      nodes,
      edges,
      kahnOrder: kahn.order,
      stages: kahn.stages,
      inDegree: inDegreeTrack,
      adjacency: kahn.adjacency,
      nodeStates,
      nodeOutputs,
      triggerPayload,
      completedNodesCount: 0,
      totalNodesCount: nodes.length
    };

    // Store in Redis / Map
    await broker.set(`execution:${executionId}`, executionRecord);
    this.activeExecutions.set(executionId, executionRecord);

    // Publish Initial Run Event via Redis Pub/Sub
    await this.broadcastEvent(executionId, {
      type: 'EXECUTION_STARTED',
      executionId,
      workflowId,
      timestamp: startTime,
      totalNodes: nodes.length,
      stages: kahn.stages,
      order: kahn.order
    });

    console.log(`🚀 [Coordinator] Started Execution ${executionId} with ${kahn.rootNodes.length} root nodes.`);

    // 3. Dispatch Root Nodes (in-degree == 0) to RabbitMQ
    for (const rootNodeId of kahn.rootNodes) {
      const nodeDef = nodes.find(n => n.id === rootNodeId);
      await this.dispatchTask(executionId, nodeDef, triggerPayload);
    }

    return executionRecord;
  }

  /**
   * Enqueues an individual task into the RabbitMQ queue.
   */
  async dispatchTask(executionId, nodeDef, incomingData = {}) {
    const taskPayload = {
      executionId,
      nodeId: nodeDef.id,
      nodeType: nodeDef.type,
      config: nodeDef.data || {},
      inputPayload: incomingData,
      attempt: 1,
      enqueuedAt: Date.now()
    };

    // Update node status to PENDING
    await this.updateNodeStatus(executionId, nodeDef.id, TaskStatus.PENDING, 'Task enqueued into RabbitMQ');

    // Send to RabbitMQ queue
    await broker.sendTask(taskPayload);
    console.log(`📦 [RabbitMQ] Enqueued task: ${nodeDef.id} (${nodeDef.type}) for execution ${executionId}`);
  }

  /**
   * Called by Worker when a task finishes successfully.
   */
  async handleTaskSuccess(executionId, nodeId, output, logs = []) {
    const exec = await this.getExecution(executionId);
    if (!exec) return;

    exec.nodeStates[nodeId].status = TaskStatus.SUCCESS;
    exec.nodeStates[nodeId].output = output;
    exec.nodeStates[nodeId].logs.push(...logs);
    exec.nodeStates[nodeId].completedAt = Date.now();
    exec.nodeOutputs[nodeId] = output;
    exec.completedNodesCount++;

    console.log(`✅ [Coordinator] Node ${nodeId} SUCCEEDED. Outputs stored.`);

    await this.broadcastEvent(executionId, {
      type: 'NODE_STATUS_CHANGE',
      nodeId,
      status: TaskStatus.SUCCESS,
      output,
      logs
    });

    // Resolve downstream dependencies (decrement child in-degrees)
    const children = exec.adjacency[nodeId] || [];
    for (const childId of children) {
      exec.inDegree[childId]--;
      console.log(`  ↪ Downstream child ${childId} remaining in-degree: ${exec.inDegree[childId]}`);

      // If all prerequisites are met (in-degree == 0), unlock and dispatch child!
      if (exec.inDegree[childId] === 0) {
        const childNodeDef = exec.nodes.find(n => n.id === childId);
        // Collate inputs from all parent nodes
        const parentInputs = {};
        for (const [pId, pOut] of Object.entries(exec.nodeOutputs)) {
          if ((exec.adjacency[pId] || []).includes(childId)) {
            parentInputs[pId] = pOut;
          }
        }

        console.log(`⚡ [Coordinator] Prerequisites satisfied! Dispatching child node ${childId} to RabbitMQ.`);
        await this.dispatchTask(executionId, childNodeDef, parentInputs);
      }
    }

    // Check if entire DAG workflow is complete
    if (exec.completedNodesCount >= exec.totalNodesCount) {
      exec.status = ExecutionStatus.COMPLETED;
      exec.endTime = Date.now();
      const durationMs = exec.endTime - exec.startTime;

      await this.broadcastEvent(executionId, {
        type: 'EXECUTION_COMPLETED',
        executionId,
        status: ExecutionStatus.COMPLETED,
        durationMs,
        summary: `All ${exec.totalNodesCount} nodes completed successfully in ${durationMs}ms.`
      });
      console.log(`🏁 [Coordinator] Execution ${executionId} COMPLETED in ${durationMs}ms!`);
    }

    await broker.set(`execution:${executionId}`, exec);
    this.activeExecutions.set(executionId, exec);
  }

  /**
   * Called when a task fails permanently and is sent to Dead-Letter Queue.
   */
  async handleTaskDeadLetter(executionId, nodeId, errorMsg, logs = []) {
    const exec = await this.getExecution(executionId);
    if (!exec) return;

    exec.nodeStates[nodeId].status = TaskStatus.DEAD_LETTER;
    exec.nodeStates[nodeId].error = errorMsg;
    exec.nodeStates[nodeId].logs.push(...logs);
    exec.nodeStates[nodeId].completedAt = Date.now();
    exec.status = ExecutionStatus.PARTIALLY_FAILED;

    // Save to DLQ registry
    const dlqItem = {
      id: `dlq-${Date.now()}_${nodeId}`,
      executionId,
      nodeId,
      task: {
        executionId,
        nodeId,
        nodeType: exec.nodeStates[nodeId].type,
        config: exec.nodes.find(n => n.id === nodeId)?.data || {},
        attempt: 3,
        lastError: errorMsg
      },
      reason: 'Max exponential backoff retries exceeded (Cap: 3)',
      timestamp: Date.now()
    };

    const existingDLQ = (await broker.get('chronos:dlq:registry')) || [];
    existingDLQ.unshift(dlqItem);
    await broker.set('chronos:dlq:registry', existingDLQ.slice(0, 50));

    await this.broadcastEvent(executionId, {
      type: 'NODE_STATUS_CHANGE',
      nodeId,
      status: TaskStatus.DEAD_LETTER,
      error: errorMsg,
      logs
    });

    // Check if entire execution has halted or has no remaining active/runnable nodes
    const hasActiveNodes = Object.values(exec.nodeStates).some(
      ns => ns.status === TaskStatus.RUNNING || ns.status === TaskStatus.PENDING || ns.status === TaskStatus.RETRYING
    );

    if (!hasActiveNodes) {
      exec.endTime = Date.now();
      const durationMs = exec.endTime - exec.startTime;
      await this.broadcastEvent(executionId, {
        type: 'EXECUTION_COMPLETED',
        executionId,
        status: ExecutionStatus.PARTIALLY_FAILED,
        durationMs,
        summary: `Pipeline halted: Task "${nodeId}" routed to Dead-Letter Queue (DLQ). Downstream branches safely protected.`
      });
      console.log(`🏁 [Coordinator] Execution ${executionId} TERMINATED (DLQ halt) in ${durationMs}ms.`);
    }

    await broker.set(`execution:${executionId}`, exec);
    this.activeExecutions.set(executionId, exec);
    console.warn(`💀 [DLQ] Node ${nodeId} routed to Dead-Letter Queue: ${errorMsg}`);
  }

  async updateNodeStatus(executionId, nodeId, status, message = null) {
    const exec = await this.getExecution(executionId);
    if (exec && exec.nodeStates[nodeId]) {
      exec.nodeStates[nodeId].status = status;
      if (status === TaskStatus.RUNNING && !exec.nodeStates[nodeId].startedAt) {
        exec.nodeStates[nodeId].startedAt = Date.now();
      }
      if (message) {
        exec.nodeStates[nodeId].logs.push(`[${new Date().toISOString()}] ${message}`);
      }
      await broker.set(`execution:${executionId}`, exec);
    }

    await this.broadcastEvent(executionId, {
      type: 'NODE_STATUS_CHANGE',
      nodeId,
      status,
      message
    });
  }

  async broadcastEvent(executionId, eventData) {
    const channel = `channel:execution:${executionId}`;
    const payload = {
      ...eventData,
      executionId,
      timestamp: Date.now()
    };
    await broker.publish(channel, payload);
  }

  async getExecution(executionId) {
    let exec = this.activeExecutions.get(executionId);
    if (!exec) {
      exec = await broker.get(`execution:${executionId}`);
      if (exec) this.activeExecutions.set(executionId, exec);
    }
    return exec;
  }
}

export const coordinator = new DAGCoordinator();
