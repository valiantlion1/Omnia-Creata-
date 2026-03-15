from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
from core.models import Base

engine = create_engine(
    settings.POSTGRES_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.ENV == "dev"
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
