import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { SystemMetrics } from '../components/SystemMetrics';
import { UserManagement } from '../components/UserManagement';
import { UserDetailView } from '../components/UserDetailView';
import { AuditLogViewer } from '../components/AuditLogViewer';

type TabType = 'metrics' | 'users' | 'audit';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleCloseUserDetail = () => {
    setSelectedUserId(null);
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user-info">
          <span>Logged in as: {user?.email}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={`nav-tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          System Metrics
        </button>
        <button
          className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'metrics' && <SystemMetrics />}
        {activeTab === 'users' && <UserManagement onSelectUser={handleSelectUser} />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </main>

      {selectedUserId && (
        <UserDetailView userId={selectedUserId} onClose={handleCloseUserDetail} />
      )}
    </div>
  );
};
