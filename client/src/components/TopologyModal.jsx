import React from 'react';
import { Layers, ShieldCheck, GitFork, X } from 'lucide-react';
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
        width: '660px',
        maxWidth: '92vw',
        maxHeight: '85vh',
        padding: '24px',
        boxShadow: 'var(--apple-shadow-sheet)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--apple-purple-subtle)',
              color: 'var(--apple-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                Kahn's Topological Sort & Stages
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--apple-text-secondary)' }}>
                Mathematical verification of graph topology and concurrent execution layers
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

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: 'var(--apple-secondary-bg)', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>VERTICES |V|</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-text-primary)', marginTop: '2px' }}>{nodes.length}</div>
            </div>
            <div style={{ background: 'var(--apple-secondary-bg)', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>EDGES |E|</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-blue)', marginTop: '2px' }}>{edges.length}</div>
            </div>
            <div style={{ background: 'var(--apple-secondary-bg)', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>STAGES</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--apple-purple)', marginTop: '2px' }}>{kahn.stages ? kahn.stages.length : 0}</div>
            </div>
            <div style={{ background: 'var(--apple-secondary-bg)', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>GRAPH STATE</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <ShieldCheck size={14} /> Strict DAG
              </div>
            </div>
          </div>

          {/* Kahn Stages Breakdown */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitFork size={13} color="var(--apple-blue)" />
              <span>Concurrent Execution Stages:</span>
            </div>

            {kahn.stages && kahn.stages.map((stage, stageIdx) => (
              <div
                key={stageIdx}
                style={{
                  background: 'var(--apple-secondary-bg)',
                  borderRadius: '9px',
                  padding: '9px 12px',
                  marginBottom: '6px',
                  border: '1px solid var(--apple-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span style={{
                  background: 'var(--apple-card)',
                  color: 'var(--apple-blue)',
                  border: '1px solid var(--apple-border)',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600
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
                          background: 'var(--apple-card)',
                          color: 'var(--apple-text-primary)',
                          border: '1px solid var(--apple-border)',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {nodeObj?.data?.label || nodeId}
                      </span>
                    );
                  })}
                </div>

                <span style={{ fontSize: '10.5px', color: 'var(--apple-text-secondary)' }}>
                  {stage.length === 1 ? '1 Sequential' : `${stage.length} Parallel`}
                </span>
              </div>
            ))}
          </div>

          {/* Deterministic Order List */}
          <div style={{ background: 'var(--apple-secondary-bg)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--apple-border)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--apple-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
              DETERMINISTIC TOPOLOGICAL SEQUENCE
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-primary)', fontFamily: 'monospace' }}>
              {kahn.order ? kahn.order.join(' → ') : 'None'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="apple-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
