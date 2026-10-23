/**
 * ChronosFlow - TopologicalSorter
 * Matches System UML Diagram: TopologicalSorter
 */
import { detectCycleDFS, computeKahnTopologicalSort } from '../../../shared/algorithms.js';

export class TopologicalSorter {
  constructor(nodes = [], edges = []) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjList = new Map();
    this.inDegree = new Map();

    this._buildGraph();
  }

  _buildGraph() {
    for (const node of this.nodes) {
      this.adjList.set(node.id, []);
      this.inDegree.set(node.id, 0);
    }

    for (const edge of this.edges) {
      if (this.adjList.has(edge.source)) {
        this.adjList.get(edge.source).push(edge.target);
      }
      if (this.inDegree.has(edge.target)) {
        this.inDegree.set(edge.target, this.inDegree.get(edge.target) + 1);
      }
    }
  }

  detectCycle() {
    return detectCycleDFS(this.nodes, this.edges).hasCycle;
  }

  computeOrder() {
    const kahn = computeKahnTopologicalSort(this.nodes, this.edges);
    if (!kahn.valid) {
      throw new Error(`Cannot compute order: ${kahn.error}`);
    }
    return kahn.order;
  }

  computeStages() {
    const kahn = computeKahnTopologicalSort(this.nodes, this.edges);
    return kahn.stages;
  }
}
