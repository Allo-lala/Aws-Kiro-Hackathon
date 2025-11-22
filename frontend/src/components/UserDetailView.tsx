import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { UserDetails } from '../types/models';

interface UserDetailViewProps {
  userId: string;
  onClose: () => void;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUserDetails(userId);
      setUser(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const handleDisableUser = async () => {
    if (!user || !confirm(`Are you sure you want to disable ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminService.disableUser(userId, 'Disabled by admin');
      setActionMessage('User disabled successfully');
      await fetchUserDetails();
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Failed to disable user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnableUser = async () => {
    if (!user || !confirm(`Are you sure you want to enable ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminService.enableUser(userId);
      setActionMessage('User enabled successfully');
      await fetchUserDetails();
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Failed to enable user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !confirm(`Are you sure you want to reset password for ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminService.resetPassword(userId);
      setActionMessage('Password reset email sent successfully');
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Loading user details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="error">{error}</div>
          <button onClick={onClose} className="btn-close">Close</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Details</h2>
          <button onClick={onClose} className="btn-close-icon">&times;</button>
        </div>

        {actionMessage && (
          <div className="action-message">{actionMessage}</div>
        )}

        <div className="user-info">
          <h3>Account Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="info-item">
              <label>Admin:</label>
              <span>{user.isAdmin ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-item">
              <label>Email Verified:</label>
              <span>{user.emailVerified ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-item">
              <label>Created:</label>
              <span>{new Date(user.createdAt).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Last Login:</label>
              <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
            <div className="info-item">
              <label>Failed Login Attempts:</label>
              <span>{user.failedLoginAttempts}</span>
            </div>
          </div>
        </div>

        <div className="user-actions">
          <h3>Actions</h3>
          <div className="action-buttons">
            {user.isActive ? (
              <button
                onClick={handleDisableUser}
                disabled={actionLoading}
                className="btn-danger"
              >
                Disable Account
              </button>
            ) : (
              <button
                onClick={handleEnableUser}
                disabled={actionLoading}
                className="btn-success"
              >
                Enable Account
              </button>
            )}
            <button
              onClick={handleResetPassword}
              disabled={actionLoading}
              className="btn-warning"
            >
              Reset Password
            </button>
          </div>
        </div>

        {user.preferences && (
          <div className="user-preferences">
            <h3>Preferences</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Max Walking Distance:</label>
                <span>{user.preferences.maxWalkingDistance} miles</span>
              </div>
              <div className="info-item">
                <label>Sustainability Priority:</label>
                <span>{user.preferences.sustainabilityPriority}</span>
              </div>
              <div className="info-item">
                <label>Time vs Environment Weight:</label>
                <span>{user.preferences.timeVsEnvironmentWeight}</span>
              </div>
            </div>
          </div>
        )}

        <div className="trip-history">
          <h3>Trip History ({user.trips.length} trips)</h3>
          {user.trips.length > 0 ? (
            <div className="trip-table-container">
              <table className="trip-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Mode</th>
                    <th>Distance</th>
                    <th>Duration</th>
                    <th>Carbon Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {user.trips.slice(0, 10).map((trip) => (
                    <tr key={trip.id}>
                      <td>{new Date(trip.completedAt).toLocaleDateString()}</td>
                      <td>{trip.origin.name || `${trip.origin.latitude}, ${trip.origin.longitude}`}</td>
                      <td>{trip.destination.name || `${trip.destination.latitude}, ${trip.destination.longitude}`}</td>
                      <td>{trip.actualTransportationMode}</td>
                      <td>{trip.distance.toFixed(2)} mi</td>
                      <td>{trip.duration} min</td>
                      <td>{trip.carbonSavings.toFixed(2)} kg CO2</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {user.trips.length > 10 && (
                <p className="trip-note">Showing 10 most recent trips</p>
              )}
            </div>
          ) : (
            <p>No trips recorded</p>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};
