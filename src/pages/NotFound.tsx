import { Link } from 'react-router-dom';
import { SiteShell } from '../components/site/SiteShell';

/** Catch-all route. Also rendered for unknown blog slugs. */
export default function NotFound() {
  return (
    <SiteShell title="Page not found" noindex>
      <section className="n-hero" style={{ paddingBottom: 0 }}>
        <div className="n-dots" aria-hidden="true" />
        <div className="n-wrap">
          <div className="n-404">
            <div className="n-404__code" aria-hidden="true">4<span>0</span>4</div>
            <h1 className="n-h2">This table doesn't exist.</h1>
            <p className="n-lead">The page you asked for isn't here. Maybe the link is old, or the address has a typo.</p>
            <div className="n-actions">
              <Link to="/" className="n-btn">Go home</Link>
              <Link to="/app" className="n-btn n-btn--secondary">Open the editor</Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
