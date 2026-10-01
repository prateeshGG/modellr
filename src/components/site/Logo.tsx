import { Link } from 'react-router-dom';

/** Two linked tables: the Modellr mark. The link is drawn in the accent colour. */
export function LogoMark({ className = 'n-logo__mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="9" height="9" rx="2.6" fill="currentColor" />
      <rect x="13.5" y="13.5" width="9" height="9" rx="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 6H14a3 3 0 0 1 3 3v4.5" stroke="var(--n-accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="n-logo" aria-label="Modellr home">
      <LogoMark />
      modellr
    </Link>
  );
}
