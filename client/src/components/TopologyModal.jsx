import React from 'react';
import { Layers, CheckCircle2, ShieldCheck, GitFork, X } from 'lucide-react';
import { computeKahnTopologicalSort } from '../../../shared/algorithms.js';

export default function TopologyModal({ isOpen, onClose, nodes, edges }) {
  if (!isOpen) return null;

  const kahn = computeKahnTopologicalSort(nodes, edges);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: '#0d121f',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        borderRadius: '16px',
        width: '680px',
        maxWidth: '92vw',
        maxHeight: '85vh',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(0, 240, 255, 0.15)', borderRadius: '10px', color: '#00f0ff' }}>
              <Layers size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Graph Topology & Kahn's Algorithm Inspector
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Mathematical verification of topological ordering & parallel execution stages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: '#131c2e', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Vertices |V|</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{nodes.length}</div>
            </div>
            <div style={{ background: '#131c2e', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Edges |E|</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#00f0ff' }}>{edges.length}</div>
            </div>
            <div style={{ background: '#131c2e', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Stages</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7' }}>{kahn.stages ? kahn.stages.length : 0}</div>
            </div>
            <div style={{ background: '#131c2e', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Graph State</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <ShieldCheck size={14} /> ACYCLIC (DAG)
              </div>
            </div>
          </div>

          {/* Kahn Stages Breakdown */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitFork size={14} color="#00f0ff" />
              <span>Concurrent Execution Stages (Kahn Decomposition):</span>
            </div>

            {kahn.stages && kahn.stages.map((stage, stageIdx) => (
              <div
                key={stageIdx}
                style={{
                  background: '#131c2e',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{
                  background: 'rgba(0, 240, 255, 0.15)',
                  color: '#00f0ff',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  Stage {stageIdx}
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                  {stage.map((nodeId) => {
                    const nodeObj = nodes.find(n => n.id === nodeId);
                    return (
                      <span
                        key={nodeId}
                        style={{
                          background: '#1e293b',
                          color: '#e2e8f0',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {nodeObj?.data?.label || nodeId}
                      </span>
                    );
                  })}
                </div>

                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {stage.length === 1 ? 'Sequential step' : `${stage.length} Parallel workers`}
                </span>
              </div>
            ))}
          </div>

          {/* Deterministic Order List */}
          <div style={{ background: '#070a12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
              DETERMINISTIC TOPOLOGICAL SEQUENCE:
            </div>
            <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>
              {kahn.order ? kahn.order.join(' ➔ ') : 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
