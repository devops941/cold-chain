import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { facilities as facilitiesApi, products as productsApi, shipments as shipmentsApi } from '../api/endpoints'
import DataTable from '../components/DataTable'
import { Modal, Pill, SectionTitle } from '../components/ui/Primitives'
import { fmtDateTime, fmtTemp, humanise, priorityTone, statusTone, tempInBand } from '../lib/format'

const EMPTY = {
  origin_code: '',
  destination_code: '',
  product_sku: '',
  carrier: '',
  vehicle_no: '',
  driver: '',
  priority: 'normal',
  status: 'planned',
  min_c: 2,
  max_c: 8,
  quantity: '',
}

export default function Shipments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [facilityList, setFacilityList] = useState([])
  const [productList, setProductList] = useState([])
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    shipmentsApi
      .list({ limit: 300 })
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    facilitiesApi.list().then(setFacilityList).catch(() => {})
    productsApi.list().then(setProductList).catch(() => {})
  }, [])

  const columns = useMemo(
    () => [
      {
        key: 'code',
        label: 'Shipment',
        render: (r) => <span className="font-semibold text-sand-800">{r.code}</span>,
      },
      {
        key: 'lane',
        label: 'Lane',
        render: (r) => (
          <span className="text-sand-600">
            {r.origin_code} <span className="text-sand-400">→</span> {r.destination_code}
          </span>
        ),
      },
      { key: 'carrier', label: 'Carrier', render: (r) => r.carrier || '—' },
      {
        key: 'latest_temp_c',
        label: 'Temp',
        render: (r) => {
          const ok = tempInBand(r.latest_temp_c, r.min_c, r.max_c)
          return (
            <span className={ok === false ? 'font-semibold text-rose-600' : 'font-medium text-sand-700'}>
              {fmtTemp(r.latest_temp_c)}
            </span>
          )
        },
      },
      {
        key: 'band',
        label: 'Safe band',
        sortable: false,
        render: (r) => (
          <span className="text-xs text-sand-500">
            {r.min_c}° to {r.max_c}°
          </span>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (r) => <Pill tone={priorityTone(r.priority)}>{humanise(r.priority)}</Pill>,
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => <Pill tone={statusTone(r.status)}>{humanise(r.status)}</Pill>,
      },
      { key: 'eta', label: 'ETA', render: (r) => <span className="text-xs text-sand-500">{fmtDateTime(r.eta)}</span> },
    ],
    [],
  )

  const submit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        quantity: form.quantity === '' ? null : Number(form.quantity),
        min_c: Number(form.min_c),
        max_c: Number(form.max_c),
      }
      await shipmentsApi.create(payload)
      toast.success('Shipment created')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <SectionTitle
        title="Shipments"
        subtitle="Every cold-chain movement with its live temperature band"
        icon={Truck}
        action={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New shipment
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        pageSize={10}
        searchKeys={['code', 'origin_code', 'destination_code', 'carrier']}
        searchPlaceholder="Search by code, lane or carrier…"
        emptyMessage="No shipments yet — create one to get started"
        actions={<span className="text-sm text-sand-500">{rows.length} total</span>}
        onRowClick={(row) => navigate(`/shipments/${row.id}`)}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a shipment"
        width="max-w-2xl"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" form="shipment-form" type="submit">
              Create shipment
            </button>
          </>
        }
      >
        <form id="shipment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Origin facility</label>
            <select className="input" required value={form.origin_code} onChange={(e) => setForm({ ...form, origin_code: e.target.value })}>
              <option value="">Select origin…</option>
              {facilityList.map((f) => (
                <option key={f.id} value={f.code}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Destination facility</label>
            <select className="input" required value={form.destination_code} onChange={(e) => setForm({ ...form, destination_code: e.target.value })}>
              <option value="">Select destination…</option>
              {facilityList.map((f) => (
                <option key={f.id} value={f.code}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Product</label>
            <select className="input" value={form.product_sku} onChange={(e) => setForm({ ...form, product_sku: e.target.value })}>
              <option value="">Optional…</option>
              {productList.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Carrier</label>
            <input className="input" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="ThermoMove" />
          </div>
          <div>
            <label className="label">Vehicle number</label>
            <input className="input" value={form.vehicle_no} onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })} placeholder="KA01AB1234" />
          </div>
          <div>
            <label className="label">Driver</label>
            <input className="input" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} placeholder="Arun Kumar" />
          </div>
          <div>
            <label className="label">Minimum safe temperature (°C)</label>
            <input type="number" step="0.1" className="input" value={form.min_c} onChange={(e) => setForm({ ...form, min_c: e.target.value })} />
          </div>
          <div>
            <label className="label">Maximum safe temperature (°C)</label>
            <input type="number" step="0.1" className="input" value={form.max_c} onChange={(e) => setForm({ ...form, max_c: e.target.value })} />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="1200" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['low', 'normal', 'high', 'critical'].map((p) => (
                <option key={p} value={p}>
                  {humanise(p)}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
