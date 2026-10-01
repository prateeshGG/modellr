import React from 'react';
import { DONATE_URL } from '../../config';

interface SupportLinkProps {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

/** "Buy me a coffee" link. Renders nothing until a donation page is configured in src/config.ts. */
export const SupportLink: React.FC<SupportLinkProps> = ({ style, className, children }) => {
  if (!DONATE_URL) return null;
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ textDecoration: 'none', ...style }}
    >
      {children ?? '☕ Buy me a coffee'}
    </a>
  );
};
