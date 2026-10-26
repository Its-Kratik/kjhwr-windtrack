/**
 * Utility helpers for the Wind Power Dashboard
 */

/**
 * Format a UTC ISO string to a human-readable UK local time label.
 * e.g. "2026-01-01T10:00:00Z" → "10:00"
 */
export function formatTime(isoStr, includeDate = false) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (includeDate) {
    return d.toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' })
}

/**
 * Format MW value with thousands separator
 */
export function formatMW(value) {
  if (value == null || isNaN(value)) return '—'
  return `${Math.round(value).toLocaleString('en-GB')} MW`
}

export function formatMWShort(value) {
  if (value == null || isNaN(value)) return '—'
  const v = Math.round(value)
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toLocaleString('en-GB')
}

/**
 * Determine colour based on accuracy metric thresholds (for MAPE %)
 */
export function accuracyColor(mape) {
  if (mape == null) return 'var(--text-muted)'
  if (mape <= 5) return 'var(--accent-green)'
  if (mape <= 15) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

export function biasLabel(bias) {
  if (bias == null) return '—'
  if (Math.abs(bias) < 50) return 'Neutral'
  return bias > 0 ? 'Over-forecast' : 'Under-forecast'
}

export function biasColor(bias) {
  if (bias == null) return 'var(--text-muted)'
  if (Math.abs(bias) < 50) return 'var(--accent-green)'
  return 'var(--accent-amber)'
}

/**
 * Generate tick values for a recharts axis, returning an array of formatted time labels
 * mapped to a data array indexed by position.
 */
export function everyNth(arr, n) {
  return arr.filter((_, i) => i % n === 0)
}

/**
 * Build a colour-coded error band for the scatter plot.
 * Returns 'green', 'amber', or 'red' based on absolute relative error.
 */
export function errorBand(actual, forecast) {
  if (!actual || actual === 0) return 'var(--text-muted)'
  const relErr = Math.abs((forecast - actual) / actual) * 100
  if (relErr <= 5) return 'var(--accent-green)'
  if (relErr <= 15) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}
