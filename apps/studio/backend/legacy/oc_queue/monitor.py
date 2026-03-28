import asyncio
import logging
import time
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
import json
import statistics

from .redis_queue import RedisQueue, RedisQueueConfig
from .jobs import JobStatus, JobType, JobPriority
from .worker import WorkerStatus


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class QueueStats:
    """Queue statistics"""
    queue_name: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Job counts by status
    pending_jobs: int = 0
    queued_jobs: int = 0
    processing_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    cancelled_jobs: int = 0
    retrying_jobs: int = 0
    timeout_jobs: int = 0
    
    # Job counts by priority
    urgent_jobs: int = 0
    critical_jobs: int = 0
    high_jobs: int = 0
    normal_jobs: int = 0
    low_jobs: int = 0
    
    # Job counts by type
    job_type_counts: Dict[str, int] = field(default_factory=dict)
    
    # Performance metrics
    average_wait_time: float = 0.0
    average_processing_time: float = 0.0
    throughput_per_minute: float = 0.0
    
    # Queue health
    oldest_pending_age: float = 0.0
    queue_depth: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'queue_name': self.queue_name,
            'timestamp': self.timestamp.isoformat(),
            'pending_jobs': self.pending_jobs,
            'queued_jobs': self.queued_jobs,
            'processing_jobs': self.processing_jobs,
            'completed_jobs': self.completed_jobs,
            'failed_jobs': self.failed_jobs,
            'cancelled_jobs': self.cancelled_jobs,
            'retrying_jobs': self.retrying_jobs,
            'timeout_jobs': self.timeout_jobs,
            'urgent_jobs': self.urgent_jobs,
            'critical_jobs': self.critical_jobs,
            'high_jobs': self.high_jobs,
            'normal_jobs': self.normal_jobs,
            'low_jobs': self.low_jobs,
            'job_type_counts': self.job_type_counts,
            'average_wait_time': self.average_wait_time,
            'average_processing_time': self.average_processing_time,
            'throughput_per_minute': self.throughput_per_minute,
            'oldest_pending_age': self.oldest_pending_age,
            'queue_depth': self.queue_depth
        }


@dataclass
class WorkerStats:
    """Worker statistics summary"""
    total_workers: int = 0
    idle_workers: int = 0
    busy_workers: int = 0
    paused_workers: int = 0
    stopping_workers: int = 0
    stopped_workers: int = 0
    error_workers: int = 0
    
    # Performance metrics
    total_jobs_processed: int = 0
    total_jobs_completed: int = 0
    total_jobs_failed: int = 0
    average_job_duration: float = 0.0
    
    # Resource usage
    total_memory_mb: float = 0.0
    average_memory_mb: float = 0.0
    peak_memory_mb: float = 0.0
    average_cpu_percent: float = 0.0
    peak_cpu_percent: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'total_workers': self.total_workers,
            'idle_workers': self.idle_workers,
            'busy_workers': self.busy_workers,
            'paused_workers': self.paused_workers,
            'stopping_workers': self.stopping_workers,
            'stopped_workers': self.stopped_workers,
            'error_workers': self.error_workers,
            'total_jobs_processed': self.total_jobs_processed,
            'total_jobs_completed': self.total_jobs_completed,
            'total_jobs_failed': self.total_jobs_failed,
            'average_job_duration': self.average_job_duration,
            'total_memory_mb': self.total_memory_mb,
            'average_memory_mb': self.average_memory_mb,
            'peak_memory_mb': self.peak_memory_mb,
            'average_cpu_percent': self.average_cpu_percent,
            'peak_cpu_percent': self.peak_cpu_percent
        }


@dataclass
class SystemStats:
    """Overall system statistics"""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Queue stats
    queue_stats: Dict[str, QueueStats] = field(default_factory=dict)
    
    # Worker stats
    worker_stats: WorkerStats = field(default_factory=WorkerStats)
    
    # System health
    system_healthy: bool = True
    active_alerts: List[Dict[str, Any]] = field(default_factory=list)
    
    # Performance trends
    throughput_trend: List[float] = field(default_factory=list)
    error_rate_trend: List[float] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'queue_stats': {name: stats.to_dict() for name, stats in self.queue_stats.items()},
            'worker_stats': self.worker_stats.to_dict(),
            'system_healthy': self.system_healthy,
            'active_alerts': self.active_alerts,
            'throughput_trend': self.throughput_trend,
            'error_rate_trend': self.error_rate_trend
        }


@dataclass
class Alert:
    """System alert"""
    alert_id: str
    level: AlertLevel
    title: str
    message: str
    component: str  # queue, worker, system
    component_id: Optional[str] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'alert_id': self.alert_id,
            'level': self.level.value,
            'title': self.title,
            'message': self.message,
            'component': self.component,
            'component_id': self.component_id,
            'timestamp': self.timestamp.isoformat(),
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'metadata': self.metadata
        }


@dataclass
class MonitorConfig:
    """Monitor configuration"""
    # Collection settings
    collection_interval: float = 30.0  # Collect stats every 30 seconds
    retention_hours: int = 24  # Keep stats for 24 hours
    
    # Alert thresholds
    max_queue_depth: int = 1000
    max_wait_time: float = 300.0  # 5 minutes
    max_processing_time: float = 600.0  # 10 minutes
    max_error_rate: float = 0.1  # 10%
    max_memory_mb: int = 2048
    max_cpu_percent: float = 90.0
    
    # Worker health thresholds
    min_healthy_workers: int = 1
    max_unhealthy_workers: int = 2
    
    # Trend analysis
    trend_window_minutes: int = 60
    trend_threshold: float = 0.2  # 20% change
    
    # Notification settings
    enable_alerts: bool = True
    alert_cooldown: float = 300.0  # 5 minutes between same alerts


class QueueMonitor:
    """Queue and worker monitoring system"""
    
    def __init__(self, config: MonitorConfig, queue: RedisQueue):
        self.config = config
        self.queue = queue
        self.logger = logging.getLogger("queue_monitor")
        
        # Monitor state
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        
        # Statistics storage
        self._stats_history: List[SystemStats] = []
        self._active_alerts: Dict[str, Alert] = {}
        
        # Alert handlers
        self._alert_handlers: List[Callable[[Alert], None]] = []
        
        # Last alert times (for cooldown)
        self._last_alert_times: Dict[str, datetime] = {}
    
    def add_alert_handler(self, handler: Callable[[Alert], None]):
        """Add alert handler"""
        self._alert_handlers.append(handler)
    
    async def start(self):
        """Start monitoring"""
        if self._running:
            return
        
        self._running = True
        self.logger.info("Starting queue monitor")
        
        # Start monitoring loop
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        self.logger.info("Queue monitor started")
    
    async def stop(self):
        """Stop monitoring"""
        if not self._running:
            return
        
        self._running = False
        self.logger.info("Stopping queue monitor")
        
        # Cancel tasks
        if self._monitor_task:
            self._monitor_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        # Wait for tasks to complete
        tasks = [t for t in [self._monitor_task, self._cleanup_task] if t]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        self.logger.info("Queue monitor stopped")
    
    async def get_current_stats(self) -> SystemStats:
        """Get current system statistics"""
        stats = SystemStats()
        
        # Collect queue stats
        queue_stats = await self._collect_queue_stats()
        stats.queue_stats = queue_stats
        
        # Collect worker stats
        worker_stats = await self._collect_worker_stats()
        stats.worker_stats = worker_stats
        
        # Check system health
        stats.system_healthy = self._check_system_health(stats)
        stats.active_alerts = [alert.to_dict() for alert in self._active_alerts.values()]
        
        # Add trends
        stats.throughput_trend = self._get_throughput_trend()
        stats.error_rate_trend = self._get_error_rate_trend()
        
        return stats
    
    async def get_stats_history(self, hours: int = 1) -> List[SystemStats]:
        """Get historical statistics"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        return [stats for stats in self._stats_history if stats.timestamp >= cutoff_time]
    
    async def get_active_alerts(self) -> List[Alert]:
        """Get active alerts"""
        return list(self._active_alerts.values())
    
    async def resolve_alert(self, alert_id: str):
        """Resolve an alert"""
        if alert_id in self._active_alerts:
            alert = self._active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now(timezone.utc)
            del self._active_alerts[alert_id]
            self.logger.info(f"Resolved alert {alert_id}")
    
    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self._running:
            try:
                # Collect current stats
                stats = await self.get_current_stats()
                
                # Store in history
                self._stats_history.append(stats)
                
                # Check for alerts
                await self._check_alerts(stats)
                
                # Store stats in Redis for persistence
                await self._store_stats(stats)
                
                await asyncio.sleep(self.config.collection_interval)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Monitor loop error: {e}")
                await asyncio.sleep(self.config.collection_interval)
    
    async def _cleanup_loop(self):
        """Cleanup old data"""
        while self._running:
            try:
                await self._cleanup_old_data()
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(3600)
    
    async def _collect_queue_stats(self) -> Dict[str, QueueStats]:
        """Collect queue statistics"""
        stats = {}
        
        if not self.queue.redis:
            return stats
        
        # Get all queue names
        queue_keys = await self.queue.redis.keys("queue:*")
        queue_names = set()
        
        for key in queue_keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            parts = key_str.split(":")
            if len(parts) >= 2:
                queue_names.add(parts[1])
        
        # Collect stats for each queue
        for queue_name in queue_names:
            queue_stats = QueueStats(queue_name=queue_name)
            
            # Count jobs by status
            for status in JobStatus:
                count = await self.queue.redis.llen(f"queue:{queue_name}:{status.value}")
                setattr(queue_stats, f"{status.value}_jobs", count)
            
            # Count jobs by priority
            for priority in JobPriority:
                count = await self.queue.redis.llen(f"queue:{queue_name}:priority:{priority.value}")
                setattr(queue_stats, f"{priority.value}_jobs", count)
            
            # Get job type counts
            job_types = await self.queue.redis.hgetall(f"queue:{queue_name}:job_types")
            queue_stats.job_type_counts = {
                k.decode(): int(v.decode()) for k, v in job_types.items()
            }
            
            # Calculate performance metrics
            await self._calculate_performance_metrics(queue_stats, queue_name)
            
            stats[queue_name] = queue_stats
        
        return stats
    
    async def _collect_worker_stats(self) -> WorkerStats:
        """Collect worker statistics"""
        stats = WorkerStats()
        
        if not self.queue.redis:
            return stats
        
        # Get all worker heartbeats
        worker_keys = await self.queue.redis.keys("worker:heartbeat:*")
        
        worker_data = []
        for key in worker_keys:
            heartbeat = await self.queue.redis.hgetall(key)
            if heartbeat:
                try:
                    worker_info = {k.decode(): v.decode() for k, v in heartbeat.items()}
                    worker_stats_data = json.loads(worker_info.get('stats', '{}'))
                    worker_data.append(worker_stats_data)
                except Exception as e:
                    self.logger.error(f"Failed to parse worker data: {e}")
        
        if not worker_data:
            return stats
        
        # Aggregate worker statistics
        stats.total_workers = len(worker_data)
        
        # Count by status
        status_counts = {}
        for worker in worker_data:
            status = worker.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        stats.idle_workers = status_counts.get('idle', 0)
        stats.busy_workers = status_counts.get('busy', 0)
        stats.paused_workers = status_counts.get('paused', 0)
        stats.stopping_workers = status_counts.get('stopping', 0)
        stats.stopped_workers = status_counts.get('stopped', 0)
        stats.error_workers = status_counts.get('error', 0)
        
        # Aggregate performance metrics
        if worker_data:
            stats.total_jobs_processed = sum(w.get('jobs_processed', 0) for w in worker_data)
            stats.total_jobs_completed = sum(w.get('jobs_completed', 0) for w in worker_data)
            stats.total_jobs_failed = sum(w.get('jobs_failed', 0) for w in worker_data)
            
            # Calculate averages
            job_durations = [w.get('average_job_duration', 0) for w in worker_data if w.get('average_job_duration', 0) > 0]
            if job_durations:
                stats.average_job_duration = statistics.mean(job_durations)
            
            # Resource usage
            memory_values = [w.get('current_memory_mb', 0) for w in worker_data]
            cpu_values = [w.get('current_cpu_percent', 0) for w in worker_data]
            
            if memory_values:
                stats.total_memory_mb = sum(memory_values)
                stats.average_memory_mb = statistics.mean(memory_values)
                stats.peak_memory_mb = max(w.get('peak_memory_mb', 0) for w in worker_data)
            
            if cpu_values:
                stats.average_cpu_percent = statistics.mean(cpu_values)
                stats.peak_cpu_percent = max(w.get('peak_cpu_percent', 0) for w in worker_data)
        
        return stats
    
    async def _calculate_performance_metrics(self, queue_stats: QueueStats, queue_name: str):
        """Calculate performance metrics for a queue"""
        if not self.queue.redis:
            return
        
        # Get timing data from Redis
        timing_key = f"queue:{queue_name}:timing"
        timing_data = await self.queue.redis.hgetall(timing_key)
        
        if timing_data:
            try:
                wait_times = json.loads(timing_data.get(b'wait_times', b'[]').decode())
                processing_times = json.loads(timing_data.get(b'processing_times', b'[]').decode())
                
                if wait_times:
                    queue_stats.average_wait_time = statistics.mean(wait_times)
                    queue_stats.oldest_pending_age = max(wait_times)
                
                if processing_times:
                    queue_stats.average_processing_time = statistics.mean(processing_times)
                
                # Calculate throughput (jobs per minute)
                completed_count = timing_data.get(b'completed_last_minute', b'0').decode()
                queue_stats.throughput_per_minute = float(completed_count)
                
            except Exception as e:
                self.logger.error(f"Failed to calculate performance metrics: {e}")
        
        # Calculate queue depth
        queue_stats.queue_depth = (
            queue_stats.pending_jobs + 
            queue_stats.queued_jobs + 
            queue_stats.processing_jobs
        )
    
    def _check_system_health(self, stats: SystemStats) -> bool:
        """Check overall system health"""
        # Check if we have enough healthy workers
        healthy_workers = (
            stats.worker_stats.idle_workers + 
            stats.worker_stats.busy_workers
        )
        
        if healthy_workers < self.config.min_healthy_workers:
            return False
        
        if stats.worker_stats.error_workers > self.config.max_unhealthy_workers:
            return False
        
        # Check queue health
        for queue_stats in stats.queue_stats.values():
            if queue_stats.queue_depth > self.config.max_queue_depth:
                return False
            
            if queue_stats.average_wait_time > self.config.max_wait_time:
                return False
        
        return True
    
    async def _check_alerts(self, stats: SystemStats):
        """Check for alert conditions"""
        if not self.config.enable_alerts:
            return
        
        # Check queue alerts
        for queue_name, queue_stats in stats.queue_stats.items():
            await self._check_queue_alerts(queue_name, queue_stats)
        
        # Check worker alerts
        await self._check_worker_alerts(stats.worker_stats)
        
        # Check system alerts
        await self._check_system_alerts(stats)
    
    async def _check_queue_alerts(self, queue_name: str, queue_stats: QueueStats):
        """Check for queue-specific alerts"""
        # High queue depth
        if queue_stats.queue_depth > self.config.max_queue_depth:
            await self._create_alert(
                f"queue_depth_{queue_name}",
                AlertLevel.WARNING,
                "High Queue Depth",
                f"Queue {queue_name} has {queue_stats.queue_depth} jobs (threshold: {self.config.max_queue_depth})",
                "queue",
                queue_name
            )
        
        # High wait time
        if queue_stats.average_wait_time > self.config.max_wait_time:
            await self._create_alert(
                f"wait_time_{queue_name}",
                AlertLevel.WARNING,
                "High Wait Time",
                f"Queue {queue_name} average wait time: {queue_stats.average_wait_time:.1f}s (threshold: {self.config.max_wait_time}s)",
                "queue",
                queue_name
            )
        
        # High processing time
        if queue_stats.average_processing_time > self.config.max_processing_time:
            await self._create_alert(
                f"processing_time_{queue_name}",
                AlertLevel.WARNING,
                "High Processing Time",
                f"Queue {queue_name} average processing time: {queue_stats.average_processing_time:.1f}s (threshold: {self.config.max_processing_time}s)",
                "queue",
                queue_name
            )
    
    async def _check_worker_alerts(self, worker_stats: WorkerStats):
        """Check for worker-specific alerts"""
        # Too few healthy workers
        healthy_workers = worker_stats.idle_workers + worker_stats.busy_workers
        if healthy_workers < self.config.min_healthy_workers:
            await self._create_alert(
                "low_worker_count",
                AlertLevel.ERROR,
                "Low Worker Count",
                f"Only {healthy_workers} healthy workers (minimum: {self.config.min_healthy_workers})",
                "worker"
            )
        
        # Too many unhealthy workers
        if worker_stats.error_workers > self.config.max_unhealthy_workers:
            await self._create_alert(
                "high_error_workers",
                AlertLevel.ERROR,
                "High Error Worker Count",
                f"{worker_stats.error_workers} workers in error state (maximum: {self.config.max_unhealthy_workers})",
                "worker"
            )
        
        # High memory usage
        if worker_stats.average_memory_mb > self.config.max_memory_mb:
            await self._create_alert(
                "high_memory_usage",
                AlertLevel.WARNING,
                "High Memory Usage",
                f"Average worker memory: {worker_stats.average_memory_mb:.1f}MB (threshold: {self.config.max_memory_mb}MB)",
                "worker"
            )
        
        # High CPU usage
        if worker_stats.average_cpu_percent > self.config.max_cpu_percent:
            await self._create_alert(
                "high_cpu_usage",
                AlertLevel.WARNING,
                "High CPU Usage",
                f"Average worker CPU: {worker_stats.average_cpu_percent:.1f}% (threshold: {self.config.max_cpu_percent}%)",
                "worker"
            )
    
    async def _check_system_alerts(self, stats: SystemStats):
        """Check for system-wide alerts"""
        # System unhealthy
        if not stats.system_healthy:
            await self._create_alert(
                "system_unhealthy",
                AlertLevel.CRITICAL,
                "System Unhealthy",
                "Overall system health check failed",
                "system"
            )
    
    async def _create_alert(self, alert_key: str, level: AlertLevel, title: str, message: str, component: str, component_id: Optional[str] = None):
        """Create or update an alert"""
        # Check cooldown
        now = datetime.now(timezone.utc)
        if alert_key in self._last_alert_times:
            time_since_last = (now - self._last_alert_times[alert_key]).total_seconds()
            if time_since_last < self.config.alert_cooldown:
                return
        
        # Create alert
        alert = Alert(
            alert_id=alert_key,
            level=level,
            title=title,
            message=message,
            component=component,
            component_id=component_id
        )
        
        # Store alert
        self._active_alerts[alert_key] = alert
        self._last_alert_times[alert_key] = now
        
        # Call alert handlers
        for handler in self._alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                self.logger.error(f"Alert handler error: {e}")
        
        self.logger.warning(f"Alert created: {title} - {message}")
    
    def _get_throughput_trend(self) -> List[float]:
        """Get throughput trend data"""
        if len(self._stats_history) < 2:
            return []
        
        # Get last hour of data
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=self.config.trend_window_minutes)
        recent_stats = [s for s in self._stats_history if s.timestamp >= cutoff_time]
        
        # Calculate throughput for each time point
        throughput_data = []
        for stats in recent_stats:
            total_throughput = sum(
                queue_stats.throughput_per_minute 
                for queue_stats in stats.queue_stats.values()
            )
            throughput_data.append(total_throughput)
        
        return throughput_data
    
    def _get_error_rate_trend(self) -> List[float]:
        """Get error rate trend data"""
        if len(self._stats_history) < 2:
            return []
        
        # Get last hour of data
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=self.config.trend_window_minutes)
        recent_stats = [s for s in self._stats_history if s.timestamp >= cutoff_time]
        
        # Calculate error rate for each time point
        error_rates = []
        for stats in recent_stats:
            total_completed = stats.worker_stats.total_jobs_completed
            total_failed = stats.worker_stats.total_jobs_failed
            total_jobs = total_completed + total_failed
            
            if total_jobs > 0:
                error_rate = total_failed / total_jobs
            else:
                error_rate = 0.0
            
            error_rates.append(error_rate)
        
        return error_rates
    
    async def _store_stats(self, stats: SystemStats):
        """Store statistics in Redis"""
        if not self.queue.redis:
            return
        
        stats_key = f"monitor:stats:{int(stats.timestamp.timestamp())}"
        stats_data = json.dumps(stats.to_dict())
        
        await self.queue.redis.setex(stats_key, int(self.config.retention_hours * 3600), stats_data)
    
    async def _cleanup_old_data(self):
        """Clean up old monitoring data"""
        # Clean up in-memory history
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=self.config.retention_hours)
        self._stats_history = [s for s in self._stats_history if s.timestamp >= cutoff_time]
        
        # Clean up Redis data
        if self.queue.redis:
            stats_keys = await self.queue.redis.keys("monitor:stats:*")
            for key in stats_keys:
                try:
                    key_str = key.decode() if isinstance(key, bytes) else key
                    timestamp_str = key_str.split(":")[-1]
                    timestamp = datetime.fromtimestamp(int(timestamp_str), tz=timezone.utc)
                    
                    if timestamp < cutoff_time:
                        await self.queue.redis.delete(key)
                except Exception as e:
                    self.logger.error(f"Failed to clean up stats key {key}: {e}")


# Convenience functions
async def create_monitor(queue_config: RedisQueueConfig, monitor_config: Optional[MonitorConfig] = None) -> QueueMonitor:
    """Create and start a queue monitor"""
    if monitor_config is None:
        monitor_config = MonitorConfig()
    
    queue = RedisQueue(queue_config)
    await queue.connect()
    
    monitor = QueueMonitor(monitor_config, queue)
    await monitor.start()
    
    return monitor


def create_console_alert_handler() -> Callable[[Alert], None]:
    """Create a simple console alert handler"""
    def handler(alert: Alert):
        level_colors = {
            AlertLevel.INFO: "\033[94m",  # Blue
            AlertLevel.WARNING: "\033[93m",  # Yellow
            AlertLevel.ERROR: "\033[91m",  # Red
            AlertLevel.CRITICAL: "\033[95m"  # Magenta
        }
        reset_color = "\033[0m"
        
        color = level_colors.get(alert.level, "")
        print(f"{color}[{alert.level.value.upper()}] {alert.title}: {alert.message}{reset_color}")
    
    return handler