"""
Voice Connector Backend Module

Provides FastAPI routes and services for voice recognition,
command processing, and voice-to-reflex-card integration.
"""

from .routes import router
from .service import VoiceService
from .schemas import (
    VoiceCredentials,
    VoiceConnectionConfig,
    VoiceRecognitionRequest,
    VoiceRecognitionResponse,
    VoiceCommand,
    VoiceCommandResponse,
    TranscriptEntry,
    MedicalTerm,
    VoiceSessionState,
)

__all__ = [
    # Router
    "router",
    # Service
    "VoiceService",
    # Schemas
    "VoiceCredentials",
    "VoiceConnectionConfig",
    "VoiceRecognitionRequest",
    "VoiceRecognitionResponse",
    "VoiceCommand",
    "VoiceCommandResponse",
    "TranscriptEntry",
    "MedicalTerm",
    "VoiceSessionState",
]
