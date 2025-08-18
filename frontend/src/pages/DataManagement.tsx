import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import './DataManagement.css';

const DataManagement: React.FC = () => {
  const { state, actions } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    actions.loadDatasets();
  }, [actions]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
      setUploadError('Please upload a .jsonl, .json, or .txt file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const name = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      await actions.uploadDataset(file, name, `Uploaded on ${new Date().toLocaleDateString()}`);
    } catch (error) {
      setUploadError('Failed to upload dataset. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      try {
        await actions.deleteDataset(datasetId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="data-management">
      <div className="data-header">
        <h1>Data Management</h1>
        <p className="subtitle">
          Upload and manage your training datasets
        </p>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <h2>📤 Upload Dataset</h2>
        <div 
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Drag & drop your dataset file here</h3>
            <p>or</p>
            <label className="upload-button">
              <input
                type="file"
                accept=".jsonl,.json,.txt"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              Choose File
            </label>
            <p className="upload-hint">
              Supported formats: .jsonl, .json, .txt
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="upload-status">
            <div className="loading">⏳ Uploading dataset...</div>
          </div>
        )}

        {uploadError && (
          <div className="error-message">
            {uploadError}
          </div>
        )}
      </div>

      {/* Datasets List */}
      <div className="datasets-section">
        <div className="section-header">
          <h2>📊 Your Datasets</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => actions.loadDatasets()}
            disabled={state.isLoading}
          >
            🔄 Refresh
          </button>
        </div>

        {state.datasets.length > 0 ? (
          <div className="datasets-grid">
            {state.datasets.map((dataset) => (
              <div key={dataset.dataset_id} className="dataset-card">
                <div className="dataset-header">
                  <h3>{dataset.name}</h3>
                  <button 
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteDataset(dataset.dataset_id)}
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="dataset-info">
                  <div className="info-item">
                    <span className="label">Format:</span>
                    <span className="value">{dataset.format}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Examples:</span>
                    <span className="value">{dataset.size.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">File Size:</span>
                    <span className="value">{formatFileSize(dataset.file_size)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Uploaded:</span>
                    <span className="value">
                      {new Date(dataset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {dataset.description && (
                  <div className="dataset-description">
                    <p>{dataset.description}</p>
                  </div>
                )}

                <div className="dataset-filename">
                  <span className="filename">{dataset.filename}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No datasets yet</h3>
            <p>Upload your first dataset to get started with training!</p>
          </div>
        )}
      </div>

      {/* Dataset Guidelines */}
      <div className="guidelines-section">
        <h2>📋 Dataset Guidelines</h2>
        <div className="guidelines-grid">
          <div className="guideline-card">
            <h4>📄 JSONL Format</h4>
            <p>Each line should be a valid JSON object with 'prompt' and 'completion' fields:</p>
            <code>{"{"}"prompt": "What is AI?", "completion": "AI is artificial intelligence..."{"}"}</code>
          </div>
          
          <div className="guideline-card">
            <h4>📊 Quality Tips</h4>
            <ul>
              <li>Use diverse and representative examples</li>
              <li>Ensure high-quality, accurate responses</li>
              <li>Keep consistent formatting</li>
              <li>Aim for 100+ examples for best results</li>
            </ul>
          </div>
          
          <div className="guideline-card">
            <h4>⚡ Performance</h4>
            <ul>
              <li>File size limit: 50MB</li>
              <li>Recommended: 500-10,000 examples</li>
              <li>Larger datasets = better model performance</li>
              <li>Balance quality over quantity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;