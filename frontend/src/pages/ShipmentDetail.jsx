import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, Droplets, DoorOpen, MapPin, Thermometer, TrendingUp, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { shipments as shipmentsApi } from '../api/endpoints'
import Gauge from '../components/Gauge'
import { Card, EmptyState, Pill, SectionTitle, Spinner } from '../components/ui/Primitives'
import { fmtDateTime, fmtNumber, fmtTemp, humanise, priorityTone, statusTone, tempInBand } from '../lib/format'

const STATUS_FLOW = ['planned', 'in_transit', 'delivered']

export default function ShipmentDetail() {
  const { id } = useParams()
  const [shipment, setShipment] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([shipmentsApi.get(id), shipmentsApi.telemetry(id, { limit: 300 })])
      .then(([s, t]) => {
        setShipment(s)
        setData(t)
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const setStatus = async (status) => {
    try {
      const updated = await shipmentsApi.update(id, { status })
      setShipment(updated)
      toast.success(`Marked as ${humanise(status)}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <Spinner label="Loading shipment…" />
  if (!shipment) return <EmptyState title="Shipment not found" />

  const chartData = (data?.telemetry || []).map((t) => ({
    ts: t.ts,
    temperature_c: t.temperature_c,
    humidity_pct: t.humidity_pct,
  }))
  const inBand = tempInBand(shipment.latest_temp_c, shipment.min_c, shipment.max_c)
  const stats = data?.stats || {}
  const activeStep = STATUS_FLOW.indexOf(shipment.status)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link to="/shipments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand-500 hover:text-sand-800">
        <ArrowLeft size={16} /> Back to shipments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold text-sand-800">{shipment.code}</h1>
            <Pill tone={statusTone(shipment.status)}>{humanise(shipment.status)}</Pill>
            <Pill tone={priorityTone(shipment.priority)}>{humanise(shipment.priority)} priority</Pill>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-sand-500">
            <MapPin size={15} /> {shipment.origin_code} → {shipment.destination_code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={shipment.status === s}
              className={`btn !py-2 text-xs ${shipment.status === s ? 'btn-primary' : 'btn-ghost'}`}
            >
              Mark {humanise(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <div className="flex items-center gap-2">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  i <= activeStep && activeStep >= 0 ? 'bg-brand-500 text-white' : 'bg-sand-200 text-sand-500'
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden text-sm font-semibold text-sand-700 sm:block">{humanise(s)}</span>
              {i < STATUS_FLOW.length - 1 && <span className={`h-1 flex-1 rounded-full ${i < activeStep ? 'bg-brand-400' : 'bg-sand-200'}`} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <SectionTitle title="Live temperature" subtitle="Latest reading vs safe band" />
          <Gauge value={shipment.latest_temp_c} min={Math.min(shipment.min_c - 5, -5)} max={Math.max(shipment.max_c + 5, 15)} band={[shipment.min_c, shipment.max_c]} />
          <Pill tone={inBand ? 'bg-mint-100 text-mint-700' : 'bg-rose-100 text-rose-700'} className="mt-3">
            {inBand ? 'Within safe band' : 'Excursion detected'}
          </Pill>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle title="Temperature history" subtitle={`${chartData.length} readings`} icon={Thermometer} />
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="tFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-sand-200)" strokeDasharray="3 3" vertical={false} />
                <ReferenceArea y1={shipment.min_c} y2={shipment.max_c} fill="var(--color-mint-500)" fillOpacity={0.1} />
                <XAxis dataKey="ts" tickFormatter={(v) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')} tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-sand-500)' }} tickLine={false} axisLine={false} unit="°" />
                <Tooltip labelFormatter={(v) => fmtDateTime(v)} formatter={(v, n) => [n === 'temperature_c' ? `${v}°C` : `${v}%`, n === 'temperature_c' ? 'Temperature' : 'Humidity']} contentStyle={{ borderRadius: 14, border: '1px solid var(--color-sand-200)', fontSize: 12 }} />
                <Area type="monotone" dataKey="temperature_c" stroke="var(--color-brand-600)" strokeWidth={2.5} fill="url(#tFill)" />
                <Line type="monotone" dataKey="humidity_pct" stroke="var(--color-grape-500)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No readings yet" hint="Post telemetry or upload a CSV to see the history." />
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Average temp" value={fmtTemp(stats.avg_temp)} icon={Thermometer} tone="text-brand-700" />
        <MiniStat label="Min / Max" value={`${fmtTemp(stats.min_temp)} / ${fmtTemp(stats.max_temp)}`} icon={TrendingUp} tone="text-grape-700" />
        <MiniStat label="Avg humidity" value={stats.avg_humidity != null ? `${stats.avg_humidity}%` : '—'} icon={Droplets} tone="text-mint-700" />
        <MiniStat label="Excursions" value={stats.excursions ?? 0} icon={DoorOpen} tone="text-rose-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Shipment details" subtitle="Logistics record" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Carrier" value={shipment.carrier} />
            <Field label="Vehicle" value={shipment.vehicle_no} />
            <Field label="Driver" value={shipment.driver} />
            <Field label="Product" value={shipment.product_sku} />
            <Field label="Quantity" value={fmtNumber(shipment.quantity)} />
            <Field label="Distance" value={shipment.distance_km ? `${shipment.distance_km} km` : '—'} />
            <Field label="Departed" value={fmtDateTime(shipment.departed_at)} />
            <Field label="ETA" value={fmtDateTime(shipment.eta)} />
            <Field label="Delivered" value={fmtDateTime(shipment.delivered_at)} />
            <Field label="Safe band" value={`${shipment.min_c}° to ${shipment.max_c}°C`} />
          </dl>
        </Card>

        <Card>
          <SectionTitle title="Event timeline" subtitle="Most recent readings" icon={Zap} />
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {chartData.length ? (
              [...chartData].reverse().slice(0, 20).map((t, i) => {
                const ok = tempInBand(t.temperature_c, shipment.min_c, shipment.max_c)
                return (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok === false ? 'bg-rose-500' : 'bg-mint-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-sand-800">{fmtTemp(t.temperature_c)}</p>
                      <p className="text-xs text-sand-500">{fmtDateTime(t.ts)}</p>
                    </div>
                    <span className="text-xs text-sand-500">{t.humidity_pct != null ? `${t.humidity_pct}% RH` : ''}</span>
                  </div>
                )
              })
            ) : (
              <EmptyState title="No events" />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl bg-sand-50 p-3">
      <dt className="text-xs text-sand-500">{label}</dt>
      <dd className="font-semibold text-sand-800">{value || '—'}</dd>
    </div>
  )
}

function MiniStat({ label, value, icon: Icon, tone }) {
  return (
    <Card className="flex items-center gap-3">
      <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-sand-50 ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs text-sand-500">{label}</p>
        <p className="font-display text-lg font-bold text-sand-800">{value}</p>
      </div>
    </Card>
  )
}
