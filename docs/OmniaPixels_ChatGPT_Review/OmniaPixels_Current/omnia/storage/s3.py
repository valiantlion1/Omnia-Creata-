from minio import Minio
from minio.error import S3Error
from core.config import settings
import logging
from datetime import timedelta
from typing import Optional

# MinIO client
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False  # Set to True for HTTPS
)

def ensure_bucket_exists():
    """Create bucket if it doesn't exist"""
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
            logging.info(f"Created bucket: {settings.MINIO_BUCKET}")
    except S3Error as e:
        logging.error(f"Error creating bucket: {e}")

def make_input_key(filename: str) -> str:
    """Generate S3 key for input file"""
    import uuid
    file_id = str(uuid.uuid4())
    return f"inputs/{file_id}/{filename}"

def make_output_key(job_id: str, filename: str) -> str:
    """Generate S3 key for output file"""
    return f"outputs/{job_id}/{filename}"

def make_preview_key(job_id: str) -> str:
    """Generate S3 key for preview file"""
    return f"previews/{job_id}/preview.jpg"

def get_presigned_put(key: str, expires: int = 3600) -> str:
    """Get presigned URL for uploading file"""
    try:
        ensure_bucket_exists()
        url = minio_client.presigned_put_object(
            settings.MINIO_BUCKET,
            key,
            expires=timedelta(seconds=expires)
        )
        return url
    except S3Error as e:
        logging.error(f"Error generating presigned PUT URL: {e}")
        raise

def get_presigned_get(key: str, expires: int = 3600) -> str:
    """Get presigned URL for downloading file"""
    try:
        url = minio_client.presigned_get_object(
            settings.MINIO_BUCKET,
            key,
            expires=timedelta(seconds=expires)
        )
        return url
    except S3Error as e:
        logging.error(f"Error generating presigned GET URL: {e}")
        raise

def upload_file(key: str, file_path: str) -> bool:
    """Upload file to S3"""
    try:
        ensure_bucket_exists()
        minio_client.fput_object(settings.MINIO_BUCKET, key, file_path)
        logging.info(f"Uploaded file: {key}")
        return True
    except S3Error as e:
        logging.error(f"Error uploading file: {e}")
        return False

def download_file(key: str, file_path: str) -> bool:
    """Download file from S3"""
    try:
        minio_client.fget_object(settings.MINIO_BUCKET, key, file_path)
        logging.info(f"Downloaded file: {key}")
        return True
    except S3Error as e:
        logging.error(f"Error downloading file: {e}")
        return False

def delete_file(key: str) -> bool:
    """Delete file from S3"""
    try:
        minio_client.remove_object(settings.MINIO_BUCKET, key)
        logging.info(f"Deleted file: {key}")
        return True
    except S3Error as e:
        logging.error(f"Error deleting file: {e}")
        return False

def list_files(prefix: str = "") -> list:
    """List files with given prefix"""
    try:
        objects = minio_client.list_objects(settings.MINIO_BUCKET, prefix=prefix)
        return [obj.object_name for obj in objects]
    except S3Error as e:
        logging.error(f"Error listing files: {e}")
        return []
