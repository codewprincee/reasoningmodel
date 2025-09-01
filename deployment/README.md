# Deployment Scripts

This directory contains all the deployment scripts for the AI Model Trainer application.

## Scripts Overview

### 🚀 `clone-and-deploy.sh` (Recommended)
**One-command deployment for fresh EC2 instances**

```bash
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/clone-and-deploy.sh | bash
```

This script:
- Clones the repository from GitHub
- Runs the full deployment process
- Sets up everything needed for production

### ⚙️ `deploy.sh`
**Main deployment script**

```bash
./deployment/deploy.sh
```

This script:
- Sets up Python environment
- Installs dependencies
- Configures systemd service
- Sets up nginx
- Creates .env file with auto-detected Ollama model
- Validates all services

### 🛠️ `ec2-setup.sh`
**EC2 instance preparation**

```bash
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/ec2-setup.sh | bash
```

This script:
- Installs system dependencies
- Sets up Docker and Ollama
- Pulls AI models
- Configures firewall

### 🌐 `quick-deploy.sh`
**Interactive deployment from local machine**

```bash
./deployment/quick-deploy.sh
```

This script:
- Prompts for EC2 details
- Runs setup and deployment remotely
- Configures SSL if domain provided

## Configuration Files

### `nginx.conf`
- Nginx configuration template
- Proxy setup for FastAPI
- SSL configuration (commented)
- CORS headers

### `systemd.service`
- Systemd service configuration
- Security settings
- Auto-restart configuration

### `production.env`
- Environment template
- Production settings
- Security configurations

## Deployment Options

### Option 1: Fresh EC2 Instance (Easiest)
```bash
# SSH to EC2 and run one command:
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/clone-and-deploy.sh | bash
```

### Option 2: With EC2 Setup
```bash
# 1. Setup EC2 instance
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/ec2-setup.sh | bash

# 2. Clone and deploy
curl -fsSL https://raw.githubusercontent.com/codewprincee/reasoningmodel/main/deployment/clone-and-deploy.sh | bash
```

### Option 3: Interactive from Local Machine
```bash
# From your local machine
./deployment/quick-deploy.sh
```

### Option 4: Manual
```bash
# Clone repository
git clone https://github.com/codewprincee/reasoningmodel.git /home/ubuntu/ai-model
cd /home/ubuntu/ai-model

# Run deployment
./deployment/deploy.sh
```

## Post-Deployment

After deployment, your API will be available at:

- **Main API**: `http://your-server-ip/`
- **Health Check**: `http://your-server-ip/health`
- **API Documentation**: `http://your-server-ip/docs`

### Useful Commands

```bash
# Check service status
sudo systemctl status ai-model-trainer

# View logs
sudo journalctl -u ai-model-trainer -f

# Restart service
sudo systemctl restart ai-model-trainer

# Check Ollama models
ollama list

# Test API
curl http://localhost:8000/health
```

### SSL Setup (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Common Issues

1. **Ollama not responding**
   ```bash
   sudo systemctl restart ollama
   ollama list
   ```

2. **API service failed**
   ```bash
   sudo journalctl -u ai-model-trainer -n 50
   ```

3. **Nginx errors**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Permission errors**
   ```bash
   sudo chown -R ubuntu:ubuntu /home/ubuntu/ai-model
   ```

### Configuration

- **Environment file**: `/home/ubuntu/ai-model/backend/.env`
- **Nginx config**: `/etc/nginx/sites-available/ai-model-trainer`
- **Service file**: `/etc/systemd/system/ai-model-trainer.service`

For more detailed troubleshooting, see the main [DEPLOYMENT.md](../DEPLOYMENT.md) guide.
