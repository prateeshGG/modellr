import { useUIStore } from '../../store/ui';
import { IconMoon, IconSun } from './icons';

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="n-themebtn" onClick={toggleTheme} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
