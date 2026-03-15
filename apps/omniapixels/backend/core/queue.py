import redis
from rq import Queue, Worker, Connection
from core.config import settings
import logging

# Redis connection with error handling
try:
    redis_conn = redis.from_url(settings.REDIS_URL)
    redis_client = redis_conn  # Export for health checks
    logging.info(f"Redis connected: {settings.REDIS_URL}")
except Exception as e:
    logging.error(f"Redis connection failed: {e}")
    redis_conn = None
    redis_client = None

# Job queues with fallback
if redis_conn:
    job_queue = Queue('default', connection=redis_conn)
    high_priority_queue = Queue('high', connection=redis_conn)
    low_priority_queue = Queue('low', connection=redis_conn)
else:
    job_queue = None
    high_priority_queue = None
    low_priority_queue = None

def get_queue(priority='default'):
    """Get queue by priority"""
    queues = {
        'high': high_priority_queue,
        'default': job_queue,
        'low': low_priority_queue
    }
    return queues.get(priority, job_queue)

def enqueue_job(func_name, *args, priority='default', **kwargs):
    """Enqueue a job with specified priority"""
    if not redis_conn:
        logging.warning("Redis not available, job queuing disabled")
        return None
        
    queue = get_queue(priority)
    if not queue:
        logging.error(f"Queue {priority} not available")
        return None
        
    job = queue.enqueue(func_name, *args, **kwargs)
    logging.info(f"Enqueued job {job.id} in {priority} queue")
    return job

def get_job_status(job_id):
    """Get job status from Redis"""
    try:
        from rq.job import Job
        job = Job.fetch(job_id, connection=redis_conn)
        return {
            'id': job.id,
            'status': job.get_status(),
            'result': job.result,
            'exc_info': job.exc_info,
            'created_at': job.created_at,
            'started_at': job.started_at,
            'ended_at': job.ended_at
        }
    except Exception as e:
        logging.error(f"Error fetching job {job_id}: {e}")
        return None
