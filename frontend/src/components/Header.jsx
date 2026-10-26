import React from 'react';
import { Wind, HelpCircle, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function Header({ dataStatus, onOpenMethodology }) {
  const isOnline = dataStatus?.elexonApiOnline;
  const isSynthetic = dataStatus?.status === 'degraded';

  return (
    <header className="header" id="app-header">
      <div className="brand-section">
        <div className="brand-logo" aria-label="WindScope UK Logo">
          <Wind size={24} />
        </div>
        <div className="brand-title-wrap">
          <h1>
            WindScope UK
            <span className="badge badge-live">January 2026</span>
          </h1>
          <p className="brand-tagline">
            Historical Wind Generation Forecast Analytics & Accuracy Evaluation for Procurement Decision-Makers
          </p>
        </div>
      </div>

      <div className="header-actions">
        {dataStatus && (
          <div
            className={`badge ${isOnline ? 'badge-live' : 'badge-synthetic'}`}
            title={`Source: ${dataStatus.dataSourceInfo || 'Elexon'}. Last fetch: ${dataStatus.lastSuccessfulFetch || 'N/A'}`}
            id="status-indicator-badge"
          >
            {isOnline ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            <span>{isOnline ? 'Elexon Live Stream' : 'Degraded / Fallback'}</span>
          </div>
        )}

        <button
          className="btn btn-outline"
          onClick={onOpenMethodology}
          id="open-methodology-btn"
          title="Inspect Forecast Selection Methodology & Metric Formulations"
        >
          <HelpCircle size={16} />
          <span>Methodology</span>
        </button>
      </div>
    </header>
  );
}
