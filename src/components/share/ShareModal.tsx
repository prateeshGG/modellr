import React, { useMemo, useState } from 'react';
import { useUIStore } from '../../store/ui';
import { useSchemaStore } from '../../store/schema';
import { buildShareUrl, SHARE_LINK_WARN_LENGTH } from '../../hooks/useShareLink';
import './ShareModal.css';

interface ShareModalProps {
  onClose: () => void;
}

/**
 * Sharing is stateless: the schema is compressed into the link itself, so nothing is uploaded
 * anywhere. Recipients get a read-only snapshot as of the moment the link was created.
 */
export const ShareModal: React.FC<ShareModalProps> = ({ onClose }) => {
  const showToast = useUIStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<'link' | 'embed'>('link');

  const linkInfo = useMemo(() => {
    const { tables, relationships, notes, groups, projectName } = useSchemaStore.getState();
    const payload = { tables, relationships, notes, groups, projectName };
    return {
      link: buildShareUrl(payload),
      embedSrc: buildShareUrl(payload, '/embed'),
    };
  }, []);

  const tooLong = linkInfo.link.length > SHARE_LINK_WARN_LENGTH;
  const embedCode = `<iframe src="${linkInfo.embedSrc}" width="100%" height="600" style="border:1px solid #333; border-radius:12px; overflow:hidden;" loading="lazy"></iframe>`;

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message, 'success');
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal__header">
          <h2>Share schema</h2>
          <button className="share-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="share-modal__tabs">
          <button className={`share-modal__tab ${activeTab === 'link' ? 'active' : ''}`} onClick={() => setActiveTab('link')}>Link</button>
          <button className={`share-modal__tab ${activeTab === 'embed' ? 'active' : ''}`} onClick={() => setActiveTab('embed')}>Embed</button>
        </div>

        <div className="share-modal__body">
          <p className="share-modal__desc">
            The schema is stored inside the link itself. Nothing is uploaded, and the recipient gets a read-only snapshot
            of the schema as it is right now. Later changes are not synced.
          </p>

          {tooLong && (
            <p className="share-modal__desc" style={{ color: 'var(--alert-warning)' }}>
              This schema produces a very long link ({Math.round(linkInfo.link.length / 1000)}k characters). Some chat apps
              and browsers may cut it off. For large schemas, share an exported file instead.
            </p>
          )}

          {activeTab === 'link' && (
            <div className="share-modal__copy-group">
              <input readOnly value={linkInfo.link} className="share-modal__input" onClick={(e) => e.currentTarget.select()} />
              <button className="share-modal__copy-btn" onClick={() => { copy(linkInfo.link, 'Share link copied'); onClose(); }}>Copy link</button>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="share-modal__embed-area">
              <p className="share-modal__embed-label">Embed code (iframe)</p>
              <textarea readOnly value={embedCode} className="share-modal__textarea" rows={5} onClick={(e) => e.currentTarget.select()} />
              <button className="share-modal__btn-primary" onClick={() => copy(embedCode, 'Embed code copied')}>Copy iframe code</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
