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
    <div style={{ background: '#050507', minHeight: '100vh', color: '#e8e8f0', display: 'flex', flexDirection: 'column' }}>
      <PublicNav dark />

      <div style={{ flex: 1, paddingBottom: '64px' }}>
        <DocsLayout currentArticle={activeArticle} onSelect={setActiveArticle}>
          {renderArticle()}
          
          <div style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: "'Syne','Geist',sans-serif", fontSize: '20px', fontWeight: 700, margin: 0, color: '#e8e8f0' }}>Start building</h3>
            <button 
              onClick={() => navigate('/login')}
              style={{ padding: '10px 24px', background: '#ae7aff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Geist Mono',monospace", fontSize: '13px', boxShadow: '0 0 16px rgba(174,122,255,0.2)' }}
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
