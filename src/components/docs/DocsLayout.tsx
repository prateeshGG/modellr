import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconMenu } from '../site/icons';

import { DOCS_NAV } from './docsNav';
import { docsPath } from '../../lib/routeMeta';

export function DocsLayout({ current, children }: { current: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="n-wrap">
      <div className="n-docs">
        <div>
          <button
            type="button"
            className="n-btn n-btn--secondary n-btn--sm n-docs__toggle"
            aria-expanded={open}
            aria-controls="docs-nav"
            onClick={() => setOpen((o) => !o)}
            style={{ marginBottom: 12 }}
          >
            <IconMenu size={16} /> Docs menu
          </button>
          <nav id="docs-nav" className={`n-docs__nav${open ? ' is-open' : ''}`} aria-label="Documentation">
            {DOCS_NAV.map((group) => (
              <div key={group.title}>
                <h2>{group.title}</h2>
                {group.items.map((item) => (
                  <Link key={item.id} to={docsPath(item.id)} aria-current={current === item.id ? 'page' : undefined}>{item.label}</Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="n-prose">{children}</div>
      </div>
    </div>
  );
}
