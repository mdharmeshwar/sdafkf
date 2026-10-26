import pytest
from datetime import datetime, date, timezone, timedelta

from app.utils.timestamps import (
    parse_iso_timestamp,
    format_iso_utc,
    format_uk_local,
    get_half_hourly_intervals,
    is_in_january_2026,
    calculate_lead_time_hours
)


def test_parse_iso_timestamp_utc():
    ts = "2026-01-01T12:00:00Z"
    dt = parse_iso_timestamp(ts)
    assert dt.year == 2026
    assert dt.month == 1
    assert dt.day == 1
    assert dt.hour == 12
    assert dt.minute == 0
    assert dt.tzinfo == timezone.utc


def test_parse_iso_timestamp_with_offset():
    ts = "2026-01-01T14:00:00+02:00"
    dt = parse_iso_timestamp(ts)
    # 14:00+02:00 normalized to UTC is 12:00 UTC
    assert dt.hour == 12
    assert dt.tzinfo == timezone.utc


def test_parse_malformed_timestamp_raises():
    with pytest.raises(ValueError):
        parse_iso_timestamp("not-a-timestamp")
    with pytest.raises(ValueError):
        parse_iso_timestamp("")


def test_format_uk_local_in_january():
    # In January, UK is on GMT (UTC+0)
    dt = datetime(2026, 1, 15, 14, 30, tzinfo=timezone.utc)
    uk_str = format_uk_local(dt)
    assert uk_str == "2026-01-15 14:30 GMT"


def test_get_half_hourly_intervals_generates_48():
    d = date(2026, 1, 10)
    intervals = get_half_hourly_intervals(d)
    assert len(intervals) == 48

    # Period 1 is 00:00:00Z
    assert intervals[0][0] == 1
    assert intervals[0][1] == datetime(2026, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Period 48 is 23:30:00Z
    assert intervals[47][0] == 48
    assert intervals[47][1] == datetime(2026, 1, 10, 23, 30, tzinfo=timezone.utc)


def test_calculate_lead_time_hours():
    delivery_start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    publish_time = datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)
    lead_hours = calculate_lead_time_hours(delivery_start, publish_time)
    assert lead_hours == 24.0

    publish_within_day = datetime(2026, 1, 1, 10, 30, tzinfo=timezone.utc)
    assert calculate_lead_time_hours(delivery_start, publish_within_day) == 1.5
