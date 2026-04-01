import { useState } from 'react';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { DocsLayout } from '../components/docs/DocsLayout';
import { 
  IntroArticle, 
  NormalizationArticle,
  CanvasArticle, 
  RelationshipsArticle,
  MCPArticle, 
  ExportArticle 
} from '../components/docs/Articles';
import './Docs.css';

export function Docs() {
  const [activeArticle, setActiveArticle] = useState('intro');

  const renderArticle = () => {
    switch (activeArticle) {
      case 'intro':
        return <IntroArticle />;
      case 'normalization':
        return <NormalizationArticle />;
      case 'canvas':
        return <CanvasArticle />;
      case 'relationships':
        return <RelationshipsArticle />;
      case 'mcp':
        return <MCPArticle />;
      case 'export':
        return <ExportArticle />;
      default:
        return <IntroArticle />;
    }
  };

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />

      <div style={{ flex: 1, height: 'calc(100vh - 100px)' }}>
        <DocsLayout currentArticle={activeArticle} onSelect={setActiveArticle}>
          {renderArticle()}
        </DocsLayout>
      </div>

      <Footer />
    </div>
  );
}
