# Multiplayer Tic-Tac-Toe with Nakama

Production-ready Tic-Tac-Toe with a server-authoritative architecture. Nakama handles identity, matchmaking, and authoritative match logic (written in TypeScript). The React + TypeScript client connects over Nakama's realtime socket and renders the state changes coming from the server.

## Repository Layout

```
.
├── client/          # React + Vite frontend
├── nakama/          # TypeScript Nakama runtime module
├── docker-compose.yml
└── package.json     # Workspace helpers
```

## Prerequisites

- Node.js 18+ and npm
- Docker + Docker Compose (to run Nakama + Postgres)

## Installing Dependencies

```bash
npm install --workspaces
```

This installs dependencies for both the Nakama runtime module (`nakama/`) and the React client (`client/`).

## Building the Nakama Module

Compile the authoritative match logic so Nakama can load it:

```bash
npm run build:server
```

The compiled JavaScript lands in `nakama/build/index.js` and is mounted into the Nakama container.

## Running Nakama + Postgres

```bash
docker-compose up --build
```

This starts Postgres and Nakama (ports `7350` for the realtime socket/HTTP API and `7351` for the console). The compose file mounts:

- `nakama/build/index.js` as the runtime module entrypoint.
- `nakama/local.yml` as Nakama's config (server key, runtime entrypoint, console credentials, etc.).

Stop the stack with `docker-compose down` when finished.

## Running the React Client

```bash
cd client
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. It defaults to connecting to `localhost:7350` with the Nakama default server key. Override via environment variables when needed:

```bash
VITE_NAKAMA_HOST=nakama.lan \
VITE_NAKAMA_PORT=80 \
VITE_NAKAMA_SSL=true \
VITE_NAKAMA_SERVER_KEY=productionkey \
npm run dev
```

## Gameplay Flow

1. Client authenticates against Nakama (custom ID stored per device) and opens a realtime socket.
2. Client queues in the Nakama matchmaker (`mode=tictactoe`). The server-side matchmaker callback spawns an authoritative match using the Tic-Tac-Toe module.
3. Server broadcasts the immutable game state (`board`, `turn`, assignments) after every action. All moves are validated on the server (turn order, cell availability, victory/draw detection). Clients only broadcast intents (`OpCode.MOVE`).
4. Disconnects and forfeits are handled server-side; the opponent is declared the winner when applicable.

## Scripts Quick Reference

| Command | Description |
| --- | --- |
| `npm run build:server` | Compile the Nakama TypeScript module |
| `npm run dev:client` | Start the Vite dev server |
| `npm run build:client` | Production build of the React client |
| `docker-compose up` | Launch Nakama + Postgres with the authoritative module |

## Notes

- The server module enforces all game rules and broadcasts state via op code `1`. Clients can only send `OpCode.MOVE` (and receive `OpCode.ERROR` when invalid).
- To harden further for production, plug the Nakama instance into your observability stack (Prometheus, OpenTelemetry) and enable SSL/Load Balancing per Heroic Labs best practices.
