import { useParams, useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { ArrowLeft } from 'lucide-react';
import '../styles/public-dark.css';

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="pd-root">
      <PublicNav dark />

      <main style={{ flex: 1, padding: '120px 5% 80px', maxWidth: '760px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <button
          onClick={() => navigate('/blog')}
          style={{ background: 'transparent', border: 'none', color: 'var(--pd-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--pd-mono)', fontSize: '13px', marginBottom: '48px', padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--pd-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--pd-muted)')}
        >
          <ArrowLeft size={14} /> Back to Blog
        </button>

        <div className="pd-card" style={{ textAlign: 'center', padding: '64px 40px' }}>
          <div className="pd-label" style={{ justifyContent: 'center', display: 'flex' }}>// {id}</div>
          <h1 style={{ fontFamily: 'var(--pd-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--pd-text)', margin: '0 0 16px 0' }}>
            Blog Post: {id}
          </h1>
          <p className="pd-body-text" style={{ maxWidth: '480px', margin: '0 auto' }}>
            This is a placeholder page for the full CMS-backed blog post viewer. Integrate your markdown or headless CMS renderer (Contentful, Sanity, MDX, etc.) right here.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
