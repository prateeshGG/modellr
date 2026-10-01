import { Link, Navigate, useParams } from 'react-router-dom';
import { SiteShell } from '../components/site/SiteShell';
import { DocsLayout } from '../components/docs/DocsLayout';
import { DOCS_NAV, docsPath } from '../components/docs/docsNav';
import {
  GettingStartedArticle, ImportArticle, ExportArticle, SnapshotsDiffArticle, SharingArticle, AiSetupArticle,
  BackupArticle, ShortcutsArticle, SelfHostingArticle, ExamplesArticle, NotesArticle,
} from '../components/docs/Articles';

const ARTICLES: Record<string, { label: string; description: string; Component: React.ComponentType }> = {
  'getting-started': { label: 'Getting started', description: 'Create, import and export your first database schema in Modellr in about a minute.', Component: GettingStartedArticle },
  import: { label: 'Importing SQL, Prisma and JSON', description: 'Bring an existing schema into Modellr from SQL DDL, a Prisma schema or a JSON backup.', Component: ImportArticle },
  export: { label: 'Exporting', description: 'Export SQL, Prisma, Drizzle, DBML, JSON, PNG and SVG from Modellr.', Component: ExportArticle },
  'snapshots-diff': { label: 'Snapshots and diff', description: 'Save schema versions, compare them and generate migration SQL.', Component: SnapshotsDiffArticle },
  sharing: { label: 'Sharing and embeds', description: 'Stateless share links and iframe embeds that carry the schema in the URL.', Component: SharingArticle },
  'ai-setup': { label: 'AI assistant (your own key)', description: 'Set up the optional AI assistant with OpenAI, OpenRouter or a local Ollama model.', Component: AiSetupArticle },
  backup: { label: 'Backup and restore', description: 'Back up all Modellr projects to one JSON file and restore them anywhere.', Component: BackupArticle },
  shortcuts: { label: 'Keyboard shortcuts', description: 'Keyboard shortcuts for the Modellr editor.', Component: ShortcutsArticle },
  examples: { label: 'Templates', description: 'Starter schemas included with Modellr.', Component: ExamplesArticle },
  'self-hosting': { label: 'Self-hosting', description: 'Build Modellr and serve it from any static host.', Component: SelfHostingArticle },
  notes: { label: 'What Modellr does not do', description: 'The limits of Modellr: no accounts, no live database connections, no real-time collaboration.', Component: NotesArticle },
};

const ORDER = DOCS_NAV.flatMap((g) => g.items.map((i) => i.id as string));

export function Docs() {
  const { slug = 'getting-started' } = useParams();
  const article = ARTICLES[slug];
  if (!article) return <Navigate to="/docs" replace />;

  const { Component } = article;
  const next = ORDER[ORDER.indexOf(slug) + 1];

  return (
    <SiteShell title={`${article.label} (docs)`} description={article.description} path={docsPath(slug)}>
      <DocsLayout current={slug}>
        <span className="n-eyebrow">Docs</span>
        <Component />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: '3em' }}>
          <Link to="/app" className="n-btn">Open the editor</Link>
          {next && <Link to={docsPath(next)} className="n-arrow">Next: {ARTICLES[next].label}</Link>}
        </div>
      </DocsLayout>
    </SiteShell>
  );
}
