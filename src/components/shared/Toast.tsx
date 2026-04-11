import React from 'react';
import { useUIStore } from '../../store/ui';
import './Toast.css';

export const Toast: React.FC = () => {
  const { toastMessage, toastType } = useUIStore();

  if (!toastMessage) return null;

  // Fix #36: errors use assertive so screen readers announce them immediately
  const ariaLive = toastType === 'error' ? 'assertive' : 'polite';

  return (
    <div className={`toast toast--${toastType}`} role="status" aria-live={ariaLive} aria-atomic="true">
      <span className="toast__icon">
        {toastType === 'success' ? '✓' : toastType === 'error' ? '✕' : 'ℹ'}
      </span>
      {toastMessage}
    </div>
  );
};
