// Documentation Articles
export const IntroArticle = () => (
  <article className="docs-article">
    <h1>Welcome to SchemaForge</h1>
    <p>
      SchemaForge is a professional database design platform built for the modern multi-dialect ecosystem. 
      It is designed for both seasoned architects and students who are just beginning their journey into data modeling.
    </p>
    <div className="docs-alert">
      <div className="docs-alert-title">Visual Designing for Students</div>
      <p className="docs-alert-text">
        You do not need to know how to write code to use SchemaForge. Think of it like drawing a map of how 
        your app stores information. The SQL code is just the final output that tells the computer how to build it.
      </p>
    </div>
    <h2>Why Visual Modeling Matters?</h2>
    <p>
      In modern software engineering, the database is the foundation of everything. 
      Visualizing your schema allows you to:
    </p>
    <ul className="docs-list">
      <li><strong>Catch Errors Early</strong>: It is much easier to see a missing relationship on a canvas than in 500 lines of SQL.</li>
      <li><strong>Collaborate</strong>: Sharing a link to your diagram is faster than explaining a complex data structure in words.</li>
      <li><strong>Focus on Logic</strong>: Spend your time thinking about how data connects, not the syntax of semicolons and commas.</li>
    </ul>
  </article>
);

/** Normalization Primer */
export const NormalizationArticle = () => (
  <article className="docs-article">
    <h1>Database Normalization 101</h1>
    <p>
      For students just getting started, "Normalization" is a fancy word for "Organizing your buckets."
      When we design a database, we want to avoid repeating information.
    </p>
    <h2>The "Single Bucket" Mistake</h2>
    <p>
      Imagine putting all your clothes, shoes, and groceries in one single bucket. It's a mess! 
      Database design is the same. Instead of putting a User's name, their Address, and all their 
      Orders in one table, we split them up.
    </p>
    <div className="docs-alert">
      <div className="docs-alert-title">The Golden Rule</div>
      <p className="docs-alert-text">
        One table should describe exactly one thing. A 'Users' table only describes users. 
        A 'Products' table only describes products.
      </p>
    </div>
    <h2>Testing Your Design</h2>
    <p>
      Ask yourself: "If a user changes their email address, do I have to update multiple rows in multiple places?"
      If the answer is yes, you probably need to normalize your tables.
    </p>
  </article>
);

/** Canvas Guide */
export const CanvasArticle = () => (
  <article className="docs-article">
    <h1>The Visual Editor</h1>
    <p>
      The visual editor is where your architecture comes to life. It handles the heavy lifting 
      of keeping your foreign keys and primary keys in sync.
    </p>
    <h2>Table Interactions</h2>
    <ul className="docs-list">
      <li><strong>Naming Conventions</strong>: Always use lowercase and underscores (e.g., <code>user_profiles</code>). 
      This ensures your design works on every database in the world.</li>
      <li><strong>Primary Keys (PK)</strong>: Every table needs a Primary Key. This is a unique ID for every row. 
      SchemaForge marks these with a gold star icon in the editor.</li>
      <li><strong>Accent Colors</strong>: Use colors to group related tables. For example, make all "Billing" tables orange 
      and all "Identity" tables blue.</li>
    </ul>
    <h2>Keyboard Power-Ups</h2>
    <div className="docs-code-block">
      <div className="docs-code-label">Shortcuts</div>
      {`G      - Auto-layout (cleans up your mess)
/      - Search for a specific table or field
DEL    - Delete the selected table or connection
F      - Fit the entire schema on your screen`}
    </div>
  </article>
);

/** Relationships Guide */
export const RelationshipsArticle = () => (
  <article className="docs-article">
    <h1>Understanding Relationships</h1>
    <p>
      Relationships are the "bridges" between your buckets of data. In relational databases, 
      we use these bridges to join information together.
    </p>
    <h2>Crow's Foot Notation</h2>
    <p>
      You will notice that connections in SchemaForge have specific symbols at the end. 
      This is called "Crow's Foot Notation," and it is the industry standard for database design.
    </p>
    <ul className="docs-list">
      <li><strong>One-to-One (1:1)</strong>: A person has exactly one Social Security Number. One row in Table A matches one row in Table B.</li>
      <li><strong>One-to-Many (1:N)</strong>: A customer can have many orders. One row in Table A matches many rows in Table B. This is the most common relationship.</li>
    </ul>
    <div className="docs-alert">
      <div className="docs-alert-title">Foreign Keys (FK)</div>
      <p className="docs-alert-text">
        When you connect a 'User' to an 'Order', the Order table gets a "Foreign Key" (user_id). 
        This is the glue that sticks the two tables together.
      </p>
    </div>
  </article>
);

/** MCP Guide */
export const MCPArticle = () => (
  <article className="docs-article">
    <h1>MCP & IDE Connection (Advanced)</h1>
    <p>
      For students moving into professional development, the Model Context Protocol (MCP) allows your 
      AI Coding Assistant (like Cursor or Windsurf) to "read" your visual diagrams directly.
    </p>
    <h2>Connecting Your Workspace</h2>
    <p>Add this to your IDE's MCP settings to enable the SchemaForge bridge:</p>
    <div className="docs-code-block">
      <div className="docs-code-label">mcp-settings.json</div>
      {`{
  "mcpServers": {
    "schemaforge": {
      "command": "npx",
      "args": ["-y", "@schemaforge/mcp-server"],
      "env": {
        "SCHEMA_FORGE_TOKEN": "sfk_live_your_token_here"
      }
    }
  }
}`}
    </div>
    <h2>Why use this?</h2>
    <p>
      Instead of typing out <code>CREATE TABLE</code> commands manually in your local terminal, 
      your AI can fetch the design you just built on our canvas and write the migration for you.
    </p>
  </article>
);

/** Export Guide */
export const ExportArticle = () => (
  <article className="docs-article">
    <h1>Exports & Integrations</h1>
    <p>
      SchemaForge supports every major database engine. Once you are happy with your visual design, 
      you can export it into a format the computer understands.
    </p>
    <h2>Supported Formats</h2>
    <ul className="docs-list">
      <li><strong>PostgreSQL</strong>: The standard for modern web apps. Support PK/FK constraints and specialized data types.</li>
      <li><strong>Prisma</strong>: The best choice for modern TypeScript developers. Generates a <code>schema.prisma</code> file instantly.</li>
      <li><strong>Image (PNG/SVG)</strong>: Perfect for putting your design in your school project reports or documentation.</li>
    </ul>
  </article>
);
