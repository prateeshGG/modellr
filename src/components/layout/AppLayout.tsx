import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './AppLayout.css';

export const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, session } = useAuthStore();

  const navItems = [
    { label: 'My Projects', path: '/app', icon: null },
    { label: 'Community Templates', path: '/app/templates', icon: null },
    { label: 'Documentation', path: '/docs', icon: null },
  ];

  const handleNav = (item: any) => {
    navigate(item.path);
  };

  return (
    <aside className="app-sidebar">
      <div className="app-logo" onClick={() => navigate('/')}>
        <div className="app-logo-icon">SF</div>
        Modellr
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/app' && item.path !== '/');
          const isExactApp = location.pathname === '/app' && item.path === '/app';
          const active = isActive || isExactApp;

          return (
            <div
              key={item.label}
              className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`}
              onClick={() => handleNav(item)}
            >
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div
          className={`sidebar-link ${location.pathname.includes('/app/settings') ? 'sidebar-link--active' : ''}`}
          onClick={() => navigate('/app/settings')}
        >
          Settings
        </div>
        {session && (
          <div className="sidebar-link" onClick={signOut} style={{ color: 'var(--alert-error)' }}>
            Sign Out
          </div>
        )}
      </div>
    </aside>
  );
};

export const AppLayout = () => {
  return (
    <div className="app-layout-container">
      <AppSidebar />
      <div className="app-layout-content">
        <Outlet />
      </div>
    </div>
  );
};
