# Challenges & Technical Hurdles

Building **SOLD** presented several non-trivial engineering challenges. This document chronicles the most significant hurdles and the systematic approach used to resolve them.

---

## 1. Environment Hijacking & Tooling Conflicts
**Problem:** 
During the initial database setup, a third-party AI-driven ORM wrapper (`@prisma/composer`) hijacked the standard Prisma CLI. This prevented execution of essential commands like `db push` and `generate`, throwing errors about "Missing Agent Skills."

**Resolution:**
- Performed a **Nuclear Reset**: Deleted `node_modules`, `package-lock.json`, and hidden agent metadata folders (`.agents`, `.claude`).
- **Binary Bypassing:** Manually executed the Prisma binary via its direct path `./node_modules/.bin/prisma` to ensure the standard CLI took precedence over global aliases.
- **Environment Scrubbing:** Cleaned the `package.json` scripts and reinstalled standard dependencies to ensure a clean, professional build environment.

---

## 2. Real-Time State Hydration Mismatches
**Problem:** 
Using Next.js (SSR) with Socket.io (Client-side state) caused "Hydration Mismatch" errors. The server attempted to pre-render the auction UI, but since the real-time state only exists in the browser, the HTML differed between server and client.

**Resolution:**
- Implemented a **Mounting Gate**: Used a `mounted` state inside a `useEffect` hook to prevent the UI from rendering until it has safely reached the client-side.
- This ensures that the Socket.io listeners and dynamic timers only initialize when the DOM is ready, resulting in a stable, error-free user experience.

---

## 3. High-Concurrency Race Conditions (The "Double Sold" Problem)
**Problem:** 
In a high-intensity auction, two users might bid at the exact same millisecond. Relying on a traditional relational database (PostgreSQL) for bid validation would be too slow, leading to race conditions where the same player is awarded to two teams or a bid is accepted at an outdated price.

**Resolution:**
- **Redis-First Strategy:** Moved the active auction state to an in-memory Redis store.
- **Atomic Validation:** Implemented a "Check-and-Set" logic within the Node.js event loop. Since Redis is single-threaded and extremely fast, the server validates the incoming bid against the current price in <5ms before broadcasting.
- **Server-Authoritative Timer:** Instead of relying on client clocks (which can drift), the backend "Referee" loop dictates the absolute time, ensuring all participants are perfectly synchronized.

---

## 4. Security & Secret Management
**Problem:** 
During the early development phase, sensitive configuration files (`.env`) and heavy dependency folders (`node_modules`) were accidentally tracked and pushed to a public GitHub repository, triggering security alerts for exposed database credentials.

**Resolution:**
- **History Scrubbing:** Used `git rm --cached` to strip the sensitive files from the Git index while preserving local copies.
- **Credential Rotation:** Immediately rotated the API keys and passwords for both **Neon (Postgres)** and **Upstash (Redis)** to invalidate the leaked secrets.
- **Repository Optimization:** Correctly configured a root `.gitignore` to ensure a lean, secure repository that only tracks source code, adhering to industry best practices.

---

## 5. Persistent State vs. Ephemeral Loops
**Problem:** 
If a player went "UNSOLD," the system initially entered an infinite loop, re-fetching the same player because they didn't have a record in the permanent `AuctionResult` table.

**Resolution:**
- **Bloom-Filter Style Tracking:** Introduced a Redis Set (`processed_players`) to track every player ID that has been "put to the hammer" in a specific room. 
- The system now checks this Set instead of the SQL database to determine the next player, ensuring the auction moves forward regardless of whether a player was sold or not.