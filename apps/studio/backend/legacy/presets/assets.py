import os
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse
import hashlib
import json
from dataclasses import dataclass
import logging


logger = logging.getLogger(__name__)


@dataclass
class AssetInfo:
    """Information about an asset"""
    name: str
    path: str
    size: Optional[int] = None
    hash: Optional[str] = None
    source: str = "local"  # local, huggingface, url
    url: Optional[str] = None
    cached: bool = False


class AssetResolver:
    """Resolves and manages AI model assets with local/cloud fallback"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.local_paths = config.get('local', {})
        self.hf_config = config.get('huggingface', {})
        self.cache_dir = Path(self.hf_config.get('cacheDir', 'C:/AI/models/hf_cache'))
        self.read_only = self.hf_config.get('readOnly', True)
        
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Asset registry
        self.asset_registry: Dict[str, AssetInfo] = {}
        
        # Initialize asset discovery
        asyncio.create_task(self._discover_local_assets())
    
    async def _discover_local_assets(self) -> None:
        """Discover locally available assets"""
        for asset_type, base_path in self.local_paths.items():
            if not os.path.exists(base_path):
                logger.warning(f"Local path not found: {base_path} ({asset_type})")
                continue
            
            try:
                for file_path in Path(base_path).rglob('*'):
                    if file_path.is_file() and self._is_valid_asset(file_path, asset_type):
                        asset_info = AssetInfo(
                            name=file_path.name,
                            path=str(file_path),
                            size=file_path.stat().st_size,
                            source="local",
                            cached=True
                        )
                        
                        # Calculate hash for integrity
                        asset_info.hash = await self._calculate_file_hash(file_path)
                        
                        self.asset_registry[file_path.name] = asset_info
                        
                logger.info(f"Discovered {len([a for a in self.asset_registry.values() if asset_type in a.path])} {asset_type} assets")
                
            except Exception as e:
                logger.error(f"Error discovering {asset_type} assets: {e}")
    
    def _is_valid_asset(self, file_path: Path, asset_type: str) -> bool:
        """Check if file is a valid asset of the given type"""
        valid_extensions = {
            'models': ['.safetensors', '.ckpt', '.pt', '.pth'],
            'loras': ['.safetensors', '.ckpt', '.pt'],
            'vaes': ['.safetensors', '.ckpt', '.pt'],
            'upscalers': ['.pth', '.pt', '.safetensors'],
            'embeddings': ['.safetensors', '.pt', '.bin'],
            'controlnet': ['.safetensors', '.ckpt', '.pt', '.pth']
        }
        
        extensions = valid_extensions.get(asset_type, [])
        return file_path.suffix.lower() in extensions
    
    async def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file"""
        try:
            hash_sha256 = hashlib.sha256()
            async with aiofiles.open(file_path, 'rb') as f:
                while chunk := await f.read(8192):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return ""
    
    async def resolve_asset(self, asset_name: str, asset_type: str = "models") -> AssetInfo:
        """Resolve an asset with local-first, then cloud fallback"""
        # Check if asset is already in registry (local)
        if asset_name in self.asset_registry:
            asset = self.asset_registry[asset_name]
            if os.path.exists(asset.path):
                logger.debug(f"Found local asset: {asset_name}")
                return asset
            else:
                # Remove from registry if file no longer exists
                del self.asset_registry[asset_name]
        
        # Try to find in local directories
        local_asset = await self._find_local_asset(asset_name, asset_type)
        if local_asset:
            self.asset_registry[asset_name] = local_asset
            return local_asset
        
        # Fallback to Hugging Face if read-only mode
        if self.read_only:
            hf_asset = await self._resolve_huggingface_asset(asset_name, asset_type)
            if hf_asset:
                self.asset_registry[asset_name] = hf_asset
                return hf_asset
        
        raise FileNotFoundError(f"Asset not found: {asset_name} (type: {asset_type})")
    
    async def _find_local_asset(self, asset_name: str, asset_type: str) -> Optional[AssetInfo]:
        """Find asset in local directories"""
        base_path = self.local_paths.get(asset_type)
        if not base_path or not os.path.exists(base_path):
            return None
        
        # Search for exact match first
        for file_path in Path(base_path).rglob(asset_name):
            if file_path.is_file():
                return AssetInfo(
                    name=asset_name,
                    path=str(file_path),
                    size=file_path.stat().st_size,
                    source="local",
                    cached=True,
                    hash=await self._calculate_file_hash(file_path)
                )
        
        # Search for partial match (without extension)
        name_without_ext = Path(asset_name).stem
        for file_path in Path(base_path).rglob('*'):
            if file_path.is_file() and file_path.stem == name_without_ext:
                if self._is_valid_asset(file_path, asset_type):
                    return AssetInfo(
                        name=file_path.name,
                        path=str(file_path),
                        size=file_path.stat().st_size,
                        source="local",
                        cached=True,
                        hash=await self._calculate_file_hash(file_path)
                    )
        
        return None
    
    async def _resolve_huggingface_asset(self, asset_name: str, asset_type: str) -> Optional[AssetInfo]:
        """Resolve asset from Hugging Face Hub"""
        try:
            # Common Hugging Face repositories for different asset types
            hf_repos = {
                'models': [
                    'stabilityai/stable-diffusion-xl-base-1.0',
                    'runwayml/stable-diffusion-v1-5',
                    'SG161222/RealVisXL_V3.0_Turbo'
                ],
                'loras': [
                    'XLabs-AI/flux-lora-collection',
                    'multimodalart/flux-tarot-v1'
                ],
                'vaes': [
                    'stabilityai/sd-vae-ft-mse',
                    'stabilityai/sdxl-vae'
                ],
                'upscalers': [
                    'ai-forever/Real-ESRGAN',
                    'xinntao/ESRGAN'
                ]
            }
            
            repos = hf_repos.get(asset_type, [])
            
            for repo in repos:
                hf_url = f"https://huggingface.co/{repo}/resolve/main/{asset_name}"
                
                # Check if file exists on HF
                if await self._check_url_exists(hf_url):
                    # Download to cache if not read-only
                    if not self.read_only:
                        cached_path = await self._download_to_cache(hf_url, asset_name)
                        if cached_path:
                            return AssetInfo(
                                name=asset_name,
                                path=cached_path,
                                source="huggingface",
                                url=hf_url,
                                cached=True
                            )
                    else:
                        # Return URL for direct access
                        return AssetInfo(
                            name=asset_name,
                            path=hf_url,
                            source="huggingface",
                            url=hf_url,
                            cached=False
                        )
            
            return None
            
        except Exception as e:
            logger.error(f"Error resolving HuggingFace asset {asset_name}: {e}")
            return None
    
    async def _check_url_exists(self, url: str) -> bool:
        """Check if URL exists with HEAD request"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(url) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _download_to_cache(self, url: str, filename: str) -> Optional[str]:
        """Download file to cache directory"""
        try:
            cache_path = self.cache_dir / filename
            
            # Skip if already cached
            if cache_path.exists():
                return str(cache_path)
            
            logger.info(f"Downloading {filename} from {url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        async with aiofiles.open(cache_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                await f.write(chunk)
                        
                        logger.info(f"Downloaded {filename} to cache")
                        return str(cache_path)
                    else:
                        logger.error(f"Failed to download {filename}: HTTP {response.status}")
                        return None
        
        except Exception as e:
            logger.error(f"Error downloading {filename}: {e}")
            return None
    
    def get_asset_info(self, asset_name: str) -> Optional[AssetInfo]:
        """Get information about an asset without resolving"""
        return self.asset_registry.get(asset_name)
    
    def list_assets(self, asset_type: str = None) -> List[AssetInfo]:
        """List all available assets, optionally filtered by type"""
        assets = list(self.asset_registry.values())
        
        if asset_type:
            # Filter by asset type based on path
            type_path = self.local_paths.get(asset_type, '')
            assets = [a for a in assets if type_path in a.path or asset_type in a.path]
        
        return sorted(assets, key=lambda x: x.name)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        cached_assets = [a for a in self.asset_registry.values() if a.cached]
        total_size = sum(a.size or 0 for a in cached_assets if a.size)
        
        return {
            'total_assets': len(self.asset_registry),
            'cached_assets': len(cached_assets),
            'cache_size_bytes': total_size,
            'cache_size_mb': round(total_size / (1024 * 1024), 2),
            'cache_directory': str(self.cache_dir)
        }
    
    async def cleanup_cache(self, max_size_mb: int = 1000) -> Dict[str, Any]:
        """Clean up cache if it exceeds size limit"""
        stats = self.get_cache_stats()
        current_size_mb = stats['cache_size_mb']
        
        if current_size_mb <= max_size_mb:
            return {'cleaned': False, 'reason': 'Under size limit'}
        
        # Remove oldest cached files
        cached_files = []
        for asset in self.asset_registry.values():
            if asset.cached and asset.source != 'local':
                try:
                    stat = os.stat(asset.path)
                    cached_files.append((asset.path, stat.st_mtime, stat.st_size))
                except OSError:
                    continue
        
        # Sort by modification time (oldest first)
        cached_files.sort(key=lambda x: x[1])
        
        removed_size = 0
        removed_count = 0
        
        for file_path, _, size in cached_files:
            if current_size_mb - (removed_size / (1024 * 1024)) <= max_size_mb:
                break
            
            try:
                os.remove(file_path)
                removed_size += size
                removed_count += 1
                
                # Remove from registry
                for name, asset in list(self.asset_registry.items()):
                    if asset.path == file_path:
                        del self.asset_registry[name]
                        break
                        
            except OSError as e:
                logger.error(f"Error removing cached file {file_path}: {e}")
        
        return {
            'cleaned': True,
            'removed_files': removed_count,
            'freed_mb': round(removed_size / (1024 * 1024), 2),
            'new_size_mb': round((current_size_mb * 1024 * 1024 - removed_size) / (1024 * 1024), 2)
        }
    
    async def validate_asset(self, asset_name: str) -> Dict[str, Any]:
        """Validate an asset's integrity"""
        asset = self.asset_registry.get(asset_name)
        if not asset:
            return {'valid': False, 'error': 'Asset not found in registry'}
        
        if not os.path.exists(asset.path):
            return {'valid': False, 'error': 'Asset file not found'}
        
        # Recalculate hash if available
        if asset.hash:
            current_hash = await self._calculate_file_hash(Path(asset.path))
            if current_hash != asset.hash:
                return {
                    'valid': False, 
                    'error': 'Hash mismatch',
                    'expected': asset.hash,
                    'actual': current_hash
                }
        
        return {'valid': True, 'asset': asset}