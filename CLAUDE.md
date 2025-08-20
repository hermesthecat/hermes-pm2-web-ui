# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes PM2 Web UI - a TypeScript-based web interface for managing PM2 processes with real-time monitoring, project organization, and live log streaming capabilities.

### Architecture

- **Backend**: Express.js server with TypeScript (`src/app.ts`)
- **Frontend**: Vanilla HTML/CSS/JavaScript with jQuery and Bootstrap 5
- **PM2 Integration**: Custom PM2 wrapper (`src/pm2Lib.ts`) with event-driven architecture
- **Real-time Communication**: Socket.IO for live process updates and log streaming
- **Authentication**: API key-based middleware protecting all endpoints
- **Data Persistence**: JSON file-based storage for project configurations

### Key Components

- `src/app.ts` - Main Express server with routes, Socket.IO setup, and auth middleware
- `src/pm2Lib.ts` - PM2 wrapper extending EventEmitter for process operations
- `src/services/ProjectService.ts` - Project CRUD operations with JSON persistence
- `src/models/Project.ts` - TypeScript interfaces for project data structures
- `public/js/main.js` - Frontend controller with Socket.IO client
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

**Important**: The application enforces API key authentication. Without `API_KEY`, all requests are rejected with 401.

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
  processes: string[];  // PM2 process names
  createdAt: number;
  updatedAt: number;
}
```

## Frontend Architecture

- jQuery for DOM manipulation and AJAX
- Bootstrap 5 for responsive UI components
- Socket.IO client for real-time updates
- No build process - served directly from `public/`

## Socket.IO Event Patterns

Client-Server events:
- `processUpdate` - Real-time process status changes
- `log` - Live log streaming from PM2 processes
- `error` - Error notifications
- `disconnect`/`connect` - Connection state management

## File Structure

```
src/
├── app.ts              # Express server and Socket.IO setup
├── pm2Lib.ts           # PM2 wrapper with EventEmitter
├── socketIO.ts         # Socket.IO event handlers (integrated in app.ts)
├── models/
│   └── Project.ts      # TypeScript interfaces
└── services/
    └── ProjectService.ts # Project persistence logic

public/
├── index.html          # Single-page application
├── css/style.css       # Application styles
└── js/main.js          # Frontend JavaScript controller

data/
└── projects.json       # Project data storage
```

## No Testing Framework

The project currently has no testing setup. Package.json contains no test scripts or testing dependencies.