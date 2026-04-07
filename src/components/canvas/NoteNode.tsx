import { useState, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizeControl } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import type { AccentColor } from '../../types/schema';
import './NoteNode.css';

const NOTE_COLORS: Record<AccentColor, { bg: string, border: string, text: string }> = {
  blue: { bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' },
  teal: { bg: '#ccfbf1', border: '#5eead4', text: '#0f766e' },
  coral: { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' },
  purple: { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce' },
  amber: { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' },
  green: { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  pink: { bg: '#fce7f3', border: '#f9a8d4', text: '#be185d' },
  gray: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
};

export default function NoteNode({ id, data, selected }: NodeProps) {
  const readOnly = useUIStore(s => s.readOnly);
  const updateNote = useSchemaStore(s => s.updateNote);
  const removeNote = useSchemaStore(s => s.removeNote);

  // Local state for snappy typing without debouncing the global Yjs store on every keystroke
  const [content, setContent] = useState(data.content);

  useEffect(() => {
    setContent(data.content);
  }, [data.content]);

  const handleBlur = () => {
    if (content !== data.content) {
      updateNote(id, { content });
    }
  };

  const theme = NOTE_COLORS[data.color as AccentColor] || NOTE_COLORS.amber;

  return (
    <div 
      className={`note-node ${selected ? 'selected' : ''}`}
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: theme.bg,
        borderColor: selected ? theme.text : theme.border,
        color: theme.text,
      }}
    >
      <NodeResizeControl 
        minWidth={150} 
        minHeight={100}
        color={theme.text}
        onResizeEnd={(_, params) => {
          updateNote(id, { width: params.width, height: params.height });
        }}
      />
      
      {!readOnly && selected && (
        <button 
          className="note-node__delete"
          onClick={() => removeNote(id)}
          title="Delete note"
        >
          <Trash2 size={14} />
        </button>
      )}

      <textarea
        className="note-node__textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        readOnly={readOnly}
        placeholder="Type a note..."
        style={{ color: theme.text }}
      />
    </div>
  );
}
