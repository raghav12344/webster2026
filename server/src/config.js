import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  queueName: 'chronos.tasks',
  dlqName: 'chronos.dlq',
  exchangeName: 'chronos.direct',
  dlxExchangeName: 'chronos.dlx',
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 10000
};
