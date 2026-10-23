import React from 'react';
import { Plus, Zap, Globe, Cpu, Clock, Radio } from 'lucide-react';

export default function AddNodePalette({ onAddNode }) {
  const nodeOptions = [
    {
      type: 'webhookTrigger',
      label: 'Trigger Node',
      icon: Zap,
      color: '#c084fc',
      bg: 'rgba(139, 92, 246, 0.2)',
      defaultData: { label: 'Webhook Trigger', eventType: 'custom.event', webhookPath: 'custom-event' }
    },
    {
      type: 'httpRequest',
      label: 'HTTP Request',
      icon: Globe,
      color: '#22d3ee',
      bg: 'rgba(6, 182, 212, 0.2)',
      defaultData: { label: 'HTTP Request', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' }
    },
    {
      type: 'dataTransform',
      label: 'Data Transform',
      icon: Cpu,
      color: '#f472b6',
      bg: 'rgba(236, 72, 153, 0.2)',
      defaultData: { label: 'JSON Transform', transformType: 'extract', extractKey: 'data' }
    },
    {
      type: 'delayTimer',
      label: 'Delay Timer',
      icon: Clock,
      color: '#facc15',
      bg: 'rgba(234, 179, 8, 0.2)',
      defaultData: { label: 'Delay Timer (1s)', delayMs: 1000 }
    }
  ];

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '10px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 15,
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
    }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Plus size={14} /> Add:
      </span>
      {nodeOptions.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.type}
            onClick={() => onAddNode(opt.type, opt.defaultData)}
            style={{
              background: opt.bg,
              border: `1px solid ${opt.color}40`,
              color: opt.color,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.1s'
            }}
            title={`Add ${opt.label} to canvas`}
          >
            <Icon size={12} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
