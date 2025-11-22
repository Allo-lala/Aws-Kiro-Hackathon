import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RoutePlanner } from './RoutePlanner';
import { UserProfile } from '../components/UserProfile';
import { TripHistory } from '../components/TripHistory';
import { CarbonVisualization } from '../components/CarbonVisualization';
import { DataExport } from '../components/DataExport';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'planner' | 'history' | 'profile' | 'impact'>('planner');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="header" role="banner">
        <div className="container">
          <h1 className="logo">
            <span className="logo-icon" aria-hidden="true">🌱</span>
            Rutty
            <span className="logo-tagline">Your Green Journey Companion</span>
          </h1>
          <nav className="nav" role="navigation" aria-label="Main navigation">
            <div className="user-menu">
              <span className="user-email">{user?.email}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-small">
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className="main" role="main">
        <section className="section">
          <div className="container">
            {!user?.emailVerified && (
              <div className="warning-message" role="alert">
                <strong>Email Verification Required</strong>
                <p>
                  Please check your email and click the verification link to activate your account.
                </p>
              </div>
            )}

            <div className="dashboard-tabs">
              <button
                className={`tab-button ${activeTab === 'planner' ? 'active' : ''}`}
                onClick={() => setActiveTab('planner')}
              >
                🗺️ Route Planner
              </button>
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                📊 Trip History
              </button>
              <button
                className={`tab-button ${activeTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveTab('impact')}
              >
                🌍 Impact
              </button>
              <button
                className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                ⚙️ Profile
              </button>
            </div>

            <div className="dashboard-content">
              {activeTab === 'planner' && <RoutePlanner />}
              
              {activeTab === 'history' && (
                <div className="tab-content">
                  <TripHistory />
                </div>
              )}
              
              {activeTab === 'impact' && (
                <div className="tab-content">
                  <CarbonVisualization />
                  <div className="export-section">
                    <DataExport />
                  </div>
                </div>
              )}
              
              {activeTab === 'profile' && (
                <div className="tab-content">
                  <UserProfile />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="container">
          <p>&copy; 2024 Rutty - Your Green Journey Companion. Making travel sustainable, one route at a time.</p>
        </div>
      </footer>
    </div>
  );
};
