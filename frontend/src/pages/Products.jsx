import { useEffect, useState } from 'react'
import { Boxes, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { products as productsApi } from '../api/endpoints'
import DataTable from '../components/DataTable'
import { Modal, Pill, SectionTitle } from '../components/ui/Primitives'
import { humanise } from '../lib/format'

const EMPTY = { sku: '', name: '', category: 'pharma', unit: 'box', min_c: 2, max_c: 8, shelf_life_days: '' }

export default function Products() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const load = () => productsApi.list().then(setRows).catch((e) => toast.error(e.message))
  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      await productsApi.create({
        ...form,
        min_c: Number(form.min_c),
        max_c: Number(form.max_c),
        shelf_life_days: form.shelf_life_days === '' ? null : Number(form.shelf_life_days),
      })
      toast.success('Product added')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const remove = async (id) => {
    try {
      await productsApi.remove(id)
      toast.success('Product removed')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-semibold text-sand-800">{r.sku}</span> },
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category', render: (r) => <Pill tone="bg-brand-100 text-brand-800">{humanise(r.category)}</Pill> },
    { key: 'unit', label: 'Unit' },
    { key: 'band', label: 'Safe band', sortable: false, render: (r) => <span className="text-sand-600">{r.min_c}° to {r.max_c}°C</span> },
    { key: 'shelf_life_days', label: 'Shelf life', render: (r) => (r.shelf_life_days ? `${r.shelf_life_days} d` : '—') },
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
        title="Products"
        subtitle="Catalogue of goods and the temperature band each requires"
        icon={Boxes}
        action={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New product
          </button>
        }
      />

      <DataTable columns={columns} rows={rows} searchKeys={['sku', 'name', 'category']} searchPlaceholder="Search products…" emptyMessage="No products yet" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a product"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" form="product-form" type="submit">Save product</button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">SKU</label>
            <input className="input" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-VAC-001" />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mRNA Vaccine Vial" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['pharma', 'dairy', 'frozen', 'seafood', 'produce', 'meat', 'general'].map((c) => (
                <option key={c} value={c}>{humanise(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="box" />
          </div>
          <div>
            <label className="label">Minimum temperature (°C)</label>
            <input type="number" step="0.1" className="input" value={form.min_c} onChange={(e) => setForm({ ...form, min_c: e.target.value })} />
          </div>
          <div>
            <label className="label">Maximum temperature (°C)</label>
            <input type="number" step="0.1" className="input" value={form.max_c} onChange={(e) => setForm({ ...form, max_c: e.target.value })} />
          </div>
          <div>
            <label className="label">Shelf life (days)</label>
            <input type="number" className="input" value={form.shelf_life_days} onChange={(e) => setForm({ ...form, shelf_life_days: e.target.value })} placeholder="180" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
