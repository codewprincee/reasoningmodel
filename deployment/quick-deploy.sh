#!/bin/bash

# Quick Deploy Script for AI Model Trainer
# This script automates the entire deployment process

set -e

echo "🚀 AI Model Trainer - Quick Deploy Script"
echo "========================================"

# Configuration
read -p "Enter your EC2 public IP: " EC2_IP
read -p "Enter your domain (or press Enter to use IP): " DOMAIN
read -p "Enter your EC2 private key path: " KEY_PATH

DOMAIN=${DOMAIN:-$EC2_IP}

echo ""
echo "📋 Deployment Configuration:"
echo "   • EC2 IP: $EC2_IP"
echo "   • Domain: $DOMAIN"
echo "   • Key Path: $KEY_PATH"
echo ""

read -p "Continue with deployment? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🔧 Step 1: Setting up EC2 instance..."

# Copy setup script to EC2
scp -i "$KEY_PATH" deployment/ec2-setup.sh ubuntu@$EC2_IP:/tmp/
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "chmod +x /tmp/ec2-setup.sh && /tmp/ec2-setup.sh"

echo ""
echo "📦 Step 2: Uploading application code..."

# Create application directory on EC2
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "mkdir -p /home/ubuntu/ai-model"

# Option A: Clone from Git (recommended)
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "
    cd /home/ubuntu && 
    rm -rf ai-model &&
    git clone https://github.com/codewprincee/reasoningmodel.git ai-model
"

# Option B: Upload local code (uncomment if needed)
# rsync -avz -e "ssh -i $KEY_PATH" \
#     --exclude="frontend/" \
#     --exclude=".git/" \
#     --exclude="__pycache__/" \
#     --exclude="*.pyc" \
#     --exclude=".env" \
#     ./ ubuntu@$EC2_IP:/home/ubuntu/ai-model/

echo ""
echo "⚙️  Step 3: Configuring environment..."

# Create production environment file
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "cd /home/ubuntu/ai-model && cat > .env << EOF
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama2
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=https://$DOMAIN
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
ALLOWED_ORIGINS=[\"https://$DOMAIN\", \"http://$DOMAIN\", \"http://$EC2_IP\"]
EOF"

echo ""
echo "🚀 Step 4: Running deployment..."

# Run deployment script
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "cd /home/ubuntu/ai-model && chmod +x deployment/deploy.sh && ./deployment/deploy.sh"

echo ""
echo "🌐 Step 5: Configuring domain..."

# Update nginx configuration with domain
if [[ "$DOMAIN" != "$EC2_IP" ]]; then
    ssh -i "$KEY_PATH" ubuntu@$EC2_IP "sudo sed -i 's/your-domain.com/$DOMAIN/g' /etc/nginx/sites-available/ai-model-trainer"
    ssh -i "$KEY_PATH" ubuntu@$EC2_IP "sudo systemctl restart nginx"
fi

echo ""
echo "🔍 Step 6: Verification..."

# Wait for services to start
sleep 10

# Test health endpoint
echo "Testing API health..."
if ssh -i "$KEY_PATH" ubuntu@$EC2_IP "curl -s http://localhost:8000/health > /dev/null"; then
    echo "✅ API is responding"
else
    echo "❌ API health check failed"
fi

# Test Ollama
echo "Testing Ollama connection..."
if ssh -i "$KEY_PATH" ubuntu@$EC2_IP "curl -s http://localhost:11434/api/version > /dev/null"; then
    echo "✅ Ollama is responding"
else
    echo "❌ Ollama health check failed"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   • Backend API: http://$DOMAIN (or http://$EC2_IP)"
echo "   • Health Check: http://$DOMAIN/health"
echo "   • API Documentation: http://$DOMAIN/docs"
echo ""
echo "🔧 Next Steps:"
echo "   1. Test the API: curl http://$DOMAIN/health"
echo "   2. Configure your frontend to use: http://$DOMAIN"
echo "   3. Set up SSL certificate (recommended): sudo certbot --nginx -d $DOMAIN"
echo "   4. Update your model in Ollama if needed: ollama pull your-model-name"
echo ""
echo "🔗 Useful Commands:"
echo "   • SSH to server: ssh -i $KEY_PATH ubuntu@$EC2_IP"
echo "   • View API logs: ssh -i $KEY_PATH ubuntu@$EC2_IP 'sudo journalctl -u ai-model-trainer -f'"
echo "   • Restart API: ssh -i $KEY_PATH ubuntu@$EC2_IP 'sudo systemctl restart ai-model-trainer'"
echo ""
echo "⚠️  Security Notes:"
echo "   • Consider setting up SSL certificate for HTTPS"
echo "   • Review firewall rules and security groups"
echo "   • Change default secret keys and passwords"
