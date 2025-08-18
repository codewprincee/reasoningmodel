import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aipdoll.hyperbrainlabs.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout for live API
});

// Track backend connectivity
let isBackendAvailable = true;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

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
  (response) => {
    isBackendAvailable = true;
    return response;
  },
  (error) => {
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND' || !error.response) {
      isBackendAvailable = false;
      console.warn('Backend is not available. Running in offline mode.');
    } else {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Helper function to check if backend is available
const checkBackendAvailability = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL && isBackendAvailable) {
    return isBackendAvailable;
  }
  
  try {
    await api.get('/health', { timeout: 3000 });
    isBackendAvailable = true;
    lastConnectionCheck = now;
  } catch (error) {
    isBackendAvailable = false;
  }
  
  return isBackendAvailable;
};

// Safe API call wrapper
const safeApiCall = async <T>(apiCall: () => Promise<T>, fallback?: T): Promise<T | null> => {
  try {
    const available = await checkBackendAvailability();
    if (!available) {
      return fallback || null;
    }
    return await apiCall();
  } catch (error) {
    console.warn('API call failed, backend might be offline:', error);
    return fallback || null;
  }
};

export const apiService = {
  // Backend availability check
  isBackendAvailable: () => isBackendAvailable,
  
  // Health check
  async healthCheck() {
    return safeApiCall(async () => {
      const response = await api.get('/health');
      return response.data;
    });
  },

  // EC2 Status
  async getEC2Status() {
    return safeApiCall(async () => {
      const response = await api.get('/health');
      return response.data.ec2_connection;
    }, {
      instance_id: 'offline',
      instance_state: 'offline',
      instance_type: 'N/A',
      public_ip: null,
      cpu_usage: null,
      memory_usage: null,
      gpu_usage: null,
      model_loaded: false,
      last_checked: new Date().toISOString()
    });
  },

  // Training endpoints
  async startTraining(trainingData: any) {
    return safeApiCall(async () => {
      const response = await api.post('/training/start', trainingData);
      return response.data;
    });
  },

  async getTrainingStatus(trainingId: string) {
    return safeApiCall(async () => {
      const response = await api.get(`/training/status/${trainingId}`);
      return response.data;
    });
  },

  async stopTraining(trainingId: string) {
    return safeApiCall(async () => {
      const response = await api.post(`/training/stop/${trainingId}`);
      return response.data;
    });
  },

  // Data management endpoints
  async uploadDataset(file: File, name: string, description?: string) {
    return safeApiCall(async () => {
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
    });
  },

  async getDatasets() {
    return safeApiCall(async () => {
      const response = await api.get('/data/datasets');
      return response.data;
    }, []);
  },

  async getDataset(datasetId: string) {
    return safeApiCall(async () => {
      const response = await api.get(`/data/dataset/${datasetId}`);
      return response.data;
    });
  },

  async deleteDataset(datasetId: string) {
    return safeApiCall(async () => {
      const response = await api.delete(`/data/dataset/${datasetId}`);
      return response.data;
    });
  },

  // Prompt enhancement
  async enhancePrompt(prompt: string, enhancementType: string, modelVersion?: string) {
    return safeApiCall(async () => {
      const response = await api.post('/prompt/enhance', {
        prompt,
        enhancement_type: enhancementType,
        model_version: modelVersion,
      });
      return response.data;
    });
  },

  // Model information
  async getModelInfo() {
    return safeApiCall(async () => {
      const response = await api.get('/model/info');
      return response.data;
    });
  },

  async getModelVersions() {
    return safeApiCall(async () => {
      const response = await api.get('/model/versions');
      return response.data.versions;
    }, []);
  },
};
