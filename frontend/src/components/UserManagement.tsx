import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { AdminUser, PaginatedResponse } from '../types/models';

interface UserManagementProps {
  onSelectUser: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers(page, 20, {
        search: search || undefined,
        isActive: activeFilter
      });
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, activeFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveFilter(value === 'all' ? undefined : value === 'active');
    setPage(1);
  };

  if (loading && !users) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!users) {
    return null;
  }

  return (
    <div className="user-management">
      <h2>User Management</h2>
      
      <div className="filters">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={handleSearchChange}
          className="search-input"
        />
        
        <select value={activeFilter === undefined ? 'all' : activeFilter ? 'active' : 'inactive'} onChange={handleFilterChange} className="filter-select">
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Admin</th>
              <th>Email Verified</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Failed Logins</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(users.data) ? users.data : []).map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{user.isAdmin ? 'Yes' : 'No'}</td>
                <td>{user.emailVerified ? 'Yes' : 'No'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                <td>{user.failedLoginAttempts}</td>
                <td>
                  <button
                    onClick={() => onSelectUser(user.id)}
                    className="btn-view"
                  >
                    View Details
                  </button>
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
          Page {page} of {users.totalPages} ({users.total} total users)
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= users.totalPages}
          className="btn-pagination"
        >
          Next
        </button>
      </div>
    </div>
  );
};
