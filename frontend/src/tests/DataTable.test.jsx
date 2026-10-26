import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataTable from '../components/DataTable';

const mockRecords = [
  {
    settlementPeriod: 1,
    startTime: '2026-01-01T00:00:00Z',
    startTimeUk: '2026-01-01 00:00 GMT',
    decisionCutoff: '2025-12-31T12:00:00Z',
    decisionCutoffUk: '2025-12-31 12:00 GMT',
    publishTime: '2025-12-31T10:00:00Z',
    publishTimeUk: '2025-12-31 10:00 GMT',
    forecastGeneration: 12500.0,
    actualGeneration: 12000.0,
    forecastError: 500.0,
    absoluteError: 500.0,
    leadTimeHours: 14.0,
    status: 'MATCHED'
  },
  {
    settlementPeriod: 2,
    startTime: '2026-01-01T00:30:00Z',
    startTimeUk: '2026-01-01 00:30 GMT',
    decisionCutoff: '2025-12-31T12:00:00Z',
    decisionCutoffUk: '2025-12-31 12:00 GMT',
    publishTime: null,
    publishTimeUk: null,
    forecastGeneration: null,
    actualGeneration: 11800.0,
    forecastError: null,
    absoluteError: null,
    leadTimeHours: null,
    status: 'FORECAST_UNAVAILABLE'
  }
];

describe('DataTable Component', () => {
  it('renders intervals, status badges, and does not convert null to zero', () => {
    const { container } = render(
      <DataTable
        records={mockRecords}
        deliveryDate="2026-01-01"
        onExportCsv={vi.fn()}
      />
    );

    // Period 1 is matched
    const tbody = container.querySelector('tbody');
    expect(within(tbody).getByText('Matched')).toBeInTheDocument();
    expect(within(tbody).getByText('12,500 MW')).toBeInTheDocument();
    expect(within(tbody).getByText('12,000 MW')).toBeInTheDocument();

    // Period 2 has unavailable forecast - rendered as '—', not '0'
    expect(within(tbody).getByText('Forecast Missing')).toBeInTheDocument();
    expect(within(tbody).getByText('11,800 MW')).toBeInTheDocument();
  });

  it('filters by status correctly', () => {
    const { container } = render(
      <DataTable
        records={mockRecords}
        deliveryDate="2026-01-01"
        onExportCsv={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'MATCHED' } });

    const tbody = container.querySelector('tbody');
    expect(within(tbody).getByText('Matched')).toBeInTheDocument();
    expect(within(tbody).queryByText('Forecast Missing')).not.toBeInTheDocument();
  });
});
