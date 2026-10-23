import React, { useState } from 'react';
import { Sliders, Play, Trash2, X, Terminal, Code, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function NodeInspector({ selectedNode, onUpdateNode, onDeleteNode, onClose }) {
  if (!selectedNode) return null;

  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'output'
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { id, type, data } = selectedNode;

  const handleChange = (key, value) => {
    onUpdateNode(id, { ...data, [key]: value });
  };

  // Test single node directly in isolation!
  const runSingleNodeTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      if (type === 'httpRequest') {
        const url = data.url || 'https://jsonplaceholder.typicode.com/posts/1';
        if (data.simulateFailure) {
          throw new Error(`HTTP 503 Service Unavailable: Simulated Flaky Microservice Failure`);
        }
        const res = await fetch(url);
        const json = await res.json();
        setTestResult({ status: res.status, ok: res.ok, data: json });
      } else if (type === 'delayTimer') {
        await new Promise(r => setTimeout(r, data.delayMs || 1000));
        setTestResult({ status: 'completed', waitedMs: data.delayMs || 1000 });
      } else {
        setTestResult({ status: 'success', transformed: true, nodeType: type, timestamp: new Date().toISOString() });
      }
      setActiveTab('output');
    } catch (err) {
      setTestResult({ error: err.message });
      setActiveTab('output');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '340px',
      background: 'rgba(13, 18, 31, 0.96)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '14px',
      padding: '20px',
      color: '#f8fafc',
      zIndex: 40,
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    }}>
      {/* Drawer Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(0, 240, 255, 0.15)', borderRadius: '8px', color: '#00f0ff' }}>
            <Sliders size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
              {data.label || id}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              ID: {id} • Type: {type}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', marginBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            flex: 1,
            background: activeTab === 'config' ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: activeTab === 'config' ? '#fff' : '#94a3b8',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('output')}
          style={{
            flex: 1,
            background: activeTab === 'output' ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: activeTab === 'output' ? '#fff' : '#94a3b8',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Telemetry & Output
        </button>
      </div>

      {/* TAB 1: CONFIG */}
      {activeTab === 'config' && (
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {/* Label */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Node Label</label>
            <input
              type="text"
              value={data.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              style={{
                width: '100%',
                background: '#161f30',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            />
          </div>

          {/* HTTP Request specifics */}
          {type === 'httpRequest' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Method & URL</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={data.method || 'GET'}
                    onChange={(e) => handleChange('method', e.target.value)}
                    style={{
                      background: '#161f30',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '7px 8px',
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
                      background: '#161f30',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Simulated Failure Toggle */}
              <div style={{
                marginBottom: '14px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '10px 12px',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#fbbf24', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={data.simulateFailure || false}
                    onChange={(e) => handleChange('simulateFailure', e.target.checked)}
                  />
                  <span>Simulate 503 Gateway Failure</span>
                </label>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', marginLeft: '20px' }}>
                  Forces worker into exponential backoff retries & Dead-Letter Queue (DLQ).
                </div>
              </div>
            </>
          )}

          {/* Delay Timer specifics */}
          {type === 'delayTimer' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Delay Interval</label>
                <strong style={{ color: '#facc15', fontSize: '12px', fontFamily: 'monospace' }}>
                  {data.delayMs || 1000} ms
                </strong>
              </div>
              <input
                type="range"
                min="300"
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
                    background: '#161f30',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '7px 10px',
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
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Expression</label>
                <input
                  type="text"
                  value={data.expression || ''}
                  onChange={(e) => handleChange('expression', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#161f30',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: '#f8fafc',
                    fontSize: '11px'
                  }}
                />
              </div>
            </>
          )}

          {/* Trigger specifics */}
          {(type === 'webhookTrigger' || type === 'manualTrigger') && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Event Name</label>
              <input
                type="text"
                value={data.eventType || 'event.incoming'}
                onChange={(e) => handleChange('eventType', e.target.value)}
                style={{
                  width: '100%',
                  background: '#161f30',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              />
            </div>
          )}

          {/* Test Node Button */}
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={runSingleNodeTest}
              disabled={isTesting}
              style={{
                width: '100%',
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                color: '#00f0ff',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Play size={13} fill="#00f0ff" />
              {isTesting ? 'Executing Node...' : 'Test Single Node'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: OUTPUT & TELEMETRY */}
      {activeTab === 'output' && (
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {/* Status Chip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: '#161f30', padding: '8px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live Status:</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: data.status === 'SUCCESS' ? '#10b981' : data.status === 'RUNNING' ? '#00f0ff' : '#94a3b8' }}>
              {data.status || 'IDLE'}
            </span>
          </div>

          {/* Test Result if any */}
          {testResult && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600, marginBottom: '4px' }}>
                Single Node Test Result:
              </div>
              <pre style={{ background: '#050811', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', fontSize: '10.5px', color: testResult.error ? '#f87171' : '#38bdf8', maxHeight: '140px', overflowY: 'auto' }}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Overall Output */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
              Full Workflow Output Payload:
            </div>
            <pre style={{ background: '#050811', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', fontSize: '10.5px', color: '#38bdf8', maxHeight: '160px', overflowY: 'auto' }}>
              {data.output ? JSON.stringify(data.output, null, 2) : '// No execution output yet'}
            </pre>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onDeleteNode(id)}
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
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
          Remove
        </button>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
