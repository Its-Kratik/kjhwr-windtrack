import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts'
import { getAccuracy, getLatestForecast } from '../services/api'
import { formatMW, formatMWShort, formatTime, formatDate, accuracyColor, biasColor, biasLabel } from '../services/utils'
import { TrendingUp, AlertTriangle, Target, Activity, Info } from 'lucide-react'

/* ── Custom Tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
            {Math.round(p.value).toLocaleString()} MW
          </strong>
        </div>
      ))}
    </div>
  )
}

/* ── Metric Card ────────────────────────────────────────────── */
function MetricCard({ label, value, unit, icon: Icon, variant = '', subtitle }) {
  return (
    <div className={`metric-card animate-in ${variant}`}>
      <div className="metric-label">{label}</div>
      <div>
        <span className="metric-value">{value ?? '—'}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</div>}
      {Icon && <div className="metric-icon"><Icon size={28} /></div>}
    </div>
  )
}

export default function Dashboard() {
  const [accuracy, setAccuracy] = useState(null)
  const [latestForecast, setLatestForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [accRes, fcRes] = await Promise.all([
          getAccuracy('2026-01-01', '2026-01-31'),
          getLatestForecast(),
        ])
        setAccuracy(accRes.data)
        setLatestForecast(fcRes.data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="page">
      <div className="loading-state">
        <div className="spinner" />
        <p>Fetching January 2026 wind data from Elexon BMRS…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="page">
      <div className="info-box amber">
        <AlertTriangle size={16} className="info-icon" />
        <div>Failed to load data: {error}. Please check that the backend is running.</div>
      </div>
    </div>
  )

  const overall = accuracy?.overall || {}
  const daily = accuracy?.daily || []
  const fcData = latestForecast?.data || []

  // Chart data: daily RMSE trend
  const dailyChart = daily.map(d => ({
    date: d.date?.slice(5),  // "MM-DD"
    mae: d.mae_mw,
    rmse: d.rmse_mw,
    bias: d.bias_mw,
  }))

  // Latest forecast chart
  const fcChart = fcData.slice(0, 48).map(r => ({
    time: formatTime(r.startTime),
    forecast: r.generation,
  }))

  return (
    <div className="page animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <span>WindTrack</span>
          <span>›</span>
          <span className="accent">Overview</span>
        </div>
        <h2>Wind Power Intelligence Dashboard</h2>
        <p>January 2026 · National Grid UK · Elexon BMRS data · Day-ahead procurement analytics</p>
      </div>

      {/* Info banner */}
      <div className="info-box blue animate-in stagger-1">
        <Info size={16} className="info-icon" />
        <div>
          This dashboard supports the <strong>day-ahead electricity procurement team</strong>. Metrics cover{' '}
          <strong>{overall.count?.toLocaleString() ?? '—'}</strong> matched actual/forecast pairs for January 2026.
          Forecasts are paired using the most recent WINDFOR publish before <strong>11:00 UTC</strong> on the day prior to delivery.
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="metrics-grid animate-in stagger-2">
        <MetricCard
          label="MAE (Mean Abs. Error)"
          value={overall.mae_mw != null ? Math.round(overall.mae_mw).toLocaleString() : '—'}
          unit="MW"
          icon={Target}
          subtitle="Average magnitude of forecast error"
        />
        <MetricCard
          label="RMSE"
          value={overall.rmse_mw != null ? Math.round(overall.rmse_mw).toLocaleString() : '—'}
          unit="MW"
          icon={Activity}
          variant=""
          subtitle="Penalises large errors more than MAE"
        />
        <MetricCard
          label="MAPE"
          value={overall.mape_pct != null ? overall.mape_pct.toFixed(1) : '—'}
          unit="%"
          icon={TrendingUp}
          variant={overall.mape_pct <= 10 ? 'green' : overall.mape_pct <= 20 ? 'amber' : 'red'}
          subtitle="Mean Absolute Percentage Error"
        />
        <MetricCard
          label="Forecast Bias"
          value={overall.bias_mw != null ? (overall.bias_mw > 0 ? '+' : '') + Math.round(overall.bias_mw).toLocaleString() : '—'}
          unit="MW"
          icon={AlertTriangle}
          variant={Math.abs(overall.bias_mw || 0) < 100 ? 'green' : 'amber'}
          subtitle={biasLabel(overall.bias_mw)}
        />
        <MetricCard
          label="nMAE"
          value={overall.nmae_pct != null ? overall.nmae_pct.toFixed(1) : '—'}
          unit="%"
          subtitle="Normalised MAE (% of mean actual)"
        />
        <MetricCard
          label="Matched Pairs"
          value={accuracy?.matched_count?.toLocaleString() ?? '—'}
          subtitle="Actual/forecast slot pairs in Jan 2026"
        />
      </div>

      {/* Charts row */}
      <div className="grid-2 animate-in stagger-3">
        {/* Daily Error Trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daily Forecast Error — January 2026</div>
              <div className="card-subtitle">MAE and RMSE in MW per day</div>
            </div>
          </div>
          {dailyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyChart} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={overall.mae_mw} stroke="var(--accent-primary)" strokeDasharray="4 4" label={{ value: 'Avg MAE', fill: 'var(--accent-primary)', fontSize: 10 }} />
                <Line type="monotone" dataKey="mae" stroke="var(--accent-primary)" strokeWidth={2} dot={false} name="MAE" />
                <Line type="monotone" dataKey="rmse" stroke="var(--accent-secondary)" strokeWidth={2} dot={false} name="RMSE" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No daily data</p></div>}
        </div>

        {/* Latest Forecast */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Latest Available Forecast</div>
              <div className="card-subtitle">
                Published: {latestForecast?.publishTime ? formatTime(latestForecast.publishTime, true) + ' UTC' : '—'}
              </div>
            </div>
            <span className="badge badge-blue">Live</span>
          </div>
          {fcChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={fcChart} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="forecast" stroke="var(--accent-green)" strokeWidth={2.5} dot={false} name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No forecast data</p></div>}
        </div>
      </div>

      {/* Daily Summary Table */}
      <div className="card animate-in stagger-4" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Daily Accuracy Breakdown — January 2026</div>
            <div className="card-subtitle">Each row is one delivery day; forecasts paired at day-ahead gate</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Slots</th>
                <th>Mean Actual</th>
                <th>Mean Forecast</th>
                <th>MAE (MW)</th>
                <th>RMSE (MW)</th>
                <th>Bias (MW)</th>
                <th>MAPE (%)</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}>
                  <td style={{ color: 'var(--text-primary)', fontFamily: 'Inter' }}>{d.date}</td>
                  <td>{d.count}</td>
                  <td>{d.mean_actual_mw != null ? Math.round(d.mean_actual_mw).toLocaleString() : '—'}</td>
                  <td>{d.mean_forecast_mw != null ? Math.round(d.mean_forecast_mw).toLocaleString() : '—'}</td>
                  <td>{d.mae_mw != null ? Math.round(d.mae_mw).toLocaleString() : '—'}</td>
                  <td>{d.rmse_mw != null ? Math.round(d.rmse_mw).toLocaleString() : '—'}</td>
                  <td style={{ color: biasColor(d.bias_mw) }}>
                    {d.bias_mw != null ? (d.bias_mw > 0 ? '+' : '') + Math.round(d.bias_mw) : '—'}
                  </td>
                  <td>
                    <span style={{ color: accuracyColor(d.mape_pct), fontWeight: 600 }}>
                      {d.mape_pct != null ? d.mape_pct.toFixed(1) + '%' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
