import logging
from dataclasses import dataclass
from datetime import datetime, date
from typing import List, Dict, Any, Tuple, Optional

from app.utils.timestamps import parse_iso_timestamp

logger = logging.getLogger("windscope.normalizer")


@dataclass(frozen=True)
class NormalizedActual:
    settlement_period: int
    start_time: datetime
    generation: float
    is_synthetic: bool = False


@dataclass(frozen=True)
class NormalizedForecast:
    start_time: datetime
    publish_time: datetime
    generation: float
    is_synthetic: bool = False


class DataNormalizer:
    """
    Validates and normalizes raw records from Elexon BMRS into typed structures.
    Enforces timezone-aware UTC timestamps, filters fuel type, and resolves duplicates deterministically.
    """

    @staticmethod
    def normalize_fuelhh(raw_records: List[Dict[str, Any]]) -> Tuple[List[NormalizedActual], List[str]]:
        """
        Normalize raw FUELHH records.
        Returns (normalized_records, data_quality_warnings).
        """
        warnings: List[str] = []
        actuals_by_start: Dict[datetime, NormalizedActual] = {}

        for item in raw_records:
            try:
                fuel_type = str(item.get("fuelType", "")).strip().upper()
                if fuel_type != "WIND":
                    continue

                raw_start = item.get("startTime")
                if not raw_start:
                    warnings.append(f"Skipping FUELHH record missing startTime: {item}")
                    continue
                start_dt = parse_iso_timestamp(raw_start)

                raw_gen = item.get("generation")
                if raw_gen is None:
                    continue
                generation = float(raw_gen)

                period = int(item.get("settlementPeriod", 0))
                is_syn = bool(item.get("_is_synthetic", False))

                norm = NormalizedActual(
                    settlement_period=period,
                    start_time=start_dt,
                    generation=generation,
                    is_synthetic=is_syn
                )

                if start_dt in actuals_by_start:
                    existing = actuals_by_start[start_dt]
                    if abs(existing.generation - generation) > 0.01:
                        warn_msg = (
                            f"Conflicting duplicate actual generation at {raw_start}: "
                            f"{existing.generation} MW vs {generation} MW. Retaining first deterministic record."
                        )
                        warnings.append(warn_msg)
                        logger.warning(warn_msg)
                    # If identical or conflict, retain first deterministic record
                else:
                    actuals_by_start[start_dt] = norm

            except Exception as e:
                warnings.append(f"Error parsing FUELHH record: {e}")

        # Return sorted by start_time
        sorted_records = sorted(actuals_by_start.values(), key=lambda x: x.start_time)
        return sorted_records, warnings

    @staticmethod
    def normalize_windfor(raw_records: List[Dict[str, Any]]) -> Tuple[List[NormalizedForecast], List[str]]:
        """
        Normalize raw WINDFOR records.
        Returns (normalized_records, data_quality_warnings).
        """
        warnings: List[str] = []
        forecasts_by_key: Dict[Tuple[datetime, datetime], NormalizedForecast] = {}

        for item in raw_records:
            try:
                raw_start = item.get("startTime")
                raw_pub = item.get("publishTime")
                if not raw_start or not raw_pub:
                    warnings.append(f"Skipping WINDFOR record missing timestamps: {item}")
                    continue

                start_dt = parse_iso_timestamp(raw_start)
                pub_dt = parse_iso_timestamp(raw_pub)

                raw_gen = item.get("generation")
                if raw_gen is None:
                    continue
                generation = float(raw_gen)

                is_syn = bool(item.get("_is_synthetic", False))

                key = (start_dt, pub_dt)
                norm = NormalizedForecast(
                    start_time=start_dt,
                    publish_time=pub_dt,
                    generation=generation,
                    is_synthetic=is_syn
                )

                if key in forecasts_by_key:
                    existing = forecasts_by_key[key]
                    if abs(existing.generation - generation) > 0.01:
                        warn_msg = (
                            f"Conflicting duplicate forecast for start={raw_start}, pub={raw_pub}: "
                            f"{existing.generation} MW vs {generation} MW. Retaining first deterministic record."
                        )
                        warnings.append(warn_msg)
                        logger.warning(warn_msg)
                else:
                    forecasts_by_key[key] = norm

            except Exception as e:
                warnings.append(f"Error parsing WINDFOR record: {e}")

        sorted_records = sorted(forecasts_by_key.values(), key=lambda x: (x.start_time, x.publish_time))
        return sorted_records, warnings
