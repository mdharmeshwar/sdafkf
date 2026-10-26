from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class RecordStatus(str, Enum):
    MATCHED = "MATCHED"
    FORECAST_UNAVAILABLE = "FORECAST_UNAVAILABLE"
    ACTUAL_UNAVAILABLE = "ACTUAL_UNAVAILABLE"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


class IntervalRecord(BaseModel):
    """Represents a single half-hourly interval for delivery with forecast & actual."""
    settlementPeriod: int = Field(..., ge=1, le=48, description="UK Settlement Period 1-48")
    startTime: str = Field(..., description="Delivery interval start in ISO 8601 UTC")
    startTimeUk: str = Field(..., description="Delivery interval start in UK local time")
    decisionCutoff: str = Field(..., description="Decision cutoff in ISO 8601 UTC")
    decisionCutoffUk: str = Field(..., description="Decision cutoff in UK local time")
    publishTime: Optional[str] = Field(None, description="Forecast publication time in ISO 8601 UTC")
    publishTimeUk: Optional[str] = Field(None, description="Forecast publication time in UK local time")
    forecastGeneration: Optional[float] = Field(None, description="Selected forecast generation in MW")
    actualGeneration: Optional[float] = Field(None, description="Recorded actual generation in MW")
    forecastError: Optional[float] = Field(None, description="Forecast error in MW (forecast - actual)")
    absoluteError: Optional[float] = Field(None, description="Absolute error in MW |forecast - actual|")
    leadTimeHours: Optional[float] = Field(None, description="Lead time in hours (delivery startTime - publishTime)")
    status: RecordStatus = Field(..., description="Status of the interval matching")
    dataQualityWarning: Optional[str] = Field(None, description="Any data quality note for this interval")


class CoverageStatistics(BaseModel):
    """Coverage statistics for the delivery period intervals."""
    totalIntervals: int
    matchedCount: int
    forecastAvailableCount: int
    actualAvailableCount: int
    forecastMissingCount: int
    actualMissingCount: int
    latestEligiblePublishTime: Optional[str] = None
    latestEligiblePublishTimeUk: Optional[str] = None


class AccuracyMetrics(BaseModel):
    """Quantitative forecast accuracy evaluation metrics."""
    mae: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    bias: Optional[float] = Field(None, description="Mean Forecast Bias in MW (forecast - actual)")
    wape: Optional[float] = Field(None, description="Weighted Absolute Percentage Error in %")
    unit: str = "MW"
    wapeUnit: str = "%"
    matchedCount: int
    excludedCount: int
    dateRange: str
    explanation: str
    wapeExplanation: Optional[str] = None


class DailyAccuracyItem(BaseModel):
    """Accuracy metrics for an individual delivery date."""
    deliveryDate: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    wape: Optional[float] = None
    matchedCount: int
    excludedCount: int


class ForecastResponse(BaseModel):
    """Response schema for GET /api/forecast."""
    deliveryDate: str
    decisionCutoff: str
    decisionCutoffUk: str
    generationUnit: str = "MW"
    records: List[IntervalRecord]
    coverage: CoverageStatistics
    dataQualityWarnings: List[str]
    dataSource: str
    isSynthetic: bool = False


class AccuracyResponse(BaseModel):
    """Response schema for GET /api/accuracy."""
    startDate: str
    endDate: str
    decisionCutoff: Optional[str] = None
    metrics: AccuracyMetrics
    matchedRecords: List[IntervalRecord]
    dailySummaries: List[DailyAccuracyItem]
    dataSource: str
    isSynthetic: bool = False


class DailyAccuracyResponse(BaseModel):
    """Response schema for GET /api/accuracy/daily."""
    startDate: str
    endDate: str
    daily: List[DailyAccuracyItem]
    overall: AccuracyMetrics


class DataStatusResponse(BaseModel):
    """Response schema for GET /api/data-status."""
    status: str
    lastSuccessfulFetch: Optional[str]
    elexonApiOnline: bool
    cacheEntriesCount: int
    supportedDateRange: str
    dataSourceInfo: str
    notes: List[str]


class DeliveryDatesResponse(BaseModel):
    """Response schema for GET /api/delivery-dates."""
    dates: List[str]
    defaultDate: str
    defaultCutoffTimeOfDayUtc: str
    minDate: str
    maxDate: str
