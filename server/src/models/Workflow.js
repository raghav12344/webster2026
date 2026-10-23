/**
 * ChronosFlow - Workflow Domain Model
 * Matches System UML Diagram: Workflow
 */
import { detectCycleDFS, computeKahnTopologicalSort } from '../../../shared/algorithms.js';

export class Workflow {
  constructor({ id, name, description = '', nodes = [], edges = [] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.nodes = nodes;
    this.edges = edges;
    this.updatedAt = new Date().toISOString();
  }

  validate() {
    const cycle = detectCycleDFS(this.nodes, this.edges);
    if (cycle.hasCycle) {
      return { valid: false, error: 'Graph contains cycles (Dormammu Loop)', cycleNodes: cycle.cycleNodes };
    }
    const kahn = computeKahnTopologicalSort(this.nodes, this.edges);
    return { valid: kahn.valid, order: kahn.order, stages: kahn.stages, error: kahn.error };
  }

  getRoots() {
    const kahn = computeKahnTopologicalSort(this.nodes, this.edges);
    return kahn.rootNodes ? this.nodes.filter(n => kahn.rootNodes.includes(n.id)) : [];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodes: this.nodes,
      edges: this.edges,
      updatedAt: this.updatedAt
    };
  }
}
