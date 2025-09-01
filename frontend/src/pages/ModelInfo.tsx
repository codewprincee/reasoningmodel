import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import './ModelInfo.css';

const ModelInfo: React.FC = () => {
  const { state, actions } = useAppContext();
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    actions.loadEC2Status();
    loadModelInfo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadModelInfo = async () => {
      setIsLoading(true);
    // Mock model info for now
    setTimeout(() => {
      setModelInfo({
        name: 'GPT OSS 20B',
        version: '1.0.0',
        parameters: '20B',
        architecture: 'Transformer',
        vocab_size: 50257,
        context_length: 2048,
        created_at: '2024-01-15T10:00:00Z'
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    actions.loadEC2Status();
    loadModelInfo();
  };

  return (
    <div className="model-info">
      <div className="model-info-header">
        <h1>Model Information</h1>
        <button 
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          🔄 Refresh
        </button>
      </div>

      {/* EC2 Status Section */}
      <div className="info-section">
        <h2>🖥️ Infrastructure Status</h2>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-header">
              <span className="icon">☁️</span>
              <h3>EC2 Instance</h3>
            </div>
            {state.ec2Status ? (
              <div className="status-content">
                <div className="status-row">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${state.ec2Status.instance_state === 'running' ? 'status-success' : 'status-error'}`}>
                    {state.ec2Status.instance_state}
                  </span>
                </div>
                <div className="status-row">
                  <span className="label">Type:</span>
                  <span>{state.ec2Status.instance_type}</span>
                </div>
                <div className="status-row">
                  <span className="label">Public IP:</span>
                  <span>{state.ec2Status.public_ip || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="loading">Loading...</div>
            )}
          </div>

          <div className="status-card">
            <div className="status-header">
              <span className="icon">🧠</span>
              <h3>Model Status</h3>
            </div>
            <div className="status-content">
              <div className="status-row">
                <span className="label">Loaded:</span>
                <span className={`status-badge ${state.ec2Status?.model_loaded ? 'status-success' : 'status-warning'}`}>
                  {state.ec2Status?.model_loaded ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="status-row">
                <span className="label">Model:</span>
                <span>GPT OSS 20B</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Details Section */}
      <div className="info-section">
        <h2>📊 Model Details</h2>
        {isLoading ? (
          <div className="loading">Loading model information...</div>
        ) : modelInfo ? (
          <div className="model-details">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{modelInfo.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Version:</span>
                <span className="detail-value">{modelInfo.version}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Parameters:</span>
                <span className="detail-value">{modelInfo.parameters}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Architecture:</span>
                <span className="detail-value">{modelInfo.architecture}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Vocabulary Size:</span>
                <span className="detail-value">{modelInfo.vocab_size?.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Context Length:</span>
                <span className="detail-value">{modelInfo.context_length?.toLocaleString()} tokens</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">
                  {new Date(modelInfo.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="error">Failed to load model information</div>
        )}
      </div>

      {/* Performance Metrics */}
      {state.ec2Status && (
        <div className="info-section">
          <h2>⚡ Performance Metrics</h2>
          <div className="metrics-grid">
                              {state.ec2Status.cpu_usage !== undefined && state.ec2Status.cpu_usage !== null && (
              <div className="metric-card">
                <div className="metric-header">
                  <span className="icon">🖥️</span>
                  <h3>CPU Usage</h3>
                </div>
                <div className="metric-value">
                          {state.ec2Status.cpu_usage.toFixed(1)}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${state.ec2Status.cpu_usage}%` }}
                  ></div>
                </div>
              </div>
                  )}
                  
                              {state.ec2Status.memory_usage !== undefined && state.ec2Status.memory_usage !== null && (
              <div className="metric-card">
                <div className="metric-header">
                  <span className="icon">💾</span>
                  <h3>Memory Usage</h3>
                </div>
                <div className="metric-value">
                          {state.ec2Status.memory_usage.toFixed(1)}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${state.ec2Status.memory_usage}%` }}
                  ></div>
                </div>
              </div>
                  )}
                  
                              {state.ec2Status.gpu_usage !== undefined && state.ec2Status.gpu_usage !== null && (
              <div className="metric-card">
                <div className="metric-header">
                  <span className="icon">🎮</span>
                  <h3>GPU Usage</h3>
                </div>
                <div className="metric-value">
                          {state.ec2Status.gpu_usage.toFixed(1)}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${state.ec2Status.gpu_usage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelInfo;