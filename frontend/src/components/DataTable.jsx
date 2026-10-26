import React, { useState, useMemo } from 'react';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

export default function DataTable({ records, onExportCsv, deliveryDate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('settlementPeriod');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return (records || []).filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const periodMatch = String(r.settlementPeriod).includes(term);
        const timeMatch = (r.startTimeUk || '').toLowerCase().includes(term);
        const statusMatch = (r.status || '').toLowerCase().includes(term);
        if (!periodMatch && !timeMatch && !statusMatch) {
          return false;
        }
      }
      return true;
    });
  }, [records, statusFilter, searchTerm]);

  // Sort
  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = sortDirection === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCHED':
        return <span className="badge badge-matched">Matched</span>;
      case 'FORECAST_UNAVAILABLE':
        return <span className="badge badge-unavail">Forecast Missing</span>;
      case 'ACTUAL_UNAVAILABLE':
        return <span className="badge badge-unavail">Actual Missing</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>Data Unavailable</span>;
    }
  };

  return (
    <div className="table-card" id="data-explorer-card">
      <div className="table-toolbar">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search interval or status..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="filter-control"
              style={{ paddingLeft: '2rem', width: '100%' }}
              id="table-search-input"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="filter-control"
              id="table-status-filter"
            >
              <option value="ALL">All Statuses ({records?.length || 0})</option>
              <option value="MATCHED">Matched Pairs Only</option>
              <option value="FORECAST_UNAVAILABLE">Forecast Missing</option>
              <option value="ACTUAL_UNAVAILABLE">Actual Missing</option>
              <option value="DATA_UNAVAILABLE">Data Unavailable</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={onExportCsv} id="table-export-csv-btn">
            <Download size={14} />
            <span>Export View CSV</span>
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" id="intervals-data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('settlementPeriod')} style={{ cursor: 'pointer' }}>
                SP {renderSortIcon('settlementPeriod')}
              </th>
              <th>Delivery Interval (UK Local)</th>
              <th>Delivery Interval (UTC)</th>
              <th>Decision Cutoff (UK Local)</th>
              <th>Forecast Pub (UK Local)</th>
              <th onClick={() => handleSort('forecastGeneration')} style={{ cursor: 'pointer' }}>
                Forecast (MW) {renderSortIcon('forecastGeneration')}
              </th>
              <th onClick={() => handleSort('actualGeneration')} style={{ cursor: 'pointer' }}>
                Actual (MW) {renderSortIcon('actualGeneration')}
              </th>
              <th onClick={() => handleSort('forecastError')} style={{ cursor: 'pointer' }}>
                Error (MW) {renderSortIcon('forecastError')}
              </th>
              <th onClick={() => handleSort('absoluteError')} style={{ cursor: 'pointer' }}>
                |Error| (MW) {renderSortIcon('absoluteError')}
              </th>
              <th onClick={() => handleSort('leadTimeHours')} style={{ cursor: 'pointer' }}>
                Lead (hrs) {renderSortIcon('leadTimeHours')}
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((r) => (
                <tr key={`${r.settlementPeriod}-${r.startTime}`}>
                  <td className="font-mono"><strong>{r.settlementPeriod}</strong></td>
                  <td>{r.startTimeUk}</td>
                  <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{r.startTime}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.decisionCutoffUk}</td>
                  <td>{r.publishTimeUk ? r.publishTimeUk : <span style={{ color: 'var(--text-muted)' }}>None eligible</span>}</td>
                  <td className="font-mono" style={{ color: r.forecastGeneration !== null ? '#38bdf8' : 'var(--text-muted)' }}>
                    {r.forecastGeneration !== null ? `${r.forecastGeneration.toLocaleString()} MW` : '—'}
                  </td>
                  <td className="font-mono" style={{ color: r.actualGeneration !== null ? '#10b981' : 'var(--text-muted)' }}>
                    {r.actualGeneration !== null ? `${r.actualGeneration.toLocaleString()} MW` : '—'}
                  </td>
                  <td className="font-mono">
                    {r.forecastError !== null ? (
                      <span style={{ color: r.forecastError > 0 ? '#f59e0b' : '#38bdf8' }}>
                        {r.forecastError > 0 ? `+${r.forecastError}` : r.forecastError}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="font-mono">
                    {r.absoluteError !== null ? r.absoluteError : '—'}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {r.leadTimeHours !== null ? `${r.leadTimeHours}h` : '—'}
                  </td>
                  <td>{getStatusBadge(r.status)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No interval records found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div>
          Showing {paginatedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} intervals
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
