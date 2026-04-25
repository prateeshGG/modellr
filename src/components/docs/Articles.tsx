// Documentation Articles

export const GettingStartedArticle = () => (
  <article className="docs-article">
    <h1>Getting started</h1>
    <p>The editor allows you to design database schemas using:</p>
    <ul className="docs-list">
      <li>visual canvas</li>
      <li>code editor (DBML / SQL)</li>
      <li>AI generation</li>
    </ul>
    <p>All three are synchronized in real time.</p>

    <h2>Create a schema</h2>

    <h3>Option 1 — Start from scratch</h3>
    <ol className="docs-list">
      <li>Open <code>/app</code></li>
      <li>Click "New schema" (or start typing)</li>
      <li>Add tables via canvas (UI), code editor, or AI prompt</li>
    </ol>

    <h3>Option 2 — Use AI</h3>
    <ol className="docs-list">
      <li>Open AI drawer</li>
      <li>Enter a prompt: <em>Build a SaaS schema with users, subscriptions, and usage tracking</em></li>
      <li>Apply result to canvas</li>
    </ol>

    <h3>Option 3 — Import schema</h3>
    <p>Supported inputs:</p>
    <ul className="docs-list">
      <li>SQL DDL</li>
      <li>Prisma schema</li>
    </ul>
    <p>Paste into editor → schema is parsed and visualized.</p>

    <h3>Option 4 — Live Introspection</h3>
    <ol className="docs-list">
      <li>Click "Import" in the top bar</li>
      <li>Select "Connect Live DB"</li>
      <li>Enter your connection string (PostgreSQL or MySQL)</li>
      <li>Modellr will safely introspect your structure and generate the diagram</li>
    </ol>

    <h2>Editing schema</h2>
    <p>You can modify the schema in three ways:</p>
    <ul className="docs-list">
      <li><strong>Canvas</strong> → add tables, relationships</li>
      <li><strong>Code</strong> → edit DBML / SQL</li>
      <li><strong>AI</strong> → describe changes</li>
    </ul>
    <p>All changes sync instantly.</p>

    <h2>Saving</h2>
    <ul className="docs-list">
      <li>Free plan: up to 3 schemas</li>
      <li>Pro plan: unlimited</li>
    </ul>
  </article>
);

export const AiUsageArticle = () => (
  <article className="docs-article">
    <h1>AI usage</h1>
    <p>AI can generate, modify, and analyze your schema.</p>

    <h2>Generate schema</h2>
    <div className="docs-code-block">
      <div className="docs-code-label">Example Prompt</div>
      {"E-commerce schema with products, carts, orders, and payments"}
    </div>
    <p>Result:</p>
    <ul className="docs-list">
      <li>tables created</li>
      <li>relationships mapped</li>
      <li>columns inferred</li>
    </ul>

    <h2>Modify schema</h2>
    <p>You can update existing schemas:</p>
    <div className="docs-code-block">
      <div className="docs-code-label">Example Prompt</div>
      {"Add reviews table linked to users and products"}
    </div>
    <p>AI will:</p>
    <ul className="docs-list">
      <li>create table</li>
      <li>link relationships</li>
      <li>update diagram</li>
    </ul>

    <h2>Analyze schema</h2>
    <p>AI can detect:</p>
    <ul className="docs-list">
      <li>missing relationships</li>
      <li>normalization issues</li>
      <li>potential indexes</li>
    </ul>

    <h2>Limits</h2>
    <ul className="docs-list">
      <li><strong>Free</strong>: limited daily generations</li>
      <li><strong>Pro</strong>: higher limits + full chat-to-modify</li>
    </ul>
  </article>
);

export const ExportPrismaArticle = () => (
  <article className="docs-article">
    <h1>Exporting to Prisma</h1>
    <p>Export your schema natively for Prisma ORM.</p>

    <h2>Use case</h2>
    <ul className="docs-list">
      <li>Node.js / TypeScript apps</li>
      <li>Prisma ORM integration</li>
    </ul>

    <h2>Steps</h2>
    <ol className="docs-list">
      <li>Open command palette (⌘K)</li>
      <li>Select "Export → Prisma"</li>
      <li>Copy or download schema</li>
    </ol>

    <h2>Output example</h2>
    <div className="docs-code-block">
      <div className="docs-code-label">schema.prisma</div>
      {`model User {
  id    String @id @default(uuid())
  email String @unique
}`}
    </div>
  </article>
);

export const ExportDrizzleArticle = () => (
  <article className="docs-article">
    <h1>Exporting to Drizzle</h1>
    <p>Export your schema natively for Drizzle ORM.</p>

    <h2>Use case</h2>
    <ul className="docs-list">
      <li>TypeScript-first stacks</li>
      <li>Drizzle ORM targeting PostgreSQL/MySQL</li>
    </ul>

    <h2>Steps</h2>
    <ol className="docs-list">
      <li>Open export menu in the top bar</li>
      <li>Select "Drizzle"</li>
      <li>Download generated TypeScript code</li>
    </ol>
  </article>
);

export const ExportSqlArticle = () => (
  <article className="docs-article">
    <h1>Exporting SQL & Data</h1>
    <p>Schemas can be exported into multiple formats depending on your workflow.</p>

    <h2>SQL export</h2>
    <p>Supported dialects:</p>
    <ul className="docs-list">
      <li>PostgreSQL</li>
      <li>MySQL (basic compatibility)</li>
    </ul>

    <h2>DBML export</h2>
    <p>Useful for sharing or version control. DBML is the native syntax Engine of Modellr under the hood.</p>

    <h2>Image export</h2>
    <ul className="docs-list">
      <li>PNG</li>
      <li>SVG</li>
    </ul>
    <p>Used for documentation, team sharing, or embedding in external wikis.</p>
  </article>
);

export const ExamplesArticle = () => (
  <article className="docs-article">
    <h1>Example schemas</h1>

    <h2>SaaS schema</h2>
    <p>Includes:</p>
    <ul className="docs-list">
      <li>users</li>
      <li>organizations</li>
      <li>subscriptions</li>
      <li>usage tracking</li>
    </ul>

    <h2>E-commerce schema</h2>
    <p>Includes:</p>
    <ul className="docs-list">
      <li>products</li>
      <li>carts</li>
      <li>orders</li>
      <li>payments</li>
    </ul>

    <h2>Auth schema</h2>
    <p>Includes:</p>
    <ul className="docs-list">
      <li>users</li>
      <li>sessions</li>
      <li>roles</li>
      <li>permissions</li>
    </ul>

    <h2>How to use examples</h2>
    <ol className="docs-list">
      <li>Open template</li>
      <li>Modify using AI or code</li>
      <li>Export to your stack</li>
    </ol>
  </article>
);

export const NotesArticle = () => (
  <article className="docs-article">
    <h1>Notes & Limitations</h1>

    <h2>Sync model</h2>
    <p>The editor uses a unified schema model.</p>
    <ul className="docs-list">
      <li>Changes in canvas update code</li>
      <li>Changes in code update canvas</li>
      <li>AI updates both</li>
    </ul>

    <h2>Limitations</h2>
    <ul className="docs-list">
      <li>Introspection requires a reachable database (SSL recommended)</li>
      <li>No live migrations are automatically executed against your DB; we provide the SQL for manual review</li>
    </ul>

    <h2>Performance</h2>
    <ul className="docs-list">
      <li>Large schemas may auto-collapse groups</li>
      <li>Layout is automatically optimized running a background DAG layout algorithm</li>
    </ul>
  </article>
);
