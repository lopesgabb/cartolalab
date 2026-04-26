'use client';

interface SparklineProps {
  data: number[];       // array of scores per round
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  label?: string;
}

export default function Sparkline({
  data,
  width = 120,
  height = 36,
  color = 'var(--color-accent)',
  showDots = true,
  label,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;

  const padX = 4;
  const padY = 4;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const toX = (i: number) => padX + (i / (data.length - 1)) * w;
  const toY = (v: number) => padY + h - ((v - min) / range) * h;

  // Build SVG polyline points
  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Build filled area path
  const areaPath = [
    `M ${toX(0)},${toY(data[0])}`,
    ...data.map((v, i) => `L ${toX(i)},${toY(v)}`),
    `L ${toX(data.length - 1)},${padY + h}`,
    `L ${toX(0)},${padY + h}`,
    'Z',
  ].join(' ');

  const last = data[data.length - 1];
  const secondLast = data[data.length - 2] ?? 0;
  const trend = last - secondLast;

  // Derive a hex-compatible color for the gradient
  const isAccent = color === 'var(--color-accent)';
  const gradientColor = isAccent ? '#00FF88' : '#4DA6FF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`grad-${gradientColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaPath}
          fill={`url(#grad-${gradientColor.replace('#', '')})`}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={gradientColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && data.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={i === data.length - 1 ? 3 : 2}
            fill={i === data.length - 1 ? gradientColor : 'transparent'}
            stroke={gradientColor}
            strokeWidth={i === data.length - 1 ? 0 : 1}
          />
        ))}

        {/* Last value label */}
        <text
          x={toX(data.length - 1) + 5}
          y={toY(last) + 4}
          fontSize="9"
          fill={gradientColor}
          fontWeight="700"
        >
          {last.toFixed(1)}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
          {label}
        </span>
      )}
      {/* Trend arrow */}
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: trend > 0.5 ? 'var(--color-positive)' : trend < -0.5 ? 'var(--color-negative)' : 'var(--color-text-dim)',
        }}
      >
        {trend > 0.5 ? '▲' : trend < -0.5 ? '▼' : '—'} {Math.abs(trend).toFixed(1)}
      </span>
    </div>
  );
}
