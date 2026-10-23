import React from 'react';
import { X, Sliders, Play, Trash2 } from 'lucide-react';

export default function NodeInspector({ selectedNode, onUpdateNode, onDeleteNode, onClose }) {
  if (!selectedNode) return null;

  const { id, type, data } = selectedNode;

  const handleChange = (key, value) => {
    onUpdateNode(id, { ...data, [key]: value });
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '320px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      padding: '18px',
      color: '#f8fafc',
      zIndex: 50,
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} color="#06b6d4" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Node Config: {id}</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
        >
          ✕
        </button>
      </div>

      {/* Label */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Node Label</label>
        <input
          type="text"
          value={data.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#f8fafc',
            fontSize: '12px'
          }}
        />
      </div>

      {/* HTTP Request Node specifics */}
      {type === 'httpRequest' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Method & URL</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={data.method || 'GET'}
                onChange={(e) => handleChange('method', e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#60a5fa',
                  fontWeight: 700,
                  fontSize: '11px'
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
                style={{
                  flex: 1,
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#f8fafc',
                  fontSize: '11px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fbbf24', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={data.simulateFailure || false}
                onChange={(e) => handleChange('simulateFailure', e.target.checked)}
              />
              <span>Simulate 503 Failure (Triggers Backoff)</span>
            </label>
          </div>
        </>
      )}

      {/* Delay Timer Node specifics */}
      {type === 'delayTimer' && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Delay Duration: <strong style={{ color: '#facc15' }}>{data.delayMs || 1000} ms</strong>
          </label>
          <input
            type="range"
            min="200"
            max="5000"
            step="100"
            value={data.delayMs || 1000}
            onChange={(e) => handleChange('delayMs', parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Data Transform specifics */}
      {type === 'dataTransform' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Transform Mode</label>
            <select
              value={data.transformType || 'extract'}
              onChange={(e) => handleChange('transformType', e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#f472b6',
                fontSize: '12px'
              }}
            >
              <option value="extract">Extract Key</option>
              <option value="aggregate">Aggregate Parents</option>
              <option value="custom">Custom Normalizer</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Expression / Notes</label>
            <input
              type="text"
              value={data.expression || ''}
              onChange={(e) => handleChange('expression', e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#f8fafc',
                fontSize: '11px'
              }}
            />
          </div>
        </>
      )}

      {/* Webhook / Trigger Node specifics */}
      {(type === 'webhookTrigger' || type === 'manualTrigger') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Event Name</label>
          <input
            type="text"
            value={data.eventType || 'event.incoming'}
            onChange={(e) => handleChange('eventType', e.target.value)}
            style={{
              width: '100%',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#f8fafc',
              fontSize: '12px'
            }}
          />
        </div>
      )}

      {/* Output / Result Snapshot if executed */}
      {data.output && (
        <div style={{ marginTop: '12px', background: '#0a0f1d', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Last Execution Output:</span>
          <pre style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px', maxHeight: '100px', overflowY: 'auto' }}>
            {JSON.stringify(data.output, null, 2)}
          </pre>
        </div>
      )}

      {/* Delete button */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onDeleteNode(id)}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Trash2 size={12} />
          Remove Node
        </button>
      </div>
    </div>
  );
}
