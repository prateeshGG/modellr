import React from 'react';
import { getBezierPath, type Position } from '@xyflow/react';
import { useSchemaStore } from '../../store/schema';
import { ACCENT_HEX } from '../../utils/constants';

// In @xyflow/react v12, edge components receive these props directly
interface RelationshipEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: Record<string, unknown>;
  selected?: boolean;
  markerEnd?: string;
  markerStart?: string;
  style?: React.CSSProperties;
}

export const RelationshipEdge: React.FC<RelationshipEdgeProps> = ({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
  markerEnd,
  markerStart,
}) => {
  const { tables } = useSchemaStore();

  const sourceTableId = data?.sourceTableId as string | undefined;
  const sourceTable = tables.find((t) => t.id === sourceTableId);
  const accentHex = sourceTable ? ACCENT_HEX[sourceTable.accentColor] : '#378ADD';

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const strokeColor = selected
    ? accentHex
    : `${accentHex}80`; // 50% opacity via hex alpha

  const strokeWidth = selected ? 2 : 1.5;

  return (
    <>
      {/* Invisible wide hit area for easier selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          transition: `stroke 200ms ease-out, stroke-width 200ms ease-out`,
        }}
      />
    </>
  );
};

/** SVG marker definitions for crow's-foot notation */
export function RelationshipMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <marker
          id="crowsfoot-many"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 8 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M 0 10 L 8 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M 3 0 L 3 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </marker>
        <marker
          id="crowsfoot-one"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 5 0 L 5 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M 8 0 L 8 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </marker>
      </defs>
    </svg>
  );
}
