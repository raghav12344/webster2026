import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, CheckCircle } from 'lucide-react';

export default function TransformNode({ data, id }) {
  const status = data.status || 'IDLE';

  return (
    <div className={`chronos-node status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(236, 72, 153, 0.2)', borderRadius: '6px', color: '#f472b6' }}>
            <Cpu size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f3f4f6' }}>{data.label || 'Data Transform'}</span>
        </div>
        {status === 'SUCCESS' && <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>✔ PROCESSED</span>}
        {status === 'RUNNING' && <span style={{ color: '#06b6d4', fontSize: '11px', fontWeight: 600 }}>● RUNNING</span>}
        {status === 'IDLE' && <span style={{ color: '#9ca3af', fontSize: '11px' }}>○ IDLE</span>}
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
        Mode: <span style={{ color: '#f472b6', fontWeight: 500 }}>{data.transformType || 'extract'}</span>
      </div>

      {data.expression && (
        <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '4px', fontStyle: 'italic' }}>
          "{data.expression}"
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
