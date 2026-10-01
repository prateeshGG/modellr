/**
 * Titles and descriptions for every public route. Pure data with no imports, so the React pages and
 * the post-build script (scripts/postbuild-seo.mjs, run by Node directly) read the same source.
 */
export const SITE_NAME = 'Modellr';

export const DEFAULT_DESCRIPTION =
  'Modellr is a free, open-source, local-first database schema designer. Design tables and relationships in your browser, import SQL or Prisma, and export SQL, Prisma, Drizzle and DBML. No sign-up.';

export interface RouteMeta {
  /** Page title without the site name. Omitted for the home page. */
  title?: string;
  description: string;
}

export function buildTitle(title?: string): string {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: free, open-source, local-first database schema designer`;
}

export const STATIC_META: Record<string, RouteMeta> = {
  '/': { description: DEFAULT_DESCRIPTION },
  '/features': {
    title: 'Features',
    description: 'Everything in Modellr: visual canvas, SQL and Prisma import, SQL/Prisma/Drizzle/DBML export, snapshots and diff, share links, local-first storage and optional bring-your-own-key AI.',
  },
  '/templates': {
    title: 'Database schema templates',
    description: 'Free starter database schemas: e-commerce, multi-tenant SaaS, blog and auth. Open one in the browser editor, change it, and export SQL, Prisma or Drizzle.',
  },
  '/blog': { title: 'Blog', description: 'Short, practical notes on database schema design, migrations, ORMs and keeping diagrams honest.' },
  '/about': { title: 'About', description: 'Modellr is a free, open-source, local-first schema designer built in the open on GitHub. Why it exists and how it is built.' },
  '/contact': { title: 'Contact', description: 'Report a bug, suggest a feature or read the source. Modellr is open source and everything happens in public on GitHub.' },
  '/privacy': { title: 'Privacy policy', description: 'Modellr is a static, local-first app with no accounts, no analytics and no cookies. Your schemas stay in your browser.' },
  '/terms': { title: 'Terms of use', description: 'Modellr is free, MIT-licensed software provided as is. Plain-language terms of use.' },
  '/use-cases/saas-database-schema': {
    title: 'SaaS database schema example',
    description: 'A free multi-tenant SaaS database schema: organizations, users, members and subscriptions with foreign keys wired. Open it in the browser, change it, export SQL, Prisma or Drizzle.',
  },
  '/use-cases/ecommerce-schema': {
    title: 'E-commerce database schema example',
    description: 'A free e-commerce database schema: users, products, orders and order items with foreign keys wired. Open it in the browser, change it, export SQL, Prisma or Drizzle.',
  },
  '/use-cases/auth-schema': {
    title: 'Authentication database schema example',
    description: 'A free authentication database schema: users, sessions and profiles with UUID keys. Open it in the browser, change it, export SQL, Prisma or Drizzle.',
  },
};

/** Docs articles by slug. "getting-started" lives at /docs, the rest at /docs/<slug>. */
export const DOCS_META: Record<string, { label: string; description: string }> = {
  'getting-started': { label: 'Getting started', description: 'Create, import and export your first database schema in Modellr in about a minute.' },
  import: { label: 'Importing SQL, Prisma and JSON', description: 'Bring an existing schema into Modellr from SQL DDL, a Prisma schema or a JSON backup.' },
  export: { label: 'Exporting', description: 'Export SQL, Prisma, Drizzle, DBML, JSON, PNG and SVG from Modellr.' },
  'snapshots-diff': { label: 'Snapshots and diff', description: 'Save schema versions, compare them and generate migration SQL.' },
  sharing: { label: 'Sharing and embeds', description: 'Stateless share links and iframe embeds that carry the schema in the URL.' },
  'ai-setup': { label: 'AI assistant (your own key)', description: 'Set up the optional AI assistant with OpenAI, OpenRouter or a local Ollama model.' },
  backup: { label: 'Backup and restore', description: 'Back up all Modellr projects to one JSON file and restore them anywhere.' },
  shortcuts: { label: 'Keyboard shortcuts', description: 'Keyboard shortcuts for the Modellr editor.' },
  examples: { label: 'Templates', description: 'Starter schemas included with Modellr.' },
  'self-hosting': { label: 'Self-hosting', description: 'Build Modellr and serve it from any static host.' },
  notes: { label: 'What Modellr does not do', description: 'The limits of Modellr: no accounts, no live database connections, no real-time collaboration.' },
};

export const docsPath = (slug: string) => (slug === 'getting-started' ? '/docs' : `/docs/${slug}`);
export const docsTitle = (slug: string) => `${DOCS_META[slug].label} (docs)`;
