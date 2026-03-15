import redis
from rq import Worker, Connection
from core.config import settings
from core.queue import redis_conn
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Main worker process"""
    logger.info("Starting OmniaPixels worker...")
    
    with Connection(redis_conn):
        worker = Worker(['default', 'high', 'low'])
        logger.info("Worker started, waiting for jobs...")
        worker.work()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Worker error: {e}")
        sys.exit(1)
