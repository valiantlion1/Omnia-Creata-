import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import json
from croniter import croniter

from .jobs import BaseJob, JobType, JobPriority, JobData
from .redis_queue import RedisQueue, RedisQueueConfig


class ScheduleType(Enum):
    """Schedule types"""
    ONCE = "once"  # Run once at specified time
    INTERVAL = "interval"  # Run every X seconds/minutes/hours
    CRON = "cron"  # Cron expression
    DAILY = "daily"  # Run daily at specified time
    WEEKLY = "weekly"  # Run weekly on specified day/time
    MONTHLY = "monthly"  # Run monthly on specified day/time


@dataclass
class ScheduleConfig:
    """Schedule configuration"""
    schedule_id: str = field(default_factory=lambda: f"schedule-{uuid.uuid4().hex[:8]}")
    name: Optional[str] = None
    description: Optional[str] = None
    
    # Schedule settings
    schedule_type: ScheduleType = ScheduleType.ONCE
    schedule_value: str = ""  # Cron expression, interval seconds, or time string
    timezone: str = "UTC"
    
    # Job settings
    job_type: JobType = JobType.IMAGE_GENERATION
    job_data: Dict[str, Any] = field(default_factory=dict)
    job_priority: JobPriority = JobPriority.NORMAL
    job_timeout: Optional[float] = None
    
    # Schedule control
    enabled: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_runs: Optional[int] = None
    
    # Error handling
    retry_on_failure: bool = True
    max_retries: int = 3
    retry_delay: float = 60.0
    
    # Metadata
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'schedule_id': self.schedule_id,
            'name': self.name,
            'description': self.description,
            'schedule_type': self.schedule_type.value,
            'schedule_value': self.schedule_value,
            'timezone': self.timezone,
            'job_type': self.job_type.value,
            'job_data': self.job_data,
            'job_priority': self.job_priority.value,
            'job_timeout': self.job_timeout,
            'enabled': self.enabled,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'max_runs': self.max_runs,
            'retry_on_failure': self.retry_on_failure,
            'max_retries': self.max_retries,
            'retry_delay': self.retry_delay,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by,
            'tags': self.tags
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ScheduleConfig':
        """Create from dictionary"""
        # Convert string enums back to enum objects
        data['schedule_type'] = ScheduleType(data['schedule_type'])
        data['job_type'] = JobType(data['job_type'])
        data['job_priority'] = JobPriority(data['job_priority'])
        
        # Convert ISO strings back to datetime objects
        if data.get('start_date'):
            data['start_date'] = datetime.fromisoformat(data['start_date'])
        if data.get('end_date'):
            data['end_date'] = datetime.fromisoformat(data['end_date'])
        if data.get('created_at'):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        
        return cls(**data)


@dataclass
class ScheduleRun:
    """Represents a scheduled job run"""
    run_id: str = field(default_factory=lambda: f"run-{uuid.uuid4().hex[:8]}")
    schedule_id: str = ""
    job_id: Optional[str] = None
    
    # Timing
    scheduled_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Status
    status: str = "pending"  # pending, running, completed, failed, skipped
    result: Optional[Any] = None
    error: Optional[str] = None
    
    # Retry info
    attempt: int = 1
    max_attempts: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'run_id': self.run_id,
            'schedule_id': self.schedule_id,
            'job_id': self.job_id,
            'scheduled_at': self.scheduled_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status,
            'result': self.result,
            'error': self.error,
            'attempt': self.attempt,
            'max_attempts': self.max_attempts
        }


@dataclass
class SchedulerConfig:
    """Scheduler configuration"""
    # Scheduler identity
    scheduler_id: str = field(default_factory=lambda: f"scheduler-{uuid.uuid4().hex[:8]}")
    
    # Timing settings
    check_interval: float = 60.0  # Check for due schedules every minute
    max_concurrent_jobs: int = 10
    
    # History settings
    keep_run_history_days: int = 30
    max_runs_per_schedule: int = 1000
    
    # Error handling
    max_scheduler_failures: int = 5
    failure_backoff: float = 300.0  # 5 minutes
    
    # Performance
    batch_size: int = 100  # Process schedules in batches


class JobScheduler:
    """Job scheduler for managing scheduled tasks"""
    
    def __init__(self, config: SchedulerConfig, queue: RedisQueue):
        self.config = config
        self.queue = queue
        self.logger = logging.getLogger(f"scheduler.{config.scheduler_id}")
        
        # Scheduler state
        self._running = False
        self._schedules: Dict[str, ScheduleConfig] = {}
        self._schedule_tasks: Dict[str, asyncio.Task] = {}
        
        # Main scheduler task
        self._scheduler_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        
        # Statistics
        self._stats = {
            'schedules_processed': 0,
            'jobs_scheduled': 0,
            'jobs_completed': 0,
            'jobs_failed': 0,
            'last_run': None,
            'consecutive_failures': 0
        }
    
    async def start(self):
        """Start the scheduler"""
        if self._running:
            return
        
        self._running = True
        self.logger.info(f"Starting scheduler {self.config.scheduler_id}")
        
        # Load existing schedules
        await self._load_schedules()
        
        # Start main scheduler loop
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        self.logger.info(f"Scheduler {self.config.scheduler_id} started")
    
    async def stop(self):
        """Stop the scheduler"""
        if not self._running:
            return
        
        self._running = False
        self.logger.info(f"Stopping scheduler {self.config.scheduler_id}")
        
        # Cancel all tasks
        tasks = []
        if self._scheduler_task:
            tasks.append(self._scheduler_task)
        if self._cleanup_task:
            tasks.append(self._cleanup_task)
        
        for task in self._schedule_tasks.values():
            tasks.append(task)
        
        for task in tasks:
            task.cancel()
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        self.logger.info(f"Scheduler {self.config.scheduler_id} stopped")
    
    async def add_schedule(self, schedule: ScheduleConfig) -> str:
        """Add a new schedule"""
        # Validate schedule
        self._validate_schedule(schedule)
        
        # Store in memory and Redis
        self._schedules[schedule.schedule_id] = schedule
        await self._save_schedule(schedule)
        
        self.logger.info(f"Added schedule {schedule.schedule_id} ({schedule.name})")
        return schedule.schedule_id
    
    async def remove_schedule(self, schedule_id: str):
        """Remove a schedule"""
        if schedule_id in self._schedules:
            del self._schedules[schedule_id]
            
            # Cancel any running task
            if schedule_id in self._schedule_tasks:
                self._schedule_tasks[schedule_id].cancel()
                del self._schedule_tasks[schedule_id]
            
            # Remove from Redis
            await self._delete_schedule(schedule_id)
            
            self.logger.info(f"Removed schedule {schedule_id}")
    
    async def update_schedule(self, schedule: ScheduleConfig):
        """Update an existing schedule"""
        if schedule.schedule_id not in self._schedules:
            raise ValueError(f"Schedule {schedule.schedule_id} not found")
        
        # Validate schedule
        self._validate_schedule(schedule)
        
        # Update in memory and Redis
        self._schedules[schedule.schedule_id] = schedule
        await self._save_schedule(schedule)
        
        self.logger.info(f"Updated schedule {schedule.schedule_id}")
    
    async def enable_schedule(self, schedule_id: str):
        """Enable a schedule"""
        if schedule_id in self._schedules:
            self._schedules[schedule_id].enabled = True
            await self._save_schedule(self._schedules[schedule_id])
            self.logger.info(f"Enabled schedule {schedule_id}")
    
    async def disable_schedule(self, schedule_id: str):
        """Disable a schedule"""
        if schedule_id in self._schedules:
            self._schedules[schedule_id].enabled = False
            await self._save_schedule(self._schedules[schedule_id])
            self.logger.info(f"Disabled schedule {schedule_id}")
    
    async def get_schedule(self, schedule_id: str) -> Optional[ScheduleConfig]:
        """Get a schedule by ID"""
        return self._schedules.get(schedule_id)
    
    async def list_schedules(self, enabled_only: bool = False) -> List[ScheduleConfig]:
        """List all schedules"""
        schedules = list(self._schedules.values())
        if enabled_only:
            schedules = [s for s in schedules if s.enabled]
        return schedules
    
    async def get_schedule_runs(self, schedule_id: str, limit: int = 100) -> List[ScheduleRun]:
        """Get recent runs for a schedule"""
        if not self.queue.redis:
            return []
        
        runs_key = f"schedule:runs:{schedule_id}"
        run_data = await self.queue.redis.lrange(runs_key, 0, limit - 1)
        
        runs = []
        for data in run_data:
            try:
                run_dict = json.loads(data)
                run = ScheduleRun(**run_dict)
                runs.append(run)
            except Exception as e:
                self.logger.error(f"Failed to parse run data: {e}")
        
        return runs
    
    def get_stats(self) -> Dict[str, Any]:
        """Get scheduler statistics"""
        return {
            **self._stats,
            'active_schedules': len([s for s in self._schedules.values() if s.enabled]),
            'total_schedules': len(self._schedules),
            'running_tasks': len(self._schedule_tasks)
        }
    
    async def _scheduler_loop(self):
        """Main scheduler loop"""
        while self._running:
            try:
                await self._process_schedules()
                self._stats['last_run'] = datetime.now(timezone.utc).isoformat()
                self._stats['consecutive_failures'] = 0
                
                await asyncio.sleep(self.config.check_interval)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Scheduler loop error: {e}")
                self._stats['consecutive_failures'] += 1
                
                if self._stats['consecutive_failures'] >= self.config.max_scheduler_failures:
                    self.logger.error("Too many consecutive failures, stopping scheduler")
                    break
                
                await asyncio.sleep(self.config.failure_backoff)
    
    async def _process_schedules(self):
        """Process all due schedules"""
        now = datetime.now(timezone.utc)
        due_schedules = []
        
        # Find due schedules
        for schedule in self._schedules.values():
            if not schedule.enabled:
                continue
            
            if await self._is_schedule_due(schedule, now):
                due_schedules.append(schedule)
        
        # Process in batches
        for i in range(0, len(due_schedules), self.config.batch_size):
            batch = due_schedules[i:i + self.config.batch_size]
            tasks = [self._execute_schedule(schedule) for schedule in batch]
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        
        self._stats['schedules_processed'] += len(due_schedules)
    
    async def _is_schedule_due(self, schedule: ScheduleConfig, now: datetime) -> bool:
        """Check if a schedule is due for execution"""
        # Check date range
        if schedule.start_date and now < schedule.start_date:
            return False
        if schedule.end_date and now > schedule.end_date:
            return False
        
        # Check schedule type
        if schedule.schedule_type == ScheduleType.ONCE:
            # Parse target time
            try:
                target_time = datetime.fromisoformat(schedule.schedule_value)
                return now >= target_time
            except ValueError:
                return False
        
        elif schedule.schedule_type == ScheduleType.INTERVAL:
            # Check if enough time has passed since last run
            try:
                interval = float(schedule.schedule_value)

                # Check last run time from Redis
                if self.queue.redis:
                    last_run_key = f"schedule:last_run:{schedule.schedule_id}"
                    last_run_str = await self.queue.redis.get(last_run_key)

                    if last_run_str:
                        last_run = datetime.fromisoformat(last_run_str)
                        # Ensure last_run has timezone info if now does
                        if now.tzinfo and not last_run.tzinfo:
                            last_run = last_run.replace(tzinfo=timezone.utc)

                        return (now - last_run).total_seconds() >= interval

                return True  # First run or no Redis
            except ValueError:
                return False
        
        elif schedule.schedule_type == ScheduleType.CRON:
            # Use croniter to check if schedule is due
            try:
                cron = croniter(schedule.schedule_value, now)
                next_run = cron.get_next(datetime)
                # Check if we're within the check interval of the next run
                return abs((next_run - now).total_seconds()) <= self.config.check_interval
            except Exception:
                return False
        
        # TODO: Implement DAILY, WEEKLY, MONTHLY
        return False
    
    async def _execute_schedule(self, schedule: ScheduleConfig):
        """Execute a scheduled job"""
        run = ScheduleRun(
            schedule_id=schedule.schedule_id,
            scheduled_at=datetime.now(timezone.utc),
            max_attempts=schedule.max_retries + 1 if schedule.retry_on_failure else 1
        )
        
        try:
            # Create job data
            job_data = JobData(
                job_type=schedule.job_type,
                priority=schedule.job_priority,
                timeout=schedule.job_timeout,
                input_data=schedule.job_data,
                context={'scheduled': True, 'schedule_id': schedule.schedule_id}
            )
            
            # Add job to queue
            job_id = await self.queue.add_job(job_data)
            run.job_id = job_id
            run.started_at = datetime.now(timezone.utc)
            run.status = "running"
            
            self._stats['jobs_scheduled'] += 1
            self.logger.info(f"Scheduled job {job_id} for schedule {schedule.schedule_id}")
            
            # TODO: Monitor job completion and update run status
            
        except Exception as e:
            run.status = "failed"
            run.error = str(e)
            run.completed_at = datetime.now(timezone.utc)
            
            self._stats['jobs_failed'] += 1
            self.logger.error(f"Failed to schedule job for {schedule.schedule_id}: {e}")
        
        finally:
            # Save run history
            await self._save_schedule_run(run)
    
    async def _cleanup_loop(self):
        """Cleanup old schedule runs and data"""
        while self._running:
            try:
                await self._cleanup_old_runs()
                await asyncio.sleep(3600)  # Run cleanup every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(3600)
    
    async def _cleanup_old_runs(self):
        """Clean up old schedule run data"""
        if not self.queue.redis:
            return
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.config.keep_run_history_days)
        
        for schedule_id in self._schedules.keys():
            runs_key = f"schedule:runs:{schedule_id}"
            
            # Get all runs
            run_data = await self.queue.redis.lrange(runs_key, 0, -1)
            
            # Filter out old runs
            valid_runs = []
            for data in run_data:
                try:
                    run_dict = json.loads(data)
                    run_date = datetime.fromisoformat(run_dict['scheduled_at'])
                    if run_date >= cutoff_date:
                        valid_runs.append(data)
                except Exception:
                    continue
            
            # Keep only recent runs (up to max limit)
            valid_runs = valid_runs[:self.config.max_runs_per_schedule]
            
            # Update Redis list
            if valid_runs:
                await self.queue.redis.delete(runs_key)
                await self.queue.redis.lpush(runs_key, *valid_runs)
            else:
                await self.queue.redis.delete(runs_key)
    
    def _validate_schedule(self, schedule: ScheduleConfig):
        """Validate schedule configuration"""
        if schedule.schedule_type == ScheduleType.CRON:
            try:
                croniter(schedule.schedule_value)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {e}")
        
        elif schedule.schedule_type == ScheduleType.INTERVAL:
            try:
                interval = float(schedule.schedule_value)
                if interval <= 0:
                    raise ValueError("Interval must be positive")
            except ValueError as e:
                raise ValueError(f"Invalid interval: {e}")
        
        elif schedule.schedule_type == ScheduleType.ONCE:
            try:
                datetime.fromisoformat(schedule.schedule_value)
            except ValueError as e:
                raise ValueError(f"Invalid datetime format: {e}")
    
    async def _load_schedules(self):
        """Load schedules from Redis"""
        if not self.queue.redis:
            return
        
        schedules_key = "schedules:*"
        schedule_keys = await self.queue.redis.keys(schedules_key)
        
        for key in schedule_keys:
            try:
                schedule_data = await self.queue.redis.hgetall(key)
                if schedule_data:
                    # Convert bytes to strings
                    schedule_dict = {k.decode(): v.decode() for k, v in schedule_data.items()}
                    schedule_dict['job_data'] = json.loads(schedule_dict.get('job_data', '{}'))
                    schedule_dict['tags'] = json.loads(schedule_dict.get('tags', '[]'))
                    
                    schedule = ScheduleConfig.from_dict(schedule_dict)
                    self._schedules[schedule.schedule_id] = schedule
            except Exception as e:
                self.logger.error(f"Failed to load schedule from {key}: {e}")
    
    async def _save_schedule(self, schedule: ScheduleConfig):
        """Save schedule to Redis"""
        if not self.queue.redis:
            return
        
        schedule_key = f"schedules:{schedule.schedule_id}"
        schedule_dict = schedule.to_dict()
        
        # Convert complex types to JSON strings
        schedule_dict['job_data'] = json.dumps(schedule_dict['job_data'])
        schedule_dict['tags'] = json.dumps(schedule_dict['tags'])
        
        await self.queue.redis.hset(schedule_key, mapping=schedule_dict)
    
    async def _delete_schedule(self, schedule_id: str):
        """Delete schedule from Redis"""
        if not self.queue.redis:
            return
        
        schedule_key = f"schedules:{schedule_id}"
        runs_key = f"schedule:runs:{schedule_id}"
        last_run_key = f"schedule:last_run:{schedule_id}"
        
        await self.queue.redis.delete(schedule_key)
        await self.queue.redis.delete(runs_key)
        await self.queue.redis.delete(last_run_key)
    
    async def _save_schedule_run(self, run: ScheduleRun):
        """Save schedule run to Redis"""
        if not self.queue.redis:
            return
        
        runs_key = f"schedule:runs:{run.schedule_id}"
        run_data = json.dumps(run.to_dict())
        
        # Add to beginning of list
        await self.queue.redis.lpush(runs_key, run_data)
        
        # Trim to max runs
        await self.queue.redis.ltrim(runs_key, 0, self.config.max_runs_per_schedule - 1)

        # Update last run time
        last_run_key = f"schedule:last_run:{run.schedule_id}"
        await self.queue.redis.set(last_run_key, run.scheduled_at.isoformat())


# Convenience functions
async def create_scheduler(queue_config: RedisQueueConfig, scheduler_config: Optional[SchedulerConfig] = None) -> JobScheduler:
    """Create and start a job scheduler"""
    if scheduler_config is None:
        scheduler_config = SchedulerConfig()
    
    queue = RedisQueue(queue_config)
    await queue.connect()
    
    scheduler = JobScheduler(scheduler_config, queue)
    await scheduler.start()
    
    return scheduler


def create_cron_schedule(
    name: str,
    cron_expression: str,
    job_type: JobType,
    job_data: Dict[str, Any],
    **kwargs
) -> ScheduleConfig:
    """Create a cron-based schedule"""
    return ScheduleConfig(
        name=name,
        schedule_type=ScheduleType.CRON,
        schedule_value=cron_expression,
        job_type=job_type,
        job_data=job_data,
        **kwargs
    )


def create_interval_schedule(
    name: str,
    interval_seconds: float,
    job_type: JobType,
    job_data: Dict[str, Any],
    **kwargs
) -> ScheduleConfig:
    """Create an interval-based schedule"""
    return ScheduleConfig(
        name=name,
        schedule_type=ScheduleType.INTERVAL,
        schedule_value=str(interval_seconds),
        job_type=job_type,
        job_data=job_data,
        **kwargs
    )


def create_once_schedule(
    name: str,
    run_at: datetime,
    job_type: JobType,
    job_data: Dict[str, Any],
    **kwargs
) -> ScheduleConfig:
    """Create a one-time schedule"""
    return ScheduleConfig(
        name=name,
        schedule_type=ScheduleType.ONCE,
        schedule_value=run_at.isoformat(),
        job_type=job_type,
        job_data=job_data,
        **kwargs
    )