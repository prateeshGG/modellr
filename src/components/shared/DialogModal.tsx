import React from 'react';
import { useUIStore } from '../../store/ui';

export function DialogModal() {
  const dialogConfig = useUIStore((s) => s.dialogConfig);
  const closeDialog = useUIStore((s) => s.closeDialog);

  if (!dialogConfig || !dialogConfig.isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
        onClick={closeDialog} 
      />
      <div style={{ position: 'relative', background: 'var(--surface-raised)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, marginBottom: '8px', color: 'var(--text-primary)' }}>{dialogConfig.title}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>{dialogConfig.message}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          {dialogConfig.type === 'confirm' ? (
            <>
              <button 
                onClick={closeDialog}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                  closeDialog();
                }}
                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--alert-error)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm
              </button>
            </>
          ) : (
            <button 
              onClick={closeDialog}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--surface-overlay)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
