import React, { useState } from 'react';
import { BookmarkPlus, Sparkles, X, Plus, Layers, FileCode } from 'lucide-react';

export default function NewPresetModal({ isOpen, onClose, currentCanvas, onPresetCreated }) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateOption, setTemplateOption] = useState(
    currentCanvas?.nodes?.length > 0 ? 'current' : 'starter'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a preset name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let nodesToSave = [];
    let edgesToSave = [];

    if (templateOption === 'current') {
      nodesToSave = currentCanvas.nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: 'IDLE', error: null, output: null }
      }));
      edgesToSave = currentCanvas.edges;
    } else if (templateOption === 'starter') {
      nodesToSave = [
        {
          id: 'n-start-1',
          type: 'webhookTrigger',
          position: { x: 120, y: 180 },
          data: { label: 'Webhook Trigger', eventType: 'user.signup', webhookPath: 'user-signup' }
        },
        {
          id: 'n-start-2',
          type: 'dataTransform',
          position: { x: 440, y: 180 },
          data: { label: 'Verify User Payload', transformType: 'extract', extractKey: 'user' }
        },
        {
          id: 'n-start-3',
          type: 'httpRequest',
          position: { x: 760, y: 180 },
          data: { label: 'Notify Welcome Service', url: 'https://jsonplaceholder.typicode.com/posts', method: 'POST' }
        }
      ];
      edgesToSave = [
        { id: 'e-s-1-2', source: 'n-start-1', target: 'n-start-2', animated: true },
        { id: 'e-s-2-3', source: 'n-start-2', target: 'n-start-3', animated: true }
      ];
    } else {
      // Blank template
      nodesToSave = [
        {
          id: 'n-blank-1',
          type: 'webhookTrigger',
          position: { x: 150, y: 200 },
          data: { label: 'Start Trigger', eventType: 'custom.event', webhookPath: 'custom-event' }
        }
      ];
      edgesToSave = [];
    }

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || 'Custom user-created workflow pipeline.',
          nodes: nodesToSave,
          edges: edgesToSave
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save custom preset');
      }

      onPresetCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
        width: '540px',
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
              <BookmarkPlus size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                New Custom Preset
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)' }}>
                Save and organize your own reusable DAG automation pipelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--apple-red-subtle)',
            color: 'var(--apple-red)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            marginBottom: '14px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Preset Name */}
          <div className="apple-field-group">
            <label className="apple-field-label">Preset Name</label>
            <input
              type="text"
              className="apple-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. User Verification & Webhook Pipeline"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="apple-field-group">
            <label className="apple-field-label">Description (Optional)</label>
            <input
              type="text"
              className="apple-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Ingests user signup, transforms data, and dispatches to remote API"
            />
          </div>

          {/* Starting Blueprint Selection */}
          <div className="apple-field-group">
            <label className="apple-field-label">Initial Graph Blueprint</label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {/* Option 1: Current Canvas */}
              <div
                onClick={() => setTemplateOption('current')}
                style={{
                  background: templateOption === 'current' ? 'var(--apple-blue-subtle)' : 'var(--apple-secondary-bg)',
                  border: `1px solid ${templateOption === 'current' ? 'var(--apple-blue)' : 'var(--apple-border)'}`,
                  borderRadius: '9px',
                  padding: '10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={16} color={templateOption === 'current' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)'} style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: templateOption === 'current' ? 'var(--apple-blue)' : 'var(--apple-text-primary)' }}>
                  Current Canvas
                </div>
                <div style={{ fontSize: '10px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                  {currentCanvas?.nodes?.length || 0} nodes
                </div>
              </div>

              {/* Option 2: Starter Pipeline */}
              <div
                onClick={() => setTemplateOption('starter')}
                style={{
                  background: templateOption === 'starter' ? 'var(--apple-blue-subtle)' : 'var(--apple-secondary-bg)',
                  border: `1px solid ${templateOption === 'starter' ? 'var(--apple-blue)' : 'var(--apple-border)'}`,
                  borderRadius: '9px',
                  padding: '10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={16} color={templateOption === 'starter' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)'} style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: templateOption === 'starter' ? 'var(--apple-blue)' : 'var(--apple-text-primary)' }}>
                  Starter Flow
                </div>
                <div style={{ fontSize: '10px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                  Trigger → HTTP
                </div>
              </div>

              {/* Option 3: Blank Canvas */}
              <div
                onClick={() => setTemplateOption('blank')}
                style={{
                  background: templateOption === 'blank' ? 'var(--apple-blue-subtle)' : 'var(--apple-secondary-bg)',
                  border: `1px solid ${templateOption === 'blank' ? 'var(--apple-blue)' : 'var(--apple-border)'}`,
                  borderRadius: '9px',
                  padding: '10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileCode size={16} color={templateOption === 'blank' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)'} style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: templateOption === 'blank' ? 'var(--apple-blue)' : 'var(--apple-text-primary)' }}>
                  Blank Canvas
                </div>
                <div style={{ fontSize: '10px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                  1 Start Trigger
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="apple-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="apple-btn-primary" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Creating...' : 'Create Preset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
