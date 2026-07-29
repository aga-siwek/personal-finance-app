import type { ReactNode } from "react";

export interface DonutSegment {
  value: number;
  color: string;
}

/**
 * Pure-SVG donut (no chart dependency), reused by the Overview and later the
 * Budgets screen. Segments are drawn as stroked arcs via `stroke-dasharray`;
 * a full grey track sits underneath so an all-zero/empty donut still reads as
 * a ring. `children` render centred (the total + caption).
 */
function DonutChart({
  segments,
  size = 240,
  thickness = 30,
  children,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="presentation"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--grey-100)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((segment, i) => {
            const length = (segment.value / total) * circumference;
            const dash = (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return dash;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

export default DonutChart;
