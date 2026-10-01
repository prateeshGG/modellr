import { Link } from 'react-router-dom';
import { SiteShell, PageHead } from '../components/site/SiteShell';
import { POSTS } from './blogPosts';

export function BlogIndex() {
  return (
    <SiteShell title="Blog" path="/blog" description="Short, practical notes on database schema design, migrations, ORMs and keeping diagrams honest.">
      <PageHead eyebrow="Blog" title="Notes on schema design." lead="Short notes on schema design and working with databases." />
      <section className="n-section n-section--tight" style={{ paddingTop: 8 }}>
        <div className="n-wrap">
          <div className="n-grid-2">
            {POSTS.map((p, i) => (
              <Link key={p.id} to={`/blog/${p.id}`} className="n-card">
                <span className="n-card__meta">{String(i + 1).padStart(2, '0')} · {p.category} · {p.date}</span>
                <h2 className="n-h3">{p.title}</h2>
                <p className="n-small">{p.excerpt}</p>
                <span className="n-arrow">Read</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
