

# EC2 Setup Script for AI Model Trainer with Ollama
# Run this script on your EC2 instance to set up the environm
set -e

echo "🚀 Setting up EC2 instance for AI Model Trainer with Ollama..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing system dependencies..."
sudo apt install -y \
    curl \
    wget \
    git \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    htop \
    unzip \
    software-properties-common

# Install Docker (for Ollama)
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Ollama
print_status "Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
print_status "Starting Ollama service..."
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to be ready
print_status "Waiting for Ollama to be ready..."
sleep 10

# Pull the GPT model (adjust model name as needed)
print_status "Pulling GPT model for Ollama..."
print_warning "This will download a large model file. Make sure you have enough disk space and bandwidth."

# You might need to adjust the model name based on what's available
# Common models: codellama, llama2, mistral, etc.
# For now, we'll use a placeholder - you'll need to update this
MODEL_NAME="llama2"  # Change this to your specific GPT OSS 20B model

if ollama list | grep -q "$MODEL_NAME"; then
    print_status "Model $MODEL_NAME already exists"
else
    print_status "Pulling model $MODEL_NAME..."
    ollama pull $MODEL_NAME
fi

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /home/ubuntu/ai-model
sudo chown ubuntu:ubuntu /home/ubuntu/ai-model

# Configure firewall (if needed)
print_status "Configuring firewall..."
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 11434/tcp   # Ollama API
sudo ufw --force enable

# Create environment file template
print_status "Creating environment configuration template..."
cat > /home/ubuntu/ai-model/.env.template << EOL
# AI Model Trainer Configuration for Production
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=$MODEL_NAME
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=sqlite:///./training_data.db
SECRET_KEY=change-this-secret-key
ENVIRONMENT=production
EOL

# Check if NVIDIA GPU is available
if command -v nvidia-smi &> /dev/null; then
    print_status "✅ NVIDIA GPU detected"
    nvidia-smi
    
    # Install NVIDIA Docker runtime (for GPU support in Ollama)
    print_status "Setting up NVIDIA Docker runtime..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    
    sudo apt-get update && sudo apt-get install -y nvidia-docker2
    sudo systemctl restart docker
    
    print_status "GPU support configured for Docker/Ollama"
else
    print_warning "No NVIDIA GPU detected. Running in CPU mode."
fi

# Test Ollama installation
print_status "Testing Ollama installation..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    print_status "✅ Ollama is running and accessible"
    
    # Test model
    print_status "Testing model $MODEL_NAME..."
    if ollama list | grep -q "$MODEL_NAME"; then
        print_status "✅ Model $MODEL_NAME is available"
        
        # Quick test generation
        print_status "Running quick test generation..."
        echo "Test prompt: Hello, how are you?" | ollama run $MODEL_NAME --verbose || print_warning "Model test failed, but installation seems correct"
    else
        print_error "❌ Model $MODEL_NAME is not available"
    fi
else
    print_error "❌ Ollama is not responding"
fi

# Get instance information
INSTANCE_IP=$(curl -s http://checkip.amazonaws.com)
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)

print_status "🎉 EC2 setup completed!"
echo ""
echo "📋 Setup Summary:"
echo "   • Instance Type: $INSTANCE_TYPE"
echo "   • Public IP: $INSTANCE_IP"
echo "   • Ollama Status: $(systemctl is-active ollama)"
echo "   • Available Model: $MODEL_NAME"
echo ""
echo "🔧 Next Steps:"
echo "   1. Copy your application code to /home/ubuntu/ai-model/"
echo "   2. Configure the .env file based on .env.template"
echo "   3. Run the deployment script: ./deployment/deploy.sh"
echo "   4. Update your frontend to connect to: http://$INSTANCE_IP"
echo ""
echo "🔍 Useful Commands:"
echo "   • Check Ollama status: systemctl status ollama"
echo "   • View available models: ollama list"
echo "   • Test model: ollama run $MODEL_NAME"
echo "   • View Ollama logs: journalctl -u ollama -f"
echo ""
print_warning "Remember to update the OLLAMA_MODEL environment variable if you use a different model!"
print_warning "Make sure to configure your security groups to allow HTTP traffic on port 80!"
EOF