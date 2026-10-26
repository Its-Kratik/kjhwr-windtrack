import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min timeout for large data fetches
})

export const getActuals = (startDate = '2026-01-01', endDate = '2026-01-31') =>
  api.get('/api/actuals', { params: { start_date: startDate, end_date: endDate } })

export const getForecasts = (publishStart, publishEnd) =>
  api.get('/api/forecasts', { params: { publish_start: publishStart, publish_end: publishEnd } })

export const getLatestForecast = () =>
  api.get('/api/latest-forecast')

export const getAccuracy = (startDate = '2026-01-01', endDate = '2026-01-31') =>
  api.get('/api/accuracy', { params: { start_date: startDate, end_date: endDate } })

export const getForecastComparison = (deliveryDate) =>
  api.get('/api/forecast-comparison', { params: { delivery_date: deliveryDate } })

export const getProcurementView = (targetDate) =>
  api.get('/api/procurement-view', { params: { target_date: targetDate } })

export default api
