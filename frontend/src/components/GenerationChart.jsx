import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasForecast = data.forecastGeneration !== null && data.forecastGeneration !== undefined;
    const hasActual = data.actualGeneration !== null && data.actualGeneration !== undefined;

    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          fontSize: '0.8rem',
          color: '#f8fafc',
          minWidth: '240px'
        }}
      >
        <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
          Period {data.settlementPeriod} — {data.startTimeUk || data.startTime}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
            <span>Selected Forecast:</span>
            <strong>{hasForecast ? `${data.forecastGeneration.toLocaleString()} MW` : 'Unavailable'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
            <span>Observed Actual:</span>
            <strong>{hasActual ? `${data.actualGeneration.toLocaleString()} MW` : 'Not recorded'}</strong>
          </div>

          {hasForecast && hasActual && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: data.forecastError > 0 ? '#f59e0b' : '#38bdf8' }}>
              <span>Forecast Error (F - A):</span>
              <strong>{data.forecastError > 0 ? `+${data.forecastError}` : data.forecastError} MW</strong>
            </div>
          )}

          {data.publishTimeUk && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.725rem', color: '#94a3b8' }}>
              Published: {data.publishTimeUk} (Lead: {data.leadTimeHours} hrs)
            </div>
          )}

          <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: '#64748b' }}>
            Status: {data.status}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function GenerationChart({ records, deliveryDate, generationUnit = 'MW' }) {
  // Format data for chart
  const chartData = (records || []).map((r) => ({
    ...r,
    displayTime: (r.startTime || '').substring(11, 16) || `SP ${r.settlementPeriod}`,
  }));

  return (
    <div className="chart-card" id="generation-chart-container">
      <div className="chart-card-header">
        <div className="chart-title-wrap">
          <h3>Day-Ahead Wind Forecast vs Actual Generation</h3>
          <p>
            48 Half-Hourly Intervals for {deliveryDate} ({generationUnit}). Showing forecasts available prior to cutoff.
          </p>
        </div>

        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#38bdf8' }} />
            <span>Eligible Forecast</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#10b981' }} />
            <span>Observed Actual</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="displayTime"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={3}
              label={{
                value: 'Delivery Interval Start (UTC / UK Local Time)',
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: `Generation (${generationUnit})`,
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                offset: 5
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* connectNulls=false ensures missing intervals are not interpolated */}
            <Line
              type="monotone"
              dataKey="forecastGeneration"
              name="Forecast"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#38bdf8' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="actualGeneration"
              name="Actual Generation"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="4 2"
              dot={{ r: 2.5, fill: '#10b981' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
