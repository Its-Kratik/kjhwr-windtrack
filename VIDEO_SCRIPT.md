# WindTrack — Video Demo Script & Presentation Guide (Max 10 Minutes)

> **Format**: Unlisted YouTube Video  
> **Total Duration**: Maximum 10:00 minutes (split into two distinct 5-minute parts)  
> **Recording Setup Recommendation**: Loom, OBS Studio, or QuickTime Screen Recording at 1080p with mic. Have `http://localhost:5173` open in one tab and VS Code / IDE open in another.

---

## 🎬 Table of Contents & Time Allocation

| Section | Target Audience | Time Window | Focus |
|---|---|---|---|
| **Part 1** | UK Energy Utility Procurement Client | **0:00 – 4:45** (4.5 min) | Business problem, pilot results, portal walkthrough, procurement risk mitigation |
| **Part 2** | Internal Technical Lead | **4:45 – 9:30** (4.5 min) | Architecture, Elexon BMRS ingestion, algorithm design, Docker & deployment |
| **Wrap-up** | Evaluation & Form Submission Checklist | **9:30 – 10:00** (0.5 min) | Key takeaways & links |

---

# 🌟 PART 1: Client Presentation & Product Pitch (0:00 – 4:45)

**Persona**: Senior Product Developer delivering the pilot solution to the UK Energy Utility Day-Ahead Trading Desk.  
**Tone**: Confident, commercially aware, consultative, and articulate.  
**Screen Display**: Browser open at `http://localhost:5173` (Full Screen, Dark Mode).

---

### [0:00 – 0:45] The Hook & The Problem Context
*Screen: Title slide or Dashboard Overview page (`/`)*

> **Speaker Script:**  
> "Good morning, team. Today, I am excited to present the output of our pilot project: **WindTrack** — a purpose-built Wind Power Intelligence and Day-Ahead Procurement Decision Portal tailored specifically for your UK wholesale power trading desk.
>
> As a UK utility serving retail consumers, your trading team faces a critical daily mandate: at **gate closure on Day D-1**, you must procure sufficient wholesale electricity (from CCGT thermal plants, interconnectors, or auctions) to cover consumer demand after subtracting intermittent renewable generation.
>
> If your day-ahead wind forecast is overly optimistic, you will under-procure in the day-ahead auction and be forced into the volatile cash-out balancing mechanism at punitive system prices. Conversely, over-procuring leads to costly spill or distressed intraday selling. 
>
> WindTrack solves this by delivering two core capabilities:
> 1. Clear visibility into actionable pre-gate-closure wind generation forecasts.
> 2. Rigorous, quantified accuracy metrics that convert raw forecasts into risk-adjusted procurement volumes."

---

### [0:45 – 2:00] Dashboard Overview & Key Pilot Findings (January 2026)
*Screen: Navigating around Dashboard (`/`) — hover over KPI cards and daily breakdown table*

> **Speaker Script:**  
> "Let’s look at the pilot analysis conducted over the full delivery period of **January 2026**, capturing **1,488 half-hour settlement periods** matched from national Elexon BMRS datasets.
>
> Here on the executive dashboard, four headline numbers tell a crucial story:
> - **Mean Actual Wind Output:** ~11,581 MW across the national grid.
> - **Mean Forecast Output:** ~13,421 MW.
> - **Mean Absolute Error (MAE):** 2,126 MW (a Normalized MAE of 18.4%).
> - **Root Mean Square Error (RMSE):** 2,621 MW, highlighting the penalty of occasional severe forecast swings.
> - **Forecast Bias:** **+1,840 MW**.
>
> **This is the key commercial insight**: during January 2026, the national day-ahead wind forecast exhibited a systematic positive bias. It consistently predicted 1.84 gigawatts *more* wind than actually showed up. 
>
> Without quantifying this bias, a trading desk taking raw forecasts at face value would systematically under-procure thermal baseload, exposing the utility to millions of pounds in imbalance settlement penalties. WindTrack exposes this bias instantly."

---

### [2:00 – 3:15] Day-Ahead Forecast Comparison & Timeline
*Screen: Click on 'Forecast View' on sidebar. Select January 15, 2026.*

> **Speaker Script:**  
> "Now let's dive into the daily trading workflow under **Forecast Comparison**. 
>
> Suppose we are preparing bids on January 14 for delivery day **January 15, 2026**. 
>
> The portal automatically filters forecasts published *prior* to your day-ahead decision cutoff (11:00 UTC on D-1), so your traders never suffer from look-ahead bias or hindsight illusion.
>
> Notice the interactive chart: the solid cyan line represents the actionable day-ahead forecast, while the emerald line shows what the wind fleet actually generated across all 48 settlement periods.
>
> In the morning hours (periods 1 to 16), forecast and actual track closely. But look at the evening peak between settlement periods 34 and 40: the forecast projected 14,000 MW, while actual generation plummeted to 11,200 MW — a 2,800 MW deficit during peak demand hours when electricity prices are highest! 
>
> Having this historical breakdown allows your desk to stress-test your hedging strategies for peak vs off-peak hours."

---

### [3:15 – 4:00] Accuracy & Quantified Error Analytics
*Screen: Click on 'Accuracy Analysis' tab. Toggle between Scatter Plot, Error Distribution, and Daily Bias.*

> **Speaker Script:**  
> "Under **Accuracy Analysis**, we give your quantitative analysts statistical depth:
> - **The Actual vs Forecast Scatter Plot**: With the diagonal 1:1 parity line, you can immediately see the clustering above the line, reinforcing the over-forecasting tendency.
> - **The Error Histogram**: Shows a non-normal, right-skewed error distribution, meaning extreme shortfall tails occur more frequently than extreme surpluses.
> - **Daily Error Trends**: Lets you correlate high-error days with specific meteorological events — such as storm fronts passing over the North Sea."

---

### [4:00 – 4:45] The Procurement Calculator & Commercial Value
*Screen: Click on 'Procurement' tab. Enter consumer demand (e.g. 25,000 MW).*

> **Speaker Script:**  
> "Finally, we bridge analytics into direct trade execution with the **Procurement Calculator**.
>
> Your trader enters your retail consumer demand — say, 25,000 MW.
>
> The portal calculates:
> 1. The **Raw Day-Ahead Wind Forecast** available for that slot.
> 2. The **Uncertainty Buffer** derived from our quantified MAE (2,126 MW).
> 3. The **Recommended Thermal Procurement Gap**: instead of procuring only `25,000 - Forecast`, the portal provides a P90 Conservative hedge volume that protects against wind shortfall.
>
> In summary, this pilot delivers:
> - Zero manual data wrangling from Elexon.
> - Automated day-ahead cutoff compliance.
> - Direct margin protection against balancing mechanism exposure.
>
> We look forward to advancing from this successful pilot into live production deployment."

---

# ⚙️ PART 2: Technical Architecture & Code Review (4:45 – 9:30)

**Persona**: Software Architect & Full-Stack Developer presenting to the Engineering Lead.  
**Tone**: Technical, rigorous, precise, showcasing engineering craftsmanship and edge-case handling.  
**Screen Display**: Split screen with VS Code (backend `main.py`, frontend components) and browser DevTools.

---

### [4:45 – 5:30] System Architecture & Technology Stack
*Screen: VS Code open showing `docker-compose.yml` and directory tree*

> **Speaker Script:**  
> "Hi team. For Part 2, I'll walk through the technical design, architectural patterns, and production engineering choices behind WindTrack.
>
> **Stack Architecture:**
> - **Backend**: Python 3.12 with **FastAPI**. FastAPI was chosen for native asynchronous I/O (`async`/`await`), automatic OpenAPI/Swagger documentation, and Pydantic validation.
> - **Frontend**: React 18 single-page application built with **Vite**, Vanilla CSS design system with custom CSS variables (dark theme, glassmorphism), **Recharts** for SVG data visualization, and **Lucide-react** for icons.
> - **Containerisation**: Full multi-container Docker architecture via `docker-compose.yml`, featuring a multi-stage Node→Nginx build for the frontend and a slim Python container for the backend.
> - **Cloud Readiness**: Pre-configured with `Procfile` and `runtime.txt` for Heroku backend deployment, and `vercel.json` with SPA routing rewrites for Vercel."

---

### [5:30 – 6:45] Elexon BMRS Ingestion & Key Domain Engineering Challenges
*Screen: VS Code open at `backend/main.py` lines 80-140 (`date_range_chunks` and fetch functions)*

> **Speaker Script:**  
> "Let’s focus on the data layer. We ingest exclusively from the official Elexon BMRS API:
> - `FUELHH`: Actual half-hourly generation by fuel type (filtered for `fuelType=WIND`).
> - `WINDFOR`: National wind power forecast dataset with `publishTime` and delivery `startTime`.
>
> During development, we uncovered two critical domain challenges:
>
> **Challenge 1: The Elexon 7-Day Range Limit**  
> Elexon's REST API strictly returns HTTP 400 Bad Request if the interval between `settlementDateFrom` and `settlementDateTo` exceeds 7 days.
> To handle the required January 2026 scope (31 days) seamlessly, I built an automated chunking generator `date_range_chunks()` that splits any arbitrary date window into safe 6-day slices, executes them concurrently using `asyncio.gather()`, deduplicates records by `(startTime, settlementPeriod)`, and caches slices in-memory. 
> As a result, querying the entire month takes under 50ms on warm cache!
>
> **Challenge 2: Resolution Mismatch (Hourly vs Half-Hourly)**  
> `FUELHH` actuals are published every 30 minutes (48 settlement periods per day). However, `WINDFOR` forecasts are published at 1-hour resolution.
> To accurately pair them without dropping data, our matching algorithm rounds each 30-minute settlement period down to the nearest hour to extract the covering forecast, ensuring 100% of the 1,488 actual slots are paired."

---

### [6:45 – 7:45] Market Timing & Gate Closure Logic
*Screen: VS Code showing `select_day_ahead_forecast()` in `backend/main.py` (lines 180-215)*

> **Speaker Script:**  
> "Another critical domain requirement was preventing look-ahead bias. 
>
> In the UK day-ahead wholesale electricity market (EPEX SPOT and Nord Pool UK), bids close in the morning of Day D-1 for delivery on Day D. 
>
> In `select_day_ahead_forecast()`, for any delivery slot on date $D$, we strictly filter:
> $$\text{publishTime} \le \text{Date}(D - 1)\text{T}11:00:00\text{Z}$$
>
> We then sort valid candidate forecasts by `publishTime` descending and pick the latest run published *before* gate closure. This guarantees that all accuracy metrics reflect only information that was genuinely available to traders at the moment bids were submitted."

---

### [7:45 – 8:45] Mathematical Formulation of Error Metrics
*Screen: VS Code showing `compute_metrics()` in `backend/main.py`*

> **Speaker Script:**  
> "For the quantitative evaluation, we implemented standard energy forecasting metrics:
>
> 1. **Mean Absolute Error (MAE):**
>    $$\text{MAE} = \frac{1}{n}\sum_{t=1}^n |F_t - A_t| = 2,126.1\text{ MW}$$
> 2. **Root Mean Square Error (RMSE):**
>    $$\text{RMSE} = \sqrt{\frac{1}{n}\sum_{t=1}^n (F_t - A_t)^2} = 2,620.8\text{ MW}$$
> 3. **Normalized MAE & RMSE (nMAE / nRMSE):**
>    Normalized by the mean actual generation ($\bar{A} = 11,580.7\text{ MW}$), giving 18.36% and 22.63% respectively. Normalization is essential in wind forecasting because MW errors scale with the installed wind capacity.
> 4. **Systematic Bias:**
>    $$\text{Bias} = \frac{1}{n}\sum_{t=1}^n (F_t - A_t) = +1,840.3\text{ MW}$$
>    A positive bias indicates persistent over-forecasting, giving traders an empirical calibration factor."

---

### [8:45 – 9:30] Code Quality, Testing & Docker Packaging
*Screen: Show `docker-compose.yml`, frontend `nginx.conf`, and terminal running tests*

> **Speaker Script:**  
> "Regarding code quality and DevOps:
> - **Clean Architecture**: Backend controllers, caching, business logic, and API clients are modularly separated.
> - **Frontend Performance**: Responsive charts with memoized tooltips and lazy chunk rendering ensure 60fps interaction even with thousands of data points.
> - **Container Security**: The frontend Dockerfile uses a multi-stage build; the final image is a hardened Nginx alpine image serving static assets with Gzip compression and security headers enabled.
> - **Docker Compose**: Running `docker-compose up --build` spins up both backend on port 8000 and frontend on port 80 with integrated healthchecks."

---

# 🏁 WRAP-UP & SUBMISSION (9:30 – 10:00)
*Screen: Show the GitHub repository README and the Microsoft submission form*

> **Speaker Script:**  
> "To conclude:
> - The application is fully containerised and cloud-ready.
> - The public repository contains complete documentation, API schemas, and reproduction commands.
> - All links are verified for public access.
>
> Thank you for your time, and I look forward to your questions."

---

## 📋 Pre-Recording Quick Checklist

Before you hit "Record":
- [ ] Backend is running on `http://localhost:8000` (`curl http://localhost:8000/health` returns status ok)
- [ ] Frontend is running on `http://localhost:5173` (or port 80 via Docker)
- [ ] Test tab switching in incognito window to verify no auth or cookie dependencies
- [ ] Keep browser window zoom at 100% or 110% for crisp chart rendering
- [ ] Keep a timer on your phone set to 9:30 to stay strictly under the 10-minute limit
