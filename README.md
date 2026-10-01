# SOLD — High-Concurrency IPL Mega Auction Simulator

**SOLD** is a real-time, multi-user gaming platform that simulates the high-pressure environment of an official IPL auction. Built for mobile-first engagement, it allows users to create private rooms, select franchises, and engage in zero-latency bidding wars.

## 🚀 The Value Proposition
*   **For Users:** A high-fidelity simulator that enforces strict franchise rules (purse limits, overseas caps) with a cinematic, automated auctioneer.
*   **For Recruiters:** A demonstration of distributed systems engineering, handling in-memory game states, preventing race conditions, and synchronizing data across multiple clients instantly.

## 🛠️ Technical Power Stack
*   **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion (Animations), Socket.io-client.
*   **Backend:** Node.js, Fastify (High-throughput framework), Socket.io (WebSockets).
*   **In-Memory Store:** Redis (Upstash) — Manages real-time state, timers, and atomic bidding.
*   **Database:** PostgreSQL (Neon) — Persistent storage for user squads and player master data.
*   **ORM:** Prisma — Type-safe database queries.

## 🏗️ System Architecture
The app follows a **Server-Authoritative** model:
1.  **The Referee (Backend):** An automated state machine that manages the 10-second clock and player transitions.
2.  **Atomic Bidding:** Bids are validated in Redis in <10ms to prevent "double-sold" errors where two users bid at the exact same millisecond.
3.  **Real-Time Sync:** WebSockets broadcast every "tick" of the timer and every price jump to all participants simultaneously.

## 📋 Features
- [x] **Multi-Room Support:** Unique 6-digit codes for private friend circles.
- [x] **Franchise Lockdown:** Real-time team selection logic (no two players can own the same team).
- [x] **Live Bidding Engine:** Dynamic price increments based on official IPL slabs.
- [x] **Automated Auctioneer:** A self-sustaining game loop that handles the "Gavel Drop" and next-player rotation.
- [x] **Squad Analysis:** Final roster breakdown and budget tracking.

## 🚦 Getting Started
1. **Clone the repo**
2. **Setup Backend:** `cd backend && npm install`. Create `.env` with `DATABASE_URL` and `REDIS_URL`.
3. **Seed Data:** `npx prisma db push && npm run db:seed`.
4. **Setup Frontend:** `cd frontend && npm install`.
5. **Launch:** Run `npm run dev` in both folders.