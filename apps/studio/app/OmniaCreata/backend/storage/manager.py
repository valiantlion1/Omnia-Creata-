import os
import asyncio
import aiofiles
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
import hashlib
import uuid
import logging
from enum import Enum

from .providers import StorageProvider, LocalStorage, SupabaseStorage
from .processor import ImageProcessor

logger = logging.getLogger(__name__)


class StorageStrategy(Enum):
    """Storage strategy options"""
    LOCAL_ONLY = "local_only"
    CLOUD_ONLY = "cloud_only"
    LOCAL_FIRST = "local_first"  # Try local first, fallback to cloud
    CLOUD_FIRST = "cloud_first"  # Try cloud first, fallback to local
    MIRROR = "mirror"  # Store in both local and cloud


class ProcessingPipeline:
    """Image processing pipeline configuration"""
    
    def __init__(
        self,
        upscale: Optional[Dict[str, Any]] = None,
        enhance: Optional[Dict[str, Any]] = None,
        watermark: Optional[Dict[str, Any]] = None,
        resize: Optional[Dict[str, Any]] = None,
        thumbnail: bool = True,
        format: Optional[str] = None,
        quality: int = 95
    ):
        self.upscale = upscale
        self.enhance = enhance
        self.watermark = watermark
        self.resize = resize
        self.thumbnail = thumbnail
        self.format = format
        self.quality = quality
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for processing"""
        operations = {}
        
        if self.upscale:
            operations['upscale'] = self.upscale
        if self.enhance:
            operations['enhance'] = self.enhance
        if self.watermark:
            operations['watermark'] = self.watermark
        if self.resize:
            operations['resize'] = self.resize
        if self.format:
            operations['format'] = self.format
        
        operations['quality'] = self.quality
        
        return operations


class StorageResult:
    """Result of storage operation"""
    
    def __init__(
        self,
        success: bool,
        file_id: str,
        url: str,
        thumbnail_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        provider: Optional[str] = None,
        processing_time: Optional[float] = None
    ):
        self.success = success
        self.file_id = file_id
        self.url = url
        self.thumbnail_url = thumbnail_url
        self.metadata = metadata or {}
        self.error = error
        self.provider = provider
        self.processing_time = processing_time
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'success': self.success,
            'file_id': self.file_id,
            'url': self.url,
            'thumbnail_url': self.thumbnail_url,
            'metadata': self.metadata,
            'error': self.error,
            'provider': self.provider,
            'processing_time': self.processing_time
        }


class StorageManager:
    """Main storage manager that coordinates providers and processing"""
    
    def __init__(
        self,
        local_storage: Optional[LocalStorage] = None,
        cloud_storage: Optional[SupabaseStorage] = None,
        image_processor: Optional[ImageProcessor] = None,
        strategy: StorageStrategy = StorageStrategy.LOCAL_FIRST,
        default_pipeline: Optional[ProcessingPipeline] = None
    ):
        self.local_storage = local_storage or LocalStorage()
        self.cloud_storage = cloud_storage
        self.image_processor = image_processor or ImageProcessor()
        self.strategy = strategy
        self.default_pipeline = default_pipeline or ProcessingPipeline()
        
        # Storage providers list for fallback
        self.providers: List[Tuple[str, StorageProvider]] = []
        self._setup_providers()
        
        # Cache for file locations
        self._file_cache: Dict[str, Dict[str, Any]] = {}
        
        logger.info(f"StorageManager initialized with strategy: {strategy.value}")
    
    def _setup_providers(self):
        """Setup provider list based on strategy"""
        self.providers.clear()
        
        if self.strategy == StorageStrategy.LOCAL_ONLY:
            self.providers.append(("local", self.local_storage))
        
        elif self.strategy == StorageStrategy.CLOUD_ONLY:
            if self.cloud_storage:
                self.providers.append(("cloud", self.cloud_storage))
            else:
                logger.warning("Cloud storage not configured, falling back to local")
                self.providers.append(("local", self.local_storage))
        
        elif self.strategy == StorageStrategy.LOCAL_FIRST:
            self.providers.append(("local", self.local_storage))
            if self.cloud_storage:
                self.providers.append(("cloud", self.cloud_storage))
        
        elif self.strategy == StorageStrategy.CLOUD_FIRST:
            if self.cloud_storage:
                self.providers.append(("cloud", self.cloud_storage))
            self.providers.append(("local", self.local_storage))
        
        elif self.strategy == StorageStrategy.MIRROR:
            self.providers.append(("local", self.local_storage))
            if self.cloud_storage:
                self.providers.append(("cloud", self.cloud_storage))
    
    async def store_image(
        self,
        image_data: bytes,
        filename: str,
        pipeline: Optional[ProcessingPipeline] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> StorageResult:
        """Store image with optional processing"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Use provided pipeline or default
            processing_pipeline = pipeline or self.default_pipeline
            
            # Process image if pipeline is configured
            processed_data = image_data
            processing_metadata = {}
            
            if processing_pipeline and any([
                processing_pipeline.upscale,
                processing_pipeline.enhance,
                processing_pipeline.watermark,
                processing_pipeline.resize,
                processing_pipeline.format
            ]):
                processed_data, processing_metadata = await self.image_processor.process_image(
                    image_data, processing_pipeline.to_dict()
                )
                logger.info("Image processed successfully")
            
            # Create thumbnail if requested
            thumbnail_data = None
            if processing_pipeline.thumbnail:
                try:
                    thumbnail_data = await self.image_processor.create_thumbnail(processed_data)
                    logger.info("Thumbnail created successfully")
                except Exception as e:
                    logger.warning(f"Failed to create thumbnail: {e}")
            
            # Combine metadata
            combined_metadata = {
                **(metadata or {}),
                **processing_metadata,
                'original_filename': filename,
                'stored_at': datetime.utcnow().isoformat(),
                'strategy': self.strategy.value
            }
            
            # Store based on strategy
            if self.strategy == StorageStrategy.MIRROR:
                return await self._store_mirror(
                    processed_data, filename, combined_metadata, thumbnail_data, start_time
                )
            else:
                return await self._store_fallback(
                    processed_data, filename, combined_metadata, thumbnail_data, start_time
                )
        
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"Error storing image: {e}")
            return StorageResult(
                success=False,
                file_id="",
                url="",
                error=str(e),
                processing_time=processing_time
            )
    
    async def _store_fallback(
        self,
        image_data: bytes,
        filename: str,
        metadata: Dict[str, Any],
        thumbnail_data: Optional[bytes],
        start_time: float
    ) -> StorageResult:
        """Store with fallback strategy"""
        last_error = None
        
        for provider_name, provider in self.providers:
            try:
                # Store main image
                result = await provider.upload_file(
                    image_data, filename, metadata=metadata
                )
                
                # Store thumbnail if available
                thumbnail_url = None
                if thumbnail_data:
                    try:
                        thumb_filename = f"thumb_{filename}"
                        thumb_result = await provider.upload_file(
                            thumbnail_data, thumb_filename, "image/jpeg"
                        )
                        thumbnail_url = thumb_result['url']
                    except Exception as e:
                        logger.warning(f"Failed to store thumbnail with {provider_name}: {e}")
                
                # Cache file location
                self._file_cache[result['id']] = {
                    'provider': provider_name,
                    'url': result['url'],
                    'thumbnail_url': thumbnail_url,
                    'metadata': metadata
                }
                
                processing_time = asyncio.get_event_loop().time() - start_time
                
                logger.info(f"Image stored successfully with {provider_name}")
                
                return StorageResult(
                    success=True,
                    file_id=result['id'],
                    url=result['url'],
                    thumbnail_url=thumbnail_url,
                    metadata=metadata,
                    provider=provider_name,
                    processing_time=processing_time
                )
            
            except Exception as e:
                last_error = e
                logger.warning(f"Failed to store with {provider_name}: {e}")
                continue
        
        # All providers failed
        processing_time = asyncio.get_event_loop().time() - start_time
        return StorageResult(
            success=False,
            file_id="",
            url="",
            error=f"All storage providers failed. Last error: {last_error}",
            processing_time=processing_time
        )
    
    async def _store_mirror(
        self,
        image_data: bytes,
        filename: str,
        metadata: Dict[str, Any],
        thumbnail_data: Optional[bytes],
        start_time: float
    ) -> StorageResult:
        """Store in multiple providers (mirror strategy)"""
        results = []
        errors = []
        
        # Store in all providers
        for provider_name, provider in self.providers:
            try:
                result = await provider.upload_file(
                    image_data, filename, metadata=metadata
                )
                
                # Store thumbnail if available
                thumbnail_url = None
                if thumbnail_data:
                    try:
                        thumb_filename = f"thumb_{filename}"
                        thumb_result = await provider.upload_file(
                            thumbnail_data, thumb_filename, "image/jpeg"
                        )
                        thumbnail_url = thumb_result['url']
                    except Exception as e:
                        logger.warning(f"Failed to store thumbnail with {provider_name}: {e}")
                
                results.append({
                    'provider': provider_name,
                    'result': result,
                    'thumbnail_url': thumbnail_url
                })
                
                logger.info(f"Image stored successfully with {provider_name}")
            
            except Exception as e:
                errors.append(f"{provider_name}: {e}")
                logger.warning(f"Failed to store with {provider_name}: {e}")
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        if not results:
            return StorageResult(
                success=False,
                file_id="",
                url="",
                error=f"All providers failed: {'; '.join(errors)}",
                processing_time=processing_time
            )
        
        # Use first successful result as primary
        primary_result = results[0]
        
        # Cache all locations
        file_id = primary_result['result']['id']
        self._file_cache[file_id] = {
            'providers': {r['provider']: r['result']['url'] for r in results},
            'primary_provider': primary_result['provider'],
            'url': primary_result['result']['url'],
            'thumbnail_url': primary_result['thumbnail_url'],
            'metadata': metadata,
            'mirrors': len(results)
        }
        
        return StorageResult(
            success=True,
            file_id=file_id,
            url=primary_result['result']['url'],
            thumbnail_url=primary_result['thumbnail_url'],
            metadata={
                **metadata,
                'mirrors': len(results),
                'mirror_providers': [r['provider'] for r in results],
                'errors': errors if errors else None
            },
            provider=primary_result['provider'],
            processing_time=processing_time
        )
    
    async def get_file(self, file_id: str) -> Optional[bytes]:
        """Retrieve file by ID"""
        try:
            # Check cache first
            if file_id in self._file_cache:
                cache_info = self._file_cache[file_id]
                
                if 'provider' in cache_info:
                    # Single provider
                    provider_name = cache_info['provider']
                    provider = next((p for n, p in self.providers if n == provider_name), None)
                    
                    if provider:
                        return await provider.download_file(file_id)
                
                elif 'providers' in cache_info:
                    # Multiple providers (mirror)
                    for provider_name in cache_info['providers']:
                        provider = next((p for n, p in self.providers if n == provider_name), None)
                        if provider:
                            try:
                                return await provider.download_file(file_id)
                            except Exception as e:
                                logger.warning(f"Failed to download from {provider_name}: {e}")
                                continue
            
            # Try all providers if not in cache
            for provider_name, provider in self.providers:
                try:
                    return await provider.download_file(file_id)
                except Exception as e:
                    logger.warning(f"Failed to download from {provider_name}: {e}")
                    continue
            
            logger.error(f"File {file_id} not found in any provider")
            return None
        
        except Exception as e:
            logger.error(f"Error retrieving file {file_id}: {e}")
            return None
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete file from all providers"""
        try:
            success = False
            
            # Delete from all providers
            for provider_name, provider in self.providers:
                try:
                    if await provider.delete_file(file_id):
                        success = True
                        logger.info(f"File {file_id} deleted from {provider_name}")
                except Exception as e:
                    logger.warning(f"Failed to delete from {provider_name}: {e}")
            
            # Remove from cache
            if file_id in self._file_cache:
                del self._file_cache[file_id]
            
            return success
        
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {e}")
            return False
    
    async def get_file_url(self, file_id: str, expires_in: int = 3600) -> Optional[str]:
        """Get public URL for file"""
        try:
            # Check cache first
            if file_id in self._file_cache:
                cache_info = self._file_cache[file_id]
                
                if 'url' in cache_info:
                    return cache_info['url']
            
            # Try providers
            for provider_name, provider in self.providers:
                try:
                    return await provider.get_file_url(file_id, expires_in)
                except Exception as e:
                    logger.warning(f"Failed to get URL from {provider_name}: {e}")
                    continue
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting URL for file {file_id}: {e}")
            return None
    
    async def list_files(
        self, 
        provider: Optional[str] = None, 
        prefix: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files from providers"""
        try:
            if provider:
                # List from specific provider
                target_provider = next((p for n, p in self.providers if n == provider), None)
                if target_provider:
                    return await target_provider.list_files(prefix, limit)
                else:
                    logger.warning(f"Provider {provider} not found")
                    return []
            
            # List from all providers and merge
            all_files = []
            seen_ids = set()
            
            for provider_name, provider_instance in self.providers:
                try:
                    files = await provider_instance.list_files(prefix, limit)
                    
                    for file_info in files:
                        file_id = file_info['id']
                        if file_id not in seen_ids:
                            file_info['provider'] = provider_name
                            all_files.append(file_info)
                            seen_ids.add(file_id)
                
                except Exception as e:
                    logger.warning(f"Failed to list files from {provider_name}: {e}")
            
            # Sort by creation date (newest first)
            all_files.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            return all_files[:limit]
        
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            stats = {
                'strategy': self.strategy.value,
                'providers': [],
                'cache_size': len(self._file_cache),
                'total_files': 0,
                'total_size': 0
            }
            
            for provider_name, provider in self.providers:
                try:
                    files = await provider.list_files(limit=1000)
                    provider_stats = {
                        'name': provider_name,
                        'file_count': len(files),
                        'total_size': sum(f.get('size', 0) for f in files),
                        'available': True
                    }
                    
                    stats['providers'].append(provider_stats)
                    stats['total_files'] += provider_stats['file_count']
                    stats['total_size'] += provider_stats['total_size']
                
                except Exception as e:
                    stats['providers'].append({
                        'name': provider_name,
                        'file_count': 0,
                        'total_size': 0,
                        'available': False,
                        'error': str(e)
                    })
            
            return stats
        
        except Exception as e:
            logger.error(f"Error getting storage stats: {e}")
            return {'error': str(e)}
    
    async def cleanup_cache(self, max_age_hours: int = 24):
        """Clean up old cache entries"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
            
            to_remove = []
            for file_id, cache_info in self._file_cache.items():
                stored_at = cache_info.get('metadata', {}).get('stored_at')
                if stored_at:
                    try:
                        stored_time = datetime.fromisoformat(stored_at.replace('Z', '+00:00'))
                        if stored_time < cutoff_time:
                            to_remove.append(file_id)
                    except Exception:
                        pass
            
            for file_id in to_remove:
                del self._file_cache[file_id]
            
            logger.info(f"Cleaned up {len(to_remove)} cache entries")
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")