import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUIStore } from '../../store/ui';
import { useShareLink } from '../../hooks/useShareLink';
import { useSchemaStore } from '../../store/schema';
import { useYjsStore } from '../../store/yjsStore';
import { supabase } from '../../lib/supabase';
import './ShareModal.css';

interface ShareModalProps {
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose }) => {
  const { id } = useParams();
  const { copyShareLink } = useShareLink();
  const { showToast } = useUIStore();
  const { allowGuestEdits, setAllowGuestEdits } = useSchemaStore();
  const { connected } = useYjsStore();
  
  const [activeTab, setActiveTab] = useState<'collab' | 'stateless' | 'embed'>('collab');
  const [isPublic, setIsPublic] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial public state
  useEffect(() => {
    async function fetchState() {
      if (!id) return;
      const [schemaRes, authRes] = await Promise.all([
        supabase.from('schemas').select('is_public, owner_id').eq('id', id).single(),
        supabase.auth.getSession()
      ]);
      
      const { data } = schemaRes;
      const sessionUser = authRes.data.session?.user;

      if (data) {
        setIsPublic(Boolean(data.is_public));
        setIsHost(sessionUser?.id === data.owner_id);
      }
      setLoading(false);
    }
    fetchState();
  }, [id]);

  const togglePublic = async () => {
    if (!id) return;
    const nextState = !isPublic;
    setIsPublic(nextState);
    
    const { error } = await supabase
      .from('schemas')
      .update({ is_public: nextState })
      .eq('id', id);

    if (error) {
      setIsPublic(!nextState);
      showToast('Failed to update privacy setting', 'error');
    } else {
      showToast(nextState ? 'Schema is now public' : 'Schema is now private', 'success');
    }
  };

  const embedCode = `<iframe src="${window.location.origin}/embed/${id}" width="100%" height="600" style="border:1px solid #333; border-radius:12px; overflow:hidden;" allow="clipboard-write"></iframe>`;

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    showToast('Embed code copied!');
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal__header">
          <h2>Share Schema</h2>
          <button className="share-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="share-modal__tabs">
          <button 
            className={`share-modal__tab ${activeTab === 'collab' ? 'active' : ''}`}
            onClick={() => setActiveTab('collab')}
          >
            Real-time Collab
          </button>
          <button 
            className={`share-modal__tab ${activeTab === 'stateless' ? 'active' : ''}`}
            onClick={() => setActiveTab('stateless')}
          >
            Stateless Link
          </button>
          <button 
            className={`share-modal__tab ${activeTab === 'embed' ? 'active' : ''}`}
            onClick={() => setActiveTab('embed')}
          >
            Publish & Embed
          </button>
        </div>

        <div className="share-modal__body">
          {activeTab === 'collab' && (
            <div className="share-modal__section">
              <p className="share-modal__desc">Share this link to instantly collaborate locally across tabs or live over the network.</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>NETWORK STATUS</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: connected ? '#10b981' : 'var(--text-muted)' }}>
                  {connected ? '● Live Syncing' : '○ Offline'}
                </span>
              </div>

              <div className="share-modal__copy-group">
                <input readOnly value={window.location.href} className="share-modal__input" />
                <button className="share-modal__copy-btn" onClick={() => { 
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Collaborative link copied!', 'success');
                  onClose(); 
                }}>Copy Link</button>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-bg)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>My Access Role</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isHost ? '#10b981' : 'var(--text-muted)', background: 'var(--surface-raised)', padding: '4px 8px', borderRadius: '4px' }}>
                    {isHost ? 'Host' : 'Guest'}
                  </span>
                </div>

                {isHost && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Allow Guest Editors</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>If disabled, guests will be locked to View-Only mode.</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={allowGuestEdits} onChange={(e) => setAllowGuestEdits(e.target.checked)} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stateless' && (
            <div className="share-modal__section">
              <p className="share-modal__desc">
                Generate a massive URL that contains your entire schema encoded inside the link itself. 
                Perfect for sharing on Reddit, Twitter, or Discord without saving to a database.
              </p>
              
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-bg)', borderRadius: '8px', border: '1px solid var(--alert-warning)', borderLeft: '4px solid var(--alert-warning)' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Serverless Sharing</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Anyone opening this link will see a read-only snapshot of your schema exactly as it is right now. 
                  Future changes you make will <b>not</b> be synced to the stateless link.
                </span>
                
                <button 
                  className="share-modal__btn-primary" 
                  style={{ marginTop: '16px', background: 'var(--alert-warning)', color: '#000' }}
                  onClick={() => { copyShareLink(); onClose(); }}
                >
                  Generate & Copy Stateless Link
                </button>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="share-modal__section">
              <p className="share-modal__desc">Make this schema public to embed a read-only interactive canvas on your website or blog.</p>
              
              <div className="share-modal__toggle-row">
                <span className="share-modal__toggle-label">
                  Public Access
                  <span className="share-modal__toggle-status" style={{ color: isPublic ? 'var(--alert-success)' : 'var(--text-muted)' }}>
                    {isPublic ? 'Enabled' : 'Disabled'}
                  </span>
                </span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isPublic} onChange={togglePublic} disabled={loading} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {isPublic && (
                <div className="share-modal__embed-area">
                  <p className="share-modal__embed-label">Embed Code (iframe)</p>
                  <textarea readOnly value={embedCode} className="share-modal__textarea" rows={4} onClick={e => e.currentTarget.select()} />
                  <button className="share-modal__btn-primary" onClick={copyEmbed}>Copy iframe code</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
