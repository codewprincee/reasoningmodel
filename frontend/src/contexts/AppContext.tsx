import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from 'react';
import { apiService } from '../services/apiService';

// Types
interface TrainingJob {
  training_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  current_epoch?: number;
  total_epochs?: number;
  loss?: number;
  eval_loss?: number;
  created_at: string;
  updated_at: string;
  logs: string[];
}

interface Dataset {
  dataset_id: string;
  name: string;
  description?: string;
  filename: string;
  size: number;
  file_size: number;
  format: string;
  created_at: string;
  updated_at: string;
}

interface EC2Status {
  instance_id: string;
  instance_state: string;
  instance_type: string;
  public_ip?: string;
  cpu_usage?: number;
  memory_usage?: number;
  gpu_usage?: number;
  model_loaded: boolean;
  last_checked: string;
}

interface AppState {
  trainingJobs: TrainingJob[];
  datasets: Dataset[];
  ec2Status: EC2Status | null;
  isLoading: boolean;
  error: string | null;
  isBackendAvailable: boolean;
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRAINING_JOBS'; payload: TrainingJob[] }
  | { type: 'ADD_TRAINING_JOB'; payload: TrainingJob }
  | { type: 'UPDATE_TRAINING_JOB'; payload: TrainingJob }
  | { type: 'SET_DATASETS'; payload: Dataset[] }
  | { type: 'ADD_DATASET'; payload: Dataset }
  | { type: 'REMOVE_DATASET'; payload: string }
  | { type: 'SET_EC2_STATUS'; payload: EC2Status }
  | { type: 'SET_BACKEND_AVAILABILITY'; payload: boolean };

const initialState: AppState = {
  trainingJobs: [],
  datasets: [],
  ec2Status: null,
  isLoading: false,
  error: null,
  isBackendAvailable: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TRAINING_JOBS':
      return { ...state, trainingJobs: action.payload };
    case 'ADD_TRAINING_JOB':
      return { ...state, trainingJobs: [action.payload, ...state.trainingJobs] };
    case 'UPDATE_TRAINING_JOB':
      return {
        ...state,
        trainingJobs: state.trainingJobs.map(job =>
          job.training_id === action.payload.training_id ? action.payload : job
        ),
      };
    case 'SET_DATASETS':
      return { ...state, datasets: action.payload };
    case 'ADD_DATASET':
      return { ...state, datasets: [action.payload, ...state.datasets] };
    case 'REMOVE_DATASET':
      return {
        ...state,
        datasets: state.datasets.filter(d => d.dataset_id !== action.payload),
      };
    case 'SET_EC2_STATUS':
      return { ...state, ec2Status: action.payload };
    case 'SET_BACKEND_AVAILABILITY':
      return { ...state, isBackendAvailable: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    loadTrainingJobs: () => Promise<void>;
    loadDatasets: () => Promise<void>;
    loadEC2Status: () => Promise<void>;
    startTraining: (data: any) => Promise<string>;
    stopTraining: (trainingId: string) => Promise<void>;
    uploadDataset: (file: File, name: string, description?: string) => Promise<string>;
    deleteDataset: (datasetId: string) => Promise<void>;
    enhancePrompt: (prompt: string, type: string) => Promise<string>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const loadTrainingJobs = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // This would be implemented when you have actual training jobs
      dispatch({ type: 'SET_TRAINING_JOBS', payload: [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadDatasets = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const datasets = await apiService.getDatasets();
      dispatch({ type: 'SET_DATASETS', payload: datasets || [] });
      dispatch({ type: 'SET_BACKEND_AVAILABILITY', payload: apiService.isBackendAvailable() });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      dispatch({ type: 'SET_BACKEND_AVAILABILITY', payload: false });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadEC2Status = useCallback(async () => {
    try {
      const status = await apiService.getEC2Status();
      if (status) {
        dispatch({ type: 'SET_EC2_STATUS', payload: status });
        dispatch({ type: 'SET_BACKEND_AVAILABILITY', payload: apiService.isBackendAvailable() });
      }
    } catch (error) {
      console.error('Failed to load EC2 status:', error);
      dispatch({ type: 'SET_BACKEND_AVAILABILITY', payload: false });
    }
  }, []);

  const startTraining = useCallback(async (trainingData: any): Promise<string> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.startTraining(trainingData);
      
      if (response) {
        // Add the new training job to state
        const newJob: TrainingJob = {
          training_id: response.training_id,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          logs: [],
        };
        dispatch({ type: 'ADD_TRAINING_JOB', payload: newJob });
        return response.training_id;
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const stopTraining = useCallback(async (trainingId: string) => {
    try {
      const result = await apiService.stopTraining(trainingId);
      
      if (result) {
        // Update job status
        const updatedJob = state.trainingJobs.find(j => j.training_id === trainingId);
        if (updatedJob) {
          dispatch({
            type: 'UPDATE_TRAINING_JOB',
            payload: { ...updatedJob, status: 'stopped' },
          });
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, [state.trainingJobs]);

  const uploadDataset = useCallback(async (file: File, name: string, description?: string): Promise<string> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const datasetId = await apiService.uploadDataset(file, name, description);
      
      if (datasetId) {
        // Reload datasets after successful upload
        const datasets = await apiService.getDatasets();
        dispatch({ type: 'SET_DATASETS', payload: datasets || [] });
        return datasetId;
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const deleteDataset = useCallback(async (datasetId: string) => {
    try {
      const result = await apiService.deleteDataset(datasetId);
      if (result !== null) {
        dispatch({ type: 'REMOVE_DATASET', payload: datasetId });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, []);

  const enhancePrompt = useCallback(async (prompt: string, type: string): Promise<string> => {
    try {
      const response = await apiService.enhancePrompt(prompt, type);
      if (response && response.enhanced_prompt) {
        return response.enhanced_prompt;
      } else {
        throw new Error('Backend not available or invalid response');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, []);

  const actions = useMemo(() => ({
    loadTrainingJobs,
    loadDatasets,
    loadEC2Status,
    startTraining,
    stopTraining,
    uploadDataset,
    deleteDataset,
    enhancePrompt,
  }), [loadTrainingJobs, loadDatasets, loadEC2Status, startTraining, stopTraining, uploadDataset, deleteDataset, enhancePrompt]);

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
