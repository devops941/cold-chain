import { motion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`card p-5 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon size={20} />
          </span>
        )}
        <div>
          <h2 className="text-lg font-bold text-sand-800">{title}</h2>
          {subtitle && <p className="text-sm text-sand-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Pill({ children, tone = 'bg-sand-200 text-sand-700', className = '' }) {
  return <span className={`pill ${tone} ${className}`}>{children}</span>
}

export function EmptyState({ icon: Icon = AlertTriangle, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-sand-100 text-sand-400">
        <Icon size={26} />
      </span>
      <p className="text-base font-semibold text-sand-700">{title}</p>
      {hint && <p className="mt-1 max-w-md text-sm text-sand-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sand-500">
      <Loader2 className="animate-spin" size={18} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function StatTile({ label, value, hint, icon: Icon, tone = 'brand', delay = 0 }) {
  const tones = {
    brand: 'from-brand-500/12 to-brand-500/0 text-brand-700',
    mint: 'from-mint-500/12 to-mint-500/0 text-mint-700',
    sun: 'from-sun-500/14 to-sun-500/0 text-sun-700',
    rose: 'from-rose-500/12 to-rose-500/0 text-rose-700',
    grape: 'from-grape-500/12 to-grape-500/0 text-grape-700',
    tangerine: 'from-tangerine-500/14 to-tangerine-500/0 text-tangerine-700',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover relative overflow-hidden p-5"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tones[tone]}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sand-500">{label}</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-sand-800">{value}</p>
          {hint && <p className="mt-1 text-xs text-sand-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-soft ${tones[tone].split(' ').pop()}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </motion.div>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sand-900/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-lift`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-sand-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sand-400 transition hover:bg-sand-100 hover:text-sand-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </motion.div>
    </div>
  )
}
