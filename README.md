# ⚒️ Modellr

**The Visual Database Architect for Modern Developers.**

Modellr is a professional database design platform that bridges the gap between visual diagrams and live code. Build complex relational schemas with a drag-and-drop canvas, generate them with AI, and sync them directly to your IDE via the Model Context Protocol (MCP).

---

## ✨ Key Features

- **🎨 Professional Visual Canvas**: Interactive, high-performance canvas for designing tables and relationships.
- **✦ AI-Powered Materialization**: Describe your app in plain English and let AI generate the entire schema.
- **🔌 Model Context Protocol (MCP)**: Sync your live canvas state directly into Cursor, Windsurf, or Claude Desktop.
- **🏗️ Multi-Dialect Export**: Generate SQL (PostgreSQL, MySQL), DBML, Prisma, and Drizzle schemas in one click.
- **🔄 Schema Diffing & Migrations**: Automatically calculate differences between versions and generate safe migration scripts.
- **👥 Real-time Collaboration**: Built-in Yjs support for multi-user editing with live cursors.

---

## 🚀 Getting Started

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/prateesh7777/Modellr.git
   cd Modellr
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd mcp-server && npm install && cd ..
   ```

3. **Environment Setup**:
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the App & Backend**:
   ```bash
   npm run dev
   ```

---

## 🔌 Using the MCP Server

Modellr includes a specialized MCP server that lets your AI coding assistant read and modify your diagrams.

### 1. Local Stdio (Cursor/Claude Desktop)
Add this to your `mcp.json` or Desktop config:
```json
{
  "mcpServers": {
    "Modellr": {
      "command": "node",
      "args": ["/path/to/Modellr/mcp-server/index.js"],
      "env": {
        "SCHEMA_FORGE_TOKEN": "sfk_live_..."
      }
    }
  }
}
```

### 2. Cloud SSE (Remote)
If hosted on Railway:
```json
{
  "mcpServers": {
    "Modellr": {
      "url": "https://your-mcp-server.up.railway.app/sse"
    }
  }
}
```

---

## 🛠️ Built With

- **Frontend**: React 18, TypeScript, Vite, React Flow
- **Backend**: Node.js, Express, WebSocket (Yjs)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Vanilla CSS (Custom Token System)
- **AI**: OpenAI GPT-4o
