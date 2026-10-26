import pytest
import math
from datetime import date

from app.schemas import IntervalRecord, RecordStatus
from app.services.metrics import MetricsService


def _create_record(period: int, fc: float | None, act: float | None, status: RecordStatus) -> IntervalRecord:
    error = (fc - act) if (fc is not None and act is not None) else None
    abs_err = abs(error) if error is not None else None
    return IntervalRecord(
        settlementPeriod=period,
        startTime=f"2026-01-01T{period:02d}:00:00Z",
        startTimeUk=f"2026-01-01 {period:02d}:00 GMT",
        decisionCutoff="2025-12-31T12:00:00Z",
        decisionCutoffUk="2025-12-31 12:00 GMT",
        publishTime="2025-12-31T11:00:00Z" if fc is not None else None,
        publishTimeUk="2025-12-31 11:00 GMT" if fc is not None else None,
        forecastGeneration=fc,
        actualGeneration=act,
        forecastError=error,
        absoluteError=abs_err,
        leadTimeHours=24.0 if fc is not None else None,
        status=status
    )


def test_metrics_for_known_sample():
    # Known samples:
    # Pair 1: forecast=1000, actual=800 -> err = +200, |err| = 200, err^2 = 40000
    # Pair 2: forecast=1200, actual=1500 -> err = -300, |err| = 300, err^2 = 90000
    # Pair 3: forecast=2000, actual=2000 -> err = 0, |err| = 0, err^2 = 0
    # Sum err = -100 -> Bias = -100 / 3 = -33.33 MW
    # Sum |err| = 500 -> MAE = 500 / 3 = 166.67 MW
    # MSE = 130000 / 3 = 43333.33 -> RMSE = sqrt(43333.33) = 208.17 MW
    # Sum actual = 800 + 1500 + 2000 = 4300 MW
    # WAPE = 100 * 500 / 4300 = 11.63%

    records = [
        _create_record(1, 1000.0, 800.0, RecordStatus.MATCHED),
        _create_record(2, 1200.0, 1500.0, RecordStatus.MATCHED),
        _create_record(3, 2000.0, 2000.0, RecordStatus.MATCHED),
    ]

    metrics = MetricsService.calculate_metrics(records)

    assert metrics.matchedCount == 3
    assert metrics.excludedCount == 0
    assert metrics.mae == 166.67
    assert metrics.rmse == 208.17
    assert metrics.bias == -33.33
    assert metrics.wape == 11.63
    assert metrics.unit == "MW"
    assert metrics.wapeUnit == "%"


def test_positive_and_negative_bias():
    # Overforecasting (+bias)
    rec_over = [
        _create_record(1, 1500.0, 1000.0, RecordStatus.MATCHED),
        _create_record(2, 2200.0, 2000.0, RecordStatus.MATCHED),
    ]
    metrics_over = MetricsService.calculate_metrics(rec_over)
    assert metrics_over.bias == 350.0  # (500 + 200) / 2
    assert "overforecasting" in metrics_over.explanation

    # Underforecasting (-bias)
    rec_under = [
        _create_record(1, 800.0, 1000.0, RecordStatus.MATCHED),
        _create_record(2, 1800.0, 2000.0, RecordStatus.MATCHED),
    ]
    metrics_under = MetricsService.calculate_metrics(rec_under)
    assert metrics_under.bias == -200.0
    assert "underforecasting" in metrics_under.explanation


def test_null_wape_when_total_actual_is_zero():
    records = [
        _create_record(1, 100.0, 0.0, RecordStatus.MATCHED),
        _create_record(2, 50.0, 0.0, RecordStatus.MATCHED),
    ]
    metrics = MetricsService.calculate_metrics(records)
    assert metrics.wape is None
    assert "total actual generation in the evaluation period is zero" in metrics.wapeExplanation


def test_exclusion_of_unmatched_records():
    records = [
        _create_record(1, 1000.0, 900.0, RecordStatus.MATCHED),
        _create_record(2, None, 1200.0, RecordStatus.FORECAST_UNAVAILABLE),
        _create_record(3, 1400.0, None, RecordStatus.ACTUAL_UNAVAILABLE),
        _create_record(4, None, None, RecordStatus.DATA_UNAVAILABLE),
    ]
    metrics = MetricsService.calculate_metrics(records)
    assert metrics.matchedCount == 1
    assert metrics.excludedCount == 3
    assert metrics.mae == 100.0
    assert metrics.bias == 100.0


def test_empty_dataset_handling():
    metrics = MetricsService.calculate_metrics([])
    assert metrics.matchedCount == 0
    assert metrics.excludedCount == 0
    assert metrics.mae is None
    assert metrics.rmse is None
    assert metrics.bias is None
    assert metrics.wape is None


def test_daily_accuracy_aggregation():
    d1 = date(2026, 1, 1)
    d2 = date(2026, 1, 2)

    by_day = {
        d1: [
            _create_record(1, 1000.0, 900.0, RecordStatus.MATCHED),
            _create_record(2, None, 1000.0, RecordStatus.FORECAST_UNAVAILABLE),
        ],
        d2: [
            _create_record(1, 2000.0, 2200.0, RecordStatus.MATCHED),
        ]
    }

    daily = MetricsService.calculate_daily_metrics(by_day)
    assert len(daily) == 2
    assert daily[0].deliveryDate == "2026-01-01"
    assert daily[0].matchedCount == 1
    assert daily[0].excludedCount == 1
    assert daily[0].mae == 100.0
    assert daily[0].bias == 100.0

    assert daily[1].deliveryDate == "2026-01-02"
    assert daily[1].matchedCount == 1
    assert daily[1].excludedCount == 0
    assert daily[1].mae == 200.0
    assert daily[1].bias == -200.0
