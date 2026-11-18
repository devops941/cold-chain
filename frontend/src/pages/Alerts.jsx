import { useEffect, useState } from 'react'
import { AlertTriangle, BellRing, CheckCircle2, CircleDashed } from 'lucide-react'
import { toast } from 'sonner'
import { alerts as alertsApi } from '../api/endpoints'
import { Card, EmptyState, Pill, SectionTitle, Spinner } from '../components/ui/Primitives'
import { fmtAgo, humanise, severityTone } from '../lib/format'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

export default function Alerts() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)

  const load = (status) => {
    setLoading(true)
    alertsApi
      .list(status ? { status } : {})
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(filter), [filter])

  const setStatus = async (id, status) => {
    try {
      const updated = await alertsApi.update(id, { status })
      setRows((prev) =>
        filter ? prev.map((r) => (r.id === id ? updated : r)) : [updated, ...prev.filter((r) => r.id !== id)],
      )
      toast.success(`Alert ${humanise(status).toLowerCase()}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const counts = {
    critical: rows.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length,
    warning: rows.filter((r) => r.severity === 'warning' && r.status !== 'resolved').length,
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <SectionTitle
        title="Alerts"
        subtitle="Temperature excursions and door events that need attention"
        icon={BellRing}
        action={
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)} className={`btn !py-2 text-xs ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}>
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600"><AlertTriangle size={20} /></span>
          <div><p className="text-xs text-sand-500">Critical open</p><p className="font-display text-2xl font-extrabold text-sand-800">{counts.critical}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-100 text-sun-600"><CircleDashed size={20} /></span>
          <div><p className="text-xs text-sand-500">Warnings open</p><p className="font-display text-2xl font-extrabold text-sand-800">{counts.warning}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint-100 text-mint-600"><CheckCircle2 size={20} /></span>
          <div><p className="text-xs text-sand-500">Showing</p><p className="font-display text-2xl font-extrabold text-sand-800">{rows.length}</p></div>
        </Card>
      </div>

      {loading ? (
        <Spinner label="Loading alerts…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing to worry about" hint="No alerts match this filter." />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${a.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-sun-100 text-sun-600'}`}>
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <p className="font-semibold text-sand-800">{a.message}</p>
                  <p className="text-xs text-sand-500">
                    {a.shipment_code} · {fmtAgo(a.created_at)}
                    {a.value != null && ` · value ${a.value}°C`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={severityTone(a.severity)}>{humanise(a.severity)}</Pill>
                <Pill tone={a.status === 'resolved' ? 'bg-mint-100 text-mint-700' : a.status === 'acknowledged' ? 'bg-brand-100 text-brand-800' : 'bg-sand-200 text-sand-700'}>
                  {humanise(a.status)}
                </Pill>
                {a.status === 'open' && (
                  <button className="btn btn-ghost !py-1.5 text-xs" onClick={() => setStatus(a.id, 'acknowledged')}>
                    Acknowledge
                  </button>
                )}
                {a.status !== 'resolved' && (
                  <button className="btn btn-primary !py-1.5 text-xs" onClick={() => setStatus(a.id, 'resolved')}>
                    Resolve
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
