import httpx
import logging
import math
import random
from datetime import date, datetime, timedelta, timezone, time
from typing import Dict, Any, List, Optional, Tuple

from app.config import settings
from app.utils.timestamps import parse_iso_timestamp, format_iso_utc, is_in_january_2026

logger = logging.getLogger("windscope.elexon")


class ElexonClient:
    """
    Client for retrieving actual wind generation (FUELHH) and wind forecast (WINDFOR)
    from official Elexon BMRS API with TTL caching and robust error handling.
    """

    def __init__(self):
        self.base_url = settings.ELEXON_API_BASE_URL.rstrip("/")
        self.fuelhh_endpoint = settings.FUELHH_ENDPOINT
        self.windfor_endpoint = settings.WINDFOR_ENDPOINT
        self.timeout = settings.REQUEST_TIMEOUT_SECONDS
        self.cache_ttl = settings.CACHE_TTL_SECONDS
        
        # In-memory cache: {cache_key: (stored_timestamp, data, is_synthetic)}
        self._cache: Dict[str, Tuple[datetime, List[Dict[str, Any]], bool]] = {}
        self.last_successful_fetch: Optional[datetime] = None
        self.last_fetch_source: str = "Uninitialized"

    def _get_cache(self, key: str) -> Optional[Tuple[List[Dict[str, Any]], bool]]:
        if key in self._cache:
            cached_time, data, is_syn = self._cache[key]
            if (datetime.now(timezone.utc) - cached_time).total_seconds() < self.cache_ttl:
                return data, is_syn
            else:
                del self._cache[key]
        return None

    def _set_cache(self, key: str, data: List[Dict[str, Any]], is_synthetic: bool = False):
        now = datetime.now(timezone.utc)
        self._cache[key] = (now, data, is_synthetic)
        if not is_synthetic:
            self.last_successful_fetch = now
            self.last_fetch_source = "Elexon BMRS API"

    async def check_health(self) -> bool:
        """Check if Elexon API is reachable."""
        test_url = f"{self.base_url}{self.fuelhh_endpoint}"
        params = {
            "settlementDateFrom": "2026-01-01",
            "settlementDateTo": "2026-01-01",
            "fuelType": "WIND"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(test_url, params=params)
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Elexon health check failed: {e}")
            return False

    async def fetch_fuelhh_actuals(self, delivery_date: date) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Fetch actual wind generation records (FUELHH) for a single delivery day.
        Returns (records, is_synthetic).
        """
        cache_key = f"FUELHH_{delivery_date.isoformat()}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}{self.fuelhh_endpoint}"
        params = {
            "settlementDateFrom": delivery_date.isoformat(),
            "settlementDateTo": delivery_date.isoformat(),
            "fuelType": settings.FUEL_TYPE_WIND
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    # stream endpoint returns a list directly or a dict with 'data'
                    records = data if isinstance(data, list) else data.get("data", [])
                    self._set_cache(cache_key, records, is_synthetic=False)
                    return records, False
                else:
                    logger.warning(f"Elexon FUELHH returned HTTP {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.error(f"Elexon FUELHH network error: {e}")

        # Fallback to clearly labeled synthetic fixture if live upstream is unavailable
        logger.warning(f"Using synthetic fallback for FUELHH {delivery_date}")
        synthetic_records = self._generate_synthetic_fuelhh(delivery_date)
        self._set_cache(cache_key, synthetic_records, is_synthetic=True)
        return synthetic_records, True

    async def fetch_windfor_forecasts(self, delivery_date: date) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Fetch WINDFOR forecast records relevant for a delivery date.
        Queries forecasts published between delivery_date - 2 days and delivery_date + 1 day.
        Returns (records, is_synthetic).
        """
        cache_key = f"WINDFOR_{delivery_date.isoformat()}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        # Window: 2 days before delivery to end of delivery day
        start_dt = datetime.combine(delivery_date - timedelta(days=2), time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(delivery_date + timedelta(days=1), time.min, tzinfo=timezone.utc)

        url = f"{self.base_url}{self.windfor_endpoint}"
        params = {
            "publishDateTimeFrom": format_iso_utc(start_dt),
            "publishDateTimeTo": format_iso_utc(end_dt)
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    records = data if isinstance(data, list) else data.get("data", [])
                    self._set_cache(cache_key, records, is_synthetic=False)
                    return records, False
                else:
                    logger.warning(f"Elexon WINDFOR returned HTTP {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.error(f"Elexon WINDFOR network error: {e}")

        # Fallback to clearly labeled synthetic fixture
        logger.warning(f"Using synthetic fallback for WINDFOR {delivery_date}")
        synthetic_records = self._generate_synthetic_windfor(delivery_date)
        self._set_cache(cache_key, synthetic_records, is_synthetic=True)
        return synthetic_records, True

    def _generate_synthetic_fuelhh(self, delivery_date: date) -> List[Dict[str, Any]]:
        """Generate deterministic, clearly labeled synthetic actual records."""
        rng = random.Random(f"fuelhh_{delivery_date.isoformat()}")
        records = []
        base_power = 12000 + 4000 * math.sin(delivery_date.day * 0.5)

        for period in range(1, 49):
            start_dt = datetime.combine(delivery_date, time.min, tzinfo=timezone.utc) + timedelta(minutes=30 * (period - 1))
            pub_dt = start_dt + timedelta(minutes=30)
            variation = 2500 * math.sin((period / 48.0) * 2 * math.pi) + rng.uniform(-400, 400)
            actual_gen = max(0, round(base_power + variation))
            records.append({
                "dataset": "FUELHH_SYNTHETIC_FIXTURE",
                "publishTime": format_iso_utc(pub_dt),
                "startTime": format_iso_utc(start_dt),
                "settlementDate": delivery_date.isoformat(),
                "settlementPeriod": period,
                "fuelType": "WIND",
                "generation": actual_gen,
                "_is_synthetic": True
            })
        return records

    def _generate_synthetic_windfor(self, delivery_date: date) -> List[Dict[str, Any]]:
        """Generate deterministic, clearly labeled synthetic forecast records."""
        rng = random.Random(f"windfor_{delivery_date.isoformat()}")
        records = []
        base_power = 12000 + 4000 * math.sin(delivery_date.day * 0.5)

        # Generate publication updates across the 24 hours prior to delivery
        # Publications every 3 hours: D-1 06:00, 09:00, 12:00, 15:00, 18:00, 21:00, D 00:00, 03:00, 06:00
        pub_base = datetime.combine(delivery_date - timedelta(days=1), time(6, 0), tzinfo=timezone.utc)
        publication_times = [pub_base + timedelta(hours=3 * i) for i in range(10)]

        for period in range(1, 49):
            start_dt = datetime.combine(delivery_date, time.min, tzinfo=timezone.utc) + timedelta(minutes=30 * (period - 1))
            actual_var = 2500 * math.sin((period / 48.0) * 2 * math.pi)
            actual_true = max(0, base_power + actual_var)

            for pub_dt in publication_times:
                # Forecast error decreases as publication approaches delivery start
                lead_hours = max(0.5, (start_dt - pub_dt).total_seconds() / 3600.0)
                error_scale = min(2200, 300 + lead_hours * 50)
                forecast_error = rng.uniform(-error_scale, error_scale)
                forecast_gen = max(0, round(actual_true + forecast_error))

                records.append({
                    "dataset": "WINDFOR_SYNTHETIC_FIXTURE",
                    "publishTime": format_iso_utc(pub_dt),
                    "startTime": format_iso_utc(start_dt),
                    "generation": forecast_gen,
                    "_is_synthetic": True
                })
        return records


elexon_client = ElexonClient()
