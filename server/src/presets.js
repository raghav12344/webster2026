import { NodeTypes } from '../../shared/types.js';

export const presetWorkflows = [
  {
    id: 'dormammu-loop-breaker',
    name: '01: The Dormammu Loop Breaker (Core Pipeline)',
    description: 'Demonstrates a complete event-driven pipeline: Webhook Trigger -> Delay Timer -> Data Transform -> HTTP Request.',
    nodes: [
      {
        id: 'node-1',
        type: NodeTypes.WEBHOOK_TRIGGER,
        position: { x: 100, y: 180 },
        data: {
          label: 'Webhook Trigger',
          eventType: 'order.created',
          webhookPath: 'order-events'
        }
      },
      {
        id: 'node-2',
        type: NodeTypes.DELAY_TIMER,
        position: { x: 380, y: 180 },
        data: {
          label: 'Debounce Delay (1.5s)',
          delayMs: 1500
        }
      },
      {
        id: 'node-3',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 660, y: 180 },
        data: {
          label: 'JSON Payload Normalizer',
          transformType: 'custom',
          expression: 'Normalize customer data & calculate order total'
        }
      },
      {
        id: 'node-4',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 940, y: 180 },
        data: {
          label: 'Payment Gateway HTTP',
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'POST',
          simulateFailure: false
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
      { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true }
    ]
  },
  {
    id: 'resilient-retry-dlq',
    name: '02: Fault-Tolerant Exponential Backoff & DLQ Demo',
    description: 'Demonstrates automated failure recovery: an unstable HTTP node fails, triggers exponential backoff with jitter retries, and routes to Dead-Letter Queue (DLQ).',
    nodes: [
      {
        id: 'node-retry-1',
        type: NodeTypes.MANUAL_TRIGGER,
        position: { x: 100, y: 200 },
        data: {
          label: 'Manual Dispatcher',
          eventType: 'test.retry_protocol'
        }
      },
      {
        id: 'node-retry-2',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 420, y: 200 },
        data: {
          label: 'Flaky Microservice (503 Gateway)',
          url: 'https://api.internal.service/flaky-endpoint',
          method: 'GET',
          simulateFailure: true // Forces retry loop & DLQ demonstration!
        }
      },
      {
        id: 'node-retry-3',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 740, y: 200 },
        data: {
          label: 'Downstream Consumer (Safely Protected)',
          transformType: 'extract',
          extractKey: 'result'
        }
      }
    ],
    edges: [
      { id: 'er1-2', source: 'node-retry-1', target: 'node-retry-2', animated: true },
      { id: 'er2-3', source: 'node-retry-2', target: 'node-retry-3', animated: true }
    ]
  },
  {
    id: 'diamond-concurrency',
    name: '03: Diamond DAG High-Concurrency Execution',
    description: 'Demonstrates asynchronous parallel worker execution: 1 Trigger splits into 2 concurrent branches, both executing simultaneously and joining at an Aggregate node.',
    nodes: [
      {
        id: 'dia-1',
        type: NodeTypes.WEBHOOK_TRIGGER,
        position: { x: 80, y: 200 },
        data: {
          label: 'Ingest Trigger',
          eventType: 'user.signup'
        }
      },
      {
        id: 'dia-2',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 380, y: 90 },
        data: {
          label: 'Branch A: Send Welcome Email',
          url: 'mock://email-service/send',
          method: 'POST'
        }
      },
      {
        id: 'dia-3',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 380, y: 310 },
        data: {
          label: 'Branch B: Initialize User Profile',
          transformType: 'custom',
          expression: 'Create default preferences & tier'
        }
      },
      {
        id: 'dia-4',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 720, y: 200 },
        data: {
          label: 'Join: Aggregate & Finalize',
          transformType: 'aggregate'
        }
      }
    ],
    edges: [
      { id: 'ed-1-2', source: 'dia-1', target: 'dia-2', animated: true },
      { id: 'ed-1-3', source: 'dia-1', target: 'dia-3', animated: true },
      { id: 'ed-2-4', source: 'dia-2', target: 'dia-4', animated: true },
      { id: 'ed-3-4', source: 'dia-3', target: 'dia-4', animated: true }
    ]
  }
];
