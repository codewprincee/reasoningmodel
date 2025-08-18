#!/bin/bash

# AI Model Trainer Deployment Script for EC2
set -e

echo "🚀 Starting deployment of AI Model Trainer backend..."

# Configuration
APP_NAME="ai-model-trainer"
APP_USER="ubuntu"
APP_DIR="/home/ubuntu/ai-model"
VENV_DIR="$APP_DIR/venv"
BACKEND_DIR="$APP_DIR/backend"
SERVICE_NAME="ai-model-trainer"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as ubuntu user."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nginx git htop curl

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository (if deploying from git)
# Uncomment if deploying from git repository
# if [ -d ".git" ]; then
#     print_status "Updating from git repository..."
#     git pull origin main
# else
#     print_status "Cloning repository..."
#     git clone https://github.com/your-username/ai-model-trainer.git .
# fi

# Create Python virtual environment
print_status "Creating Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv $VENV_DIR
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source $VENV_DIR/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_status "Creating environment configuration..."
    cat > $BACKEND_DIR/.env << EOF
# AI Model Trainer Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss-20b
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=sqlite:///./training_data.db
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
EOF
    print_warning "Please update the .env file with your specific configuration"
fi

# Set up systemd service
print_status "Setting up systemd service..."
sudo cp deployment/systemd.service /etc/systemd/system/$SERVICE_NAME.service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

# Configure nginx
print_status "Configuring nginx..."
sudo cp deployment/nginx.conf /etc/nginx/sites-available/$APP_NAME
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed"
    exit 1
fi

# Create directories for logs and data
print_status "Creating necessary directories..."
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/data
mkdir -p $APP_DIR/uploads

# Set proper permissions
print_status "Setting file permissions..."
sudo chown -R $APP_USER:$APP_USER $APP_DIR
chmod +x $APP_DIR/deployment/deploy.sh

# Start services
print_status "Starting services..."
sudo systemctl restart nginx
sudo systemctl restart $SERVICE_NAME

# Wait a moment for services to start
sleep 3

# Check service status
print_status "Checking service status..."
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    print_status "✅ AI Model Trainer service is running"
else
    print_error "❌ AI Model Trainer service failed to start"
    sudo systemctl status $SERVICE_NAME
    exit 1
fi

if sudo systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx failed to start"
    sudo systemctl status nginx
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s http://checkip.amazonaws.com)

print_status "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   • Backend API: http://$SERVER_IP"
echo "   • Health Check: http://$SERVER_IP/health"
echo "   • API Docs: http://$SERVER_IP/docs"
echo ""
echo "🔧 Useful Commands:"
echo "   • View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   • Restart API: sudo systemctl restart $SERVICE_NAME"
echo "   • Restart Nginx: sudo systemctl restart nginx"
echo "   • Check status: sudo systemctl status $SERVICE_NAME"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Update your domain DNS to point to: $SERVER_IP"
echo "   2. Update nginx.conf with your domain name"
echo "   3. Set up SSL certificate (recommended)"
echo "   4. Configure your frontend to use: http://$SERVER_IP"
echo "   5. Ensure Ollama is running with your GPT model"
echo ""
print_warning "Don't forget to configure your .env file and restart the service!"
