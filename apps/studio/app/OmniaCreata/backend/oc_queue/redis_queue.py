import json
import time
import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
import redis.asyncio as redis
from redis.asyncio import Redis
import uuid

from .jobs import BaseJob, JobData, JobStatus, JobPriority, JobType, create_job


@dataclass
class RedisQueueConfig:
    """Redis queue configuration"""
    # Redis connection
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Queue settings
    queue_name: str = "default"
    max_queue_size: int = 10000
    default_job_timeout: float = 300.0  # 5 minutes
    
    # Retry settings
    default_max_retries: int = 3
    retry_delay_base: float = 1.0
    retry_delay_max: float = 60.0
    
    # Cleanup settings
    completed_job_ttl: int = 3600  # 1 hour
    failed_job_ttl: int = 86400  # 24 hours
    
    # Processing settings
    batch_size: int = 10
    poll_interval: float = 1.0
    
    # Monitoring
    enable_metrics: bool = True
    metrics_ttl: int = 86400  # 24 hours


class RedisQueue:
    """Redis-based job queue with BullMQ-like features"""
    
    def __init__(self, config: RedisQueueConfig):
        self.config = config
        self.redis: Optional[Redis] = None
        self.logger = logging.getLogger(__name__)
        
        # Queue keys
        self.queue_key = f"queue:{config.queue_name}"
        self.processing_key = f"processing:{config.queue_name}"
        self.completed_key = f"completed:{config.queue_name}"
        self.failed_key = f"failed:{config.queue_name}"
        self.delayed_key = f"delayed:{config.queue_name}"
        self.metrics_key = f"metrics:{config.queue_name}"
        
        # Priority queues
        self.priority_queues = {
            JobPriority.URGENT: f"{self.queue_key}:urgent",
            JobPriority.CRITICAL: f"{self.queue_key}:critical",
            JobPriority.HIGH: f"{self.queue_key}:high",
            JobPriority.NORMAL: f"{self.queue_key}:normal",
            JobPriority.LOW: f"{self.queue_key}:low"
        }
        
        self._running = False
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis = redis.from_url(
                self.config.redis_url,
                db=self.config.redis_db,
                password=self.config.redis_password,
                decode_responses=True
            )
            
            # Test connection
            await self.redis.ping()
            self.logger.info(f"Connected to Redis queue: {self.config.queue_name}")
            
            # Start cleanup task
            self._running = True
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            
        except Exception as e:
            self.logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        self._running = False
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        if self.redis:
            await self.redis.close()
            self.logger.info("Disconnected from Redis")
    
    async def add_job(
        self,
        job: BaseJob,
        delay: Optional[float] = None,
        priority: Optional[JobPriority] = None
    ) -> str:
        """Add a job to the queue"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        # Set priority if provided
        if priority:
            job.data.priority = priority
        
        # Serialize job
        job_data = job.to_dict()
        job_json = json.dumps(job_data)
        
        # Set queued timestamp
        job.data.queued_at = datetime.now(timezone.utc)
        job.data.status = JobStatus.QUEUED
        
        # Store job data
        job_key = f"job:{job.job_id}"
        await self.redis.hset(job_key, mapping={
            "data": job_json,
            "status": job.data.status.value,
            "priority": job.data.priority.value,
            "created_at": job.data.created_at.isoformat(),
            "queued_at": job.data.queued_at.isoformat()
        })
        
        # Add to appropriate queue
        if delay and delay > 0:
            # Add to delayed queue
            execute_at = time.time() + delay
            await self.redis.zadd(self.delayed_key, {job.job_id: execute_at})
        else:
            # Add to priority queue
            priority_queue = self.priority_queues[job.data.priority]
            await self.redis.lpush(priority_queue, job.job_id)
        
        # Update metrics
        if self.config.enable_metrics:
            await self._update_metrics("jobs_added", 1)
        
        self.logger.debug(f"Added job {job.job_id} to queue")
        return job.job_id
    
    async def get_next_job(self, timeout: float = 0) -> Optional[BaseJob]:
        """Get the next job from the queue"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        # Check delayed jobs first
        await self._process_delayed_jobs()
        
        # Try to get job from priority queues (highest priority first)
        job_id = None
        for priority in sorted(self.priority_queues.keys(), key=lambda x: x.value, reverse=True):
            queue_key = self.priority_queues[priority]
            
            if timeout > 0:
                result = await self.redis.brpop(queue_key, timeout=timeout)
                if result:
                    job_id = result[1]
                    break
            else:
                job_id = await self.redis.rpop(queue_key)
                if job_id:
                    break
        
        if not job_id:
            return None
        
        # Get job data
        job_key = f"job:{job_id}"
        job_data = await self.redis.hget(job_key, "data")
        
        if not job_data:
            self.logger.warning(f"Job {job_id} data not found")
            return None
        
        try:
            # Deserialize job
            job_dict = json.loads(job_data)
            job = self._deserialize_job(job_dict)
            
            # Move to processing
            await self.redis.hset(job_key, "status", JobStatus.PROCESSING.value)
            await self.redis.lpush(self.processing_key, job_id)
            
            # Update metrics
            if self.config.enable_metrics:
                await self._update_metrics("jobs_processed", 1)
            
            return job
            
        except Exception as e:
            self.logger.error(f"Failed to deserialize job {job_id}: {e}")
            await self._move_to_failed(job_id, str(e))
            return None
    
    async def complete_job(self, job_id: str, result: Dict[str, Any]):
        """Mark job as completed"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        job_key = f"job:{job_id}"
        
        # Update job status and result
        await self.redis.hset(job_key, mapping={
            "status": JobStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "result": json.dumps(result)
        })
        
        # Move from processing to completed
        await self.redis.lrem(self.processing_key, 1, job_id)
        await self.redis.lpush(self.completed_key, job_id)
        
        # Set TTL for completed job
        await self.redis.expire(job_key, self.config.completed_job_ttl)
        
        # Update metrics
        if self.config.enable_metrics:
            await self._update_metrics("jobs_completed", 1)
        
        self.logger.debug(f"Job {job_id} completed")
    
    async def fail_job(self, job_id: str, error: str, retry: bool = True):
        """Mark job as failed"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        job_key = f"job:{job_id}"
        
        # Get current job data
        job_data = await self.redis.hgetall(job_key)
        if not job_data:
            return
        
        # Check if job can be retried
        retry_count = int(job_data.get("retry_count", 0))
        max_retries = int(job_data.get("max_retries", self.config.default_max_retries))
        
        if retry and retry_count < max_retries:
            # Retry the job
            await self._retry_job(job_id, error, retry_count)
        else:
            # Move to failed
            await self._move_to_failed(job_id, error)
    
    async def _retry_job(self, job_id: str, error: str, retry_count: int):
        """Retry a failed job"""
        job_key = f"job:{job_id}"
        
        # Calculate retry delay
        delay = min(
            self.config.retry_delay_base * (2 ** retry_count),
            self.config.retry_delay_max
        )
        
        # Update job data
        await self.redis.hset(job_key, mapping={
            "status": JobStatus.RETRYING.value,
            "retry_count": retry_count + 1,
            "last_error": error,
            "retry_at": (datetime.now(timezone.utc) + timedelta(seconds=delay)).isoformat()
        })
        
        # Remove from processing
        await self.redis.lrem(self.processing_key, 1, job_id)
        
        # Add to delayed queue
        execute_at = time.time() + delay
        await self.redis.zadd(self.delayed_key, {job_id: execute_at})
        
        # Update metrics
        if self.config.enable_metrics:
            await self._update_metrics("jobs_retried", 1)
        
        self.logger.info(f"Job {job_id} scheduled for retry in {delay}s")
    
    async def _move_to_failed(self, job_id: str, error: str):
        """Move job to failed queue"""
        job_key = f"job:{job_id}"
        
        # Update job status
        await self.redis.hset(job_key, mapping={
            "status": JobStatus.FAILED.value,
            "failed_at": datetime.now(timezone.utc).isoformat(),
            "error": error
        })
        
        # Move from processing to failed
        await self.redis.lrem(self.processing_key, 1, job_id)
        await self.redis.lpush(self.failed_key, job_id)
        
        # Set TTL for failed job
        await self.redis.expire(job_key, self.config.failed_job_ttl)
        
        # Update metrics
        if self.config.enable_metrics:
            await self._update_metrics("jobs_failed", 1)
        
        self.logger.warning(f"Job {job_id} failed: {error}")
    
    async def _process_delayed_jobs(self):
        """Process delayed jobs that are ready"""
        if not self.redis:
            return
        
        current_time = time.time()
        
        # Get jobs ready for execution
        ready_jobs = await self.redis.zrangebyscore(
            self.delayed_key, 0, current_time, withscores=False
        )
        
        for job_id in ready_jobs:
            # Remove from delayed queue
            await self.redis.zrem(self.delayed_key, job_id)
            
            # Get job priority
            job_key = f"job:{job_id}"
            priority_value = await self.redis.hget(job_key, "priority")
            
            if priority_value:
                try:
                    priority = JobPriority(int(priority_value))
                    priority_queue = self.priority_queues[priority]
                    await self.redis.lpush(priority_queue, job_id)
                except (ValueError, KeyError):
                    # Default to normal priority
                    await self.redis.lpush(self.priority_queues[JobPriority.NORMAL], job_id)
    
    async def _update_metrics(self, metric: str, value: Union[int, float]):
        """Update queue metrics"""
        if not self.redis:
            return
        
        timestamp = int(time.time())
        metric_key = f"{self.metrics_key}:{metric}"
        
        # Increment counter
        await self.redis.hincrby(self.metrics_key, metric, value)
        
        # Store timestamped metric
        await self.redis.zadd(metric_key, {timestamp: value})
        await self.redis.expire(metric_key, self.config.metrics_ttl)
    
    async def _cleanup_loop(self):
        """Background cleanup task"""
        while self._running:
            try:
                await self._cleanup_expired_jobs()
                await self._cleanup_stale_processing_jobs()
                await asyncio.sleep(60)  # Run cleanup every minute
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_expired_jobs(self):
        """Clean up expired jobs"""
        if not self.redis:
            return
        
        # Clean up old metrics
        cutoff_time = time.time() - self.config.metrics_ttl
        
        # Get all metric keys
        metric_keys = await self.redis.keys(f"{self.metrics_key}:*")
        for key in metric_keys:
            await self.redis.zremrangebyscore(key, 0, cutoff_time)
    
    async def _cleanup_stale_processing_jobs(self):
        """Clean up stale processing jobs"""
        if not self.redis:
            return
        
        # Get all processing jobs
        processing_jobs = await self.redis.lrange(self.processing_key, 0, -1)
        
        for job_id in processing_jobs:
            job_key = f"job:{job_id}"
            job_data = await self.redis.hgetall(job_key)
            
            if not job_data:
                # Job data missing, remove from processing
                await self.redis.lrem(self.processing_key, 1, job_id)
                continue
            
            # Check if job has timed out
            started_at_str = job_data.get("started_at")
            timeout = float(job_data.get("timeout", self.config.default_job_timeout))
            
            if started_at_str:
                try:
                    started_at = datetime.fromisoformat(started_at_str)
                    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
                    
                    if elapsed > timeout:
                        await self._move_to_failed(job_id, "Job timeout")
                except ValueError:
                    pass
    
    def _deserialize_job(self, job_dict: Dict[str, Any]) -> BaseJob:
        """Deserialize job from dictionary"""
        job_data = JobData.from_dict(job_dict['data'])
        
        # Create job instance
        job_type = job_data.job_type
        job = create_job(job_type, job_data.input_data)
        job.data = job_data
        
        return job
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        stats = {}
        
        # Queue lengths
        for priority, queue_key in self.priority_queues.items():
            length = await self.redis.llen(queue_key)
            stats[f"queue_{priority.name.lower()}"] = length
        
        stats["processing"] = await self.redis.llen(self.processing_key)
        stats["completed"] = await self.redis.llen(self.completed_key)
        stats["failed"] = await self.redis.llen(self.failed_key)
        stats["delayed"] = await self.redis.zcard(self.delayed_key)
        
        # Metrics
        if self.config.enable_metrics:
            metrics = await self.redis.hgetall(self.metrics_key)
            stats["metrics"] = {k: int(v) for k, v in metrics.items()}
        
        return stats
    
    async def clear_queue(self, include_processing: bool = False):
        """Clear all jobs from queue"""
        if not self.redis:
            raise RuntimeError("Redis not connected")
        
        # Clear priority queues
        for queue_key in self.priority_queues.values():
            await self.redis.delete(queue_key)
        
        # Clear other queues
        await self.redis.delete(self.delayed_key)
        await self.redis.delete(self.completed_key)
        await self.redis.delete(self.failed_key)
        
        if include_processing:
            await self.redis.delete(self.processing_key)
        
        # Clear metrics
        await self.redis.delete(self.metrics_key)
        
        self.logger.info("Queue cleared")