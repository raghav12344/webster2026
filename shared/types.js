/**
 * ChronosFlow - Shared Graph & Execution Types
 */

export const NodeTypes = {
  WEBHOOK_TRIGGER: 'webhookTrigger',
  MANUAL_TRIGGER: 'manualTrigger',
  CRON_TRIGGER: 'cronTrigger',
  HTTP_REQUEST: 'httpRequest',
  DATA_TRANSFORM: 'dataTransform',
  DELAY_TIMER: 'delayTimer',
  LOG_OUTPUT: 'logOutput'
};

export const TaskStatus = {
  IDLE: 'IDLE',
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  RETRYING: 'RETRYING',
  FAILED: 'FAILED',
  DEAD_LETTER: 'DEAD_LETTER'
};

export const ExecutionStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PARTIALLY_FAILED: 'PARTIALLY_FAILED'
};
