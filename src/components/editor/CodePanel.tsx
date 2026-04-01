import React, { useCallback, useMemo, useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { useSchemaStore } from '../../store/schema';
import { exportSQL } from '../../utils/exporters/sql';
import { exportDBML } from '../../utils/exporters/dbml';
import { exportPrisma } from '../../utils/exporters/prisma';
import { exportDrizzle } from '../../utils/exporters/drizzle';
import './CodePanel.css';

type CodeFormat = 'sql' | 'dbml' | 'prisma' | 'drizzle' | 'json';

export const CodePanel: React.FC = () => {
  const { tables, relationships, dialect } = useSchemaStore();
  const [format, setFormat] = useState<CodeFormat>('sql');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    switch (format) {
      case 'sql':
        return exportSQL(tables, relationships, dialect);
      case 'dbml':
        return exportDBML(tables, relationships);
      case 'prisma':
        return exportPrisma(tables, relationships);
      case 'drizzle':
        return exportDrizzle(tables, relationships);
      case 'json':
        return JSON.stringify({ tables, relationships }, null, 2);
      default:
        return '';
    }
  }, [tables, relationships, dialect, format]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied
    }
  }, [code]);

  const lineCount = code.split('\n').length;

  return (
    <div className="code-panel" role="region" aria-label="Code output panel">
      {/* Toolbar */}
      <div className="code-panel__toolbar">
        <div className="code-panel__format-tabs" role="tablist" aria-label="Code format">
          {(['sql', 'dbml', 'prisma', 'drizzle'] as CodeFormat[]).map((f) => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'format-tab--active' : ''}`}
              onClick={() => setFormat(f)}
              role="tab"
              aria-selected={format === f}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="code-panel__toolbar-right">
          <span className="code-panel__line-count">{lineCount} lines</span>
          <button
            className={`code-panel__copy-btn ${copied ? 'code-panel__copy-btn--copied' : ''}`}
            onClick={handleCopy}
            title="Copy to clipboard (⌘C)"
            aria-label="Copy code"
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="code-panel__editor">
        <CodeEditor value={code} readOnly={true} />
      </div>

      {/* Footer with dialect info */}
      <div className="code-panel__footer">
        <span className="code-panel__dialect-badge">{dialect}</span>
        <span className="code-panel__footer-hint">Read-only — edit via canvas</span>

        {/* AI assist button */}
        <button 
          className="code-panel__ai-btn" 
          onClick={() => window.dispatchEvent(new CustomEvent('sf:open-ai-generate'))}
          title="Open AI Chat"
        >
          ✦ Ask AI about this schema
        </button>
      </div>
    </div>
  );
};
