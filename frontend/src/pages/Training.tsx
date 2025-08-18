import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore,
  Settings,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppContext } from '../contexts/AppContext';

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
  const [openDialog, setOpenDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { control, handleSubmit, formState: { errors }, reset } = useForm<TrainingFormData>({
    defaultValues: {
      experimentName: '',
      description: '',
      datasetId: '',
      epochs: 3,
      batchSize: 4,
      learningRate: 0.00005,
      useLoRA: true,
      loraR: 16,
      loraAlpha: 32,
    },
  });

  useEffect(() => {
    actions.loadTrainingJobs();
    actions.loadDatasets();
  }, [actions]);

  const handleStartTraining = async (data: TrainingFormData) => {
    try {
      const selectedDataset = state.datasets.find(d => d.dataset_id === data.datasetId);
      if (!selectedDataset) {
        alert('Please select a dataset');
        return;
      }

      const trainingData = {
        experiment_name: data.experimentName,
        description: data.description,
        training_data: [], // This would be loaded from the selected dataset
        model_config: {
          model_name: 'gpt-oss-20b',
          max_length: 2048,
          temperature: 0.7,
          learning_rate: data.learningRate,
        },
        training_config: {
          epochs: data.epochs,
          batch_size: data.batchSize,
          use_lora: data.useLoRA,
          lora_r: data.loraR,
          lora_alpha: data.loraAlpha,
        },
      };

      await actions.startTraining(trainingData);
      setOpenDialog(false);
      reset();
    } catch (error) {
      console.error('Failed to start training:', error);
    }
  };

  const handleStopTraining = async (trainingId: string) => {
    try {
      await actions.stopTraining(trainingId);
    } catch (error) {
      console.error('Failed to stop training:', error);
    }
  };

  const getStatusColor = (status: string) => {
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

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Training Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          disabled={state.datasets.length === 0}
        >
          Start New Training
        </Button>
      </Box>

      {state.datasets.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No datasets available. Please upload a dataset first in the Data Management section.
        </Alert>
      )}

      {/* Active Training Jobs */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Active Training Jobs
            </Typography>
            <IconButton onClick={() => actions.loadTrainingJobs()}>
              <Refresh />
            </IconButton>
          </Box>

          {state.trainingJobs.filter(job => job.status === 'running' || job.status === 'pending').length > 0 ? (
            <Grid container spacing={2}>
              {state.trainingJobs
                .filter(job => job.status === 'running' || job.status === 'pending')
                .map((job) => (
                  <Grid item xs={12} md={6} key={job.training_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1">
                            Training {job.training_id.substring(0, 8)}...
                          </Typography>
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status) as any}
                            size="small"
                          />
                        </Box>
                        
                        {job.progress > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Progress</Typography>
                              <Typography variant="body2">{job.progress.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={job.progress} />
                          </Box>
                        )}

                        {job.current_epoch && job.total_epochs && (
                          <Typography variant="body2" color="textSecondary">
                            Epoch {job.current_epoch} of {job.total_epochs}
                          </Typography>
                        )}

                        {job.loss && (
                          <Typography variant="body2" color="textSecondary">
                            Loss: {job.loss.toFixed(4)}
                          </Typography>
                        )}

                        <Box sx={{ mt: 2 }}>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<Stop />}
                            onClick={() => handleStopTraining(job.training_id)}
                            disabled={job.status !== 'running'}
                          >
                            Stop Training
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No active training jobs
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Training History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Training History
          </Typography>
          
          {state.trainingJobs.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Training ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Final Loss</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.trainingJobs.map((job) => (
                    <TableRow key={job.training_id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {job.training_id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={job.status}
                          color={getStatusColor(job.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={job.progress}
                            sx={{ width: 100 }}
                          />
                          <Typography variant="body2">
                            {job.progress.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {formatDuration(job.created_at, job.updated_at)}
                      </TableCell>
                      <TableCell>
                        {job.loss ? job.loss.toFixed(4) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(job.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No training history available
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Start Training Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(handleStartTraining)}>
          <DialogTitle>Start New Training</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="experimentName"
                  control={control}
                  rules={{ required: 'Experiment name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Experiment Name"
                      error={!!errors.experimentName}
                      helperText={errors.experimentName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="datasetId"
                  control={control}
                  rules={{ required: 'Dataset selection is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.datasetId}>
                      <InputLabel>Dataset</InputLabel>
                      <Select {...field} label="Dataset">
                        {state.datasets.map((dataset) => (
                          <MenuItem key={dataset.dataset_id} value={dataset.dataset_id}>
                            {dataset.name} ({dataset.size} examples)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Basic Training Parameters */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="epochs"
                  control={control}
                  rules={{ required: 'Epochs is required', min: 1, max: 20 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Epochs"
                      type="number"
                      error={!!errors.epochs}
                      helperText={errors.epochs?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="batchSize"
                  control={control}
                  rules={{ required: 'Batch size is required', min: 1 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Batch Size"
                      type="number"
                      error={!!errors.batchSize}
                      helperText={errors.batchSize?.message}
                    />
                  )}
                />
              </Grid>

              {/* Advanced Settings */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Settings sx={{ mr: 1 }} />
                      <Typography>Advanced Settings</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="learningRate"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Learning Rate"
                              type="number"
                              step="0.00001"
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="loraR"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="LoRA R"
                              type="number"
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="loraAlpha"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="LoRA Alpha"
                              type="number"
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<PlayArrow />}>
              Start Training
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Training;
