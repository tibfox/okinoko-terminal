import { h } from 'preact'

export default function RcCircleGraph({
  rcPercent,
  rcRatio,
  hovered,
  setHovered,
  onClick,
  expanded,
  loading = false,
}) {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - rcRatio)

  return (
    <button
      onClick={loading ? undefined : onClick}
      onMouseEnter={() => !loading && setHovered(true)}
      onMouseLeave={() => !loading && setHovered(false)}
      title={loading ? 'Loading...' : `RC: ${rcPercent}%`}
      style={{
        cursor: loading ? 'wait' : 'pointer',
        width: '48px',
        height: '48px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse balances' : 'Expand balances'}
    >
      <svg width="48" height="48" viewBox="0 0 48 48">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="4"
          fill="none"
        />

        {/* Foreground (animated or real stroke) */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="var(--color-primary-darker)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{
            transition: loading ? 'none' : 'stroke-dashoffset 0.3s ease',
          }}
        />

        {/* Text Percentage */}
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fill="var(--color-primary)"
          style={{
            transition: 'all 0.3s ease',
            opacity: loading ? 0.7 : 1,
            filter: hovered && !loading
              ? 'drop-shadow(0 0 6px var(--color-primary-lightest)) drop-shadow(0 0 12px var(--color-primary-darker))'
              : 'none',
          }}
        >
         {!loading && `${Math.round(rcPercent)}%`}

        </text>
      </svg>
    </button>
  )
}
