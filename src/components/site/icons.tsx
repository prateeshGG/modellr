import type { ReactNode } from 'react';

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
export const IconMenu = ({ size = 20 }: { size?: number }) => <Svg size={size}><path d="M4 8h16M4 16h16" /></Svg>;
export const IconClose = ({ size = 18 }: { size?: number }) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconSun = ({ size = 16 }: { size?: number }) => <Svg size={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const IconMoon = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></Svg>;
export const IconPlus = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconGrid = ({ size = 16 }: { size?: number }) => <Svg size={size}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
export const IconTemplate = ({ size = 16 }: { size?: number }) => <Svg size={size}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></Svg>;
export const IconGear = ({ size = 16 }: { size?: number }) => <Svg size={size}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></Svg>;
export const IconBook = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M4 16a4 4 0 0 1 4-4h12" /></Svg>;
export const IconCoffee = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M7 2v3M11 2v3" /></Svg>;
