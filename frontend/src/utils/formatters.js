export const MetricsService = {
  formatMw(val) {
    if (val === null || val === undefined) return '—';
    return `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`;
  },
  formatPercent(val) {
    if (val === null || val === undefined) return '—';
    return `${Number(val).toFixed(1)}%`;
  }
};

export function getPresetCutoffTimestamp(deliveryDateStr, presetType) {
  // deliveryDateStr: "2026-01-05"
  const [year, month, day] = deliveryDateStr.split('-').map(Number);
  const deliveryDt = new Date(Date.UTC(year, month - 1, day));
  
  const daDt = new Date(deliveryDt);
  daDt.setUTCDate(daDt.getUTCDate() - 1); // D-1
  
  const yyyy = daDt.getUTCFullYear();
  const mm = String(daDt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(daDt.getUTCDate()).padStart(2, '0');
  const daDateStr = `${yyyy}-${mm}-${dd}`;

  switch (presetType) {
    case 'DA_11':
      return { cutoffDate: daDateStr, cutoffTime: '11:00' };
    case 'DA_12':
      return { cutoffDate: daDateStr, cutoffTime: '12:00' };
    case 'DA_17':
      return { cutoffDate: daDateStr, cutoffTime: '17:00' };
    case 'WD_06':
      return { cutoffDate: deliveryDateStr, cutoffTime: '06:00' };
    default:
      return { cutoffDate: daDateStr, cutoffTime: '12:00' };
  }
}
