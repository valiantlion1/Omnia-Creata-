import redis
from rq import Queue
from typing import Optional, Dict, Any
from .config import settings
# Sprint-3: local queue fallback
from concurrent.futures import ThreadPoolExecutor

# Redis connection
redis_conn = redis.from_url(settings.REDIS_URL)

# RQ Queues
image_processing_queue = Queue('image_processing', connection=redis_conn)
ai_processing_queue = Queue('ai_processing', connection=redis_conn)

# Local executor (used when QUEUE_MODE=local)
_executor = ThreadPoolExecutor(max_workers=2)


def enqueue_job(job_id: int, queue_name: str, input_key: str, params: Optional[Dict[str, Any]] = None):
    """Enqueue a job for processing. Falls back to local thread executor when QUEUE_MODE=local."""
    job_data = {
        'job_id': job_id,
        'input_key': input_key,
        'params': params or {}
    }

    if getattr(settings, 'QUEUE_MODE', 'rq') == 'local':
        # Execute asynchronously in a local thread
        if queue_name == 'image_processing':
            from workers.image_processing import process_image as _fn
        elif queue_name == 'ai_processing':
            from workers.ai_processing import process_ai as _fn
        else:
            raise ValueError(f"Unknown queue: {queue_name}")
        _executor.submit(_fn, job_data)
        return None

    if queue_name == 'image_processing':
        return image_processing_queue.enqueue(
            'workers.image_processing.process_image',
            job_data,
            job_timeout='10m'
        )
    elif queue_name == 'ai_processing':
        return ai_processing_queue.enqueue(
            'workers.ai_processing.process_ai',
            job_data,
            job_timeout='30m'
        )
    else:
        raise ValueError(f"Unknown queue: {queue_name}")


def get_queue_stats():
    """Get queue statistics"""
    return {
        'image_processing': {
            'pending': len(image_processing_queue),
            'failed': len(image_processing_queue.failed_job_registry),
        },
        'ai_processing': {
            'pending': len(ai_processing_queue),
            'failed': len(ai_processing_queue.failed_job_registry),
        }
    }
