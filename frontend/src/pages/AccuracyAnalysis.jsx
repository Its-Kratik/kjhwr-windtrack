import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, BarChart, Bar, Cell, LineChart, Line
} from 'recharts'
import { getAccuracy } from '../services/api'
import { formatDate, accuracyColor, biasColor } from '../services/utils'
import { BarChart3, AlertTriangle, CheckCircle } from 'lucide-react'

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{d.startTime?.slice(0, 16).replace('T', ' ')} UTC</div>
      <div className="tooltip-row">
        <div className="tooltip-dot" style={{ background: 'var(--accent-primary)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Actual:</span>
        <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{Math.round(d.actual).toLocaleString()} MW</strong>
      </div>
      <div className="tooltip-row">
        <div className="tooltip-dot" style={{ background: 'var(--accent-green)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Forecast:</span>
        <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{Math.round(d.forecast).toLocaleString()} MW</strong>
      </div>
      <div className="tooltip-row">
        <div className="tooltip-dot" style={{ background: 'var(--accent-amber)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Error:</span>
        <strong style={{ fontFamily: 'JetBrains Mono', color: d.error > 0 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
          {d.error > 0 ? '+' : ''}{Math.round(d.error).toLocaleString()} MW
        </strong>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{p.value != null ? (typeof p.value === 'number' ? (p.value > 0 ? '+' : '') + Math.round(p.value) : p.value) : '—'}</strong>
        </div>
      ))}
    </div>
  )
}

export default function AccuracyAnalysis() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('scatter')

  useEffect(() => {
    getAccuracy('2026-01-01', '2026-01-31')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading-state"><div className="spinner" /><p>Computing accuracy metrics…</p></div></div>
  if (error) return <div className="page"><div className="info-box amber"><AlertTriangle size={16} className="info-icon" /><div>{error}</div></div></div>

  const overall = data?.overall || {}
  const daily = data?.daily || []
  const pairs = (data?.pairs || []).slice(0, 1500) // cap for scatter performance

  // Scatter: actual vs forecast
  const scatterData = pairs.map(p => ({
    actual: p.actual,
    forecast: p.forecast,
    error: p.error,
    startTime: p.startTime,
  }))

  // Histogram of errors
  const errors = pairs.map(p => p.error)
  const bins = 20
  const minErr = Math.min(...errors), maxErr = Math.max(...errors)
  const binSize = (maxErr - minErr) / bins
  const histogramData = Array.from({ length: bins }, (_, i) => {
    const lo = minErr + i * binSize
    const hi = lo + binSize
    const count = errors.filter(e => e >= lo && (i === bins - 1 ? e <= hi : e < hi)).length
    return { range: `${Math.round(lo)}`, count, lo, hi }
  })

  // Daily bias
  const biasData = daily.map(d => ({
    date: d.date?.slice(8),
    bias: d.bias_mw,
    mae: d.mae_mw,
  }))

  // MAPE quality assessment
  const mapeThresholds = [
    { label: 'Excellent (≤5%)', count: daily.filter(d => d.mape_pct <= 5).length, color: 'var(--accent-green)' },
    { label: 'Good (5–10%)', count: daily.filter(d => d.mape_pct > 5 && d.mape_pct <= 10).length, color: 'var(--accent-primary)' },
    { label: 'Moderate (10–20%)', count: daily.filter(d => d.mape_pct > 10 && d.mape_pct <= 20).length, color: 'var(--accent-amber)' },
    { label: 'Poor (>20%)', count: daily.filter(d => d.mape_pct > 20).length, color: 'var(--accent-red)' },
  ]

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div className="breadcrumb"><span>WindTrack</span> <span>›</span> <span className="accent">Accuracy Analysis</span></div>
        <h2>Forecast Accuracy Analysis</h2>
        <p>January 2026 · Quantified accuracy of day-ahead WINDFOR forecasts vs FUELHH actuals</p>
      </div>

      {/* Summary Metrics */}
      <div className="metrics-grid animate-in stagger-1">
        <div className="metric-card green">
          <div className="metric-label">MAE</div>
          <div className="metric-value">{overall.mae_mw != null ? Math.round(overall.mae_mw).toLocaleString() : '—'}<span className="metric-unit">MW</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Mean absolute error</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">RMSE</div>
          <div className="metric-value">{overall.rmse_mw != null ? Math.round(overall.rmse_mw).toLocaleString() : '—'}<span className="metric-unit">MW</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Root mean square error</div>
        </div>
        <div className={`metric-card ${overall.mape_pct <= 10 ? 'green' : overall.mape_pct <= 20 ? 'amber' : 'red'}`}>
          <div className="metric-label">MAPE</div>
          <div className="metric-value">{overall.mape_pct != null ? overall.mape_pct.toFixed(2) : '—'}<span className="metric-unit">%</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Mean abs. percentage error</div>
        </div>
        <div className={`metric-card ${Math.abs(overall.bias_mw || 0) < 100 ? 'green' : 'amber'}`}>
          <div className="metric-label">Bias</div>
          <div className="metric-value">
            {overall.bias_mw != null ? (overall.bias_mw > 0 ? '+' : '') + Math.round(overall.bias_mw) : '—'}
            <span className="metric-unit">MW</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {overall.bias_mw > 0 ? 'Systematic over-forecast' : overall.bias_mw < 0 ? 'Systematic under-forecast' : 'No systematic bias'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">nMAE</div>
          <div className="metric-value">{overall.nmae_pct != null ? overall.nmae_pct.toFixed(2) : '—'}<span className="metric-unit">%</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Normalised by mean actual</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">nRMSE</div>
          <div className="metric-value">{overall.nrmse_pct != null ? overall.nrmse_pct.toFixed(2) : '—'}<span className="metric-unit">%</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Normalised RMSE</div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="info-box blue animate-in stagger-2">
        <CheckCircle size={16} className="info-icon" style={{ color: 'var(--accent-primary)' }} />
        <div>
          <strong>Procurement Implication:</strong> With a MAE of ~{overall.mae_mw != null ? Math.round(overall.mae_mw).toLocaleString() : '?'} MW,
          procurement decisions carry that level of wind uncertainty per half-hour slot.
          {overall.bias_mw != null && Math.abs(overall.bias_mw) > 50 &&
            ` The ${overall.bias_mw > 0 ? 'positive' : 'negative'} bias of ${Math.round(Math.abs(overall.bias_mw))} MW suggests forecasts are systematically
             ${overall.bias_mw > 0 ? 'over-estimating' : 'under-estimating'} wind output — consider applying a correction offset to procurement decisions.`}
        </div>
      </div>

      {/* Day quality breakdown */}
      <div className="card animate-in stagger-2" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Daily MAPE Quality Classification</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {mapeThresholds.map(t => (
            <div key={t.label} style={{
              flex: '1 1 140px',
              background: 'var(--bg-glass)',
              border: `1px solid ${t.color}33`,
              borderRadius: 10,
              padding: '14px 18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: t.color, fontFamily: 'JetBrains Mono' }}>{t.count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart tabs */}
      <div className="tabs animate-in stagger-3">
        {['scatter', 'histogram', 'bias', 'daily-mape'].map(t => (
          <button key={t} id={`tab-${t}`} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ scatter: 'Scatter Plot', histogram: 'Error Distribution', bias: 'Daily Bias', 'daily-mape': 'MAPE Trend' }[t]}
          </button>
        ))}
      </div>

      <div className="card animate-in stagger-4">
        {tab === 'scatter' && (
          <>
            <div className="card-header">
              <div>
                <div className="card-title">Actual vs Forecast Scatter</div>
                <div className="card-subtitle">Points on the diagonal = perfect forecast · colour = error magnitude</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="actual" name="Actual" type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={{ value: 'Actual (MW)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis dataKey="forecast" name="Forecast" type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={{ value: 'Forecast (MW)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip content={<ScatterTooltip />} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 25000, y: 25000 }]} stroke="var(--accent-primary)" strokeDasharray="6 3" label={{ value: 'Perfect', fill: 'var(--accent-primary)', fontSize: 10 }} />
                <Scatter
                  data={scatterData}
                  fill="var(--accent-secondary)"
                  opacity={0.5}
                  r={3}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'histogram' && (
          <>
            <div className="card-header">
              <div>
                <div className="card-title">Error Distribution (Forecast − Actual)</div>
                <div className="card-subtitle">Distribution centred near zero = unbiased forecast</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={histogramData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} label={{ value: 'Error (MW)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 12 }} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Frequency">
                  {histogramData.map((entry, index) => (
                    <Cell key={index} fill={entry.lo < 0 ? 'var(--accent-red)' : 'var(--accent-green)'} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'bias' && (
          <>
            <div className="card-header">
              <div>
                <div className="card-title">Daily Forecast Bias</div>
                <div className="card-subtitle">Positive = over-forecast, Negative = under-forecast</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={biasData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltip />} />
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
                <Bar dataKey="bias" radius={[3, 3, 0, 0]} name="Daily Bias (MW)">
                  {biasData.map((entry, i) => (
                    <Cell key={i} fill={entry.bias >= 0 ? 'var(--accent-amber)' : 'var(--accent-secondary)'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'daily-mape' && (
          <>
            <div className="card-header">
              <div>
                <div className="card-title">Daily MAPE Trend — January 2026</div>
                <div className="card-subtitle">Green ≤5%, Amber 5–15%, Red &gt;15%</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily.map(d => ({ date: d.date?.slice(8), mape: d.mape_pct }))} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltip />} />
                <ReferenceLine y={5} stroke="var(--accent-green)" strokeDasharray="4 4" label={{ value: '5%', fill: 'var(--accent-green)', fontSize: 10 }} />
                <ReferenceLine y={15} stroke="var(--accent-amber)" strokeDasharray="4 4" label={{ value: '15%', fill: 'var(--accent-amber)', fontSize: 10 }} />
                <Line type="monotone" dataKey="mape" stroke="var(--accent-primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--accent-primary)' }} name="MAPE (%)" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
