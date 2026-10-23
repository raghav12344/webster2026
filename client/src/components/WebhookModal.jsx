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
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: 'var(--apple-card)',
        border: '1px solid var(--apple-border)',
        borderRadius: '16px',
        width: '580px',
        maxWidth: '92vw',
        padding: '24px',
        boxShadow: 'var(--apple-shadow-sheet)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--apple-blue-subtle)',
              color: 'var(--apple-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Radio size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>External Webhook Gateway</h3>
              <p style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)' }}>Ingests HTTP payloads and enqueues tasks in under 15ms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Path field */}
        <div style={{ marginBottom: '14px' }}>
          <label className="apple-field-label">Target Ingress Path</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ background: 'var(--apple-secondary-bg)', border: '1px solid var(--apple-border)', padding: '6px 10px', borderRadius: '7px', fontSize: '12px', color: 'var(--apple-text-secondary)', fontFamily: 'monospace' }}>
              /api/webhooks/
            </span>
            <input
              type="text"
              className="apple-input monospace"
              value={webhookPath}
              onChange={(e) => setWebhookPath(e.target.value)}
              style={{ fontWeight: 600 }}
            />
          </div>
        </div>

        {/* JSON Request Body */}
        <div style={{ marginBottom: '14px' }}>
          <label className="apple-field-label">JSON Request Body</label>
          <textarea
            rows={5}
            className="apple-input monospace"
            value={payloadStr}
            onChange={(e) => setPayloadStr(e.target.value)}
            style={{ resize: 'vertical', fontSize: '11px', lineHeight: 1.45 }}
          />
        </div>

        {/* cURL Snippet Box */}
        <div style={{
          background: 'var(--apple-secondary-bg)',
          border: '1px solid var(--apple-border)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>CURL INVOCATION</span>
            <button
              onClick={copyCurl}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? 'var(--apple-green)' : 'var(--apple-blue)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre style={{ fontSize: '10.5px', color: 'var(--apple-text-primary)', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
            {curlCommand}
          </pre>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="apple-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="apple-btn-primary" onClick={sendWebhook} disabled={isSending}>
            <Send size={12} />
            <span>{isSending ? 'Sending...' : 'Send Webhook Payload'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
