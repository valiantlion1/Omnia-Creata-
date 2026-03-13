#!/usr/bin/env python3
"""
Database initialization script for OmniaPixels
Creates tables and seeds initial data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import engine, SessionLocal
from core.models import Base, Model, User, JobStatus, ProcessingType
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to create tables: {e}")
        return False

def seed_models():
    """Seed initial AI models"""
    db = SessionLocal()
    try:
        # Check if models already exist
        existing_count = db.query(Model).count()
        if existing_count > 0:
            logger.info(f"✓ Models already exist ({existing_count} models)")
            return True
        
        # Default models
        models = [
            Model(
                name="rembg_u2net",
                display_name="U2Net Background Remover",
                description="High-quality background removal using U2Net model",
                category="background_removal",
                version="1.0.0",
                file_path="/models/u2net.pth",
                gpu_memory_mb=2048,
                avg_processing_time_ms=3000,
                supported_formats=["jpg", "png", "webp"],
                max_resolution={"width": 4096, "height": 4096},
                is_premium_only=False,
                is_active=True
            ),
            Model(
                name="esrgan_4x",
                display_name="ESRGAN 4x Upscaler",
                description="AI-powered 4x image upscaling",
                category="super_resolution",
                version="1.0.0",
                file_path="/models/esrgan_4x.pth",
                gpu_memory_mb=4096,
                avg_processing_time_ms=8000,
                supported_formats=["jpg", "png"],
                max_resolution={"width": 2048, "height": 2048},
                is_premium_only=True,
                is_active=True
            ),
            Model(
                name="yolo_crop",
                display_name="YOLO Smart Crop",
                description="Intelligent cropping using object detection",
                category="crop",
                version="1.0.0",
                file_path="/models/yolov8.pt",
                gpu_memory_mb=1024,
                avg_processing_time_ms=1500,
                supported_formats=["jpg", "png", "webp"],
                max_resolution={"width": 8192, "height": 8192},
                is_premium_only=False,
                is_active=True
            )
        ]
        
        for model in models:
            db.add(model)
        
        db.commit()
        logger.info(f"✓ Seeded {len(models)} AI models")
        return True
        
    except Exception as e:
        logger.error(f"✗ Failed to seed models: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def seed_test_user():
    """Create a test user"""
    db = SessionLocal()
    try:
        # Check if test user exists
        existing_user = db.query(User).filter(User.id == "test_user").first()
        if existing_user:
            logger.info("✓ Test user already exists")
            return True
        
        test_user = User(
            id="test_user",
            email="test@omniapixels.com",
            is_premium=False,
            subscription_type="free",
            credits_remaining=100,
            total_jobs_processed=0,
            created_at=datetime.utcnow()
        )
        
        db.add(test_user)
        db.commit()
        logger.info("✓ Created test user")
        return True
        
    except Exception as e:
        logger.error(f"✗ Failed to create test user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    """Main initialization function"""
    logger.info("🚀 Starting OmniaPixels database initialization...")
    
    success = True
    
    # Create tables
    if not create_tables():
        success = False
    
    # Seed models
    if not seed_models():
        success = False
    
    # Create test user
    if not seed_test_user():
        success = False
    
    if success:
        logger.info("✅ Database initialization completed successfully!")
        return 0
    else:
        logger.error("❌ Database initialization failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
