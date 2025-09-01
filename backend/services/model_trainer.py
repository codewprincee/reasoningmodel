import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

from models.schemas import (
    TrainingDataItem, TrainingStatusResponse, TrainingStatus, 
    EnhancementType, ModelConfiguration, TrainingConfig
)
from services.ec2_connector import EC2Connector

logger = logging.getLogger(__name__)

class ModelTrainer:
    def __init__(self, ec2_connector: EC2Connector):
        self.ec2_connector = ec2_connector
        self.training_jobs = {}  # In-memory store for training jobs
        self.models_dir = "/tmp/trained_models"  # Local cache for trained models
        self.environment = os.getenv("ENVIRONMENT", "production")
        
        # Create models directory if it doesn't exist
        Path(self.models_dir).mkdir(parents=True, exist_ok=True)

    async def start_training(
        self, 
        training_id: str, 
        training_data: List[TrainingDataItem],
        model_config: ModelConfiguration,
        training_config: TrainingConfig
    ) -> str:
        """Start a new training job"""
        try:
            job_id = str(uuid.uuid4())
            
            # In development mode, create a mock training job
            if self.environment == "development":
                logger.info(f"Development mode: Creating mock training job for {training_id}")
                
                # Store job information with mock data
                self.training_jobs[training_id] = {
                    "job_id": job_id,
                    "pid": "mock_pid",
                    "status": TrainingStatus.RUNNING,
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                    "progress": 0.0,
                    "current_epoch": 0,
                    "total_epochs": training_config.epochs,
                    "logs": [
                        "Mock training started...",
                        f"Training {len(training_data)} examples",
                        "Initializing model..."
                    ]
                }
                
                # Start mock monitoring task
                asyncio.create_task(self._monitor_mock_training(training_id))
                
                return job_id
            
            # Prepare training data for transfer to EC2
            training_file = await self._prepare_training_data(training_data, training_id)
            
            # Create training script
            training_script = await self._create_training_script(
                training_id, model_config, training_config
            )
            
            # Transfer files to EC2
            await self._transfer_files_to_ec2(training_file, training_script, training_id)
            
            # Start training job on EC2
            command = f"""
            cd /tmp/training_{training_id} && 
            nohup python train_reasoning_enhancer.py > training.log 2>&1 & 
            echo $!
            """
            
            result = await self.ec2_connector.execute_command(command)
            
            if result["success"]:
                pid = result["stdout"].strip()
                
                # Store job information
                self.training_jobs[training_id] = {
                    "job_id": job_id,
                    "pid": pid,
                    "status": TrainingStatus.RUNNING,
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                    "progress": 0.0,
                    "current_epoch": 0,
                    "total_epochs": training_config.epochs,
                    "logs": []
                }
                
                # Start monitoring task
                asyncio.create_task(self._monitor_training(training_id))
                
                return job_id
            else:
                raise Exception(f"Failed to start training: {result['stderr']}")
                
        except Exception as e:
            logger.error(f"Failed to start training: {e}")
            raise

    async def get_training_status(self, training_id: str) -> TrainingStatusResponse:
        """Get current training status"""
        if training_id not in self.training_jobs:
            raise Exception(f"Training job {training_id} not found")
        
        job_info = self.training_jobs[training_id]
        
        # Get latest logs from EC2
        await self._update_training_logs(training_id)
        
        return TrainingStatusResponse(
            training_id=training_id,
            status=job_info["status"],
            progress=job_info["progress"],
            current_epoch=job_info.get("current_epoch"),
            total_epochs=job_info.get("total_epochs"),
            current_step=job_info.get("current_step"),
            total_steps=job_info.get("total_steps"),
            loss=job_info.get("loss"),
            eval_loss=job_info.get("eval_loss"),
            learning_rate=job_info.get("learning_rate"),
            eta=job_info.get("eta"),
            logs=job_info.get("logs", []),
            created_at=job_info["created_at"],
            updated_at=job_info["updated_at"]
        )

    async def stop_training(self, training_id: str):
        """Stop a training job"""
        if training_id not in self.training_jobs:
            raise Exception(f"Training job {training_id} not found")
        
        job_info = self.training_jobs[training_id]
        pid = job_info.get("pid")
        
        if pid:
            # Kill the training process
            result = await self.ec2_connector.execute_command(f"kill {pid}")
            
            if result["success"]:
                job_info["status"] = TrainingStatus.STOPPED
                job_info["updated_at"] = datetime.now()
            else:
                logger.warning(f"Failed to kill process {pid}: {result['stderr']}")

    async def enhance_prompt(
        self, 
        prompt: str, 
        enhancement_type: EnhancementType,
        model_version: Optional[str] = None
    ) -> str:
        """Enhance a prompt using Ollama"""
        try:
            # Create enhancement prompt based on type
            enhancement_prefix = self._get_enhancement_prefix(enhancement_type)
            enhanced_prompt = f"{enhancement_prefix}\n\nOriginal prompt: {prompt}\n\nEnhanced version:"
            
            # Use Ollama to generate enhanced prompt
            result = await self.ec2_connector.generate_response(
                enhanced_prompt, 
                model_version
            )
            
            if result["success"]:
                response = result["response"].strip()
                # Clean up the response to get just the enhanced prompt
                if "Enhanced version:" in response:
                    response = response.split("Enhanced version:")[-1].strip()
                return response or await self._basic_enhancement(prompt, enhancement_type)
            else:
                logger.warning(f"Ollama generation failed: {result.get('error')}")
                return await self._basic_enhancement(prompt, enhancement_type)
                
        except Exception as e:
            logger.error(f"Failed to enhance prompt: {e}")
            return await self._basic_enhancement(prompt, enhancement_type)

    async def enhance_prompt_stream(
        self, 
        prompt: str, 
        enhancement_type: EnhancementType,
        model_version: Optional[str] = None
    ):
        """Stream enhanced prompt generation in real-time"""
        try:
            # Send analysis phase
            yield {
                "type": "status",
                "message": f"Analyzing prompt for {enhancement_type.value} enhancement...",
                "progress": 10
            }
            
            await asyncio.sleep(0.5)  # Simulate processing
            
            # Create enhancement prompt based on type
            enhancement_prefix = self._get_enhancement_prefix(enhancement_type)
            enhanced_prompt_request = f"{enhancement_prefix}\n\nOriginal prompt: {prompt}\n\nEnhanced version:"
            
            yield {
                "type": "status", 
                "message": "Connecting to AI model...",
                "progress": 20
            }
            
            # Try to use Ollama for streaming generation
            try:
                async for chunk in self.ec2_connector.generate_response_stream(
                    enhanced_prompt_request, 
                    model_version
                ):
                    if chunk.get("success"):
                        yield {
                            "type": "content",
                            "content": chunk.get("content", ""),
                            "progress": min(90, 20 + (chunk.get("progress", 0) * 0.7))
                        }
                    else:
                        # If streaming fails, fall back to basic enhancement
                        break
                else:
                    # Streaming completed successfully
                    yield {
                        "type": "status",
                        "message": "Enhancement completed!",
                        "progress": 100
                    }
                    return
            
            except Exception as e:
                logger.warning(f"Streaming failed, using fallback: {e}")
            
            # Fallback to basic enhancement with simulated streaming
            yield {
                "type": "status",
                "message": "Using fallback enhancement method...",
                "progress": 30
            }
            
            enhanced_result = await self._basic_enhancement(prompt, enhancement_type)
            
            # Simulate streaming the fallback response
            words = enhanced_result.split()
            chunk_size = max(1, len(words) // 10)  # Send in 10 chunks
            
            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                chunk_content = " ".join(chunk_words)
                if i > 0:
                    chunk_content = " " + chunk_content
                
                progress = 30 + ((i / len(words)) * 60)
                
                yield {
                    "type": "content",
                    "content": chunk_content,
                    "progress": min(90, progress)
                }
                
                await asyncio.sleep(0.1)  # Small delay for streaming effect
            
            # Final status
            yield {
                "type": "status",
                "message": "Enhancement completed!",
                "progress": 100
            }
                
        except Exception as e:
            logger.error(f"Failed to stream enhance prompt: {e}")
            yield {
                "type": "error",
                "message": f"Enhancement failed: {str(e)}",
                "progress": 0
            }

    async def list_model_versions(self) -> List[str]:
        """List available trained model versions"""
        try:
            # In development mode, return mock versions
            if self.environment == "development":
                return [
                    "base",
                    "reasoning_enhancer_v1.0_mock",
                    "reasoning_enhancer_v1.1_mock",
                    "reasoning_enhancer_latest_mock"
                ]
            
            # Check for models on EC2
            result = await self.ec2_connector.execute_command(
                "ls -1 /opt/models/trained/ 2>/dev/null | grep -E '^reasoning_enhancer_' || echo ''"
            )
            
            versions = []
            if result["success"] and result["stdout"].strip():
                versions = result["stdout"].strip().split('\n')
            
            # Add base model
            versions.insert(0, "base")
            
            return versions
            
        except Exception as e:
            logger.error(f"Failed to list model versions: {e}")
            return ["base"]

    async def _prepare_training_data(
        self, 
        training_data: List[TrainingDataItem], 
        training_id: str
    ) -> str:
        """Prepare training data in the format expected by the training script"""
        
        formatted_data = []
        for item in training_data:
            formatted_item = {
                "instruction": "Enhance the following prompt for better reasoning:",
                "input": item.input_prompt,
                "output": item.enhanced_prompt,
                "reasoning_steps": item.reasoning_steps or [],
                "category": item.category,
                "difficulty": item.difficulty
            }
            formatted_data.append(formatted_item)
        
        # Save to local file
        training_file = f"/tmp/training_data_{training_id}.json"
        with open(training_file, 'w') as f:
            json.dump(formatted_data, f, indent=2)
        
        return training_file

    async def _create_training_script(
        self, 
        training_id: str, 
        model_config: ModelConfiguration, 
        training_config: TrainingConfig
    ) -> str:
        """Create the training script for the reasoning enhancer"""
        
        script_content = f'''#!/usr/bin/env python3
import os
import sys
import json
import torch
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, 
    TrainingArguments, Trainer, DataCollatorForLanguageModeling
)
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_training_data():
    with open('training_data_{training_id}.json', 'r') as f:
        data = json.load(f)
    return data

def format_prompt(instruction, input_text, output_text=None):
    if output_text:
        return f"### Instruction:\\n{{instruction}}\\n\\n### Input:\\n{{input_text}}\\n\\n### Response:\\n{{output_text}}"
    else:
        return f"### Instruction:\\n{{instruction}}\\n\\n### Input:\\n{{input_text}}\\n\\n### Response:\\n"

def tokenize_data(examples, tokenizer):
    formatted_prompts = []
    for i in range(len(examples['instruction'])):
        prompt = format_prompt(
            examples['instruction'][i],
            examples['input'][i], 
            examples['output'][i]
        )
        formatted_prompts.append(prompt)
    
    tokenized = tokenizer(
        formatted_prompts,
        truncation=True,
        padding=False,
        max_length={model_config.max_length},
        return_tensors=None,
    )
    
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

def main():
    # Load model and tokenizer
    model_name = "{model_config.model_name}"
    model_path = "/opt/models/gpt-oss-20b"  # Adjust path as needed
    
    logger.info(f"Loading model from {{model_path}}")
    
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Prepare model for training
    model = prepare_model_for_kbit_training(model)
    
    # Setup LoRA
    if {str(training_config.use_lora).lower()}:
        lora_config = LoraConfig(
            r={training_config.lora_r},
            lora_alpha={training_config.lora_alpha},
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            lora_dropout={training_config.lora_dropout},
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora_config)
    
    # Load and prepare data
    training_data = load_training_data()
    dataset = Dataset.from_list(training_data)
    
    # Tokenize dataset
    tokenized_dataset = dataset.map(
        lambda examples: tokenize_data(examples, tokenizer),
        batched=True,
        remove_columns=dataset.column_names
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir="./results",
        overwrite_output_dir=True,
        num_train_epochs={training_config.epochs},
        per_device_train_batch_size={training_config.batch_size},
        gradient_accumulation_steps={training_config.gradient_accumulation_steps},
        warmup_steps={training_config.warmup_steps},
        max_grad_norm={training_config.max_grad_norm},
        learning_rate={training_config.learning_rate},
        fp16=True,
        logging_steps={training_config.logging_steps},
        save_steps={training_config.save_steps},
        eval_steps={training_config.eval_steps},
        evaluation_strategy="steps",
        save_strategy="steps",
        load_best_model_at_end=True,
        ddp_find_unused_parameters=False,
        report_to=None,  # Disable wandb
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    # Split dataset for evaluation
    train_size = int(0.9 * len(tokenized_dataset))
    eval_size = len(tokenized_dataset) - train_size
    train_dataset, eval_dataset = torch.utils.data.random_split(
        tokenized_dataset, [train_size, eval_size]
    )
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=data_collator,
    )
    
    # Start training
    logger.info("Starting training...")
    trainer.train()
    
    # Save final model
    model_save_path = f"/opt/models/trained/reasoning_enhancer_{training_id}"
    trainer.save_model(model_save_path)
    tokenizer.save_pretrained(model_save_path)
    
    logger.info(f"Training completed. Model saved to {{model_save_path}}")

if __name__ == "__main__":
    main()
'''
        
        script_file = f"/tmp/train_reasoning_enhancer_{training_id}.py"
        with open(script_file, 'w') as f:
            f.write(script_content)
        
        return script_file

    async def _transfer_files_to_ec2(
        self, 
        training_file: str, 
        script_file: str, 
        training_id: str
    ):
        """Transfer training files to EC2"""
        
        # Create directory on EC2
        await self.ec2_connector.execute_command(f"mkdir -p /tmp/training_{training_id}")
        
        # For now, we'll transfer files using scp-like commands
        # In a real implementation, you'd use paramiko's SFTP client
        
        # Read files and transfer content via SSH
        with open(training_file, 'r') as f:
            training_data = f.read()
        
        with open(script_file, 'r') as f:
            script_data = f.read()
        
        # Write training data to EC2
        await self.ec2_connector.execute_command(
            f"cat > /tmp/training_{training_id}/training_data_{training_id}.json << 'EOF'\n{training_data}\nEOF"
        )
        
        # Write training script to EC2
        await self.ec2_connector.execute_command(
            f"cat > /tmp/training_{training_id}/train_reasoning_enhancer.py << 'EOF'\n{script_data}\nEOF"
        )
        
        # Make script executable
        await self.ec2_connector.execute_command(
            f"chmod +x /tmp/training_{training_id}/train_reasoning_enhancer.py"
        )

    async def _monitor_training(self, training_id: str):
        """Monitor training progress in background"""
        while training_id in self.training_jobs:
            job_info = self.training_jobs[training_id]
            
            if job_info["status"] in [TrainingStatus.COMPLETED, TrainingStatus.FAILED, TrainingStatus.STOPPED]:
                break
            
            try:
                # Check if process is still running
                pid = job_info.get("pid")
                if pid:
                    result = await self.ec2_connector.execute_command(f"ps -p {pid}")
                    if not result["success"]:
                        # Process is dead
                        job_info["status"] = TrainingStatus.FAILED
                        job_info["updated_at"] = datetime.now()
                        break
                
                # Update logs and progress
                await self._update_training_logs(training_id)
                
                # Wait before next check
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Error monitoring training {training_id}: {e}")
                await asyncio.sleep(60)

    async def _update_training_logs(self, training_id: str):
        """Update training logs and progress from EC2"""
        try:
            job_info = self.training_jobs[training_id]
            
            # Get latest logs
            result = await self.ec2_connector.execute_command(
                f"tail -20 /tmp/training_{training_id}/training.log 2>/dev/null || echo ''"
            )
            
            if result["success"] and result["stdout"].strip():
                logs = result["stdout"].strip().split('\n')
                job_info["logs"] = logs[-20:]  # Keep last 20 lines
                
                # Parse progress from logs (this would depend on your training script output)
                for log in logs:
                    if "Epoch" in log and "/" in log:
                        try:
                            # Extract epoch info
                            parts = log.split()
                            epoch_part = [p for p in parts if "Epoch" in p][0]
                            current_epoch = int(epoch_part.split('/')[0].split()[-1])
                            job_info["current_epoch"] = current_epoch
                            job_info["progress"] = (current_epoch / job_info["total_epochs"]) * 100
                        except:
                            pass
                    
                    if "loss" in log.lower():
                        try:
                            # Extract loss value (simplified parsing)
                            import re
                            loss_match = re.search(r'loss[:\s]*([0-9\.]+)', log.lower())
                            if loss_match:
                                job_info["loss"] = float(loss_match.group(1))
                        except:
                            pass
                
                job_info["updated_at"] = datetime.now()
                
                # Check for completion
                if any("Training completed" in log for log in logs):
                    job_info["status"] = TrainingStatus.COMPLETED
                    job_info["progress"] = 100.0
                
        except Exception as e:
            logger.error(f"Failed to update training logs: {e}")

    def _get_enhancement_prefix(self, enhancement_type: EnhancementType) -> str:
        """Get enhancement instruction for Ollama"""
        instructions = {
            EnhancementType.REASONING: """You are an expert at enhancing prompts for better reasoning. Transform the given prompt to encourage step-by-step logical thinking and detailed analysis. Add reasoning cues and structure that will help produce more thoughtful, comprehensive responses.""",
            
            EnhancementType.LOGIC: """You are an expert at enhancing prompts for logical analysis. Transform the given prompt to encourage systematic, analytical thinking. Add logical frameworks and structured approaches that will help produce more coherent and well-reasoned responses.""",
            
            EnhancementType.CREATIVITY: """You are an expert at enhancing prompts for creative thinking. Transform the given prompt to encourage innovative, diverse perspectives and creative problem-solving. Add elements that promote out-of-the-box thinking and novel approaches.""",
            
            EnhancementType.ANALYSIS: """You are an expert at enhancing prompts for systematic analysis. Transform the given prompt to encourage thorough examination, breaking down complex topics into components, and providing structured analytical frameworks.""",
            
            EnhancementType.PROBLEM_SOLVING: """You are an expert at enhancing prompts for effective problem-solving. Transform the given prompt to encourage structured problem-solving approaches, clear problem definition, solution generation, and evaluation of alternatives."""
        }
        
        return instructions.get(enhancement_type, "You are an expert at enhancing prompts. Transform the given prompt to encourage better thinking and more comprehensive responses.")

    async def _basic_enhancement(self, prompt: str, enhancement_type: EnhancementType) -> str:
        """Basic fallback enhancement when Ollama is not available"""
        
        enhancements = {
            EnhancementType.REASONING: {
                "prefix": "Let's approach this problem with systematic reasoning.",
                "instructions": ["Break down the problem into smaller components", "Consider the logical flow of steps", "Examine potential assumptions", "Think through implications and consequences"],
                "template": "Let's think step by step about this problem:\n\n{prompt}\n\nTo solve this effectively:\n1. First, I'll identify the key components\n2. Then, I'll analyze the relationships between them\n3. Next, I'll consider multiple solution approaches\n4. Finally, I'll evaluate and choose the best approach\n\nLet me work through this systematically:"
            },
            EnhancementType.LOGIC: {
                "prefix": "Let's apply logical reasoning and structured analysis.",
                "instructions": ["Use deductive and inductive reasoning", "Identify premises and conclusions", "Check for logical consistency", "Evaluate evidence critically"],
                "template": "Let's apply logical reasoning to analyze:\n\n{prompt}\n\nLogical analysis framework:\n1. Identify the core question or hypothesis\n2. Examine the available evidence or premises\n3. Apply logical reasoning to draw conclusions\n4. Test the validity of conclusions\n5. Consider alternative logical pathways\n\nLet me systematically work through this:"
            },
            EnhancementType.CREATIVITY: {
                "prefix": "Let's explore this with creative and innovative thinking.",
                "instructions": ["Consider unconventional approaches", "Think beyond traditional boundaries", "Explore multiple perspectives", "Generate novel solutions"],
                "template": "Let's approach this creatively and consider multiple perspectives:\n\n{prompt}\n\nCreative exploration strategy:\n1. Brainstorm diverse approaches without initial judgment\n2. Consider analogies from different domains\n3. Explore 'what if' scenarios\n4. Combine ideas in unexpected ways\n5. Challenge assumptions and conventional thinking\n\nLet me explore this creatively:"
            },
            EnhancementType.ANALYSIS: {
                "prefix": "Let's conduct a thorough and systematic analysis.",
                "instructions": ["Break down into constituent parts", "Examine relationships and patterns", "Identify key factors and variables", "Synthesize findings"],
                "template": "Let's systematically analyze the following:\n\n{prompt}\n\nAnalytical framework:\n1. Define the scope and boundaries of analysis\n2. Break down into key components\n3. Examine relationships and interdependencies\n4. Identify patterns, trends, and anomalies\n5. Synthesize findings into actionable insights\n\nLet me conduct a thorough analysis:"
            },
            EnhancementType.PROBLEM_SOLVING: {
                "prefix": "Let's use structured problem-solving methodology.",
                "instructions": ["Define the problem clearly", "Generate multiple solutions", "Evaluate alternatives", "Implement and monitor results"],
                "template": "Let's break down this problem into manageable steps:\n\n{prompt}\n\nProblem-solving methodology:\n1. Problem definition: Clearly articulate what needs to be solved\n2. Root cause analysis: Identify underlying causes\n3. Solution generation: Brainstorm multiple approaches\n4. Evaluation: Assess pros, cons, and feasibility\n5. Implementation planning: Create actionable steps\n6. Success metrics: Define how to measure progress\n\nLet me work through this systematically:"
            }
        }
        
        enhancement = enhancements.get(enhancement_type, {
            "template": "Let's think carefully about: {prompt}\n\nI'll approach this thoughtfully and provide a comprehensive response."
        })
        
        return enhancement["template"].format(prompt=prompt)

    async def _monitor_mock_training(self, training_id: str):
        """Monitor mock training progress in development mode"""
        try:
            job_info = self.training_jobs[training_id]
            total_epochs = job_info["total_epochs"]
            
            # Simulate training progress over time
            for epoch in range(1, total_epochs + 1):
                if training_id not in self.training_jobs:
                    break
                    
                if job_info["status"] != TrainingStatus.RUNNING:
                    break
                
                # Update progress
                progress = (epoch / total_epochs) * 100
                loss = max(0.1, 2.5 - (epoch * 0.2))  # Simulate decreasing loss
                
                job_info.update({
                    "current_epoch": epoch,
                    "progress": progress,
                    "loss": round(loss, 4),
                    "eval_loss": round(loss * 0.9, 4),
                    "learning_rate": 0.0001,
                    "updated_at": datetime.now()
                })
                
                # Add realistic training logs
                job_info["logs"].extend([
                    f"Epoch {epoch}/{total_epochs} - Loss: {loss:.4f}",
                    f"Progress: {progress:.1f}% - ETA: {total_epochs - epoch} epochs remaining"
                ])
                
                # Keep only last 20 log lines
                job_info["logs"] = job_info["logs"][-20:]
                
                # Wait before next epoch (simulating training time)
                await asyncio.sleep(5)  # 5 seconds per epoch for demo
            
            # Mark as completed
            if training_id in self.training_jobs and job_info["status"] == TrainingStatus.RUNNING:
                job_info.update({
                    "status": TrainingStatus.COMPLETED,
                    "progress": 100.0,
                    "updated_at": datetime.now()
                })
                job_info["logs"].append("Mock training completed successfully!")
                logger.info(f"Mock training {training_id} completed")
                
        except Exception as e:
            logger.error(f"Error in mock training monitor: {e}")
            if training_id in self.training_jobs:
                self.training_jobs[training_id]["status"] = TrainingStatus.FAILED
