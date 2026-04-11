import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { ArrowRight, Calendar } from 'lucide-react';

const STATIC_POSTS = [
  {
    id: 'announcing-Modellr',
    title: 'Announcing Modellr: The AI-first database design tool',
    excerpt: 'Today we are thrilled to announce Modellr. We built it because we were tired of wrestling with legacy diagramming tools while working with modern ORMs like Prisma and Drizzle.',
    date: 'April 11, ' + new Date().getFullYear(),
    category: 'Company',
    readTime: '3 min read'
  },
  {
    id: 'why-visual-diagrams-fail',
    title: 'Why visual diagrams fail development teams',
    excerpt: 'Static diagrams are out of date the minute you write your first migration. Here is how a synchronized workflow fixes the disconnect between architecture and code.',
    date: 'April 10, ' + new Date().getFullYear(),
    category: 'Engineering',
    readTime: '5 min read'
  },
  {
    id: 'prisma-vs-drizzle-schema-design',
    title: 'Prisma vs Drizzle: A schema design perspective',
    excerpt: 'Both ORMs are taking the TypeScript world by storm. We take a deep dive into how you should approach relational database design depending on which stack you choose.',
    date: 'April 5, ' + new Date().getFullYear(),
    category: 'Database',
    readTime: '8 min read'
  }
];

export function BlogIndex() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />

      <main style={{ flex: 1, padding: '100px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: 'min(4rem, 10vw)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '24px' }}>
            The Modellr Blog
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Thoughts on data architecture, modern backend development, and building tools for developers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          {STATIC_POSTS.map((post) => (
            <article
              key={post.id}
              onClick={() => navigate(`/blog/${post.id}`)}
              style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '40px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {post.category}
                </span>
                <span style={{ color: 'var(--border-hi)' }}>•</span>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> {post.date}
                </span>
                <span style={{ color: 'var(--border-hi)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>{post.readTime}</span>
              </div>

              <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {post.title}
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px 0', flex: 1 }}>
                {post.excerpt}
              </p>

              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Read article <ArrowRight size={16} />
              </div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
