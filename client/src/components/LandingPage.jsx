import React, { useState } from 'react';
import ThreeHeroCanvas from './ThreeHeroCanvas';
import {
  ArrowRight,
  GitFork,
  Cpu,
  Layers,
  ShieldCheck,
  RotateCcw,
  Activity,
  Server,
  Zap,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function LandingPage({ onOpenEditor, onSelectPreset, presets = [], isDarkMode = false }) {
  const [selected3DNode, setSelected3DNode] = useState(null);

  const pillars = [
    {
      icon: GitFork,
      color: '#af52de',
      title: "Kahn's Topological Sort",
      desc: "Mathematical execution order guaranteeing zero premature child task execution and client-side DFS cycle prevention."
    },
    {
      icon: Server,
      color: '#0071e3',
      title: 'Decoupled AMQP Queues',
      desc: 'RabbitMQ backpressure absorption with durable queues, prefetch limits, and explicit consumer acknowledgements.'
    },
    {
      icon: ShieldCheck,
      color: '#34c759',
      title: 'Redis Idempotency Locks',
      desc: 'Atomic SETNX locking ensures zero double-executions across distributed background worker nodes.'
    },
    {
      icon: RotateCcw,
      color: '#ff9500',
      title: 'Exponential Backoff with Jitter',
      desc: 'Self-healing retry protocol capping at 3 attempts before safely quarantining unrecoverable payloads in the DLQ.'
    }
  ];

  return (
    <div className="apple-landing">
      {/* Hero Section */}
      <section className="apple-hero">
        <div className="apple-hero-eyebrow">
          CodeSangam 2026 // PS-04 • The Dormammu Loop
        </div>

        <h1 className="apple-hero-title">
          Complex workflows.<br />
          Effortless orchestration.
        </h1>

        <p className="apple-hero-desc">
          An extensible, distributed Directed Acyclic Graph (DAG) automation engine.
          Compose event-driven pipelines, orchestrate asynchronous tasks with deterministic state transitions,
          and recover seamlessly from distributed failures.
        </p>

        <div className="apple-hero-ctas">
          <button className="apple-btn-primary" onClick={onOpenEditor} style={{ padding: '10px 22px', fontSize: '14px', borderRadius: '10px' }}>
            <span>Open Workflow Editor</span>
            <ArrowRight size={15} />
          </button>

          <button
            className="apple-btn-secondary"
            onClick={() => {
              const el = document.getElementById('architecture-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ padding: '10px 18px', fontSize: '14px', borderRadius: '10px' }}
          >
            Explore Architecture
          </button>
        </div>

        {/* 3D Interactive Workflow Canvas */}
        <div className="apple-3d-wrapper">
          <ThreeHeroCanvas onSelectNode={setSelected3DNode} isDarkMode={isDarkMode} />

          {/* Interactive 3D Node Tooltip Overlay */}
          {selected3DNode && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--apple-card)',
              border: '1px solid var(--apple-border)',
              borderRadius: '12px',
              padding: '12px 20px',
              boxShadow: 'var(--apple-shadow-sheet)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              animation: 'appleSlideDown 0.2s ease',
              zIndex: 10
            }}>
              <div style={{ fontSize: '20px' }}>{selected3DNode.icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                  {selected3DNode.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--apple-text-secondary)' }}>
                  Role: {selected3DNode.role} • 3D Distributed Engine Model
                </div>
              </div>
              <button
                className="apple-btn-primary"
                onClick={onOpenEditor}
                style={{ fontSize: '11.5px', padding: '4px 10px', marginLeft: '8px' }}
              >
                Inspect in Canvas
              </button>
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '20px',
            fontSize: '11px',
            color: 'var(--apple-text-tertiary)',
            pointerEvents: 'none'
          }}>
            Interactive 3D DAG • Move cursor to orbit scene • Click nodes to inspect
          </div>
        </div>
      </section>

      {/* Preset Demonstration Pipelines Section */}
      <section style={{ maxWidth: '1080px', margin: '0 auto 60px auto', padding: '0 24px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--apple-text-primary)' }}>
            Curated Architectural Demonstrations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
            Pre-configured pipelines showcasing determinism, concurrency, and fault tolerance.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {presets.map((p, idx) => {
            const icons = [Zap, RotateCcw, Layers, Clock];
            const colors = ['#af52de', '#ff3b30', '#0071e3', '#ff9500'];
            const Icon = icons[idx] || Zap;
            const color = colors[idx] || '#0071e3';

            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectPreset?.(p);
                  onOpenEditor();
                }}
                style={{
                  background: 'var(--apple-card)',
                  border: '1px solid var(--apple-border)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: 'var(--apple-shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--apple-shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--apple-shadow-sm)';
                }}
              >
                <div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${color}15`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}>
                    <Icon size={16} strokeWidth={2.2} />
                  </div>

                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '6px' }}>
                    {p.name.replace(/^\d+:\s*/, '')}
                  </h3>

                  <p style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', lineHeight: 1.45, marginBottom: '16px' }}>
                    {p.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--apple-divider)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--apple-blue)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Open in Canvas <ChevronRight size={12} />
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)' }}>
                    {p.nodes.length} nodes
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Engineering Pillars Section */}
      <section id="architecture-section" style={{ background: 'var(--apple-secondary-bg)', padding: '64px 24px', borderTop: '1px solid var(--apple-border)', borderBottom: '1px solid var(--apple-border)' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--apple-blue)', textTransform: 'uppercase' }}>
              Core Engineering
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--apple-text-primary)', marginTop: '6px' }}>
              Engineered for absolute resilience.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {pillars.map((pil, idx) => {
              const Icon = pil.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--apple-card)',
                    borderRadius: '14px',
                    padding: '24px',
                    border: '1px solid var(--apple-border)',
                    boxShadow: 'var(--apple-shadow-sm)'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${pil.color}15`,
                    color: pil.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px'
                  }}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '8px' }}>
                    {pil.title}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--apple-text-secondary)', lineHeight: 1.5 }}>
                    {pil.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', fontSize: '12px', color: 'var(--apple-text-tertiary)' }}>
        <div>
          ChronosFlow • Problem Statement PS-04: The Dormammu Loop • Team FLCN (#272)
        </div>
        <div style={{ marginTop: '4px' }}>
          Raghav Gupta (20243226 CSE) • CodeSangam 2026 // MNNIT Allahabad
        </div>
      </footer>
    </div>
  );
}
