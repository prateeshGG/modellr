import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { REPO_URL } from '../../config';
import { useGithubStars } from '../../hooks/useGithubStars';
import { formatStars } from '../../lib/githubStars';
import { GitHubMark } from '../layout/GitHubMark';
import { Logo } from './Logo';
import { IconClose, IconMenu } from './icons';
import { ThemeToggle } from './ThemeToggle';

import { NAV_LINKS } from './navLinks';

export function StarPill({ stars }: { stars: number | null }) {
  const label = stars !== null ? formatStars(stars) : '';
  return (
    <a
      className="n-gh"
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ? `Star Modellr on GitHub, ${label} stars` : 'Modellr on GitHub'}
    >
      <GitHubMark size={16} />
      <span className="n-gh__label">Star</span>
      {label && <span className="n-gh__count">★ {label}</span>}
    </a>
  );
}

export function SiteNav() {
  const stars = useGithubStars();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const starLabel = stars !== null ? formatStars(stars) : '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation and when the viewport grows past the mobile breakpoint.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const onChange = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // While the full-screen menu is open: lock page scroll and let Escape close it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className={`n-nav${scrolled || open ? ' is-scrolled' : ''}`}>
      <div className="n-wrap">
        <nav className="n-nav__bar" aria-label="Main">
          <Logo />
          <ul className="n-nav__links">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className="n-nav__link">{l.label}</NavLink>
              </li>
            ))}
          </ul>
          <span className="n-nav__spacer" />
          <ThemeToggle />
          <StarPill stars={stars} />
          <Link to="/app" className="n-btn n-nav__cta">Open editor</Link>
          <button
            type="button"
            className="n-nav__toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="n-nav-sheet"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </nav>
      </div>
      <div id="n-nav-sheet" className="n-sheet" hidden={!open}>
        {[...NAV_LINKS, { label: 'About', to: '/about' }].map((l) => (
          <Link key={l.to} to={l.to} className="n-sheet__link">{l.label}</Link>
        ))}
        <div className="n-sheet__foot">
          <Link to="/app" className="n-btn n-btn--lg n-btn--block">Open editor</Link>
          <a className="n-btn n-btn--secondary n-btn--lg n-btn--block" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <GitHubMark size={16} /> Star on GitHub{starLabel ? ` · ${starLabel}` : ''}
          </a>
        </div>
      </div>
    </header>
  );
}
