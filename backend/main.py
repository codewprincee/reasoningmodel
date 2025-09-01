from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import os
from dotenv import load_dotenv
import httpx
import uuid
from datetime import datetime

from services.ec2_connector import EC2Connector
from services.model_trainer import ModelTrainer
from services.data_manager import DataManager
from models.schemas import (
    TrainingRequest, 
    TrainingResponse, 
    PromptRequest, 
    PromptResponse,
    TrainingStatus,
    DatasetInfo,
    ModelConfiguration,
    TrainingConfig
)

load_dotenv()

app = FastAPI(
    title="AI Model Trainer API",
    description="API for training reasoning prompt enhancer with GPT OSS 20B",
    version="1.0.0"
)

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
if isinstance(allowed_origins, str):
    try:
        import json
        allowed_origins = json.loads(allowed_origins)
    except:
        allowed_origins = [allowed_origins]

# Always include localhost for development
development_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://apipdoll.hyperbrainlabs.com"
]

if isinstance(allowed_origins, list):
    allowed_origins.extend(development_origins)
else:
    allowed_origins = development_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize services
ec2_connector = EC2Connector()
model_trainer = ModelTrainer(ec2_connector)
data_manager = DataManager()

# Global initialization flag
_initialized = False

async def initialize_services():
    """Initialize all services on startup"""
    global _initialized
    if not _initialized:
        try:
            await data_manager.initialize_db()
            _initialized = True
            print("Services initialized successfully")
        except Exception as e:
            print(f"Failed to initialize services: {e}")
            # Continue anyway for development

@app.get("/")
async def root():
    return {"message": "AI Model Trainer API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    ec2_status = await ec2_connector.check_status()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ec2_connection": ec2_status,
        "services": {
            "database": "connected",
            "model_trainer": "ready"
        }
    }

@app.post("/training/start", response_model=TrainingResponse)
async def start_training(request: TrainingRequest):
    """Start training the reasoning prompt enhancer"""
    try:
        training_id = str(uuid.uuid4())
        
        # Validate training data
        if not request.training_data:
            raise HTTPException(status_code=400, detail="Training data is required")
        
        # Start training job
        job_id = await model_trainer.start_training(
            training_id=training_id,
            training_data=request.training_data,
            model_config=request.model_configuration or ModelConfiguration(),
            training_config=request.training_configuration or TrainingConfig()
        )
        
        return TrainingResponse(
            training_id=training_id,
            job_id=job_id,
            status="started",
            message="Training job started successfully",
            created_at=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training/status/{training_id}", response_model=TrainingStatus)
async def get_training_status(training_id: str):
    """Get training job status"""
    try:
        status = await model_trainer.get_training_status(training_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/training/stop/{training_id}")
async def stop_training(training_id: str):
    """Stop a training job"""
    try:
        await model_trainer.stop_training(training_id)
        return {"message": f"Training job {training_id} stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prompt/enhance", response_model=PromptResponse)
async def enhance_prompt(request: PromptRequest):
    """Enhance a prompt using the trained model"""
    try:
        await initialize_services()
        enhanced_prompt = await model_trainer.enhance_prompt(
            prompt=request.prompt,
            enhancement_type=request.enhancement_type,
            model_version=request.model_version
        )
        
        return PromptResponse(
            original_prompt=request.prompt,
            enhanced_prompt=enhanced_prompt,
            enhancement_type=request.enhancement_type,
            confidence_score=0.95  # This would come from the model
        )
    
    except Exception as e:
        print(f"Error in enhance_prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prompt/enhance/stream")
async def enhance_prompt_stream(request: PromptRequest):
    """Stream enhanced prompt generation in real-time"""
    try:
        await initialize_services()
        
        async def generate_stream():
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting enhancement...', 'progress': 0})}\n\n"
            
            # Stream the enhancement process
            async for chunk in model_trainer.enhance_prompt_stream(
                prompt=request.prompt,
                enhancement_type=request.enhancement_type,
                model_version=request.model_version
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "http://localhost:3000",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "text/event-stream",
            }
        )
    
    except Exception as e:
        print(f"Error in enhance_prompt_stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/data/upload")
async def upload_training_data(
    file: UploadFile = File(...),
    dataset_name: str = Form(...),
    description: Optional[str] = Form(None)
):
    """Upload training data file"""
    try:
        await initialize_services()
        dataset_id = await data_manager.save_dataset(
            file=file,
            name=dataset_name,
            description=description
        )
        
        return {
            "dataset_id": dataset_id,
            "message": "Dataset uploaded successfully",
            "filename": file.filename
        }
    
    except Exception as e:
        print(f"Error in upload_training_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/data/datasets", response_model=List[DatasetInfo])
async def list_datasets():
    """List all uploaded datasets"""
    try:
        await initialize_services()
        datasets = await data_manager.list_datasets()
        return datasets
    except Exception as e:
        print(f"Error in list_datasets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/data/dataset/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get dataset details and sample data"""
    try:
        await initialize_services()
        dataset = await data_manager.get_dataset(dataset_id)
        return dataset
    except Exception as e:
        print(f"Error in get_dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    """Get information about the current model"""
    try:
        model_info = await ec2_connector.get_model_info()
        return model_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/versions")
async def list_model_versions():
    """List available model versions"""
    try:
        versions = await model_trainer.list_model_versions()
        return {"versions": versions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True
    )
