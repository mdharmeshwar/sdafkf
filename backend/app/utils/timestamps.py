from datetime import datetime, date, time, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple, Optional
from dateutil import parser

UK_TIMEZONE = ZoneInfo("Europe/London")
UTC_TIMEZONE = timezone.utc


def parse_iso_timestamp(ts_str: str) -> datetime:
    """
    Parse an ISO 8601 timestamp string into a timezone-aware UTC datetime.
    Rejects or handles invalid/naive timestamps strictly.
    """
    if not ts_str or not isinstance(ts_str, str):
        raise ValueError(f"Invalid timestamp format: {ts_str}")
    
    # Standard ISO parse
    try:
        dt = parser.isoparse(ts_str)
    except Exception as e:
        raise ValueError(f"Failed to parse timestamp '{ts_str}': {e}")
    
    if dt.tzinfo is None:
        # In strict mode, treat naive as UTC explicitly or raise
        dt = dt.replace(tzinfo=UTC_TIMEZONE)
    else:
        # Normalize to UTC
        dt = dt.astimezone(UTC_TIMEZONE)
    
    return dt


def format_iso_utc(dt: datetime) -> str:
    """Format a datetime as ISO 8601 UTC string (with Z suffix)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TIMEZONE)
    else:
        dt = dt.astimezone(UTC_TIMEZONE)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def format_uk_local(dt: datetime) -> str:
    """Format a datetime in UK local time (Europe/London)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TIMEZONE)
    local_dt = dt.astimezone(UK_TIMEZONE)
    tz_name = local_dt.strftime("%Z")
    return f"{local_dt.strftime('%Y-%m-%d %H:%M')} {tz_name}"


def is_in_january_2026(d: date) -> bool:
    """Check if a date falls in January 2026 (2026-01-01 to 2026-01-31)."""
    return d.year == 2026 and d.month == 1


def get_half_hourly_intervals(delivery_date: date) -> List[Tuple[int, datetime]]:
    """
    Generate all 48 standard UK half-hourly settlement intervals for a delivery day.
    Returns a list of tuples: (settlement_period, start_time_utc).
    settlement_period is 1-indexed (1 to 48).
    """
    intervals = []
    base_dt = datetime.combine(delivery_date, time.min, tzinfo=UTC_TIMEZONE)
    for period in range(1, 49):
        interval_start = base_dt + timedelta(minutes=30 * (period - 1))
        intervals.append((period, interval_start))
    return intervals


def calculate_lead_time_hours(start_time: datetime, publish_time: datetime) -> float:
    """
    Calculate forecast lead time in hours.
    Lead time = start_time - publish_time.
    Positive lead time indicates the forecast was published before delivery start.
    """
    delta = (start_time - publish_time).total_seconds()
    return round(delta / 3600.0, 2)
