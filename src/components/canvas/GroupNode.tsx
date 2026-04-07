import { useState, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizeControl } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import type { AccentColor } from '../../types/schema';
import { ACCENT_HEX } from '../../utils/constants';
import './GroupNode.css';

export default function GroupNode({ id, data, selected }: NodeProps) {
  const readOnly = useUIStore(s => s.readOnly);
  const updateGroup = useSchemaStore(s => s.updateGroup);
  const removeGroup = useSchemaStore(s => s.removeGroup);

  const [name, setName] = useState(data.name);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(data.name);
  }, [data.name]);

  const handleBlur = () => {
    setIsEditing(false);
    if (name !== data.name) {
      updateGroup(id, { name });
    }
  };

  // Convert deep accent color into a very faint background color for the group
  // To do this simply, we apply a low opacity hex to the solid border color
  const baseColor = ACCENT_HEX[data.color as AccentColor] || ACCENT_HEX.gray;

  return (
    <div 
      className={`group-node ${selected ? 'selected' : ''}`}
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: `${baseColor}15`, // 15% opacity hex
        borderColor: selected ? baseColor : `${baseColor}60`, // 60% opacity border
      }}
    >
      <NodeResizeControl 
        minWidth={200} 
        minHeight={200}
        color={baseColor}
        onResizeEnd={(_: any, params: any) => {
          updateGroup(id, { width: params.width, height: params.height });
        }}
      />
      
      {!readOnly && selected && (
        <button 
          className="group-node__delete"
          onClick={() => removeGroup(id)}
          title="Delete Group (tables will remain)"
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Header bar for dragging the group and editing the name */}
      <div 
        className="group-node__header"
        style={{ color: baseColor }}
        onDoubleClick={() => { if (!readOnly) setIsEditing(true); }}
      >
        {isEditing ? (
          <input
            autoFocus
            className="group-node__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleBlur();
            }}
            style={{ color: baseColor }}
          />
        ) : (
          <span className="group-node__title">{name}</span>
        )}
      </div>
    </div>
  );
}
