import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart
} from 'recharts';

function CustomDailyTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
        <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.3rem', marginBottom: '0.4rem' }}>
          Delivery Date: {data.deliveryDate}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
          <span>MAE:</span>
          <strong>{data.mae !== null ? `${data.mae} MW` : 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
          <span>RMSE:</span>
          <strong>{data.rmse !== null ? `${data.rmse} MW` : 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
          <span>Bias:</span>
          <strong>{data.bias !== null ? `${data.bias > 0 ? `+${data.bias}` : data.bias} MW` : 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', marginTop: '0.2rem' }}>
          <span>WAPE:</span>
          <strong>{data.wape !== null ? `${data.wape}%` : 'N/A'}</strong>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.3rem' }}>
          Matched intervals: {data.matchedCount} | Excluded: {data.excludedCount}
        </div>
      </div>
    );
  }
  return null;
}

export default function DailyAccuracyChart({ dailyData }) {
  const chartData = (dailyData || []).map((d) => ({
    ...d,
    shortDate: (d.deliveryDate || '').substring(8, 10), // e.g. "01", "02"
  }));

  return (
    <div className="chart-card" id="daily-accuracy-chart-container">
      <div className="chart-card-header">
        <div className="chart-title-wrap">
          <h3>Daily Accuracy Comparison Across January 2026</h3>
          <p>
            MAE (Mean Absolute Error) and RMSE (Root Mean Squared Error) tracked daily under the selected cutoff.
          </p>
        </div>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#38bdf8' }} />
            <span>Daily MAE (MW)</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: '#f59e0b' }} />
            <span>Daily RMSE (MW)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="shortDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              label={{
                value: 'January 2026 Day (01 - 31)',
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
            <Tooltip content={<CustomDailyTooltip />} />
            <Bar dataKey="mae" name="MAE" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="rmse"
              name="RMSE"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
