import { useEffect, useState } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Area
} from 'recharts'
import { getForecastComparison } from '../services/api'
import { formatTime, formatDate } from '../services/utils'
import { Wind, Calendar, AlertTriangle } from 'lucide-react'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label} UTC</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
            {p.value != null ? Math.round(p.value).toLocaleString() + ' MW' : '—'}
          </strong>
        </div>
      ))}
    </div>
  )
}

// January 2026 dates for selector
const JAN_DATES = Array.from({ length: 31 }, (_, i) => {
  const d = new Date(2026, 0, i + 1)
  return d.toISOString().slice(0, 10)
})

export default function ForecastView() {
  const [selectedDate, setSelectedDate] = useState('2026-01-15')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load(date) {
    setLoading(true)
    setError(null)
    try {
      const res = await getForecastComparison(date)
      setData(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedDate) }, [selectedDate])

  const timeline = data?.timeline || []
  const forecastRuns = data?.forecastRuns || []

  // Build chart data with error band
  const chartData = timeline.map(r => ({
    time: formatTime(r.startTime),
    actual: r.actual,
    forecast: r.forecast,
    error: r.forecast != null && r.actual != null ? r.forecast - r.actual : null,
    absError: r.forecast != null && r.actual != null ? Math.abs(r.forecast - r.actual) : null,
  }))

  // Stats
  const paired = chartData.filter(r => r.actual != null && r.forecast != null)
  const mae = paired.length ? paired.reduce((s, r) => s + r.absError, 0) / paired.length : null
  const maxActual = paired.length ? Math.max(...paired.map(r => r.actual)) : null
  const maxForecast = paired.length ? Math.max(...paired.map(r => r.forecast)) : null

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div className="breadcrumb">
          <span>WindTrack</span> <span>›</span>
          <span className="accent">Forecast View</span>
        </div>
        <h2>Forecast vs Actual — Half-Hourly</h2>
        <p>Select a January 2026 delivery day to compare the day-ahead forecast with actual generation</p>
      </div>

      {/* Date selector */}
      <div className="card animate-in stagger-1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Delivery date:</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {JAN_DATES.map(d => (
              <button
                key={d}
                id={`date-btn-${d}`}
                onClick={() => setSelectedDate(d)}
                className={`btn ${selectedDate === d ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {d.slice(8)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading {selectedDate} data…</p>
        </div>
      )}

      {error && (
        <div className="info-box amber animate-in">
          <AlertTriangle size={16} className="info-icon" />
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary metrics */}
          <div className="metrics-grid animate-in stagger-2">
            <div className="metric-card">
              <div className="metric-label">Delivery Date</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>{selectedDate}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">MAE (this day)</div>
              <div className="metric-value">{mae != null ? Math.round(mae).toLocaleString() : '—'}</div>
              <span className="metric-unit">MW</span>
            </div>
            <div className="metric-card">
              <div className="metric-label">Peak Actual</div>
              <div className="metric-value">{maxActual != null ? Math.round(maxActual).toLocaleString() : '—'}</div>
              <span className="metric-unit">MW</span>
            </div>
            <div className="metric-card">
              <div className="metric-label">Peak Forecast</div>
              <div className="metric-value">{maxForecast != null ? Math.round(maxForecast).toLocaleString() : '—'}</div>
              <span className="metric-unit">MW</span>
            </div>
            <div className="metric-card">
              <div className="metric-label">Forecast Runs (prev day)</div>
              <div className="metric-value">{forecastRuns.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Published the day before</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Matched Slots</div>
              <div className="metric-value">{paired.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>of {timeline.length} total</div>
            </div>
          </div>

          {/* Main chart: Actual vs Forecast */}
          <div className="card animate-in stagger-3">
            <div className="card-header">
              <div>
                <div className="card-title">Wind Generation: Actual vs Day-Ahead Forecast</div>
                <div className="card-subtitle">{selectedDate} · 30-minute intervals · MW</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="badge badge-blue">
                  <span style={{ width: 8, height: 2, background: 'var(--accent-primary)', display: 'inline-block', borderRadius: 1 }} />
                  Actual
                </span>
                <span className="badge badge-green">
                  <span style={{ width: 8, height: 2, background: 'var(--accent-green)', display: 'inline-block', borderRadius: 1, borderStyle: 'dashed' }} />
                  Forecast
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="actual" stroke="var(--accent-primary)" fill="rgba(0,212,255,0.08)" strokeWidth={2.5} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="var(--accent-green)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🌬️</div>
                <p>No data available for this date</p>
              </div>
            )}
          </div>

          {/* Error chart */}
          {paired.length > 0 && (
            <div className="card animate-in stagger-4" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Forecast Error (Forecast − Actual)</div>
                  <div className="card-subtitle">Positive = over-forecast (more wind than expected), Negative = under-forecast</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="error" fill="var(--accent-secondary)" opacity={0.8} radius={[2,2,0,0]} name="Error (F−A)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Forecast runs table */}
          {forecastRuns.length > 0 && (
            <div className="card animate-in stagger-5" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div className="card-title">Forecast Runs Available (Published Previous Day)</div>
                <div className="card-subtitle">All WINDFOR publish timestamps from the day before delivery</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Publish Time (UTC)</th>
                      <th>Data Points</th>
                      <th>Peak Forecast (MW)</th>
                      <th>Min Forecast (MW)</th>
                      <th>Used for Procurement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastRuns.map((run, i) => {
                      const pub = new Date(run.publishTime)
                      const isUsed = pub.getUTCHours() < 11
                      const isLatestUsed = isUsed && !forecastRuns.slice(i + 1).some(r => new Date(r.publishTime).getUTCHours() < 11)
                      const gens = run.data.map(r => r.generation).filter(Boolean)
                      return (
                        <tr key={run.publishTime}>
                          <td style={{ color: 'var(--text-primary)', fontFamily: 'Inter' }}>
                            {run.publishTime.replace('T', ' ').slice(0, 19)}
                          </td>
                          <td>{run.data.length}</td>
                          <td>{gens.length ? Math.max(...gens).toLocaleString() : '—'}</td>
                          <td>{gens.length ? Math.min(...gens).toLocaleString() : '—'}</td>
                          <td>
                            {isLatestUsed
                              ? <span className="badge badge-green">✓ Selected</span>
                              : isUsed
                                ? <span className="badge badge-blue">Within window</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>After cutoff</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
