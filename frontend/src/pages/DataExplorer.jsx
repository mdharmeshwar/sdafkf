import React from 'react';
import DataTable from '../components/DataTable';

export default function DataExplorer({ records, deliveryDate, onExportCsv, coverage }) {
  return (
    <div id="data-explorer-page">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Settlement Interval Data Explorer
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Auditable record of all 48 half-hourly settlement periods for {deliveryDate}.
          </p>
        </div>

        {coverage && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <span className="badge badge-matched">Matched: {coverage.matchedCount}</span>
            <span className="badge badge-unavail">Missing Forecast: {coverage.forecastMissingCount}</span>
            <span className="badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
              Missing Actual: {coverage.actualMissingCount}
            </span>
          </div>
        )}
      </div>

      <DataTable
        records={records}
        onExportCsv={onExportCsv}
        deliveryDate={deliveryDate}
      />
    </div>
  );
}
