import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { uploads } from '../api/endpoints'

const KINDS = [
  { value: 'telemetry', label: 'Temperature readings', hint: 'CSV or JSON — shipment_code, ts, temperature_c …' },
  { value: 'shipments', label: 'Shipments', hint: 'CSV or JSON — code, origin_code, destination_code …' },
  { value: 'products', label: 'Products', hint: 'CSV or JSON — sku, name, min_c, max_c …' },
  { value: 'facilities', label: 'Facilities', hint: 'CSV or JSON — name, code, type, city …' },
]

export default function Uploader({ onUploaded }) {
  const [kind, setKind] = useState('telemetry')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const send = useCallback(
    async (file) => {
      if (!file) return
      setBusy(true)
      setResult(null)
      try {
        const data = await uploads.upload(kind, file)
        setResult(data)
        if (data.status === 'completed') toast.success(`${data.inserted} rows imported from ${data.filename}`)
        else if (data.status === 'partial') toast.warning(`Imported ${data.inserted} rows, ${data.failed} skipped`)
        else toast.error(`Import failed for ${data.filename}`)
        onUploaded?.(data)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    },
    [kind, onUploaded],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    send(e.dataTransfer.files?.[0])
  }

  const active = KINDS.find((k) => k.value === kind)

  return (
    <div className="space-y-5">
      <div>
        <label className="label">What kind of data are you uploading?</label>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`btn ${kind === k.value ? 'btn-primary' : 'btn-ghost'} !py-2 text-xs`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-sand-500">{active.hint}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-50/70 scale-[1.01]'
            : 'border-sand-300 bg-white/60 hover:border-brand-400 hover:bg-brand-50/40'
        }`}
      >
        <motion.span
          animate={dragging ? { y: -6 } : { y: 0 }}
          className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow"
        >
          <UploadCloud size={30} />
        </motion.span>
        <p className="font-display text-lg font-bold text-sand-800">
          {busy ? 'Uploading…' : 'Drag & drop a file, or click to browse'}
        </p>
        <p className="mt-1 text-sm text-sand-500">Accepts .csv and .json — up to 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            send(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-5"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-2xl ${
                  result.failed === 0 ? 'bg-mint-100 text-mint-700' : 'bg-sun-100 text-sun-700'
                }`}
              >
                {result.failed === 0 ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </span>
              <div>
                <p className="font-semibold text-sand-800">
                  {result.filename} · {result.rows} rows read
                </p>
                <p className="text-sm text-sand-500">
                  {result.inserted} imported · {result.failed} skipped · status {result.status}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="Rows read" value={result.rows} />
              <Metric label="Imported" value={result.inserted} tone="text-mint-600" />
              <Metric label="Skipped" value={result.failed} tone="text-rose-600" />
            </div>

            {result.errors?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-sand-700">
                  <FileSpreadsheet size={15} /> Row issues ({result.errors.length})
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-sand-50 p-3 text-xs text-sand-600">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-semibold">Row {e.row}:</span> {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Metric({ label, value, tone = 'text-sand-800' }) {
  return (
    <div className="rounded-2xl bg-sand-50 p-3 text-center">
      <p className={`font-display text-2xl font-extrabold ${tone}`}>{value}</p>
      <p className="text-xs text-sand-500">{label}</p>
    </div>
  )
}
