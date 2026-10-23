/**
 * ChronosFlow - Cron Scheduler Service
 * Enables automated, periodic execution of DAG workflows
 */
import cron from 'node-cron';
import { coordinator } from './coordinator.js';
import { NodeTypes } from '../../../shared/types.js';

class CronSchedulerService {
  constructor() {
    this.scheduledTasks = new Map(); // workflowId -> cronTask
  }

  registerWorkflow(workflow) {
    // Check if workflow contains a cron trigger node
    const cronNode = workflow.nodes.find(n => n.type === NodeTypes.CRON_TRIGGER);
    if (!cronNode) return;

    const expression = cronNode.data?.cronExpression || '*/30 * * * * *'; // default every 30s
    if (!cron.validate(expression)) {
      console.warn(`[Cron] Invalid cron expression '${expression}' for workflow ${workflow.id}`);
      return;
    }

    // Stop existing if any
    this.unregisterWorkflow(workflow.id);

    console.log(`⏰ [Cron] Scheduling workflow '${workflow.name}' with schedule: ${expression}`);

    const task = cron.schedule(expression, async () => {
      console.log(`⏰ [Cron Trigger] Firing scheduled run for workflow '${workflow.name}' (${workflow.id})`);
      try {
        await coordinator.startExecution(workflow, {
          source: 'cron_trigger',
          schedule: expression,
          triggeredAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`[Cron] Scheduled execution failed:`, err);
      }
    });

    this.scheduledTasks.set(workflow.id, {
      task,
      expression,
      workflowName: workflow.name,
      registeredAt: new Date().toISOString()
    });
  }

  unregisterWorkflow(workflowId) {
    if (this.scheduledTasks.has(workflowId)) {
      const { task } = this.scheduledTasks.get(workflowId);
      task.stop();
      this.scheduledTasks.delete(workflowId);
      console.log(`⏰ [Cron] Unregistered cron schedule for workflow ${workflowId}`);
    }
  }

  getActiveSchedules() {
    const list = [];
    for (const [wfId, info] of this.scheduledTasks.entries()) {
      list.push({
        workflowId: wfId,
        workflowName: info.workflowName,
        expression: info.expression,
        registeredAt: info.registeredAt
      });
    }
    return list;
  }
}

export const cronScheduler = new CronSchedulerService();
