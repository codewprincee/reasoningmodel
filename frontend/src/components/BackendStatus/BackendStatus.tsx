import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import './BackendStatus.css';

const BackendStatus: React.FC = () => {
  const { state } = useAppContext();

  if (state.isBackendAvailable) {
    return null; // Don't show anything when backend is available
  }

  return (
    <div className="backend-status-banner">
      <div className="status-content">
        <span className="status-icon">⚠️</span>
        <div className="status-text">
          <strong>Backend Offline</strong>
          <p>The application is running in demo mode. Some features may be limited.</p>
        </div>
        <button 
          className="dismiss-btn"
          onClick={() => window.location.reload()}
          title="Refresh to retry connection"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default BackendStatus;
