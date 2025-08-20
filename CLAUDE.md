# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes PM2 Web UI - a TypeScript-based web interface for managing PM2 processes with real-time monitoring, project organization, and live log streaming capabilities. The system has been optimized with a delta monitoring system to reduce network traffic and improve frontend performance.

### Architecture

- **Backend**: Express.js server with TypeScript (`src/app.ts`)
- **Frontend**: Vanilla HTML/CSS/JavaScript with jQuery, Bootstrap 5, and xterm.js
- **PM2 Integration**: Custom PM2 wrapper (`src/pm2Lib.ts`) with event-driven architecture
- **Real-time Communication**: Socket.IO for live process updates, log streaming, and optimized resource monitoring
- **Authentication**: API key-based middleware protecting all endpoints and WebSocket connections
- **Data Persistence**: JSON file-based storage for project configurations (`data/projects.json`)

### Key Components

- `src/app.ts` - Main Express server with routes, Socket.IO setup, auth middleware, and the core **delta monitoring logic**
- `src/pm2Lib.ts` - PM2 wrapper extending EventEmitter for process operations
- `src/services/ProjectService.ts` - Project CRUD operations with JSON persistence
- `src/models/Project.ts` - TypeScript interfaces for project data structures
- `public/js/main.js` - Frontend controller with Socket.IO client, handling both **delta and full sync monitoring events**
- `public/index.html` - Single-page application interface

## Development Commands

```bash
# Development server with ts-node (watches for changes)
npm run dev

# Build TypeScript to JavaScript in dist/
npm run build

# Start production server
npm start

# TypeScript compilation only
npx tsc
```

## Environment Configuration

Required environment variables (see `.env.example`):

```bash
PORT=3001                                    # Server port
API_KEY=your-secret-key                     # Required for authentication
SCRIPT_PATH=/path/to/scripts                # Optional: Default script directory
ALLOWED_ORIGINS=http://localhost:3001       # CORS origins (comma-separated)
```

**Important**: The application enforces API key authentication. Without `API_KEY`, all requests and WebSocket connections are rejected.

## Performance & Network Optimizations

The application implements a **delta monitoring system** to significantly reduce network traffic and client-side rendering load.

- **Backend (`app.ts:343-412`)**: The server maintains the last known state of all processes' CPU, memory, and status. At a 3-second interval, it compares the current state with the last known state.
- **Delta Updates**: Only processes that have changed (CPU variance > 0.1%, memory change, or status change) are sent to clients via the `processes:monitoring:delta` event. This avoids sending data for idle or stable processes.
- **Full Sync**: To ensure data consistency and handle new client connections, a full synchronization of all process data is broadcast via `processes:monitoring:full` every 30 seconds.
- **Frontend (`main.js:690-912`)**: The client listens for both `delta` and `full` events. The `handleMonitoringDelta` function efficiently updates only the specific rows in the process table that have changed, avoiding a full re-render of the table.

This approach leads to a more responsive UI, lower CPU usage on the client, and a dramatic reduction in WebSocket message size, especially in environments with many processes.

## Socket.IO Event Patterns

The real-time communication relies on a set of specific events for different purposes.

### Client-Server Events:

- `processes:updated` - Sent when a process is started, stopped, restarted, or deleted. Triggers a full refresh of the process list on the client.
- `log:out` - Streams log output from a PM2 process to the client.
- `error` - Notifies the client of an error.
- `disconnect`/`connect` - Manages connection state.

### New Monitoring Event Patterns:

- `processes:monitoring:delta` - **(Primary Monitoring Event)** Sends an array of only the processes whose monitoring data (CPU, memory, status) has changed since the last check. This is the core of the performance optimization.
- `processes:monitoring:full` - Sends a complete list of all processes and their current monitoring data. This is used for initial data load and periodic re-synchronization to ensure data integrity.

### Frontend Event Handlers (`main.js:690-912`):

- `handleMonitoringDelta(data)` - Receives an array of changed processes. Iterates through the data and calls `updateProcessTableRow(p)` for each process to update its specific row in the UI.
- `handleMonitoringFull(data)` - Receives the full process list. It also iterates and updates each process row, ensuring the UI is fully in sync with the server state.
- `updateProcessMonitoringData(p, timestamp)` - Updates the internal data store (`monitoringData` map) used for rendering resource graphs.
- `updateProcessTableRow(p)` - Selects the specific DOM elements for a given process and updates its CPU, memory, and status badge directly, avoiding expensive DOM manipulation.

## TypeScript Configuration

- Target: ES6, Module: CommonJS
- Strict mode enabled with full type checking
- Source maps generated for debugging
- Output directory: `dist/`
- Include path: `src/`

## API Authentication Pattern

All API endpoints and WebSocket connections require API key authentication:

```javascript
// HTTP requests need X-API-Key header
headers: {
  'X-API-Key': 'your-api-key'
}

// Socket.IO connections require auth object
const socket = io({
  auth: { apiKey: 'your-api-key' }
});
```

## PM2 Integration Patterns

The PM2 wrapper (`pm2Lib.ts`) extends EventEmitter and provides:

- Promisified PM2 operations with error handling
- Real-time log streaming from PM2 bus
- Process lifecycle event emission
- Automatic reconnection logic

Key PM2 events emitted:

- `processLog` - Log output from processes
- `processEvent` - Process state changes (start, stop, restart)
- `error` - PM2 operation errors

## Project Data Structure

Projects are stored in `data/projects.json` with this structure:

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  processes: string[]; // PM2 process names
  createdAt: number;
  updatedAt: number;
}
```

## Frontend Architecture

- jQuery for DOM manipulation and AJAX
- Bootstrap 5 for responsive UI components
- Socket.IO client for real-time updates
- xterm.js for terminal interface
- No build process - served directly from `public/`

## File Structure

```
src/
├── app.ts              # Express server, Socket.IO setup, and Delta Monitoring Logic
├── pm2Lib.ts           # PM2 wrapper with EventEmitter
├── socketIO.ts         # (Integrated in app.ts)
├── models/
│   └── Project.ts      # TypeScript interfaces
└── services/
    └── ProjectService.ts # Project persistence logic

public/
├── index.html          # Single-page application
├── css/style.css       # Application styles
└── js/main.js          # Frontend JS controller with new event handlers

data/
└── projects.json       # Project data storage
```

## No Testing Framework

The project currently has no testing setup. `package.json` contains no test scripts or testing dependencies.

## Common Development Patterns

### Error Handling
- Use centralized error handling middleware in `app.ts`
- Propagate errors using `next(error)` in route handlers
- PM2 operations include automatic cleanup on failure

### Security Considerations
- API key is mandatory - application rejects requests without proper authentication
- CORS is configured via `ALLOWED_ORIGINS` environment variable
- All Socket.IO connections require API key in auth object

### Data Flow
1. PM2 events → `pm2Lib.ts` EventEmitter → Socket.IO broadcast
2. Client actions → HTTP API → PM2 operations → Socket.IO updates
3. Monitoring: Server polls PM2 → Delta comparison → Selective client updates

## Production Deployment

Recommended PM2 startup:
```bash
npm run build
pm2 start dist/app.js --name hermes-ui
```

The application is designed to manage PM2 processes, so running it under PM2 provides consistency and reliability.
