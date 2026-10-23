/**
 * ChronosFlow - Core Algorithmic Engine
 * 1. DFS Cycle Detection (Used in UI to block Dormammu loops before edge creation)
 * 2. Kahn's Algorithm (Used in Orchestration Gateway to compute deterministic topological order)
 * 3. Exponential Backoff with Jitter (Used by Distributed Workers for failure resilience)
 */

/**
 * Checks if adding a directed edge (source -> target) would create a cycle in the graph.
 * Uses Depth-First Search (DFS) starting from target to see if source can be reached.
 * If source is reachable from target, adding source -> target creates a closed loop (cycle).
 * 
 * @param {string} sourceId - The source node ID
 * @param {string} targetId - The target node ID
 * @param {Array<{source: string, target: string}>} existingEdges - Array of current edges
 * @returns {{ wouldCreateCycle: boolean, cyclePath?: string[] }}
 */
export function wouldEdgeCreateCycle(sourceId, targetId, existingEdges) {
  if (sourceId === targetId) {
    return { wouldCreateCycle: true, cyclePath: [sourceId, targetId] };
  }

  // Build adjacency list: node -> outgoing neighbors
  const adj = new Map();
  for (const edge of existingEdges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source).push(edge.target);
  }

  // DFS from targetId to see if we can reach sourceId
  const visited = new Set();
  const path = [];

  function dfs(current) {
    visited.add(current);
    path.push(current);

    if (current === sourceId) {
      return true;
    }

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      }
    }

    path.pop();
    return false;
  }

  const reached = dfs(targetId);
  if (reached) {
    return {
      wouldCreateCycle: true,
      cyclePath: [sourceId, ...path]
    };
  }

  return { wouldCreateCycle: false };
}

/**
 * Validates the entire graph for cycles using DFS 3-color algorithm.
 * Color 0: WHITE (unvisited)
 * Color 1: GRAY (currently visiting in current recursion stack - cycle detected if hit!)
 * Color 2: BLACK (visited and all descendants processed)
 * 
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {{ hasCycle: boolean, cycleNodes?: string[] }}
 */
export function detectCycleDFS(nodes, edges) {
  const adj = new Map();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source).push(edge.target);
    }
  }

  const color = new Map(); // nodeId -> 0, 1, or 2
  for (const node of nodes) color.set(node.id, 0);

  const stack = [];
  let cycleNodes = [];

  function dfs(u) {
    color.set(u, 1); // Mark GRAY (visiting)
    stack.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (color.get(v) === 1) {
        // Gray node found -> Back-edge found -> Cycle!
        const cycleStartIndex = stack.indexOf(v);
        cycleNodes = stack.slice(cycleStartIndex);
        cycleNodes.push(v);
        return true;
      }
      if (color.get(v) === 0) {
        if (dfs(v)) return true;
      }
    }

    color.set(u, 2); // Mark BLACK (finished)
    stack.pop();
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.id) === 0) {
      if (dfs(node.id)) {
        return { hasCycle: true, cycleNodes };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Kahn's Algorithm for Topological Sorting & Deterministic Dependency Resolution.
 * Computes:
 * - Topological execution order
 * - In-degree mapping (number of direct prerequisites per node)
 * - Adjacency list (downstream children per node)
 * - Execution stages / layers (for parallel batch execution)
 * 
 * @param {Array<{id: string, [key: string]: any}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {{
 *   valid: boolean,
 *   order: string[],
 *   stages: string[][],
 *   inDegree: Record<string, number>,
 *   adjacency: Record<string, string[]>,
 *   rootNodes: string[],
 *   leafNodes: string[],
 *   error?: string
 * }}
 */
export function computeKahnTopologicalSort(nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = {};
  const adjacency = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  for (const edge of edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  }

  // Queue of nodes with in-degree 0 (prerequisites satisfied)
  const queue = [];
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  const rootNodes = [...queue];
  const order = [];
  const stages = [];

  // Temporary copy of inDegree to decrement during Kahn's traversal
  const currentInDegree = { ...inDegree };
  let currentStage = [...queue];

  while (currentStage.length > 0) {
    stages.push([...currentStage]);
    const nextStage = [];

    for (const u of currentStage) {
      order.push(u);

      for (const v of adjacency[u] || []) {
        currentInDegree[v]--;
        if (currentInDegree[v] === 0) {
          nextStage.push(v);
        }
      }
    }

    currentStage = nextStage;
  }

  // If order count < nodes count, there is an unresolved dependency cycle
  if (order.length !== nodes.length) {
    return {
      valid: false,
      order: [],
      stages: [],
      inDegree,
      adjacency,
      rootNodes,
      leafNodes: [],
      error: `Cycle detected or unresolvable dependencies. Resolved ${order.length} of ${nodes.length} nodes.`
    };
  }

  // Find leaf nodes (nodes with 0 outgoing edges)
  const leafNodes = nodes.filter(n => adjacency[n.id].length === 0).map(n => n.id);

  return {
    valid: true,
    order,
    stages,
    inDegree,
    adjacency,
    rootNodes,
    leafNodes
  };
}

/**
 * Calculates exponential backoff with full jitter to prevent thundering herds on remote services.
 * Formula:
 *   tempDelay = min(maxDelayMs, baseDelayMs * 2^(attempt - 1))
 *   jitterDelay = random_between(baseDelayMs, tempDelay)
 * 
 * @param {number} attempt - Current retry attempt (1, 2, 3...)
 * @param {number} baseDelayMs - Initial delay (default 1000ms)
 * @param {number} maxDelayMs - Maximum delay cap (default 16000ms)
 * @returns {number} Backoff delay in milliseconds
 */
export function calculateBackoffWithJitter(attempt, baseDelayMs = 1000, maxDelayMs = 16000) {
  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const cappedDelay = Math.min(maxDelayMs, exponential);
  // Full jitter: random uniformly between 0 and cappedDelay
  const jittered = Math.floor(Math.random() * (cappedDelay - baseDelayMs / 2)) + Math.floor(baseDelayMs / 2);
  return Math.max(baseDelayMs, jittered);
}
