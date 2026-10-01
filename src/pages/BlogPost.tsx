import { Link, useParams } from 'react-router-dom';
import { SiteShell } from '../components/site/SiteShell';
import { POSTS } from './blogPosts';
import NotFound from './NotFound';

export function BlogPost() {
  const { id } = useParams();
  const post = POSTS.find((p) => p.id === id);
  if (!post) return <NotFound />;

  return (
    <SiteShell title={post.title} path={`/blog/${post.id}`} description={post.excerpt}>
      <div className="n-wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <article className="n-prose">
          <p className="n-small"><Link className="n-link" to="/blog">Blog</Link> · {post.category} · {post.date}</p>
          <h1>{post.title}</h1>
          {post.body.map((block, i) => {
            switch (block.type) {
              case 'h2': return <h2 key={i}>{block.text}</h2>;
              case 'ul': return <ul key={i}>{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>;
              case 'code':
                return (
                  <div key={i} className="n-panel">
                    <div className="n-panel__head"><span>{block.label}</span></div>
                    <pre className="n-code" tabIndex={0}>{block.text}</pre>
                  </div>
                );
              default: return <p key={i}>{block.text}</p>;
            }
          })}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: '3em' }}>
            <Link to="/app" className="n-btn">Open the editor</Link>
            <Link to="/blog" className="n-arrow">More posts</Link>
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
