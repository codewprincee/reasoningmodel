import asyncio
import os
import json
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import psutil

from models.schemas import EC2Status, ModelInfo

logger = logging.getLogger(__name__)

class EC2Connector:
    def __init__(self):
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "gpt-oss-20b")
        self.environment = os.getenv("ENVIRONMENT", "production")
        
        self.client = httpx.AsyncClient(timeout=30.0)
        
        logger.info(f"Initialized EC2Connector with Ollama host: {self.ollama_host}")

    async def connect(self) -> bool:
        """Test connection to Ollama service"""
        # In development mode, skip actual connection
        if self.environment == "development":
            logger.info("Development mode: Skipping Ollama connection")
            return True
            
        try:
            response = await self.client.get(f"{self.ollama_host}/api/version")
            if response.status_code == 200:
                logger.info(f"Successfully connected to Ollama at {self.ollama_host}")
                return True
            else:
                logger.error(f"Ollama responded with status {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            return False

    async def disconnect(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def call_ollama_api(self, endpoint: str, data: Dict[str, Any] = None, stream: bool = False) -> Dict[str, Any]:
        """Make API call to Ollama"""
        try:
            url = f"{self.ollama_host}/api/{endpoint}"
            
            if data:
                if stream:
                    # For streaming requests
                    response = await self.client.post(url, json=data)
                    if response.status_code == 200:
                        return {
                            "success": True,
                            "stream": self._stream_response(response)
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"HTTP {response.status_code}: {response.text}"
                        }
                else:
                    response = await self.client.post(url, json=data)
            else:
                response = await self.client.get(url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _stream_response(self, response):
        """Stream response from Ollama API"""
        try:
            async for line in response.aiter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        yield chunk
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            yield {"error": str(e), "done": True}

    async def test_connection(self) -> bool:
        """Test connection to Ollama service"""
        return await self.connect()

    async def check_status(self) -> EC2Status:
        """Get system status and Ollama metrics"""
        try:
            # Get system metrics
            metrics = await self._get_system_metrics()
            
            # Check Ollama status
            ollama_status = await self.connect()
            
            return EC2Status(
                instance_id='local' if self.environment == 'development' else 'ec2-instance',
                instance_state='running' if ollama_status else 'stopped',
                instance_type='g4dn.xlarge',  # Default assumption for GPU instance
                public_ip=None,  # Will be set by nginx
                private_ip='127.0.0.1',
                **metrics,
                model_loaded=await self._check_model_loaded()
            )
                
        except Exception as e:
            logger.error(f"Failed to get system status: {e}")
            return EC2Status(
                instance_id='error',
                instance_state='error',
                instance_type='unknown',
                public_ip=None,
                private_ip=None,
                model_loaded=False
            )

    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics using psutil"""
        try:
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage = (disk.used / disk.total) * 100
            
            # Try to get GPU usage (if nvidia-ml-py is available)
            gpu_usage = None
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu_usage = gpus[0].load * 100
            except ImportError:
                # GPU monitoring not available
                pass
            
            # Uptime (simplified)
            uptime = "Available"
            
            return {
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "gpu_usage": gpu_usage,
                "disk_usage": disk_usage,
                "uptime": uptime
            }
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {
                "cpu_usage": 0.0,
                "memory_usage": 0.0,
                "gpu_usage": None,
                "disk_usage": 0.0,
                "uptime": "Unknown"
            }

    async def get_model_info(self) -> ModelInfo:
        """Get information about the loaded model from Ollama"""
        try:
            # In development mode, return mock model info
            if self.environment == "development":
                return ModelInfo(
                    model_name=f"{self.ollama_model} (Mock)",
                    model_path=f"mock://localhost/{self.ollama_model}",
                    model_size="Mock (40.2GB)",
                    parameters=20000000000,  # 20B parameters
                    loaded=True,
                    memory_usage="Mock (16.8GB)",
                    last_updated=datetime.now()
                )
            
            # Get list of models from Ollama
            result = await self.call_ollama_api("tags")
            
            if not result["success"]:
                raise Exception(f"Failed to get model info: {result.get('error', 'Unknown error')}")
            
            models = result["data"].get("models", [])
            target_model = None
            
            # Find our target model
            for model in models:
                if self.ollama_model in model.get("name", ""):
                    target_model = model
                    break
            
            if not target_model:
                # Model not found, but we can still provide basic info
                return ModelInfo(
                    model_name=self.ollama_model,
                    model_path=f"ollama://{self.ollama_model}",
                    model_size="Unknown",
                    parameters=20000000000,  # 20B parameters (estimated)
                    loaded=False,
                    memory_usage=None,
                    last_updated=datetime.now()
                )
            
            # Parse model size
            model_size = target_model.get("size", 0)
            size_gb = model_size / (1024**3) if model_size else 0
            
            return ModelInfo(
                model_name=target_model.get("name", self.ollama_model),
                model_path=f"ollama://{target_model.get('name', self.ollama_model)}",
                model_size=f"{size_gb:.1f}GB" if size_gb > 0 else "Unknown",
                parameters=20000000000,  # 20B parameters
                loaded=True,  # If it's in the list, it's available
                memory_usage=f"{size_gb:.1f}GB" if size_gb > 0 else None,
                last_updated=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            raise

    async def _check_model_loaded(self) -> bool:
        """Check if the target model is loaded in Ollama"""
        try:
            # In development mode, always return True
            if self.environment == "development":
                return True
                
            result = await self.call_ollama_api("tags")
            if result["success"]:
                models = result["data"].get("models", [])
                return any(self.ollama_model in model.get("name", "") for model in models)
            return False
        except Exception as e:
            logger.error(f"Failed to check model status: {e}")
            return False

    async def generate_response(self, prompt: str, model: str = None) -> Dict[str, Any]:
        """Generate response using Ollama"""
        try:
            model_name = model or self.ollama_model
            
            # In development mode, return mock response
            if self.environment == "development":
                mock_response = f"[MOCK RESPONSE] Enhanced version of: {prompt[:100]}{'...' if len(prompt) > 100 else ''}"
                return {
                    "success": True,
                    "response": mock_response,
                    "model": model_name
                }
            
            data = {
                "model": model_name,
                "prompt": prompt,
                "stream": False
            }
            
            result = await self.call_ollama_api("generate", data)
            
            if result["success"]:
                return {
                    "success": True,
                    "response": result["data"].get("response", ""),
                    "model": model_name
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Generation failed")
                }
                
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def generate_response_stream(self, prompt: str, model: str = None):
        """Stream response generation using Ollama model"""
        try:
            model_name = model or self.ollama_model
            
            # In development mode, simulate streaming
            if self.environment == "development":
                mock_response = f"Enhanced version of your prompt:\n\n{prompt}\n\nThis is a more detailed and structured approach to your original question, designed to encourage deeper thinking and better reasoning."
                words = mock_response.split()
                
                for i, word in enumerate(words):
                    yield {
                        "success": True,
                        "content": word + " ",
                        "progress": (i + 1) / len(words) * 100,
                        "model": model_name,
                        "done": i == len(words) - 1
                    }
                    await asyncio.sleep(0.05)  # Simulate typing speed
                return
            
            # Prepare request data for streaming
            request_data = {
                "model": model_name,
                "prompt": prompt,
                "stream": True
            }
            
            # Stream from Ollama API
            result = await self.call_ollama_api("generate", request_data, stream=True)
            
            if result["success"]:
                async for chunk in result["stream"]:
                    yield {
                        "success": True,
                        "content": chunk.get("response", ""),
                        "done": chunk.get("done", False),
                        "model": model_name
                    }
            else:
                yield {
                    "success": False,
                    "error": result.get("error", "Streaming failed"),
                    "done": True
                }
                        
        except Exception as e:
            logger.error(f"Failed to stream response: {e}")
            yield {
                "success": False,
                "error": str(e),
                "done": True
            }

    async def execute_command(self, command: str) -> Dict[str, Any]:
        """Execute a command on the EC2 instance via SSH"""
        # In development mode, return mock command execution
        if self.environment == "development":
            logger.info(f"Development mode: Mock executing command: {command[:50]}...")
            return {
                "success": True,
                "stdout": "Mock command output",
                "stderr": ""
            }
        
        # In production, this would use paramiko or similar to SSH to EC2
        # For now, return a mock response
        logger.warning("SSH command execution not implemented for production mode")
        return {
            "success": False,
            "stdout": "",
            "stderr": "SSH command execution not implemented"
        }
