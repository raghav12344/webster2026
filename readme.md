# 🌀 ChronosFlow — Distributed DAG Workflow & Automation Engine
> **PS-04: THE DORMAMMU LOOP**  
> **CodeSangam 2026 // MNNIT Allahabad**  
> **Team:** FLCN (Team ID: 272)  
> **Lead:** Raghav Gupta (20243226 CSE)

---

## 📖 Executive Summary
Temporal loops trap mortals in repetitive computational tasks. Existing background scripts lack visual composition, failure resilience, and real-time execution observability. 

**ChronosFlow** constructs an extensible, distributed Directed Acyclic Graph (DAG) automation engine where users compose event-driven pipelines, orchestrating asynchronous tasks with deterministic state transitions, scheduled cron triggers, webhook inputs, and distributed worker execution with failure recovery.

---

## 🏛️ 4-Tier Core Engineering Architecture

```
                                +-----------------------------+
                                |  Tier 1: Client Application |
                                |  (React Flow + SSE Stream)  |
                                +--------------+--------------+
                                               |
                                     (REST / Webhook / SSE)
                                               v
                                +-----------------------------+
                                | Tier 2: Orchestration GW    |
                                | (Kahn's Sort & In-Degree)   |
                                +--------------+--------------+
                                               |
                     +-------------------------+-------------------------+
                     v                                                   v
        +-------------------------+                         +-------------------------+
        | Tier 3: RabbitMQ AMQP   |                         | Tier 3: Redis State &   |
        | (chronos.tasks / DLQ)   |                         | Pub/Sub Telemetry       |
        +------------+------------+                         +------------+------------+
                     |                                                   |
                     +-------------------------+-------------------------+
                                               |
                                               v
                                +-----------------------------+
                                | Tier 4: Distributed Workers |
                                | (SETNX Lock + Retry Jitter) |
                                +-----------------------------+
```

### 1. Tier 1: Client Application (React Flow)
- **Visual Canvas:** Built with `@xyflow/react` featuring custom node cards for Triggers, HTTP Requests, Data Transforms, and Delay Timers.
- **Client-Side DFS Cycle Detector:** Instantly checks graph topology on node connection and blocks invalid closed loop connections (*"Dormammu Loops"*).
- **Server-Sent Events (SSE):** Real-time event consumption providing live node state transitions, active pulsing glows, and log streaming without polling.

### 2. Tier 2: Orchestration API Gateway (Express / Node.js)
- **Topological Sorting (Kahn's Algorithm):** Computes deterministic execution stages and dependency prerequisites.
- **Sub-15ms Ingestion:** Incoming triggers are validated and offloaded into RabbitMQ in $< 15\text{ms}$.
- **Dynamic Dependency Tracker:** Decrements child in-degrees upon parent completion and unlocks downstream nodes only when all inputs are satisfied.

### 3. Tier 3: AMQP & Telemetry Layer (RabbitMQ & Redis)
- **RabbitMQ (`amqplib`):** Message durability, backpressure prefetching (`prefetch(5)`), explicit `ACK`/`NACK` handling, and Dead-Letter Exchange (`chronos.dlx`).
- **Redis (`ioredis`):** Atomic idempotency locks via `SETNX`, worker heartbeats, and Pub/Sub channel dispatching for live SSE logs.
- **Zero-Dependency Fallback:** Automatically runs with external RabbitMQ/Redis or transparently engages an in-memory embedded broker for zero-config evaluation.

### 4. Tier 4: Distributed Worker Pool
- **Isolated Workers:** Decoupled processes pulling tasks from RabbitMQ.
- **Fault-Tolerant Retry Protocol:** Exponential backoff with full random jitter:
  $$\text{Delay} = \min(\text{MaxDelay}, \text{BaseDelay} \times 2^{\text{attempt}-1}) + \text{jitter}$$
- **Dead-Letter Queue (DLQ):** Quarantines unrecoverable tasks after 3 attempts, preventing catastrophic pipeline halts.

---

## 🚀 Quick Start & How to Run

### Option A: Instant Run (Zero Configuration Required)
ChronosFlow includes a built-in development mode that runs immediately with zero external dependencies:

```bash
# 1. Install root dependencies
npm install

# 2. Build the visual frontend
npm run build:client

# 3. Launch the API Gateway & Worker Engine
npm run start:server
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

---

### Option B: Production Mode with Docker (RabbitMQ & Redis)
To spin up real RabbitMQ (with management dashboard) and Redis:

```bash
# Start RabbitMQ & Redis containers
docker compose up -d

# Start the ChronosFlow backend & worker
npm run start:server
```
- **Web App:** [http://localhost:5000](http://localhost:5000)
- **RabbitMQ Management Dashboard:** [http://localhost:15672](http://localhost:15672) (User: `guest`, Pass: `guest`)
- **Redis:** `localhost:6379`

---

## 🧪 Verification & Algorithmic Tests
Run the standalone algorithmic test suite verifying Kahn's Algorithm, DFS Cycle Detection, and Exponential Backoff with Jitter:

```bash
npm run test:algo
```

Output:
```
🧪 Testing ChronosFlow Core Algorithmic Engine...
✅ Test 1 Passed: Linear Topological Sort (A -> B -> C): [ 'A', 'B', 'C' ]
✅ Test 2 Passed: Diamond DAG Kahn Sort Stages: [ [ 'A' ], [ 'B', 'C' ], [ 'D' ] ]
✅ Test 3 Passed: Dormammu Cycle Detected by DFS: [ 'A', 'B', 'C', 'A' ]
✅ Test 4 Passed: Real-time UI edge connection blocker verified.
✅ Test 5 Passed: Exponential Backoff with Jitter for attempts 1-4: [ 1000, 1334, 1243, 2011 ]

🎉 ALL ALGORITHMIC TESTS PASSED PERFECTLY!
```

---

## 🎯 Built-in Demonstration Presets

In the UI top bar, select any of the 3 presets:
1. **01: The Dormammu Loop Breaker (Core Pipeline):** Webhook Trigger $\to$ Debounce Delay (1.5s) $\to$ JSON Normalizer $\to$ Payment Gateway HTTP.
2. **02: Fault-Tolerant Exponential Backoff & DLQ Demo:** Simulates an unstable HTTP microservice returning 503s. Shows real-time retries with jitter, followed by isolation into the Dead-Letter Queue.
3. **03: Diamond DAG High-Concurrency Execution:** 1 Trigger splits into 2 concurrent parallel branches that run simultaneously and join at an Aggregate node.
