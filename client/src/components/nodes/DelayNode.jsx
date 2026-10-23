import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Hourglass } from 'lucide-react';

export default function DelayNode({ data, id }) {
  const status = data.status || 'IDLE';

  return (
    <div className={`chronos-node status-${status}`}>
      <Handle type="target" position={Position.Left} id="in" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(234, 179, 8, 0.2)', borderRadius: '6px', color: '#facc15' }}>
            <Hourglass size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f3f4f6' }}>{data.label || 'Delay Timer'}</span>
        </div>
        {status === 'RUNNING' && <span style={{ color: '#06b6d4', fontSize: '11px', fontWeight: 600 }}>⏱ PAUSED</span>}
        {status === 'SUCCESS' && <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>✔ RESUMED</span>}
        {status === 'IDLE' && <span style={{ color: '#9ca3af', fontSize: '11px' }}>○ IDLE</span>}
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
        Interval: <span style={{ color: '#facc15', fontWeight: 600 }}>{data.delayMs || 1000}ms</span>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
