import React from 'react';
import {
  Zap,
  Globe,
  Cpu,
  Clock,
  Sparkles,
  RotateCcw,
  Trash2,
  Download,
  Plus
} from 'lucide-react';

export default function FloatingDock({ onAddNode, onAutoLayout, onReset, onClear, onExport }) {
  return (
    <div className="floating-dock">
      {/* Node Palette Buttons */}
      <button
        className="btn-glass"
        onClick={() => onAddNode('webhookTrigger', { label: 'Webhook Trigger', eventType: 'order.created', webhookPath: 'order-events' })}
        title="Add Webhook Trigger Node"
      >
        <Zap size={13} color="#c084fc" />
        <span>+ Trigger</span>
      </button>

      <button
        className="btn-glass"
        onClick={() => onAddNode('httpRequest', { label: 'HTTP Request', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' })}
        title="Add HTTP Request Node"
      >
        <Globe size={13} color="#00f0ff" />
        <span>+ HTTP</span>
      </button>

      <button
        className="btn-glass"
        onClick={() => onAddNode('dataTransform', { label: 'JSON Transform', transformType: 'extract', extractKey: 'data' })}
        title="Add Data Transform Node"
      >
        <Cpu size={13} color="#f472b6" />
        <span>+ Transform</span>
      </button>

      <button
        className="btn-glass"
        onClick={() => onAddNode('delayTimer', { label: 'Delay Timer', delayMs: 1500 })}
        title="Add Delay Timer Node"
      >
        <Clock size={13} color="#facc15" />
        <span>+ Delay</span>
      </button>

      <div className="dock-divider" />

      {/* Auto-Layout using Kahn Stages */}
      <button
        className="btn-glass"
        onClick={onAutoLayout}
        title="Auto-organize nodes into mathematical Kahn topological stages"
      >
        <Sparkles size={13} color="#a855f7" />
        <span>Auto-Layout</span>
      </button>

      {/* Export JSON */}
      <button
        className="btn-glass"
        onClick={onExport}
        title="Export DAG workflow definition as JSON"
      >
        <Download size={13} />
        <span>Export</span>
      </button>

      {/* Reset to Preset Default */}
      <button
        className="btn-glass"
        onClick={onReset}
        title="Reset current workflow to preset defaults"
      >
        <RotateCcw size={13} />
        <span>Reset</span>
      </button>

      {/* Clear Canvas */}
      <button
        className="btn-glass"
        onClick={onClear}
        title="Clear entire canvas"
        style={{ color: '#f87171' }}
      >
        <Trash2 size={13} />
        <span>Clear</span>
      </button>
    </div>
  );
}
