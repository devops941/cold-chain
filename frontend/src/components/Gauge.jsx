import { motion } from 'framer-motion'

/**
 * Semicircular temperature gauge.
 * Draws a coloured arc that turns rose when the reading leaves the safe band.
 */
export default function Gauge({
  value,
  min = -20,
  max = 20,
  band = null,
  size = 220,
  label = 'Current temperature',
}) {
  const clamp = (v) => Math.max(min, Math.min(max, v))
  const ratio = value === null || value === undefined ? 0 : (clamp(value) - min) / (max - min)
  const angle = -90 + ratio * 180

  const inBand =
    band && value !== null && value !== undefined ? value >= band[0] && value <= band[1] : true
  const stroke = inBand ? 'var(--color-brand-600)' : 'var(--color-rose-500)'

  const radius = size / 2 - 16
  const cx = size / 2
  const cy = size / 2
  const arc = (from, to) => {
    const a1 = (from * Math.PI) / 180
    const a2 = (to * Math.PI) / 180
    const x1 = cx + radius * Math.cos(a1)
    const y1 = cy + radius * Math.sin(a1)
    const x2 = cx + radius * Math.cos(a2)
    const y2 = cy + radius * Math.sin(a2)
    const large = Math.abs(to - from) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  const bandFrom = band ? -90 + ((clamp(band[0]) - min) / (max - min)) * 180 : null
  const bandTo = band ? -90 + ((clamp(band[1]) - min) / (max - min)) * 180 : null

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        <path d={arc(0, 180)} fill="none" stroke="var(--color-sand-200)" strokeWidth="14" strokeLinecap="round" />
        {bandFrom !== null && bandTo !== null && (
          <path
            d={arc(bandFrom, bandTo)}
            fill="none"
            stroke="var(--color-mint-200)"
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        <path
          d={arc(0, 180)}
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${ratio * Math.PI * radius} ${Math.PI * radius}`}
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <motion.line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - radius + 6}
          stroke="var(--color-sand-700)"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={false}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        <circle cx={cx} cy={cy} r="7" fill="var(--color-sand-700)" />
      </svg>
      <div className="-mt-3 text-center">
        <p className="font-display text-4xl font-extrabold text-sand-800">
          {value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}°C`}
        </p>
        <p className="text-xs font-medium text-sand-500">{label}</p>
        {band && (
          <p className={`mt-1 text-xs font-semibold ${inBand ? 'text-mint-600' : 'text-rose-600'}`}>
            {inBand ? 'Within safe band' : 'Out of safe band'} · {band[0]}°C to {band[1]}°C
          </p>
        )}
      </div>
    </div>
  )
}
