"""
Google Cloud Storage Connector Routes

FastAPI router for GCS storage operations.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import StreamingResponse

from .schemas import (
    GCSConfig,
    ObjectListRequest,
    ObjectListResponse,
    ObjectUploadRequest,
    ObjectUploadResponse,
    ObjectDeleteResponse,
    ObjectDownloadResponse,
    SignedUrlRequest,
    SignedUrlResponse,
)
from .service import GCSService, GCSServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gcs", tags=["Google Cloud Storage"])

# Global service instance (would be dependency injected in production)
_service: Optional[GCSService] = None


def get_service() -> GCSService:
    """Dependency to get GCS service instance."""
    if _service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GCS connector not configured",
        )
    return _service


def configure_service(config: GCSConfig) -> None:
    """Configure the GCS service with credentials."""
    global _service
    _service = GCSService(config)


@router.post("/configure", status_code=status.HTTP_200_OK)
async def configure(config: GCSConfig) -> dict:
    """Configure the GCS connector with credentials."""
    try:
        configure_service(config)
        service = get_service()
        is_connected = await service.test_connection()

        if not is_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to GCS bucket",
            )

        return {
            "status": "configured",
            "project_id": config.project_id,
            "bucket": config.bucket,
        }

    except GCSServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/upload", response_model=ObjectUploadResponse)
async def upload_object(
    file: UploadFile = File(...),
    name: Optional[str] = Query(None, description="Destination object name"),
    content_type: Optional[str] = Query(None),
    storage_class: Optional[str] = Query(None),
    service: GCSService = Depends(get_service),
) -> ObjectUploadResponse:
    """Upload a file to GCS."""
    try:
        destination_name = name or file.filename

        request = ObjectUploadRequest(
            name=destination_name,
            content_type=content_type or file.content_type,
            storage_class=storage_class,
        )

        result = await service.upload_object(destination_name, file.file, request)
        return result

    except GCSServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/download/{name:path}")
async def download_object(
    name: str,
    service: GCSService = Depends(get_service),
) -> StreamingResponse:
    """Download a file from GCS."""
    try:
        content, metadata = await service.download_object(name)

        return StreamingResponse(
            content,
            media_type=metadata.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{name.split("/")[-1]}"',
                "Content-Length": str(metadata.content_length),
                "ETag": metadata.etag,
            },
        )

    except GCSServiceError as e:
        if e.code == "NotFound":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/list", response_model=ObjectListResponse)
async def list_objects(
    prefix: Optional[str] = Query(None, description="Filter by name prefix"),
    delimiter: Optional[str] = Query(None, description="Delimiter for grouping"),
    max_results: int = Query(1000, ge=1, le=1000),
    page_token: Optional[str] = Query(None, description="Pagination token"),
    service: GCSService = Depends(get_service),
) -> ObjectListResponse:
    """List objects in the GCS bucket."""
    try:
        request = ObjectListRequest(
            prefix=prefix,
            delimiter=delimiter,
            max_results=max_results,
            page_token=page_token,
        )

        return await service.list_objects(request)

    except GCSServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/delete/{name:path}", response_model=ObjectDeleteResponse)
async def delete_object(
    name: str,
    generation: Optional[str] = Query(None, description="Specific generation to delete"),
    service: GCSService = Depends(get_service),
) -> ObjectDeleteResponse:
    """Delete an object from GCS."""
    try:
        return await service.delete_object(name, generation)

    except GCSServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/signed-url", response_model=SignedUrlResponse)
async def generate_signed_url(
    request: SignedUrlRequest,
    service: GCSService = Depends(get_service),
) -> SignedUrlResponse:
    """Generate a signed URL for secure access to an object."""
    try:
        return await service.generate_signed_url(request)

    except GCSServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/health")
async def health_check() -> dict:
    """Check GCS connector health status."""
    if _service is None:
        return {"status": "unconfigured", "connected": False}

    try:
        is_connected = await _service.test_connection()
        return {"status": "healthy" if is_connected else "unhealthy", "connected": is_connected}
    except Exception as e:
        return {"status": "error", "connected": False, "error": str(e)}
