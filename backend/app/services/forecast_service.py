from datetime import datetime, date, time, timezone, timedelta
from typing import List, Dict, Tuple, Optional

from app.schemas import IntervalRecord, RecordStatus, CoverageStatistics
from app.services.data_normalizer import NormalizedActual, NormalizedForecast
from app.utils.timestamps import (
    format_iso_utc,
    format_uk_local,
    get_half_hourly_intervals,
    calculate_lead_time_hours
)


class ForecastService:
    """
    Executes the critical as-of forecast selection logic:
    selected_forecast(T, C) = arg max(P) for all forecasts where startTime = T and publishTime <= C
    """

    @staticmethod
    def select_forecast_for_interval(
        interval_start: datetime,
        decision_cutoff: datetime,
        forecast_records: List[NormalizedForecast]
    ) -> Optional[NormalizedForecast]:
        """
        Pure business logic function:
        Selects the latest forecast published at or before decision_cutoff for a specific delivery interval.
        """
        # Ensure cutoff is timezone aware
        if decision_cutoff.tzinfo is None:
            decision_cutoff = decision_cutoff.replace(tzinfo=timezone.utc)
        if interval_start.tzinfo is None:
            interval_start = interval_start.replace(tzinfo=timezone.utc)

        # Filter strictly: startTime == interval_start and publish_time <= decision_cutoff
        eligible = [
            f for f in forecast_records
            if f.start_time == interval_start and f.publish_time <= decision_cutoff
        ]

        if not eligible:
            return None

        # arg max(P)
        return max(eligible, key=lambda f: f.publish_time)

    @classmethod
    def build_interval_records(
        cls,
        delivery_date: date,
        decision_cutoff: datetime,
        forecast_records: List[NormalizedForecast],
        actual_records: List[NormalizedActual]
    ) -> Tuple[List[IntervalRecord], CoverageStatistics]:
        """
        Constructs the 48 delivery intervals for the day, evaluating forecast vs actual as of decision_cutoff.
        """
        if decision_cutoff.tzinfo is None:
            decision_cutoff = decision_cutoff.replace(tzinfo=timezone.utc)

        # Index actuals by start_time
        actuals_by_start: Dict[datetime, NormalizedActual] = {
            a.start_time: a for a in actual_records
        }

        intervals = get_half_hourly_intervals(delivery_date)
        records: List[IntervalRecord] = []

        matched_count = 0
        forecast_avail_count = 0
        actual_avail_count = 0
        latest_eligible_pub: Optional[datetime] = None

        for period, interval_start in intervals:
            selected_fc = cls.select_forecast_for_interval(
                interval_start=interval_start,
                decision_cutoff=decision_cutoff,
                forecast_records=forecast_records
            )

            actual_entry = actuals_by_start.get(interval_start)

            fc_gen = selected_fc.generation if selected_fc is not None else None
            act_gen = actual_entry.generation if actual_entry is not None else None

            if fc_gen is not None:
                forecast_avail_count += 1
                if latest_eligible_pub is None or selected_fc.publish_time > latest_eligible_pub:
                    latest_eligible_pub = selected_fc.publish_time

            if act_gen is not None:
                actual_avail_count += 1

            # Determine status & error metrics
            error: Optional[float] = None
            abs_error: Optional[float] = None
            lead_time: Optional[float] = None

            if fc_gen is not None and act_gen is not None:
                status = RecordStatus.MATCHED
                matched_count += 1
                error = round(fc_gen - act_gen, 2)
                abs_error = round(abs(fc_gen - act_gen), 2)
                lead_time = calculate_lead_time_hours(interval_start, selected_fc.publish_time)
            elif fc_gen is not None and act_gen is None:
                status = RecordStatus.ACTUAL_UNAVAILABLE
                lead_time = calculate_lead_time_hours(interval_start, selected_fc.publish_time)
            elif fc_gen is None and act_gen is not None:
                status = RecordStatus.FORECAST_UNAVAILABLE
            else:
                status = RecordStatus.DATA_UNAVAILABLE

            rec = IntervalRecord(
                settlementPeriod=period,
                startTime=format_iso_utc(interval_start),
                startTimeUk=format_uk_local(interval_start),
                decisionCutoff=format_iso_utc(decision_cutoff),
                decisionCutoffUk=format_uk_local(decision_cutoff),
                publishTime=format_iso_utc(selected_fc.publish_time) if selected_fc else None,
                publishTimeUk=format_uk_local(selected_fc.publish_time) if selected_fc else None,
                forecastGeneration=fc_gen,
                actualGeneration=act_gen,
                forecastError=error,
                absoluteError=abs_error,
                leadTimeHours=lead_time,
                status=status,
                dataQualityWarning=None
            )
            records.append(rec)

        coverage = CoverageStatistics(
            totalIntervals=len(intervals),
            matchedCount=matched_count,
            forecastAvailableCount=forecast_avail_count,
            actualAvailableCount=actual_avail_count,
            forecastMissingCount=len(intervals) - forecast_avail_count,
            actualMissingCount=len(intervals) - actual_avail_count,
            latestEligiblePublishTime=format_iso_utc(latest_eligible_pub) if latest_eligible_pub else None,
            latestEligiblePublishTimeUk=format_uk_local(latest_eligible_pub) if latest_eligible_pub else None
        )

        return records, coverage
