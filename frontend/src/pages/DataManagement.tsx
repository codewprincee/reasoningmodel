import React, { useState, useEffect, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudUpload,
  InsertDriveFile,
  DataObject,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppContext } from '../contexts/AppContext';

interface UploadFormData {
  name: string;
  description: string;
}

const DataManagement: React.FC = () => {
  const { state, actions } = useAppContext();
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<UploadFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    actions.loadDatasets();
  }, [actions]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill name with filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      reset({ name: nameWithoutExt, description: '' });
    }
  };

  const handleUpload = async (data: UploadFormData) => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress (in real app, this would come from the upload request)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await actions.uploadDataset(selectedFile, data.name, data.description);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setOpenUploadDialog(false);
        setSelectedFile(null);
        setUploadProgress(0);
        reset();
      }, 500);

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (datasetId: string) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      try {
        await actions.deleteDataset(datasetId);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleView = async (datasetId: string) => {
    // In a real app, you'd load the dataset details
    setSelectedDataset({ 
      dataset_id: datasetId,
      sample_data: [
        { input_prompt: "Solve this math problem", enhanced_prompt: "Let's think step by step about this math problem..." },
        { input_prompt: "Write a story", enhanced_prompt: "To write an engaging story, let's consider the key elements..." }
      ]
    });
    setOpenViewDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
      case 'jsonl':
        return <DataObject color="primary" />;
      case 'csv':
      case 'tsv':
        return <InsertDriveFile color="success" />;
      default:
        return <InsertDriveFile color="action" />;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'json':
      case 'jsonl':
        return 'primary';
      case 'csv':
      case 'tsv':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Data Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setOpenUploadDialog(true)}
        >
          Upload Dataset
        </Button>
      </Box>

      <Typography variant="body1" color="textSecondary" paragraph>
        Manage your training datasets. Upload JSON, JSONL, or CSV files containing prompt-enhancement pairs.
      </Typography>

      {/* Datasets Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {state.datasets.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Datasets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {state.datasets.reduce((sum, d) => sum + d.size, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Examples
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {formatFileSize(state.datasets.reduce((sum, d) => sum + d.file_size, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Size
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Datasets Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Uploaded Datasets
          </Typography>
          
          {state.datasets.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Examples</TableCell>
                    <TableCell>File Size</TableCell>
                    <TableCell>Uploaded</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.datasets.map((dataset) => (
                    <TableRow key={dataset.dataset_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getFormatIcon(dataset.format)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {dataset.name}
                            </Typography>
                            {dataset.description && (
                              <Typography variant="caption" color="textSecondary">
                                {dataset.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dataset.format.toUpperCase()}
                          color={getFormatColor(dataset.format) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dataset.size.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatFileSize(dataset.file_size)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(dataset.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Dataset">
                            <IconButton
                              size="small"
                              onClick={() => handleView(dataset.dataset_id)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Dataset">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(dataset.dataset_id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No datasets uploaded yet. Upload your first dataset to get started with training.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(handleUpload)}>
          <DialogTitle>Upload Dataset</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json,.jsonl,.csv,.txt,.tsv"
                style={{ display: 'none' }}
              />
              
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{ mb: 3, py: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Choose File'}
              </Button>

              {selectedFile && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Alert>
              )}

              <Controller
                name="name"
                control={control}
                rules={{ required: 'Dataset name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Dataset Name"
                    margin="normal"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Description (optional)"
                    margin="normal"
                    multiline
                    rows={3}
                  />
                )}
              />

              {isUploading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uploading... {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenUploadDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!selectedFile || isUploading}
            >
              Upload
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dataset Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Dataset Preview</DialogTitle>
        <DialogContent>
          {selectedDataset && (
            <Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Showing sample data from the dataset:
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Input Prompt</TableCell>
                      <TableCell>Enhanced Prompt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDataset.sample_data.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {item.input_prompt}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.enhanced_prompt}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagement;
