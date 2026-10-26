"""
Wind Power Dashboard - FastAPI Backend
Serves wind power actuals (FUELHH) and forecasts (WINDFOR) from Elexon BMRS API.
Provides forecast accuracy metrics for January 2026 procurement decisions.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List
import math
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Wind Power Dashboard API",
    description="API for UK wind power actuals and forecasts from Elexon BMRS",
    version="1.0.0",
)

# CORS: allow all origins for demo (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"
ELEXON_STREAM_BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

# January 2026 scope
JAN_START = "2026-01-01"
JAN_END = "2026-01-31"

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

async def fetch_elexon(url: str, params: dict = None) -> list:
    """Fetch data from Elexon BMRS API (handles both list and paginated responses)."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        # Some endpoints return a list directly (stream), others wrap in {data: [...]}
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return []


async def fetch_all_pages(url: str, params: dict) -> list:
    """Fetch all pages from a paginated Elexon endpoint."""
    all_records = []
    page = 1
    async with httpx.AsyncClient(timeout=60.0) as client:
        while True:
            p = {**params, "page": page, "pageSize": 1000}
            resp = await client.get(url, params=p)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                all_records.extend(data)
                break
            records = data.get("data", [])
            all_records.extend(records)
            total = data.get("total", 0)
            if len(all_records) >= total or not records:
                break
            page += 1
    return all_records


# In-memory caches to prevent redundant external calls and speed up queries
_ACTUALS_CACHE = {}
_FORECASTS_CACHE = {}


def date_range_chunks(start_str: str, end_str: str, max_days: int = 6):
    """
    Split a date range [start_str, end_str] into chunks of at most max_days.
    Elexon BMRS rejects queries where the date range exceeds 7 days.
    """
    try:
        start = datetime.strptime(start_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_str, "%Y-%m-%d").date()
    except ValueError:
        yield start_str, end_str
        return

    curr = start
    while curr <= end:
        chunk_end = min(curr + timedelta(days=max_days - 1), end)
        yield curr.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")
        curr = chunk_end + timedelta(days=1)


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

async def fetch_actuals_single_chunk(start_date: str, end_date: str) -> list:
    """Fetch FUELHH wind actuals for a single chunk (<= 7 days)."""
    cache_key = (start_date, end_date)
    if cache_key in _ACTUALS_CACHE:
        return _ACTUALS_CACHE[cache_key]

    url = f"{ELEXON_BASE}/datasets/FUELHH"
    params = {
        "settlementDateFrom": start_date,
        "settlementDateTo": end_date,
        "fuelType": "WIND",
    }
    records = await fetch_all_pages(url, params)
    result = []
    for r in records:
        result.append({
            "startTime": r.get("startTime") or r.get("start_time"),
            "settlementDate": r.get("settlementDate"),
            "settlementPeriod": r.get("settlementPeriod"),
            "generation": r.get("generation"),
        })
    _ACTUALS_CACHE[cache_key] = result
    return result


async def get_actuals_for_range(start_date: str, end_date: str) -> list:
    """Fetch FUELHH wind actuals for any date range, auto-chunking to stay within Elexon 7-day limit."""
    chunks = list(date_range_chunks(start_date, end_date, max_days=6))
    if not chunks:
        return []
    
    tasks = [fetch_actuals_single_chunk(s, e) for s, e in chunks]
    results_list = await asyncio.gather(*tasks)
    
    seen = set()
    combined = []
    for chunk_res in results_list:
        for r in chunk_res:
            key = (r["startTime"], r.get("settlementPeriod"))
            if key not in seen:
                seen.add(key)
                combined.append(r)
    combined.sort(key=lambda x: x["startTime"] or "")
    return combined


async def fetch_forecasts_single_chunk(start_date: str, end_date: str) -> list:
    """Fetch WINDFOR forecasts published in a single chunk (<= 7 days)."""
    cache_key = (start_date, end_date)
    if cache_key in _FORECASTS_CACHE:
        return _FORECASTS_CACHE[cache_key]

    url = f"{ELEXON_BASE}/datasets/WINDFOR"
    params = {
        "publishDateTimeFrom": f"{start_date}T00:00:00Z",
        "publishDateTimeTo": f"{end_date}T23:59:59Z",
    }
    records = await fetch_all_pages(url, params)
    result = []
    for r in records:
        result.append({
            "publishTime": r.get("publishTime"),
            "startTime": r.get("startTime"),
            "generation": r.get("generation"),
        })
    _FORECASTS_CACHE[cache_key] = result
    return result


async def get_forecasts_for_range(start_date: str, end_date: str) -> list:
    """Fetch WINDFOR forecasts for any date range, auto-chunking to stay within Elexon 7-day limit."""
    chunks = list(date_range_chunks(start_date, end_date, max_days=6))
    if not chunks:
        return []
    
    tasks = [fetch_forecasts_single_chunk(s, e) for s, e in chunks]
    results_list = await asyncio.gather(*tasks)
    
    seen = set()
    combined = []
    for chunk_res in results_list:
        for r in chunk_res:
            key = (r["publishTime"], r["startTime"])
            if key not in seen:
                seen.add(key)
                combined.append(r)
    combined.sort(key=lambda x: (x["publishTime"] or "", x["startTime"] or ""))
    return combined


# ---------------------------------------------------------------------------
# Metric computation
# ---------------------------------------------------------------------------

def compute_metrics(pairs: list[dict]) -> dict:
    """
    Compute forecast accuracy metrics from (actual, forecast) pairs.
    
    Returns MAE, RMSE, MAPE, Bias (mean error), and normalized variants.
    """
    if not pairs:
        return {}
    
    n = len(pairs)
    actuals = [p["actual"] for p in pairs]
    forecasts = [p["forecast"] for p in pairs]
    errors = [f - a for a, f in zip(actuals, forecasts)]
    
    mae = sum(abs(e) for e in errors) / n
    rmse = math.sqrt(sum(e**2 for e in errors) / n)
    bias = sum(errors) / n  # positive = over-forecast, negative = under-forecast
    
    # MAPE (exclude zero actuals)
    mape_items = [abs(e / a) * 100 for a, e in zip(actuals, errors) if a != 0]
    mape = sum(mape_items) / len(mape_items) if mape_items else None

    mean_actual = sum(actuals) / n
    
    # nMAE / nRMSE normalized by mean actual generation
    n_mae = (mae / mean_actual * 100) if mean_actual else None
    n_rmse = (rmse / mean_actual * 100) if mean_actual else None

    return {
        "count": n,
        "mae_mw": round(mae, 1),
        "rmse_mw": round(rmse, 1),
        "bias_mw": round(bias, 1),
        "mape_pct": round(mape, 2) if mape is not None else None,
        "nmae_pct": round(n_mae, 2) if n_mae is not None else None,
        "nrmse_pct": round(n_rmse, 2) if n_rmse is not None else None,
        "mean_actual_mw": round(mean_actual, 1),
        "mean_forecast_mw": round(sum(forecasts) / n, 1),
    }


def select_day_ahead_forecast(forecasts_for_starttime: list[dict], decision_cutoff_hour: int = 11) -> dict | None:
    """
    From all available forecasts for a given startTime (delivery period),
    select the most recent forecast published BEFORE 11:00 UTC on the day before delivery.
    
    Day-ahead gate closure for UK EPEX is ~09:00-10:00 UTC. We use 11:00 to be safe.
    """
    if not forecasts_for_starttime:
        return None
    
    # Parse delivery startTime to determine the "day before" decision window
    try:
        delivery_dt = datetime.fromisoformat(forecasts_for_starttime[0]["startTime"].replace("Z", "+00:00"))
    except (ValueError, KeyError):
        return None
    
    # Decision cutoff: day before delivery at decision_cutoff_hour UTC
    decision_day = delivery_dt.date() - timedelta(days=1)
    cutoff_dt = datetime(decision_day.year, decision_day.month, decision_day.day,
                         decision_cutoff_hour, 0, 0, tzinfo=timezone.utc)
    
    # Filter forecasts published before the cutoff
    valid = []
    for f in forecasts_for_starttime:
        try:
            pub = datetime.fromisoformat(f["publishTime"].replace("Z", "+00:00"))
            if pub <= cutoff_dt:
                valid.append((pub, f))
        except (ValueError, KeyError):
            pass
    
    if not valid:
        return None
    
    # Return the most recently published before cutoff
    valid.sort(key=lambda x: x[0], reverse=True)
    return valid[0][1]


def round_to_nearest_hour(isostr: str) -> str:
    """
    WINDFOR forecasts are published at 1-hour resolution (startTime on the hour),
    while FUELHH actuals are 30-minute resolution.
    
    For the :30 half-hour slots (e.g. 00:30, 01:30) we round to the nearest hour
    to find the corresponding forecast (round down, as the forecast for 01:00
    covers 01:00-01:30 delivery).
    """
    try:
        dt = datetime.fromisoformat(isostr.replace("Z", "+00:00"))
        # Round down to the nearest hour
        rounded = dt.replace(minute=0, second=0, microsecond=0)
        return rounded.strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, AttributeError):
        return isostr


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/actuals")
async def get_actuals(
    start_date: str = Query(default=JAN_START, description="Start date YYYY-MM-DD"),
    end_date: str = Query(default=JAN_END, description="End date YYYY-MM-DD"),
):
    """
    Return half-hourly wind actuals (FUELHH, WIND) for the given date range.
    """
    try:
        records = await get_actuals_for_range(start_date, end_date)
        return {"data": records, "count": len(records)}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")


@app.get("/api/forecasts")
async def get_forecasts(
    publish_start: str = Query(default=f"{JAN_START}T00:00:00Z", description="Forecast publish start (ISO)"),
    publish_end: str = Query(default=f"{JAN_END}T23:59:59Z", description="Forecast publish end (ISO)"),
):
    """
    Return WINDFOR forecasts published in the given time window.
    Each record has publishTime, startTime (delivery), and generation.
    """
    try:
        # Parse dates from ISO strings
        start_date = publish_start[:10]
        end_date = publish_end[:10]
        records = await get_forecasts_for_range(start_date, end_date)
        return {"data": records, "count": len(records)}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")


@app.get("/api/latest-forecast")
async def get_latest_forecast():
    """
    Return the most recently published WINDFOR forecast set.
    Useful for showing 'what forecast is available now for tomorrow's procurement'.
    """
    try:
        # Fetch recent forecasts (last 24h of publishes)
        now = datetime.now(timezone.utc)
        start = (now - timedelta(hours=24)).strftime("%Y-%m-%d")
        end = now.strftime("%Y-%m-%d")
        records = await get_forecasts_for_range(start, end)
        
        if not records:
            return {"data": [], "publishTime": None, "count": 0}
        
        # Find the latest publishTime
        latest_pub = max(r["publishTime"] for r in records if r["publishTime"])
        # Get all records for that publishTime
        latest = [r for r in records if r["publishTime"] == latest_pub]
        latest.sort(key=lambda x: x["startTime"] or "")
        
        return {
            "data": latest,
            "publishTime": latest_pub,
            "count": len(latest),
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")


@app.get("/api/accuracy")
async def get_accuracy(
    start_date: str = Query(default=JAN_START),
    end_date: str = Query(default=JAN_END),
):
    """
    Compute forecast accuracy metrics for January 2026 delivery.
    
    Methodology:
    - For each half-hour delivery period in the date range, pair the actual generation
      with the day-ahead forecast (most recent forecast published before 11:00 UTC
      on the day prior to delivery).
    - Compute MAE, RMSE, MAPE, Bias over all matched pairs.
    - Also returns daily breakdown for trend analysis.
    """
    try:
        # Fetch actuals for delivery period
        actuals_raw = await get_actuals_for_range(start_date, end_date)
        
        # Build a lookup: startTime -> actual generation
        actuals_map = {}
        for r in actuals_raw:
            if r["startTime"] and r["generation"] is not None:
                actuals_map[r["startTime"]] = r["generation"]
        
        # Fetch forecasts published the day before (Dec 31 - Jan 30 publishes for Jan delivery)
        # Start one day earlier to catch day-ahead forecasts
        try:
            from_date = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        except ValueError:
            from_date = start_date
        # End on the day before end_date (last day's actuals are matched with prev day forecasts)
        try:
            to_date = (datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        except ValueError:
            to_date = end_date
        
        forecasts_raw = await get_forecasts_for_range(from_date, end_date)
        
        # Group forecasts by startTime (delivery slot)
        from collections import defaultdict
        forecasts_by_starttime = defaultdict(list)
        for r in forecasts_raw:
            if r["startTime"]:
                forecasts_by_starttime[r["startTime"]].append(r)
        
        # Match actual with best day-ahead forecast
        # Note: WINDFOR is hourly resolution, FUELHH is 30-min.
        # For :30 slots, we look up the forecast for the rounded-down hour.
        paired = []
        daily_pairs = defaultdict(list)
        
        for starttime, actual_gen in actuals_map.items():
            # First try exact match, then round to nearest hour
            fc_options = forecasts_by_starttime.get(starttime, [])
            if not fc_options:
                rounded_st = round_to_nearest_hour(starttime)
                fc_options = forecasts_by_starttime.get(rounded_st, [])
                # Build synthetic entries with the original startTime
                fc_options = [{**f, "startTime": starttime} for f in fc_options]
            
            best_fc = select_day_ahead_forecast(fc_options)
            if best_fc and best_fc["generation"] is not None:
                pair = {
                    "startTime": starttime,
                    "actual": actual_gen,
                    "forecast": best_fc["generation"],
                    "forecastPublishTime": best_fc["publishTime"],
                    "error": best_fc["generation"] - actual_gen,
                }
                paired.append(pair)
                # Group by date for daily breakdown
                day = starttime[:10]
                daily_pairs[day].append(pair)
        
        paired.sort(key=lambda x: x["startTime"])
        
        # Overall metrics
        overall = compute_metrics(paired)
        
        # Daily metrics breakdown
        daily_metrics = []
        for day in sorted(daily_pairs.keys()):
            dm = compute_metrics(daily_pairs[day])
            dm["date"] = day
            daily_metrics.append(dm)
        
        return {
            "overall": overall,
            "daily": daily_metrics,
            "pairs": paired,
            "matched_count": len(paired),
            "total_actual_slots": len(actuals_map),
        }

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")


@app.get("/api/forecast-comparison")
async def get_forecast_comparison(
    delivery_date: str = Query(..., description="Delivery date YYYY-MM-DD"),
):
    """
    For a specific delivery day, return:
    - Actuals (half-hourly)
    - All available day-ahead forecasts published the day before
    - The 'best' (most recent pre-cutoff) day-ahead forecast per slot
    """
    try:
        # Actuals for delivery date
        actuals_raw = await get_actuals_for_range(delivery_date, delivery_date)
        actuals_map = {r["startTime"]: r["generation"] for r in actuals_raw if r["startTime"]}
        
        # Forecasts published on the day before
        try:
            prev_day = (datetime.strptime(delivery_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        except ValueError:
            prev_day = delivery_date
        
        forecasts_raw = await get_forecasts_for_range(prev_day, prev_day)
        
        # Filter to forecasts targeting the delivery date
        delivery_forecasts = [
            r for r in forecasts_raw
            if r["startTime"] and r["startTime"].startswith(delivery_date)
        ]
        
        # Group by publishTime to show distinct forecast runs
        from collections import defaultdict
        by_publish = defaultdict(list)
        for r in delivery_forecasts:
            by_publish[r["publishTime"]].append(r)
        
        forecast_runs = []
        for pub_time in sorted(by_publish.keys()):
            run = by_publish[pub_time]
            run.sort(key=lambda x: x["startTime"])
            forecast_runs.append({"publishTime": pub_time, "data": run})
        
        # Build timeline with actual + best forecast
        timeline = []
        for starttime in sorted(actuals_map.keys()):
            if not starttime.startswith(delivery_date):
                continue
            fc_options = [r for r in delivery_forecasts if r["startTime"] == starttime]
            best_fc = select_day_ahead_forecast(fc_options)
            timeline.append({
                "startTime": starttime,
                "actual": actuals_map[starttime],
                "forecast": best_fc["generation"] if best_fc else None,
                "forecastPublishTime": best_fc["publishTime"] if best_fc else None,
            })
        
        return {
            "deliveryDate": delivery_date,
            "timeline": timeline,
            "forecastRuns": forecast_runs,
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")


@app.get("/api/procurement-view")
async def get_procurement_view(
    target_date: str = Query(..., description="Date for which to show procurement view (YYYY-MM-DD)"),
):
    """
    Simulate what the procurement team sees when making day-ahead decisions.
    Returns:
    - The latest forecast published before 11:00 UTC on target_date (for delivery on target_date+1)
    - Summary statistics
    """
    try:
        # Forecasts published on target_date
        forecasts_raw = await get_forecasts_for_range(target_date, target_date)
        
        # Select forecasts published before 11:00 UTC
        cutoff = datetime(
            int(target_date[:4]), int(target_date[5:7]), int(target_date[8:10]),
            11, 0, 0, tzinfo=timezone.utc
        )
        valid_forecasts = [
            r for r in forecasts_raw
            if r["publishTime"] and datetime.fromisoformat(r["publishTime"].replace("Z", "+00:00")) <= cutoff
        ]
        
        if not valid_forecasts:
            return {"message": "No forecasts available before 11:00 UTC on this date", "data": []}
        
        # Latest publish before cutoff
        latest_pub = max(r["publishTime"] for r in valid_forecasts)
        latest = [r for r in valid_forecasts if r["publishTime"] == latest_pub]
        latest.sort(key=lambda x: x["startTime"] or "")
        
        # Filter to next-day delivery
        delivery_date = (datetime.strptime(target_date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        next_day = [r for r in latest if r["startTime"] and r["startTime"].startswith(delivery_date)]
        
        total_mwh = sum(r["generation"] for r in next_day if r["generation"]) / 2  # 30-min to MWh
        
        return {
            "decisionDate": target_date,
            "deliveryDate": delivery_date,
            "forecastPublishTime": latest_pub,
            "forecastedGeneration": next_day,
            "totalExpectedMWh": round(total_mwh, 0),
            "peakForecastMW": max((r["generation"] for r in next_day if r["generation"]), default=0),
            "minForecastMW": min((r["generation"] for r in next_day if r["generation"]), default=0),
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {e}")
