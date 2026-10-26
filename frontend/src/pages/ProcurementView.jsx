import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { getProcurementView, getAccuracy } from '../services/api'
import { formatTime } from '../services/utils'
import { ShoppingCart, AlertTriangle, Info, TrendingDown, Zap } from 'lucide-react'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label} UTC</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            {Math.round(p.value).toLocaleString()} MW
          </strong>
        </div>
      ))}
    </div>
  )
}

// January 2026 dates (decisions made on these dates, for next-day delivery)
const DECISION_DATES = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 0, i + 1)
  return d.toISOString().slice(0, 10)
})

// Assumed typical demand (rough UK winter estimate) for context
const TYPICAL_DEMAND_MW = 38000

export default function ProcurementView() {
  const [selectedDate, setSelectedDate] = useState('2026-01-10')
  const [procData, setProcData] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch overall accuracy once
  useEffect(() => {
    getAccuracy('2026-01-01', '2026-01-31')
      .then(r => setAccuracy(r.data.overall))
      .catch(() => {})
  }, [])

  async function load(date) {
    setLoading(true)
    setError(null)
    try {
      const res = await getProcurementView(date)
      setProcData(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedDate) }, [selectedDate])

  const forecastGen = procData?.forecastedGeneration || []
  const chartData = forecastGen.map(r => ({
    time: formatTime(r.startTime),
    wind: r.generation,
    // Procurement need = demand - wind; rough illustration
    procure: Math.max(0, TYPICAL_DEMAND_MW - r.generation),
  }))

  const totalWind = procData?.totalExpectedMWh
  const totalProcure = forecastGen.length
    ? Math.round(forecastGen.reduce((s, r) => s + Math.max(0, TYPICAL_DEMAND_MW - (r.generation || 0)), 0) / 2)
    : null

  const coverage = totalWind != null
    ? ((totalWind / (TYPICAL_DEMAND_MW * 24)) * 100).toFixed(1)
    : null

  const maeMw = accuracy?.mae_mw
  const mapeStr = accuracy?.mape_pct?.toFixed(1)

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div className="breadcrumb"><span>WindTrack</span> <span>›</span> <span className="accent">Procurement View</span></div>
        <h2>Day-Ahead Procurement Decision Support</h2>
        <p>Select a decision date to see what wind forecast was available for next-day delivery planning</p>
      </div>

      {/* Context banner */}
      <div className="info-box blue animate-in stagger-1">
        <Info size={16} className="info-icon" />
        <div>
          <strong>How to use:</strong> Select a decision date (e.g. Jan 10). This shows the wind generation forecast
          that was available before 11:00 UTC on that date — the same information your team had when submitting
          bids in the UK day-ahead electricity market for <strong>next-day delivery</strong>.
          {maeMw && ` Based on January 2026 historical accuracy, expect an average error of ±${Math.round(maeMw).toLocaleString()} MW (MAPE ~${mapeStr}%).`}
        </div>
      </div>

      {/* Decision date selector */}
      <div className="card animate-in stagger-2" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Decision date (Jan 2026):</span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DECISION_DATES.map(d => (
              <button
                key={d}
                id={`proc-btn-${d}`}
                onClick={() => setSelectedDate(d)}
                className={`btn ${selectedDate === d ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 11px', fontSize: 12 }}
              >
                {d.slice(8)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><p>Loading procurement view for {selectedDate}…</p></div>}

      {error && (
        <div className="info-box amber animate-in">
          <AlertTriangle size={16} className="info-icon" />
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && procData && (
        <>
          {/* Summary */}
          <div className="metrics-grid animate-in stagger-3">
            <div className="metric-card">
              <div className="metric-label">Decision Date</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-primary)' }}>{procData.decisionDate}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Bids submitted this day</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Delivery Date</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-green)' }}>{procData.deliveryDate}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Day power is consumed</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Forecast Published</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                {procData.forecastPublishTime?.replace('T', ' ').slice(0, 19)} UTC
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Latest before 11:00 gate</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">Expected Wind (total day)</div>
              <div className="metric-value">{totalWind?.toLocaleString() ?? '—'}<span className="metric-unit">MWh</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Peak Wind Forecast</div>
              <div className="metric-value">{procData.peakForecastMW?.toLocaleString() ?? '—'}<span className="metric-unit">MW</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Min Wind Forecast</div>
              <div className="metric-value">{procData.minForecastMW?.toLocaleString() ?? '—'}<span className="metric-unit">MW</span></div>
            </div>
          </div>

          {/* Uncertainty banner */}
          {maeMw && (
            <div className="info-box amber animate-in stagger-3">
              <AlertTriangle size={16} className="info-icon" style={{ color: 'var(--accent-amber)' }} />
              <div>
                <strong>Uncertainty Note:</strong> Historical accuracy shows ±{Math.round(maeMw).toLocaleString()} MW MAE per slot.
                Peak forecast of {procData.peakForecastMW?.toLocaleString()} MW could realistically be between{' '}
                <strong>{Math.max(0, (procData.peakForecastMW || 0) - Math.round(maeMw)).toLocaleString()}</strong> and{' '}
                <strong>{((procData.peakForecastMW || 0) + Math.round(maeMw)).toLocaleString()}</strong> MW.
                Add buffer in procurement to cover downside wind scenarios.
              </div>
            </div>
          )}

          {/* Area chart: wind vs procurement need */}
          <div className="card animate-in stagger-4">
            <div className="card-header">
              <div>
                <div className="card-title">Forecasted Wind & Estimated Procurement Need</div>
                <div className="card-subtitle">
                  Delivery: {procData.deliveryDate} · Demand reference: ~{TYPICAL_DEMAND_MW.toLocaleString()} MW (typical UK winter)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="badge badge-green">
                  <Zap size={10} /> Wind Forecast
                </span>
                <span className="badge badge-amber">
                  <TrendingDown size={10} /> Procurement Gap
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="procGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="wind" stroke="var(--accent-green)" fill="url(#windGrad)" strokeWidth={2.5} name="Wind (MW)" />
                  <Area type="monotone" dataKey="procure" stroke="var(--accent-amber)" fill="url(#procGrad)" strokeWidth={2} name="Procurement Need (MW)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🌬️</div>
                <p>No forecast available for this date/time window</p>
              </div>
            )}
          </div>

          {/* Half-hourly forecast table */}
          {forecastGen.length > 0 && (
            <div className="card animate-in stagger-5" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div className="card-title">Half-Hourly Forecast — {procData.deliveryDate}</div>
                <div className="card-subtitle">As known at {procData.forecastPublishTime?.slice(11, 16)} UTC on {procData.decisionDate}</div>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Delivery Time (UTC)</th>
                      <th>Wind Forecast (MW)</th>
                      <th>Procurement Gap (MW)</th>
                      <th>Wind Share (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastGen.map(r => {
                      const procNeed = Math.max(0, TYPICAL_DEMAND_MW - (r.generation || 0))
                      const share = ((r.generation / TYPICAL_DEMAND_MW) * 100).toFixed(1)
                      return (
                        <tr key={r.startTime}>
                          <td style={{ color: 'var(--text-primary)', fontFamily: 'Inter' }}>
                            {r.startTime?.replace('T', ' ').slice(0, 16)}
                          </td>
                          <td style={{ color: 'var(--accent-green)' }}>
                            {r.generation?.toLocaleString() ?? '—'}
                          </td>
                          <td style={{ color: 'var(--accent-amber)' }}>
                            {procNeed.toLocaleString()}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                height: 4, borderRadius: 2, background: 'var(--accent-green)',
                                width: `${Math.min(100, parseFloat(share))}%`,
                                minWidth: 2, maxWidth: 80, opacity: 0.7
                              }} />
                              <span style={{ color: 'var(--text-secondary)' }}>{share}%</span>
                            </div>
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
