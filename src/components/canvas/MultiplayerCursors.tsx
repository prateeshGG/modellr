import React from 'react';
import { useYjsStore } from '../../store/yjsStore';
import './MultiplayerCursors.css';

/**
 * Renders floating name-tag cursors for all connected collaborators.
 * Positions are passed in screen-space pixels (broadcast via Y.Awareness).
 */
export const MultiplayerCursors: React.FC = () => {
  const collaborators = useYjsStore((s) => s.collaborators);

  return (
    <>
      {collaborators.map((collab) => {
        if (!collab.cursor) return null;
        return (
          <div
            key={collab.clientId}
            className="mp-cursor"
            style={{
              left: collab.cursor.x,
              top: collab.cursor.y,
              '--mp-color': collab.color,
            } as React.CSSProperties}
          >
            {/* SVG cursor pointer */}
            <svg
              className="mp-cursor__arrow"
              width="14"
              height="18"
              viewBox="0 0 14 18"
              fill={collab.color}
            >
              <path d="M0 0L0 13L3.5 9.5L5.8 14.5L7.5 13.8L5.1 8.8L9.5 8.8Z" />
            </svg>
            {/* Name tag */}
            <span className="mp-cursor__label">{collab.name}</span>
          </div>
        );
      })}
    </>
  );
};
