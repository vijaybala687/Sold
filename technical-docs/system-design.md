# SOLD: System Design & Technical Specification

This document outlines the architectural decisions and technical implementation of the SOLD real-time auction engine.

## 1. System Architecture Overview

SOLD is built on a **Server-Authoritative** architecture. To ensure fairness and prevent cheating, all timers, bid validations, and state transitions occur on the backend.

### High-Level Flow
1. **Frontend (Next.js):** Acts as a "thin client" that renders the state received via WebSockets and sends user intent (Bids/Room Creation).
2. **Backend (Fastify + Socket.io):** Orchestrates the game logic. It manages rooms, validates business rules, and triggers the "Referee" loop.
3. **In-Memory Store (Redis):** The "Hot State." Stores every active room's timer, current price, and highest bidder.
4. **Persistence (PostgreSQL):** The "Cold Storage." Stores the master player list and final transaction records once a player is "SOLD."

## 2. The Real-Time Engine

### WebSocket Strategy
We utilize **Socket.io** for bi-directional communication. Unlike standard HTTP requests, WebSockets allow the server to "push" updates (like timer ticks) to the client without the client asking for them.

### The "Referee" Game Loop
The backend runs a global `setInterval` (1000ms) that iterates through all active rooms in Redis:
- **Decrement:** `timer = timer - 1`
- **Broadcast:** Emit `timer_tick` to all room participants.
- **Trigger:** If `timer == 0`, transition room state to `RESULT` and execute the `finalizeSale` logic.

## 3. Concurrency & Race Condition Management

One of the primary challenges is handling **simultaneous bids**. If two users bid ₹500L at the exact same millisecond, the system must only accept one.

### Implementation: Atomic Operations
We leverage **Redis** for its atomic nature.
- **The Check:** Before accepting a bid, the server checks the current price in Redis.
- **The Update:** It calculates the next bid based on IPL slabs and updates the Redis Hash.
- **Isolation:** Because the backend logic for a specific bid is processed within a single event loop tick, and Redis operations are atomic, we eliminate the "Double Sold" problem.

## 4. State Machine Definition

The Auction Room moves through a strict Finite State Machine (FSM):

| State | Description | Transition Trigger |
| :--- | :--- | :--- |
| **LOBBY** | Users join and select unique franchises. | Room Head clicks "Start". |
| **BIDDING** | Active window where timer resets on every bid. | Timer reaches 0. |
| **RESULT** | Brief pause to show "SOLD" or "UNSOLD" UI. | 4-second timeout. |
| **FINISHED** | All players processed. Show final squads. | No players left in DB. |

## 5. Data Integrity & Persistence

To optimize performance, we follow a **Write-Behind** pattern:
1. **Live War:** All bidding happens in **Redis** (High speed, ephemeral).
2. **Commit:** Only when a player is officially "SOLD" do we perform a **PostgreSQL** write via Prisma.
3. **Sync:** We use Redis Sets (`auction:roomCode:processed`) to track which players have been seen, ensuring no player is shown twice even if the server restarts.

## 6. IPL Business Rules Engine

The backend enforces the following constraints before committing a bid:
- **Bid Slabs:** 
  - < 2Cr: +5L
  - 2Cr - 5Cr: +20L
  - > 5Cr: +50L
- **Purse Limit:** (Implementation in progress) Validates that `current_bid + increment <= remaining_purse`.
- **Franchise Exclusivity:** A Redis Set ensures that once a franchise (e.g., "MI") is picked in a room, it is removed from the available pool for other joiners.

## 7. Mobile-First Optimization

- **Payload Minimization:** WebSocket messages are kept under 1KB.
- **Hydration Resilience:** Implemented `mounted` state checks in React to prevent SSR/CSR mismatches during real-time updates.
- **Connection Recovery:** Client-side logic to re-join rooms automatically on socket reconnection using stored `roomCode` in memory.