from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

class EnhancementType(str, Enum):
    REASONING = "reasoning"
    LOGIC = "logic"
    CREATIVITY = "creativity"
    ANALYSIS = "analysis"
    PROBLEM_SOLVING = "problem_solving"

class TrainingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"

class ModelConfig(BaseModel):
    model_name: str = "gpt-oss-20b"
    max_length: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    learning_rate: float = 5e-5

class TrainingConfig(BaseModel):
    epochs: int = 3
    batch_size: int = 4
    gradient_accumulation_steps: int = 4
    warmup_steps: int = 100
    save_steps: int = 500
    eval_steps: int = 250
    logging_steps: int = 50
    max_grad_norm: float = 1.0
    use_lora: bool = True
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.1

class TrainingDataItem(BaseModel):
    input_prompt: str = Field(..., description="Original prompt")
    enhanced_prompt: str = Field(..., description="Enhanced version of the prompt")
    reasoning_steps: Optional[List[str]] = Field(None, description="Step-by-step reasoning")
    category: Optional[str] = Field(None, description="Category of the prompt")
    difficulty: Optional[int] = Field(None, description="Difficulty level (1-10)")

class TrainingRequest(BaseModel):
    training_data: List[TrainingDataItem] = Field(..., description="Training dataset")
    model_config: Optional[ModelConfig] = Field(default_factory=ModelConfig)
    training_config: Optional[TrainingConfig] = Field(default_factory=TrainingConfig)
    experiment_name: Optional[str] = Field(None, description="Name for this training experiment")
    description: Optional[str] = Field(None, description="Description of the training goal")

class TrainingResponse(BaseModel):
    training_id: str
    job_id: str
    status: str
    message: str
    created_at: datetime = Field(default_factory=datetime.now)

class TrainingStatusResponse(BaseModel):
    training_id: str
    status: TrainingStatus
    progress: float = Field(0.0, description="Training progress (0-100)")
    current_epoch: Optional[int] = None
    total_epochs: Optional[int] = None
    current_step: Optional[int] = None
    total_steps: Optional[int] = None
    loss: Optional[float] = None
    eval_loss: Optional[float] = None
    learning_rate: Optional[float] = None
    eta: Optional[str] = None  # Estimated time remaining
    logs: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime = Field(default_factory=datetime.now)

class PromptRequest(BaseModel):
    prompt: str = Field(..., description="Original prompt to enhance")
    enhancement_type: EnhancementType = Field(EnhancementType.REASONING, description="Type of enhancement")
    model_version: Optional[str] = Field(None, description="Specific model version to use")
    max_length: Optional[int] = Field(512, description="Maximum length of enhanced prompt")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature")

class PromptResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    enhancement_type: EnhancementType
    confidence_score: float = Field(0.0, description="Confidence in the enhancement (0-1)")
    reasoning_steps: Optional[List[str]] = None
    processing_time: Optional[float] = None
    model_version: Optional[str] = None

class DatasetInfo(BaseModel):
    dataset_id: str
    name: str
    description: Optional[str] = None
    filename: str
    size: int  # Number of training examples
    file_size: int  # File size in bytes
    format: str  # json, csv, etc.
    created_at: datetime
    updated_at: datetime

class ModelInfo(BaseModel):
    model_name: str
    model_path: str
    model_size: str
    parameters: int
    loaded: bool
    memory_usage: Optional[str] = None
    gpu_usage: Optional[str] = None
    last_updated: datetime

class EC2Status(BaseModel):
    instance_id: str
    instance_state: str
    instance_type: str
    public_ip: Optional[str] = None
    private_ip: Optional[str] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    gpu_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    uptime: Optional[str] = None
    model_loaded: bool = False
    last_checked: datetime = Field(default_factory=datetime.now)
