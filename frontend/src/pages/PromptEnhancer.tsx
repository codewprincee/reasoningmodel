import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import './PromptEnhancer.css';

const enhancementTypes = [
  { value: 'reasoning', label: 'Reasoning', icon: '🧠', description: 'Step-by-step logical thinking' },
  { value: 'logic', label: 'Logic', icon: '📊', description: 'Analytical and structured approach' },
  { value: 'creativity', label: 'Creativity', icon: '💡', description: 'Creative and diverse perspectives' },
  { value: 'analysis', label: 'Analysis', icon: '📋', description: 'Systematic breakdown and analysis' },
  { value: 'problem_solving', label: 'Problem Solving', icon: '🔧', description: 'Structured problem resolution' },
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
    title: "Data Analysis",
    prompt: "Analyze the trends in quarterly sales data for a tech company",
    type: "analysis"
  }
];

const PromptEnhancer: React.FC = () => {
  const { actions } = useAppContext();
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [selectedType, setSelectedType] = useState('reasoning');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!originalPrompt.trim()) {
      setError('Please enter a prompt to enhance');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const enhanced = await actions.enhancePrompt(originalPrompt, selectedType);
      setEnhancedPrompt(enhanced);
    } catch (err) {
      setError('Failed to enhance prompt. Please try again.');
      console.error('Enhancement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setOriginalPrompt('');
    setEnhancedPrompt('');
    setError(null);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  };

  const handleExampleClick = (example: typeof examplePrompts[0]) => {
    setOriginalPrompt(example.prompt);
    setSelectedType(example.type);
    setEnhancedPrompt('');
    setError(null);
  };

  return (
    <div className="prompt-enhancer">
      <div className="enhancer-header">
        <h1>Prompt Enhancer</h1>
        <p className="subtitle">
          Enhance your prompts using AI to improve clarity, structure, and effectiveness
        </p>
      </div>

      {/* Enhancement Type Selection */}
      <div className="enhancement-types">
        <h3>Enhancement Type</h3>
        <div className="type-grid">
          {enhancementTypes.map((type) => (
            <div
              key={type.value}
              className={`type-card ${selectedType === type.value ? 'type-card-selected' : ''}`}
              onClick={() => setSelectedType(type.value)}
            >
              <div className="type-icon">{type.icon}</div>
              <div className="type-content">
                <h4>{type.label}</h4>
                <p>{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="examples-section">
        <h3>Example Prompts</h3>
        <div className="examples-grid">
          {examplePrompts.map((example, index) => (
            <div key={index} className="example-card" onClick={() => handleExampleClick(example)}>
              <h4>{example.title}</h4>
              <p>{example.prompt}</p>
              <span className="example-type">{enhancementTypes.find(t => t.value === example.type)?.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Enhancement Interface */}
      <div className="enhancement-interface">
        <div className="input-section">
          <div className="prompt-input">
            <label htmlFor="original-prompt">Original Prompt</label>
            <textarea
              id="original-prompt"
              value={originalPrompt}
              onChange={(e) => setOriginalPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={6}
            />
            <div className="input-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleClear}
                disabled={isLoading}
              >
                🗑️ Clear
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleEnhance}
                disabled={isLoading || !originalPrompt.trim()}
              >
                {isLoading ? '⏳ Enhancing...' : '✨ Enhance Prompt'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {enhancedPrompt && (
            <div className="prompt-output">
              <div className="output-header">
                <label>Enhanced Prompt</label>
                <button 
                  className="btn btn-small"
                  onClick={() => handleCopyToClipboard(enhancedPrompt)}
                >
                  📋 Copy
                </button>
              </div>
              <div className="enhanced-content">
                {enhancedPrompt}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="tips-section">
        <h3>💡 Tips for Better Prompts</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>Be Specific</h4>
            <p>Provide clear context and specific requirements for better results.</p>
          </div>
          <div className="tip-card">
            <h4>Use Examples</h4>
            <p>Include examples of desired output format or style when possible.</p>
          </div>
          <div className="tip-card">
            <h4>Set Constraints</h4>
            <p>Define length, format, or other constraints to guide the response.</p>
          </div>
          <div className="tip-card">
            <h4>Iterate</h4>
            <p>Refine your prompts based on the results to improve performance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEnhancer;