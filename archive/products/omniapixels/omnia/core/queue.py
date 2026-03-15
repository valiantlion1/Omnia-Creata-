import redis
from rq import Queue, Worker, Connection
from core.config import settings
import logging

# Redis connection
redis_conn = redis.from_url(settings.REDIS_URL)

# Job queues
job_queue = Queue('default', connection=redis_conn)
high_priority_queue = Queue('high', connection=redis_conn)
low_priority_queue = Queue('low', connection=redis_conn)

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
    queue = get_queue(priority)
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
