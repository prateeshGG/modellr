/**
 * useShareLink — encodes the current schema into a URL hash
 * and decodes it on mount.
 *
 * Format: /#/schema/<base64url(gzipped JSON)>
 * Falls back to plain base64 for broad compatibility.
 */
import { useEffect, useCallback } from 'react';
import LZString from 'lz-string';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';

const PREFIX = '#/schema/';

function encode(data: unknown): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

function decode(b64: string): unknown {
  const json = LZString.decompressFromEncodedURIComponent(b64);
  return json ? JSON.parse(json) : null;
}

/** Copy the current schema as a shareable URL to the clipboard. */
export function useShareLink() {
  const { tables, relationships, notes, groups, projectName, importTables, setProjectName } = useSchemaStore();
  const { showToast } = useUIStore() as any;

  // ── Decode from hash on first load ───────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith(PREFIX)) return;

    try {
      const b64 = hash.slice(PREFIX.length);
      const data = decode(b64) as {
        tables: typeof tables;
        relationships: typeof relationships;
        notes?: typeof notes;
        groups?: typeof groups;
        projectName?: string;
      };

      if (data && Array.isArray(data.tables)) {
        importTables(data.tables, data.relationships ?? [], data.notes, data.groups);
        if (data.projectName) setProjectName(data.projectName);
        // Clear hash after loading so undo/redo doesn't re-import
        history.replaceState(null, '', window.location.pathname + window.location.search);
        (showToast as any)?.('Schema loaded from stateless share link', 'success');
        
        // Force read-only mode for hash links
        useUIStore.getState().setReadOnly(true);
      }
    } catch {
      // Malformed hash — just ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate and copy share URL ──────────────────
  const copyShareLink = useCallback(async () => {
    try {
      const payload = { tables, relationships, notes, groups, projectName };
      const b64 = encode(payload);
      // Always point to /app/shared so we don't accidentally embed the current collaborative room ID
      const url = `${window.location.origin}/app/shared${PREFIX}${b64}`;
      await navigator.clipboard.writeText(url);
      (showToast as any)?.('Stateless Share link copied to clipboard!', 'success');
    } catch {
      (showToast as any)?.('Failed to copy share link', 'error');
    }
  }, [tables, relationships, notes, groups, projectName, showToast]);

  return { copyShareLink };
}
