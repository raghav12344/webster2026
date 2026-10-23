import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Zap,
  Clock,
  Globe,
  Cpu,
  Hourglass,
  Check,
  AlertCircle,
  RefreshCw,
  Skull
} from 'lucide-react';

/**
 * Apple-inspired status pill component
 */
function StatusPill({ status }) {
  switch (status) {
    case 'RUNNING':
      return (
        <span className="apple-status-pill running">
          <span className="apple-pulse-dot" />
          Running
        </span>
      );
    case 'SUCCESS':
      return (
        <span className="apple-status-pill success">
          <Check size={11} strokeWidth={2.5} />
          Success
        </span>
      );
    case 'RETRYING':
      return (
        <span className="apple-status-pill warning">
          <RefreshCw size={10} className="apple-spin" />
          Retrying
        </span>
      );
    case 'DEAD_LETTER':
    case 'FAILED':
      return (
        <span className="apple-status-pill error">
          <AlertCircle size={11} strokeWidth={2.5} />
          DLQ Vault
        </span>
      );
    default:
      return (
        <span className="apple-status-pill idle">
          Idle
        </span>
      );
  }
}

/**
 * 1. Webhook / Cron / Manual Trigger Node
 */
export function AppleTriggerNode({ data, selected }) {
  const isCron = data.cronExpression !== undefined;
  const status = data.status || 'IDLE';

  return (
    <div className={`apple-node trigger-node ${selected ? 'is-selected' : ''} status-${status}`}>
      <div className="apple-node-header">
        <div className="apple-node-icon trigger">
          {isCron ? <Clock size={14} strokeWidth={2.2} /> : <Zap size={14} strokeWidth={2.2} />}
        </div>
        <div className="apple-node-title-group">
          <span className="apple-node-title">{data.label || (isCron ? 'Schedule Trigger' : 'Webhook Trigger')}</span>
          <span className="apple-node-category">{isCron ? 'Cron Ingress' : 'HTTP Webhook'}</span>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="apple-node-body">
        <div className="apple-node-detail-row">
          <span className="apple-detail-label">Event</span>
          <span className="apple-detail-value monospace">{data.eventType || 'event.incoming'}</span>
        </div>
        {isCron && (
          <div className="apple-node-detail-row">
            <span className="apple-detail-label">Schedule</span>
            <span className="apple-detail-value monospace">{data.cronExpression}</span>
          </div>
        )}
        {data.webhookPath && (
          <div className="apple-node-detail-row">
            <span className="apple-detail-label">Path</span>
            <span className="apple-detail-value monospace">/{data.webhookPath}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className="apple-handle" />
    </div>
  );
}

/**
 * 2. HTTP Request Node
 */
export function AppleHttpNode({ data, selected }) {
  const status = data.status || 'IDLE';
  const method = (data.method || 'GET').toUpperCase();

  return (
    <div className={`apple-node http-node ${selected ? 'is-selected' : ''} status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" className="apple-handle" />

      <div className="apple-node-header">
        <div className="apple-node-icon http">
          <Globe size={14} strokeWidth={2.2} />
        </div>
        <div className="apple-node-title-group">
          <span className="apple-node-title">{data.label || 'HTTP Request'}</span>
          <span className="apple-node-category">Network Payload</span>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="apple-node-body">
        <div className="apple-node-detail-row">
          <span className={`apple-method-badge ${method.toLowerCase()}`}>{method}</span>
          <span className="apple-detail-value monospace truncate" title={data.url}>
            {data.url || 'https://api.service...'}
          </span>
        </div>

        {data.simulateFailure && (
          <div className="apple-node-alert-hint">
            <span>Simulated 503 • Triggers Backoff</span>
          </div>
        )}

        {data.error && (
          <div className="apple-node-error-hint truncate" title={data.error}>
            {data.error}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className="apple-handle" />
    </div>
  );
}

/**
 * 3. Data Transform Node
 */
export function AppleTransformNode({ data, selected }) {
  const status = data.status || 'IDLE';

  return (
    <div className={`apple-node transform-node ${selected ? 'is-selected' : ''} status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" className="apple-handle" />

      <div className="apple-node-header">
        <div className="apple-node-icon transform">
          <Cpu size={14} strokeWidth={2.2} />
        </div>
        <div className="apple-node-title-group">
          <span className="apple-node-title">{data.label || 'Data Transform'}</span>
          <span className="apple-node-category">Compute Engine</span>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="apple-node-body">
        <div className="apple-node-detail-row">
          <span className="apple-detail-label">Operation</span>
          <span className="apple-detail-value capitalize">{data.transformType || 'extract'}</span>
        </div>
        {data.expression && (
          <div className="apple-node-expression truncate" title={data.expression}>
            "{data.expression}"
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className="apple-handle" />
    </div>
  );
}

/**
 * 4. Delay Timer Node
 */
export function AppleDelayNode({ data, selected }) {
  const status = data.status || 'IDLE';

  return (
    <div className={`apple-node delay-node ${selected ? 'is-selected' : ''} status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" className="apple-handle" />

      <div className="apple-node-header">
        <div className="apple-node-icon delay">
          <Hourglass size={14} strokeWidth={2.2} />
        </div>
        <div className="apple-node-title-group">
          <span className="apple-node-title">{data.label || 'Delay Timer'}</span>
          <span className="apple-node-category">Temporal Flow</span>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="apple-node-body">
        <div className="apple-node-detail-row">
          <span className="apple-detail-label">Interval</span>
          <span className="apple-detail-value monospace">{(data.delayMs || 1000) / 1000}s ({data.delayMs || 1000} ms)</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="out" className="apple-handle" />
    </div>
  );
}
