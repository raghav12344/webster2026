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
  Zap,
  Globe,
  Cpu,
  Hourglass,
  Clock,
  Sparkles,
  RotateCcw,
  Skull,
  Radio,
  Layers,
  Terminal,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Check,
  X
} from 'lucide-react';

import {
  AppleTriggerNode,
  AppleHttpNode,
  AppleTransformNode,
  AppleDelayNode
} from './nodes/AppleCustomNodes';

import WebhookModal from './WebhookModal';
import TopologyModal from './TopologyModal';
import NewPresetModal from './NewPresetModal';
import { wouldEdgeCreateCycle, detectCycleDFS, computeKahnTopologicalSort } from '../../../shared/algorithms.js';

const nodeTypes = {
  webhookTrigger: AppleTriggerNode,
  manualTrigger: AppleTriggerNode,
  cronTrigger: AppleTriggerNode,
  httpRequest: AppleHttpNode,
  dataTransform: AppleTransformNode,
  delayTimer: AppleDelayNode
};

export default function WorkflowEditor({
  presets = [],
  selectedPreset,
  onSelectPreset,
  onPresetsUpdated,
  onOpenObservability
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [activeExecutionId, setActiveExecutionId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleAlert, setCycleAlert] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('config'); // 'config' | 'output'
  const [isTestingNode, setIsTestingNode] = useState(false);
  const [nodeTestResult, setNodeTestResult] = useState(null);

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showTopologyModal, setShowTopologyModal] = useState(false);
  const [showNewPresetModal, setShowNewPresetModal] = useState(false);

  const handlePresetCreated = (newPreset) => {
    onPresetsUpdated?.([newPreset, ...presets]);
    onSelectPreset?.(newPreset);
    loadWorkflow(newPreset);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Created and loaded custom preset: "${newPreset.name}".`
    ]);
  };

  const handleDeletePreset = async (presetId) => {
    if (!window.confirm('Are you sure you want to delete this custom preset?')) return;
    try {
      const res = await fetch(`/api/presets/${presetId}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = presets.filter((p) => p.id !== presetId);
        onPresetsUpdated?.(remaining);
        if (remaining.length > 0) {
          onSelectPreset?.(remaining[0]);
          loadWorkflow(remaining[0]);
        }
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Deleted custom preset.`
        ]);
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  const sseRef = useRef(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (isConsoleOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isConsoleOpen]);

  // Load Preset
  const loadWorkflow = useCallback((wf) => {
    if (!wf) return;
    setSelectedNode(null);
    setIsRunning(false);
    setCycleAlert(null);
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const resetNodes = wf.nodes.map((n) => ({
      ...n,
      data: { ...n.data, status: 'IDLE', error: null, output: null }
    }));
    setNodes(resetNodes);
    setEdges(wf.edges);
    setActiveExecutionId(null);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Pipeline Loaded: "${wf.name.replace(/^\d+:\s*/, '')}"`,
      `[${new Date().toLocaleTimeString()}] Graph Structure: ${wf.nodes.length} nodes, ${wf.edges.length} directed edges.`
    ]);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (selectedPreset) {
      loadWorkflow(selectedPreset);
    }
  }, [selectedPreset, loadWorkflow]);

  // Handle Drag & Drop Node Creation from Sidebar
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/chronosflow-node-type');
      if (!type) return;

      const position = {
        x: event.clientX - 300,
        y: event.clientY - 120
      };

      const defaultDataMap = {
        webhookTrigger: { label: 'Webhook Trigger', eventType: 'order.created', webhookPath: 'order-events' },
        cronTrigger: { label: 'Schedule Trigger', cronExpression: '*/30 * * * * *', eventType: 'system.cron' },
        httpRequest: { label: 'HTTP Request', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' },
        dataTransform: { label: 'JSON Transform', transformType: 'extract', extractKey: 'data' },
        delayTimer: { label: 'Delay Timer', delayMs: 1500 }
      };

      const id = `node_${Date.now().toString(36).substring(4)}`;
      const newNode = {
        id,
        type,
        position,
        data: { ...(defaultDataMap[type] || { label: type }), status: 'IDLE' }
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Added ${newNode.data.label} to canvas.`]);
    },
    [setNodes]
  );

  const addNodeFromClick = (type, defaultData) => {
    const id = `node_${Date.now().toString(36).substring(4)}`;
    const newNode = {
      id,
      type,
      position: { x: 320 + Math.random() * 120, y: 180 + Math.random() * 100 },
      data: { ...defaultData, status: 'IDLE' }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Added ${defaultData.label} to canvas.`]);
  };

  // Node Selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setNodeTestResult(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update Node Config from Inspector
  const handleUpdateNode = (key, value) => {
    if (!selectedNode) return;
    const updatedData = { ...selectedNode.data, [key]: value };
    const updatedNode = { ...selectedNode, data: updatedData };
    setSelectedNode(updatedNode);
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? updatedNode : n)));
  };

  // Delete Node
  const handleDeleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Removed node ${id}.`]);
  };

  // Test Single Node in Isolation
  const testSingleNode = async () => {
    if (!selectedNode) return;
    setIsTestingNode(true);
    setNodeTestResult(null);
    try {
      const { type, data } = selectedNode;
      if (type === 'httpRequest') {
        if (data.simulateFailure) {
          throw new Error('HTTP 503 Service Unavailable: Simulated microservice outage');
        }
        const res = await fetch(data.url || 'https://jsonplaceholder.typicode.com/posts/1');
        const json = await res.json();
        setNodeTestResult({ status: res.status, ok: res.ok, data: json });
      } else if (type === 'delayTimer') {
        await new Promise((r) => setTimeout(r, data.delayMs || 1000));
        setNodeTestResult({ status: 'completed', waitedMs: data.delayMs || 1000 });
      } else {
        setNodeTestResult({ status: 'success', transformed: true, processedAt: new Date().toISOString() });
      }
      setActiveInspectorTab('output');
    } catch (err) {
      setNodeTestResult({ error: err.message });
      setActiveInspectorTab('output');
    } finally {
      setIsTestingNode(false);
    }
  };

  // Mathematical Auto-Layout using Kahn Stages
  const handleAutoLayout = () => {
    const kahn = computeKahnTopologicalSort(nodes, edges);
    if (!kahn.valid || !kahn.stages) {
      setCycleAlert('Cannot organize graph: cyclic dependency detected.');
      return;
    }

    const newNodes = [...nodes];
    kahn.stages.forEach((stage, stageIdx) => {
      const stageHeight = stage.length;
      stage.forEach((nodeId, nodeIdxInStage) => {
        const node = newNodes.find((n) => n.id === nodeId);
        if (node) {
          const x = 120 + stageIdx * 330;
          const y = 200 + nodeIdxInStage * 170 - (stageHeight - 1) * 60;
          node.position = { x, y };
        }
      });
    });

    setNodes([...newNodes]);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Layout optimized: ${kahn.stages.length} topological execution stages aligned.`
    ]);
  };

  // Client-Side DFS Real-time Cycle Detection on Connection
  const onConnect = useCallback(
    (params) => {
      const cycleCheck = wouldEdgeCreateCycle(params.source, params.target, edges);

      if (cycleCheck.wouldCreateCycle) {
        const cycleStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
        setCycleAlert(`Cyclic Connection Blocked: Connecting ${params.source} to ${params.target} creates a loop (${cycleStr}). A DAG must remain strictly acyclic.`);
        setTimeout(() => setCycleAlert(null), 6000);
        return; // Reject edge
      }

      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Dependency Linked: ${params.source} → ${params.target} (Acyclic Validated)`
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

      // Validate topology before execution
      const cycleCheck = detectCycleDFS(nodes, edges);
      if (cycleCheck.hasCycle) {
        setCycleAlert(`Execution rejected: Graph contains a cycle (${cycleCheck.cycleNodes.join(' → ')}).`);
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
        `------------------------------------------------------------------------`,
        `[${new Date().toLocaleTimeString()}] Ingesting workflow into RabbitMQ broker...`,
        `[${new Date().toLocaleTimeString()}] Kahn's Deterministic Order: ${kahn.order.join(' → ')}`
      ]);

      const res = await fetch(`/api/workflows/${selectedPreset?.id || 'custom'}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: { id: selectedPreset?.id, nodes, edges },
          payload: { triggeredBy: 'editor_ui', timestamp: Date.now() }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveExecutionId(data.executionId);
      listenToSSEStream(data.executionId);
    } catch (err) {
      setCycleAlert(`Execution error: ${err.message}`);
      setIsRunning(false);
    }
  };

  // Real-Time SSE Listener
  const listenToSSEStream = (execId) => {
    if (sseRef.current) sseRef.current.close();

    const sse = new EventSource(`/api/executions/${execId}/stream`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'EXECUTION_STARTED') {
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Pipeline started. Root tasks dispatched to worker pool.`
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
            setLogs((prev) => [...prev, ...nodeLogs.map((l) => `    ↪ [${nodeId}] ${l}`)]);
          }
        } else if (payload.type === 'EXECUTION_COMPLETED') {
          setIsRunning(false);
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Summary: ${payload.summary}`,
            `------------------------------------------------------------------------`
          ]);
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
        }
      } catch (err) {
        console.error('SSE Error:', err);
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

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'worker') return l.includes('Worker') || l.includes('Task');
    if (logFilter === 'error') return l.includes('error') || l.includes('DLQ') || l.includes('503') || l.includes('halted');
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', background: 'var(--apple-canvas)' }}>
      {/* Secondary Toolbar */}
      <div style={{
        height: '44px',
        background: 'var(--apple-card)',
        borderBottom: '1px solid var(--apple-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 20
      }}>
        {/* Left: Preset Selector & New Preset Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>Workflow:</span>
          <select
            value={selectedPreset?.id || ''}
            onChange={(e) => {
              const found = presets.find((p) => p.id === e.target.value);
              if (found) {
                onSelectPreset(found);
                loadWorkflow(found);
              }
            }}
            style={{
              background: 'var(--apple-secondary-bg)',
              color: 'var(--apple-text-primary)',
              border: '1px solid var(--apple-border)',
              borderRadius: '7px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.replace(/^\d+:\s*/, '')} {p.isCustom ? '★ (Custom)' : ''}
              </option>
            ))}
          </select>

          <button
            className="apple-btn-secondary"
            onClick={() => setShowNewPresetModal(true)}
            title="Create a new custom workflow preset"
            style={{ fontSize: '11.5px', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={12} color="var(--apple-blue)" />
            <span>New Preset</span>
          </button>

          {selectedPreset?.isCustom && (
            <button
              className="apple-btn-icon"
              onClick={() => handleDeletePreset(selectedPreset.id)}
              title="Delete this custom preset"
              style={{ width: '28px', height: '28px' }}
            >
              <Trash2 size={13} color="var(--apple-red)" />
            </button>
          )}

          <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginLeft: '4px' }}>
            {nodes.length} nodes • {edges.length} edges
          </span>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="apple-btn-secondary"
            onClick={handleAutoLayout}
            title="Auto-arrange nodes based on Kahn's topological stages"
          >
            <Sparkles size={12} color="var(--apple-purple)" />
            <span>Auto-Layout</span>
          </button>

          <button
            className="apple-btn-secondary"
            onClick={() => setShowTopologyModal(true)}
            title="Inspect graph theoretical properties"
          >
            <Layers size={12} color="var(--apple-blue)" />
            <span>Kahn Stages</span>
          </button>

          <button
            className="apple-btn-secondary"
            onClick={() => setShowWebhookModal(true)}
            title="External HTTP Webhook Gateway"
          >
            <Radio size={12} color="var(--apple-blue)" />
            <span>Webhook</span>
          </button>

          <button
            className="apple-btn-primary"
            onClick={triggerRun}
            disabled={isRunning}
            style={{ minWidth: '95px', justifyContent: 'center' }}
          >
            <Play size={12} fill="#ffffff" />
            <span>{isRunning ? 'Running...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Cycle Alert Toast */}
      {cycleAlert && (
        <div className="apple-alert-toast">
          <AlertCircle size={16} color="var(--apple-red)" />
          <span>{cycleAlert}</span>
          <button
            onClick={() => setCycleAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer', marginLeft: '6px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Workspace (Sidebar + Canvas + Contextual Inspector) */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Sidebar: Drag & Drop Node Library */}
        <aside className="apple-sidebar">
          <div className="apple-sidebar-section-title">Triggers</div>

          <div
            className="apple-sidebar-item"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/chronosflow-node-type', 'webhookTrigger')}
            onClick={() => addNodeFromClick('webhookTrigger', { label: 'Webhook Trigger', eventType: 'order.created', webhookPath: 'order-events' })}
          >
            <div className="apple-node-icon trigger" style={{ width: '22px', height: '22px' }}>
              <Zap size={12} />
            </div>
            <span>Webhook Trigger</span>
          </div>

          <div
            className="apple-sidebar-item"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/chronosflow-node-type', 'cronTrigger')}
            onClick={() => addNodeFromClick('cronTrigger', { label: 'Cron Scheduler', cronExpression: '*/30 * * * * *', eventType: 'system.cron' })}
          >
            <div className="apple-node-icon trigger" style={{ width: '22px', height: '22px' }}>
              <Clock size={12} />
            </div>
            <span>Schedule Trigger</span>
          </div>

          <div className="apple-sidebar-section-title" style={{ marginTop: '16px' }}>Tasks & Logic</div>

          <div
            className="apple-sidebar-item"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/chronosflow-node-type', 'httpRequest')}
            onClick={() => addNodeFromClick('httpRequest', { label: 'HTTP Request', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' })}
          >
            <div className="apple-node-icon http" style={{ width: '22px', height: '22px' }}>
              <Globe size={12} />
            </div>
            <span>HTTP Request</span>
          </div>

          <div
            className="apple-sidebar-item"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/chronosflow-node-type', 'dataTransform')}
            onClick={() => addNodeFromClick('dataTransform', { label: 'Data Transform', transformType: 'extract', extractKey: 'data' })}
          >
            <div className="apple-node-icon transform" style={{ width: '22px', height: '22px' }}>
              <Cpu size={12} />
            </div>
            <span>Data Transform</span>
          </div>

          <div
            className="apple-sidebar-item"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/chronosflow-node-type', 'delayTimer')}
            onClick={() => addNodeFromClick('delayTimer', { label: 'Delay Timer', delayMs: 1500 })}
          >
            <div className="apple-node-icon delay" style={{ width: '22px', height: '22px' }}>
              <Hourglass size={12} />
            </div>
            <span>Delay Timer</span>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--apple-divider)', fontSize: '11px', color: 'var(--apple-text-tertiary)' }}>
            Drag nodes onto canvas or click to place.
          </div>
        </aside>

        {/* Center: React Flow Canvas */}
        <div style={{ flex: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
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
            <Background color="var(--canvas-grid)" gap={22} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.status === 'SUCCESS') return '#34c759';
                if (n.data?.status === 'RUNNING') return '#0071e3';
                if (n.data?.status === 'RETRYING') return '#ff9500';
                if (n.data?.status === 'DEAD_LETTER') return '#ff3b30';
                return '#c7c7cc';
              }}
              style={{ background: 'var(--apple-card)', border: '1px solid var(--apple-border)' }}
            />
          </ReactFlow>
        </div>

        {/* Right: Contextual Node Inspector Drawer */}
        {selectedNode && (
          <aside className="apple-inspector">
            <div className="apple-inspector-header">
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                  {selectedNode.data.label || selectedNode.id}
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--apple-text-secondary)', fontFamily: 'monospace' }}>
                  ID: {selectedNode.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', background: 'var(--apple-secondary-bg)', padding: '2px', borderRadius: '7px', marginBottom: '16px' }}>
              <button
                onClick={() => setActiveInspectorTab('config')}
                style={{
                  flex: 1,
                  background: activeInspectorTab === 'config' ? 'var(--apple-card)' : 'transparent',
                  border: 'none',
                  color: activeInspectorTab === 'config' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
                  padding: '5px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveInspectorTab('output')}
                style={{
                  flex: 1,
                  background: activeInspectorTab === 'output' ? 'var(--apple-card)' : 'transparent',
                  border: 'none',
                  color: activeInspectorTab === 'output' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
                  padding: '5px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Output & Logs
              </button>
            </div>

            {/* TAB: CONFIGURATION */}
            {activeInspectorTab === 'config' && (
              <div>
                <div className="apple-field-group">
                  <label className="apple-field-label">Label</label>
                  <input
                    type="text"
                    className="apple-input"
                    value={selectedNode.data.label || ''}
                    onChange={(e) => handleUpdateNode('label', e.target.value)}
                  />
                </div>

                {/* HTTP Request Parameters */}
                {selectedNode.type === 'httpRequest' && (
                  <>
                    <div className="apple-field-group">
                      <label className="apple-field-label">Method & Endpoint</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          className="apple-input"
                          style={{ width: '85px', fontWeight: 600, color: 'var(--apple-blue)' }}
                          value={selectedNode.data.method || 'GET'}
                          onChange={(e) => handleUpdateNode('method', e.target.value)}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                        <input
                          type="text"
                          className="apple-input monospace"
                          value={selectedNode.data.url || ''}
                          onChange={(e) => handleUpdateNode('url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div style={{ background: 'var(--apple-secondary-bg)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                      <label className="apple-toggle-label">
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Simulate 503 Gateway Failure</span>
                        <div
                          className={`apple-toggle ${selectedNode.data.simulateFailure ? 'is-checked' : ''}`}
                          onClick={() => handleUpdateNode('simulateFailure', !selectedNode.data.simulateFailure)}
                        >
                          <div className="apple-toggle-thumb" />
                        </div>
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', display: 'block', marginTop: '2px' }}>
                        Forces exponential backoff retries & DLQ quarantine demonstration.
                      </span>
                    </div>
                  </>
                )}

                {/* Delay Timer Parameters */}
                {selectedNode.type === 'delayTimer' && (
                  <div className="apple-field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="apple-field-label">Delay Interval</label>
                      <span className="monospace" style={{ fontSize: '12px', fontWeight: 600 }}>
                        {selectedNode.data.delayMs || 1000} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="5000"
                      step="100"
                      value={selectedNode.data.delayMs || 1000}
                      onChange={(e) => handleUpdateNode('delayMs', parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--apple-blue)', cursor: 'pointer' }}
                    />
                  </div>
                )}

                {/* Data Transform Parameters */}
                {selectedNode.type === 'dataTransform' && (
                  <>
                    <div className="apple-field-group">
                      <label className="apple-field-label">Transform Operation</label>
                      <select
                        className="apple-input"
                        value={selectedNode.data.transformType || 'extract'}
                        onChange={(e) => handleUpdateNode('transformType', e.target.value)}
                      >
                        <option value="extract">Extract Key</option>
                        <option value="aggregate">Aggregate Parents</option>
                        <option value="custom">Custom Normalizer</option>
                      </select>
                    </div>

                    <div className="apple-field-group">
                      <label className="apple-field-label">Expression / Notes</label>
                      <input
                        type="text"
                        className="apple-input"
                        value={selectedNode.data.expression || ''}
                        onChange={(e) => handleUpdateNode('expression', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Trigger Parameters */}
                {(selectedNode.type === 'webhookTrigger' || selectedNode.type === 'manualTrigger') && (
                  <div className="apple-field-group">
                    <label className="apple-field-label">Event Name</label>
                    <input
                      type="text"
                      className="apple-input monospace"
                      value={selectedNode.data.eventType || 'event.incoming'}
                      onChange={(e) => handleUpdateNode('eventType', e.target.value)}
                    />
                  </div>
                )}

                {/* Test Single Node Button */}
                <button
                  className="apple-btn-secondary"
                  onClick={testSingleNode}
                  disabled={isTestingNode}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                >
                  <Play size={12} color="var(--apple-blue)" />
                  <span>{isTestingNode ? 'Testing...' : 'Test Node in Isolation'}</span>
                </button>
              </div>
            )}

            {/* TAB: OUTPUT & LOGS */}
            {activeInspectorTab === 'output' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--apple-secondary-bg)', borderRadius: '7px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--apple-text-secondary)' }}>Status:</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: selectedNode.data.status === 'SUCCESS' ? 'var(--apple-green)' : 'var(--apple-text-primary)' }}>
                    {selectedNode.data.status || 'IDLE'}
                  </span>
                </div>

                {nodeTestResult && (
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--apple-blue)', display: 'block', marginBottom: '4px' }}>
                      Isolated Test Result:
                    </span>
                    <pre style={{ background: 'var(--apple-secondary-bg)', border: '1px solid var(--apple-border)', borderRadius: '8px', padding: '8px 10px', fontSize: '10.5px', color: nodeTestResult.error ? 'var(--apple-red)' : 'var(--apple-text-primary)', maxHeight: '140px', overflowY: 'auto' }}>
                      {JSON.stringify(nodeTestResult, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--apple-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Execution Output:
                  </span>
                  <pre style={{ background: 'var(--apple-secondary-bg)', border: '1px solid var(--apple-border)', borderRadius: '8px', padding: '8px 10px', fontSize: '10.5px', color: 'var(--apple-text-primary)', maxHeight: '160px', overflowY: 'auto' }}>
                    {selectedNode.data.output ? JSON.stringify(selectedNode.data.output, null, 2) : '// No output recorded yet'}
                  </pre>
                </div>
              </div>
            )}

            {/* Delete Node Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--apple-divider)' }}>
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--apple-red)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={13} />
                <span>Delete Node</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Collapsible Bottom Execution Console */}
      <footer className={`apple-console ${isConsoleOpen ? '' : 'collapsed'}`}>
        <div className="apple-console-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--apple-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
            >
              <Terminal size={13} color="var(--apple-blue)" />
              <span>Execution Console</span>
              {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {isRunning && (
              <span className="apple-status-pill running" style={{ fontSize: '10.5px' }}>
                <span className="apple-pulse-dot" /> Streaming live
              </span>
            )}

            {/* Filter Tabs */}
            {isConsoleOpen && (
              <div style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
                {['all', 'worker', 'error'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    style={{
                      background: logFilter === f ? 'var(--apple-card)' : 'transparent',
                      border: 'none',
                      color: logFilter === f ? 'var(--apple-text-primary)' : 'var(--apple-text-tertiary)',
                      borderRadius: '5px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setLogs([])}
              style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-tertiary)', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        </div>

        {isConsoleOpen && (
          <div className="apple-console-logs">
            {filteredLogs.length === 0 ? (
              <div style={{ color: 'var(--apple-text-quaternary)', fontStyle: 'italic' }}>
                Waiting for pipeline execution... Click "Run Pipeline" to stream live events.
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const isError = log.includes('error') || log.includes('DLQ') || log.includes('503') || log.includes('halted');
                const isSuccess = log.includes('SUCCEEDED') || log.includes('COMPLETED');
                const isHighlight = log.includes('DISPATCH') || log.includes('Prerequisites');
                return (
                  <div
                    key={idx}
                    className={`apple-log-entry ${isError ? 'error' : isSuccess ? 'success' : isHighlight ? 'highlight' : ''}`}
                  >
                    <span>{log}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </footer>

      {/* Webhook Modal */}
      <WebhookModal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        onTriggered={(execId) => {
          setActiveExecutionId(execId);
          listenToSSEStream(execId);
        }}
      />

      {/* Topology Modal */}
      <TopologyModal
        isOpen={showTopologyModal}
        onClose={() => setShowTopologyModal(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* New Custom Preset Modal */}
      <NewPresetModal
        isOpen={showNewPresetModal}
        onClose={() => setShowNewPresetModal(false)}
        currentCanvas={{ nodes, edges }}
        onPresetCreated={handlePresetCreated}
      />
    </div>
  );
}
