from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import StreamingResponse
import uuid
import io
from ..auth import get_current_active_user
from ..models import User
from ..schemas import (
    PresignedUrlRequest, 
    PresignedUrlResponse,
    PresignedDownloadRequest,
    PresignedDownloadResponse
)
from ..storage import storage_service

router = APIRouter(prefix="/storage", tags=["storage"]) 


@router.post("/presigned_put", response_model=PresignedUrlResponse)
async def get_presigned_put_url(
    request: PresignedUrlRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generate presigned PUT URL for file upload"""
    try:
        upload_url, key = storage_service.generate_presigned_put_url(
            request.path_hint, 
            request.content_type
        )
        download_url = storage_service.generate_presigned_get_url(key)
        return PresignedUrlResponse(
            upload_url=upload_url,
            download_url=download_url,
            key=key,
            expires_in=3600  # 1 hour
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )


@router.post("/presigned_get", response_model=PresignedDownloadResponse)
async def get_presigned_get_url(
    request: PresignedDownloadRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generate presigned GET URL for file download"""
    try:
        download_url = storage_service.generate_presigned_get_url(request.key)
        
        return PresignedDownloadResponse(
            download_url=download_url,
            expires_in=3600  # 1 hour
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned download URL: {str(e)}"
        )


@router.post("/upload_multipart")
async def upload_multipart(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a file via multipart form to storage (MinIO or local)."""
    try:
        content = await file.read()
        ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
        key = f"raw/{unique_name}"
        # Use unified storage IO
        content_type = file.content_type or "application/octet-stream"
        storage_service.put_bytes(key, content, content_type)
        return {"key": key, "size": len(content), "content_type": content_type}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload failed: {e}")


@router.get("/proxy_get")
async def proxy_get(
    key: str,
    current_user: User = Depends(get_current_active_user)
):
    """Proxy download an object from storage (MinIO or local)."""
    try:
        data, content_type = storage_service.get_bytes(key)
        filename = key.split('/')[-1]
        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Download failed: {e}")
