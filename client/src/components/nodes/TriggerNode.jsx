import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Radio, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function TriggerNode({ data, id, selected }) {
  const status = data.status || 'IDLE';
  const isCron = data.cronExpression !== undefined;

  const renderStatus = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span style={{ color: '#00f0ff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={11} className="spin-slow" /> DISPATCHING
          </span>
        );
      case 'SUCCESS':
        return (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> FIRED
          </span>
        );
      case 'FAILED':
        return <span style={{ color: '#ff0055', fontSize: '11px', fontWeight: 700 }}>✖ ERROR</span>;
      default:
        return <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>○ IDLE</span>;
    }
  };

  return (
    <div className={`chronos-node status-${status} ${selected ? 'selected' : ''}`}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: isCron ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isCron ? '#fbbf24' : '#c084fc',
            border: `1px solid ${isCron ? 'rgba(245, 158, 11, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`
          }}>
            {isCron ? <Clock size={15} /> : <Zap size={15} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
              {data.label || 'Trigger'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              {isCron ? 'Automated Cron Trigger' : 'Ingress Gateway'}
            </div>
          </div>
        </div>
        {renderStatus()}
      </div>

      {/* Details Box */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px 10px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#94a3b8' }}>Event:</span>
          <code style={{ color: '#a78bfa', fontWeight: 600 }}>{data.eventType || 'event.incoming'}</code>
        </div>
        {isCron && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Schedule:</span>
            <code style={{ color: '#fbbf24', fontWeight: 600 }}>{data.cronExpression}</code>
          </div>
        )}
        {data.webhookPath && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Webhook:</span>
            <code style={{ color: '#38bdf8' }}>/{data.webhookPath}</code>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
