import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Star, X } from 'lucide-react';
import { REPO_URL } from '../../config';
import { useGithubStars } from '../../hooks/useGithubStars';
import { formatStars } from '../../lib/githubStars';
import { GitHubMark } from './GitHubMark';
import '../../styles/site.css';

const LINKS = [
  { label: 'Features', to: '/features' },
  { label: 'Templates', to: '/templates' },
  { label: 'Docs', to: '/docs' },
  { label: 'Blog', to: '/blog' },
];

interface PublicNavProps {
  /** Kept for backwards compatibility with existing pages; the nav now has a single design. */
  dark?: boolean;
}

export const PublicNav: React.FC<PublicNavProps> = () => {
  const stars = useGithubStars();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu when navigating.
  useEffect(() => setOpen(false), [pathname]);

  const starLabel = stars !== null ? formatStars(stars) : '';

  return (
    <header className={`site-nav${scrolled ? ' site-nav--scrolled' : ''}${open ? ' site-nav--open' : ''}`}>
      <nav className="site-nav__bar" aria-label="Main">
        <Link to="/" className="site-logo" aria-label="Modellr home">
          <span className="site-logo__mark" aria-hidden>M</span>
          <span className="site-logo__word">Modellr</span>
        </Link>

        <ul className="site-nav__links">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="site-nav__actions">
          <a
            className="gh-pill"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={starLabel ? `Modellr on GitHub, ${starLabel} stars` : 'Modellr on GitHub'}
          >
            <GitHubMark />
            <span className="gh-pill__label">GitHub</span>
            {starLabel && (
              <span className="gh-pill__stars">
                <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden />
                {starLabel}
              </span>
            )}
          </a>
          <Link to="/app" className="site-btn site-btn--accent site-nav__cta">Open editor</Link>
          <button
            className="site-nav__toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="site-nav-panel"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <div id="site-nav-panel" className="site-nav__panel" hidden={!open}>
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="site-nav__panel-link">{l.label}</Link>
        ))}
        <a className="site-nav__panel-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub{starLabel ? ` · ★ ${starLabel}` : ''}
        </a>
        <Link to="/app" className="site-btn site-btn--accent site-btn--block">Open editor</Link>
      </div>
    </header>
  );
};
