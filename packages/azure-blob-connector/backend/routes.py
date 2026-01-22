"""
Azure Blob Storage Connector Routes

FastAPI router for Azure Blob Storage operations.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import StreamingResponse

from .schemas import (
    AzureBlobConfig,
    BlobListRequest,
    BlobListResponse,
    BlobUploadRequest,
    BlobUploadResponse,
    BlobDeleteResponse,
    BlobDownloadResponse,
    SASTokenRequest,
    SASTokenResponse,
)
from .service import AzureBlobService, AzureBlobServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/azure-blob", tags=["Azure Blob Storage"])

# Global service instance (would be dependency injected in production)
_service: Optional[AzureBlobService] = None


def get_service() -> AzureBlobService:
    """Dependency to get Azure Blob service instance."""
    if _service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure Blob connector not configured",
        )
    return _service


def configure_service(config: AzureBlobConfig) -> None:
    """Configure the Azure Blob service with credentials."""
    global _service
    _service = AzureBlobService(config)


@router.post("/configure", status_code=status.HTTP_200_OK)
async def configure(config: AzureBlobConfig) -> dict:
    """Configure the Azure Blob connector with credentials."""
    try:
        configure_service(config)
        service = get_service()
        is_connected = await service.test_connection()

        if not is_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to Azure Blob Storage",
            )

        return {
            "status": "configured",
            "account_name": config.account_name,
            "container_name": config.container_name,
        }

    except AzureBlobServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/upload", response_model=BlobUploadResponse)
async def upload_blob(
    file: UploadFile = File(...),
    name: Optional[str] = Query(None, description="Destination blob name"),
    content_type: Optional[str] = Query(None),
    access_tier: Optional[str] = Query(None),
    service: AzureBlobService = Depends(get_service),
) -> BlobUploadResponse:
    """Upload a blob to the container."""
    try:
        destination_name = name or file.filename

        request = BlobUploadRequest(
            name=destination_name,
            content_type=content_type or file.content_type,
            access_tier=access_tier,
        )

        result = await service.upload_blob(destination_name, file.file, request)
        return result

    except AzureBlobServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/download/{name:path}")
async def download_blob(
    name: str,
    service: AzureBlobService = Depends(get_service),
) -> StreamingResponse:
    """Download a blob from the container."""
    try:
        stream, metadata = await service.download_blob(name)

        return StreamingResponse(
            stream.chunks(),
            media_type=metadata.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{name.split("/")[-1]}"',
                "Content-Length": str(metadata.content_length),
                "ETag": metadata.etag,
            },
        )

    except AzureBlobServiceError as e:
        if e.code == "NotFound":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/list", response_model=BlobListResponse)
async def list_blobs(
    prefix: Optional[str] = Query(None, description="Filter by name prefix"),
    delimiter: Optional[str] = Query(None, description="Delimiter for grouping"),
    max_results: int = Query(1000, ge=1, le=5000),
    include_metadata: bool = Query(False),
    service: AzureBlobService = Depends(get_service),
) -> BlobListResponse:
    """List blobs in the container."""
    try:
        request = BlobListRequest(
            prefix=prefix,
            delimiter=delimiter,
            max_results=max_results,
            include_metadata=include_metadata,
        )

        return await service.list_blobs(request)

    except AzureBlobServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/delete/{name:path}", response_model=BlobDeleteResponse)
async def delete_blob(
    name: str,
    delete_snapshots: Optional[str] = Query(None, description="include or only"),
    service: AzureBlobService = Depends(get_service),
) -> BlobDeleteResponse:
    """Delete a blob from the container."""
    try:
        return await service.delete_blob(name, delete_snapshots)

    except AzureBlobServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sas-token", response_model=SASTokenResponse)
async def generate_sas_token(
    request: SASTokenRequest,
    service: AzureBlobService = Depends(get_service),
) -> SASTokenResponse:
    """Generate a SAS token for secure access to a blob or container."""
    try:
        return await service.generate_sas_token(request)

    except AzureBlobServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/health")
async def health_check() -> dict:
    """Check Azure Blob connector health status."""
    if _service is None:
        return {"status": "unconfigured", "connected": False}

    try:
        is_connected = await _service.test_connection()
        return {"status": "healthy" if is_connected else "unhealthy", "connected": is_connected}
    except Exception as e:
        return {"status": "error", "connected": False, "error": str(e)}
