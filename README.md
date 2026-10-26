# WindTrack — UK Wind Power Intelligence Dashboard

> **AI Disclosure**: This application was built with the assistance of Google Deepmind's Antigravity AI coding assistant. All architecture decisions, domain knowledge, API integration logic, and accuracy methodology were designed by the developer; AI was used to accelerate code generation and boilerplate.

A production-ready web application for UK energy utility procurement teams to monitor wind power generation forecasts and evaluate their accuracy against actuals using Elexon BMRS data.

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| **Frontend App** (Vercel) | *(Deploying via Vercel)* |
| **Backend API** (Render) | [https://windtrack-backend.onrender.com](https://windtrack-backend.onrender.com) |
| **Interactive API Docs** | [https://windtrack-backend.onrender.com/docs](https://windtrack-backend.onrender.com/docs) |

---

## 📁 Project Structure

```
wind-power-dashboard/
├── backend/                  # Python FastAPI backend
│   ├── main.py               # All API routes + business logic
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Container config for backend
│   ├── Procfile              # Heroku process config
│   └── runtime.txt           # Python version for Heroku
│
├── frontend/                 # React (Vite) frontend
│   ├── src/
│   │   ├── App.jsx           # Root component + routing
│   │   ├── App.css           # Global design system (dark theme)
│   │   ├── main.jsx          # React entry point
│   │   ├── components/
│   │   │   └── Sidebar.jsx   # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Overview KPIs + daily table
│   │   │   ├── ForecastView.jsx    # Daily forecast vs actual chart
│   │   │   ├── AccuracyAnalysis.jsx # Metrics + scatter/histogram
│   │   │   └── ProcurementView.jsx  # Day-ahead decision support
│   │   └── services/
│   │       ├── api.js         # Axios API client
│   │       └── utils.js       # Formatting + colour utilities
│   ├── Dockerfile             # Multi-stage build (Node → Nginx)
│   ├── nginx.conf             # Nginx SPA config
│   ├── vercel.json            # Vercel deployment config
│   └── vite.config.js         # Vite + dev proxy config
│
├── docker-compose.yml         # Full stack local deployment
└── README.md
```

---

## 🛠️ Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (for containerised run)

### Option A — Docker Compose (recommended)

```bash
# Clone & navigate
cd wind-power-dashboard

# Build and start all services
docker-compose up --build

# Frontend: http://localhost:80
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Option B — Manual (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env        # Edit VITE_API_URL if needed
npm install --legacy-peer-deps
npm run dev
# Opens at http://localhost:5173
```

---

## ☁️ Deployment

### Backend → Heroku

```bash
cd backend

# Login and create app
heroku login
heroku create windtrack-api

# Deploy
git init && git add . && git commit -m "init"
heroku git:remote -a windtrack-api
git push heroku main

# Verify
heroku open
```

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Import into [Vercel](https://vercel.com)
3. Set environment variable: `VITE_API_URL = https://windtrack-api.herokuapp.com`
4. Deploy

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/actuals` | Wind actuals (FUELHH) for date range |
| GET | `/api/forecasts` | WINDFOR forecasts by publish window |
| GET | `/api/latest-forecast` | Most recent available forecast |
| GET | `/api/accuracy` | Forecast accuracy metrics (MAE, RMSE, MAPE, Bias) |
| GET | `/api/forecast-comparison` | Actual vs forecast for a specific delivery day |
| GET | `/api/procurement-view` | Day-ahead procurement decision data |

Full interactive docs at: `http://localhost:8000/docs`

---

## 📊 Data Sources

| Dataset | Source | Description |
|---------|--------|-------------|
| **FUELHH** | Elexon BMRS | Half-hourly wind actuals (30-min, MW) |
| **WINDFOR** | Elexon BMRS | Wind generation forecasts (publishTime + startTime) |

**Data scope**: January 2026 · National level UK wind generation

---

## 🧮 Accuracy Methodology

Forecasts are paired with actuals using a **day-ahead gate closure** rule:
- For each delivery half-hour slot on day **D**, we select the most recent WINDFOR forecast published **before 11:00 UTC on day D−1**
- This mirrors the real procurement window (UK day-ahead market gate ~09:00–10:00 UTC)
- Metrics computed over all matched (actual, forecast) pairs:

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **MAE** | mean\|forecast − actual\| | Average error magnitude in MW |
| **RMSE** | √mean(error²) | Penalises large errors more |
| **MAPE** | mean\|error/actual\|×100 | Scale-independent % error |
| **Bias** | mean(forecast − actual) | Positive = systematic over-forecast |
| **nMAE** | MAE / mean(actual) × 100 | Normalised MAE as % of mean generation |
| **nRMSE** | RMSE / mean(actual) × 100 | Normalised RMSE |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                              │
│  React (Vite) SPA                                           │
│  ┌─────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────┐  │
│  │Dashboard│ │ForecastView  │ │Accuracy   │ │Procure-  │  │
│  │ (KPIs)  │ │(daily charts)│ │Analysis   │ │mentView  │  │
│  └────┬────┘ └──────┬───────┘ └─────┬─────┘ └────┬─────┘  │
│       └─────────────┼───────────────┼─────────────┘        │
│                     │ Axios HTTP    │                       │
└─────────────────────┼───────────────┼──────────────────────┘
                      │               │
┌─────────────────────▼───────────────▼──────────────────────┐
│                        HEROKU                               │
│  FastAPI (Python 3.12) + Uvicorn                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Layer  (/api/actuals, /api/accuracy, etc.)    │  │
│  │  Business Logic (metric computation, pairing)        │  │
│  │  Async HTTP Client (httpx)                           │  │
│  └────────────────────────┬─────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                     Elexon BMRS API                         │
│    /datasets/FUELHH (actuals)  /datasets/WINDFOR (forecasts)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Decisions

- **Dark energy-sector theme**: reflects professional utility software aesthetics
- **Glassmorphism cards**: modern premium feel
- **JetBrains Mono** for numerical data: improves scanability of MW values
- **Recharts** for visualisation: lightweight, React-native, responsive
- **No caching layer**: data freshness is critical for procurement decisions; each page load fetches live data
- **Async throughout**: all API calls are `async/await` with `httpx.AsyncClient` to handle large Elexon data requests

---

## 📋 Key Development Decisions

1. **Forecast selection**: Used 11:00 UTC cutoff (after typical UK day-ahead gate closure) to simulate realistic procurement timing
2. **Stream vs paginated API**: Used the paginated `/datasets/FUELHH` endpoint (with `settlementDateFrom/To`) for January data, not the stream endpoint which returns recent data only
3. **Error normalisation**: Added nMAE and nRMSE to enable comparison across different wind regimes (high/low wind days)
4. **WINDFOR resolution**: WINDFOR uses 1-hour intervals vs FUELHH's 30-minute intervals — matching is done by startTime
