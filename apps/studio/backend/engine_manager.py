import os
import asyncio
import subprocess
import signal
import psutil
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

COMFYUI_DIR = r"C:\AI\ComfyUI_windows_portable"
COMFYUI_BAT = os.path.join(COMFYUI_DIR, "run_nvidia_gpu.bat")

class EngineManager:
    """Manages the lifecycle of the local embedded AI engine (ComfyUI)"""
    
    def __init__(self):
        self._process: Optional[subprocess.Popen] = None
        
    def is_installed(self) -> bool:
        """Check if the embedded engine is installed."""
        return os.path.exists(COMFYUI_BAT)
        
    def is_running(self) -> bool:
        """Check if the engine process is currently running."""
        if self._process is None:
            # Try to find a running python process inside the ComfyUI directory
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info.get('cmdline', [])
                    if cmdline and any("ComfyUI_windows_portable" in arg for arg in cmdline):
                        return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            return False
            
        return self._process.poll() is None
        
    async def start(self) -> bool:
        """Starts the embedded engine in the background silently."""
        if not self.is_installed():
            logger.error("Cannot start engine: Not installed")
            return False
            
        if self.is_running():
            logger.info("Engine is already running")
            return True
            
        logger.info(f"Starting embedded engine from {COMFYUI_BAT}")
        try:
            # CREATE_NO_WINDOW = 0x08000000 ensures no console window pops up
            creationflags = 0x08000000 if os.name == 'nt' else 0
            
            self._process = subprocess.Popen(
                COMFYUI_BAT,
                cwd=COMFYUI_DIR,
                creationflags=creationflags,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            return True
        except Exception as e:
            logger.error(f"Failed to start engine: {e}")
            return False
            
    async def stop(self) -> bool:
        """Stops the embedded engine."""
        success = False
        
        # 1. Try to terminate our known process
        if self._process and self._process.poll() is None:
            logger.info("Terminating known engine process")
            try:
                # On Windows, we need to kill the process tree because the .bat spawns python.exe
                parent = psutil.Process(self._process.pid)
                for child in parent.children(recursive=True):
                    child.terminate()
                parent.terminate()
                success = True
            except Exception as e:
                logger.error(f"Error terminating known process: {e}")
                
        # 2. Sweep for any orphaned python processes in the ComfyUI folder
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if cmdline and any("ComfyUI_windows_portable" in arg for arg in cmdline):
                    logger.info(f"Terminating orphaned engine process PID {proc.info['pid']}")
                    proc.terminate()
                    success = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
                
        self._process = None
        return success
        
    def get_status(self) -> Dict[str, Any]:
        """Returns the current status of the engine."""
        return {
            "installed": self.is_installed(),
            "running": self.is_running(),
            "install_path": COMFYUI_DIR
        }

# Global singleton
engine_manager = EngineManager()
