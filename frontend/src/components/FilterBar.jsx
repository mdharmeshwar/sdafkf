import React from 'react';
import { Calendar, Clock, Download, RefreshCw, Info, Filter } from 'lucide-react';

export default function FilterBar({
  deliveryDate,
  onDeliveryDateChange,
  cutoffDate,
  onCutoffDateChange,
  cutoffTime,
  onCutoffTimeChange,
  onPresetCutoff,
  onApply,
  onExportCsv,
  isLoading,
  cutoffUkLabel,
  latestEligiblePubUk,
  dataSourceLabel,
  isSynthetic
}) {
  return (
    <div className="filter-card" id="procurement-filter-bar">
      <div className="filter-grid">
        {/* Delivery Date Selector */}
        <div className="filter-group">
          <label htmlFor="delivery-date-select" className="filter-label">
            <Calendar size={14} />
            <span>Delivery Date (Jan 2026)</span>
          </label>
          <input
            type="date"
            id="delivery-date-select"
            className="filter-control"
            min="2026-01-01"
            max="2026-01-31"
            value={deliveryDate}
            onChange={(e) => onDeliveryDateChange(e.target.value)}
          />
        </div>

        {/* Decision Cutoff Date Selector */}
        <div className="filter-group">
          <label htmlFor="cutoff-date-input" className="filter-label">
            <Clock size={14} />
            <span>Cutoff Date</span>
          </label>
          <input
            type="date"
            id="cutoff-date-input"
            className="filter-control"
            value={cutoffDate}
            onChange={(e) => onCutoffDateChange(e.target.value)}
          />
        </div>

        {/* Decision Cutoff Time Selector */}
        <div className="filter-group">
          <label htmlFor="cutoff-time-input" className="filter-label">
            <Clock size={14} />
            <span>Cutoff Time (UTC)</span>
          </label>
          <input
            type="time"
            id="cutoff-time-input"
            className="filter-control"
            value={cutoffTime}
            onChange={(e) => onCutoffTimeChange(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="filter-group" style={{ flexDirection: 'row', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={onApply}
            disabled={isLoading}
            id="re-evaluate-forecast-btn"
            title="Reconstruct eligible forecasts available at this cutoff"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Re-evaluating...' : 'Apply Cutoff'}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={onExportCsv}
            id="export-csv-btn"
            title="Export 48 delivery intervals and matched data as CSV"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Preset shortcuts for energy traders */}
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cutoff Presets:</span>
        <button
          className="btn btn-outline"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          onClick={() => onPresetCutoff('DA_11')}
        >
          Day-Ahead 11:00 UTC
        </button>
        <button
          className="btn btn-outline"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          onClick={() => onPresetCutoff('DA_12')}
        >
          Day-Ahead 12:00 UTC
        </button>
        <button
          className="btn btn-outline"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          onClick={() => onPresetCutoff('DA_17')}
        >
          Gate Closure (D-1 17:00 UTC)
        </button>
        <button
          className="btn btn-outline"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          onClick={() => onPresetCutoff('WD_06')}
        >
          Within-Day 06:00 UTC
        </button>
      </div>

      {/* Prominent Banner Displaying Selected Cutoff in UK Local Time */}
      <div className="cutoff-display-banner" id="cutoff-info-banner">
        <div>
          <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Active Decision Cutoff:</span>
          <span className="cutoff-badge-local" id="cutoff-local-time-label">
            {cutoffUkLabel || 'Evaluating...'}
          </span>
        </div>

        <div className="pub-time-badge">
          <span>Latest Eligible Publication Time: </span>
          <strong id="latest-eligible-pub-label">{latestEligiblePubUk || 'None eligible'}</strong>
        </div>

        {isSynthetic && (
          <span className="badge badge-synthetic" title="Using labeled synthetic fixture for development/offline mode">
            Synthetic Fallback Active
          </span>
        )}
      </div>
    </div>
  );
}
