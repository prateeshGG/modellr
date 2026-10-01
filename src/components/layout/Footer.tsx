import { Link } from 'react-router-dom';
import { REPO_URL } from '../../config';
import { SupportLink } from '../shared/SupportLink';
import '../../styles/site.css';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Templates', to: '/templates' },
      { label: 'Docs', to: '/docs' },
      { label: 'Open editor', to: '/app' },
    ],
  },
  {
    heading: 'Examples',
    links: [
      { label: 'SaaS schema', to: '/use-cases/saas-database-schema' },
      { label: 'E-commerce schema', to: '/use-cases/ecommerce-schema' },
      { label: 'Auth schema', to: '/use-cases/auth-schema' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

export const Footer: React.FC = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__brand">
        <Link to="/" className="site-logo" aria-label="Modellr home">
          <span className="site-logo__mark" aria-hidden>M</span>
          <span className="site-logo__word">Modellr</span>
        </Link>
        <p>A free, open-source, local-first database schema designer. Runs in your browser; no account needed.</p>
        <a className="site-btn site-btn--outline" href={REPO_URL} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>

      <nav className="site-footer__cols" aria-label="Footer">
        {COLUMNS.map((col) => (
          <div key={col.heading} className="site-footer__col">
            <h3>{col.heading}</h3>
            {col.links.map((l) => (
              <Link key={l.to} to={l.to}>{l.label}</Link>
            ))}
          </div>
        ))}
      </nav>
    </div>

    <div className="site-footer__bottom">
      <span>MIT licensed. Your schemas stay in your browser.</span>
      <SupportLink className="site-footer__support" />
    </div>
  </footer>
);
