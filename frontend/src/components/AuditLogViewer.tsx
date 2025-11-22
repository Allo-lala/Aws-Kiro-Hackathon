import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { AuditLog, PaginatedResponse } from '../types/models';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (actionFilter) filters.action = actionFilter;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const data = await adminService.getAuditLogs(page, 50, filters);
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, startDate, endDate]);

  const handleActionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  if (loading && !logs) {
    return <div className="loading">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!logs) {
    return null;
  }

  return (
    <div className="audit-log-viewer">
      <h2>Audit Logs</h2>

      <div className="filters">
        <select value={actionFilter} onChange={handleActionFilterChange} className="filter-select">
          <option value="">All Actions</option>
          <option value="USER_DISABLED">User Disabled</option>
          <option value="USER_ENABLED">User Enabled</option>
          <option value="PASSWORD_RESET">Password Reset</option>
          <option value="CONFIG_UPDATED">Config Updated</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Start Date"
          className="date-input"
        />

        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="End Date"
          className="date-input"
        />
      </div>

      <div className="log-table-container">
        <table className="log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Admin ID</th>
              <th>Target User</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.data.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>
                  <span className="action-badge">{log.action}</span>
                </td>
                <td>{log.adminId}</td>
                <td>{log.targetUserId || 'N/A'}</td>
                <td>{log.ipAddress}</td>
                <td>
                  <details>
                    <summary>View Details</summary>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="btn-pagination"
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {logs.totalPages} ({logs.total} total logs)
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= logs.totalPages}
          className="btn-pagination"
        >
          Next
        </button>
      </div>
    </div>
  );
};
