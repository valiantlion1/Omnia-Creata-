#!/usr/bin/env python3
"""
Local development startup script for OmniaPixels
Starts the system without Docker for development
"""

import sys
import os
import subprocess
import time
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_port(port):
    """Check if port is available"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def start_postgres():
    """Start PostgreSQL locally"""
    logger.info("Starting PostgreSQL...")
    # For Windows, assume PostgreSQL is installed
    try:
        subprocess.run(['pg_ctl', 'start'], check=False)
        time.sleep(2)
        return True
    except:
        logger.warning("PostgreSQL not started - using SQLite fallback")
        return False

def start_redis():
    """Start Redis locally"""
    logger.info("Starting Redis...")
    try:
        subprocess.Popen(['redis-server'], stdout=subprocess.DEVNULL)
        time.sleep(2)
        return True
    except:
        logger.warning("Redis not started - job queue disabled")
        return False

def start_api():
    """Start FastAPI server"""
    logger.info("Starting FastAPI server...")
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Set environment for local development
    os.environ['POSTGRES_URL'] = 'sqlite:///./omnia.db'
    os.environ['REDIS_URL'] = 'redis://localhost:6379/0'
    os.environ['MINIO_ENDPOINT'] = 'localhost:9000'
    
    try:
        subprocess.Popen([
            sys.executable, '-m', 'uvicorn', 
            'api.main:app', 
            '--host', '0.0.0.0', 
            '--port', '8000', 
            '--reload'
        ])
        time.sleep(3)
        return True
    except Exception as e:
        logger.error(f"Failed to start API: {e}")
        return False

def check_api_health():
    """Check if API is responding"""
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main startup function"""
    logger.info("🚀 Starting OmniaPixels local development environment...")
    
    # Check if ports are available
    if not check_port(8000):
        logger.error("Port 8000 is already in use")
        return 1
    
    # Start services
    postgres_ok = start_postgres()
    redis_ok = start_redis()
    api_ok = start_api()
    
    if api_ok:
        logger.info("✅ Waiting for API to be ready...")
        for i in range(10):
            if check_api_health():
                logger.info("✅ OmniaPixels API is running at http://localhost:8000")
                logger.info("📖 API docs available at http://localhost:8000/docs")
                break
            time.sleep(1)
        else:
            logger.error("❌ API failed to start properly")
            return 1
    
    logger.info("🎉 OmniaPixels development environment is ready!")
    logger.info("Press Ctrl+C to stop all services")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("👋 Shutting down...")
        return 0

if __name__ == "__main__":
    sys.exit(main())
