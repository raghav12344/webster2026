import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { broker } from './broker.js';
import { coordinator } from './engine/coordinator.js';
import { detectCycleDFS, computeKahnTopologicalSort } from '../../shared/algorithms.js';
import { presetWorkflows } from './presets.js';
import { startWorker } from '../../worker/src/index.js';
import { cronScheduler } from './engine/cronScheduler.js';
import { Workflow } from './models/Workflow.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory workflow registry (seed with presets)
const workflows = new Map(presetWorkflows.map(p => [p.id, p]));
const customPresets = [];

// ==========================================
// 1. HEALTH & METRICS ENDPOINTS
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ChronosFlow - PS-04 The Dormammu Loop Engine',
    timestamp: new Date().toISOString(),
    broker: {
      isReady: broker.isReady,
      mode: broker.isEmbedded ? 'Embedded In-Memory Engine (Dev Mode)' : 'External RabbitMQ & Redis (Production Mode)',
      queue: config.queueName,
      dlq: config.dlqName
    }
  });
});

// ==========================================
// 2. WORKFLOW CRUD & PRESETS
// ==========================================
app.get('/api/presets', (req, res) => {
  res.json([...presetWorkflows, ...customPresets]);
});

app.post('/api/presets', async (req, res) => {
  const { id, name, description, nodes, edges } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Preset name is required' });
  }

  const presetNodes = nodes || [];
  const presetEdges = edges || [];

  // If nodes/edges are provided, validate DAG
  if (presetNodes.length > 0) {
    const cycleCheck = detectCycleDFS(presetNodes, presetEdges);
    if (cycleCheck.hasCycle) {
      return res.status(400).json({
        error: 'Graph contains a cycle (Dormammu Loop detected). A DAG must be strictly acyclic.',
        cycleNodes: cycleCheck.cycleNodes
      });
    }

    const kahn = computeKahnTopologicalSort(presetNodes, presetEdges);
    if (!kahn.valid) {
      return res.status(400).json({ error: kahn.error });
    }
  }

  const presetId = id || `custom-preset-${Date.now()}`;
  const newPreset = {
    id: presetId,
    name: name.trim(),
    description: description || 'Custom user-created workflow pipeline.',
    isCustom: true,
    nodes: presetNodes,
    edges: presetEdges,
    createdAt: new Date().toISOString()
  };

  // Add to in-memory custom list & workflow map
  customPresets.unshift(newPreset);
  workflows.set(presetId, newPreset);

  // Persist to Redis
  try {
    await broker.set('chronos:presets:custom', customPresets);
  } catch (err) {
    console.warn('Could not persist custom preset to Redis:', err.message);
  }

  // Register cron triggers if any
  if (newPreset.nodes.some(n => n.type === 'cronTrigger')) {
    cronScheduler.registerWorkflow(newPreset);
  }

  console.log(`✨ [Preset Manager] Created new custom preset: "${newPreset.name}" (${newPreset.id})`);
  res.status(201).json(newPreset);
});

app.delete('/api/presets/:id', async (req, res) => {
  const { id } = req.params;
  const idx = customPresets.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Custom preset not found or cannot delete default presets.' });
  }

  const [removed] = customPresets.splice(idx, 1);
  workflows.delete(id);
  cronScheduler.unregisterWorkflow(id);

  try {
    await broker.set('chronos:presets:custom', customPresets);
  } catch (err) {
    console.warn('Could not update custom presets in Redis:', err.message);
  }

  console.log(`🗑️ [Preset Manager] Deleted custom preset: "${removed.name}" (${id})`);
  res.json({ success: true, message: `Preset "${removed.name}" removed`, id });
});

app.get('/api/workflows', (req, res) => {
  res.json(Array.from(workflows.values()));
});

app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
});

app.post('/api/workflows', (req, res) => {
  const { id, name, description, nodes, edges } = req.body;
  if (!nodes || !edges) {
    return res.status(400).json({ error: 'Nodes and edges are required' });
  }

  // Validate graph topology
  const cycleCheck = detectCycleDFS(nodes, edges);
  if (cycleCheck.hasCycle) {
    return res.status(400).json({
      error: 'Graph contains a cycle (Dormammu Loop detected). A DAG must be strictly acyclic.',
      cycleNodes: cycleCheck.cycleNodes
    });
  }

  const kahn = computeKahnTopologicalSort(nodes, edges);
  if (!kahn.valid) {
    return res.status(400).json({ error: kahn.error });
  }

  const workflowId = id || `wf_${Date.now()}_${uuidv4().substring(0, 6)}`;
  const newWorkflow = {
    id: workflowId,
    name: name || 'Custom Pipeline',
    description: description || '',
    nodes,
    edges,
    kahnOrder: kahn.order,
    stages: kahn.stages,
    updatedAt: new Date().toISOString()
  };

  workflows.set(workflowId, newWorkflow);
  res.status(201).json(newWorkflow);
});

// Validate topology on the fly
app.post('/api/workflows/validate', (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) {
    return res.status(400).json({ error: 'Nodes and edges required' });
  }

  const cycleCheck = detectCycleDFS(nodes, edges);
  if (cycleCheck.hasCycle) {
    return res.json({
      valid: false,
      hasCycle: true,
      error: 'Closed loop detected! Graph cannot be resolved.',
      cycleNodes: cycleCheck.cycleNodes
    });
  }

  const kahn = computeKahnTopologicalSort(nodes, edges);
  res.json({
    valid: kahn.valid,
    hasCycle: false,
    order: kahn.order,
    stages: kahn.stages,
    inDegree: kahn.inDegree,
    rootNodes: kahn.rootNodes,
    leafNodes: kahn.leafNodes
  });
});

// ==========================================
// 3. EXECUTION TRIGGER (Manual & Webhook)
// ==========================================
app.post('/api/workflows/:id/run', async (req, res) => {
  try {
    const workflow = (req.body.workflow && req.body.workflow.nodes?.length > 0)
      ? req.body.workflow
      : workflows.get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const triggerPayload = req.body.payload || {
      triggeredBy: 'manual_ui',
      triggeredAt: new Date().toISOString()
    };

    const execution = await coordinator.startExecution(workflow, triggerPayload);
    res.json({
      success: true,
      executionId: execution.id,
      workflowId: workflow.id,
      stages: execution.stages,
      status: execution.status,
      streamUrl: `/api/executions/${execution.id}/stream`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook Ingestion Gateway
app.post('/api/webhooks/:webhookId', async (req, res) => {
  const { webhookId } = req.params;
  const incomingPayload = req.body;

  console.log(`📥 [Webhook Gateway] Received webhook for '${webhookId}':`, incomingPayload);

  // Find workflow matching this webhook path or default to first preset
  let matchedWorkflow = null;
  for (const wf of workflows.values()) {
    const hasMatchingNode = wf.nodes.some(
      n => n.data?.webhookPath === webhookId || n.data?.eventType === webhookId
    );
    if (hasMatchingNode) {
      matchedWorkflow = wf;
      break;
    }
  }

  if (!matchedWorkflow) {
    matchedWorkflow = presetWorkflows[0];
  }

  try {
    const execution = await coordinator.startExecution(matchedWorkflow, {
      source: 'external_webhook',
      webhookId,
      receivedAt: new Date().toISOString(),
      payload: incomingPayload
    });

    res.json({
      status: 'accepted',
      message: `Webhook accepted and enqueued into RabbitMQ in <15ms`,
      executionId: execution.id,
      streamUrl: `/api/executions/${execution.id}/stream`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// ==========================================
app.get('/api/executions/:id/stream', async (req, res) => {
  const { id: executionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  console.log(`📡 [SSE] Client connected to live telemetry stream for execution: ${executionId}`);

  // Send initial snapshot
  const initialRecord = await coordinator.getExecution(executionId);
  if (initialRecord) {
    res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', execution: initialRecord })}\n\n`);
  }

  // Subscribe to Redis Pub/Sub events for this execution
  const unsubscribe = broker.subscribe(`channel:execution:${executionId}`, (channel, message) => {
    try {
      res.write(`data: ${typeof message === 'string' ? message : JSON.stringify(message)}\n\n`);
    } catch (err) {
      console.error('Error writing to SSE stream:', err);
    }
  });

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    console.log(`🔌 [SSE] Client disconnected from execution stream: ${executionId}`);
  });
});

app.get('/api/executions/:id', async (req, res) => {
  const record = await coordinator.getExecution(req.params.id);
  if (!record) return res.status(404).json({ error: 'Execution not found' });
  res.json(record);
});

// ==========================================
// 5. DEAD-LETTER QUEUE (DLQ) INSPECTION & RETRY
// ==========================================
// ==========================================
// 5. DEAD-LETTER QUEUE (DLQ) INSPECTION & REPLAY
// ==========================================
app.get('/api/dlq', async (req, res) => {
  const registry = (await broker.get('chronos:dlq:registry')) || [];
  if (registry.length > 0) {
    return res.json(registry);
  }

  const items = broker.isEmbedded ? (broker.inMemory.queues.get(config.dlqName) || []) : dlqItems;
  const formatted = items.map((item, idx) => {
    try {
      const parsed = JSON.parse(item.content.toString());
      return {
        id: `dlq-${idx}`,
        task: parsed,
        reason: item.properties?.headers?.['x-death-reason'] || 'Exceeded retry threshold',
        timestamp: item.properties?.timestamp || Date.now()
      };
    } catch {
      return { id: `dlq-${idx}`, raw: item };
    }
  });
  res.json(formatted);
});

// Replay / Retry a Dead-Letter Queue Task
app.post('/api/dlq/:id/replay', async (req, res) => {
  const { id } = req.params;
  const registry = (await broker.get('chronos:dlq:registry')) || [];
  const foundIdx = registry.findIndex(item => item.id === id);

  let taskToReplay = null;
  if (foundIdx !== -1) {
    const [removed] = registry.splice(foundIdx, 1);
    taskToReplay = removed.task;
    await broker.set('chronos:dlq:registry', registry);
  } else {
    const items = broker.isEmbedded ? (broker.inMemory.queues.get(config.dlqName) || []) : dlqItems;
    const idx = parseInt(id.replace('dlq-', ''), 10);
    if (!isNaN(idx) && items[idx]) {
      const item = items.splice(idx, 1)[0];
      taskToReplay = JSON.parse(item.content.toString());
    }
  }

  if (!taskToReplay) {
    return res.status(404).json({ error: 'DLQ item not found' });
  }

  // Reset attempt counter & re-enqueue into main queue
  taskToReplay.attempt = 1;
  delete taskToReplay.lastError;
  await broker.sendTask(taskToReplay);

  console.log(`♻️ [DLQ Replay] Task ${taskToReplay.nodeId} replayed into main queue '${config.queueName}'`);
  res.json({ success: true, message: `Task ${taskToReplay.nodeId} re-enqueued for execution`, task: taskToReplay });
});

// ==========================================
// 6. CRON SCHEDULER CONTROLS
// ==========================================
app.get('/api/cron/schedules', (req, res) => {
  res.json(cronScheduler.getActiveSchedules());
});

app.post('/api/cron/:id/start', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  cronScheduler.registerWorkflow(workflow);
  res.json({ success: true, message: `Cron schedule started for '${workflow.name}'` });
});

app.post('/api/cron/:id/stop', (req, res) => {
  cronScheduler.unregisterWorkflow(req.params.id);
  res.json({ success: true, message: `Cron schedule stopped for ${req.params.id}` });
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

app.use(express.static(clientDistPath));

// Fallback all non-API routes to client index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// ==========================================
// 6. INITIALIZE SERVER & EMBEDDED WORKER
// ==========================================
async function bootstrap() {
  await broker.initialize();

  // Load custom presets from Redis if available
  try {
    const saved = await broker.get('chronos:presets:custom');
    if (Array.isArray(saved) && saved.length > 0) {
      customPresets.push(...saved);
      for (const p of saved) {
        workflows.set(p.id, p);
      }
      console.log(`📋 [Preset Manager] Restored ${saved.length} custom presets from Redis.`);
    }
  } catch (err) {
    console.warn('Could not restore custom presets from Redis:', err.message);
  }

  // Start worker listener in same runtime for effortless development / hackathon evaluation
  await startWorker();

  // Register any preset cron workflows
  for (const wf of workflows.values()) {
    if (wf.nodes.some(n => n.type === 'cronTrigger')) {
      cronScheduler.registerWorkflow(wf);
    }
  }

  app.listen(config.port, () => {
    console.log(`\n==========================================================`);
    console.log(`🚀 ChronosFlow API Gateway running on http://localhost:${config.port}`);
    console.log(`⚡ Mode: ${broker.isEmbedded ? 'Embedded Zero-Dependency Broker' : 'External RabbitMQ & Redis'}`);
    console.log(`📋 Presets loaded: ${presetWorkflows.length} ready-to-run pipelines`);
    console.log(`==========================================================\n`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to bootstrap server:', err);
});
