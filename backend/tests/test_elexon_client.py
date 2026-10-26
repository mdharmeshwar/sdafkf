import pytest
from datetime import date
from unittest.mock import patch
import httpx

from app.services.elexon_client import ElexonClient
from app.services.data_normalizer import DataNormalizer


@pytest.mark.asyncio
async def test_fetch_fuelhh_actuals_mocked():
    client = ElexonClient()
    mock_data = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T00:30:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 14250.0
        },
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T00:30:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "CCGT",
            "generation": 18000.0
        }
    ]

    mock_resp = httpx.Response(status_code=200, json=mock_data, request=httpx.Request("GET", "http://test"))

    with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
        records, is_syn = await client.fetch_fuelhh_actuals(date(2026, 1, 1))

    assert is_syn is False
    assert len(records) == 2

    # Verify normalizer filters out CCGT and keeps only WIND
    normalized, warnings = DataNormalizer.normalize_fuelhh(records)
    assert len(normalized) == 1
    assert normalized[0].generation == 14250.0


@pytest.mark.asyncio
async def test_fetch_windfor_forecasts_mocked():
    client = ElexonClient()
    mock_data = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-31T11:30:00Z",
            "startTime": "2026-01-01T12:00:00Z",
            "generation": 16500.0
        }
    ]

    mock_resp = httpx.Response(status_code=200, json=mock_data, request=httpx.Request("GET", "http://test"))

    with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
        records, is_syn = await client.fetch_windfor_forecasts(date(2026, 1, 1))

    assert is_syn is False
    assert len(records) == 1
    assert records[0]["generation"] == 16500.0


@pytest.mark.asyncio
async def test_fallback_to_synthetic_on_upstream_failure():
    client = ElexonClient()

    with patch.object(httpx.AsyncClient, "get", side_effect=httpx.ConnectError("Network down")):
        records, is_syn = await client.fetch_fuelhh_actuals(date(2026, 1, 2))

    # Expect synthetic fallback flag
    assert is_syn is True
    assert len(records) == 48
    assert records[0]["_is_synthetic"] is True


@pytest.mark.asyncio
async def test_caching_behavior():
    client = ElexonClient()
    mock_resp = httpx.Response(
        status_code=200,
        json=[{"startTime": "2026-01-01T00:00:00Z", "fuelType": "WIND", "generation": 1000}],
        request=httpx.Request("GET", "http://test")
    )

    with patch.object(httpx.AsyncClient, "get", return_value=mock_resp) as mock_get:
        # First call fetches via HTTP
        r1, _ = await client.fetch_fuelhh_actuals(date(2026, 1, 3))
        assert mock_get.call_count == 1

        # Second call hits cache
        r2, _ = await client.fetch_fuelhh_actuals(date(2026, 1, 3))
        assert mock_get.call_count == 1
        assert r1 == r2
