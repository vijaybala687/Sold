# SOLD: API & WebSocket Specification

This document defines the communication protocols between the **SOLD Backend** (Fastify/Socket.io) and the **SOLD Frontend** (Next.js).

---

## 1. WebSocket Events (Socket.io)

All real-time communication happens over a dedicated WebSocket connection. 
**Base Connection:** `http://localhost:8080`

### A. Client-to-Server (Emits)
Events sent from the mobile app to the auction engine.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `create_room` | None | Initiates a new auction session. Server responds with `room_created`. |
| `join_room` | `roomCode: string` | Places the user in the specific room's socket channel and Redis lobby. |
| `select_team` | `{ roomCode, teamName }` | Reserves a franchise. Checks Redis for exclusivity. |
| `start_auction` | `roomCode: string` | (Admin Only) Triggers the first player rotation and starts the global timer. |
| `place_bid` | `{ roomCode, teamName }` | Attempts to increase the price. Triggers atomic Redis validation. |

### B. Server-to-Client (Broadcasts)
Events pushed by the "Referee" to all participants in a room.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `room_created` | `roomCode: string` | Confirms room creation and provides the 6-digit access code. |
| `lobby_update` | `{ allTeams, teamsTaken, status }` | Syncs the franchise selection grid for all users in the lobby. |
| `team_confirmed` | `teamName: string` | Sent only to the requester to confirm their franchise ownership. |
| `new_player` | `{ player, currentBid, timer }` | Pushes the next athlete's data, base price, and resets the clock. |
| `timer_tick` | `{ timer: number }` | Sent every 1000ms to keep all mobile countdowns in sync. |
| `bid_update` | `{ currentBid, highestBidderId, timer }` | Broadcasts a successful bid and resets the timer to 10s. |
| `player_status` | `{ status: "SOLD" \| "UNSOLD", winner?, price? }` | Signals the end of a bidding round and displays the Gavel overlay. |
| `auction_ended` | `{ message: string }` | Final event when the player pool is exhausted. Triggers the Results view. |
| `error` | `message: string` | Displays a toast/alert for invalid actions (e.g., Team Taken, Low Funds). |

---

## 2. REST API Endpoints

While bidding is WebSocket-based, historical data and complex queries are handled via standard HTTP GET requests.

### Get Final Squad
Fetches all players bought by a specific franchise in a specific room. Used for the post-auction analysis and shareable card.

- **URL:** `/api/squad/:teamName/:roomCode`
- **Method:** `GET`
- **Path Params:**
  - `teamName`: e.g., `CSK`
  - `roomCode`: e.g., `XYZ123`
- **Success Response (200 OK):**
```json
[
  {
    "finalPrice": 1500,
    "player": {
      "name": "Virat Kohli",
      "category": "BAT",
      "nationality": "IND",
      "imageUrl": "..."
    }
  },
  ...
]