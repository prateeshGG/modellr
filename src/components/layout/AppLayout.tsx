import { NavLink, Outlet } from 'react-router-dom';
import { SupportLink } from '../shared/SupportLink';
import { GitHubMark } from './GitHubMark';
import { REPO_URL } from '../../config';
import { Logo } from '../site/Logo';
import { IconBook, IconCoffee, IconGear, IconGrid, IconTemplate } from '../site/icons';
import { ThemeToggle } from '../site/ThemeToggle';

const ITEMS = [
  { label: 'Projects', to: '/app', end: true, icon: <IconGrid /> },
  { label: 'Templates', to: '/app/templates', end: false, icon: <IconTemplate /> },
  { label: 'Settings', to: '/app/settings', end: false, icon: <IconGear /> },
  { label: 'Docs', to: '/docs', end: false, icon: <IconBook /> },
];

export function AppSidebar() {
  return (
    <aside className="n-rail">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Logo />
        <ThemeToggle />
      </div>
      <nav className="n-rail__nav" aria-label="App">
        {ITEMS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end}>{i.icon}{i.label}</NavLink>
        ))}
      </nav>
      <div className="n-rail__foot">
        <SupportLink><IconCoffee />Support</SupportLink>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer"><GitHubMark size={16} />GitHub</a>
      </div>
    </aside>
  );
}

function Tabbar() {
  return (
    <nav className="n-tabbar" aria-label="App">
      {ITEMS.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>{i.icon}{i.label}</NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  return (
    <div className="n-root">
      <a className="n-skip" href="#main">Skip to content</a>
      <div className="n-app">
        <AppSidebar />
        <main id="main" className="n-main"><Outlet /></main>
      </div>
      <Tabbar />
    </div>
  );
}
