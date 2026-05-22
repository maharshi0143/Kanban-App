# Pheonix Kanban Board

Production-ready real-time Kanban board built with Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, Socket.IO, dnd-kit, Zustand, and Docker.

## Quick Start

### Local (Node)

```bash
npm install
npm run dev
```

Open http://localhost:3000 (redirects to `/boards/1`).

### Docker

```bash
docker-compose up -d --build
```

Verify:

```bash
docker-compose ps
```

## Features

- Real-time multi-user sync via Socket.IO rooms
- Drag-and-drop cards between columns with persistence
- Fractional indexing for efficient reordering
- Optimistic UI updates with rollback on API failure
- REST API for board/card operations
- Dockerized app + PostgreSQL with health checks and seed data

## Tech Stack

- Next.js (App Router) + TypeScript
- Custom Node.js server (`server.ts`) for Next.js + WebSocket runtime
- PostgreSQL + Drizzle ORM
- Socket.IO
- Zustand + dnd-kit
- Docker + Docker Compose

## Project Structure

- `src/app` - pages and API routes
- `src/components` - reusable UI components
- `src/db` - Drizzle schema and database client
- `src/lib` - repository logic, validation, socket helpers
- `src/store` - Zustand real-time state store
- `seeds/init.sql` - startup schema and test data
- `Dockerfile` and `docker-compose.yml` - containerized setup

## Environment Variables

Copy `.env.example` to `.env`.

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - application server port
- `SOCKET_INTERNAL_TOKEN` - required internal token used by API routes to emit websocket events through the custom server
- `SOCKET_ALLOWED_ORIGINS` - comma-separated list of allowed websocket origins

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Ensure PostgreSQL is running (or use Docker compose db service).

3. Run the app:

```bash
npm run dev
```

4. Open http://localhost:3000 (redirects to `/boards/1`).

Note: `npm run dev` and `npm run start` use the custom `server.ts` to run Next.js and Socket.IO together.

## Docker Setup

Run everything in containers:

```bash
docker-compose up -d --build
```

Verify health:

```bash
docker-compose ps
```

You should see both `db` and `app` healthy.

Seed data creates board ID 1, so `/boards/1` is always available after startup.

## API Documentation

### Health

- `GET /api/health`

Response:

```json
{ "status": "ok", "timestamp": "..." }
```

### Get Board

- `GET /api/boards/:id`

Returns board with nested columns and cards.

### Create Card

- `POST /api/columns/:columnId/cards`

Request:

```json
{ "title": "New card", "position": 3.0 }
```

### Move Card

- `PATCH /api/cards/:id/move`

Request (explicit position):

```json
{ "newColumnId": 2, "newPosition": 1.5 }
```

Request (server-calculated fractional index):

```json
{ "newColumnId": 2, "afterCardId": 4, "beforeCardId": 8 }
```

### Update Card

- `PATCH /api/cards/:id`

Request:

```json
{ "title": "Updated title", "description": "Updated details" }
```

### Delete Card

- `DELETE /api/cards/:id`

### Create Column

- `POST /api/boards/:id/columns`

Request:

```json
{ "name": "Review" }
```

### Delete Column

- `DELETE /api/columns/:columnId`

### Clear Board Cards

- `DELETE /api/boards/:id/cards`

## Realtime Events

Clients join board rooms with:

- `join_board` payload: `boardId`

Server emits:

- `card:created` -> full card payload
- `card:moved` -> `{ id, newColumnId, newPosition }`
- `card:updated` -> `{ id, ...updatedFields }`
- `card:deleted` -> `{ id }`
- `column:created` -> full column payload
- `column:deleted` -> `{ id }`
- `board:cleared` -> `{ boardId }`

Events are scoped to `board-{boardId}` room.

## Architecture Notes

- API route handlers persist state in PostgreSQL via Drizzle.
- Every mutation emits WebSocket events so all connected users stay in sync.
- Client uses Zustand as single source of truth.
- Optimistic updates are applied immediately and rolled back if the API call fails.
