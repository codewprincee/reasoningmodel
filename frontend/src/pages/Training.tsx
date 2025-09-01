import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { apiService } from '../services/apiService';
import './Training.css';

interface TrainingFormData {
  experimentName: string;
  description: string;
  datasetId: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  useLoRA: boolean;
  loraR: number;
  loraAlpha: number;
}

const Training: React.FC = () => {
  const { state, actions } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TrainingFormData>({
    experimentName: '',
    description: '',
    datasetId: '',
    epochs: 3,
    batchSize: 4,
    learningRate: 0.00005,
    useLoRA: true,
    loraR: 16,
    loraAlpha: 32,
  });

  useEffect(() => {
    actions.loadTrainingJobs();
    actions.loadDatasets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.datasetId) {
      alert('Please select a dataset');
      return;
    }

    try {
      const selectedDataset = state.datasets.find(d => d.dataset_id === formData.datasetId);
      if (!selectedDataset) {
        alert('Selected dataset not found');
        return;
      }

      // Load the dataset content
      const datasetContent = await apiService.getDatasetContent(formData.datasetId);
      if (!datasetContent || !datasetContent.content || datasetContent.content.length === 0) {
        alert('Dataset is empty or could not be loaded');
        return;
      }

      // Convert dataset content to training data format
      const trainingDataItems = datasetContent.content.map((item: any, index: number) => {
        // Try to map common field names to the expected format
        let inputPrompt = '';
        let enhancedPrompt = '';

        // Handle different possible field names
        if (item.input_prompt && item.enhanced_prompt) {
          inputPrompt = item.input_prompt;
          enhancedPrompt = item.enhanced_prompt;
        } else if (item.input && item.output) {
          inputPrompt = item.input;
          enhancedPrompt = item.output;
        } else if (item.prompt && item.enhanced) {
          inputPrompt = item.prompt;
          enhancedPrompt = item.enhanced;
        } else if (item.question && item.answer) {
          inputPrompt = item.question;
          enhancedPrompt = item.answer;
        } else if (item.text) {
          // For single text field, create a simple enhancement task
          inputPrompt = item.text;
          enhancedPrompt = `Enhanced version: ${item.text}`;
        } else {
          // Fallback: use the first two string fields found
          const stringFields = Object.entries(item).filter(([_, value]) => typeof value === 'string');
          if (stringFields.length >= 2) {
            inputPrompt = stringFields[0][1] as string;
            enhancedPrompt = stringFields[1][1] as string;
          } else if (stringFields.length === 1) {
            inputPrompt = stringFields[0][1] as string;
            enhancedPrompt = `Enhanced: ${inputPrompt}`;
          } else {
            inputPrompt = `Item ${index + 1}`;
            enhancedPrompt = `Enhanced item ${index + 1}`;
          }
        }

        return {
          input_prompt: inputPrompt,
          enhanced_prompt: enhancedPrompt,
          reasoning_steps: item.reasoning_steps || null,
          category: item.category || null,
          difficulty: item.difficulty || null,
        };
      });

      const trainingData = {
        experiment_name: formData.experimentName,
        description: formData.description,
        training_data: trainingDataItems,
        model_configuration: {
          model_name: 'gpt-oss-20b',
          max_length: 2048,
          temperature: 0.7,
          learning_rate: formData.learningRate,
        },
        training_configuration: {
          epochs: formData.epochs,
          batch_size: formData.batchSize,
          use_lora: formData.useLoRA,
          lora_r: formData.loraR,
          lora_alpha: formData.loraAlpha,
        },
      };

      await actions.startTraining(trainingData);
      setShowForm(false);
      setFormData({
        experimentName: '',
        description: '',
        datasetId: '',
        epochs: 3,
        batchSize: 4,
        learningRate: 0.00005,
        useLoRA: true,
        loraR: 16,
        loraAlpha: 32,
      });
    } catch (error) {
      console.error('Failed to start training:', error);
      alert('Failed to start training. Please try again.');
    }
  };

  const handleStopTraining = async (trainingId: string) => {
    if (window.confirm('Are you sure you want to stop this training?')) {
      try {
        await actions.stopTraining(trainingId);
      } catch (error) {
        console.error('Failed to stop training:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'status-success';
      case 'completed':
        return 'status-info';
      case 'failed':
        return 'status-error';
      case 'stopped':
        return 'status-warning';
      default:
        return 'status-default';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const activeJobs = state.trainingJobs.filter(job => job.status === 'running' || job.status === 'pending');

  return (
    <div className="training">
      <div className="training-header">
        <h1>Training Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={state.datasets.length === 0}
        >
          ➕ Start New Training
        </button>
      </div>

      {state.datasets.length === 0 && (
        <div className="warning-message">
          ⚠️ No datasets available. Please upload a dataset first in the Data Management section.
        </div>
      )}

      {/* Active Training Jobs */}
      <div className="training-section">
        <div className="section-header">
          <h2>🚀 Active Training Jobs</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => actions.loadTrainingJobs()}
          >
            🔄 Refresh
          </button>
        </div>

        {activeJobs.length > 0 ? (
          <div className="jobs-grid">
            {activeJobs.map((job) => (
              <div key={job.training_id} className="job-card active-job">
                <div className="job-header">
                  <h3>Training {job.training_id.substring(0, 8)}...</h3>
                  <span className={`status-badge ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                {job.progress > 0 && (
                  <div className="progress-section">
                    <div className="progress-info">
                      <span>Progress</span>
                      <span>{job.progress.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="job-details">
                  {job.current_epoch && job.total_epochs && (
                    <div className="detail-item">
                      <span>Epoch:</span>
                      <span>{job.current_epoch} of {job.total_epochs}</span>
                    </div>
                  )}
                  {job.loss && (
                    <div className="detail-item">
                      <span>Loss:</span>
                      <span>{job.loss.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                <div className="job-actions">
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleStopTraining(job.training_id)}
                    disabled={job.status !== 'running'}
                  >
                    ⏹️ Stop Training
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">⏸️</div>
            <h3>No active training jobs</h3>
            <p>Start a new training to see progress here</p>
          </div>
        )}
      </div>

      {/* Training History */}
      <div className="training-section">
        <h2>📊 Training History</h2>
        
        {state.trainingJobs.length > 0 ? (
          <div className="history-table">
            <div className="table-header">
              <div>Training ID</div>
              <div>Status</div>
              <div>Progress</div>
              <div>Duration</div>
              <div>Final Loss</div>
              <div>Created</div>
            </div>
            <div className="table-body">
              {state.trainingJobs.map((job) => (
                <div key={job.training_id} className="table-row">
                  <div className="job-id">{job.training_id.substring(0, 8)}...</div>
                  <div>
                    <span className={`status-badge ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="progress-cell">
                    <div className="mini-progress-bar">
                      <div 
                        className="mini-progress-fill" 
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    <span>{job.progress.toFixed(1)}%</span>
                  </div>
                  <div>{formatDuration(job.created_at, job.updated_at)}</div>
                  <div>{job.loss ? job.loss.toFixed(4) : 'N/A'}</div>
                  <div>{new Date(job.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <h3>No training history</h3>
            <p>Your completed training jobs will appear here</p>
          </div>
        )}
      </div>

      {/* Training Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleStartTraining}>
              <div className="modal-header">
                <h2>Start New Training</h2>
                <button 
                  type="button" 
                  className="close-btn"
                  onClick={() => setShowForm(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="form-content">
                <div className="form-group">
                  <label>Experiment Name *</label>
                  <input
                    type="text"
                    value={formData.experimentName}
                    onChange={(e) => setFormData({...formData, experimentName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Dataset *</label>
                  <select
                    value={formData.datasetId}
                    onChange={(e) => setFormData({...formData, datasetId: e.target.value})}
                    required
                  >
                    <option value="">Select a dataset</option>
                    {state.datasets.map((dataset) => (
                      <option key={dataset.dataset_id} value={dataset.dataset_id}>
                        {dataset.name} ({dataset.size} examples)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Epochs</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.epochs}
                      onChange={(e) => setFormData({...formData, epochs: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Batch Size</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.batchSize}
                      onChange={(e) => setFormData({...formData, batchSize: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="advanced-section">
                  <h3>🔧 Advanced Settings</h3>
                  
                  <div className="form-group">
                    <label>Learning Rate</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={formData.learningRate}
                      onChange={(e) => setFormData({...formData, learningRate: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>LoRA R</label>
                      <input
                        type="number"
                        value={formData.loraR}
                        onChange={(e) => setFormData({...formData, loraR: parseInt(e.target.value)})}
                      />
                    </div>

                    <div className="form-group">
                      <label>LoRA Alpha</label>
                      <input
                        type="number"
                        value={formData.loraAlpha}
                        onChange={(e) => setFormData({...formData, loraAlpha: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ▶️ Start Training
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;