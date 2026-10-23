import React, { useState } from 'react';
import { Radio, Copy, Check, Send, X } from 'lucide-react';

export default function WebhookModal({ isOpen, onClose, onTriggered }) {
  if (!isOpen) return null;

  const [webhookPath, setWebhookPath] = useState('order-events');
  const [payloadStr, setPayloadStr] = useState(JSON.stringify({
    orderId: `ORD-${Math.floor(Math.random() * 90000 + 10000)}`,
    customer: 'Tony Stark',
    items: [{ sku: 'ARC_REACTOR_MK50', qty: 2, price: 4999.0 }],
    currency: 'USD',
    timestamp: new Date().toISOString()
  }, null, 2));

  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const endpointUrl = `${window.location.origin}/api/webhooks/${webhookPath}`;
  const curlCommand = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${payloadStr.replace(/\n/g, '')}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWebhook = async () => {
    try {
      setIsSending(true);
      let parsed;
      try {
        parsed = JSON.parse(payloadStr);
      } catch {
        alert('Invalid JSON in payload');
        setIsSending(false);
        return;
      }

      const res = await fetch(`/api/webhooks/${webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      setIsSending(false);
      onClose();
      if (data.executionId) {
        onTriggered(data.executionId);
      }
    } catch (err) {
      alert(`Webhook error: ${err.message}`);
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        borderRadius: '14px',
        width: '600px',
        maxWidth: '92vw',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '8px', color: '#06b6d4' }}>
              <Radio size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>External Webhook Gateway</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>Ingests external payloads & dispatches to RabbitMQ in &lt;15ms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Endpoint */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Webhook Target Path</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
              /api/webhooks/
            </span>
            <input
              type="text"
              value={webhookPath}
              onChange={(e) => setWebhookPath(e.target.value)}
              style={{
                flex: 1,
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600
              }}
            />
          </div>
        </div>

        {/* Payload Editor */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>JSON Request Body</label>
          <textarea
            rows={6}
            value={payloadStr}
            onChange={(e) => setPayloadStr(e.target.value)}
            style={{
              width: '100%',
              background: '#070b13',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px',
              color: '#38bdf8',
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Curl Command Snippet */}
        <div style={{ marginBottom: '18px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>CURL COMMAND SNIPPET</span>
            <button
              onClick={copyCurl}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#10b981' : '#38bdf8',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy cURL'}
            </button>
          </div>
          <pre style={{ fontSize: '10px', color: '#94a3b8', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {curlCommand}
          </pre>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#cbd5e1',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={sendWebhook}
            disabled={isSending}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              border: 'none',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={14} />
            {isSending ? 'Sending...' : 'Send Webhook Payload'}
          </button>
        </div>
      </div>
    </div>
  );
}
