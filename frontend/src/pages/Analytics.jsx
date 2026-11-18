import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, PieChart as PieIcon, TrendingUp, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { analytics } from '../api/endpoints'
import { Card, EmptyState, SectionTitle, Spinner, StatTile } from '../components/ui/Primitives'
import { humanise } from '../lib/format'

const PALETTE = ['#0d9488', '#8b5cf6', '#f59e0b', '#f43f5e', '#84cc16', '#fb923c', '#10b981']
const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

export default function Analytics() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    analytics
      .overview({ days })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <Spinner label="Crunching the numbers…" />
  if (!data) return <EmptyState title="No analytics available" />

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <SectionTitle
        title="Analytics"
        subtitle="Temperature distribution, carrier performance and throughput"
        icon={BarChart3}
        action={
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button key={r.value} onClick={() => setDays(r.value)} className={`btn !py-2 text-xs ${days === r.value ? 'btn-primary' : 'btn-ghost'}`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Compliance rate" value={`${data.compliance_rate}%`} hint={`${data.on_time} on-time of all shipments`} icon={TrendingUp} tone="mint" />
        <StatTile label="Delivered" value={data.on_time} hint="Completed shipments" icon={Truck} tone="brand" />
        <StatTile label="Delayed" value={data.delayed} hint="Missed schedule" icon={PieIcon} tone="sun" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Temperature distribution" subtitle="How often each reading occurs" />
          {data.temperature_histogram?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.temperature_histogram} margin={{ top: 8, right: 8, left: -18 }}>
                <CartesianGrid stroke="var(--color-sand-200)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} unit="°" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, 'Readings']} labelFormatter={(l) => `${l}°C`} contentStyle={{ borderRadius: 14, border: '1px solid var(--color-sand-200)', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.temperature_histogram.map((h, i) => (
                    <Cell key={i} fill={h.bucket >= 2 && h.bucket <= 8 ? 'var(--color-mint-500)' : 'var(--color-tangerine-500)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No readings in range" />
          )}
        </Card>

        <Card>
          <SectionTitle title="Daily throughput" subtitle="Shipments created per day" />
          {data.throughput?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.throughput} margin={{ top: 8, right: 8, left: -18 }}>
                <CartesianGrid stroke="var(--color-sand-200)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid var(--color-sand-200)', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--color-grape-500)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No shipments in range" />
          )}
        </Card>

        <Card>
          <SectionTitle title="Alerts by type" subtitle="What is triggering alerts" />
          {data.alerts_by_type?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.alerts_by_type} dataKey="count" nameKey="type" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {data.alerts_by_type.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, humanise(n)]} />
                <Legend formatter={(v) => humanise(v)} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No alerts in range" />
          )}
        </Card>

        <Card>
          <SectionTitle title="Carrier performance" subtitle="Delivered vs delayed by carrier" />
          {data.carriers?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.carriers} margin={{ top: 8, right: 8, left: -18 }}>
                <CartesianGrid stroke="var(--color-sand-200)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="carrier" tick={{ fontSize: 10, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid var(--color-sand-200)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="delivered" stackId="a" fill="var(--color-mint-500)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="delayed" stackId="a" fill="var(--color-rose-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No carrier data" />
          )}
        </Card>
      </div>

      {data.categories?.length > 0 && (
        <Card>
          <SectionTitle title="Product categories" subtitle="Catalogue mix" />
          <div className="flex flex-wrap gap-2">
            {data.categories.map((c, i) => (
              <span key={c.category} className="pill" style={{ background: `${PALETTE[i % PALETTE.length]}22`, color: PALETTE[i % PALETTE.length] }}>
                {humanise(c.category)} · {c.count}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
