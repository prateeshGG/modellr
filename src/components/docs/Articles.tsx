// Documentation Articles

const REPO_URL = 'https://github.com/prateesh7777/modellr';

const extLink = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{text}</a>
);

export const GettingStartedArticle = () => (
  <article className="docs-article">
    <h1>Getting started</h1>
    <p>
      Modellr is a free, open-source schema designer that runs in your browser. There is nothing to install and no account to
      create. Open <code>/app</code> and start designing.
    </p>

    <h2>Create a schema</h2>

    <h3>Option 1 — Start from scratch</h3>
    <ol className="docs-list">
      <li>Open <code>/app</code> and click "New schema".</li>
      <li>Add a table with the <code>T</code> key, the command palette, or the sidebar.</li>
      <li>Add fields and set their type, primary key, foreign key, unique, nullable, default, check constraint and comment.</li>
      <li>Drag from one field to another to create a relationship.</li>
    </ol>

    <h3>Option 2 — Start from a template</h3>
    <p>Pick one of the starter templates (Blog, E-commerce, Auth & Users, Multi-tenant SaaS) from the dashboard and change it to fit.</p>

    <h3>Option 3 — Import an existing schema</h3>
    <p>Paste SQL DDL or a Prisma schema into the Import dialog. See the import article for details.</p>

    <h2>Working in the editor</h2>
    <ul className="docs-list">
      <li><strong>Canvas</strong>: tables, relationships, notes and groups, with auto-layout, search and undo/redo.</li>
      <li><strong>Split and code views</strong>: show generated SQL, DBML, Prisma or Drizzle next to the canvas. The code panel is read-only; make changes on the canvas.</li>
      <li><strong>Command palette</strong>: press Ctrl/Cmd+K to find any action.</li>
      <li><strong>Theme</strong>: switch between light and dark.</li>
    </ul>

    <h2>Where your work is saved</h2>
    <p>
      Schemas are saved automatically in your browser (IndexedDB). Nothing is uploaded. Clearing your browser's site data
      deletes your projects, so make a backup of anything important. See the backup article.
    </p>
  </article>
);

export const ImportArticle = () => (
  <article className="docs-article">
    <h1>Importing SQL, Prisma and JSON</h1>
    <p>Use the Import button in the editor top bar, or the command palette, to bring in an existing schema.</p>

    <h2>SQL DDL</h2>
    <p>Paste <code>CREATE TABLE</code> statements (and related DDL). Tables, fields, keys and relationships are parsed onto the canvas.</p>
    <ul className="docs-list">
      <li><strong>PostgreSQL and MySQL</strong> are the primary dialects.</li>
      <li><strong>SQLite and SQL Server</strong> syntax is only partly supported. Check the imported result.</li>
    </ul>
    <p>Import is a best-effort parser. If a statement is not understood, simplify it or add the missing pieces on the canvas.</p>

    <h2>Prisma schema</h2>
    <p>Paste the contents of a <code>schema.prisma</code> file. Models and relations are imported.</p>

    <h2>JSON</h2>
    <p>
      Modellr's own JSON files can be imported from the dashboard: either a single exported schema or a full backup. See the
      backup article.
    </p>
  </article>
);

export const ExportArticle = () => (
  <article className="docs-article">
    <h1>Exporting</h1>
    <p>Open the Export menu in the top bar (or press Ctrl/Cmd+Shift+E) and choose a format.</p>

    <h2>Formats</h2>
    <ul className="docs-list">
      <li><strong>SQL DDL</strong>: PostgreSQL, MySQL, SQLite or SQL Server. Choose the dialect in the top bar first.</li>
      <li><strong>Prisma schema</strong></li>
      <li><strong>Drizzle ORM</strong></li>
      <li><strong>DBML</strong></li>
      <li><strong>JSON</strong>: Modellr's own format, useful for backups.</li>
      <li><strong>PNG and SVG</strong>: images of the diagram for docs, wikis and slides.</li>
    </ul>

    <h2>Example</h2>
    <div className="docs-code-block">
      <div className="docs-code-label">schema.prisma</div>
      {`model User {
  id    String @id @default(uuid())
  email String @unique
}`}
    </div>

    <h2>Review before using</h2>
    <p>
      Generated code is a starting point. Read it, and test it before using it in a real project, especially for less common
      types and constraints.
    </p>
  </article>
);

export const SnapshotsDiffArticle = () => (
  <article className="docs-article">
    <h1>Snapshots and diff</h1>
    <p>Snapshots are local, per-project checkpoints. They are stored with the project in your browser.</p>

    <h2>Save and restore</h2>
    <ol className="docs-list">
      <li>Open the History section in the sidebar.</li>
      <li>Click "+ Save snapshot".</li>
      <li>Click a snapshot in the list to restore it.</li>
    </ol>

    <h2>Compare and generate migration SQL</h2>
    <ol className="docs-list">
      <li>Click Diff in the top bar (or "Compare with snapshot" in the command palette).</li>
      <li>Pick a snapshot to compare against the current schema.</li>
      <li>Review the changes and the generated migration SQL.</li>
    </ol>
    <p>
      Always review the migration SQL before running it on a real database. The diff cannot tell that something was renamed, so
      a renamed table or column appears as a drop plus an add, which would delete data if run as-is.
    </p>
    <p>Modellr never connects to your database, so nothing is run for you.</p>
  </article>
);

export const SharingArticle = () => (
  <article className="docs-article">
    <h1>Sharing links and embeds</h1>
    <p>
      Sharing is stateless. The schema is compressed into the URL itself, so there is no server, no account and nothing is stored
      anywhere but in the link.
    </p>

    <h2>Share a read-only link</h2>
    <ol className="docs-list">
      <li>Click Share in the top bar (or "Copy share link" in the command palette).</li>
      <li>Send the link to anyone.</li>
    </ol>
    <p>
      Recipients see a read-only snapshot of the schema as it was when you copied the link. Later changes are not reflected. They
      can use "Save a copy to edit" to keep their own editable copy in their browser.
    </p>

    <h2>Embed in a page</h2>
    <p>The Share dialog has an Embed tab with an <code>iframe</code> snippet for docs or wikis. It works the same way and is also read-only.</p>

    <h2>Things to know</h2>
    <ul className="docs-list">
      <li>Anyone who has the link can read the schema inside it.</li>
      <li>Very large schemas make very long links, which some apps cut off. For large schemas, export JSON or an image instead.</li>
    </ul>
  </article>
);

export const AiSetupArticle = () => (
  <article className="docs-article">
    <h1>AI assistant (bring your own key)</h1>
    <p>
      AI is optional and off by default. There is no AI hosted by Modellr. When you configure it, requests go from your browser
      directly to the OpenAI-compatible endpoint you choose.
    </p>

    <h2>Set it up</h2>
    <ol className="docs-list">
      <li>Open Settings (<code>/app/settings</code>) and click "Set up AI", or click the AI button in the editor.</li>
      <li>Choose a preset (OpenAI, OpenRouter, Ollama) or enter a custom base URL.</li>
      <li>Enter a model name and, for hosted providers, your API key.</li>
    </ol>
    <p>Your key is stored only in this browser. "Remove key" in Settings deletes it.</p>

    <h2>Using a local model with Ollama</h2>
    <ol className="docs-list">
      <li>Install Ollama and pull a model, for example <code>ollama pull llama3.1</code>.</li>
      <li>Pick the "Ollama (local)" preset. The base URL is <code>http://localhost:11434/v1</code> and no key is needed.</li>
      <li>
        Start Ollama with <code>OLLAMA_ORIGINS</code> set to the address of the site you are using, so the browser is allowed to
        call it (CORS). Without that the request is blocked by the browser.
      </li>
    </ol>
    <p>With a local model, your schema never leaves your machine.</p>

    <h2>Things to know</h2>
    <ul className="docs-list">
      <li>Some providers block direct browser requests. If you see a connection error and the URL is right, try OpenRouter or a local model.</li>
      <li>Your prompts and schema context are sent to the provider you chose and are covered by that provider's policies.</li>
      <li>AI output can be wrong. Review generated schemas and SQL before using them.</li>
    </ul>
  </article>
);

export const BackupArticle = () => (
  <article className="docs-article">
    <h1>Backup and restore</h1>
    <p>
      Projects live only in your browser's IndexedDB. If you clear site data, use a different browser or profile, or your
      browser evicts storage, they are gone. There is no cloud copy.
    </p>

    <h2>Back up everything</h2>
    <p>Use "Backup all" on the dashboard or "Download backup" in Settings. You get one JSON file with all your schemas.</p>

    <h2>Restore</h2>
    <p>Use "Restore from file" in Settings, or "Import JSON" on the dashboard, and choose a backup file.</p>

    <h2>Move a single schema</h2>
    <p>Export one project as a JSON file from its card on the dashboard, and import it elsewhere with "Import JSON".</p>

    <h2>Tips</h2>
    <ul className="docs-list">
      <li>Back up before clearing browser data.</li>
      <li>Keep the JSON file somewhere safe, or commit it to version control.</li>
      <li>If your browser blocks storage, the editor warns you that work will be lost when the tab closes. Export before leaving.</li>
    </ul>
  </article>
);

export const ShortcutsArticle = () => (
  <article className="docs-article">
    <h1>Keyboard shortcuts</h1>
    <p>
      Use Ctrl on Windows and Linux, and Cmd on macOS. Single-key shortcuts and undo/redo do not fire while you are typing in
      a text field.
    </p>

    <h2>Anywhere in the editor</h2>
    <ul className="docs-list">
      <li><code>Ctrl/Cmd+K</code>: open or close the command palette</li>
      <li><code>Ctrl/Cmd+F</code>: search tables and fields</li>
      <li><code>Ctrl/Cmd+Shift+E</code>: open the export menu</li>
    </ul>

    <h2>Editing</h2>
    <ul className="docs-list">
      <li><code>Ctrl/Cmd+Z</code>: undo</li>
      <li><code>Ctrl/Cmd+Y</code> or <code>Ctrl/Cmd+Shift+Z</code>: redo</li>
      <li><code>Delete</code> or <code>Backspace</code>: delete the selected table, field or relationship</li>
      <li><code>Esc</code>: close the palette, or clear the selection</li>
    </ul>

    <h2>Canvas</h2>
    <ul className="docs-list">
      <li><code>T</code>: add a table</li>
      <li><code>G</code>: auto-layout</li>
      <li><code>F</code>: fit the diagram to the view</li>
      <li><code>/</code>: focus the table filter</li>
      <li><code>1</code> to <code>5</code>: zoom presets</li>
    </ul>

    <h2>Panels</h2>
    <ul className="docs-list">
      <li><code>Ctrl/Cmd+B</code>: toggle the sidebar</li>
      <li><code>Ctrl/Cmd+\</code>: toggle the right panel</li>
    </ul>
  </article>
);

export const SelfHostingArticle = () => (
  <article className="docs-article">
    <h1>Self-hosting</h1>
    <p>Modellr is a static site. There is no backend to run and no database to set up.</p>

    <h2>Build and serve</h2>
    <div className="docs-code-block">
      <div className="docs-code-label">terminal</div>
      {`git clone ${REPO_URL}
cd modellr
npm install
npm run build
# serve the dist/ folder with any static host`}
    </div>
    <ul className="docs-list">
      <li>Any static host works: a CDN, an object-storage bucket, nginx, or a simple file server.</li>
      <li>The app uses client-side routes, so configure your host to fall back to <code>index.html</code> for unknown paths.</li>
      <li>Each deployment keeps its own data: projects are stored per browser and per site address.</li>
    </ul>

    <h2>Source and license</h2>
    <p>The code is MIT licensed: {extLink(REPO_URL, 'github.com/prateesh7777/modellr')}.</p>
  </article>
);

export const ExamplesArticle = () => (
  <article className="docs-article">
    <h1>Starter templates</h1>
    <p>These templates are included in the app:</p>

    <ul className="docs-list">
      <li><strong>Blog</strong>: users, posts, comments, tags and post_tags</li>
      <li><strong>E-commerce</strong>: users, products, orders and order_items</li>
      <li><strong>Auth & Users</strong>: users, sessions and profiles with UUID keys</li>
      <li><strong>Multi-tenant SaaS</strong>: organizations, users, members and subscriptions</li>
    </ul>

    <h2>How to use a template</h2>
    <ol className="docs-list">
      <li>Open <code>/app/templates</code> or use the template section on the dashboard.</li>
      <li>Create a project from a template.</li>
      <li>Edit it on the canvas, then export to your stack.</li>
    </ol>
    <p>Templates are starting points, not production-ready designs. Adjust them for your own requirements.</p>
  </article>
);

export const NotesArticle = () => (
  <article className="docs-article">
    <h1>What Modellr does not do</h1>
    <p>Modellr is deliberately small. It does not offer:</p>

    <ul className="docs-list">
      <li>User accounts or sign-in</li>
      <li>Cloud sync or server-side storage (your projects live only in your browser)</li>
      <li>Real-time multi-user collaboration or team workspaces</li>
      <li>Live database connection or introspection. It never connects to your database, so import SQL or Prisma instead</li>
      <li>An MCP server or coding-agent integration</li>
      <li>Billing, plans or API keys of its own</li>
    </ul>

    <h2>Limitations</h2>
    <ul className="docs-list">
      <li>The code panel is a read-only view of the generated output. Edit on the canvas.</li>
      <li>SQL import is best effort. PostgreSQL and MySQL work best; SQLite and SQL Server are partly supported.</li>
      <li>Migration SQL from the diff viewer must be reviewed by you. Renames appear as drop plus add.</li>
      <li>Very large schemas (hundreds of tables) can be slow in a browser.</li>
      <li>Share links hold the whole schema in the URL, so very large schemas make very long links.</li>
    </ul>
  </article>
);
