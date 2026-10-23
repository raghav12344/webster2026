import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Hourglass, CheckCircle2, Clock } from 'lucide-react';

export default function DelayNode({ data, id, selected }) {
  const status = data.status || 'IDLE';

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
            background: 'rgba(234, 179, 8, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#facc15',
            border: '1px solid rgba(234, 179, 8, 0.3)'
          }}>
            <Hourglass size={15} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
              {data.label || 'Delay Timer'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Temporal Buffer</div>
          </div>
        </div>

        {status === 'RUNNING' && (
          <span style={{ color: '#00f0ff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} className="spin-slow" /> PAUSED
          </span>
        )}
        {status === 'SUCCESS' && (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> RESUMED
          </span>
        )}
        {status === 'IDLE' && <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>○ IDLE</span>}
      </div>

      {/* Details Box */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px 10px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#94a3b8' }}>Interval:</span>
        <span style={{ color: '#facc15', fontWeight: 700, fontFamily: 'monospace' }}>
          {data.delayMs || 1000} ms
        </span>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
