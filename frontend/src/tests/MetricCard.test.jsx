import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricCard from '../components/MetricCard';

describe('MetricCard Component', () => {
  it('renders title, value, and unit correctly', () => {
    render(
      <MetricCard
        id="test-card"
        title="Mean Absolute Error"
        value="450.5"
        unit="MW"
        subtitle="12 matched intervals"
        tooltip="MAE description"
      />
    );

    expect(screen.getByText('Mean Absolute Error')).toBeInTheDocument();
    expect(screen.getByText('450.5')).toBeInTheDocument();
    expect(screen.getByText('MW')).toBeInTheDocument();
    expect(screen.getByText('12 matched intervals')).toBeInTheDocument();
  });

  it('renders unavailable data as a dash and never converts null to zero', () => {
    render(
      <MetricCard
        id="null-card"
        title="WAPE"
        value={null}
        unit="%"
        subtitle="Volume error"
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
