import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { SystemMetrics as SystemMetricsType } from '../types/models';

export const SystemMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return <div className="loading">Loading metrics...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="system-metrics">
      <h2>System Metrics</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Active Users</h3>
          <p className="metric-value">{metrics.activeUsers}</p>
          <p className="metric-label">of {metrics.totalUsers} total</p>
        </div>

        <div className="metric-card">
          <h3>API Calls Today</h3>
          <p className="metric-value">{metrics.apiCallsToday.toLocaleString()}</p>
          <p className="metric-label">{metrics.apiQuotaRemaining.toLocaleString()} remaining</p>
        </div>

        <div className="metric-card">
          <h3>Error Rate</h3>
          <p className="metric-value">{metrics.errorRate.toFixed(2)}%</p>
          <p className={`metric-label ${metrics.errorRate > 5 ? 'warning' : ''}`}>
            {metrics.errorRate > 5 ? 'High error rate' : 'Normal'}
          </p>
        </div>

        <div className="metric-card">
          <h3>Avg Response Time</h3>
          <p className="metric-value">{metrics.averageResponseTime.toFixed(0)}ms</p>
          <p className={`metric-label ${metrics.averageResponseTime > 1000 ? 'warning' : ''}`}>
            {metrics.averageResponseTime > 1000 ? 'Slow response' : 'Normal'}
          </p>
        </div>

        <div className="metric-card">
          <h3>Database Connections</h3>
          <p className="metric-value">{metrics.databaseConnections}</p>
          <p className="metric-label">Active connections</p>
        </div>

        <div className="metric-card">
          <h3>Cache Hit Rate</h3>
          <p className="metric-value">{metrics.cacheHitRate.toFixed(1)}%</p>
          <p className="metric-label">Cache efficiency</p>
        </div>
      </div>
      <p className="metrics-timestamp">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </p>
    </div>
  );
};
