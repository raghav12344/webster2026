import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Radio, Clock, Play } from 'lucide-react';

export default function TriggerNode({ data, id }) {
  const status = data.status || 'IDLE';

  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return <span style={{ color: '#06b6d4', fontSize: '11px', fontWeight: 600 }}>● RUNNING</span>;
      case 'SUCCESS':
        return <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>✔ EXECUTED</span>;
      case 'FAILED':
        return <span style={{ color: '#f43f5e', fontSize: '11px', fontWeight: 600 }}>✖ FAILED</span>;
      default:
        return <span style={{ color: '#9ca3af', fontSize: '11px' }}>○ READY</span>;
    }
  };

  return (
    <div className={`chronos-node status-${status}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '6px', color: '#c084fc' }}>
            <Zap size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f3f4f6' }}>{data.label || 'Trigger'}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
        Event: <code style={{ color: '#a78bfa', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }}>{data.eventType || 'manual'}</code>
      </div>

      {data.webhookPath && (
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          Endpoint: <code>/api/webhooks/{data.webhookPath}</code>
        </div>
      )}

      {/* Trigger nodes only have an outgoing connection */}
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
