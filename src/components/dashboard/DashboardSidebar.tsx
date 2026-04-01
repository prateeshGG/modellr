import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardSidebarProps {
  onSignOut: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'My Projects', path: '/app', icon: null },
    { label: 'Community Templates', path: '/app/templates', icon: null },
    { label: 'Team Workspace', path: '#team', icon: null, disabled: true },
    { label: 'Developer API', path: '/app/settings#api', icon: null },
    { label: 'Documentation', path: '/docs', icon: null },
  ];

  const handleNav = (item: any) => {
    if (item.disabled) return;
    if (item.path.startsWith('#')) {
      const el = document.getElementById(item.path.substring(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(item.path);
    }
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-logo">
        <div className="dashboard-logo-icon">SF</div>
        SchemaForge
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`sidebar-link ${location.pathname === item.path ? 'sidebar-link--active' : ''} ${item.disabled ? 'sidebar-link--disabled' : ''}`}
            onClick={() => handleNav(item)}
            style={{ opacity: item.disabled ? 0.4 : 1, cursor: item.disabled ? 'not-allowed' : 'pointer' }}
          >
            {item.label}
            {item.disabled && <span style={{ fontSize: '9px', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>PRO</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-link" onClick={() => navigate('/app/settings')}>
          Settings
        </div>
        <div className="sidebar-link" onClick={onSignOut} style={{ color: 'var(--alert-error)' }}>
          Sign Out
        </div>
      </div>
    </aside>
  );
};
