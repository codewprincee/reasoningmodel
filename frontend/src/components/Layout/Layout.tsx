import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import BackendStatus from '../BackendStatus/BackendStatus';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

// Custom Chip component
const Chip = ({ 
  label, 
  color = 'default' 
}: { 
  label: string; 
  color?: 'success' | 'error' | 'warning' | 'info' | 'default';
}) => (
  <span className={`chip chip-${color}`}>{label}</span>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();

  const menuItems = [
    { text: 'Dashboard', icon: '📊', path: '/' },
    { text: 'Chat', icon: '💬', path: '/chat' },
    { text: 'Training', icon: '🏋️', path: '/training' },
    { text: 'Data Management', icon: '💾', path: '/data' },
    { text: 'Prompt Enhancer', icon: '✨', path: '/enhancer' },
    { text: 'Model Info', icon: '🧠', path: '/model' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const getConnectionStatus = () => {
    if (!state.ec2Status) return { label: 'Unknown', color: 'default' as const };
    
    if (state.ec2Status.instance_state === 'running' && state.ec2Status.model_loaded) {
      return { label: 'Connected', color: 'success' as const };
    } else if (state.ec2Status.instance_state === 'running') {
      return { label: 'Instance Running', color: 'warning' as const };
    } else {
      return { label: 'Disconnected', color: 'error' as const };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="layout">
      {/* Backend Status Banner */}
      <BackendStatus />
      
      {/* Header */}
      <header className="header">
        <button 
          className="menu-toggle"
          onClick={handleDrawerToggle}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1 className="header-title">GPT OSS 20B Training Interface</h1>
        <div className="header-status">
          <span className="status-icon">☁️</span>
          <Chip
            label={connectionStatus.label}
            color={connectionStatus.color}
          />
        </div>
      </header>

      {/* Sidebar */}
      <nav className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>AI Model Trainer</h2>
        </div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.text}>
              <button
                className={`menu-item ${location.pathname === item.path ? 'menu-item-active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;