import React from 'react';
import { useUIStore } from '../../store/ui';
import './Toast.css';

export const Toast: React.FC = () => {
  const { toastMessage, toastType } = useUIStore();

  if (!toastMessage) return null;

  return (
    <div className={`toast toast--${toastType}`} role="status" aria-live="polite">
      <span className="toast__icon">
        {toastType === 'success' ? '✓' : toastType === 'error' ? '✕' : 'ℹ'}
      </span>
      {toastMessage}
    </div>
  );
};
