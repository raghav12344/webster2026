import amqp from 'amqplib';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { config } from './config.js';

class InMemoryBroker extends EventEmitter {
  constructor() {
    super();
    this.storage = new Map();
    this.queues = new Map([[config.queueName, []], [config.dlqName, []]]);
    this.consumers = new Map();
    this.subscriptions = new Map();
    this.isEmbedded = true;
  }

  // --- Redis-like key-value & atomic locks ---
  async set(key, val) {
    this.storage.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    return 'OK';
  }

  async get(key) {
    const val = this.storage.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }

  async setnx(key, val) {
    if (this.storage.has(key)) return 0; // Lock already held
    this.storage.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    return 1; // Lock successfully acquired
  }

  async del(key) {
    return this.storage.delete(key) ? 1 : 0;
  }

  // --- Redis Pub/Sub ---
  async publish(channel, message) {
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    this.emit(`channel:${channel}`, payload);
    return 1;
  }

  subscribe(channel, callback) {
    const handler = (msg) => callback(channel, msg);
    this.on(`channel:${channel}`, handler);
    return () => this.off(`channel:${channel}`, handler);
  }

  // --- RabbitMQ-like AMQP Queues & DLQ ---
  async sendToQueue(queueName, messageObj, options = {}) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    const msg = {
      content: Buffer.from(JSON.stringify(messageObj)),
      properties: { headers: options.headers || {}, timestamp: Date.now() },
      fields: { deliveryTag: Math.random().toString(36).substring(7) }
    };
    this.queues.get(queueName).push(msg);

    // If consumer is waiting, dispatch
    const consumer = this.consumers.get(queueName);
    if (consumer) {
      setImmediate(() => {
        const next = this.queues.get(queueName).shift();
        if (next) consumer(next);
      });
    }
    return true;
  }

  async consume(queueName, onMessage) {
    this.consumers.set(queueName, onMessage);
    // Drain any existing messages in queue
    const queue = this.queues.get(queueName) || [];
    while (queue.length > 0) {
      const msg = queue.shift();
      setImmediate(() => onMessage(msg));
    }
  }

  ack(msg) {
    // Message acknowledged
  }

  nack(msg, requeue = false) {
    if (requeue) {
      this.queues.get(config.queueName)?.unshift(msg);
    } else {
      // Route to DLQ
      this.sendToQueue(config.dlqName, JSON.parse(msg.content.toString()), {
        headers: { 'x-death-reason': 'Max retries exceeded' }
      });
    }
  }
}

class BrokerManager {
  constructor() {
    this.isReady = false;
    this.isEmbedded = false;
    this.amqpConn = null;
    this.amqpChannel = null;
    this.redisClient = null;
    this.redisSubscriber = null;
    this.inMemory = new InMemoryBroker();
  }

  async initialize() {
    try {
      console.log('🔌 Connecting to RabbitMQ & Redis...');
      // 1. Try connecting to Redis with short timeout
      const testRedis = new Redis(config.redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // Don't hang on connection error
      });

      await new Promise((resolve, reject) => {
        testRedis.on('connect', () => {
          this.redisClient = testRedis;
          resolve();
        });
        testRedis.on('error', (err) => reject(err));
      });

      this.redisSubscriber = new Redis(config.redisUrl);

      // 2. Try connecting to RabbitMQ
      this.amqpConn = await amqp.connect(config.rabbitmqUrl, { timeout: 2000 });
      this.amqpChannel = await this.amqpConn.createChannel();

      // Configure Dead-Letter Exchange (DLX) & Dead-Letter Queue (DLQ)
      await this.amqpChannel.assertExchange(config.dlxExchangeName, 'direct', { durable: true });
      await this.amqpChannel.assertQueue(config.dlqName, { durable: true });
      await this.amqpChannel.bindQueue(config.dlqName, config.dlxExchangeName, 'dlq-routing-key');

      // Configure Main Work Queue with DLX forwarding on NACK
      await this.amqpChannel.assertQueue(config.queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': config.dlxExchangeName,
          'x-dead-letter-routing-key': 'dlq-routing-key'
        }
      });

      console.log('✅ Connected to LIVE RabbitMQ & Redis services successfully!');
      this.isReady = true;
    } catch (err) {
      console.warn(`⚠️ External RabbitMQ/Redis unavailable (${err.message}).`);
      console.log('🚀 Activated High-Fidelity In-Memory Broker (Zero-Dependency Dev Mode).');
      this.isEmbedded = true;
      this.isReady = true;
    }
  }

  // --- Key-Value & Distributed Lock (SETNX) ---
  async set(key, val) {
    if (this.isEmbedded) return this.inMemory.set(key, val);
    const serialized = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return await this.redisClient.set(key, serialized);
  }

  async get(key) {
    if (this.isEmbedded) return this.inMemory.get(key);
    const data = await this.redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  async setnx(key, val) {
    if (this.isEmbedded) return this.inMemory.setnx(key, val);
    const serialized = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return await this.redisClient.setnx(key, serialized);
  }

  async del(key) {
    if (this.isEmbedded) return this.inMemory.del(key);
    return await this.redisClient.del(key);
  }

  // --- Pub / Sub ---
  async publish(channel, payload) {
    if (this.isEmbedded) return this.inMemory.publish(channel, payload);
    const message = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    return await this.redisClient.publish(channel, message);
  }

  subscribe(channel, callback) {
    if (this.isEmbedded) {
      return this.inMemory.subscribe(channel, callback);
    }
    this.redisSubscriber.subscribe(channel);
    const handler = (ch, msg) => {
      if (ch === channel) callback(ch, msg);
    };
    this.redisSubscriber.on('message', handler);
    return () => {
      this.redisSubscriber.unsubscribe(channel);
      this.redisSubscriber.off('message', handler);
    };
  }

  // --- RabbitMQ Message Queues & DLQ ---
  async sendTask(taskPayload) {
    if (this.isEmbedded) {
      return this.inMemory.sendToQueue(config.queueName, taskPayload);
    }
    return this.amqpChannel.sendToQueue(
      config.queueName,
      Buffer.from(JSON.stringify(taskPayload)),
      { persistent: true }
    );
  }

  async sendToDLQ(taskPayload, reason = 'Exceeded retries') {
    if (this.isEmbedded) {
      return this.inMemory.sendToQueue(config.dlqName, taskPayload, { headers: { 'x-death-reason': reason } });
    }
    return this.amqpChannel.sendToQueue(
      config.dlqName,
      Buffer.from(JSON.stringify(taskPayload)),
      { persistent: true, headers: { 'x-death-reason': reason } }
    );
  }

  async consumeTasks(onMessage) {
    if (this.isEmbedded) {
      return this.inMemory.consume(config.queueName, onMessage);
    }
    await this.amqpChannel.prefetch(5); // absorb backpressure, max 5 parallel tasks per worker
    return this.amqpChannel.consume(config.queueName, onMessage, { noAck: false });
  }

  ack(msg) {
    if (this.isEmbedded) return this.inMemory.ack(msg);
    this.amqpChannel.ack(msg);
  }

  nack(msg, requeue = false) {
    if (this.isEmbedded) return this.inMemory.nack(msg, requeue);
    this.amqpChannel.nack(msg, false, requeue);
  }
}

export const broker = new BrokerManager();
