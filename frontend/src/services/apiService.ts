import axios from 'axios';

const API_BASE_URL = 'https://apipdoll.hyperbrainlabs.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for live API
});

// Track backend connectivity
let isBackendAvailable = true;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Initialize backend availability check
const initializeBackend = async () => {
  try {
    console.log('Checking backend at:', API_BASE_URL);
    const response = await api.get('/health', { timeout: 5000 });
    console.log('Backend check successful:', response.data);
    isBackendAvailable = true;
  } catch (error: any) {
    console.log('Initial backend check failed:', error.message, error.code);
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND' || !error.response) {
      isBackendAvailable = false;
    } else {
      isBackendAvailable = true;
    }
  }
};

// Run initial check
initializeBackend();

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
      // For other errors (like 404, 500, etc.), the backend is still available
      isBackendAvailable = true;
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
    await api.get('/health', { timeout: 5000 });
    isBackendAvailable = true;
    lastConnectionCheck = now;
  } catch (error: any) {
    // Only mark as unavailable for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND' || !error.response) {
      isBackendAvailable = false;
    } else {
      // If we get a response (even error responses), backend is available
      isBackendAvailable = true;
      lastConnectionCheck = now;
    }
  }
  
  return isBackendAvailable;
};

// Safe API call wrapper
const safeApiCall = async <T>(apiCall: () => Promise<T>, fallback?: T): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error: any) {
    // Only set backend as unavailable for actual connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND' || !error.response) {
      isBackendAvailable = false;
      console.warn('Backend is not available. Running in offline mode.');
      return fallback || null;
    } else {
      // For other errors (like 404, 500, etc.), the backend is still available
      isBackendAvailable = true;
      console.error('API call failed:', error.response?.data || error.message);
      throw error; // Re-throw the error for proper error handling
    }
  }
};

export const apiService = {
  // Backend availability check
  isBackendAvailable: () => isBackendAvailable,
  
  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health', { timeout: 10000 });
      isBackendAvailable = true;
      return response.data;
    } catch (error: any) {
      console.error('Health check failed:', error.message);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND' || !error.response) {
        isBackendAvailable = false;
        return null;
      } else {
        isBackendAvailable = true;
        throw error;
      }
    }
  },

  // EC2 Status
  async getEC2Status() {
    return safeApiCall(async () => {
      console.log('Fetching EC2 status from:', `${API_BASE_URL}/health`);
      const response = await api.get('/health');
      console.log('EC2 status response:', response.data);
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

  // Streaming prompt enhancement
  async enhancePromptStream(prompt: string, enhancementType: string, modelVersion?: string, onChunk?: (chunk: any) => void) {
    try {
      const response = await fetch(`${API_BASE_URL}/prompt/enhance/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          enhancement_type: enhancementType,
          model_version: modelVersion,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (onChunk) {
                onChunk(data);
              }
              if (data.type === 'complete') {
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
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

  // Chat functionality
  async sendChatMessage(message: string, options?: {
    modelVersion?: string;
    conversationId?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    return safeApiCall(async () => {
      const response = await api.post('/chat', {
        message,
        model_version: options?.modelVersion,
        conversation_id: options?.conversationId,
        system_prompt: options?.systemPrompt,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      });
      return response.data;
    });
  },

  async sendChatMessageStream(message: string, onChunk?: (chunk: any) => void, options?: {
    modelVersion?: string;
    conversationId?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          model_version: options?.modelVersion,
          conversation_id: options?.conversationId,
          system_prompt: options?.systemPrompt,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (onChunk) {
                onChunk(data);
              }
              if (data.type === 'complete') {
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat streaming error:', error);
      throw error;
    }
  },
};
