import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Memory,
  Storage,
  Speed,
  CloudCircle,
  Refresh,
  PlayArrow,
  Stop,
  Computer,
  ShowChart,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import { apiService } from '../services/apiService';

const ModelInfo: React.FC = () => {
  const { state, actions } = useAppContext();
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [modelVersions, setModelVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadModelInfo();
    loadModelVersions();
    actions.loadEC2Status();
  }, [actions]);

  const loadModelInfo = async () => {
    try {
      setIsLoading(true);
      const info = await apiService.getModelInfo();
      setModelInfo(info);
    } catch (error) {
      console.error('Failed to load model info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelVersions = async () => {
    try {
      const versions = await apiService.getModelVersions();
      setModelVersions(versions);
    } catch (error) {
      console.error('Failed to load model versions:', error);
    }
  };

  const handleRefresh = () => {
    loadModelInfo();
    actions.loadEC2Status();
  };

  const formatBytes = (bytes: string | number) => {
    if (typeof bytes === 'string') return bytes;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Model Information
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Model Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Memory color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Model Status</Typography>
              </Box>
              
              {modelInfo ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={modelInfo.loaded ? 'Loaded' : 'Not Loaded'}
                      color={modelInfo.loaded ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Name:
                    </Typography>
                    <Typography variant="body2">{modelInfo.model_name}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Size:
                    </Typography>
                    <Typography variant="body2">{modelInfo.model_size}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Parameters:
                    </Typography>
                    <Typography variant="body2">{formatNumber(modelInfo.parameters)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Path:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                      {modelInfo.model_path}
                    </Typography>
                  </Box>
                  
                  {modelInfo.memory_usage && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                        Memory:
                      </Typography>
                      <Typography variant="body2">{modelInfo.memory_usage}</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="warning">
                  Unable to load model information. Check EC2 connection.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* EC2 Instance Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudCircle color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">EC2 Instance</Typography>
              </Box>
              
              {state.ec2Status ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      State:
                    </Typography>
                    <Chip
                      label={state.ec2Status.instance_state}
                      color={state.ec2Status.instance_state === 'running' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Type:
                    </Typography>
                    <Typography variant="body2">{state.ec2Status.instance_type}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                      Public IP:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {state.ec2Status.public_ip || 'N/A'}
                    </Typography>
                  </Box>
                  
                  {state.ec2Status.uptime && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ minWidth: 80 }}>
                        Uptime:
                      </Typography>
                      <Typography variant="body2">{state.ec2Status.uptime}</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="warning">
                  Unable to load EC2 status information.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Metrics
              </Typography>
              
              {state.ec2Status ? (
                <Grid container spacing={3}>
                  {state.ec2Status.cpu_usage !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Computer color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">CPU Usage</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={state.ec2Status.cpu_usage}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {state.ec2Status.cpu_usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  
                  {state.ec2Status.memory_usage !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Memory color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">Memory Usage</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={state.ec2Status.memory_usage}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {state.ec2Status.memory_usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  
                  {state.ec2Status.gpu_usage !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <ShowChart color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">GPU Usage</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={state.ec2Status.gpu_usage}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {state.ec2Status.gpu_usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  
                  {state.ec2Status.disk_usage !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Storage color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2">Disk Usage</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={state.ec2Status.disk_usage}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {state.ec2Status.disk_usage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Alert severity="info">
                  System metrics unavailable. Check EC2 connection.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Available Model Versions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Model Versions
              </Typography>
              
              {modelVersions.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Version</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {modelVersions.map((version, index) => (
                        <TableRow key={version}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {version}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={version === 'base' ? 'Base Model' : 'Fine-tuned'}
                              color={version === 'base' ? 'default' : 'primary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={index === 0 ? 'Active' : 'Available'}
                              color={index === 0 ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Load Model">
                              <IconButton size="small" disabled={index === 0}>
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No model versions available or unable to load version information.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelInfo;
