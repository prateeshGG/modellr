import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { DocsLayout } from '../components/docs/DocsLayout';
import { 
  GettingStartedArticle,
  AiUsageArticle,
  ExportPrismaArticle,
  ExportDrizzleArticle,
  ExportSqlArticle,
  ExamplesArticle,
  NotesArticle
} from '../components/docs/Articles';
import './Docs.css';

export function Docs() {
  const navigate = useNavigate();
  const [activeArticle, setActiveArticle] = useState('getting-started');

  const renderArticle = () => {
    switch (activeArticle) {
      case 'getting-started':
        return <GettingStartedArticle />;
      case 'ai-usage':
        return <AiUsageArticle />;
      case 'export-prisma':
        return <ExportPrismaArticle />;
      case 'export-drizzle':
        return <ExportDrizzleArticle />;
      case 'export-sql':
        return <ExportSqlArticle />;
      case 'examples':
        return <ExamplesArticle />;
      case 'notes':
        return <NotesArticle />;
      default:
        return <GettingStartedArticle />;
    }
  };

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />

      <div style={{ flex: 1, paddingBottom: '64px' }}>
        <DocsLayout currentArticle={activeArticle} onSelect={setActiveArticle}>
          {renderArticle()}
          
          <div style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Start building</h3>
            <button 
              onClick={() => navigate('/login')}
              style={{ padding: '10px 24px', background: 'var(--text-primary)', color: 'var(--canvas-bg)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Open editor
            </button>
          </div>
        </DocsLayout>
      </div>

      <Footer />
    </div>
  );
}
