import asyncio
import logging
import signal
import time
import uuid
from typing import Dict, Any, Optional, List, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import psutil
import threading

from .jobs import BaseJob, JobStatus
from .redis_queue import RedisQueue, RedisQueueConfig


class WorkerStatus(Enum):
    """Worker status"""
    IDLE = "idle"
    BUSY = "busy"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class WorkerConfig:
    """Worker configuration"""
    # Worker identity
    worker_id: str = field(default_factory=lambda: f"worker-{uuid.uuid4().hex[:8]}")
    worker_name: Optional[str] = None
    
    # Processing settings
    concurrency: int = 1
    max_jobs_per_worker: int = 100
    job_timeout: float = 300.0  # 5 minutes
    
    # Polling settings
    poll_interval: float = 1.0
    max_poll_interval: float = 30.0
    backoff_multiplier: float = 1.5
    
    # Health monitoring
    heartbeat_interval: float = 30.0
    max_memory_mb: int = 1024
    max_cpu_percent: float = 80.0
    
    # Error handling
    max_consecutive_failures: int = 5
    failure_backoff: float = 5.0
    
    # Graceful shutdown
    shutdown_timeout: float = 30.0
    
    # Job filtering
    job_types: Optional[List[str]] = None  # None means all types
    queue_names: Optional[List[str]] = None  # None means all queues


@dataclass
class WorkerStats:
    """Worker statistics"""
    worker_id: str
    status: WorkerStatus
    started_at: datetime
    
    # Job statistics
    jobs_processed: int = 0
    jobs_completed: int = 0
    jobs_failed: int = 0
    jobs_retried: int = 0
    
    # Performance statistics
    average_job_duration: float = 0.0
    total_processing_time: float = 0.0
    
    # Resource usage
    current_memory_mb: float = 0.0
    current_cpu_percent: float = 0.0
    peak_memory_mb: float = 0.0
    peak_cpu_percent: float = 0.0
    
    # Error statistics
    consecutive_failures: int = 0
    last_error: Optional[str] = None
    last_error_at: Optional[datetime] = None
    
    # Current job
    current_job_id: Optional[str] = None
    current_job_started_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'worker_id': self.worker_id,
            'status': self.status.value,
            'started_at': self.started_at.isoformat(),
            'jobs_processed': self.jobs_processed,
            'jobs_completed': self.jobs_completed,
            'jobs_failed': self.jobs_failed,
            'jobs_retried': self.jobs_retried,
            'average_job_duration': self.average_job_duration,
            'total_processing_time': self.total_processing_time,
            'current_memory_mb': self.current_memory_mb,
            'current_cpu_percent': self.current_cpu_percent,
            'peak_memory_mb': self.peak_memory_mb,
            'peak_cpu_percent': self.peak_cpu_percent,
            'consecutive_failures': self.consecutive_failures,
            'last_error': self.last_error,
            'last_error_at': self.last_error_at.isoformat() if self.last_error_at else None,
            'current_job_id': self.current_job_id,
            'current_job_started_at': self.current_job_started_at.isoformat() if self.current_job_started_at else None
        }


class Worker:
    """Async worker for processing jobs"""
    
    def __init__(self, config: WorkerConfig, queue: RedisQueue):
        self.config = config
        self.queue = queue
        self.logger = logging.getLogger(f"worker.{config.worker_id}")
        
        # Worker state
        self.stats = WorkerStats(
            worker_id=config.worker_id,
            status=WorkerStatus.IDLE,
            started_at=datetime.now(timezone.utc)
        )
        
        self._running = False
        self._paused = False
        self._shutdown_event = asyncio.Event()
        
        # Tasks
        self._worker_tasks: Set[asyncio.Task] = set()
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._monitor_task: Optional[asyncio.Task] = None
        
        # Job processing
        self._current_jobs: Dict[str, asyncio.Task] = {}
        self._job_semaphore = asyncio.Semaphore(config.concurrency)
        
        # Polling state
        self._current_poll_interval = config.poll_interval
        
        # Process info
        self._process = psutil.Process()
        
        # Event handlers
        self._job_handlers: Dict[str, Callable] = {}
        self._error_handlers: List[Callable] = []
    
    def add_job_handler(self, job_type: str, handler: Callable):
        """Add custom job handler"""
        self._job_handlers[job_type] = handler
    
    def add_error_handler(self, handler: Callable):
        """Add error handler"""
        self._error_handlers.append(handler)
    
    async def start(self):
        """Start the worker"""
        if self._running:
            return
        
        self._running = True
        self.stats.status = WorkerStatus.IDLE
        
        self.logger.info(f"Starting worker {self.config.worker_id}")
        
        # Setup signal handlers
        self._setup_signal_handlers()
        
        # Start background tasks
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        # Start worker tasks
        for i in range(self.config.concurrency):
            task = asyncio.create_task(self._worker_loop(f"worker-{i}"))
            self._worker_tasks.add(task)
        
        self.logger.info(f"Worker {self.config.worker_id} started with {self.config.concurrency} concurrent tasks")
    
    async def stop(self, timeout: Optional[float] = None):
        """Stop the worker gracefully"""
        if not self._running:
            return
        
        timeout = timeout or self.config.shutdown_timeout
        self.stats.status = WorkerStatus.STOPPING
        
        self.logger.info(f"Stopping worker {self.config.worker_id}")
        
        # Signal shutdown
        self._running = False
        self._shutdown_event.set()
        
        # Cancel current jobs
        for job_id, task in self._current_jobs.items():
            self.logger.info(f"Cancelling job {job_id}")
            task.cancel()
        
        # Wait for tasks to complete
        all_tasks = list(self._worker_tasks)
        if self._heartbeat_task:
            all_tasks.append(self._heartbeat_task)
        if self._monitor_task:
            all_tasks.append(self._monitor_task)
        
        try:
            await asyncio.wait_for(
                asyncio.gather(*all_tasks, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            self.logger.warning("Worker shutdown timeout, forcing stop")
            for task in all_tasks:
                task.cancel()
        
        self.stats.status = WorkerStatus.STOPPED
        self.logger.info(f"Worker {self.config.worker_id} stopped")
    
    def pause(self):
        """Pause the worker"""
        self._paused = True
        self.stats.status = WorkerStatus.PAUSED
        self.logger.info(f"Worker {self.config.worker_id} paused")
    
    def resume(self):
        """Resume the worker"""
        self._paused = False
        self.stats.status = WorkerStatus.IDLE
        self.logger.info(f"Worker {self.config.worker_id} resumed")
    
    def is_healthy(self) -> bool:
        """Check if worker is healthy"""
        # Check memory usage
        if self.stats.current_memory_mb > self.config.max_memory_mb:
            return False
        
        # Check CPU usage
        if self.stats.current_cpu_percent > self.config.max_cpu_percent:
            return False
        
        # Check consecutive failures
        if self.stats.consecutive_failures >= self.config.max_consecutive_failures:
            return False
        
        return True
    
    async def _worker_loop(self, worker_name: str):
        """Main worker loop"""
        self.logger.debug(f"Worker loop {worker_name} started")
        
        while self._running:
            try:
                # Check if paused
                if self._paused:
                    await asyncio.sleep(1)
                    continue
                
                # Check health
                if not self.is_healthy():
                    self.stats.status = WorkerStatus.ERROR
                    self.logger.error("Worker unhealthy, pausing")
                    await asyncio.sleep(self.config.failure_backoff)
                    continue
                
                # Get next job
                async with self._job_semaphore:
                    job = await self.queue.get_next_job(timeout=self._current_poll_interval)
                    
                    if job is None:
                        # No job available, increase poll interval
                        self._current_poll_interval = min(
                            self._current_poll_interval * self.config.backoff_multiplier,
                            self.config.max_poll_interval
                        )
                        continue
                    
                    # Reset poll interval
                    self._current_poll_interval = self.config.poll_interval
                    
                    # Process job
                    await self._process_job(job)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Worker loop error: {e}")
                self.stats.consecutive_failures += 1
                self.stats.last_error = str(e)
                self.stats.last_error_at = datetime.now(timezone.utc)
                
                # Call error handlers
                for handler in self._error_handlers:
                    try:
                        await handler(e)
                    except Exception as handler_error:
                        self.logger.error(f"Error handler failed: {handler_error}")
                
                await asyncio.sleep(self.config.failure_backoff)
        
        self.logger.debug(f"Worker loop {worker_name} stopped")
    
    async def _process_job(self, job: BaseJob):
        """Process a single job"""
        job_id = job.job_id
        start_time = time.time()
        
        self.logger.info(f"Processing job {job_id} ({job.job_type.value})")
        
        # Update stats
        self.stats.status = WorkerStatus.BUSY
        self.stats.current_job_id = job_id
        self.stats.current_job_started_at = datetime.now(timezone.utc)
        self.stats.jobs_processed += 1
        
        try:
            # Check if we have a custom handler
            handler = self._job_handlers.get(job.job_type.value)
            
            if handler:
                # Use custom handler
                result = await handler(job)
            else:
                # Use job's execute method
                job.on_start()
                result = await asyncio.wait_for(
                    job.execute(),
                    timeout=self.config.job_timeout
                )
            
            # Job completed successfully
            job.on_complete(result)
            await self.queue.complete_job(job_id, result)
            
            # Update stats
            self.stats.jobs_completed += 1
            self.stats.consecutive_failures = 0
            
            duration = time.time() - start_time
            self._update_duration_stats(duration)
            
            self.logger.info(f"Job {job_id} completed in {duration:.2f}s")
        
        except asyncio.TimeoutError:
            error_msg = f"Job timeout after {self.config.job_timeout}s"
            self.logger.error(f"Job {job_id} timed out")
            
            job.on_error(TimeoutError(error_msg))
            await self.queue.fail_job(job_id, error_msg)
            
            self.stats.jobs_failed += 1
            self.stats.consecutive_failures += 1
        
        except asyncio.CancelledError:
            self.logger.info(f"Job {job_id} cancelled")
            job.cancel()
            await self.queue.fail_job(job_id, "Job cancelled", retry=False)
        
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Job {job_id} failed: {error_msg}")
            
            job.on_error(e)
            await self.queue.fail_job(job_id, error_msg)
            
            self.stats.jobs_failed += 1
            self.stats.consecutive_failures += 1
            self.stats.last_error = error_msg
            self.stats.last_error_at = datetime.now(timezone.utc)
        
        finally:
            # Clean up
            self.stats.current_job_id = None
            self.stats.current_job_started_at = None
            self.stats.status = WorkerStatus.IDLE
    
    def _update_duration_stats(self, duration: float):
        """Update duration statistics"""
        self.stats.total_processing_time += duration
        
        # Update average duration
        if self.stats.jobs_completed > 0:
            self.stats.average_job_duration = (
                self.stats.total_processing_time / self.stats.jobs_completed
            )
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeats"""
        while self._running:
            try:
                await self._send_heartbeat()
                await asyncio.sleep(self.config.heartbeat_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(self.config.heartbeat_interval)
    
    async def _monitor_loop(self):
        """Monitor resource usage"""
        while self._running:
            try:
                self._update_resource_stats()
                await asyncio.sleep(5)  # Update every 5 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Monitor error: {e}")
                await asyncio.sleep(5)
    
    def _update_resource_stats(self):
        """Update resource usage statistics"""
        try:
            # Memory usage
            memory_info = self._process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            self.stats.current_memory_mb = memory_mb
            self.stats.peak_memory_mb = max(self.stats.peak_memory_mb, memory_mb)
            
            # CPU usage
            cpu_percent = self._process.cpu_percent()
            self.stats.current_cpu_percent = cpu_percent
            self.stats.peak_cpu_percent = max(self.stats.peak_cpu_percent, cpu_percent)
            
        except Exception as e:
            self.logger.error(f"Failed to update resource stats: {e}")
    
    async def _send_heartbeat(self):
        """Send heartbeat to queue"""
        if not self.queue.redis:
            return
        
        heartbeat_data = {
            'worker_id': self.config.worker_id,
            'status': self.stats.status.value,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'stats': self.stats.to_dict()
        }
        
        # Store heartbeat in Redis
        heartbeat_key = f"worker:heartbeat:{self.config.worker_id}"
        await self.queue.redis.hset(
            heartbeat_key,
            mapping={k: str(v) for k, v in heartbeat_data.items()}
        )
        await self.queue.redis.expire(heartbeat_key, int(self.config.heartbeat_interval * 2))
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, initiating shutdown")
            asyncio.create_task(self.stop())
        
        try:
            signal.signal(signal.SIGTERM, signal_handler)
            signal.signal(signal.SIGINT, signal_handler)
        except ValueError:
            # Signals not available (e.g., on Windows)
            pass
    
    def get_stats(self) -> WorkerStats:
        """Get current worker statistics"""
        return self.stats


class WorkerManager:
    """Manages multiple workers"""
    
    def __init__(self, queue_config: RedisQueueConfig):
        self.queue_config = queue_config
        self.workers: Dict[str, Worker] = {}
        self.logger = logging.getLogger("worker_manager")
    
    async def add_worker(self, config: WorkerConfig) -> Worker:
        """Add a new worker"""
        queue = RedisQueue(self.queue_config)
        await queue.connect()
        
        worker = Worker(config, queue)
        self.workers[config.worker_id] = worker
        
        await worker.start()
        self.logger.info(f"Added worker {config.worker_id}")
        
        return worker
    
    async def remove_worker(self, worker_id: str):
        """Remove a worker"""
        if worker_id in self.workers:
            worker = self.workers[worker_id]
            await worker.stop()
            await worker.queue.disconnect()
            del self.workers[worker_id]
            self.logger.info(f"Removed worker {worker_id}")
    
    async def stop_all(self):
        """Stop all workers"""
        tasks = []
        for worker in self.workers.values():
            tasks.append(worker.stop())
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Disconnect queues
        for worker in self.workers.values():
            await worker.queue.disconnect()
        
        self.workers.clear()
        self.logger.info("All workers stopped")
    
    def get_worker_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all workers"""
        return {
            worker_id: worker.get_stats().to_dict()
            for worker_id, worker in self.workers.items()
        }