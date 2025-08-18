import React, { useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
// Temporarily removed Recharts to fix infinite loop
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

// Custom components to replace MUI
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`card ${className}`}>{children}</div>
);

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="card-content">{children}</div>
);

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '' 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean; 
  className?: string;
}) => (
  <button 
    className={`btn ${className} ${disabled ? 'disabled' : ''}`} 
    onClick={onClick} 
    disabled={disabled}
  >
    {children}
  </button>
);

const Chip = ({ 
  label, 
  color = 'default' 
}: { 
  label: string; 
  color?: 'success' | 'error' | 'warning' | 'info' | 'default';
}) => (
  <span className={`chip chip-${color}`}>{label}</span>
);

const ProgressBar = ({ value }: { value: number }) => (
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${value}%` }}></div>
  </div>
);

const Dashboard: React.FC = () => {
  const { state, actions } = useAppContext();

  useEffect(() => {
    // Initial data load
    actions.loadEC2Status();
    actions.loadTrainingJobs();
    actions.loadDatasets();

    // Set up polling for EC2 status
    const interval = setInterval(() => {
      actions.loadEC2Status();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshStatus = () => {
    actions.loadEC2Status();
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'running':
        return 'success';
      case 'completed':
        return 'info';
      case 'failed':
        return 'error';
      case 'stopped':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Chart temporarily disabled to fix infinite loop
  // Will be re-enabled with proper memoization

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Button 
          onClick={handleRefreshStatus}
          disabled={state.isLoading}
          className="refresh-btn"
        >
          🔄 Refresh Status
        </Button>
      </div>

      <div className="dashboard-grid">
        {/* EC2 Status Card */}
        <Card className="metric-card">
          <CardContent>
            <div className="card-header">
              <span className="icon">☁️</span>
              <h3>EC2 Instance</h3>
            </div>
            {state.ec2Status ? (
              <div className="card-body">
                <div className="status-row">
                  <span className="label">Status:</span>
                  <Chip
                    label={state.ec2Status.instance_state}
                    color={state.ec2Status.instance_state === 'running' ? 'success' : 'error'}
                  />
                </div>
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span>{state.ec2Status.instance_type}</span>
                </div>
                <div className="info-row">
                  <span className="label">IP:</span>
                  <span>{state.ec2Status.public_ip || 'N/A'}</span>
                </div>
                {state.ec2Status.cpu_usage !== null && state.ec2Status.cpu_usage !== undefined && (
                  <div className="metric-section">
                    <div className="metric-label">
                      CPU: {state.ec2Status.cpu_usage.toFixed(1)}%
                    </div>
                    <ProgressBar value={state.ec2Status.cpu_usage} />
                  </div>
                )}
              </div>
            ) : (
              <div className="loading">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Model Status Card */}
        <Card className="metric-card">
          <CardContent>
            <div className="card-header">
              <span className="icon">🧠</span>
              <h3>Model Status</h3>
            </div>
            <div className="card-body">
              <div className="status-row">
                <span className="label">Loaded:</span>
                <Chip
                  label={state.ec2Status?.model_loaded ? 'Yes' : 'No'}
                  color={state.ec2Status?.model_loaded ? 'success' : 'warning'}
                />
              </div>
              <div className="info-row">
                <span className="label">Model:</span>
                <span>GPT OSS 20B</span>
              </div>
              <div className="info-row">
                <span className="label">Parameters:</span>
                <span>20B</span>
              </div>
                              {state.ec2Status?.gpu_usage !== null && state.ec2Status?.gpu_usage !== undefined && (
                <div className="metric-section">
                  <div className="metric-label">
                    GPU: {state.ec2Status.gpu_usage.toFixed(1)}%
                  </div>
                  <ProgressBar value={state.ec2Status.gpu_usage} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Datasets Card */}
        <Card className="metric-card">
          <CardContent>
            <div className="card-header">
              <span className="icon">💾</span>
              <h3>Datasets</h3>
            </div>
            <div className="card-body">
              <div className="big-number">{state.datasets.length}</div>
              <div className="subtitle">Uploaded datasets</div>
              {state.datasets.length > 0 && (
                <div className="info-row">
                  <span className="label">Total examples:</span>
                  <span>{state.datasets.reduce((sum, d) => sum + d.size, 0)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training Jobs Card */}
        <Card className="metric-card">
          <CardContent>
            <div className="card-header">
              <span className="icon">🏋️</span>
              <h3>Training Jobs</h3>
            </div>
            <div className="card-body">
              <div className="big-number">{state.trainingJobs.length}</div>
              <div className="subtitle">Total jobs</div>
              {state.trainingJobs.length > 0 && (
                <div className="info-row">
                  <span className="label">Running:</span>
                  <span>{state.trainingJobs.filter(j => j.status === 'running').length}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Training Jobs */}
        <Card className="wide-card">
          <CardContent>
            <h3>Recent Training Jobs</h3>
            {state.trainingJobs.length > 0 ? (
              <div className="jobs-list">
                {state.trainingJobs.slice(0, 5).map((job) => (
                  <div key={job.training_id} className="job-item">
                    <div className="job-header">
                      <span className="job-icon">
                        {job.status === 'running' ? '▶️' : 
                         job.status === 'completed' ? '📈' : '⏹️'}
                      </span>
                      <span className="job-title">
                        Training {job.training_id.substring(0, 8)}...
                      </span>
                      <Chip label={job.status} color={getStatusColor(job.status)} />
                    </div>
                    {job.progress > 0 && (
                      <div className="job-progress">
                        <ProgressBar value={job.progress} />
                        <span className="progress-text">
                          {job.progress.toFixed(1)}% complete
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No training jobs yet. Start your first training job!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Progress Chart - Temporarily Disabled */}
        <Card className="wide-card">
          <CardContent>
            <h3>Training Progress</h3>
            <div className="chart-container" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '300px',
              background: '#f8f9fa',
              border: '2px dashed #ddd',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                <h4>Training Progress Chart</h4>
                <p>Chart temporarily disabled to fix infinite loop issue</p>
                <p style={{ fontSize: '0.875rem' }}>Will be re-enabled with proper optimization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;