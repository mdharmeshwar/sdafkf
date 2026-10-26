import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart as RechartsScatter,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

function CustomScatterTooltip({ active, payload }) {
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
          minWidth: '200px'
        }}
      >
        <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.3rem', marginBottom: '0.4rem' }}>
          {data.startTimeUk || data.startTime}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
          <span>Actual:</span>
          <strong>{data.actualGeneration?.toLocaleString()} MW</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
          <span>Forecast:</span>
          <strong>{data.forecastGeneration?.toLocaleString()} MW</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span>Error (F - A):</span>
          <strong style={{ color: data.forecastError > 0 ? '#f59e0b' : '#38bdf8' }}>
            {data.forecastError > 0 ? `+${data.forecastError}` : data.forecastError} MW
          </strong>
        </div>
      </div>
    );
  }
  return null;
}

export default function ScatterChart({ records }) {
  const points = (records || [])
    .filter(
      (r) =>
        r.forecastGeneration !== null &&
        r.actualGeneration !== null &&
        r.status === 'MATCHED'
    )
    .map((r) => ({
      ...r,
      x: r.actualGeneration,
      y: r.forecastGeneration,
    }));

  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.x, p.y)),
    20000
  );

  return (
    <div className="chart-card" id="scatter-chart-container">
      <div className="chart-card-header">
        <div className="chart-title-wrap">
          <h3>Forecast vs Actual Scatter Evaluation</h3>
          <p>
            Points along the 45° diagonal line indicate perfect forecasts. Points above indicate overforecasting.
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsScatter margin={{ top: 20, right: 25, bottom: 25, left: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Actual Generation"
              unit=" MW"
              stroke="#64748b"
              fontSize={11}
              domain={[0, maxVal]}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Observed Actual Generation (MW)',
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Forecast Generation"
              unit=" MW"
              stroke="#64748b"
              fontSize={11}
              domain={[0, maxVal]}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Selected Forecast (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                offset: 5
              }}
            />
            <Tooltip content={<CustomScatterTooltip />} />
            {/* 45-degree reference line y = x */}
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxVal, y: maxVal }
              ]}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: 'Ideal Forecast (y = x)',
                fill: '#94a3b8',
                fontSize: 11,
                position: 'top'
              }}
            />
            <Scatter
              name="Interval Records"
              data={points}
              fill="#38bdf8"
              shape="circle"
            />
          </RechartsScatter>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
