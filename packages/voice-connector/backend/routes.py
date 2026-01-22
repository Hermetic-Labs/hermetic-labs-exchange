"""
FastAPI routes for Voice Connector

Provides REST API endpoints for voice recognition,
command processing, and voice-to-reflex-card integration.
"""

from typing import Any, Dict, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body

from .schemas import (
    VoiceCredentials,
    VoiceConnectionConfig,
    VoiceConnectionResponse,
    VoiceRecognitionRequest,
    VoiceRecognitionResponse,
    VoiceCommand,
    VoiceCommandResponse,
    TranscriptEntry,
    VoiceSessionState,
    VoiceToReflexRequest,
    VoiceToReflexResponse,
)
from .service import VoiceService

router = APIRouter(prefix="/voice", tags=["voice"])

# Service instance (in production, use dependency injection)
_service: Optional[VoiceService] = None


def get_service() -> VoiceService:
    """Dependency to get voice service instance"""
    global _service
    if _service is None:
        _service = VoiceService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=VoiceConnectionResponse)
async def connect(
    config: VoiceConnectionConfig,
    credentials: Optional[VoiceCredentials] = Body(None),
    service: VoiceService = Depends(get_service),
) -> VoiceConnectionResponse:
    """Establish voice connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: VoiceService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect voice service"""
    result = await service.disconnect()
    return {"disconnected": result}


# Session Endpoints
@router.get("/session", response_model=VoiceSessionState)
async def get_session_state(
    service: VoiceService = Depends(get_service),
) -> VoiceSessionState:
    """Get current session state"""
    return await service.get_session_state()


@router.post("/start", response_model=VoiceSessionState)
async def start_listening(
    service: VoiceService = Depends(get_service),
) -> VoiceSessionState:
    """Start voice recognition"""
    try:
        return await service.start_listening()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start: {str(e)}")


@router.post("/stop", response_model=VoiceSessionState)
async def stop_listening(
    service: VoiceService = Depends(get_service),
) -> VoiceSessionState:
    """Stop voice recognition"""
    return await service.stop_listening()


# Recognition Endpoints
@router.post("/recognize", response_model=VoiceRecognitionResponse)
async def recognize(
    request: VoiceRecognitionRequest = Body(...),
    service: VoiceService = Depends(get_service),
) -> VoiceRecognitionResponse:
    """Process voice recognition request"""
    try:
        return await service.recognize(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


@router.post("/transcript", response_model=TranscriptEntry)
async def process_transcript(
    transcript: str = Body(..., embed=True),
    confidence: float = Body(1.0, embed=True),
    service: VoiceService = Depends(get_service),
) -> TranscriptEntry:
    """Process a text transcript"""
    try:
        return await service.process_transcript(transcript, confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# Command Endpoints
@router.post("/parse", response_model=Optional[VoiceCommand])
async def parse_command(
    transcript: str = Body(..., embed=True),
    service: VoiceService = Depends(get_service),
) -> Optional[VoiceCommand]:
    """Parse transcript into voice command"""
    try:
        return await service.parse_command(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@router.post("/execute", response_model=VoiceCommandResponse)
async def execute_command(
    command: VoiceCommand = Body(...),
    service: VoiceService = Depends(get_service),
) -> VoiceCommandResponse:
    """Execute a voice command"""
    try:
        return await service.execute_command(command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


# Reflex Card Endpoints
@router.post("/to-reflex", response_model=VoiceToReflexResponse)
async def convert_to_reflex_card(
    request: VoiceToReflexRequest = Body(...),
    service: VoiceService = Depends(get_service),
) -> VoiceToReflexResponse:
    """Convert voice command to reflex card"""
    try:
        return await service.convert_to_reflex_card(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


# History Endpoints
@router.get("/transcripts", response_model=List[TranscriptEntry])
async def get_transcripts(
    limit: int = Query(100, ge=1, le=1000),
    service: VoiceService = Depends(get_service),
) -> List[TranscriptEntry]:
    """Get recent transcripts"""
    return await service.get_transcripts(limit)


@router.get("/commands", response_model=List[VoiceCommand])
async def get_commands(
    limit: int = Query(100, ge=1, le=1000),
    service: VoiceService = Depends(get_service),
) -> List[VoiceCommand]:
    """Get recent commands"""
    return await service.get_commands(limit)


@router.delete("/history")
async def clear_history(
    service: VoiceService = Depends(get_service),
) -> Dict[str, bool]:
    """Clear transcript and command history"""
    await service.clear_history()
    return {"cleared": True}
