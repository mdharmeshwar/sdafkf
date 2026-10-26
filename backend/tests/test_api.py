import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "WindScope UK" in data["service"]


def test_delivery_dates_endpoint():
    response = client.get("/api/delivery-dates")
    assert response.status_code == 200
    data = response.json()
    assert len(data["dates"]) == 31
    assert data["minDate"] == "2026-01-01"
    assert data["maxDate"] == "2026-01-31"


def test_forecast_endpoint_valid():
    response = client.get("/api/forecast?delivery_date=2026-01-01")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-01"
    assert len(data["records"]) == 48
    assert "coverage" in data


def test_forecast_endpoint_rejects_out_of_january():
    response = client.get("/api/forecast?delivery_date=2026-02-05")
    assert response.status_code == 400
    assert "strictly scoped to January 2026" in response.json()["detail"]


def test_accuracy_endpoint():
    response = client.get("/api/accuracy?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    data = response.json()
    assert data["startDate"] == "2026-01-01"
    assert data["endDate"] == "2026-01-02"
    assert "metrics" in data
    assert "dailySummaries" in data


def test_data_status_endpoint():
    response = client.get("/api/data-status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "supportedDateRange" in data


def test_csv_export_endpoint():
    response = client.get("/api/export?delivery_date=2026-01-01")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    content = response.text
    assert "Settlement Period,Delivery Start (UTC)" in content
    # Should have 49 lines (header + 48 intervals)
    lines = content.strip().split("\n")
    assert len(lines) == 49
