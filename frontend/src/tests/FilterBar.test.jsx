import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterBar from '../components/FilterBar';

describe('FilterBar Component', () => {
  it('renders date and cutoff controls with UK local time label', () => {
    const onDeliveryChange = vi.fn();
    const onApply = vi.fn();
    const onExport = vi.fn();

    render(
      <FilterBar
        deliveryDate="2026-01-05"
        onDeliveryDateChange={onDeliveryChange}
        cutoffDate="2026-01-04"
        onCutoffDateChange={vi.fn()}
        cutoffTime="12:00"
        onCutoffTimeChange={vi.fn()}
        onPresetCutoff={vi.fn()}
        onApply={onApply}
        onExportCsv={onExport}
        isLoading={false}
        cutoffUkLabel="2026-01-04 12:00 GMT"
        latestEligiblePubUk="2026-01-04 11:30 GMT"
      />
    );

    // Verify UK local time label
    expect(screen.getByText('2026-01-04 12:00 GMT')).toBeInTheDocument();
    expect(screen.getByText('2026-01-04 11:30 GMT')).toBeInTheDocument();

    // Change delivery date
    const dateInput = screen.getByLabelText(/Delivery Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-01-10' } });
    expect(onDeliveryChange).toHaveBeenCalledWith('2026-01-10');

    // Click apply
    const applyBtn = screen.getByRole('button', { name: /Apply Cutoff/i });
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalled();

    // Click export
    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalled();
  });
});
