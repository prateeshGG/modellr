import { Link, Navigate, useParams } from 'react-router-dom';
import { SiteShell } from '../components/site/SiteShell';
import { DocsLayout } from '../components/docs/DocsLayout';
import { DOCS_NAV } from '../components/docs/docsNav';
import { DOCS_META, docsPath, docsTitle } from '../lib/routeMeta';
import {
  GettingStartedArticle, ImportArticle, ExportArticle, SnapshotsDiffArticle, SharingArticle, AiSetupArticle,
  BackupArticle, ShortcutsArticle, SelfHostingArticle, ExamplesArticle, NotesArticle,
} from '../components/docs/Articles';

const COMPONENTS: Record<string, React.ComponentType> = {
  'getting-started': GettingStartedArticle,
  import: ImportArticle,
  export: ExportArticle,
  'snapshots-diff': SnapshotsDiffArticle,
  sharing: SharingArticle,
  'ai-setup': AiSetupArticle,
  backup: BackupArticle,
  shortcuts: ShortcutsArticle,
  examples: ExamplesArticle,
  'self-hosting': SelfHostingArticle,
  notes: NotesArticle,
};

const ORDER = DOCS_NAV.flatMap((g) => g.items.map((i) => i.id as string));

export function Docs() {
  const { slug = 'getting-started' } = useParams();
  const meta = DOCS_META[slug];
  if (!meta) return <Navigate to="/docs" replace />;

  const Component = COMPONENTS[slug];
  const next = ORDER[ORDER.indexOf(slug) + 1];

  return (
    <SiteShell title={docsTitle(slug)} description={meta.description} path={docsPath(slug)}>
      <DocsLayout current={slug}>
        <span className="n-eyebrow">Docs</span>
        <Component />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: '3em' }}>
          <Link to="/app" className="n-btn">Open the editor</Link>
          {next && <Link to={docsPath(next)} className="n-arrow">Next: {DOCS_META[next].label}</Link>}
        </div>
      </DocsLayout>
    </SiteShell>
  );
}
