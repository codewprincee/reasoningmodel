import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // EC2 Status
  async getEC2Status() {
    const response = await api.get('/health');
    return response.data.ec2_connection;
  },

  // Training endpoints
  async startTraining(trainingData: any) {
    const response = await api.post('/training/start', trainingData);
    return response.data;
  },

  async getTrainingStatus(trainingId: string) {
    const response = await api.get(`/training/status/${trainingId}`);
    return response.data;
  },

  async stopTraining(trainingId: string) {
    const response = await api.post(`/training/stop/${trainingId}`);
    return response.data;
  },

  // Data management endpoints
  async uploadDataset(file: File, name: string, description?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_name', name);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.dataset_id;
  },

  async getDatasets() {
    const response = await api.get('/data/datasets');
    return response.data;
  },

  async getDataset(datasetId: string) {
    const response = await api.get(`/data/dataset/${datasetId}`);
    return response.data;
  },

  async deleteDataset(datasetId: string) {
    const response = await api.delete(`/data/dataset/${datasetId}`);
    return response.data;
  },

  // Prompt enhancement
  async enhancePrompt(prompt: string, enhancementType: string, modelVersion?: string) {
    const response = await api.post('/prompt/enhance', {
      prompt,
      enhancement_type: enhancementType,
      model_version: modelVersion,
    });
    return response.data;
  },

  // Model information
  async getModelInfo() {
    const response = await api.get('/model/info');
    return response.data;
  },

  async getModelVersions() {
    const response = await api.get('/model/versions');
    return response.data.versions;
  },
};
