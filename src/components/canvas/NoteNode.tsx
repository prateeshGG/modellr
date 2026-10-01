import { useState, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizeControl } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import type { AccentColor } from '../../types/schema';
import './NoteNode.css';

// Fix #38: use HSL-based values that work in both light and dark themes.
// The data-theme="dark" root attribute flips the surface; we add opacity to
// keep the pastel feel without pure white backgrounds that clash in dark mode.
const NOTE_COLORS: Record<AccentColor, { bg: string, border: string, text: string }> = {
  blue:   { bg: 'rgba(125, 211, 252, 0.15)', border: 'rgba(125, 211, 252, 0.5)', text: '#7dd3fc' },
  teal:   { bg: 'rgba(94, 234, 212, 0.15)',  border: 'rgba(94, 234, 212, 0.5)',  text: '#5eead4' },
  coral:  { bg: 'rgba(253, 186, 116, 0.15)', border: 'rgba(253, 186, 116, 0.5)', text: '#fdba74' },
  purple: { bg: 'rgba(216, 180, 254, 0.15)', border: 'rgba(216, 180, 254, 0.5)', text: '#d8b4fe' },
  amber:  { bg: 'rgba(252, 211, 77, 0.15)',  border: 'rgba(252, 211, 77, 0.5)',  text: '#fcd34d' },
  green:  { bg: 'rgba(134, 239, 172, 0.15)', border: 'rgba(134, 239, 172, 0.5)', text: '#86efac' },
  pink:   { bg: 'rgba(249, 168, 212, 0.15)', border: 'rgba(249, 168, 212, 0.5)', text: '#f9a8d4' },
  gray:   { bg: 'rgba(209, 213, 219, 0.15)', border: 'rgba(209, 213, 219, 0.5)', text: '#9ca3af' },
};

export default function NoteNode({ id, data: rawData, selected }: NodeProps) {
  const data = rawData as any;
  const readOnly = useUIStore(s => s.readOnly);
  const updateNote = useSchemaStore(s => s.updateNote);
  const removeNote = useSchemaStore(s => s.removeNote);

  // Local state for snappy typing without writing to the global store on every keystroke
  const [content, setContent] = useState<string>(data.content ?? '');

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
