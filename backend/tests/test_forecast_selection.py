import pytest
from datetime import datetime, date, timezone, timedelta

from app.services.forecast_service import ForecastService
from app.services.data_normalizer import NormalizedForecast, NormalizedActual, DataNormalizer
from app.utils.timestamps import parse_iso_timestamp, is_in_january_2026
from app.schemas import RecordStatus


def test_select_latest_forecast_published_before_cutoff():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    # 3 forecasts published at 06:00, 10:00, 11:30
    forecasts = [
        NormalizedForecast(interval_start, datetime(2025, 12, 31, 6, 0, tzinfo=timezone.utc), 10000.0),
        NormalizedForecast(interval_start, datetime(2025, 12, 31, 10, 0, tzinfo=timezone.utc), 12000.0),
        NormalizedForecast(interval_start, datetime(2025, 12, 31, 11, 30, tzinfo=timezone.utc), 13500.0),
    ]

    selected = ForecastService.select_forecast_for_interval(interval_start, cutoff, forecasts)
    assert selected is not None
    assert selected.generation == 13500.0
    assert selected.publish_time == datetime(2025, 12, 31, 11, 30, tzinfo=timezone.utc)


def test_exclude_forecast_published_one_second_after_cutoff():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, 0, tzinfo=timezone.utc)

    forecast_valid = NormalizedForecast(
        interval_start, datetime(2025, 12, 31, 11, 59, 59, tzinfo=timezone.utc), 11000.0
    )
    forecast_invalid = NormalizedForecast(
        interval_start, datetime(2025, 12, 31, 12, 0, 1, tzinfo=timezone.utc), 18000.0
    )

    selected = ForecastService.select_forecast_for_interval(
        interval_start, cutoff, [forecast_valid, forecast_invalid]
    )
    assert selected is not None
    assert selected.generation == 11000.0
    assert selected.publish_time == datetime(2025, 12, 31, 11, 59, 59, tzinfo=timezone.utc)


def test_return_unavailable_when_all_forecasts_published_after_cutoff():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 6, 0, tzinfo=timezone.utc)

    # Forecast published at 08:00 (after 06:00 cutoff)
    forecasts = [
        NormalizedForecast(interval_start, datetime(2025, 12, 31, 8, 0, tzinfo=timezone.utc), 14000.0)
    ]

    selected = ForecastService.select_forecast_for_interval(interval_start, cutoff, forecasts)
    assert selected is None


def test_select_forecasts_independently_for_each_delivery_interval():
    t1 = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    forecasts = [
        NormalizedForecast(t1, datetime(2025, 12, 31, 10, 0, tzinfo=timezone.utc), 10000.0),
        NormalizedForecast(t1, datetime(2025, 12, 31, 11, 0, tzinfo=timezone.utc), 11000.0),
        NormalizedForecast(t2, datetime(2025, 12, 31, 9, 0, tzinfo=timezone.utc), 15000.0),
    ]

    sel_t1 = ForecastService.select_forecast_for_interval(t1, cutoff, forecasts)
    sel_t2 = ForecastService.select_forecast_for_interval(t2, cutoff, forecasts)

    assert sel_t1 is not None and sel_t1.generation == 11000.0
    assert sel_t2 is not None and sel_t2.generation == 15000.0


def test_changing_cutoff_changes_selected_forecast():
    interval_start = datetime(2026, 1, 1, 18, 0, tzinfo=timezone.utc)

    f1 = NormalizedForecast(interval_start, datetime(2025, 12, 31, 9, 0, tzinfo=timezone.utc), 8000.0)
    f2 = NormalizedForecast(interval_start, datetime(2025, 12, 31, 15, 0, tzinfo=timezone.utc), 12000.0)
    f3 = NormalizedForecast(interval_start, datetime(2026, 1, 1, 6, 0, tzinfo=timezone.utc), 16000.0)
    forecasts = [f1, f2, f3]

    # Cutoff at Day-Ahead 12:00
    cutoff_da = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)
    sel_da = ForecastService.select_forecast_for_interval(interval_start, cutoff_da, forecasts)
    assert sel_da.generation == 8000.0

    # Cutoff at Day-Ahead 17:00
    cutoff_gate = datetime(2025, 12, 31, 17, 0, tzinfo=timezone.utc)
    sel_gate = ForecastService.select_forecast_for_interval(interval_start, cutoff_gate, forecasts)
    assert sel_gate.generation == 12000.0

    # Cutoff within-day
    cutoff_wd = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
    sel_wd = ForecastService.select_forecast_for_interval(interval_start, cutoff_wd, forecasts)
    assert sel_wd.generation == 16000.0


def test_duplicate_timestamps_handled_deterministically():
    raw_records = [
        {
            "startTime": "2026-01-01T12:00:00Z",
            "publishTime": "2025-12-31T10:00:00Z",
            "generation": 14000.0
        },
        {
            "startTime": "2026-01-01T12:00:00Z",
            "publishTime": "2025-12-31T10:00:00Z",
            "generation": 14000.0  # Identical duplicate
        },
        {
            "startTime": "2026-01-01T12:00:00Z",
            "publishTime": "2025-12-31T10:00:00Z",
            "generation": 15000.0  # Conflicting duplicate
        }
    ]

    normalized, warnings = DataNormalizer.normalize_windfor(raw_records)
    # Deduplicated to 1 record deterministically
    assert len(normalized) == 1
    assert normalized[0].generation == 14000.0
    assert len(warnings) == 1
    assert "Conflicting duplicate forecast" in warnings[0]


def test_january_delivery_date_filtering():
    assert is_in_january_2026(date(2026, 1, 1)) is True
    assert is_in_january_2026(date(2026, 1, 31)) is True
    assert is_in_january_2026(date(2025, 12, 31)) is False
    assert is_in_january_2026(date(2026, 2, 1)) is False
    assert is_in_january_2026(date(2024, 1, 15)) is False


def test_build_interval_records_full_day():
    delivery_date = date(2026, 1, 1)
    cutoff = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    # 48 intervals generated
    t_start = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    forecasts = [
        NormalizedForecast(t_start, datetime(2025, 12, 31, 10, 0, tzinfo=timezone.utc), 10000.0)
    ]
    actuals = [
        NormalizedActual(settlement_period=1, start_time=t_start, generation=9500.0)
    ]

    records, coverage = ForecastService.build_interval_records(
        delivery_date, cutoff, forecasts, actuals
    )

    assert len(records) == 48
    assert coverage.totalIntervals == 48
    assert records[0].status == RecordStatus.MATCHED
    assert records[0].forecastError == 500.0
    assert records[0].absoluteError == 500.0
    # Remaining 47 intervals have no forecast or actual
    assert records[1].status == RecordStatus.DATA_UNAVAILABLE


def test_forecast_published_exactly_at_cutoff_is_eligible():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, 0, tzinfo=timezone.utc)

    # Forecast published exactly at 12:00:00Z
    forecast = NormalizedForecast(interval_start, cutoff, 15500.0)

    selected = ForecastService.select_forecast_for_interval(interval_start, cutoff, [forecast])
    assert selected is not None
    assert selected.generation == 15500.0
    assert selected.publish_time == cutoff


def test_later_forecast_cannot_affect_historical_result():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    f_early = NormalizedForecast(interval_start, datetime(2025, 12, 31, 10, 0, tzinfo=timezone.utc), 12000.0)
    selected_initial = ForecastService.select_forecast_for_interval(interval_start, cutoff, [f_early])
    assert selected_initial.generation == 12000.0

    # Add subsequent forecasts published after the cutoff
    f_post1 = NormalizedForecast(interval_start, datetime(2025, 12, 31, 15, 0, tzinfo=timezone.utc), 16000.0)
    f_post2 = NormalizedForecast(interval_start, datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc), 20000.0)

    selected_after = ForecastService.select_forecast_for_interval(
        interval_start, cutoff, [f_early, f_post1, f_post2]
    )
    assert selected_after.generation == 12000.0
    assert selected_after.publish_time == datetime(2025, 12, 31, 10, 0, tzinfo=timezone.utc)


def test_timezone_normalization_preserves_ordering():
    interval_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    cutoff = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    # Parse ISO strings with different timezones:
    # ts1: 11:30 UTC -> 11:30:00Z
    # ts2: 13:45+02:00 -> 11:45:00Z (closer to cutoff)
    # ts3: 14:15+02:00 -> 12:15:00Z (after cutoff)
    f1 = NormalizedForecast(interval_start, parse_iso_timestamp("2025-12-31T11:30:00Z"), 10000.0)
    f2 = NormalizedForecast(interval_start, parse_iso_timestamp("2025-12-31T13:45:00+02:00"), 13000.0)
    f3 = NormalizedForecast(interval_start, parse_iso_timestamp("2025-12-31T14:15:00+02:00"), 19000.0)

    selected = ForecastService.select_forecast_for_interval(interval_start, cutoff, [f1, f2, f3])
    assert selected is not None
    # f2 is at 11:45 UTC, which is <= 12:00 UTC and latest
    assert selected.generation == 13000.0
    assert selected.publish_time == datetime(2025, 12, 31, 11, 45, tzinfo=timezone.utc)

