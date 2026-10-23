import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, CheckCircle2, RefreshCw } from 'lucide-react';

export default function TransformNode({ data, id, selected }) {
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
            background: 'rgba(244, 114, 182, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f472b6',
            border: '1px solid rgba(244, 114, 182, 0.3)'
          }}>
            <Cpu size={15} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
              {data.label || 'Transform'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Data Processor</div>
          </div>
        </div>

        {status === 'SUCCESS' && (
          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> PROCESSED
          </span>
        )}
        {status === 'RUNNING' && (
          <span style={{ color: '#00f0ff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={11} className="spin-slow" /> RUNNING
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
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#94a3b8' }}>Mode:</span>
          <span style={{ color: '#f472b6', fontWeight: 600 }}>{data.transformType || 'extract'}</span>
        </div>
        {data.expression && (
          <div style={{ fontSize: '10px', color: '#cbd5e1', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{data.expression}"
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
