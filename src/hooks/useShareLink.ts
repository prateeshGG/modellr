/**
 * useShareLink — stateless sharing. The whole schema is compressed into the URL hash, so
 * sharing needs no server and no account.
 *
 * Format: <origin>/app/shared#/schema/<lz-string compressToEncodedURIComponent(JSON)>
 */
import { useEffect, useCallback } from 'react';
import LZString from 'lz-string';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { sanitizeCanvasState } from '../lib/sanitizeSchema';
import type { CanvasState } from '../lib/projectStore';

export const SHARE_PREFIX = '#/schema/';
/** Above this many characters a link is likely to be truncated by chat apps and some browsers. */
export const SHARE_LINK_WARN_LENGTH = 8000;

export interface SharedPayload extends CanvasState {
  projectName?: string;
}

export function encodeShare(data: unknown): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

/** Decode and validate a share-link hash (including the '#/schema/' prefix). Returns null if invalid. */
export function decodeShareHash(hash: string): SharedPayload | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash.slice(SHARE_PREFIX.length));
    if (!json) return null;
    const raw = JSON.parse(json);
    const state = sanitizeCanvasState(raw);
    if (!state) return null;
    const name = typeof raw?.projectName === 'string' ? raw.projectName.slice(0, 200) : undefined;
    return { ...state, projectName: name };
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: SharedPayload, path = '/app/shared'): string {
  return `${window.location.origin}${path}${SHARE_PREFIX}${encodeShare(payload)}`;
}

/**
 * @param decodeOnMount when true, load a schema from the current URL hash into the editor
 *   (read-only). Only the shared-view route should enable this.
 */
export function useShareLink(decodeOnMount = false) {
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (!decodeOnMount) return;
    const data = decodeShareHash(window.location.hash);
    if (!data) {
      if (window.location.hash.startsWith(SHARE_PREFIX)) showToast('This share link is damaged or incomplete.', 'error');
      return;
    }
    const store = useSchemaStore.getState();
    store.importTables(data.tables, data.relationships, data.notes, data.groups);
    if (data.projectName) store.setProjectName(data.projectName);
    useSchemaStore.temporal.getState().clear();
    useUIStore.getState().setReadOnly(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodeOnMount]);

  const copyShareLink = useCallback(async () => {
    const { tables, relationships, notes, groups, projectName } = useSchemaStore.getState();
    try {
      const url = buildShareUrl({ tables, relationships, notes, groups, projectName });
      await navigator.clipboard.writeText(url);
      if (url.length > SHARE_LINK_WARN_LENGTH) {
        showToast('Link copied, but it is very long. Some apps may cut it off. For big schemas, export JSON instead.', 'error');
      } else {
        showToast('Share link copied. Anyone with it sees a read-only snapshot.', 'success');
      }
    } catch {
      showToast('Could not copy the share link.', 'error');
    }
  }, [showToast]);

  return { copyShareLink };
}
