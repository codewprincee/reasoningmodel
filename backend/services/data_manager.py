import os
import json
import uuid
import aiofiles
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import pandas as pd
from fastapi import UploadFile
import sqlalchemy
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, DateTime, Text

from models.schemas import DatasetInfo

Base = declarative_base()

class Dataset(Base):
    __tablename__ = "datasets"
    
    dataset_id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    filename = Column(String)
    file_path = Column(String)
    size = Column(Integer)  # Number of examples
    file_size = Column(Integer)  # File size in bytes
    format = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DataManager:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./training_data.db")
        self.engine = None
        self.async_session = None
        self.datasets_dir = "/tmp/datasets"
        
        # Create datasets directory
        Path(self.datasets_dir).mkdir(parents=True, exist_ok=True)

    async def initialize_db(self):
        """Initialize database connection and create tables"""
        self.engine = create_async_engine(self.database_url, echo=False)
        self.async_session = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        # Create tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def save_dataset(
        self, 
        file: UploadFile, 
        name: str, 
        description: Optional[str] = None
    ) -> str:
        """Save uploaded dataset file and metadata"""
        try:
            if not self.async_session:
                await self.initialize_db()
                
            dataset_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix.lower()
            
            # Determine file format
            format_map = {
                '.json': 'json',
                '.jsonl': 'jsonl',
                '.csv': 'csv',
                '.txt': 'text',
                '.tsv': 'tsv'
            }
            file_format = format_map.get(file_extension, 'unknown')
            
            # Save file
            file_path = Path(self.datasets_dir) / f"{dataset_id}{file_extension}"
            
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Get file stats
            file_size = len(content)
            
            # Count examples/rows
            example_count = await self._count_examples(file_path, file_format)
            
            # Save metadata to database
            async with self.async_session() as session:
                dataset = Dataset(
                    dataset_id=dataset_id,
                    name=name,
                    description=description,
                    filename=file.filename,
                    file_path=str(file_path),
                    size=example_count,
                    file_size=file_size,
                    format=file_format
                )
                
                session.add(dataset)
                await session.commit()
            
            return dataset_id
            
        except Exception as e:
            # Clean up file if database save fails
            if 'file_path' in locals() and Path(file_path).exists():
                Path(file_path).unlink()
            raise e

    async def list_datasets(self) -> List[DatasetInfo]:
        """List all uploaded datasets"""
        if not self.async_session:
            await self.initialize_db()
            
        try:
            async with self.async_session() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(Dataset).order_by(Dataset.created_at.desc())
                )
                datasets = result.scalars().all()
                
                return [
                    DatasetInfo(
                        dataset_id=dataset.dataset_id,
                        name=dataset.name,
                        description=dataset.description,
                        filename=dataset.filename,
                        size=dataset.size,
                        file_size=dataset.file_size,
                        format=dataset.format,
                        created_at=dataset.created_at,
                        updated_at=dataset.updated_at
                    )
                    for dataset in datasets
                ]
        except Exception as e:
            print(f"Database error in list_datasets: {e}")
            # Return empty list for development when database is not available
            return []

    async def get_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Get dataset details and sample data"""
        if not self.async_session:
            await self.initialize_db()
            
        try:
            async with self.async_session() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(Dataset).where(Dataset.dataset_id == dataset_id)
                )
                dataset = result.scalar_one_or_none()
                
                if not dataset:
                    raise Exception(f"Dataset {dataset_id} not found")
                
                # Load sample data
                sample_data = await self._load_sample_data(dataset.file_path, dataset.format)
                
                return {
                    "info": DatasetInfo(
                        dataset_id=dataset.dataset_id,
                        name=dataset.name,
                        description=dataset.description,
                        filename=dataset.filename,
                        size=dataset.size,
                        file_size=dataset.file_size,
                        format=dataset.format,
                        created_at=dataset.created_at,
                        updated_at=dataset.updated_at
                    ),
                    "sample_data": sample_data,
                    "schema": await self._infer_schema(dataset.file_path, dataset.format)
                }
        except Exception as e:
            print(f"Database error in get_dataset: {e}")
            raise e

    async def get_dataset_content(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Get the full content of a dataset"""
        if not self.async_session:
            await self.initialize_db()
            
        try:
            async with self.async_session() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(Dataset).where(Dataset.dataset_id == dataset_id)
                )
                dataset = result.scalar_one_or_none()
                
                if not dataset:
                    return []
                
                # Load full dataset content
                content = await self._load_full_data(dataset.file_path, dataset.format)
                return content
                
        except Exception as e:
            print(f"Database error in get_dataset_content: {e}")
            return []

    async def delete_dataset(self, dataset_id: str):
        """Delete a dataset and its file"""
        async with self.async_session() as session:
            result = await session.execute(
                sqlalchemy.select(Dataset).where(Dataset.dataset_id == dataset_id)
            )
            dataset = result.scalar_one_or_none()
            
            if not dataset:
                raise Exception(f"Dataset {dataset_id} not found")
            
            # Delete file
            file_path = Path(dataset.file_path)
            if file_path.exists():
                file_path.unlink()
            
            # Delete from database
            await session.delete(dataset)
            await session.commit()

    async def load_dataset_for_training(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Load full dataset for training"""
        async with self.async_session() as session:
            result = await session.execute(
                sqlalchemy.select(Dataset).where(Dataset.dataset_id == dataset_id)
            )
            dataset = result.scalar_one_or_none()
            
            if not dataset:
                raise Exception(f"Dataset {dataset_id} not found")
            
            return await self._load_full_data(dataset.file_path, dataset.format)

    async def _count_examples(self, file_path: Path, file_format: str) -> int:
        """Count number of examples in the dataset"""
        try:
            if file_format == 'json':
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    return len(data) if isinstance(data, list) else 1
            
            elif file_format == 'jsonl':
                count = 0
                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        if line.strip():
                            count += 1
                return count
            
            elif file_format in ['csv', 'tsv']:
                separator = ',' if file_format == 'csv' else '\t'
                df = pd.read_csv(file_path, sep=separator)
                return len(df)
            
            elif file_format == 'text':
                count = 0
                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        if line.strip():
                            count += 1
                return count
            
            else:
                return 0
                
        except Exception as e:
            print(f"Error counting examples: {e}")
            return 0

    async def _load_sample_data(self, file_path: str, file_format: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Load sample data from dataset"""
        try:
            file_path = Path(file_path)
            
            if file_format == 'json':
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    if isinstance(data, list):
                        return data[:limit]
                    else:
                        return [data]
            
            elif file_format == 'jsonl':
                samples = []
                async with aiofiles.open(file_path, 'r') as f:
                    count = 0
                    async for line in f:
                        if line.strip() and count < limit:
                            samples.append(json.loads(line))
                            count += 1
                        if count >= limit:
                            break
                return samples
            
            elif file_format in ['csv', 'tsv']:
                separator = ',' if file_format == 'csv' else '\t'
                df = pd.read_csv(file_path, sep=separator, nrows=limit)
                return df.to_dict('records')
            
            elif file_format == 'text':
                samples = []
                async with aiofiles.open(file_path, 'r') as f:
                    count = 0
                    async for line in f:
                        if line.strip() and count < limit:
                            samples.append({"text": line.strip()})
                            count += 1
                        if count >= limit:
                            break
                return samples
            
            else:
                return []
                
        except Exception as e:
            print(f"Error loading sample data: {e}")
            return []

    async def _load_full_data(self, file_path: str, file_format: str) -> List[Dict[str, Any]]:
        """Load full dataset"""
        try:
            file_path = Path(file_path)
            
            if file_format == 'json':
                async with aiofiles.open(file_path, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    return data if isinstance(data, list) else [data]
            
            elif file_format == 'jsonl':
                data = []
                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        if line.strip():
                            data.append(json.loads(line))
                return data
            
            elif file_format in ['csv', 'tsv']:
                separator = ',' if file_format == 'csv' else '\t'
                df = pd.read_csv(file_path, sep=separator)
                return df.to_dict('records')
            
            elif file_format == 'text':
                data = []
                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        if line.strip():
                            data.append({"text": line.strip()})
                return data
            
            else:
                return []
                
        except Exception as e:
            print(f"Error loading full data: {e}")
            return []

    async def _infer_schema(self, file_path: str, file_format: str) -> Dict[str, Any]:
        """Infer schema from dataset"""
        try:
            sample_data = await self._load_sample_data(file_path, file_format, limit=10)
            
            if not sample_data:
                return {}
            
            # Get all unique keys
            all_keys = set()
            for item in sample_data:
                if isinstance(item, dict):
                    all_keys.update(item.keys())
            
            # Infer types
            schema = {}
            for key in all_keys:
                values = [item.get(key) for item in sample_data if isinstance(item, dict) and key in item]
                
                if all(isinstance(v, str) for v in values):
                    schema[key] = "string"
                elif all(isinstance(v, int) for v in values):
                    schema[key] = "integer"
                elif all(isinstance(v, float) for v in values):
                    schema[key] = "float"
                elif all(isinstance(v, list) for v in values):
                    schema[key] = "array"
                elif all(isinstance(v, dict) for v in values):
                    schema[key] = "object"
                else:
                    schema[key] = "mixed"
            
            return schema
            
        except Exception as e:
            print(f"Error inferring schema: {e}")
            return {}
