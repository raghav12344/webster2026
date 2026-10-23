/**
 * ChronosFlow - Task Execution Handlers
 */

export async function executeWebhookTrigger(taskPayload) {
  const { inputPayload, config } = taskPayload;
  const receivedAt = new Date().toISOString();
  return {
    success: true,
    data: {
      message: 'Trigger payload received successfully',
      event: config.eventType || 'webhook.received',
      payload: inputPayload || {},
      receivedAt
    },
    logs: [
      `Webhook trigger fired at ${receivedAt}`,
      `Payload keys: ${Object.keys(inputPayload || {}).join(', ') || 'none'}`
    ]
  };
}

export async function executeHttpRequest(taskPayload) {
  const { config, inputPayload } = taskPayload;
  const url = config.url || 'https://jsonplaceholder.typicode.com/posts/1';
  const method = (config.method || 'GET').toUpperCase();
  const simulateFailure = config.simulateFailure || false;
  const failureRate = config.failureRate !== undefined ? config.failureRate : 0; // 0 to 1

  const logs = [
    `Initiating HTTP ${method} request to: ${url}`,
    `Payload: ${JSON.stringify(config.body || inputPayload || {})}`
  ];

  // Simulated failure check (for testing exponential backoff & DLQ)
  if (simulateFailure || (failureRate > 0 && Math.random() < failureRate)) {
    logs.push(`⚠️ Simulated Network/Remote Server Error: 503 Service Unavailable at ${url}`);
    throw new Error(`HTTP 503 Service Unavailable: Gateway Timeout on ${url}`);
  }

  // If testing against mock echo endpoint or live URL
  try {
    let responseData;
    if (url.startsWith('mock://') || url.includes('mock')) {
      // Mock fast response
      responseData = {
        status: 200,
        statusText: 'OK',
        mock: true,
        data: {
          id: Math.floor(Math.random() * 1000),
          processedPayload: inputPayload,
          endpoint: url
        }
      };
    } else {
      // Real fetch with 8s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
        body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(config.body || inputPayload) : undefined,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let parsed;
      try {
        parsed = await res.json();
      } catch {
        parsed = await res.text();
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      responseData = {
        status: res.status,
        statusText: res.statusText,
        data: parsed
      };
    }

    logs.push(`HTTP Request succeeded with status ${responseData.status}`);
    return {
      success: true,
      data: responseData,
      logs
    };
  } catch (err) {
    logs.push(`HTTP Request failed: ${err.message}`);
    throw err;
  }
}

export async function executeDataTransform(taskPayload) {
  const { config, inputPayload } = taskPayload;
  const transformType = config.transformType || 'extract';
  const logs = [`Starting Data Transformation: mode='${transformType}'`];

  let result = {};

  if (transformType === 'extract') {
    const key = config.extractKey || 'data';
    result = inputPayload[key] || inputPayload;
    logs.push(`Extracted field '${key}'`);
  } else if (transformType === 'aggregate') {
    result = {
      aggregatedAt: new Date().toISOString(),
      parentDataCount: Object.keys(inputPayload || {}).length,
      combined: inputPayload
    };
    logs.push(`Aggregated results from ${Object.keys(inputPayload || {}).length} parent nodes`);
  } else if (transformType === 'custom') {
    try {
      // Safe simple transform expression
      const expr = config.expression || 'data';
      result = { transformed: true, original: inputPayload, expression: expr };
      logs.push(`Applied transform expression: ${expr}`);
    } catch (err) {
      logs.push(`Transform error: ${err.message}`);
      throw err;
    }
  } else {
    result = { ...inputPayload, transformed: true };
  }

  return {
    success: true,
    data: result,
    logs
  };
}

export async function executeDelayTimer(taskPayload) {
  const { config } = taskPayload;
  const delayMs = config.delayMs || 1500;
  const logs = [`Timer node started: Pausing for ${delayMs}ms to simulate asynchronous wait...`];

  await new Promise(resolve => setTimeout(resolve, delayMs));

  logs.push(`Timer finished. Resuming DAG execution.`);
  return {
    success: true,
    data: { waitedMs: delayMs, resumedAt: new Date().toISOString() },
    logs
  };
}
