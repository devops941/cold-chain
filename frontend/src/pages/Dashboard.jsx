import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Gauge as GaugeIcon,
  Truck,
  Warehouse,
} from 'lucide-react'
import { dashboard, shipments as shipmentsApi } from '../api/endpoints'
import { Card, EmptyState, SectionTitle, Spinner, StatTile, Pill } from '../components/ui/Primitives'
import Gauge from '../components/Gauge'
import { fmtAgo, fmtTemp, humanise, severityTone, statusTone } from '../lib/format'

const STATUS_COLORS = {
  in_transit: 'var(--color-brand-500)',
  delivered: 'var(--color-mint-500)',
  delayed: 'var(--color-sun-500)',
  planned: 'var(--color-sand-400)',
  cancelled: 'var(--color-rose-500)',
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboard.get(), shipmentsApi.list({ limit: 6 })])
      .then(([d, s]) => {
        setData(d)
        setRecent(s)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading your dashboard…" />
  if (!data) return <EmptyState title="No dashboard data" hint="Seed the database to see live metrics." />

  const avg = data.avg_temp_c

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-800">Operations overview</h1>
          <p className="text-sm text-sand-500">
            Live cold-chain health across {data.facilities_total} facilities and {data.shipments_total} shipments.
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          Upload data <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* Bento stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Shipments" value={data.shipments_total} hint={`${data.shipments_in_transit} in transit`} icon={Truck} tone="brand" delay={0} />
        <StatTile label="On-time delivered" value={data.shipments_delivered} hint={`${data.shipments_delayed} delayed`} icon={CheckCircle2} tone="mint" delay={0.05} />
        <StatTile label="Open alerts" value={data.alerts_open} hint={`${data.alerts_critical} critical`} icon={AlertTriangle} tone="rose" delay={0.1} />
        <StatTile label="Readings (24h)" value={data.telemetry_24h} hint={`Avg ${fmtTemp(avg)}`} icon={GaugeIcon} tone="grape" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Temperature gauge */}
        <Card className="flex flex-col items-center justify-center">
          <SectionTitle title="Network temperature" subtitle="Average of all live readings" />
          <Gauge value={avg} min={-25} max={15} band={[-20, 8]} />
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <SectionTitle
            title="Temperature trend"
            subtitle="Average daily reading over the last 7 days"
            icon={GaugeIcon}
          />
          {data.temp_trend?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.temp_trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} unit="°" />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: '1px solid var(--color-sand-200)', fontSize: 12 }}
                  formatter={(v) => [`${v}°C`, 'Avg temp']}
                />
                <Area type="monotone" dataKey="avg_temp" stroke="var(--color-brand-600)" strokeWidth={2.5} fill="url(#tempFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No telemetry yet" hint="Upload readings or post from a sensor to see the trend." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status breakdown */}
        <Card>
          <SectionTitle title="Shipment status" subtitle="Distribution by current state" />
          {data.status_breakdown?.length ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={data.status_breakdown}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {data.status_breakdown.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] || 'var(--color-sand-400)'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, humanise(n)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.status_breakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-sand-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] || 'var(--color-sand-400)' }} />
                      {humanise(s.status)}
                    </span>
                    <span className="font-semibold text-sand-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No shipments" />
          )}
        </Card>

        {/* Top lanes */}
        <Card>
          <SectionTitle title="Busiest lanes" subtitle="Origin → destination by volume" />
          {data.top_lanes?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_lanes} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="lane" width={130} tick={{ fontSize: 10, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, 'Shipments']} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="var(--color-grape-500)" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No lanes yet" />
          )}
        </Card>

        {/* Compliance */}
        <Card className="flex flex-col justify-between">
          <SectionTitle title="Compliance" subtitle="Alert resolution rate" />
          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <div className="relative grid h-40 w-40 place-items-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-sand-200)" strokeWidth="12" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--color-mint-500)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.compliance_rate / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-3xl font-extrabold text-sand-800">{data.compliance_rate}%</p>
                <p className="text-xs text-sand-500">resolved</p>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-sand-50 p-3">
                <p className="font-display text-xl font-bold text-sand-800">{data.alerts_open}</p>
                <p className="text-xs text-sand-500">Open</p>
              </div>
              <div className="rounded-2xl bg-sand-50 p-3">
                <p className="font-display text-xl font-bold text-rose-600">{data.alerts_critical}</p>
                <p className="text-xs text-sand-500">Critical</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent alerts */}
        <Card>
          <SectionTitle title="Recent alerts" subtitle="Latest excursions and events" icon={AlertTriangle} action={<Link to="/alerts" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>} />
          <div className="space-y-2">
            {data.recent_alerts?.length ? (
              data.recent_alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-sand-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sand-800">{a.message}</p>
                    <p className="text-xs text-sand-500">{fmtAgo(a.created_at)}</p>
                  </div>
                  <Pill tone={severityTone(a.severity)}>{humanise(a.severity)}</Pill>
                </div>
              ))
            ) : (
              <EmptyState title="No alerts" hint="All shipments are within their safe temperature band." icon={CheckCircle2} />
            )}
          </div>
        </Card>

        {/* Recent shipments */}
        <Card>
          <SectionTitle title="Recent shipments" subtitle="Newest records first" icon={Truck} action={<Link to="/shipments" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>} />
          <div className="space-y-2">
            {recent.length ? (
              recent.map((s) => (
                <Link key={s.id} to={`/shipments/${s.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sand-50 p-3 transition hover:bg-brand-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sand-800">{s.code}</p>
                    <p className="truncate text-xs text-sand-500">
                      {s.origin_code} → {s.destination_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-sand-700">{fmtTemp(s.latest_temp_c)}</span>
                    <Pill tone={statusTone(s.status)}>{humanise(s.status)}</Pill>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No shipments" icon={Boxes} />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
