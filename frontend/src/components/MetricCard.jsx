import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  tooltip,
  variant = 'default', // 'default', 'success', 'warning', 'danger'
  id
}) {
  const isNull = value === null || value === undefined;

  let valueColor = 'var(--text-primary)';
  if (variant === 'warning') valueColor = 'var(--warning-amber)';
  if (variant === 'danger') valueColor = 'var(--error-rose)';
  if (variant === 'success') valueColor = 'var(--actual-green)';

  return (
    <div className="metric-card" id={id}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {tooltip && (
          <div title={tooltip} style={{ cursor: 'help', color: 'var(--text-muted)' }}>
            <HelpCircle size={14} />
          </div>
        )}
      </div>

      <div className="metric-body">
        <span className="metric-value" style={{ color: valueColor }}>
          {isNull ? '—' : value}
        </span>
        {unit && !isNull && <span className="metric-unit">{unit}</span>}
      </div>

      <div className="metric-footer">
        {subtitle || (isNull ? 'Undefined for current sample' : '')}
      </div>
    </div>
  );
}
