from minio import Minio
from minio.error import S3Error
import uuid
from datetime import timedelta
from urllib.parse import urlparse, urlunparse
from .config import settings

# Sprint-3: Local storage mode
import os
import mimetypes


class StorageService:
    def __init__(self):
        # Determine mode: 'local' or 'minio'
        self.mode = getattr(settings, 'STORAGE_KIND', 'minio')
        if self.mode == 'local':
            # Local filesystem storage
            self.base_dir = getattr(settings, 'LOCAL_STORAGE_DIR', 'local_storage')
            os.makedirs(self.base_dir, exist_ok=True)
            self.bucket = None
            self.client = None
        else:
            self.client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            self.bucket = settings.MINIO_BUCKET
            # Do NOT crash app startup if MinIO is unreachable on local runs
            try:
                self._ensure_bucket()
            except Exception as e:  # broad catch to avoid startup failure when MinIO DNS/connection fails
                print(f"[storage] MinIO not reachable during startup, continuing without bucket ensure: {e}")

    def _ensure_bucket(self):
        """Create bucket if it doesn't exist (minio mode only)"""
        if self.mode == 'local':
            return
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except (S3Error, Exception) as e:
            # Log and continue; avoid raising at import-time
            print(f"[storage] Error creating/checking bucket: {e}")

    # Sprint-3: Unified IO helpers for both modes
    def _key_path(self, key: str) -> str:
        if self.mode != 'local':
            raise RuntimeError('key_path is only valid in local mode')
        key = key.lstrip('/\\')
        path = os.path.normpath(os.path.join(self.base_dir, key))
        if not path.startswith(os.path.abspath(self.base_dir)):
            raise ValueError('Invalid key path')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    def put_bytes(self, key: str, data: bytes, content_type: str | None = None):
        if self.mode == 'local':
            path = self._key_path(key)
            with open(path, 'wb') as f:
                f.write(data)
            # Optional: write sidecar content-type
            if content_type:
                with open(path + '.ct', 'w', encoding='utf-8') as cf:
                    cf.write(content_type)
            return
        # minio mode
        import io as _io
        self.client.put_object(
            self.bucket,
            key,
            _io.BytesIO(data),
            length=len(data),
            content_type=content_type or 'application/octet-stream'
        )

    def get_bytes(self, key: str) -> tuple[bytes, str]:
        if self.mode == 'local':
            path = self._key_path(key)
            with open(path, 'rb') as f:
                data = f.read()
            # Determine content-type
            ct_path = path + '.ct'
            if os.path.exists(ct_path):
                with open(ct_path, 'r', encoding='utf-8') as cf:
                    content_type = cf.read().strip() or 'application/octet-stream'
            else:
                content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            return data, content_type
        # minio mode
        obj = self.client.get_object(self.bucket, key)
        try:
            data = obj.read()
            content_type = obj.headers.get('Content-Type') or 'application/octet-stream'
        finally:
            obj.close()
            obj.release_conn()
        return data, content_type

    def generate_presigned_put_url(self, path_hint: str, content_type: str) -> tuple[str, str]:
        """Generate presigned PUT URL for upload"""
        file_extension = path_hint.split('.')[-1] if '.' in path_hint else ''
        unique_name = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        unique_key = f"raw/{unique_name}"
        if self.mode == 'local':
            # Return a pseudo URL indicating local mode
            return f"local://{unique_key}", unique_key
        try:
            url = self.client.presigned_put_object(
                self.bucket,
                unique_key,
                expires=timedelta(hours=1)
            )
            return url, unique_key
        except S3Error as e:
            raise Exception(f"Error generating presigned PUT URL: {e}")

    def generate_presigned_get_url(self, key: str) -> str:
        """Generate presigned GET URL for download"""
        if self.mode == 'local':
            return f"local://{key}"
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                key,
                expires=timedelta(hours=1)
            )
            return url
        except S3Error as e:
            raise Exception(f"Error generating presigned GET URL: {e}")

    def check_connection(self) -> bool:
        """Check if storage connection is working"""
        if self.mode == 'local':
            return True
        try:
            self.client.bucket_exists(self.bucket)
            return True
        except Exception:
            return False


storage_service = StorageService()
