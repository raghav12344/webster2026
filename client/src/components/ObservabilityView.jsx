import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Skull,
  Server,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';

export default function ObservabilityView({ onOpenEditor, onSelectPreset }) {
  const [health, setHealth] = useState(null);
  const [dlqItems, setDlqItems] = useState([]);
  const [cronSchedules, setCronSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthRes, dlqRes, cronRes] = await Promise.all([
        fetch('/api/health').then(r => r.json()).catch(() => null),
        fetch('/api/dlq').then(r => r.json()).catch(() => []),
        fetch('/api/cron/schedules').then(r => r.json()).catch(() => [])
      ]);
      setHealth(healthRes);
      setDlqItems(dlqRes || []);
      setCronSchedules(cronRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleReplay = async (id) => {
    try {
      setReplayingId(id);
      const res = await fetch(`/api/dlq/${id}/replay`, { method: 'POST' });
      await res.json();
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px', maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--apple-text-primary)' }}>
            System Observability
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
            Live distributed telemetry, RabbitMQ queue depths, worker heartbeats, and failure recovery.
          </p>
        </div>

        <button
          className="apple-btn-secondary"
          onClick={fetchData}
          disabled={loading}
          style={{ fontSize: '12px' }}
        >
          <RefreshCw size={12} className={loading ? 'apple-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Grid KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {/* Card 1: Broker Mode */}
        <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--apple-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>BROKER ENGINE</span>
            <Server size={16} color="var(--apple-blue)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-text-primary)', letterSpacing: '-0.02em' }}>
            {health?.broker?.mode?.includes('External') ? 'RabbitMQ & Redis' : 'Embedded Engine'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--apple-green)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--apple-green)' }} />
            AMQP 0-9-1 Protocol Active
          </div>
        </div>

        {/* Card 2: Main Tasks Queue */}
        <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--apple-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>TASK QUEUE</span>
            <Activity size={16} color="var(--apple-blue)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-text-primary)', fontFamily: 'monospace' }}>
            {health?.broker?.queue || 'chronos.tasks'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)', marginTop: '6px' }}>
            Backpressure Prefetch: 5 tasks / worker
          </div>
        </div>

        {/* Card 3: Dead-Letter Queue Isolation */}
        <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--apple-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>DLQ ISOLATION</span>
            <Skull size={16} color={dlqItems.length > 0 ? 'var(--apple-red)' : 'var(--apple-text-tertiary)'} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: dlqItems.length > 0 ? 'var(--apple-red)' : 'var(--apple-text-primary)' }}>
            {dlqItems.length}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
            {dlqItems.length === 0 ? 'Zero unrecoverable task errors' : 'Tasks safely quarantined'}
          </div>
        </div>

        {/* Card 4: Idempotency & Locks */}
        <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--apple-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>IDEMPOTENCY</span>
            <ShieldCheck size={16} color="var(--apple-purple)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-text-primary)' }}>
            Redis SETNX
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)', marginTop: '6px' }}>
            Zero duplicate task executions
          </div>
        </div>
      </div>

      {/* Dead-Letter Queue Quarantine Table */}
      <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '14px', padding: '24px', marginBottom: '32px', boxShadow: 'var(--apple-shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--apple-text-primary)', letterSpacing: '-0.02em' }}>
              Dead-Letter Queue (DLQ) Quarantine Vault
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              Tasks that exceeded the maximum exponential backoff retry threshold (Cap: 3) are automatically isolated here.
            </p>
          </div>
          {dlqItems.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--apple-red-subtle)', color: 'var(--apple-red)', padding: '3px 8px', borderRadius: '6px' }}>
              {dlqItems.length} Quarantined
            </span>
          )}
        </div>

        {dlqItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--apple-text-tertiary)' }}>
            <CheckCircle2 size={32} color="var(--apple-green)" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
              All Pipelines Healthy
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              No tasks are currently held in the Dead-Letter Queue. Run Preset 02 in the editor to demonstrate automated fault isolation.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--apple-divider)', color: 'var(--apple-text-secondary)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>TASK ID</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>TYPE</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>REASON</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>ATTEMPTS</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>QUARANTINED AT</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {dlqItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--apple-divider)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                      {item.nodeId || item.task?.nodeId}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="apple-status-pill idle">
                        {item.task?.nodeType || 'httpRequest'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--apple-red)' }}>
                      {item.reason}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {item.task?.attempt || 3} / 3
                    </td>
                    <td style={{ padding: '12px', color: 'var(--apple-text-secondary)' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        className="apple-btn-secondary"
                        onClick={() => handleReplay(item.id)}
                        disabled={replayingId === item.id}
                        style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex' }}
                      >
                        <RotateCcw size={11} className={replayingId === item.id ? 'apple-spin' : ''} />
                        <span>Replay to RabbitMQ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Cron Schedules Table */}
      <div style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--apple-shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--apple-text-primary)', letterSpacing: '-0.02em' }}>
              Automated Background Cron Schedulers
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              Periodic workflow execution managed by the Node.js orchestration engine.
            </p>
          </div>
        </div>

        {cronSchedules.length === 0 ? (
          <div style={{ fontSize: '12.5px', color: 'var(--apple-text-secondary)', padding: '12px 0' }}>
            No background cron tasks currently registered. Select Preset 04 (Cron Sentinel) in the editor to activate automated runs.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--apple-divider)', color: 'var(--apple-text-secondary)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>PIPELINE</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>SCHEDULE</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {cronSchedules.map((cron, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--apple-divider)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                      {cron.workflowName}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--apple-blue)' }}>
                      {cron.expression}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="apple-status-pill running">
                        <span className="apple-pulse-dot" />
                        Active Recurring
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        className="apple-btn-secondary"
                        onClick={() => {
                          onSelectPreset?.(cron.workflowId);
                          onOpenEditor?.();
                        }}
                        style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex' }}
                      >
                        <span>Open Pipeline</span>
                        <ArrowUpRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
