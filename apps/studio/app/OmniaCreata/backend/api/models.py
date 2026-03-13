from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import json
import os
from pathlib import Path
from typing import Dict, List, Any
import logging
from presets.assets import AssetResolver, AssetInfo
from .routes import get_asset_resolver

router = APIRouter()
logger = logging.getLogger(__name__)

# Model paths configuration
MODELS_CONFIG_PATH = Path("../config/models.index.json")
MODELS_PATHS_CONFIG = Path("../config/models.paths.json")

def load_models_config() -> Dict[str, Any]:
    """Load models configuration from JSON file"""
    try:
        if MODELS_CONFIG_PATH.exists():
            with open(MODELS_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            logger.warning(f"Models config file not found: {MODELS_CONFIG_PATH}")
            return {"models": {}}
    except Exception as e:
        logger.error(f"Error loading models config: {e}")
        return {"models": {}}

def load_paths_config() -> Dict[str, Any]:
    """Load paths configuration from JSON file"""
    try:
        if MODELS_PATHS_CONFIG.exists():
            with open(MODELS_PATHS_CONFIG, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            logger.warning(f"Paths config file not found: {MODELS_PATHS_CONFIG}")
            return {"root": "", "paths": {}}
    except Exception as e:
        logger.error(f"Error loading paths config: {e}")
        return {"root": "", "paths": {}}

def scan_models_directory(model_type: str, directory_path: str) -> List[Dict[str, Any]]:
    """Scan directory for model files"""
    models = []
    
    if not os.path.exists(directory_path):
        logger.warning(f"Directory not found: {directory_path}")
        return models
    
    supported_extensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin']
    
    try:
        for file_path in Path(directory_path).rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                stat = file_path.stat()
                
                # Determine model family based on name patterns
                family = "unknown"
                name_lower = file_path.name.lower()
                if "xl" in name_lower or "sdxl" in name_lower:
                    family = "sdxl"
                elif "sd15" in name_lower or "1.5" in name_lower:
                    family = "sd15"
                elif "sd2" in name_lower or "2.0" in name_lower or "2.1" in name_lower:
                    family = "sd20"
                elif "flux" in name_lower:
                    family = "flux"
                elif "controlnet" in name_lower:
                    family = "controlnet"
                
                model_info = {
                    "name": file_path.name,
                    "path": str(file_path.absolute()),
                    "type": model_type,
                    "family": family,
                    "ext": file_path.suffix,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modified_ts": int(stat.st_mtime)
                }
                
                models.append(model_info)
                
    except Exception as e:
        logger.error(f"Error scanning directory {directory_path}: {e}")
    
    return sorted(models, key=lambda x: x['name'])

# ---------------------- New helpers for AssetResolver-backed API ----------------------

def _infer_model_type_from_path(path: str) -> str:
    p = path.replace('\\', '/').lower()
    if 'controlnet' in p:
        return 'controlnet'
    if 'upscale_models' in p or 'upscaler' in p:
        return 'upscale_models'
    if '/vae' in p or p.endswith('/vae') or 'vae.' in p:
        return 'vae'
    if 'lora' in p or 'loras' in p:
        return 'lora'
    # default
    return 'checkpoints'


def _infer_family_from_name(name: str) -> str:
    n = name.lower()
    if 'flux' in n:
        return 'flux'
    if 'sdxl' in n or 'xl' in n:
        return 'sdxl'
    if 'controlnet' in n:
        return 'controlnet'
    if 'sd15' in n or '1.5' in n:
        return 'sd15'
    if 'sd2' in n or '2.0' in n or '2.1' in n:
        return 'sd20'
    return 'unknown'


def _asset_to_model(asset: AssetInfo) -> Dict[str, Any]:
    # Determine extension
    ext = ''
    try:
        ext = Path(asset.path).suffix if os.path.exists(asset.path) else Path(asset.name).suffix
    except Exception:
        ext = Path(asset.name).suffix
    
    # Determine size in MB
    if asset.size is not None:
        size_mb = round(asset.size / (1024 * 1024), 2)
    else:
        try:
            stat = os.stat(asset.path)
            size_mb = round(stat.st_size / (1024 * 1024), 2)
        except Exception:
            size_mb = 0.0
    
    mtype = _infer_model_type_from_path(asset.path)
    family = _infer_family_from_name(asset.name)
    
    return {
        "name": asset.name,
        "path": asset.path,
        "type": mtype,
        "family": family,
        "ext": ext or '',
        "size_mb": size_mb,
    }

# --------------------------------------------------------------------------------------

@router.get("/models")
async def get_models(ar: AssetResolver = Depends(get_asset_resolver)):
    """Get all available models organized by type using AssetResolver"""
    try:
        groups: Dict[str, List[Dict[str, Any]]] = {
            'checkpoints': [], 'controlnet': [], 'vae': [], 'lora': [], 'upscale_models': []
        }
        for asset in ar.list_assets():
            model = _asset_to_model(asset)
            if model["type"] in groups:
                groups[model["type"]].append(model)
        # Sort by name in each group
        for k in groups:
            groups[k] = sorted(groups[k], key=lambda x: x['name'])
        return JSONResponse(content=groups)
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading models: {str(e)}")

@router.get("/models/{model_type}")
async def get_models_by_type(model_type: str, ar: AssetResolver = Depends(get_asset_resolver)):
    """Get models of a specific type via AssetResolver"""
    try:
        valid_types = { 'checkpoints', 'controlnet', 'vae', 'lora', 'upscale_models' }
        if model_type not in valid_types:
            raise HTTPException(status_code=404, detail=f"Model type '{model_type}' not supported")
        models = []
        for asset in ar.list_assets():
            if _infer_model_type_from_path(asset.path) == model_type:
                models.append(_asset_to_model(asset))
        models = sorted(models, key=lambda x: x['name'])
        return JSONResponse(content=models)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting {model_type} models: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading {model_type} models: {str(e)}")

@router.post("/models/refresh")
async def refresh_models(ar: AssetResolver = Depends(get_asset_resolver)):
    """Refresh models index by rediscovering local assets"""
    try:
        # Force re-discovery (internal method)
        try:
            # try both sync/async variants safely
            discover = getattr(ar, "_discover_local_assets", None)
            if discover:
                result = discover()
                if hasattr(result, "__await__"):
                    await result
        except Exception as e:
            logger.warning(f"Discover task failed or not available: {e}")
        
        groups: Dict[str, List[Dict[str, Any]]] = {
            'checkpoints': [], 'controlnet': [], 'vae': [], 'lora': [], 'upscale_models': []
        }
        for asset in ar.list_assets():
            model = _asset_to_model(asset)
            if model["type"] in groups:
                groups[model["type"]].append(model)
        for k in groups:
            groups[k] = sorted(groups[k], key=lambda x: x['name'])
        
        return JSONResponse(content={
            "status": "success",
            "message": "Models refreshed successfully",
            "models": groups
        })
    except Exception as e:
        logger.error(f"Error refreshing models: {e}")
        raise HTTPException(status_code=500, detail=f"Error refreshing models: {str(e)}")

@router.get("/models/info/{model_name}")
async def get_model_info(model_name: str, ar: AssetResolver = Depends(get_asset_resolver)):
    """Get detailed information about a specific model using AssetResolver"""
    try:
        asset = ar.get_asset_info(model_name)
        if not asset:
            # Fallback: search by name in listed assets
            for a in ar.list_assets():
                if a.name == model_name:
                    asset = a
                    break
        if not asset:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        model_info = _asset_to_model(asset)
        # Existence info
        if os.path.exists(model_info["path"]):
            stat = os.stat(model_info["path"])
            model_info["exists"] = True
            model_info["current_size_mb"] = round(stat.st_size / (1024 * 1024), 2)
            model_info["current_modified_ts"] = int(stat.st_mtime)
        else:
            model_info["exists"] = False
        
        return JSONResponse(content=model_info)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model info for {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")

# Add time import
import time