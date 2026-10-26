import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';

function CustomErrorTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.forecastError === null || data.forecastError === undefined) {
      return null;
    }

    const isOver = data.forecastError > 0;
    const isUnder = data.forecastError < 0;

    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.8rem',
          color: '#f8fafc',
          minWidth: '220px'
        }}
      >
        <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
          Period {data.settlementPeriod} ({data.startTimeUk || data.startTime})
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span>Forecast Error (F - A):</span>
          <strong style={{ color: isOver ? '#f59e0b' : (isUnder ? '#818cf8' : '#10b981') }}>
            {data.forecastError > 0 ? `+${data.forecastError}` : data.forecastError} MW
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span>Absolute Error:</span>
          <span>{data.absoluteError} MW</span>
        </div>
        <div style={{ marginTop: '0.3rem', fontSize: '0.725rem', color: isOver ? '#f59e0b' : (isUnder ? '#818cf8' : '#10b981') }}>
          {isOver ? '⚠️ Overforecasting (Procured more than delivered)' : (isUnder ? '📉 Underforecasting (Procured less than delivered)' : 'Exact match')}
        </div>
      </div>
    );
  }
  return null;
}

export default function ErrorChart({ records, deliveryDate }) {
  const chartData = (records || []).map((r) => ({
    ...r,
    displayTime: (r.startTime || '').substring(11, 16) || `SP ${r.settlementPeriod}`,
  }));

  return (
    <div className="chart-card" id="error-chart-container">
      <div className="chart-card-header">
        <div className="chart-title-wrap">
          <h3>Half-Hourly Forecast Error (Forecast − Actual)</h3>
          <p>
            Error magnitude and bias per delivery interval for {deliveryDate}. Positive values indicate overforecasting.
          </p>
        </div>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#f59e0b' }} />
            <span>Overforecast (+MW)</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#818cf8' }} />
            <span>Underforecast (-MW)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="displayTime"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={3}
              label={{
                value: 'Delivery Interval Start',
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
              label={{
                value: 'Error (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                offset: 5
              }}
            />
            <Tooltip content={<CustomErrorTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="forecastError">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.forecastError >= 0 ? '#f59e0b' : '#818cf8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
