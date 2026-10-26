import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    getDataStatus: vi.fn().mockResolvedValue({
      status: 'operational',
      elexonApiOnline: true,
      dataSourceInfo: 'Official Elexon BMRS'
    }),
    getForecast: vi.fn().mockResolvedValue({
      deliveryDate: '2026-01-01',
      decisionCutoff: '2025-12-31T12:00:00Z',
      decisionCutoffUk: '2025-12-31 12:00 GMT',
      generationUnit: 'MW',
      records: [
        {
          settlementPeriod: 1,
          startTime: '2026-01-01T00:00:00Z',
          startTimeUk: '2026-01-01 00:00 GMT',
          decisionCutoff: '2025-12-31T12:00:00Z',
          decisionCutoffUk: '2025-12-31 12:00 GMT',
          publishTime: '2025-12-31T10:00:00Z',
          publishTimeUk: '2025-12-31 10:00 GMT',
          forecastGeneration: 14000.0,
          actualGeneration: 13500.0,
          forecastError: 500.0,
          absoluteError: 500.0,
          leadTimeHours: 14.0,
          status: 'MATCHED'
        }
      ],
      coverage: {
        totalIntervals: 48,
        matchedCount: 1,
        forecastAvailableCount: 1,
        actualAvailableCount: 1,
        forecastMissingCount: 47,
        actualMissingCount: 47,
        latestEligiblePublishTimeUk: '2025-12-31 10:00 GMT'
      },
      dataQualityWarnings: [],
      dataSource: 'Elexon BMRS API',
      isSynthetic: false
    }),
    getAccuracy: vi.fn().mockResolvedValue({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      metrics: {
        mae: 420.5,
        rmse: 510.2,
        bias: 120.0,
        wape: 8.5,
        matchedCount: 100,
        excludedCount: 20
      },
      matchedRecords: [],
      dailySummaries: []
    }),
    getDailyAccuracy: vi.fn().mockResolvedValue({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      daily: [],
      overall: { mae: 420.5 }
    }),
    getExportUrl: vi.fn().mockReturnValue('http://localhost:8000/api/export?delivery_date=2026-01-01')
  }
}));

describe('App Root Component', () => {
  it('renders application brand, loads data, and allows tab navigation', async () => {
    render(<App />);

    const brandTitles = screen.getAllByText(/WindScope UK/i);
    expect(brandTitles.length).toBeGreaterThanOrEqual(1);

    // Verify tabs
    expect(screen.getByRole('button', { name: /Procurement Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Forecast Accuracy Analysis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data Explorer & Audit/i })).toBeInTheDocument();

    // Verify methodology modal opens
    const methodBtn = screen.getByRole('button', { name: /Methodology/i });
    fireEvent.click(methodBtn);
    expect(screen.getByText(/Analytical Methodology & Metric Definitions/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(closeBtn);

    // Switch to Data Explorer tab
    const explorerTab = screen.getByRole('button', { name: /Data Explorer & Audit/i });
    fireEvent.click(explorerTab);
    expect(screen.getByText(/Settlement Interval Data Explorer/i)).toBeInTheDocument();
  });
});
