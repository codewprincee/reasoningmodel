# AI Model Trainer - GPT OSS 20B Reasoning Prompt Enhancer

A comprehensive web application for training and using a reasoning prompt enhancer based on the GPT OSS 20B model deployed on AWS EC2 with Ollama.

## Overview

This project provides a complete solution for:
- Connecting to your EC2 g4 instance with GPT OSS 20B model via Ollama
- Training and fine-tuning models for reasoning prompt enhancement  
- Managing training datasets
- Real-time monitoring of system metrics
- Using AI models to enhance prompts with better reasoning

## Architecture

- **Backend**: FastAPI with async support and Ollama integration
- **Frontend**: React with TypeScript and custom components
- **Model**: GPT OSS 20B running via Ollama on EC2 g4 instance
- **Deployment**: Nginx reverse proxy with systemd service management
- **Communication**: HTTP API calls to Ollama service

## Prerequisites

1. **EC2 Instance**: 
   - g4 instance type (recommended: g4dn.xlarge or larger)
   - Ubuntu 20.04 or later
   - GPT OSS 20B model available via Ollama
   - HTTP access configured (ports 80, 443)

2. **Local Development**:
   - Python 3.8+
   - Node.js 16+
   - npm or yarn

3. **Domain/SSL** (Optional but recommended):
   - Domain name pointing to your EC2 instance
   - SSL certificate for HTTPS

## Quick Deployment (Production)

### Option A: Automated Deployment

```bash
# Run the automated deployment script
./deployment/quick-deploy.sh
```

This will:
1. Set up your EC2 instance with Ollama
2. Deploy the backend with nginx
3. Configure SSL (if domain provided)
4. Test the deployment

### Option B: Manual Deployment

#### 1. One-Command Deployment (Recommended)

```bash
# SSH to your EC2 instance and run the clone-and-deploy script
ssh -i your-key.pem ubuntu@your-ec2-ip
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/clone-and-deploy.sh | bash
```

#### 2. Step-by-Step Deployment

**Step 1: Set up EC2 Instance**
```bash
# SSH to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run the setup script
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/ec2-setup.sh | bash
```

**Step 2: Deploy Application**
```bash
# Clone and deploy
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/clone-and-deploy.sh | bash
```

**Alternative: Manual deployment**
```bash
# Clone repository
git clone https://github.com/codewprincee/reasoningmodel.git /home/ubuntu/ai-model
cd /home/ubuntu/ai-model

# Run deployment
./deployment/deploy.sh
```

#### 3. Access Your Application

- Backend API: `http://your-ec2-ip` or `https://your-domain.com`
- API Documentation: `http://your-ec2-ip/docs`
- Health Check: `http://your-ec2-ip/health`

## Local Development

### 1. Install Dependencies

```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install
```

### 2. Configure Environment

Create a `.env` file in the backend directory:

```env
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss-20b

# API Configuration  
API_HOST=localhost
API_PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=sqlite:///./training_data.db
```

### 3. Start Development

```bash
# Start both backend and frontend
npm run dev
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

## Production Configuration

### Ollama Setup

Your EC2 instance will be configured with:

1. **Ollama service** running on port 11434
2. **GPU support** (if g4 instance with NVIDIA GPU)
3. **GPT OSS 20B model** pulled and ready
4. **Systemd service** for automatic startup

### Nginx Configuration

- **Reverse proxy** handling HTTP/HTTPS traffic
- **CORS headers** properly configured
- **SSL termination** (if certificate provided)
- **Static file serving** for any frontend assets

### Security Configuration

- **Firewall rules**: Only necessary ports open (22, 80, 443)
- **Ollama API**: Only accessible locally (localhost:11434)
- **SSL/TLS**: Automatic certificate management with Certbot
- **Service isolation**: Systemd service with security restrictions

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
