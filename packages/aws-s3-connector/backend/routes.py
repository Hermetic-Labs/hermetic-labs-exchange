"""
AWS S3 Connector Routes

FastAPI router for S3 storage operations.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import StreamingResponse

from .schemas import (
    S3Config,
    S3ListRequest,
    S3ListResponse,
    S3UploadRequest,
    S3UploadResponse,
    S3DeleteRequest,
    S3DeleteResponse,
    S3PresignedUrlRequest,
    S3PresignedUrlResponse,
    S3DownloadResponse,
)
from .service import S3Service, S3ServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/s3", tags=["AWS S3"])

# Global service instance (would be dependency injected in production)
_service: Optional[S3Service] = None


def get_service() -> S3Service:
    """Dependency to get S3 service instance."""
    if _service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3 connector not configured",
        )
    return _service


def configure_service(config: S3Config) -> None:
    """Configure the S3 service with credentials."""
    global _service
    _service = S3Service(config)


@router.post("/configure", status_code=status.HTTP_200_OK)
async def configure(config: S3Config) -> dict:
    """Configure the S3 connector with credentials."""
    try:
        configure_service(config)
        service = get_service()
        is_connected = await service.test_connection()

        if not is_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to S3 bucket",
            )

        return {"status": "configured", "bucket": config.bucket, "region": config.region}

    except S3ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/upload", response_model=S3UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    key: Optional[str] = Query(None, description="Destination key/path"),
    content_type: Optional[str] = Query(None),
    storage_class: Optional[str] = Query(None),
    service: S3Service = Depends(get_service),
) -> S3UploadResponse:
    """Upload a file to S3."""
    try:
        destination_key = key or file.filename

        request = S3UploadRequest(
            key=destination_key,
            content_type=content_type or file.content_type,
            storage_class=storage_class,
        )

        result = await service.upload_object(destination_key, file.file, request)
        return result

    except S3ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/download/{key:path}")
async def download_file(
    key: str,
    service: S3Service = Depends(get_service),
) -> StreamingResponse:
    """Download a file from S3."""
    try:
        body, metadata = await service.download_object(key)

        return StreamingResponse(
            body,
            media_type=metadata.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{key.split("/")[-1]}"',
                "Content-Length": str(metadata.content_length),
                "ETag": metadata.etag,
            },
        )

    except S3ServiceError as e:
        if e.code == "NotFound":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/list", response_model=S3ListResponse)
async def list_objects(
    prefix: Optional[str] = Query(None, description="Filter by key prefix"),
    delimiter: Optional[str] = Query(None, description="Delimiter for grouping"),
    max_keys: int = Query(1000, ge=1, le=1000),
    continuation_token: Optional[str] = Query(None, description="Pagination token"),
    service: S3Service = Depends(get_service),
) -> S3ListResponse:
    """List objects in the S3 bucket."""
    try:
        request = S3ListRequest(
            prefix=prefix,
            delimiter=delimiter,
            max_keys=max_keys,
            continuation_token=continuation_token,
        )

        return await service.list_objects(request)

    except S3ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/delete/{key:path}", response_model=S3DeleteResponse)
async def delete_object(
    key: str,
    version_id: Optional[str] = Query(None, description="Specific version to delete"),
    service: S3Service = Depends(get_service),
) -> S3DeleteResponse:
    """Delete an object from S3."""
    try:
        return await service.delete_object(key, version_id)

    except S3ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/presigned-url", response_model=S3PresignedUrlResponse)
async def generate_presigned_url(
    request: S3PresignedUrlRequest,
    service: S3Service = Depends(get_service),
) -> S3PresignedUrlResponse:
    """Generate a presigned URL for secure access to an object."""
    try:
        return await service.generate_presigned_url(request)

    except S3ServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/health")
async def health_check() -> dict:
    """Check S3 connector health status."""
    if _service is None:
        return {"status": "unconfigured", "connected": False}

    try:
        is_connected = await _service.test_connection()
        return {"status": "healthy" if is_connected else "unhealthy", "connected": is_connected}
    except Exception as e:
        return {"status": "error", "connected": False, "error": str(e)}
