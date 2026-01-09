export default function ThresholdCircle({ label, value, total, targetPercent }) {
  const target = Number(targetPercent)
  const pct = total > 0 && Number.isFinite(target)
    ? Math.min(100, (Number(value) / total) * 100)
    : 0
  const reached = Number.isFinite(target) ? pct >= target : false
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, pct / 100))
  const offset = circumference * (1 - progress)
  const strokeColor = reached ? 'var(--color-primary)' : '#c64343'
  const targetColor = reached ? 'var(--color-primary)' : '#c64343'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke="var(--color-primary-darkest)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke={strokeColor}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="10"
          fill="var(--color-primary-lighter)"
        >
          {Math.round(pct)}%
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lighter)' }}>{label}</span>
        <span style={{ fontSize: 'var(--font-size-base)', color: reached ? 'var(--color-primary)' : 'var(--color-primary-lighter)' }}>
          <span style={{ color: targetColor }}>
            {Number.isFinite(target) ? `${target}% target` : 'n/a'}
          </span>
        </span>
      </div>
    </div>
  )
}
