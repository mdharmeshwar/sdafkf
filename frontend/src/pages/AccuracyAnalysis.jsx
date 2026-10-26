import React, { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import ScatterChart from '../components/ScatterChart';
import DailyAccuracyChart from '../components/DailyAccuracyChart';
import { api } from '../services/api';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';

export default function AccuracyAnalysis({ initialStartDate = '2026-01-01', initialEndDate = '2026-01-31' }) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [cutoffHour, setCutoffHour] = useState(12);
  const [accuracyData, setAccuracyData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAccuracy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accRes, dailyRes] = await Promise.all([
        api.getAccuracy(startDate, endDate, cutoffHour),
        api.getDailyAccuracy(startDate, endDate, cutoffHour)
      ]);
      setAccuracyData(accRes);
      setDailyData(dailyRes.daily || []);
    } catch (err) {
      setError(err.message || 'Failed to load accuracy analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccuracy();
  }, [startDate, endDate, cutoffHour]);

  const metrics = accuracyData?.metrics;

  return (
    <div id="accuracy-analysis-page">
      {/* Date Range & Cutoff Selector Bar */}
      <div className="filter-card">
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="accuracy-start-date">
              <Calendar size={14} />
              <span>Start Delivery Date</span>
            </label>
            <input
              type="date"
              id="accuracy-start-date"
              className="filter-control"
              min="2026-01-01"
              max="2026-01-31"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="accuracy-end-date">
              <Calendar size={14} />
              <span>End Delivery Date</span>
            </label>
            <input
              type="date"
              id="accuracy-end-date"
              className="filter-control"
              min="2026-01-01"
              max="2026-01-31"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="accuracy-cutoff-hour">
              <span>Day-Ahead Cutoff Hour (UTC)</span>
            </label>
            <select
              id="accuracy-cutoff-hour"
              className="filter-control"
              value={cutoffHour}
              onChange={(e) => setCutoffHour(Number(e.target.value))}
            >
              <option value={9}>09:00 UTC (Early DA)</option>
              <option value={11}>11:00 UTC (NordPool DA Close)</option>
              <option value={12}>12:00 UTC (EPEX SPOT DA Close)</option>
              <option value={17}>17:00 UTC (Elexon Gate Closure)</option>
              <option value={23}>23:00 UTC (Late DA)</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={loadAccuracy}
            disabled={isLoading}
            id="refresh-accuracy-btn"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Computing...' : 'Recalculate'}</span>
          </button>
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Evaluating forecasts published strictly prior to <strong>{cutoffHour}:00 UTC on D-1</strong> against actual generation recorded during delivery.
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem', borderRadius: '8px', color: 'var(--error-rose)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          id="agg-metric-mae"
          title="Overall MAE"
          value={metrics?.mae}
          unit="MW"
          subtitle={`${metrics?.matchedCount || 0} matched intervals`}
          tooltip="Overall Mean Absolute Error across all matched intervals in the selected date range"
        />

        <MetricCard
          id="agg-metric-rmse"
          title="Overall RMSE"
          value={metrics?.rmse}
          unit="MW"
          subtitle={`${metrics?.excludedCount || 0} intervals excluded`}
          tooltip="Overall Root Mean Squared Error. Higher values reflect volatility risk"
        />

        <MetricCard
          id="agg-metric-bias"
          title="Overall Bias"
          value={metrics?.bias !== null && metrics?.bias !== undefined ? (metrics.bias > 0 ? `+${metrics.bias}` : metrics.bias) : null}
          unit="MW"
          variant={metrics?.bias > 0 ? 'warning' : 'default'}
          subtitle={metrics?.bias > 0 ? 'Persistent Overforecast' : 'Persistent Underforecast'}
          tooltip="Positive bias indicates systematic overforecasting; negative indicates underforecasting"
        />

        <MetricCard
          id="agg-metric-wape"
          title="Overall WAPE"
          value={metrics?.wape}
          unit="%"
          subtitle="Volume-Weighted % Error"
          tooltip={metrics?.wapeExplanation || "100 * sum(|Forecast - Actual|) / sum(Actual)"}
        />
      </div>

      {/* Accuracy Charts */}
      <div className="charts-grid">
        <DailyAccuracyChart dailyData={dailyData} />
      </div>

      <div className="charts-grid">
        <ScatterChart records={accuracyData?.matchedRecords} />
      </div>
    </div>
  );
}
