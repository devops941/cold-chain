import { useEffect, useState } from 'react'
import { FileUp, History, Info, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploads as uploadsApi } from '../api/endpoints'
import Uploader from '../components/Uploader'
import { Card, EmptyState, Pill, SectionTitle, Spinner } from '../components/ui/Primitives'
import { fmtAgo } from '../lib/format'

const KIND_LABEL = {
  telemetry: 'Temperature readings',
  shipments: 'Shipments',
  products: 'Products',
  facilities: 'Facilities',
}

export default function UploadPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState({})

  const load = () => {
    setLoading(true)
    uploadsApi
      .list()
      .then(setHistory)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    Promise.all(
      Object.keys(KIND_LABEL).map((k) => uploadsApi.template(k).then((t) => [k, t]).catch(() => null)),
    ).then((pairs) => {
      const map = {}
      pairs.forEach((p) => p && (map[p[0]] = p[1]))
      setTemplates(map)
    })
  }, [])

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <SectionTitle
        title="Data upload"
        subtitle="Import readings, shipments, products or facilities from a CSV or JSON file"
        icon={Upload}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <Uploader onUploaded={load} />
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle title="Expected columns" subtitle="Column names are flexible — common aliases work" icon={Info} />
            <div className="space-y-4">
              {Object.entries(templates).map(([kind, t]) => (
                <div key={kind}>
                  <p className="mb-1.5 text-sm font-semibold text-sand-700">{KIND_LABEL[kind]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.headers.map((h) => (
                      <span key={h} className="pill bg-brand-50 text-brand-800">{h}</span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-sand-500">
                    Example: <span className="font-mono">{t.sample.join(', ')}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-brand-50/50">
            <SectionTitle title="How it works" icon={FileUp} />
            <ul className="space-y-2 text-sm text-sand-600">
              <li>• Pick the data type, then drag a file onto the drop zone.</li>
              <li>• Every row is validated — a bad row never stops the rest.</li>
              <li>• Temperature readings are checked against each shipment's safe band.</li>
              <li>• Out-of-band readings create alerts automatically.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle title="Upload history" subtitle="Most recent imports" icon={History} />
        {loading ? (
          <Spinner label="Loading history…" />
        ) : history.length === 0 ? (
          <EmptyState title="No uploads yet" hint="Your imports will be listed here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-xs uppercase tracking-wide text-sand-500">
                  <th className="px-3 py-2 font-semibold">File</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Rows</th>
                  <th className="px-3 py-2 font-semibold">Imported</th>
                  <th className="px-3 py-2 font-semibold">Skipped</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-sand-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-sand-800">{h.filename}</td>
                    <td className="px-3 py-2 text-sand-600">{KIND_LABEL[h.kind] || h.kind}</td>
                    <td className="px-3 py-2">{h.rows}</td>
                    <td className="px-3 py-2 text-mint-700">{h.inserted}</td>
                    <td className="px-3 py-2 text-rose-600">{h.failed}</td>
                    <td className="px-3 py-2">
                      <Pill tone={h.status === 'completed' ? 'bg-mint-100 text-mint-700' : h.status === 'partial' ? 'bg-sun-100 text-sun-700' : 'bg-rose-100 text-rose-700'}>
                        {h.status}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-xs text-sand-500">{fmtAgo(h.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
