const SEG_COLORS = ['#4fd1c5', '#ed64a6', '#63b3ed', '#f6ad55', '#9f7aea', '#68d391', '#f56565']

export default function PollPie({ parts, size = 120 }) {
  const radius = size * 0.2667 // scale radius with size (approx 32 when size=120)
  const strokeWidth = Math.max(8, size * 0.1333) // keep proportional thickness
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  let startAngle = -90
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="var(--color-primary-darkest)"
        strokeWidth={strokeWidth}
      />
      {parts.map((part, idx) => {
        const pct = Math.max(0, Math.min(100, part.percent || 0))
        const dash = (pct / 100) * circumference
        const gap = circumference - dash
        const rotate = startAngle
        startAngle += (pct / 100) * 360
        return (
          <circle
            key={`pie-${idx}`}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={SEG_COLORS[idx % SEG_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset="0"
            transform={`rotate(${rotate} ${center} ${center})`}
          />
        )
      })}
    </svg>
  )
}
