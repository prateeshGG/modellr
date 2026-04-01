/**
 * useShareLink — encodes the current schema into a URL hash
 * and decodes it on mount.
 *
 * Format: /#/schema/<base64url(gzipped JSON)>
 * Falls back to plain base64 for broad compatibility.
 */
import { useEffect, useCallback } from 'react';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';

const PREFIX = '#/schema/';

function encode(data: unknown): string {
  const json = JSON.stringify(data);
  // btoa needs ASCII — use encodeURIComponent to handle Unicode
  return btoa(unescape(encodeURIComponent(json)));
}

function decode(b64: string): unknown {
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

/** Copy the current schema as a shareable URL to the clipboard. */
export function useShareLink() {
  const { tables, relationships, projectName, importTables, setProjectName } = useSchemaStore();
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
        projectName?: string;
      };

      if (Array.isArray(data.tables)) {
        importTables(data.tables, data.relationships ?? []);
        if (data.projectName) setProjectName(data.projectName);
        // Clear hash after loading so undo/redo doesn't re-import
        history.replaceState(null, '', window.location.pathname + window.location.search);
        (showToast as any)?.('Schema loaded from share link', 'success');
      }
    } catch {
      // Malformed hash — just ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate and copy share URL ──────────────────
  const copyShareLink = useCallback(async () => {
    try {
      const payload = { tables, relationships, projectName };
      const b64 = encode(payload);
      const url = `${window.location.origin}${window.location.pathname}${PREFIX}${b64}`;
      await navigator.clipboard.writeText(url);
      (showToast as any)?.('Share link copied to clipboard!', 'success');
    } catch {
      (showToast as any)?.('Failed to copy share link', 'error');
    }
  }, [tables, relationships, projectName, showToast]);

  return { copyShareLink };
}
