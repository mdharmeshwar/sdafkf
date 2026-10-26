const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  async getDeliveryDates() {
    return fetchJson('/api/delivery-dates');
  },

  async getForecast(deliveryDate, decisionCutoff) {
    let url = `/api/forecast?delivery_date=${encodeURIComponent(deliveryDate)}`;
    if (decisionCutoff) {
      url += `&decision_cutoff=${encodeURIComponent(decisionCutoff)}`;
    }
    return fetchJson(url);
  },

  async getAccuracy(startDate, endDate, cutoffHourUtc = 12) {
    const url = `/api/accuracy?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&cutoff_hour_utc=${cutoffHourUtc}`;
    return fetchJson(url);
  },

  async getDailyAccuracy(startDate, endDate, cutoffHourUtc = 12) {
    const url = `/api/accuracy/daily?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&cutoff_hour_utc=${cutoffHourUtc}`;
    return fetchJson(url);
  },

  async getDataStatus() {
    return fetchJson('/api/data-status');
  },

  getExportUrl(deliveryDate, decisionCutoff) {
    let url = `${API_BASE_URL}/api/export?delivery_date=${encodeURIComponent(deliveryDate)}`;
    if (decisionCutoff) {
      url += `&decision_cutoff=${encodeURIComponent(decisionCutoff)}`;
    }
    return url;
  }
};
