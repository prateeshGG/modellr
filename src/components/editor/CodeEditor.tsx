import React, { useEffect, useRef, useMemo } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { useUIStore } from '../../store/ui';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}


function buildTheme(isDark: boolean) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '12px',
        fontFamily: "'Geist Mono Variable', 'Geist Mono', 'Fira Code', monospace",
        backgroundColor: 'transparent',
      },
      '.cm-content': {
        padding: '16px 0',
        caretColor: isDark ? '#85B7EB' : '#378ADD',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: isDark ? '1px solid #353532' : '1px solid #E4E2DA',
        color: isDark ? '#686965' : '#9B998F',
        minWidth: '40px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 4px',
        fontSize: '11px',
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: isDark ? '#A8A69E' : '#5A5955',
      },
      '.cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(55,138,221,0.25)' : 'rgba(55,138,221,0.15)',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: isDark ? '#85B7EB' : '#378ADD',
      },
      '.cm-line': {
        color: isDark ? '#F0EEE8' : '#1C1B18',
      },
      // SQL keyword highlighting
      '.tok-keyword': { color: isDark ? '#85B7EB' : '#185FA5', fontWeight: '500' },
      '.tok-string': { color: isDark ? '#97C459' : '#639922' },
      '.tok-number': { color: isDark ? '#F5BC5A' : '#B9A717' },
      '.tok-comment': { color: isDark ? '#686965' : '#9B998F', fontStyle: 'italic' },
      '.tok-typeName': { color: isDark ? '#FF8A63' : '#C63A12' },
      '.tok-name': { color: isDark ? '#F0EEE8' : '#1C1B18' },
      '.tok-punctuation': { color: isDark ? '#A8A69E' : '#5A5955' },
      '.tok-operator': { color: isDark ? '#F07070' : '#E24B4A' },
    },
    { dark: isDark }
  );
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Fix #41: scope the compartment per-instance instead of module-level singleton
  const themeCompartmentRef = useRef(new Compartment());
  // Fix #41: read isDark reactively from the store (not a one-time DOM snapshot)
  const theme = useUIStore((s) => s.theme);
  const isDark = theme !== 'light';

  const extensions = useMemo(() => [
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    bracketMatching(),
    closeBrackets(),
    syntaxHighlighting(defaultHighlightStyle),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    sql(),
    themeCompartmentRef.current.of(buildTheme(isDark)),
    EditorView.editable.of(!readOnly),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    }),
  ], [readOnly, onChange, isDark]);

  // Initialize editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes without recreating editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    });
  }, [value]);

  // Fix #41: reconfigure theme via Compartment when the user toggles dark/light mode
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(buildTheme(isDark)),
    });
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className="code-editor"
      aria-label="SQL code editor"
      role="textbox"
      aria-multiline="true"
    />
  );
};
