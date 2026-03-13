from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import logging

from engine_manager import engine_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/engine", tags=["engine"])

class EngineStatusResponse(BaseModel):
    installed: bool
    running: bool
    install_path: str

@router.get("/status", response_model=EngineStatusResponse)
async def get_engine_status():
    """Get the current status of the embedded Engine"""
    return engine_manager.get_status()

@router.post("/start")
async def start_engine():
    """Start the embedded Engine in the background"""
    if not engine_manager.is_installed():
        raise HTTPException(status_code=400, detail="Engine not installed")
        
    success = await engine_manager.start()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start engine")
        
    return engine_manager.get_status()

@router.post("/stop")
async def stop_engine():
    """Stop the embedded Engine"""
    await engine_manager.stop()
    return engine_manager.get_status()
