import { useParams, useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { ArrowLeft } from 'lucide-react';
import { POSTS } from './blogPosts';
import '../styles/public-dark.css';

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = POSTS.find(p => p.id === id);

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

        {post ? (
          <article className="pd-legal" style={{ padding: 0 }}>
            <h1>{post.title}</h1>
            <span className="pd-date">{post.category} · {post.date}</span>
            {post.body.map((block, i) => {
              switch (block.type) {
                case 'h2':
                  return <h2 key={i} style={{ marginTop: '32px' }}>{block.text}</h2>;
                case 'ul':
                  return (
                    <ul key={i} style={{ color: 'var(--pd-muted)', margin: '0 0 12px 0', paddingLeft: '20px' }}>
                      {block.items.map((item, j) => <li key={j} style={{ marginBottom: '8px' }}>{item}</li>)}
                    </ul>
                  );
                case 'code':
                  return (
                    <div key={i} className="pd-code-block" style={{ margin: '16px 0', overflowX: 'auto' }}>
                      <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', color: 'var(--pd-muted)', marginBottom: '8px' }}>// {block.label}</div>
                      <pre style={{ margin: 0, fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-text)', lineHeight: 1.6 }}>{block.text}</pre>
                    </div>
                  );
                default:
                  return <p key={i}>{block.text}</p>;
              }
            })}
          </article>
        ) : (
          <div className="pd-card" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <h1 style={{ fontFamily: 'var(--pd-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--pd-text)', margin: '0 0 16px 0' }}>
              Post not found
            </h1>
            <p className="pd-body-text" style={{ maxWidth: '480px', margin: '0 auto' }}>
              There is no post called "{id}". Go back to the blog to see what is available.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
