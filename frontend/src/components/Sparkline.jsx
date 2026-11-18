import { Line, LineChart, ResponsiveContainer } from 'recharts'

export default function Sparkline({ data = [], color = 'var(--color-brand-600)', height = 48 }) {
  if (!data.length) return <div className="h-12" />
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
