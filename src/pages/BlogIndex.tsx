import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { ArrowRight, Calendar } from 'lucide-react';
import '../styles/public-dark.css';

const STATIC_POSTS = [
  {
    id: 'announcing-Modellr',
    title: 'Announcing Modellr: The AI-first database design tool',
    excerpt: 'Today we are thrilled to announce Modellr. We built it because we were tired of wrestling with legacy diagramming tools while working with modern ORMs like Prisma and Drizzle.',
    date: 'April 11, ' + new Date().getFullYear(),
    category: 'Company',
    readTime: '3 min read',
  },
  {
    id: 'why-visual-diagrams-fail',
    title: 'Why visual diagrams fail development teams',
    excerpt: 'Static diagrams are out of date the minute you write your first migration. Here is how a synchronized workflow fixes the disconnect between architecture and code.',
    date: 'April 10, ' + new Date().getFullYear(),
    category: 'Engineering',
    readTime: '5 min read',
  },
  {
    id: 'prisma-vs-drizzle-schema-design',
    title: 'Prisma vs Drizzle: A schema design perspective',
    excerpt: 'Both ORMs are taking the TypeScript world by storm. We take a deep dive into how you should approach relational database design depending on which stack you choose.',
    date: 'April 5, ' + new Date().getFullYear(),
    category: 'Database',
    readTime: '8 min read',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Company:     '#ae7aff',
  Engineering: '#00e5a0',
  Database:    '#f59e0b',
};

export function BlogIndex() {
  const navigate = useNavigate();

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Blog</div>
          <h1 className="pd-h1">The Modellr Blog</h1>
          <p className="pd-lead">
            Thoughts on data architecture, modern backend development, and building tools for developers.
          </p>
        </div>
      </div>

      {/* ── Posts ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow" style={{ maxWidth: '860px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {STATIC_POSTS.map(post => (
              <article
                key={post.id}
                className="pd-blog-card"
                onClick={() => navigate(`/blog/${post.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/blog/${post.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', fontWeight: 700, color: CATEGORY_COLORS[post.category] ?? 'var(--pd-brand)', letterSpacing: '0.08em' }}>
                    {post.category}
                  </span>
                  <span style={{ color: 'var(--pd-border-hi)' }}>·</span>
                  <span style={{ color: 'var(--pd-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontFamily: 'var(--pd-mono)' }}>
                    <Calendar size={12} /> {post.date}
                  </span>
                  <span style={{ color: 'var(--pd-border-hi)' }}>·</span>
                  <span style={{ color: 'var(--pd-muted)', fontSize: '12px', fontFamily: 'var(--pd-mono)' }}>{post.readTime}</span>
                </div>

                <h2 style={{ fontFamily: 'var(--pd-display)', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 800, color: 'var(--pd-text)', margin: '0 0 12px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {post.title}
                </h2>

                <p className="pd-body-text" style={{ margin: '0 0 20px 0' }}>{post.excerpt}</p>

                <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-brand)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Read article <ArrowRight size={14} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
