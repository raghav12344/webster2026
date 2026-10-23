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
  Download,
  Upload,
  RefreshCw,
  Plus
} from 'lucide-react';

import TriggerNode from './components/nodes/TriggerNode';
import HttpNode from './components/nodes/HttpNode';
import TransformNode from './components/nodes/TransformNode';
import DelayNode from './components/nodes/DelayNode';

import NodeInspector from './components/NodeInspector';
import WebhookModal from './components/WebhookModal';
import AddNodePalette from './components/AddNodePalette';

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
  const [showDLQModal, setShowDLQModal] = useState(false);
  const [dlqItems, setDlqItems] = useState([]);

  const [logs, setLogs] = useState([]);
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

    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, []);

  const loadWorkflow = (wf) => {
    setSelectedPresetId(wf.id);
    setSelectedNode(null);
    const resetNodes = wf.nodes.map(n => ({
      ...n,
      data: { ...n.data, status: 'IDLE', error: null, output: null }
    }));
    setNodes(resetNodes);
    setEdges(wf.edges);
    setActiveExecutionId(null);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Loaded workflow: "${wf.name}"`,
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
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Deleted node: ${nodeId}`]);
  };

  // Add new node from palette
  const handleAddNode = (type, defaultData) => {
    const id = `node_${Date.now().toString(36).substring(4)}`;
    const newNode = {
      id,
      type,
      position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 150 },
      data: { ...defaultData, status: 'IDLE' }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Created new ${type} node (${id})`]);
  };

  // Client-Side DFS Real-time Cycle Detection on Edge Connect!
  const onConnect = useCallback(
    (params) => {
      const cycleCheck = wouldEdgeCreateCycle(params.source, params.target, edges);

      if (cycleCheck.wouldCreateCycle) {
        const cycleStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
        setCycleAlert(`⛔ Dormammu Cycle Blocked! Connecting ${params.source} to ${params.target} creates a loop (${cycleStr}). A DAG must remain strictly acyclic.`);
        setTimeout(() => setCycleAlert(null), 6000);
        return; // Block connection
      }

      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Edge created: ${params.source} → ${params.target} (DFS Validated)`
      ]);
    },
    [edges, setEdges]
  );

  // Trigger Execution
  const triggerRun = async () => {
    try {
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
        `-------------------------------------------------------`,
        `🚀 [DISPATCH] Kahn's Topological Order: ${kahn.order.join(' → ')}`,
        `📦 Dispatching execution payload to API Gateway...`
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
          // Received snapshot
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
        } else if (payload.type === 'EXECUTION_COMPLETED') {
          setIsRunning(false);
          setLogs((prev) => [
            ...prev,
            `🏁 [COMPLETED] ${payload.summary}`,
            `-------------------------------------------------------`
          ]);
          sse.close();
        }
      } catch (err) {
        console.error('SSE JSON error:', err);
      }
    };

    sse.onerror = () => {
      setIsRunning(false);
      sse.close();
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
      // Refresh DLQ
      openDLQ();
    } catch (err) {
      alert(`Replay failed: ${err.message}`);
    }
  };

  // Export / Import Workflow JSON
  const exportWorkflowJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ id: selectedPresetId, nodes, edges }, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `chronosflow-${selectedPresetId}.json`);
    dl.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0e17' }}>
      {/* Top Header Bar */}
      <header className="header-glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)'
          }}>
            <RotateCcw size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', color: '#f8fafc' }}>
                CHRONOSFLOW
              </h1>
              <span style={{ fontSize: '11px', background: 'rgba(139, 92, 246, 0.25)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                PS-04 // THE DORMAMMU LOOP
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Team FLCN (#272) • Raghav Gupta (20243226 CSE) • CodeSangam 2026
            </div>
          </div>
        </div>

        {/* Middle: Preset Pipeline Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pipeline:</span>
          <select
            value={selectedPresetId}
            onChange={(e) => {
              const found = presets.find((p) => p.id === e.target.value);
              if (found) loadWorkflow(found);
            }}
            style={{
              background: '#131c2e',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-primary"
            onClick={triggerRun}
            disabled={isRunning}
            style={{ opacity: isRunning ? 0.6 : 1 }}
          >
            <Play size={14} fill="#fff" />
            {isRunning ? 'Executing DAG...' : 'Run Pipeline'}
          </button>

          <button className="btn-secondary" onClick={() => setShowWebhookModal(true)}>
            <Radio size={14} color="#06b6d4" />
            Webhook Gateway
          </button>

          <button className="btn-secondary" onClick={openDLQ}>
            <Skull size={14} color="#f43f5e" />
            DLQ Inspector
          </button>

          <button className="btn-secondary" onClick={exportWorkflowJSON} title="Export Workflow JSON">
            <Download size={14} />
          </button>

          <button className="btn-secondary" onClick={() => setShowTerminal(!showTerminal)}>
            <Terminal size={14} color="#a78bfa" />
            {showTerminal ? 'Hide Terminal' : 'Live Logs'}
          </button>
        </div>
      </header>

      {/* Cycle Alert Banner */}
      {cycleAlert && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500,
          animation: 'slideDown 0.3s ease'
        }}>
          <ShieldAlert size={18} color="#ef4444" />
          <span>{cycleAlert}</span>
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
          <Background color="#1e293b" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.status === 'SUCCESS') return '#10b981';
              if (n.data?.status === 'RUNNING') return '#06b6d4';
              if (n.data?.status === 'RETRYING') return '#f59e0b';
              if (n.data?.status === 'DEAD_LETTER') return '#f43f5e';
              return '#475569';
            }}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </ReactFlow>

        {/* Floating Architecture Badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#cbd5e1',
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#38bdf8', fontWeight: 600 }}>
            <Activity size={14} />
            <span>Distributed AMQP & Telemetry Engine</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Broker: <span style={{ color: '#34d399' }}>{systemHealth?.broker?.mode || 'AMQP Ready'}</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Queue: <code>chronos.tasks</code> | DLQ: <code>chronos.dlq</code>
          </div>
        </div>

        {/* Add Node Palette Bar */}
        <AddNodePalette onAddNode={handleAddNode} />

        {/* Node Configuration Inspector Drawer */}
        <NodeInspector
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* Slide-Up Streaming Logs Terminal */}
      {showTerminal && (
        <div style={{
          background: '#070b13',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          height: '240px',
          zIndex: 25
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} color="#38bdf8" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                Real-Time Worker Telemetry & SSE Log Stream
              </span>
              {isRunning && (
                <span style={{ fontSize: '11px', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ● Streaming...
                </span>
              )}
            </div>
            <button
              onClick={() => setLogs([])}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear Logs
            </button>
          </div>

          <div className="terminal-window" style={{ flex: 1 }}>
            {logs.length === 0 ? (
              <div style={{ color: '#475569', fontStyle: 'italic' }}>
                Waiting for pipeline execution... Click "Run Pipeline" or "Webhook Gateway".
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '3px', lineHeight: '1.4' }}>
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      <WebhookModal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        onTriggered={(execId) => {
          setActiveExecutionId(execId);
          listenToSSEStream(execId);
        }}
      />

      {/* Dead-Letter Queue (DLQ) Inspector Modal */}
      {showDLQModal && (
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
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '14px',
            width: '680px',
            maxWidth: '92vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '8px', color: '#f43f5e' }}>
                  <Skull size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>Dead-Letter Queue (DLQ) Inspector</h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>Quarantined tasks exceeding max exponential backoff retries (Cap: 3)</p>
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
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  🎉 No tasks in Dead-Letter Queue. All pipelines executed without unrecoverable crashes!
                </div>
              ) : (
                dlqItems.map((item, idx) => (
                  <div key={idx} style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, color: '#f43f5e', fontSize: '13px' }}>
                        Node: {item.task?.nodeId} ({item.task?.nodeType})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                          Attempts: {item.task?.attempt || 3}
                        </span>
                        <button
                          onClick={() => replayDLQTask(item.id)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RefreshCw size={11} /> Replay
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '4px' }}>
                      Reason: {item.reason}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Last Error: <code>{item.task?.lastError || 'Gateway failure'}</code>
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
