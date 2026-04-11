import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardSidebarProps {
  onSignOut: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'My Projects', path: '/app', icon: '☐' },
    { label: 'Community Templates', path: '/app/templates', icon: '◈' },
    { label: 'Team Workspace', path: '#team', icon: '👥', disabled: true },
    { label: 'Developer API', path: '/app/settings#api', icon: '⚙' },
    { label: 'Documentation', path: '/docs', icon: '📖' },
  ];

  // Fix #72: strip hash from item path before comparing to location.pathname
  const isActive = (itemPath: string) => {
    const pathOnly = itemPath.split('#')[0];
    // /app should only be active when exactly at /app, not /app/settings etc.
    if (pathOnly === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(pathOnly);
  };

  const handleNav = (item: any) => {
    if (item.disabled) return;
    if (item.path.startsWith('#')) {
      const el = document.getElementById(item.path.substring(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      const [path, hash] = item.path.split('#');
      navigate(path);
      // scroll to hash after navigation
      if (hash) {
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  };

  return (
    <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
      <div className="dashboard-logo">
        <div className="dashboard-logo-icon">SF</div>
        Modellr
      </div>

      <nav className="sidebar-nav" role="navigation">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`sidebar-link ${isActive(item.path) ? 'sidebar-link--active' : ''} ${item.disabled ? 'sidebar-link--disabled' : ''}`}
            onClick={() => handleNav(item)}
            role="button"
            tabIndex={item.disabled ? -1 : 0}
            onKeyDown={(e) => e.key === 'Enter' && handleNav(item)}
            aria-disabled={item.disabled}
            style={{ opacity: item.disabled ? 0.4 : 1, cursor: item.disabled ? 'not-allowed' : 'pointer' }}
          >
            {item.label}
            {item.disabled && <span style={{ fontSize: '9px', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>PRO</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-link" onClick={() => navigate('/app/settings')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/app/settings')}>
          Settings
        </div>
        <div className="sidebar-link" onClick={onSignOut} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSignOut()} style={{ color: 'var(--alert-error)' }}>
          Sign Out
        </div>
      </div>
    </aside>
  );
};
