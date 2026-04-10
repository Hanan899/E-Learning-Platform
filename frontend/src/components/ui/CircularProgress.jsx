import { useEffect, useMemo, useState } from 'react';

function CircularProgress({
  percentage = 0,
  size = 92,
  color = '#4F46E5',
  label,
  valueLabel,
}) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const normalizedPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedPercentage(normalizedPercentage), 30);
    return () => window.clearTimeout(timer);
  }, [normalizedPercentage]);

  const strokeDashoffset = useMemo(
    () => circumference - (animatedPercentage / 100) * circumference,
    [animatedPercentage, circumference]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            data-testid="circular-progress-ring"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-slate-950">{valueLabel || `${normalizedPercentage}%`}</span>
          {label ? <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default CircularProgress;
