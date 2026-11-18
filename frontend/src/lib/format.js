import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const fmtDate = (value) => {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export const fmtDateTime = (value) => {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM yyyy · HH:mm')
  } catch {
    return '—'
  }
}

export const fmtAgo = (value) => {
  if (!value) return '—'
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true })
  } catch {
    return '—'
  }
}

export const fmtNumber = (value) =>
  value === null || value === undefined ? '—' : new Intl.NumberFormat().format(value)

export const fmtTemp = (value) =>
  value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}°C`

export const statusTone = (status) =>
  ({
    in_transit: 'bg-brand-100 text-brand-800',
    delivered: 'bg-mint-100 text-mint-700',
    delayed: 'bg-sun-100 text-sun-700',
    planned: 'bg-sand-200 text-sand-700',
    cancelled: 'bg-rose-100 text-rose-700',
  })[status] || 'bg-sand-200 text-sand-700'

export const priorityTone = (priority) =>
  ({
    critical: 'bg-rose-100 text-rose-700',
    high: 'bg-tangerine-100 text-tangerine-700',
    normal: 'bg-brand-100 text-brand-800',
    low: 'bg-sand-200 text-sand-600',
  })[priority] || 'bg-sand-200 text-sand-600'

export const severityTone = (severity) =>
  ({
    critical: 'bg-rose-100 text-rose-700',
    warning: 'bg-sun-100 text-sun-700',
    info: 'bg-brand-100 text-brand-800',
  })[severity] || 'bg-sand-200 text-sand-600'

export const humanise = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** Is a temperature reading inside the shipment band? */
export const tempInBand = (temp, min, max) => {
  if (temp === null || temp === undefined) return null
  if (min !== null && min !== undefined && temp < min) return false
  if (max !== null && max !== undefined && temp > max) return false
  return true
}
