import os
import asyncio
import aiofiles
from pathlib import Path
from typing import Dict, List, Optional, Any, BinaryIO
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
import hashlib
import uuid
import logging
from urllib.parse import urljoin

try:
    from supabase import create_client, Client
except ImportError:
    Client = None

logger = logging.getLogger(__name__)


class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    async def upload_file(
        self, 
        file_data: bytes, 
        filename: str, 
        content_type: str = "image/jpeg",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Upload file and return storage info"""
        pass
    
    @abstractmethod
    async def download_file(self, file_id: str) -> bytes:
        """Download file by ID"""
        pass
    
    @abstractmethod
    async def delete_file(self, file_id: str) -> bool:
        """Delete file by ID"""
        pass
    
    @abstractmethod
    async def get_file_url(self, file_id: str, expires_in: int = 3600) -> str:
        """Get public URL for file"""
        pass
    
    @abstractmethod
    async def list_files(
        self, 
        prefix: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files with optional prefix filter"""
        pass


class LocalStorage(StorageProvider):
    """Local filesystem storage provider"""
    
    def __init__(self, base_path: str = "./storage", base_url: str = "http://localhost:8000/files"):
        self.base_path = Path(base_path)
        self.base_url = base_url
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.base_path / "images").mkdir(exist_ok=True)
        (self.base_path / "thumbnails").mkdir(exist_ok=True)
        (self.base_path / "temp").mkdir(exist_ok=True)
    
    def _generate_file_id(self, filename: str) -> str:
        """Generate unique file ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        name, ext = os.path.splitext(filename)
        return f"{timestamp}_{unique_id}_{name}{ext}"
    
    def _get_file_path(self, file_id: str, subfolder: str = "images") -> Path:
        """Get full file path"""
        return self.base_path / subfolder / file_id
    
    async def upload_file(
        self, 
        file_data: bytes, 
        filename: str, 
        content_type: str = "image/jpeg",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Upload file to local storage"""
        try:
            file_id = self._generate_file_id(filename)
            file_path = self._get_file_path(file_id)
            
            # Write file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_data)
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_data).hexdigest()
            
            # Store metadata
            metadata_file = file_path.with_suffix('.json')
            file_metadata = {
                'id': file_id,
                'filename': filename,
                'content_type': content_type,
                'size': len(file_data),
                'hash': file_hash,
                'created_at': datetime.utcnow().isoformat(),
                'metadata': metadata or {}
            }
            
            async with aiofiles.open(metadata_file, 'w') as f:
                import json
                await f.write(json.dumps(file_metadata, indent=2))
            
            logger.info(f"Uploaded file {file_id} to local storage")
            
            return {
                'id': file_id,
                'url': f"{self.base_url}/images/{file_id}",
                'size': len(file_data),
                'hash': file_hash,
                'created_at': datetime.utcnow(),
                'provider': 'local'
            }
            
        except Exception as e:
            logger.error(f"Error uploading file to local storage: {e}")
            raise
    
    async def download_file(self, file_id: str) -> bytes:
        """Download file from local storage"""
        try:
            file_path = self._get_file_path(file_id)
            
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_id}")
            
            async with aiofiles.open(file_path, 'rb') as f:
                return await f.read()
                
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {e}")
            raise
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete file from local storage"""
        try:
            file_path = self._get_file_path(file_id)
            metadata_file = file_path.with_suffix('.json')
            
            deleted = False
            
            if file_path.exists():
                file_path.unlink()
                deleted = True
            
            if metadata_file.exists():
                metadata_file.unlink()
            
            # Also check thumbnails
            thumb_path = self._get_file_path(file_id, "thumbnails")
            if thumb_path.exists():
                thumb_path.unlink()
            
            logger.info(f"Deleted file {file_id} from local storage")
            return deleted
            
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {e}")
            return False
    
    async def get_file_url(self, file_id: str, expires_in: int = 3600) -> str:
        """Get public URL for file (local storage doesn't expire)"""
        return f"{self.base_url}/images/{file_id}"
    
    async def list_files(
        self, 
        prefix: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files in local storage"""
        try:
            files = []
            images_dir = self.base_path / "images"
            
            if not images_dir.exists():
                return files
            
            for file_path in images_dir.iterdir():
                if file_path.is_file() and not file_path.suffix == '.json':
                    if prefix and not file_path.name.startswith(prefix):
                        continue
                    
                    # Load metadata if available
                    metadata_file = file_path.with_suffix('.json')
                    metadata = {}
                    
                    if metadata_file.exists():
                        try:
                            async with aiofiles.open(metadata_file, 'r') as f:
                                import json
                                content = await f.read()
                                metadata = json.loads(content)
                        except Exception:
                            pass
                    
                    file_info = {
                        'id': file_path.name,
                        'filename': metadata.get('filename', file_path.name),
                        'size': file_path.stat().st_size,
                        'created_at': datetime.fromtimestamp(file_path.stat().st_ctime),
                        'url': f"{self.base_url}/images/{file_path.name}",
                        'metadata': metadata.get('metadata', {})
                    }
                    
                    files.append(file_info)
                    
                    if len(files) >= limit:
                        break
            
            return sorted(files, key=lambda x: x['created_at'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []


class SupabaseStorage(StorageProvider):
    """Supabase storage provider"""
    
    def __init__(
        self, 
        url: str, 
        key: str, 
        bucket_name: str = "images",
        public_url: Optional[str] = None
    ):
        if Client is None:
            raise ImportError("supabase package is required for SupabaseStorage")
        
        self.client: Client = create_client(url, key)
        self.bucket_name = bucket_name
        self.public_url = public_url or url
        
        # Ensure bucket exists
        try:
            self.client.storage.get_bucket(bucket_name)
        except Exception:
            # Create bucket if it doesn't exist
            try:
                self.client.storage.create_bucket(bucket_name, {"public": True})
                logger.info(f"Created Supabase bucket: {bucket_name}")
            except Exception as e:
                logger.warning(f"Could not create bucket {bucket_name}: {e}")
    
    def _generate_file_path(self, filename: str, folder: str = "generated") -> str:
        """Generate file path in bucket"""
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        unique_id = str(uuid.uuid4())[:8]
        name, ext = os.path.splitext(filename)
        return f"{folder}/{timestamp}/{unique_id}_{name}{ext}"
    
    async def upload_file(
        self, 
        file_data: bytes, 
        filename: str, 
        content_type: str = "image/jpeg",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Upload file to Supabase storage"""
        try:
            file_path = self._generate_file_path(filename)
            
            # Upload file
            result = self.client.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_data,
                file_options={
                    "content-type": content_type,
                    "upsert": True
                }
            )
            
            if result.get('error'):
                raise Exception(f"Supabase upload error: {result['error']}")
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(file_path)
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_data).hexdigest()
            
            logger.info(f"Uploaded file {file_path} to Supabase storage")
            
            return {
                'id': file_path,
                'url': public_url,
                'size': len(file_data),
                'hash': file_hash,
                'created_at': datetime.utcnow(),
                'provider': 'supabase'
            }
            
        except Exception as e:
            logger.error(f"Error uploading file to Supabase: {e}")
            raise
    
    async def download_file(self, file_id: str) -> bytes:
        """Download file from Supabase storage"""
        try:
            result = self.client.storage.from_(self.bucket_name).download(file_id)
            
            if isinstance(result, dict) and result.get('error'):
                raise Exception(f"Supabase download error: {result['error']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading file {file_id} from Supabase: {e}")
            raise
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete file from Supabase storage"""
        try:
            result = self.client.storage.from_(self.bucket_name).remove([file_id])
            
            if result.get('error'):
                logger.error(f"Supabase delete error: {result['error']}")
                return False
            
            logger.info(f"Deleted file {file_id} from Supabase storage")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file {file_id} from Supabase: {e}")
            return False
    
    async def get_file_url(self, file_id: str, expires_in: int = 3600) -> str:
        """Get signed URL for file"""
        try:
            # For public buckets, return public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(file_id)
            
            if public_url:
                return public_url
            
            # For private buckets, create signed URL
            signed_url = self.client.storage.from_(self.bucket_name).create_signed_url(
                file_id, expires_in
            )
            
            if signed_url.get('error'):
                raise Exception(f"Error creating signed URL: {signed_url['error']}")
            
            return signed_url['signedURL']
            
        except Exception as e:
            logger.error(f"Error getting file URL for {file_id}: {e}")
            raise
    
    async def list_files(
        self, 
        prefix: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files in Supabase storage"""
        try:
            options = {
                "limit": limit,
                "sortBy": {"column": "created_at", "order": "desc"}
            }
            
            if prefix:
                options["search"] = prefix
            
            result = self.client.storage.from_(self.bucket_name).list(
                path="", options=options
            )
            
            if isinstance(result, dict) and result.get('error'):
                raise Exception(f"Supabase list error: {result['error']}")
            
            files = []
            for item in result:
                if item.get('name') and not item.get('name').endswith('/'):
                    file_info = {
                        'id': item['name'],
                        'filename': os.path.basename(item['name']),
                        'size': item.get('metadata', {}).get('size', 0),
                        'created_at': datetime.fromisoformat(item['created_at'].replace('Z', '+00:00')),
                        'url': self.client.storage.from_(self.bucket_name).get_public_url(item['name']),
                        'metadata': item.get('metadata', {})
                    }
                    files.append(file_info)
            
            return files
            
        except Exception as e:
            logger.error(f"Error listing files from Supabase: {e}")
            return []