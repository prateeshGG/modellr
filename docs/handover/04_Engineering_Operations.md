# 04: Engineering Operations

This document defines the operational workflows for SchemaForge—local setup, security, and the roadmap for successful production deployment.

---

## 1. Local Development Setup
SchemaForge is a dual-process application (Vite Frontend + Node.js Proxy Server).

### Quick Start
1.  **Clone & Install**: `npm install`.
2.  **Environment Variables**: Create a `.env` file in the root.
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    OPENAI_API_KEY=your_key
    ```
3.  **Run**: `npm run dev`.
    *   **Frontend**: Vite (HMR) on `:5173`.
    *   **Server**: Nodemon on `:3001` (Handles introspection and proxying).
4.  **Lint**: `npm run lint`.

## 2. Infrastructure & Persistence
- **Supabase (Self-Hosted/Managed)**:
    - **Authentication**: Email/Password flow.
    - **Database**: PostgreSQL (Prisma-style schema).
    - **Row Level Security (RLS)**: Enforces that project IDs only match the owner UUID.
- **Y.js (Collaboration)**:
    - Currently using **WebRTC** for P2P sync.
    - **Hocuspocus** integration planned for persistent WebSocket-based multi-user sync.

## 3. Security Best Practices
- **Encryption**: Users' **BYOK (API Keys)** should be stored **locally** in the developer's IDE for the MCP server.
- **Zero-Knowledge**: If keys are saved in the Web App (for Lifetime users), they must be **encrypted at rest** in Supabase and only decrypted in the browser during a live session.
- **Introspection Safety**: The Node Proxy does not store connection strings. They are used once to introspect and then discarded from memory.

## 4. Path to Production Deployment
> [!IMPORTANT]
> The project is currently in the **development phase**. The following is the recommended deployment roadmap:

### Stage 1: Frontend (Vercel/Netlify)
- **Framework**: Vite/React.
- **Environment**: Configure `VITE_` variables in the CI/CD dashboard.

### Stage 2: Backend (Fly.io/Railway/Docker)
- **Service**: The Node Introspection Proxy and Hocuspocus WebSocket server.
- **Requirement**: Must support **WebSockets** for real-time sync.

### Stage 3: Monitoring (Sentry & PostHog)
- **Sentry**: To capture canvas-engine errors and Parser failures.
- **PostHog**: To track high-level metrics (e.g., AI adoption rate, export success).

## 5. Branching & CI Strategy
- **`main`**: Production-ready code.
- **`develop`**: Stable integration branch.
- **Feature Branches**: `feat/` and `fix/`.
- **Pre-commit**: Husky-driven linting and TypeScript validity checks.
