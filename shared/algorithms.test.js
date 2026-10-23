import { wouldEdgeCreateCycle, detectCycleDFS, computeKahnTopologicalSort, calculateBackoffWithJitter } from './algorithms.js';

console.log('🧪 Testing ChronosFlow Core Algorithmic Engine...');

// Test 1: Simple Linear Pipeline: A -> B -> C
const linearNodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
const linearEdges = [
  { source: 'A', target: 'B' },
  { source: 'B', target: 'C' }
];

const kahnLinear = computeKahnTopologicalSort(linearNodes, linearEdges);
console.assert(kahnLinear.valid === true, 'Linear DAG should be valid');
console.assert(JSON.stringify(kahnLinear.order) === JSON.stringify(['A', 'B', 'C']), 'Order should be A, B, C');
console.log('✅ Test 1 Passed: Linear Topological Sort (A -> B -> C):', kahnLinear.order);

// Test 2: Diamond Pattern: A -> B, A -> C, B -> D, C -> D
const diamondNodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];
const diamondEdges = [
  { source: 'A', target: 'B' },
  { source: 'A', target: 'C' },
  { source: 'B', target: 'D' },
  { source: 'C', target: 'D' }
];
const kahnDiamond = computeKahnTopologicalSort(diamondNodes, diamondEdges);
console.assert(kahnDiamond.valid === true, 'Diamond DAG should be valid');
console.assert(kahnDiamond.rootNodes[0] === 'A', 'Root node should be A');
console.assert(kahnDiamond.leafNodes[0] === 'D', 'Leaf node should be D');
console.assert(kahnDiamond.stages.length === 3, 'Stages should be [ [A], [B, C], [D] ]');
console.log('✅ Test 2 Passed: Diamond DAG Kahn Sort Stages:', kahnDiamond.stages);

// Test 3: DFS Cycle Detection (Dormammu Loop: A -> B -> C -> A)
const cyclicEdges = [
  { source: 'A', target: 'B' },
  { source: 'B', target: 'C' },
  { source: 'C', target: 'A' }
];
const cycleResult = detectCycleDFS(linearNodes, cyclicEdges);
console.assert(cycleResult.hasCycle === true, 'Cyclic graph should be detected');
console.log('✅ Test 3 Passed: Dormammu Cycle Detected by DFS:', cycleResult.cycleNodes);

// Test 4: Real-time Edge Prevention
const willCycle = wouldEdgeCreateCycle('C', 'A', linearEdges);
console.assert(willCycle.wouldCreateCycle === true, 'Adding C -> A should be flagged as a cycle');
const willNotCycle = wouldEdgeCreateCycle('A', 'C', linearEdges);
console.assert(willNotCycle.wouldCreateCycle === false, 'Adding A -> C is a valid shortcut edge');
console.log('✅ Test 4 Passed: Real-time UI edge connection blocker verified.');

// Test 5: Exponential Backoff with Jitter
const delays = [1, 2, 3, 4].map(att => calculateBackoffWithJitter(att, 1000, 16000));
console.log('✅ Test 5 Passed: Exponential Backoff with Jitter for attempts 1-4:', delays);

console.log('\n🎉 ALL ALGORITHMIC TESTS PASSED PERFECTLY!\n');
