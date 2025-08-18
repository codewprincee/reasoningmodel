import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AutoFixHigh,
  ContentCopy,
  Clear,
  Psychology,
  Analytics,
  Lightbulb,
  Assignment,
  Build,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';

const enhancementTypes = [
  { value: 'reasoning', label: 'Reasoning', icon: <Psychology />, description: 'Step-by-step logical thinking' },
  { value: 'logic', label: 'Logic', icon: <Analytics />, description: 'Analytical and structured approach' },
  { value: 'creativity', label: 'Creativity', icon: <Lightbulb />, description: 'Creative and diverse perspectives' },
  { value: 'analysis', label: 'Analysis', icon: <Assignment />, description: 'Systematic breakdown and analysis' },
  { value: 'problem_solving', label: 'Problem Solving', icon: <Build />, description: 'Structured problem resolution' },
];

const examplePrompts = [
  {
    title: "Math Problem",
    prompt: "Solve: If a train travels 120 miles in 2 hours, how fast is it going?",
    type: "reasoning"
  },
  {
    title: "Creative Writing", 
    prompt: "Write a short story about a robot discovering emotions",
    type: "creativity"
  },
  {
    title: "Business Analysis",
    prompt: "Analyze the pros and cons of remote work for productivity",
    type: "analysis"
  },
  {
    title: "Problem Solving",
    prompt: "How would you reduce traffic congestion in a busy city?",
    type: "problem_solving"
  }
];

const PromptEnhancer: React.FC = () => {
  const { actions } = useAppContext();
  const [inputPrompt, setInputPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [enhancementType, setEnhancementType] = useState('reasoning');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!inputPrompt.trim()) {
      setError('Please enter a prompt to enhance');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const enhanced = await actions.enhancePrompt(inputPrompt, enhancementType);
      setEnhancedPrompt(enhanced);
    } catch (err) {
      setError('Failed to enhance prompt. Please try again.');
      console.error('Enhancement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputPrompt('');
    setEnhancedPrompt('');
    setError(null);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExampleClick = (example: typeof examplePrompts[0]) => {
    setInputPrompt(example.prompt);
    setEnhancementType(example.type);
    setEnhancedPrompt('');
    setError(null);
  };

  const selectedType = enhancementTypes.find(type => type.value === enhancementType);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Prompt Enhancer
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        Transform your prompts into more effective reasoning-enhanced versions using our trained GPT model.
      </Typography>

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enter Your Prompt
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Enhancement Type</InputLabel>
                  <Select
                    value={enhancementType}
                    label="Enhancement Type"
                    onChange={(e) => setEnhancementType(e.target.value)}
                  >
                    {enhancementTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          <Box>
                            <Typography variant="body1">{type.label}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedType && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>{selectedType.label}:</strong> {selectedType.description}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Original Prompt"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <AutoFixHigh />}
                    onClick={handleEnhance}
                    disabled={isLoading || !inputPrompt.trim()}
                  >
                    {isLoading ? 'Enhancing...' : 'Enhance Prompt'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={handleClear}
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Enhanced Output */}
              {enhancedPrompt && (
                <Box>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Enhanced Prompt</Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton onClick={() => handleCopyToClipboard(enhancedPrompt)}>
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                      border: '1px solid rgba(25, 118, 210, 0.2)'
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {enhancedPrompt}
                    </Typography>
                  </Paper>

                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      icon={selectedType?.icon} 
                      label={`Enhanced for ${selectedType?.label}`} 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Example Prompts
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Try these examples to see how prompt enhancement works:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {examplePrompts.map((example, index) => (
                  <Paper 
                    key={index}
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                    onClick={() => handleExampleClick(example)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">
                        {example.title}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={enhancementTypes.find(t => t.value === example.type)?.label}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {example.prompt}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips for Better Results
              </Typography>
              <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                <Typography component="li" variant="body2" paragraph>
                  Be specific about what you want to achieve
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Choose the right enhancement type for your use case
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Provide context when needed for better understanding
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Experiment with different enhancement types for the same prompt
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PromptEnhancer;
