import math
from typing import List, Optional, Tuple, Dict
from datetime import date

from app.schemas import IntervalRecord, AccuracyMetrics, DailyAccuracyItem, RecordStatus


class MetricsService:
    """
    Calculates quantitative forecast accuracy metrics on matched intervals:
    MAE, RMSE, Mean Forecast Bias, and WAPE.
    """

    @staticmethod
    def calculate_metrics(
        records: List[IntervalRecord],
        date_range_label: str = "January 2026"
    ) -> AccuracyMetrics:
        """
        Calculate MAE, RMSE, Bias, and WAPE for matched forecast/actual pairs.
        Excludes missing or unmatched pairs safely.
        """
        matched_errors: List[float] = []
        actual_values: List[float] = []
        excluded_count = 0

        for r in records:
            if (
                r.status == RecordStatus.MATCHED
                and r.forecastGeneration is not None
                and r.actualGeneration is not None
            ):
                err = r.forecastGeneration - r.actualGeneration
                matched_errors.append(err)
                actual_values.append(r.actualGeneration)
            else:
                excluded_count += 1

        matched_count = len(matched_errors)

        if matched_count == 0:
            return AccuracyMetrics(
                mae=None,
                rmse=None,
                bias=None,
                wape=None,
                unit="MW",
                wapeUnit="%",
                matchedCount=0,
                excludedCount=excluded_count,
                dateRange=date_range_label,
                explanation="No matched forecast and actual generation pairs available for evaluation.",
                wapeExplanation="WAPE is undefined when no matched pairs exist."
            )

        # 1. MAE = mean(|forecast - actual|)
        mae = sum(abs(e) for e in matched_errors) / matched_count

        # 2. RMSE = sqrt(mean((forecast - actual)^2))
        mse = sum(e ** 2 for e in matched_errors) / matched_count
        rmse = math.sqrt(mse)

        # 3. Mean Bias = mean(forecast - actual)
        bias = sum(matched_errors) / matched_count

        # 4. WAPE = 100 * sum(|forecast - actual|) / sum(actual)
        sum_actual = sum(actual_values)
        wape: Optional[float] = None
        wape_expl: Optional[str] = None

        if sum_actual > 0:
            wape = round((100.0 * sum(abs(e) for e in matched_errors)) / sum_actual, 2)
            wape_expl = "Calculated as 100 * sum(|forecast error|) / sum(actual generation)."
        else:
            wape = None
            wape_expl = "WAPE is undefined because total actual generation in the evaluation period is zero."

        bias_direction = "overforecasting" if bias > 0 else ("underforecasting" if bias < 0 else "unbiased")
        explanation = (
            f"Evaluated on {matched_count} half-hourly intervals. "
            f"Mean Bias of {bias:+.1f} MW indicates average {bias_direction}."
        )

        return AccuracyMetrics(
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            bias=round(bias, 2),
            wape=wape,
            unit="MW",
            wapeUnit="%",
            matchedCount=matched_count,
            excludedCount=excluded_count,
            dateRange=date_range_label,
            explanation=explanation,
            wapeExplanation=wape_expl
        )

    @classmethod
    def calculate_daily_metrics(
        cls,
        records_by_day: Dict[date, List[IntervalRecord]]
    ) -> List[DailyAccuracyItem]:
        """Aggregate accuracy metrics per day."""
        daily_items: List[DailyAccuracyItem] = []

        for d in sorted(records_by_day.keys()):
            day_records = records_by_day[d]
            metrics = cls.calculate_metrics(day_records, date_range_label=d.isoformat())
            daily_items.append(
                DailyAccuracyItem(
                    deliveryDate=d.isoformat(),
                    mae=metrics.mae,
                    rmse=metrics.rmse,
                    bias=metrics.bias,
                    wape=metrics.wape,
                    matchedCount=metrics.matchedCount,
                    excludedCount=metrics.excludedCount
                )
            )

        return daily_items
