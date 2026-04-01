# 05: Roadmap & Growth Strategy

This document defines the "Future" of SchemaForge—its development phases, the MCP ecosystem, and the plan for long-term scalability.

---

## 1. Development Phases
1. **Phase 1-3 (Core)**: Canvas, Editor, AI Generation, Bidirectional Sync (Completed/Refining).
2. **Phase 4 (SaaS Launch)**: 
    - **Dashboard Refresh**: Upgraded sidebar and layout structure (Completed).
    - **Marketing Overhaul**: Consolidated `PublicNav` and `Footer` with professional branding (Completed).
    - **Public Documentation**: Independent public-facing tutorial architecture (Completed).
    - **Stripe Integration**: SaaS subscription logic (Pending).
    - **Founder Edition**: Lifetime licensing implementation (Pending).
3. **Phase 5 (The Ecosystem)**:
    - Publishable **MCP Server** (`@schemaforge/mcp`).
    - Developer API for custom exporters.
    - Community Template marketplace.

## 2. Phase 5: The MCP Server Ecosystem
The Model Context Protocol (MCP) server is the "Killer App" for SchemaForge—it brings the diagram directly into the developer's IDE (Cursor, Windsurf).

### Tool Design
- `schemaforge_list_projects`: Injects project metadata into the AI prompt.
- `schemaforge_read_schema`: Direct context injection into the IDE.
- `schemaforge_generate_migration`: Deep-diffing between the current IDE state and the Cloud Schema.

### Authentication & Monetization
- **Lightweight Verification**: License checks for **Pro/Lifetime** cached for 24 hours.
- **Managed vs. Local AI**: 
    - **Pro**: Uses the managed SchemaForge AI model via the MCP.
    - **Lifetime (BYOK)**: Uses the user's local model/key for the "smarts."

## 3. Growth: "Viral Design Loops"
- **Shareable Visuals**: High-fidelity PNG/SVG exports featuring the "SchemaForge" mark to drive discovery.
- **Open Schema Hub**: A public gallery where users can fork e-commerce, multitenant SaaS, and CRM templates.
- **Founder Scarcity**: Limiting the Lifetime tier to **1,000 users** to build a tight-knit "Power User" community early.

## 4. Scalability Boundaries
- **500+ Tables**: Performance boundary. 
    - SchemaForge will swap to a **simplified "Pill-Node" render mode** (No field rows visible until zoomed in) to preserve 60FPS on the canvas.
    - **Virtualization**: React Flow's built-in virtualization will be heavily tuned.
- **Teams**: Future support for "Workspaces" (shared schema folders) with role-based access control.

## 5. Technology Debt & Refactoring
- **Parser Optimization**: Moving the DBML/SQL parser to a Web Worker to prevent UI jank during large schema syncs.
- **Edge Routing**: Optimizing the Bezier curve calculation logic for extremely dense (500+ link) schemas.
- **Postgres Migrations**: Building a more robust "Pre-commit" check to ensure generated migrations are 100% dialect-safe.
