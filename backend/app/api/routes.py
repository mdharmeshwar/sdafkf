import csv
import io
from datetime import date, datetime, timedelta, timezone, time
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.config import settings
from app.schemas import (
    ForecastResponse,
    AccuracyResponse,
    DailyAccuracyResponse,
    DataStatusResponse,
    DeliveryDatesResponse,
    AccuracyMetrics,
    DailyAccuracyItem,
    IntervalRecord
)
from app.services.elexon_client import elexon_client
from app.services.data_normalizer import DataNormalizer
from app.services.forecast_service import ForecastService
from app.services.metrics import MetricsService
from app.utils.timestamps import (
    parse_iso_timestamp,
    format_iso_utc,
    format_uk_local,
    is_in_january_2026
)

router = APIRouter(prefix="/api", tags=["WindScope UK"])


def _validate_date_in_january_2026(d: date, field_name: str = "delivery_date"):
    if not is_in_january_2026(d):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: '{d}'. WindScope UK analysis is strictly scoped to January 2026 (2026-01-01 to 2026-01-31)."
        )


def _get_default_cutoff(delivery_date: date) -> datetime:
    """Default demonstration cutoff: Day-ahead 12:00 UTC on D-1."""
    return datetime.combine(delivery_date - timedelta(days=1), time(12, 0), tzinfo=timezone.utc)


@router.get("/health")
async def health_check():
    """Application health and basic service status."""
    return {
        "status": "ok",
        "service": "WindScope UK Backend",
        "version": "1.0.0",
        "timestampUtc": format_iso_utc(datetime.now(timezone.utc)),
        "dataScope": "January 2026 (2026-01-01 to 2026-01-31)"
    }


@router.get("/delivery-dates", response_model=DeliveryDatesResponse)
async def get_delivery_dates():
    """Return supported delivery dates in January 2026."""
    dates = [date(2026, 1, day).isoformat() for day in range(1, 32)]
    return DeliveryDatesResponse(
        dates=dates,
        defaultDate="2026-01-01",
        defaultCutoffTimeOfDayUtc="12:00:00Z (Day-Ahead D-1)",
        minDate="2026-01-01",
        maxDate="2026-01-31"
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    delivery_date: date = Query(date(2026, 1, 1), description="Delivery date in January 2026"),
    decision_cutoff: Optional[str] = Query(
        None,
        description="Decision cutoff ISO timestamp (e.g. 2025-12-31T12:00:00Z). Defaults to day-ahead 12:00 UTC."
    )
):
    """
    Returns half-hourly intervals for the delivery date with selected forecasts available
    as of the decision cutoff and matched actuals.
    """
    _validate_date_in_january_2026(delivery_date, "delivery_date")

    if decision_cutoff:
        cutoff_dt = parse_iso_timestamp(decision_cutoff)
    else:
        cutoff_dt = _get_default_cutoff(delivery_date)

    # 1. Fetch raw datasets from Elexon client (or cache/synthetic fallback)
    fuelhh_raw, fuelhh_syn = await elexon_client.fetch_fuelhh_actuals(delivery_date)
    windfor_raw, windfor_syn = await elexon_client.fetch_windfor_forecasts(delivery_date)

    # 2. Normalize records
    actuals, fuelhh_warnings = DataNormalizer.normalize_fuelhh(fuelhh_raw)
    forecasts, windfor_warnings = DataNormalizer.normalize_windfor(windfor_raw)

    # 3. Apply forecast selection logic as of decision cutoff
    records, coverage = ForecastService.build_interval_records(
        delivery_date=delivery_date,
        decision_cutoff=cutoff_dt,
        forecast_records=forecasts,
        actual_records=actuals
    )

    all_warnings = fuelhh_warnings + windfor_warnings
    is_syn = fuelhh_syn or windfor_syn
    data_source_label = (
        "Synthetic Test Fixture (Elexon offline)" if is_syn else "Elexon BMRS API (FUELHH & WINDFOR)"
    )

    return ForecastResponse(
        deliveryDate=delivery_date.isoformat(),
        decisionCutoff=format_iso_utc(cutoff_dt),
        decisionCutoffUk=format_uk_local(cutoff_dt),
        generationUnit=settings.GENERATION_UNIT,
        records=records,
        coverage=coverage,
        dataQualityWarnings=all_warnings,
        dataSource=data_source_label,
        isSynthetic=is_syn
    )


@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    start_date: date = Query(date(2026, 1, 1), description="Start delivery date in Jan 2026"),
    end_date: date = Query(date(2026, 1, 7), description="End delivery date in Jan 2026"),
    cutoff_hour_utc: int = Query(12, ge=0, le=23, description="Hour of Day-Ahead cutoff in UTC (default 12:00 UTC on D-1)")
):
    """
    Evaluate forecast accuracy across a date range in January 2026.
    Computes overall MAE, RMSE, Bias, and WAPE, alongside daily breakdowns.
    """
    _validate_date_in_january_2026(start_date, "start_date")
    _validate_date_in_january_2026(end_date, "end_date")

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than or equal to start_date.")

    current = start_date
    all_matched_records: List[IntervalRecord] = []
    records_by_day: Dict[date, List[IntervalRecord]] = {}
    any_synthetic = False

    while current <= end_date:
        cutoff_dt = datetime.combine(current - timedelta(days=1), time(cutoff_hour_utc, 0), tzinfo=timezone.utc)
        fuelhh_raw, fuelhh_syn = await elexon_client.fetch_fuelhh_actuals(current)
        windfor_raw, windfor_syn = await elexon_client.fetch_windfor_forecasts(current)

        if fuelhh_syn or windfor_syn:
            any_synthetic = True

        actuals, _ = DataNormalizer.normalize_fuelhh(fuelhh_raw)
        forecasts, _ = DataNormalizer.normalize_windfor(windfor_raw)

        day_records, _ = ForecastService.build_interval_records(
            delivery_date=current,
            decision_cutoff=cutoff_dt,
            forecast_records=forecasts,
            actual_records=actuals
        )

        records_by_day[current] = day_records
        all_matched_records.extend([r for r in day_records if r.status == "MATCHED"])
        current += timedelta(days=1)

    overall_metrics = MetricsService.calculate_metrics(
        records=all_matched_records,
        date_range_label=f"{start_date.isoformat()} to {end_date.isoformat()}"
    )

    daily_summaries = MetricsService.calculate_daily_metrics(records_by_day)

    return AccuracyResponse(
        startDate=start_date.isoformat(),
        endDate=end_date.isoformat(),
        decisionCutoff=f"Day-Ahead {cutoff_hour_utc:02d}:00 UTC",
        metrics=overall_metrics,
        matchedRecords=all_matched_records,
        dailySummaries=daily_summaries,
        dataSource="Synthetic Test Fixture" if any_synthetic else "Elexon BMRS API",
        isSynthetic=any_synthetic
    )


@router.get("/accuracy/daily", response_model=DailyAccuracyResponse)
async def get_daily_accuracy(
    start_date: date = Query(date(2026, 1, 1), description="Start delivery date in Jan 2026"),
    end_date: date = Query(date(2026, 1, 31), description="End delivery date in Jan 2026"),
    cutoff_hour_utc: int = Query(12, ge=0, le=23, description="Hour of Day-Ahead cutoff in UTC (default 12:00 UTC)")
):
    """
    Returns daily accuracy metrics (MAE, RMSE, Bias, WAPE) across all January 2026 dates.
    """
    _validate_date_in_january_2026(start_date, "start_date")
    _validate_date_in_january_2026(end_date, "end_date")

    current = start_date
    records_by_day: Dict[date, List[IntervalRecord]] = {}
    all_matched: List[IntervalRecord] = []

    while current <= end_date:
        cutoff_dt = datetime.combine(current - timedelta(days=1), time(cutoff_hour_utc, 0), tzinfo=timezone.utc)
        fuelhh_raw, _ = await elexon_client.fetch_fuelhh_actuals(current)
        windfor_raw, _ = await elexon_client.fetch_windfor_forecasts(current)

        actuals, _ = DataNormalizer.normalize_fuelhh(fuelhh_raw)
        forecasts, _ = DataNormalizer.normalize_windfor(windfor_raw)

        day_records, _ = ForecastService.build_interval_records(
            delivery_date=current,
            decision_cutoff=cutoff_dt,
            forecast_records=forecasts,
            actual_records=actuals
        )

        records_by_day[current] = day_records
        all_matched.extend([r for r in day_records if r.status == "MATCHED"])
        current += timedelta(days=1)

    daily_items = MetricsService.calculate_daily_metrics(records_by_day)
    overall = MetricsService.calculate_metrics(all_matched, f"{start_date} to {end_date}")

    return DailyAccuracyResponse(
        startDate=start_date.isoformat(),
        endDate=end_date.isoformat(),
        daily=daily_items,
        overall=overall
    )


@router.get("/data-status", response_model=DataStatusResponse)
async def get_data_status():
    """Return source retrieval status, cache health, and data coverage info."""
    api_online = await elexon_client.check_health()
    last_fetch_str = (
        format_iso_utc(elexon_client.last_successful_fetch)
        if elexon_client.last_successful_fetch
        else None
    )

    notes = [
        "FUELHH provides actual half-hourly wind generation (fuelType=WIND).",
        "WINDFOR provides wind generation forecast updates published ahead of delivery intervals.",
        "Analysis delivery dates are restricted strictly to 1 January 2026 through 31 January 2026.",
        "Forecast selection strictly excludes forecasts published after the selected decision cutoff."
    ]

    return DataStatusResponse(
        status="operational" if api_online else "degraded",
        lastSuccessfulFetch=last_fetch_str,
        elexonApiOnline=api_online,
        cacheEntriesCount=len(elexon_client._cache),
        supportedDateRange="2026-01-01 to 2026-01-31",
        dataSourceInfo=f"Official Elexon BMRS API ({settings.ELEXON_API_BASE_URL})",
        notes=notes
    )


@router.get("/export")
async def export_csv(
    delivery_date: date = Query(date(2026, 1, 1), description="Delivery date in January 2026"),
    decision_cutoff: Optional[str] = Query(None, description="Decision cutoff ISO timestamp")
):
    """
    Export delivery intervals and matched forecast/actual data as a CSV stream.
    Reuses the exact same forecast selection and matching logic.
    """
    _validate_date_in_january_2026(delivery_date, "delivery_date")

    if decision_cutoff:
        cutoff_dt = parse_iso_timestamp(decision_cutoff)
    else:
        cutoff_dt = _get_default_cutoff(delivery_date)

    fuelhh_raw, _ = await elexon_client.fetch_fuelhh_actuals(delivery_date)
    windfor_raw, _ = await elexon_client.fetch_windfor_forecasts(delivery_date)

    actuals, _ = DataNormalizer.normalize_fuelhh(fuelhh_raw)
    forecasts, _ = DataNormalizer.normalize_windfor(windfor_raw)

    records, _ = ForecastService.build_interval_records(
        delivery_date=delivery_date,
        decision_cutoff=cutoff_dt,
        forecast_records=forecasts,
        actual_records=actuals
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Settlement Period",
        "Delivery Start (UTC)",
        "Delivery Start (UK Local)",
        "Decision Cutoff (UTC)",
        "Forecast Publish Time (UTC)",
        "Forecast Publish Time (UK Local)",
        "Forecast Generation (MW)",
        "Actual Generation (MW)",
        "Forecast Error (MW)",
        "Absolute Error (MW)",
        "Lead Time (Hours)",
        "Record Status"
    ])

    for r in records:
        writer.writerow([
            r.settlementPeriod,
            r.startTime,
            r.startTimeUk,
            r.decisionCutoff,
            r.publishTime or "",
            r.publishTimeUk or "",
            r.forecastGeneration if r.forecastGeneration is not None else "",
            r.actualGeneration if r.actualGeneration is not None else "",
            r.forecastError if r.forecastError is not None else "",
            r.absoluteError if r.absoluteError is not None else "",
            r.leadTimeHours if r.leadTimeHours is not None else "",
            r.status.value
        ])

    output.seek(0)
    filename = f"windscope_uk_{delivery_date.isoformat()}_cutoff_{cutoff_dt.strftime('%Y%m%dT%H%M%SZ')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
