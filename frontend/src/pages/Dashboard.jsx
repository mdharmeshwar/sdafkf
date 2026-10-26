import React from 'react';
import MetricCard from '../components/MetricCard';
import GenerationChart from '../components/GenerationChart';
import ErrorChart from '../components/ErrorChart';
import { MetricsService } from '../utils/formatters';

export default function Dashboard({ forecastData, deliveryDate, isLoading }) {
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
        <div className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--forecast-blue)', borderRadius: '50%', marginBottom: '1rem' }} />
        <p>Retrieving and evaluating half-hourly forecasts as of decision cutoff...</p>
      </div>
    );
  }

  if (!forecastData || !forecastData.records) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
        No forecast records available for {deliveryDate}.
      </div>
    );
  }

  const records = forecastData.records;
  const coverage = forecastData.coverage;

  // Calculate day-specific metrics on matched records
  const matched = records.filter((r) => r.status === 'MATCHED');
  const matchedErrors = matched.map((r) => r.forecastError);
  const actualValues = matched.map((r) => r.actualGeneration);

  const mae = matched.length > 0 ? (matchedErrors.reduce((sum, e) => sum + Math.abs(e), 0) / matched.length) : null;
  const mse = matched.length > 0 ? (matchedErrors.reduce((sum, e) => sum + e * e, 0) / matched.length) : null;
  const rmse = mse !== null ? Math.sqrt(mse) : null;
  const bias = matched.length > 0 ? (matchedErrors.reduce((sum, e) => sum + e, 0) / matched.length) : null;
  const sumActual = actualValues.reduce((sum, a) => sum + a, 0);
  const wape = (sumActual > 0 && matched.length > 0)
    ? (100 * matchedErrors.reduce((sum, e) => sum + Math.abs(e), 0) / sumActual)
    : null;

  // Mean lead time
  const leadTimes = matched.filter((r) => r.leadTimeHours !== null).map((r) => r.leadTimeHours);
  const meanLeadTime = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;

  return (
    <div id="procurement-overview-dashboard">
      {/* KPI Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          id="metric-card-mae"
          title="Mean Absolute Error (MAE)"
          value={mae !== null ? mae.toFixed(1) : null}
          unit="MW"
          subtitle={`${matched.length} matched intervals`}
          tooltip="Average magnitude of forecast error across matched delivery intervals"
        />

        <MetricCard
          id="metric-card-rmse"
          title="Root Mean Squared Error (RMSE)"
          value={rmse !== null ? rmse.toFixed(1) : null}
          unit="MW"
          subtitle="Penalizes large deviations"
          tooltip="Square root of mean squared error. Highlights volatility risk for day-ahead position balancing"
        />

        <MetricCard
          id="metric-card-bias"
          title="Mean Forecast Bias"
          value={bias !== null ? (bias > 0 ? `+${bias.toFixed(1)}` : bias.toFixed(1)) : null}
          unit="MW"
          variant={bias > 0 ? 'warning' : (bias < 0 ? 'default' : 'success')}
          subtitle={bias > 0 ? 'Net Overforecasting' : (bias < 0 ? 'Net Underforecasting' : 'Neutral')}
          tooltip="Mean of (Forecast − Actual). Positive bias means utility contracted more power than delivered"
        />

        <MetricCard
          id="metric-card-wape"
          title="Weighted Abs % Error (WAPE)"
          value={wape !== null ? wape.toFixed(1) : null}
          unit="%"
          subtitle="Volume-weighted error"
          tooltip="100 * sum(|Forecast - Actual|) / sum(Actual). Safely handles zero denominators"
        />

        <MetricCard
          id="metric-card-coverage"
          title="Forecast Coverage"
          value={coverage?.forecastAvailableCount}
          unit={`/ ${coverage?.totalIntervals || 48}`}
          subtitle={`${coverage?.matchedCount} intervals matched with actuals`}
          tooltip="Number of half-hourly settlement intervals with eligible forecasts available by cutoff"
        />

        <MetricCard
          id="metric-card-lead-time"
          title="Avg Forecast Lead Time"
          value={meanLeadTime !== null ? meanLeadTime.toFixed(1) : null}
          unit="hrs"
          subtitle="Interval start minus publishTime"
          tooltip="Average duration between the publication of the forecast and the start of the delivery interval"
        />
      </div>

      {/* Main Charts */}
      <div className="charts-grid">
        <GenerationChart
          records={records}
          deliveryDate={deliveryDate}
          generationUnit={forecastData.generationUnit}
        />
        <ErrorChart
          records={records}
          deliveryDate={deliveryDate}
        />
      </div>
    </div>
  );
}
