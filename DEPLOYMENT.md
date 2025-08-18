# Deployment Guide - AI Model Trainer with Ollama

This guide covers deploying the AI Model Trainer backend to EC2 with Ollama and nginx.

## Prerequisites

- EC2 instance (recommended: g4dn.xlarge or larger for GPU support)
- Ubuntu 20.04 or later
- Domain name (optional, but recommended)
- SSL certificate (optional, for HTTPS)

## Step 1: Prepare Your EC2 Instance

### 1.1 Launch EC2 Instance

1. Launch a g4dn.xlarge instance (or larger) with Ubuntu 20.04
2. Configure security group:
   - SSH (22): Your IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0 (if using SSL)
   - Custom TCP (11434): 127.0.0.1/32 (Ollama API, localhost only)

### 1.2 Connect to Your Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 1.3 Run EC2 Setup Script

```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/ai-model/main/deployment/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

This script will:
- Install system dependencies
- Install Docker and Ollama
- Configure GPU support (if available)
- Pull your GPT model
- Set up firewall rules

## Step 2: Deploy Your Application

### 2.1 Upload Your Code

Option A: Clone from Git
```bash
cd /home/ubuntu
git clone https://github.com/your-username/ai-model.git
cd ai-model
```

Option B: Upload via SCP
```bash
# From your local machine
scp -i your-key.pem -r . ubuntu@your-ec2-ip:/home/ubuntu/ai-model/
```

### 2.2 Configure Environment

```bash
cd /home/ubuntu/ai-model
cp deployment/production.env .env

# Edit the configuration
nano .env
```

Update these key settings:
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=your-gpt-model-name
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=https://your-domain.com
SECRET_KEY=generate-a-strong-secret-key
```

### 2.3 Run Deployment Script

```bash
./deployment/deploy.sh
```

This script will:
- Set up Python virtual environment
- Install dependencies
- Configure systemd service
- Set up nginx
- Start all services

## Step 3: Configure Nginx (Optional: Custom Domain)

### 3.1 Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/ai-model-trainer
```

Update the `server_name` directive:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # ... rest of configuration
}
```

### 3.2 Restart Nginx

```bash
sudo systemctl restart nginx
```

## Step 4: Set Up SSL (Recommended)

### 4.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 4.2 Get SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 4.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 5: Configure Your Model in Ollama

### 5.1 Check Available Models

```bash
ollama list
```

### 5.2 Pull Your Specific Model

```bash
# Replace with your actual model name
ollama pull gpt-oss-20b
```

### 5.3 Test the Model

```bash
ollama run gpt-oss-20b "Hello, how are you?"
```

### 5.4 Update Environment

Update your `.env` file with the correct model name:
```env
OLLAMA_MODEL=gpt-oss-20b
```

Restart the service:
```bash
sudo systemctl restart ai-model-trainer
```

## Step 6: Configure Frontend

### 6.1 Update Frontend Configuration

In your frontend project, update the API URL:

```typescript
// src/services/apiService.ts
const API_BASE_URL = 'https://your-domain.com' || 'http://your-ec2-ip';
```

### 6.2 Build and Deploy Frontend

You can deploy the frontend to:
- Vercel, Netlify, or similar platform
- S3 + CloudFront
- Same EC2 instance (serve via nginx)

For same EC2 deployment:
```bash
# Build frontend locally
npm run build

# Upload build to EC2
scp -i your-key.pem -r build/* ubuntu@your-ec2-ip:/var/www/html/
```

## Step 7: Verify Deployment

### 7.1 Check Service Status

```bash
sudo systemctl status ai-model-trainer
sudo systemctl status nginx
sudo systemctl status ollama
```

### 7.2 Check Logs

```bash
# API logs
sudo journalctl -u ai-model-trainer -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ollama logs
sudo journalctl -u ollama -f
```

### 7.3 Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# External access
curl https://your-domain.com/health
```

### 7.4 Test Ollama Integration

```bash
# Test from the API
curl -X POST https://your-domain.com/prompt/enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Solve 2+2", "enhancement_type": "reasoning"}'
```

## Monitoring and Maintenance

### Performance Monitoring

```bash
# System resources
htop

# GPU usage (if available)
nvidia-smi

# Ollama status
ollama ps
```

### Log Rotation

Nginx and systemd handle log rotation automatically, but you can configure custom rotation:

```bash
sudo nano /etc/logrotate.d/ai-model-trainer
```

### Backup

Regular backup of:
- Training data database: `/home/ubuntu/ai-model/backend/training_data.db`
- Configuration files: `/home/ubuntu/ai-model/.env`
- Uploaded datasets: `/home/ubuntu/ai-model/uploads/`

### Updates

To update the application:

```bash
cd /home/ubuntu/ai-model
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ai-model-trainer
```

## Troubleshooting

### Common Issues

1. **Ollama not responding**
   ```bash
   sudo systemctl restart ollama
   curl http://localhost:11434/api/version
   ```

2. **API service failed to start**
   ```bash
   sudo journalctl -u ai-model-trainer -n 50
   # Check .env configuration
   ```

3. **Nginx permission errors**
   ```bash
   sudo chown -R www-data:www-data /var/www/html/
   sudo systemctl restart nginx
   ```

4. **Model not found**
   ```bash
   ollama list
   ollama pull your-model-name
   # Update OLLAMA_MODEL in .env
   ```

5. **High memory usage**
   - Consider using a smaller model
   - Increase instance size
   - Monitor with `htop` and `nvidia-smi`

### Performance Optimization

1. **Enable nginx caching**
2. **Use nginx gzip compression** (already configured)
3. **Optimize Ollama model parameters**
4. **Set up CloudFront for static assets**
5. **Use Redis for session storage** (if needed)

## Security Considerations

1. **Regular updates**: Keep system and packages updated
2. **Firewall**: Only open necessary ports
3. **SSL/TLS**: Always use HTTPS in production
4. **API rate limiting**: Consider implementing rate limiting
5. **Authentication**: Add authentication if handling sensitive data
6. **Backup encryption**: Encrypt sensitive backups
7. **Monitor logs**: Set up log monitoring and alerts

For additional support, check the main README.md or create an issue in the repository.
