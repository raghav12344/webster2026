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
  },
  {
    id: 'cron-heartbeat',
    name: '04: Automated Cron Scheduler & Health Sentinel',
    description: 'Demonstrates background automated runs: fires automatically every 20 seconds, probes API status, normalizes metrics, and logs execution telemetry.',
    nodes: [
      {
        id: 'cron-1',
        type: NodeTypes.CRON_TRIGGER,
        position: { x: 100, y: 180 },
        data: {
          label: 'Cron Scheduler',
          cronExpression: '*/20 * * * * *',
          eventType: 'system.heartbeat'
        }
      },
      {
        id: 'cron-2',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 420, y: 180 },
        data: {
          label: 'Health Check Probe',
          url: 'mock://sentinel-service/health',
          method: 'GET'
        }
      },
      {
        id: 'cron-3',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 740, y: 180 },
        data: {
          label: 'Format Telemetry Payload',
          transformType: 'custom',
          expression: 'Append uptime & resource metrics'
        }
      }
    ],
    edges: [
      { id: 'ec-1-2', source: 'cron-1', target: 'cron-2', animated: true },
      { id: 'ec-2-3', source: 'cron-2', target: 'cron-3', animated: true }
    ]
  },
  {
    id: 'global-fintech-matrix',
    name: '05: Global Multi-Cloud Fintech & Order Clearing Matrix',
    description: 'Ultra-complex 14-node enterprise DAG: Webhook Ingress -> Multi-Branch Fan-Out (Auth, Cart Normalization, Debounce) -> Parallel Compliance KYC, Neural Fraud Scoring, Real-time Tax & Stock Hold -> Multi-Branch Risk Convergence -> Payment Settlement -> Parallel Invoice Generation & Logistics Debounce -> Automated Waybill -> Final Telemetry Ledger.',
    nodes: [
      {
        id: 'matrix-1-ingress',
        type: NodeTypes.WEBHOOK_TRIGGER,
        position: { x: 60, y: 340 },
        data: {
          label: 'Global Ingress Gateway',
          eventType: 'order.checkout',
          webhookPath: 'checkout-stream'
        }
      },
      {
        id: 'matrix-2-auth',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 380, y: 120 },
        data: {
          label: 'JWT & Mutual-TLS Auth Probe',
          url: 'mock://auth.global.internal/v2/verify',
          method: 'POST'
        }
      },
      {
        id: 'matrix-2-normalize',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 380, y: 340 },
        data: {
          label: 'Cart Unpacker & Normalizer',
          transformType: 'extract',
          extractKey: 'items'
        }
      },
      {
        id: 'matrix-2-debounce',
        type: NodeTypes.DELAY_TIMER,
        position: { x: 380, y: 560 },
        data: {
          label: 'Queue Ingress Debounce',
          delayMs: 600
        }
      },
      {
        id: 'matrix-3-kyc',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 700, y: 60 },
        data: {
          label: 'AML & KYC Compliance Audit',
          url: 'mock://compliance.bank/v1/kyc-check',
          method: 'GET'
        }
      },
      {
        id: 'matrix-3-fraud',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 700, y: 220 },
        data: {
          label: 'Neural Fraud & Risk Classifier',
          transformType: 'custom',
          expression: 'Compute vector anomaly index & fraud confidence'
        }
      },
      {
        id: 'matrix-3-tax',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 700, y: 380 },
        data: {
          label: 'Avalara Multi-State Tax Engine',
          url: 'https://jsonplaceholder.typicode.com/posts/2',
          method: 'GET'
        }
      },
      {
        id: 'matrix-3-inventory',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 700, y: 560 },
        data: {
          label: 'High-Concurrency Inventory Hold',
          url: 'mock://warehouse.internal/reserve-sku',
          method: 'POST'
        }
      },
      {
        id: 'matrix-4-risk-gate',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 1040, y: 220 },
        data: {
          label: 'Multi-Branch Risk & Tax Gate',
          transformType: 'aggregate'
        }
      },
      {
        id: 'matrix-5-payment',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 1360, y: 340 },
        data: {
          label: 'Stripe Settlement & Escrow Capture',
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'POST'
        }
      },
      {
        id: 'matrix-6-invoice',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 1680, y: 200 },
        data: {
          label: 'Cryptographic Invoice Signer',
          transformType: 'custom',
          expression: 'SHA-256 digital signature & tax receipt generator'
        }
      },
      {
        id: 'matrix-6-logistics-delay',
        type: NodeTypes.DELAY_TIMER,
        position: { x: 1680, y: 480 },
        data: {
          label: 'Fulfillment Dispatch Debounce',
          delayMs: 800
        }
      },
      {
        id: 'matrix-7-warehouse',
        type: NodeTypes.HTTP_REQUEST,
        position: { x: 2000, y: 480 },
        data: {
          label: 'FedEx / DHL Automated Waybill',
          url: 'mock://logistics.global/dispatch-label',
          method: 'POST'
        }
      },
      {
        id: 'matrix-8-telemetry-sink',
        type: NodeTypes.DATA_TRANSFORM,
        position: { x: 2320, y: 340 },
        data: {
          label: 'Global Settlement & Audit Ledger',
          transformType: 'aggregate'
        }
      }
    ],
    edges: [
      { id: 'e-1-auth', source: 'matrix-1-ingress', target: 'matrix-2-auth', animated: true },
      { id: 'e-1-norm', source: 'matrix-1-ingress', target: 'matrix-2-normalize', animated: true },
      { id: 'e-1-deb', source: 'matrix-1-ingress', target: 'matrix-2-debounce', animated: true },
      { id: 'e-auth-kyc', source: 'matrix-2-auth', target: 'matrix-3-kyc', animated: true },
      { id: 'e-norm-fraud', source: 'matrix-2-normalize', target: 'matrix-3-fraud', animated: true },
      { id: 'e-norm-tax', source: 'matrix-2-normalize', target: 'matrix-3-tax', animated: true },
      { id: 'e-deb-inv', source: 'matrix-2-debounce', target: 'matrix-3-inventory', animated: true },
      { id: 'e-kyc-gate', source: 'matrix-3-kyc', target: 'matrix-4-risk-gate', animated: true },
      { id: 'e-fraud-gate', source: 'matrix-3-fraud', target: 'matrix-4-risk-gate', animated: true },
      { id: 'e-tax-gate', source: 'matrix-3-tax', target: 'matrix-4-risk-gate', animated: true },
      { id: 'e-gate-pay', source: 'matrix-4-risk-gate', target: 'matrix-5-payment', animated: true },
      { id: 'e-inv-pay', source: 'matrix-3-inventory', target: 'matrix-5-payment', animated: true },
      { id: 'e-pay-inv', source: 'matrix-5-payment', target: 'matrix-6-invoice', animated: true },
      { id: 'e-pay-delay', source: 'matrix-5-payment', target: 'matrix-6-logistics-delay', animated: true },
      { id: 'e-delay-wh', source: 'matrix-6-logistics-delay', target: 'matrix-7-warehouse', animated: true },
      { id: 'e-inv-sink', source: 'matrix-6-invoice', target: 'matrix-8-telemetry-sink', animated: true },
      { id: 'e-wh-sink', source: 'matrix-7-warehouse', target: 'matrix-8-telemetry-sink', animated: true }
    ]
  }
];
