import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import MethodologyModal from './components/MethodologyModal';
import Dashboard from './pages/Dashboard';
import AccuracyAnalysis from './pages/AccuracyAnalysis';
import DataExplorer from './pages/DataExplorer';
import { api } from './services/api';
import { getPresetCutoffTimestamp } from './utils/formatters';
import { LayoutDashboard, LineChart as ChartIcon, Table as TableIcon, AlertTriangle } from 'lucide-react';
import './styles/index.css';
import './styles/components.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveryDate, setDeliveryDate] = useState('2026-01-01');
  const [cutoffDate, setCutoffDate] = useState('2025-12-31');
  const [cutoffTime, setCutoffTime] = useState('12:00');
  
  const [forecastData, setForecastData] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Load backend status once on mount
  useEffect(() => {
    api.getDataStatus()
      .then(setDataStatus)
      .catch((err) => console.warn('Could not load data status:', err));
  }, []);

  // Compute decision cutoff ISO string
  const getCutoffIso = useCallback(() => {
    return `${cutoffDate}T${cutoffTime}:00Z`;
  }, [cutoffDate, cutoffTime]);

  // Fetch forecast data
  const loadForecastData = useCallback(async (dDate, cIso) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getForecast(dDate, cIso);
      setForecastData(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve forecast data from backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadForecastData(deliveryDate, getCutoffIso());
  }, []);

  // Handle Delivery Date change
  const handleDeliveryDateChange = (newDate) => {
    setDeliveryDate(newDate);
    // Automatically set default Day-Ahead cutoff (D-1 12:00 UTC)
    const { cutoffDate: newCutoffDate, cutoffTime: newCutoffTime } = getPresetCutoffTimestamp(newDate, 'DA_12');
    setCutoffDate(newCutoffDate);
    setCutoffTime(newCutoffTime);
    const newCutoffIso = `${newCutoffDate}T${newCutoffTime}:00Z`;
    loadForecastData(newDate, newCutoffIso);
  };

  // Handle Preset Cutoffs
  const handlePresetCutoff = (presetType) => {
    const { cutoffDate: newCDate, cutoffTime: newCTime } = getPresetCutoffTimestamp(deliveryDate, presetType);
    setCutoffDate(newCDate);
    setCutoffTime(newCTime);
    const newCutoffIso = `${newCDate}T${newCTime}:00Z`;
    loadForecastData(deliveryDate, newCutoffIso);
  };

  // Handle Manual Apply Cutoff
  const handleApplyCutoff = () => {
    loadForecastData(deliveryDate, getCutoffIso());
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const url = api.getExportUrl(deliveryDate, getCutoffIso());
    window.open(url, '_blank');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        dataStatus={dataStatus}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs" aria-label="Main Navigation">
        <button
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          id="tab-dashboard"
        >
          <LayoutDashboard size={16} />
          <span>Procurement Overview</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
          onClick={() => setActiveTab('accuracy')}
          id="tab-accuracy"
        >
          <ChartIcon size={16} />
          <span>Forecast Accuracy Analysis</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
          id="tab-explorer"
        >
          <TableIcon size={16} />
          <span>Data Explorer & Audit</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {/* FilterBar is active for Dashboard and Explorer */}
        {activeTab !== 'accuracy' && (
          <FilterBar
            deliveryDate={deliveryDate}
            onDeliveryDateChange={handleDeliveryDateChange}
            cutoffDate={cutoffDate}
            onCutoffDateChange={setCutoffDate}
            cutoffTime={cutoffTime}
            onCutoffTimeChange={setCutoffTime}
            onPresetCutoff={handlePresetCutoff}
            onApply={handleApplyCutoff}
            onExportCsv={handleExportCsv}
            isLoading={isLoading}
            cutoffUkLabel={forecastData?.decisionCutoffUk}
            latestEligiblePubUk={forecastData?.coverage?.latestEligiblePublishTimeUk}
            dataSourceLabel={forecastData?.dataSource}
            isSynthetic={forecastData?.isSynthetic}
          />
        )}

        {/* Global Error Notice */}
        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem', borderRadius: '8px', color: 'var(--error-rose)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={handleApplyCutoff}>
              Retry Fetch
            </button>
          </div>
        )}

        {/* Views */}
        {activeTab === 'dashboard' && (
          <Dashboard
            forecastData={forecastData}
            deliveryDate={deliveryDate}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyAnalysis
            initialStartDate="2026-01-01"
            initialEndDate="2026-01-31"
          />
        )}

        {activeTab === 'explorer' && (
          <DataExplorer
            records={forecastData?.records}
            deliveryDate={deliveryDate}
            onExportCsv={handleExportCsv}
            coverage={forecastData?.coverage}
          />
        )}
      </main>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Footer */}
      <footer className="footer" id="app-footer">
        <div>
          <strong>WindScope UK</strong> — Day-Ahead Wind Generation Procurement Analytics. Data Source: Official Elexon BMRS (FUELHH & WINDFOR).
        </div>
        <div>
          Pilot analytics tool for procurement professionals. Does not calculate full market positions or consumer demand.
        </div>
      </footer>
    </div>
  );
}
