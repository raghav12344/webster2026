import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
} from '@xyflow/react';
import {
  Play,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Activity,
  Radio,
  Skull,
  Layers,
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  Cpu,
  Clock
} from 'lucide-react';

import TriggerNode from './components/nodes/TriggerNode';
import HttpNode from './components/nodes/HttpNode';
import TransformNode from './components/nodes/TransformNode';
import DelayNode from './components/nodes/DelayNode';

import NodeInspector from './components/NodeInspector';
import WebhookModal from './components/WebhookModal';
import TopologyModal from './components/TopologyModal';
import FloatingDock from './components/FloatingDock';

import { wouldEdgeCreateCycle, detectCycleDFS, computeKahnTopologicalSort } from '../../shared/algorithms.js';

const nodeTypes = {
  webhookTrigger: TriggerNode,
  manualTrigger: TriggerNode,
  cronTrigger: TriggerNode,
  httpRequest: HttpNode,
  dataTransform: TransformNode,
  delayTimer: DelayNode
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [systemHealth, setSystemHealth] = useState(null);

  const [activeExecutionId, setActiveExecutionId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleAlert, setCycleAlert] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showTopologyModal, setShowTopologyModal] = useState(false);
  const [showDLQModal, setShowDLQModal] = useState(false);
  const [dlqItems, setDlqItems] = useState([]);

  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'worker' | 'error'
  const [showTerminal, setShowTerminal] = useState(true);

  const sseRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (showTerminal && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showTerminal]);

  // Initial load
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setSystemHealth(data))
      .catch(console.error);

    fetch('/api/presets')
      .then(r => r.json())
      .then(data => {
        setPresets(data);
        if (data.length > 0) {
          loadWorkflow(data[0]);
        }
      })
      .catch(console.error);

    // Initial DLQ check
    fetch('/api/dlq')
      .then(r => r.json())
      .then(items => setDlqItems(items))
      .catch(console.error);

    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, []);

  const loadWorkflow = (wf) => {
    setSelectedPresetId(wf.id);
    setSelectedNode(null);
    setIsRunning(false); // Reset execution lock on preset switch
    setCycleAlert(null); // Clear any past alerts
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    const resetNodes = wf.nodes.map(n => ({
      ...n,
      data: { ...n.data, status: 'IDLE', error: null, output: null }
    }));
    setNodes(resetNodes);
    setEdges(wf.edges);
    setActiveExecutionId(null);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Pipeline Loaded: "${wf.name}"`,
      `[${new Date().toLocaleTimeString()}] Topology: ${wf.nodes.length} nodes, ${wf.edges.length} directed edges.`
    ]);
  };

  // Node selection for inspector
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from inspector
  const handleUpdateNode = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          const updated = { ...n, data: newData };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  // Delete node
  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Removed node: ${nodeId}`]);
  };

  // Add new node from dock
  const handleAddNode = (type, defaultData) => {
    const id = `node_${Date.now().toString(36).substring(4)}`;
    const newNode = {
      id,
      type,
      position: { x: 300 + Math.random() * 150, y: 160 + Math.random() * 100 },
      data: { ...defaultData, status: 'IDLE' }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Created ${type} (${id})`]);
  };

  // Mathematical Auto-Layout using Kahn Topological Sort Stages
  const handleAutoLayout = () => {
    const kahn = computeKahnTopologicalSort(nodes, edges);
    if (!kahn.valid || !kahn.stages) {
      setCycleAlert('Cannot auto-layout: Graph contains a cycle or invalid connections.');
      return;
    }

    const newNodes = [...nodes];
    kahn.stages.forEach((stage, stageIdx) => {
      const stageHeight = stage.length;
      stage.forEach((nodeId, nodeIdxInStage) => {
        const node = newNodes.find(n => n.id === nodeId);
        if (node) {
          const x = 100 + stageIdx * 320;
          const y = 180 + nodeIdxInStage * 170 - ((stageHeight - 1) * 60);
          node.position = { x, y };
        }
      });
    });

    setNodes([...newNodes]);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Auto-Layout applied: Arranged ${kahn.stages.length} Kahn stages cleanly.`
    ]);
  };

  // Client-Side DFS Real-time Cycle Detection on Edge Connect!
  const onConnect = useCallback(
    (params) => {
      const cycleCheck = wouldEdgeCreateCycle(params.source, params.target, edges);

      if (cycleCheck.wouldCreateCycle) {
        const cycleStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
        setCycleAlert(`⛔ DORMAMMU LOOP DETECTED: Connecting ${params.source} to ${params.target} creates a cycle (${cycleStr}). A DAG must remain strictly acyclic.`);
        setTimeout(() => setCycleAlert(null), 7000);
        return; // Reject edge!
      }

      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Edge Connected: ${params.source} ➔ ${params.target} (DFS Validated)`
      ]);
    },
    [edges, setEdges]
  );

  // Trigger Execution
  const triggerRun = async () => {
    try {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      setIsRunning(true);
      setCycleAlert(null);

      // Validate topology
      const cycleCheck = detectCycleDFS(nodes, edges);
      if (cycleCheck.hasCycle) {
        setCycleAlert(`Cannot execute: Graph contains a cycle (${cycleCheck.cycleNodes.join(' → ')}).`);
        setIsRunning(false);
        return;
      }

      const kahn = computeKahnTopologicalSort(nodes, edges);
      if (!kahn.valid) {
        setCycleAlert(`Topology Error: ${kahn.error}`);
        setIsRunning(false);
        return;
      }

      // Reset node UI states
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, status: 'IDLE', error: null, output: null }
        }))
      );

      setLogs((prev) => [
        ...prev,
        `==================================================================`,
        `🚀 [DISPATCH] Kahn's Deterministic Order: ${kahn.order.join(' ➔ ')}`,
        `📦 Ingested into RabbitMQ in <15ms. Distributing to background workers...`
      ]);

      const res = await fetch(`/api/workflows/${selectedPresetId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: { id: selectedPresetId, nodes, edges },
          payload: { triggeredBy: 'react_flow_ui', timestamp: Date.now() }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveExecutionId(data.executionId);
      listenToSSEStream(data.executionId);
    } catch (err) {
      setCycleAlert(`Execution Error: ${err.message}`);
      setIsRunning(false);
    }
  };

  // Real-Time Server-Sent Events (SSE) Listener
  const listenToSSEStream = (execId) => {
    if (sseRef.current) sseRef.current.close();

    const sse = new EventSource(`/api/executions/${execId}/stream`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'INITIAL_STATE') {
          // Connected
        } else if (payload.type === 'EXECUTION_STARTED') {
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Pipeline started. Root tasks enqueued into RabbitMQ.`
          ]);
        } else if (payload.type === 'NODE_STATUS_CHANGE') {
          const { nodeId, status, message, error, logs: nodeLogs } = payload;

          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === nodeId) {
                const updated = {
                  ...n,
                  data: {
                    ...n.data,
                    status,
                    error: error || n.data.error,
                    output: payload.output || n.data.output
                  }
                };
                if (selectedNode && selectedNode.id === nodeId) {
                  setSelectedNode(updated);
                }
                return updated;
              }
              return n;
            })
          );

          if (message) {
            setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] [${nodeId}] ${message}`]);
          }
          if (nodeLogs && nodeLogs.length > 0) {
            setLogs((prev) => [
              ...prev,
              ...nodeLogs.map((l) => `  ↪ [${nodeId}] ${l}`)
            ]);
          }

          // If node was routed to DLQ, update DLQ count
          if (status === 'DEAD_LETTER') {
            fetch('/api/dlq')
              .then(r => r.json())
              .then(items => setDlqItems(items))
              .catch(console.error);
          }
        } else if (payload.type === 'EXECUTION_COMPLETED') {
          setIsRunning(false);
          setLogs((prev) => [
            ...prev,
            `🏁 [COMPLETED] ${payload.summary}`,
            `==================================================================`
          ]);
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
        }
      } catch (err) {
        console.error('SSE JSON error:', err);
      }
    };

    sse.onerror = () => {
      setIsRunning(false);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  };

  // DLQ inspector & replay
  const openDLQ = async () => {
    try {
      const res = await fetch('/api/dlq');
      const data = await res.json();
      setDlqItems(data);
      setShowDLQModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const replayDLQTask = async (dlqId) => {
    try {
      const res = await fetch(`/api/dlq/${dlqId}/replay`, { method: 'POST' });
      const data = await res.json();
      setLogs((prev) => [
        ...prev,
        `♻️ [DLQ Replay] Task ${data.task?.nodeId} replayed into RabbitMQ queue!`
      ]);
      openDLQ();
    } catch (err) {
      alert(`Replay failed: ${err.message}`);
    }
  };

  // Export Workflow JSON
  const exportWorkflowJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ id: selectedPresetId, nodes, edges }, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `chronosflow-${selectedPresetId}.json`);
    dl.click();
  };

  // Filter logs for terminal
  const filteredLogs = logs.filter(l => {
    if (logFilter === 'worker') return l.includes('worker_') || l.includes('Task');
    if (logFilter === 'error') return l.includes('error') || l.includes('DLQ') || l.includes('Fatal') || l.includes('503');
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#07090e' }}>
      {/* Top HUD Header */}
      <header className="hud-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
          }}>
            <RotateCcw size={22} color="#07090e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
                CHRONOSFLOW
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: 'rgba(139, 92, 246, 0.25)',
                color: '#c084fc',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.4)'
              }}>
                PS-04 // THE DORMAMMU LOOP
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Team FLCN (#272) • Raghav Gupta (20243226 CSE) • CodeSangam 2026
            </div>
          </div>
        </div>

        {/* Middle: Preset Segmented Tabs */}
        <div className="preset-tabs">
          {presets.map((p, idx) => {
            const shortTitles = ['01: Core Loop', '02: Retry & DLQ', '03: Diamond Parallel', '04: Cron Sentinel'];
            const icons = [Zap, AlertTriangle, Layers, Clock];
            const Icon = icons[idx] || Zap;
            return (
              <button
                key={p.id}
                className={`preset-tab-btn ${selectedPresetId === p.id ? 'active' : ''}`}
                onClick={() => loadWorkflow(p)}
              >
                <Icon size={13} color={selectedPresetId === p.id ? '#00f0ff' : '#94a3b8'} />
                <span>{shortTitles[idx] || p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right HUD Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-neon-primary"
            onClick={triggerRun}
            disabled={isRunning}
          >
            <Play size={14} fill="#07090e" />
            <span>{isRunning ? 'Executing...' : 'Run DAG'}</span>
          </button>

          <button className="btn-glass" onClick={() => setShowWebhookModal(true)} title="External HTTP Webhook Gateway">
            <Radio size={14} color="#00f0ff" />
            <span>Webhook</span>
          </button>

          <button className="btn-glass" onClick={() => setShowTopologyModal(true)} title="Inspect Mathematical Kahn Stages">
            <Layers size={14} color="#a855f7" />
            <span>Topology</span>
          </button>

          <button className="btn-glass" onClick={openDLQ} title="Dead-Letter Queue Vault">
            <Skull size={14} color="#ff0055" />
            <span>DLQ Vault</span>
            {dlqItems.length > 0 && (
              <span style={{
                background: '#ff0055',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 700
              }}>
                {dlqItems.length}
              </span>
            )}
          </button>

          <button className="btn-glass" onClick={() => setShowTerminal(!showTerminal)}>
            <Terminal size={14} color="#38bdf8" />
            <span>{showTerminal ? 'Hide Console' : 'Console'}</span>
          </button>
        </div>
      </header>

      {/* Cycle Alert Banner */}
      {cycleAlert && (
        <div className="cycle-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#ff0055" />
            <span>{cycleAlert}</span>
          </div>
          <button
            onClick={() => setCycleAlert(null)}
            style={{ background: 'transparent', border: 'none', color: '#fecdd3', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main React Flow Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#1e293b" gap={22} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.status === 'SUCCESS') return '#10b981';
              if (n.data?.status === 'RUNNING') return '#00f0ff';
              if (n.data?.status === 'RETRYING') return '#f59e0b';
              if (n.data?.status === 'DEAD_LETTER') return '#ff0055';
              return '#475569';
            }}
            style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </ReactFlow>

        {/* Floating Architecture Status Badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(14, 19, 31, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#cbd5e1',
          zIndex: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#00f0ff', fontWeight: 700 }}>
            <Activity size={14} />
            <span>AMQP Distributed Broker & Telemetry</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Broker: <span style={{ color: '#10b981', fontWeight: 600 }}>{systemHealth?.broker?.mode || 'AMQP Ready'}</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '10px' }}>
            Task Queue: <code>chronos.tasks</code> | DLQ: <code>chronos.dlq</code>
          </div>
        </div>

        {/* Modern Floating Bottom Dock */}
        <FloatingDock
          onAddNode={handleAddNode}
          onAutoLayout={handleAutoLayout}
          onReset={() => {
            const found = presets.find(p => p.id === selectedPresetId);
            if (found) loadWorkflow(found);
          }}
          onClear={() => {
            setNodes([]);
            setEdges([]);
            setSelectedNode(null);
          }}
          onExport={exportWorkflowJSON}
        />

        {/* Node Configuration Inspector Drawer */}
        <NodeInspector
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* Slide-Up Streaming Logs Console Terminal */}
      {showTerminal && (
        <div style={{
          background: '#04060a',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 20px',
          display: 'flex',
          flexDirection: 'column',
          height: '230px',
          zIndex: 25
        }}>
          {/* Console Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} color="#00f0ff" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                  Live Worker Telemetry & SSE Stream
                </span>
                {isRunning && (
                  <span style={{ fontSize: '11px', color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    ● Streaming...
                  </span>
                )}
              </div>

              {/* Log Level Filters */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {['all', 'worker', 'error'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    style={{
                      background: logFilter === f ? 'rgba(255,255,255,0.12)' : 'transparent',
                      border: 'none',
                      color: logFilter === f ? '#fff' : '#64748b',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setLogs([])}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear Console
            </button>
          </div>

          {/* Console Body */}
          <div className="terminal-window" style={{ flex: 1 }}>
            {filteredLogs.length === 0 ? (
              <div style={{ color: '#475569', fontStyle: 'italic' }}>
                Waiting for pipeline execution... Click "Run DAG" or "Webhook" to stream telemetry live.
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Webhook Gateway Modal */}
      <WebhookModal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        onTriggered={(execId) => {
          setActiveExecutionId(execId);
          listenToSSEStream(execId);
        }}
      />

      {/* Graph Topology & Kahn Stages Modal */}
      <TopologyModal
        isOpen={showTopologyModal}
        onClose={() => setShowTopologyModal(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* Dead-Letter Queue (DLQ) Vault Modal */}
      {showDLQModal && (
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
            border: '1px solid rgba(255, 0, 85, 0.4)',
            borderRadius: '16px',
            width: '680px',
            maxWidth: '92vw',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(255, 0, 85, 0.2)', borderRadius: '10px', color: '#ff0055' }}>
                  <Skull size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                    Dead-Letter Queue (DLQ) Isolation Vault
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Quarantined tasks exceeding max exponential backoff retries (Cap: 3)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDLQModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {dlqItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
                  <div>No tasks quarantined in Dead-Letter Queue.</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Run <strong>Preset 02 (Retry & DLQ)</strong> to see simulated failures quarantined here!
                  </div>
                </div>
              ) : (
                dlqItems.map((item, idx) => (
                  <div key={idx} style={{
                    background: '#141a29',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#ff0055', fontSize: '13px' }}>
                        Node: {item.task?.nodeId} ({item.task?.nodeType})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Attempts: {item.task?.attempt || 3} / 3
                        </span>
                        <button
                          onClick={() => replayDLQTask(item.id)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCcw size={11} /> Replay Task
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#fca5a5', marginBottom: '4px' }}>
                      Reason: {item.reason}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Last Error: {item.task?.lastError || 'Gateway failure'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
