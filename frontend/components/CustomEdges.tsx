import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from 'reactflow';

/* Inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('arch-edge-keyframes')) {
  const style = document.createElement('style');
  style.id = 'arch-edge-keyframes';
  style.textContent = `
    @keyframes arch-packet {
      0%   { stroke-dashoffset: 200; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes arch-packet-rev {
      0%   { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 200; }
    }
  `;
  document.head.appendChild(style);
}

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  });

  const color  = (data?.color as string) || '#22d3ee';
  const speed  = 1.8; // seconds per cycle — lower = faster

  return (
    <>
      <defs>
        {/* Glow filter per edge */}
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 1 — dim base rail */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.18}
      />

      {/* 2 — glowing rail */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.45}
        filter={`url(#glow-${id})`}
      />

      {/* 3 — moving packet dash (primary) */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeOpacity={0.95}
        strokeDasharray="18 182"
        style={{
          animation: `arch-packet ${speed}s linear infinite`,
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />

      {/* 4 — second smaller packet, offset phase */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.6}
        strokeDasharray="8 192"
        style={{
          animation: `arch-packet ${speed * 1.4}s linear infinite`,
          animationDelay: `${speed * 0.5}s`,
        }}
      />

      {/* Arrow head via BaseEdge (zero-width — only for the markerEnd) */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: 'transparent', strokeWidth: 0 }}
      />

      {/* Edge label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="nodrag nopan"
          >
            <div style={{
              padding: '3px 10px',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              background: 'rgba(4,6,15,0.82)',
              border: `1px solid ${color}44`,
              borderRadius: 20,
              color: color,
              letterSpacing: '0.04em',
              backdropFilter: 'blur(6px)',
              whiteSpace: 'nowrap',
            }}>
              {data.label as string}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const edgeTypes = {
  custom: CustomEdge,
  smoothstep: CustomEdge,
};
