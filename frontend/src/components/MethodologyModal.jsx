import React from 'react';
import { X, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

export default function MethodologyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} id="methodology-modal-overlay">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BookOpen size={20} color="var(--forecast-blue)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Analytical Methodology & Metric Definitions
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.3rem', borderRadius: '50%' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4>1. As-Of Decision Cutoff Forecast Selection</h4>
            <p>
              In wholesale electricity procurement, day-ahead positions must be committed before market gate closures.
              To reconstruct what a procurement desk genuinely knew at decision time without lookahead bias,
              WindScope UK enforces the formal selection rule:
            </p>
            <div className="formula-box">
              selected_forecast(T, C) = arg max(P) [∀ forecasts where startTime = T and publishTime ≤ C]
            </div>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>T (startTime):</strong> Target 30-minute electricity settlement interval start timestamp.<br />
              <strong>C (decisionCutoff):</strong> Procurement decision deadline (configurable by the user).<br />
              <strong>P (publishTime):</strong> Elexon BMRS timestamp when the forecast was issued to the market.
            </p>
          </section>

          <section>
            <h4>2. Quantitative Accuracy Metrics</h4>
            <p>Metrics are calculated strictly over matched pairs (intervals with both an eligible forecast and recorded actual generation):</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>
                <strong>Mean Absolute Error (MAE):</strong>
                <div className="formula-box">MAE = (1 / N) * Σ |Forecast_i − Actual_i| (MW)</div>
                Quantifies average forecast deviation magnitude without penalizing direction.
              </li>
              <li>
                <strong>Root Mean Squared Error (RMSE):</strong>
                <div className="formula-box">RMSE = √[ (1 / N) * Σ (Forecast_i − Actual_i)² ] (MW)</div>
                Gives higher penalty to large forecast errors that cause expensive imbalance spikes.
              </li>
              <li>
                <strong>Mean Forecast Bias:</strong>
                <div className="formula-box">Bias = (1 / N) * Σ (Forecast_i − Actual_i) (MW)</div>
                Positive bias indicates systematic <em>overforecasting</em> (contracting excess power); negative indicates <em>underforecasting</em>.
              </li>
              <li>
                <strong>Weighted Absolute Percentage Error (WAPE):</strong>
                <div className="formula-box">WAPE = 100 * [ Σ |Forecast_i − Actual_i| ] / [ Σ Actual_i ] (%)</div>
                Volume-weighted percentage error. If total actual generation is zero, WAPE is returned as null with an explanation to avoid zero-division.
              </li>
            </ul>
          </section>

          <section>
            <h4>3. Missing Data vs Zero Values Policy</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} color="var(--actual-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Genuine Zero Generation (0 MW):</strong> Calm weather conditions yielding 0 MW generation are genuine observations and preserved in metric evaluation.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertCircle size={16} color="var(--warning-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Missing / Unmatched Intervals:</strong> Intervals where either forecast or actual generation is unrecorded are explicitly marked and excluded from accuracy metrics. Missing values are never fabricated or converted to zero.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h4>4. Official Data Sources</h4>
            <p>
              Data is sourced directly from the official Elexon Insights Solution (BMRS) REST APIs:
              <br />• <strong>FUELHH:</strong> Half-hourly outturn generation by fuel type (filtered to <code>WIND</code>).
              <br />• <strong>WINDFOR:</strong> Half-hourly and hourly wind power generation forecast revisions.
            </p>
          </section>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
