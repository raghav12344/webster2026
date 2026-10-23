import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, AlertTriangle, CheckCircle, RefreshCw, Skull } from 'lucide-react';

export default function HttpNode({ data, id }) {
  const status = data.status || 'IDLE';
  const method = (data.method || 'GET').toUpperCase();

  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span style={{ color: '#06b6d4', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={11} className="spin-slow" /> RUNNING
          </span>
        );
      case 'RETRYING':
        return (
          <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={11} /> RETRYING
          </span>
        );
      case 'SUCCESS':
        return (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={11} /> 200 OK
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span style={{ color: '#f43f5e', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Skull size={11} /> DLQ ROUTED
          </span>
        );
      default:
        return <span style={{ color: '#9ca3af', fontSize: '11px' }}>○ IDLE</span>;
    }
  };

  return (
    <div className={`chronos-node status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '6px', color: '#22d3ee' }}>
            <Globe size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f3f4f6' }}>{data.label || 'HTTP Request'}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          background: method === 'GET' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)',
          color: method === 'GET' ? '#60a5fa' : '#34d399',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {method}
        </span>
        <span style={{
          fontSize: '11px',
          color: '#cbd5e1',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '180px'
        }} title={data.url}>
          {data.url || 'https://...'}
        </span>
      </div>

      {data.simulateFailure && (
        <div style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 6px', borderRadius: '4px' }}>
          ⚡ Simulated 503 Gateway (Triggers Backoff)
        </div>
      )}

      {data.error && (
        <div style={{ fontSize: '10px', color: '#f87171', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.error}>
          Error: {data.error}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
