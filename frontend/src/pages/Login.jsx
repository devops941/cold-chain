import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Snowflake, ShieldCheck, Snowflake as Flake, TrendingDown, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../store/auth'

const DEMO = [
  { label: 'Admin', email: 'admin@coldchain.io', password: 'admin123' },
  { label: 'Manager', email: 'manager@coldchain.io', password: 'manager123' },
  { label: 'Operator', email: 'operator@coldchain.io', password: 'operator123' },
]

export default function Login() {
  const { login, register, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register({ name: form.name, email: form.email, password: form.password })
      toast.success('Welcome to Cold Chain')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / value panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-mint-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-grape-500/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Snowflake size={24} />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-none">Cold Chain</p>
            <p className="text-sm text-white/70">Temperature-Controlled Logistics</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Keep every degree under control.
          </h1>
          <p className="mt-3 text-white/80">
            Monitor live temperatures, catch excursions early and prove compliance across your
            entire cold-chain network — from farm to pharmacy.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              { icon: TrendingDown, title: 'Live excursion alerts', text: 'Know the moment a shipment leaves its safe band.' },
              { icon: Truck, title: 'Shipment visibility', text: 'Track every lane, carrier and vehicle in one place.' },
              { icon: ShieldCheck, title: 'Audit-ready records', text: 'Complete telemetry history and alert trail.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                  <f.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-white/70">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          Built for pharmaceutical, dairy, frozen and vaccine distribution teams.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Flake size={22} />
            </span>
            <span className="font-display text-xl font-extrabold text-sand-800">Cold Chain</span>
          </div>

          <h2 className="font-display text-2xl font-extrabold text-sand-800">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-sand-500">
            {mode === 'login'
              ? 'Use a demo account below or your own credentials.'
              : 'The first account created becomes the administrator.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ada Lovelace"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-sand-500">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              className="font-semibold text-brand-700 hover:underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {mode === 'login' && (
            <div className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-400">
                Quick demo logins
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    onClick={() => setForm({ ...form, email: d.email, password: d.password })}
                    className="btn btn-ghost !py-2 text-xs"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
