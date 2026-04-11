import { useParams, useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { ArrowLeft } from 'lucide-react';

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />
      
      <main style={{ flex: 1, padding: '100px 20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <button 
          onClick={() => navigate('/blog')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginBottom: '48px', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Blog
        </button>
        
        <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Blog Post: {id}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1.6 }}>
            This is a placeholder page for the full CMS-backed blog post viewer. Integrate your markdown or headless CMS renderer (Contentful, Sanity, MDX, etc.) right here.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
