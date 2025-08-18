# AI Model Trainer - GPT OSS 20B Reasoning Prompt Enhancer

A comprehensive web application for training and using a reasoning prompt enhancer based on the GPT OSS 20B model deployed on AWS EC2.

## Overview

This project provides a complete solution for:
- Connecting to your EC2 g4 instance with GPT OSS 20B model
- Training the model for reasoning prompt enhancement
- Managing training datasets
- Real-time monitoring of training progress
- Using the trained model to enhance prompts

## Architecture

- **Backend**: FastAPI with async support
- **Frontend**: React with TypeScript and Material-UI
- **Model**: GPT OSS 20B running on EC2 g4 instance
- **Training**: LoRA fine-tuning for efficient adaptation
- **Connection**: SSH-based communication with EC2

## Prerequisites

1. **EC2 Instance**: 
   - g4 instance type (recommended: g4dn.xlarge or larger)
   - GPT OSS 20B model installed and configured
   - SSH access configured

2. **Local Environment**:
   - Python 3.8+
   - Node.js 16+
   - npm or yarn

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies for frontend
cd frontend && npm install

# Install concurrently for running both services
npm install -g concurrently
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# EC2 Configuration
EC2_HOST=your-ec2-instance-ip
EC2_USER=ubuntu
EC2_KEY_PATH=/path/to/your/private-key.pem
EC2_REGION=us-east-1

# Model Configuration
MODEL_NAME=gpt-oss-20b
MODEL_PATH=/path/to/model/on/ec2

# API Configuration
API_HOST=localhost
API_PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=sqlite:///./training_data.db
```

### 3. Start the Application

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
# Backend: npm run dev:backend
# Frontend: npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Features

### 🖥️ Dashboard
- Real-time EC2 instance monitoring
- Model status and resource usage
- Training job overview
- Dataset statistics

### 🎯 Training Management
- Start new training jobs with custom parameters
- Monitor training progress in real-time
- View training history and logs
- Stop running training jobs

### 📊 Data Management
- Upload training datasets (JSON, JSONL, CSV)
- Preview dataset contents
- Manage multiple datasets
- Track dataset statistics

### ✨ Prompt Enhancer
- Enhance prompts for better reasoning
- Multiple enhancement types:
  - Reasoning (step-by-step thinking)
  - Logic (analytical approach)
  - Creativity (diverse perspectives)
  - Analysis (systematic breakdown)
  - Problem Solving (structured resolution)

### 🔧 Model Information
- View model details and status
- Monitor system metrics (CPU, GPU, memory)
- Manage model versions
- EC2 instance information

## Usage

### Setting Up Training Data

1. **Prepare your dataset** in one of these formats:

   **JSON format:**
   ```json
   [
     {
       "input_prompt": "Solve this math problem: 2 + 2",
       "enhanced_prompt": "Let's think step by step about this math problem: 2 + 2. First, I need to understand what addition means...",
       "reasoning_steps": ["Understand the operation", "Apply addition", "Verify the result"],
       "category": "mathematics",
       "difficulty": 1
     }
   ]
   ```

   **JSONL format:**
   ```jsonl
   {"input_prompt": "Write a story", "enhanced_prompt": "To write an engaging story, let's consider the key elements..."}
   {"input_prompt": "Explain gravity", "enhanced_prompt": "Let me break down the concept of gravity step by step..."}
   ```

2. **Upload via the Data Management page**
3. **Start training** from the Training page

### Training Configuration

- **Epochs**: Number of training iterations (1-20)
- **Batch Size**: Training batch size (recommended: 4-8)
- **Learning Rate**: Fine-tuning learning rate (default: 5e-5)
- **LoRA Parameters**: Efficient fine-tuning settings
  - LoRA R: Rank (default: 16)
  - LoRA Alpha: Alpha parameter (default: 32)

### Using the Prompt Enhancer

1. Navigate to the Prompt Enhancer page
2. Enter your original prompt
3. Select enhancement type
4. Click "Enhance Prompt"
5. Copy the enhanced result

## API Endpoints

### Training
- `POST /training/start` - Start a new training job
- `GET /training/status/{training_id}` - Get training status
- `POST /training/stop/{training_id}` - Stop training job

### Data Management
- `POST /data/upload` - Upload dataset
- `GET /data/datasets` - List datasets
- `GET /data/dataset/{dataset_id}` - Get dataset details
- `DELETE /data/dataset/{dataset_id}` - Delete dataset

### Prompt Enhancement
- `POST /prompt/enhance` - Enhance a prompt

### Model & System
- `GET /model/info` - Get model information
- `GET /model/versions` - List model versions
- `GET /health` - Health check and EC2 status

## EC2 Setup

### Model Installation

Your EC2 instance should have:

1. **GPU drivers and CUDA** properly installed
2. **Python environment** with required packages:
   ```bash
   pip install torch transformers accelerate peft bitsandbytes
   ```

3. **GPT OSS 20B model** downloaded and configured
4. **SSH access** enabled for the training scripts

### Security Configuration

- Ensure your EC2 security group allows SSH (port 22) from your IP
- Keep your private key secure and properly configured
- Consider using IAM roles for AWS API access

## Troubleshooting

### Common Issues

1. **EC2 Connection Failed**
   - Check EC2 instance is running
   - Verify SSH key path and permissions
   - Ensure security group allows SSH access

2. **Model Not Loading**
   - Check available GPU memory
   - Verify model path on EC2
   - Ensure required packages are installed

3. **Training Fails**
   - Check dataset format
   - Verify GPU availability
   - Monitor EC2 instance resources

### Logs and Monitoring

- Backend logs: Check terminal running the FastAPI server
- Training logs: Available in the training status and EC2 instance
- Frontend errors: Check browser developer console

## Development

### Project Structure

```
ai-model/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application
│   ├── models/             # Pydantic schemas
│   └── services/           # Business logic
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Main pages
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API services
├── requirements.txt        # Python dependencies
└── package.json           # Node.js scripts
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at `/docs`
3. Create an issue in the repository
