import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, AlertTriangle, CheckCircle2, RefreshCw, Skull } from 'lucide-react';

export default function HttpNode({ data, id, selected }) {
  const status = data.status || 'IDLE';
  const method = (data.method || 'GET').toUpperCase();

  const renderStatus = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span style={{ color: '#00f0ff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={11} className="spin-slow" /> RUNNING
          </span>
        );
      case 'RETRYING':
        return (
          <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> RETRYING
          </span>
        );
      case 'SUCCESS':
        return (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> 200 OK
          </span>
        );
      case 'DEAD_LETTER':
      case 'FAILED':
        return (
          <span style={{ color: '#ff0055', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Skull size={12} /> DLQ VAULT
          </span>
        );
      default:
        return <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>○ IDLE</span>;
    }
  };

  return (
    <div className={`chronos-node status-${status} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(0, 240, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00f0ff',
            border: '1px solid rgba(0, 240, 255, 0.3)'
          }}>
            <Globe size={15} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
              {data.label || 'HTTP Node'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Network Request</div>
          </div>
        </div>
        {renderStatus()}
      </div>

      {/* Endpoint Preview */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px 10px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: data.simulateFailure || data.error ? '6px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            background: method === 'GET' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            color: method === 'GET' ? '#60a5fa' : '#34d399',
            padding: '2px 6px',
            borderRadius: '4px',
            border: `1px solid ${method === 'GET' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
          }}>
            {method}
          </span>
          <span style={{
            fontSize: '11px',
            color: '#cbd5e1',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '175px',
            fontFamily: 'monospace'
          }} title={data.url}>
            {data.url || 'https://...'}
          </span>
        </div>
      </div>

      {/* Flaky / Failure simulation badge */}
      {data.simulateFailure && (
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#fbbf24',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '3px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <AlertTriangle size={10} />
          <span>Simulated 503 Gateway (Forces Retry & DLQ)</span>
        </div>
      )}

      {data.error && (
        <div style={{
          fontSize: '10px',
          color: '#f87171',
          marginTop: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} title={data.error}>
          Last Err: {data.error}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
