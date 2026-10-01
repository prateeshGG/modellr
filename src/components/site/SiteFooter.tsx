import { Link } from 'react-router-dom';
import { REPO_URL } from '../../config';
import { SupportLink } from '../shared/SupportLink';
import { GitHubMark } from '../layout/GitHubMark';
import { Logo } from './Logo';

const COLUMNS = [
  { heading: 'Product', links: [['Features', '/features'], ['Templates', '/templates'], ['Docs', '/docs'], ['Open editor', '/app']] },
  { heading: 'Examples', links: [['SaaS schema', '/use-cases/saas-database-schema'], ['E-commerce schema', '/use-cases/ecommerce-schema'], ['Auth schema', '/use-cases/auth-schema']] },
  { heading: 'Project', links: [['About', '/about'], ['Blog', '/blog'], ['Contact', '/contact']] },
  { heading: 'Legal', links: [['Privacy', '/privacy'], ['Terms', '/terms']] },
] as const;

export function SiteFooter() {
  return (
    <footer className="n-footer">
      <div className="n-wrap">
        <div className="n-footer__grid">
          <div>
            <Logo />
            <p>A free, open-source, local-first database schema designer. Runs in your browser; no account needed.</p>
            <a className="n-btn n-btn--secondary n-btn--sm" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <GitHubMark size={15} /> GitHub
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4>{col.heading}</h4>
              <ul>
                {col.links.map(([label, to]) => (
                  <li key={to}><Link to={to}>{label}</Link></li>
                ))}
                {col.heading === 'Project' && (
                  <li><a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">MIT license</a></li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="n-footer__base">
          <span>MIT licensed. Your schemas stay in your browser.</span>
          <SupportLink>Buy me a coffee</SupportLink>
        </div>
      </div>
    </footer>
  );
}
