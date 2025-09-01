#!/bin/bash

# AI Model Trainer - Clone and Deploy Script
# This script clones the repository and runs the deployment
set -e

echo "🚀 AI Model Trainer - Clone and Deploy Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[CLONE]${NC} $1"
}

# Configuration
REPO_URL="https://github.com/codewprincee/reasoningmodel.git"
APP_DIR="/home/ubuntu/ai-model"
REPO_BRANCH="main"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as ubuntu user."
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_status "Installing git..."
    sudo apt update
    sudo apt install -y git
fi

print_info "Repository: $REPO_URL"
print_info "Target directory: $APP_DIR"
print_info "Branch: $REPO_BRANCH"
echo ""

# Remove existing directory if it exists
if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR already exists."
    read -p "Do you want to remove it and start fresh? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        print_status "Removing existing directory..."
        rm -rf "$APP_DIR"
    else
        print_error "Deployment cancelled. Please remove or backup the existing directory."
        exit 1
    fi
fi

# Create the parent directory
print_status "Creating application directory..."
mkdir -p "$(dirname "$APP_DIR")"

# Clone the repository
print_info "Cloning repository from GitHub..."
git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"

if [ $? -eq 0 ]; then
    print_status "✅ Repository cloned successfully"
else
    print_error "❌ Failed to clone repository"
    exit 1
fi

# Change to the project directory
cd "$APP_DIR"

# Display project information
print_info "Repository information:"
echo "  • Current branch: $(git branch --show-current)"
echo "  • Last commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
echo "  • Remote URL: $(git remote get-url origin)"
echo ""

# Check if deploy script exists
if [ ! -f "deployment/deploy.sh" ]; then
    print_error "❌ deployment/deploy.sh not found in the repository"
    print_error "Please check if the repository structure is correct"
    exit 1
fi

# Make deploy script executable
chmod +x deployment/deploy.sh

print_status "🚀 Starting deployment process..."
echo ""

# Ask for confirmation before deploying
read -p "Ready to deploy? This will set up the AI Model Trainer on this EC2 instance. Continue? (y/N): " deploy_confirm

if [[ $deploy_confirm == [yY] || $deploy_confirm == [yY][eE][sS] ]]; then
    print_status "Starting deployment..."
    echo ""
    
    # Run the deployment script
    ./deployment/deploy.sh
    
    if [ $? -eq 0 ]; then
        echo ""
        print_status "🎉 Clone and deploy completed successfully!"
        echo ""
        echo "📋 Quick Access:"
        SERVER_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "your-server-ip")
        echo "   • API Health: http://$SERVER_IP/health"
        echo "   • API Docs: http://$SERVER_IP/docs"
        echo "   • Main API: http://$SERVER_IP/"
        echo ""
        echo "🔧 Management Commands:"
        echo "   • View logs: sudo journalctl -u ai-model-trainer -f"
        echo "   • Restart service: sudo systemctl restart ai-model-trainer"
        echo "   • Check status: sudo systemctl status ai-model-trainer"
        echo ""
    else
        print_error "❌ Deployment failed"
        print_error "Check the logs above for more details"
        exit 1
    fi
else
    print_info "Deployment cancelled. Repository has been cloned to: $APP_DIR"
    print_info "You can run the deployment later with: cd $APP_DIR && ./deployment/deploy.sh"
fi
