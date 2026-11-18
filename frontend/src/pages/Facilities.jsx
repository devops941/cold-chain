import { useEffect, useState } from 'react'
import { MapPin, Plus, Trash2, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { facilities as facilitiesApi } from '../api/endpoints'
import DataTable from '../components/DataTable'
import { Modal, Pill, SectionTitle } from '../components/ui/Primitives'
import { humanise } from '../lib/format'

const EMPTY = { name: '', code: '', type: 'warehouse', city: '', country: 'India', capacity_pallets: '' }

export default function Facilities() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const load = () => facilitiesApi.list().then(setRows).catch((e) => toast.error(e.message))
  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      await facilitiesApi.create({
        ...form,
        capacity_pallets: form.capacity_pallets === '' ? null : Number(form.capacity_pallets),
      })
      toast.success('Facility added')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const remove = async (id) => {
    try {
      await facilitiesApi.remove(id)
      toast.success('Facility removed')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    { key: 'code', label: 'Code', render: (r) => <span className="font-semibold text-sand-800">{r.code}</span> },
    { key: 'name', label: 'Facility' },
    { key: 'type', label: 'Type', render: (r) => <Pill tone="bg-grape-100 text-grape-700">{humanise(r.type)}</Pill> },
    { key: 'city', label: 'Location', render: (r) => <span className="flex items-center gap-1 text-sand-600"><MapPin size={13} />{r.city || '—'}{r.country ? `, ${r.country}` : ''}</span> },
    { key: 'capacity_pallets', label: 'Capacity', render: (r) => (r.capacity_pallets ? `${r.capacity_pallets} pallets` : '—') },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (r) => (
        <button className="text-sand-400 transition hover:text-rose-600" onClick={() => remove(r.id)} title="Delete">
          <Trash2 size={16} />
        </button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <SectionTitle
        title="Facilities"
        subtitle="Warehouses, hubs, ports and cold stores in your network"
        icon={Warehouse}
        action={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New facility
          </button>
        }
      />

      <DataTable columns={columns} rows={rows} searchKeys={['code', 'name', 'city']} searchPlaceholder="Search facilities…" emptyMessage="No facilities yet" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a facility"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" form="facility-form" type="submit">Save facility</button>
          </>
        }
      >
        <form id="facility-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bengaluru Cold Hub" />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FAC-BLR-01" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['warehouse', 'hub', 'retail', 'cold_store', 'port'].map((t) => (
                <option key={t} value={t}>{humanise(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className="label">Capacity (pallets)</label>
            <input type="number" className="input" value={form.capacity_pallets} onChange={(e) => setForm({ ...form, capacity_pallets: e.target.value })} placeholder="5000" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
