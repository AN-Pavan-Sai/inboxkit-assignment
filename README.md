# ⚔️ GridWars — Real-Time Shared Grid

A multiplayer territory control game where users claim tiles on a shared 50×50 grid. All changes sync instantly via WebSockets across all connected clients.

![GridWars](https://img.shields.io/badge/Status-Live-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![Express](https://img.shields.io/badge/Express-4-lightgrey) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![WebSocket](https://img.shields.io/badge/WebSocket-ws-orange)

## 🎮 Features

- **50×50 interactive grid** (2,500 tiles) with zoom and pan
- **Real-time sync** — all users see updates instantly via WebSockets
- **Tile claiming & stealing** — claim unclaimed tiles or steal from others
- **3-second cooldown** — prevents spam, adds strategy
- **Conflict resolution** — PostgreSQL row-level locking (`SELECT ... FOR UPDATE`)
- **Live leaderboard** — top 15 players ranked by tiles owned
- **Activity feed** — real-time stream of claims and steals
- **Minimap** — canvas-based overview of the entire grid
- **Toast notifications** — alerts when your tiles are stolen
- **Auto-reconnect** — WebSocket reconnects with exponential backoff
- **No auth required** — random color assignment, lightweight user creation

## 🏗️ Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 + Vite | Component model, fast HMR |
| Styling | Vanilla CSS | Full control over animations, dark theme |
| Backend | Express.js | Lightweight, pairs with `ws` library |
| Real-time | `ws` (WebSocket) | Native WebSocket, low overhead |
| Database | PostgreSQL | ACID compliance, row-level locking |
| DB Client | `pg` (node-postgres) | Direct SQL, connection pooling |

### Why these choices?

- **`ws` over Socket.IO**: We don't need polling fallbacks — all modern browsers support WebSockets. `ws` is lighter and faster.
- **PostgreSQL over MongoDB**: We need transactional integrity for concurrent tile claims. `SELECT ... FOR UPDATE` row locking prevents race conditions.
- **Vanilla CSS over Tailwind**: The UI requires custom animations (tile pulse, ripple, glow) and glassmorphism effects that are easier to control directly.

## 🚀 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Create the database

```bash
createdb gridwars
```

### 2. Start the backend

```bash
cd server
npm install
npm run db:init   # Creates tables + seeds 2500 tiles
npm run dev       # Starts on port 3001
```

### 3. Start the frontend

```bash
cd client
npm install
npm run dev       # Starts on port 5173
```

### 4. Open the app

Navigate to `http://localhost:5173` — open multiple tabs to test real-time sync!

## 🏛️ Architecture

```
Client (React)                     Server (Express)
┌─────────────┐                   ┌──────────────────┐
│  Grid View   │◄──WebSocket──────│  WS Handler      │
│  Leaderboard │                  │  ├─ register      │
│  Minimap     │──REST /api/──────│  ├─ claim_tile    │
│  Activity    │                  │  └─ broadcast     │
│  Toasts      │                  │                    │
└─────────────┘                   │  REST API         │
                                  │  ├─ GET /grid     │
                                  │  ├─ GET /leaders  │
                                  │  └─ POST /user    │
                                  └────────┬───────────┘
                                           │
                                  ┌────────▼───────────┐
                                  │   PostgreSQL       │
                                  │  ├─ users          │
                                  │  ├─ tiles          │
                                  │  └─ activity_log   │
                                  └────────────────────┘
```

## 🔒 Conflict Resolution

When two users try to claim the same tile simultaneously:

1. Server receives `claim_tile` messages
2. Opens a PostgreSQL transaction
3. Uses `SELECT ... FOR UPDATE` to lock the tile row
4. First transaction wins, second waits then processes
5. Both users see the correct final state

## 📁 Project Structure

```
├── client/                # React frontend (Vite)
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       ├── App.jsx        # Main app layout
│       └── index.css      # Design system
├── server/                # Express backend
│   └── src/
│       ├── routes/        # REST API
│       ├── db.js          # PostgreSQL pool
│       ├── websocket.js   # WS handler
│       ├── schema.sql     # Database schema
│       └── index.js       # Server entry
└── README.md
```