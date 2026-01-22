"""
Pydantic schemas for Voice Connector API
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class VoiceEventType(str, Enum):
    """Voice event types"""
    SPEECH = "speech"
    COMMAND = "command"
    ERROR = "error"
    SILENCE = "silence"
    CONFIDENCE_LOW = "confidence_low"
    MEDICAL_TERM = "medical_term"


class MedicalTermCategory(str, Enum):
    """Medical term categories"""
    ANATOMY = "anatomy"
    SYMPTOM = "symptom"
    PROCEDURE = "procedure"
    MEDICATION = "medication"
    DEVICE = "device"
    MEASUREMENT = "measurement"
    CONDITION = "condition"


class SessionState(str, Enum):
    """Voice session states"""
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"
    ERROR = "error"


# Connection Schemas
class VoiceCredentials(BaseModel):
    """Voice service credentials"""
    api_key: Optional[str] = Field(None, description="API key for cloud speech services")
    provider: str = Field(default="browser", description="Speech provider: browser, google, azure, aws")


class VoiceConnectionConfig(BaseModel):
    """Voice connection configuration"""
    language: str = Field(default="en-US", description="Recognition language")
    continuous: bool = Field(default=True, description="Continuous listening mode")
    interim_results: bool = Field(default=True, description="Return interim results")
    max_alternatives: int = Field(default=3, ge=1, le=10, description="Maximum alternatives")
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum confidence")
    medical_mode: bool = Field(default=False, description="Enable medical vocabulary")
    auto_execute: bool = Field(default=False, description="Auto-execute recognized commands")


class VoiceConnectionResponse(BaseModel):
    """Voice connection response"""
    connected: bool
    language: str
    medical_mode: bool
    provider: str


# Recognition Schemas
class MedicalTerm(BaseModel):
    """Recognized medical term"""
    term: str
    aliases: List[str] = Field(default_factory=list)
    category: MedicalTermCategory
    confidence: float = Field(ge=0.0, le=1.0)
    definition: Optional[str] = None


class TranscriptEntry(BaseModel):
    """Transcript entry"""
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    is_final: bool = True
    alternatives: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    medical_terms: List[MedicalTerm] = Field(default_factory=list)


class VoiceRecognitionRequest(BaseModel):
    """Voice recognition request"""
    audio_data: Optional[str] = Field(None, description="Base64 encoded audio data")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    language: str = Field(default="en-US")
    medical_mode: bool = False


class VoiceRecognitionResponse(BaseModel):
    """Voice recognition response"""
    success: bool
    transcript: Optional[TranscriptEntry] = None
    error: Optional[str] = None
    processing_time_ms: int


# Command Schemas
class VoiceCommand(BaseModel):
    """Parsed voice command"""
    verb: str = Field(description="Action verb")
    noun: str = Field(description="Target noun")
    modifiers: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(ge=0.0, le=1.0)
    medical_term: Optional[str] = None
    context: Optional[str] = None
    original_transcript: str


class VoiceCommandResponse(BaseModel):
    """Voice command execution response"""
    success: bool
    command: VoiceCommand
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_ms: int


class VoiceSessionState(BaseModel):
    """Voice session state"""
    state: SessionState = SessionState.IDLE
    is_listening: bool = False
    language: str = "en-US"
    medical_mode: bool = False
    transcript_count: int = 0
    command_count: int = 0
    last_activity: Optional[datetime] = None


# Event Schemas
class VoiceEvent(BaseModel):
    """Voice event"""
    type: VoiceEventType
    transcript: str
    confidence: float = Field(ge=0.0, le=1.0)
    alternatives: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    command: Optional[VoiceCommand] = None
    medical_terms: List[MedicalTerm] = Field(default_factory=list)


# Reflex Card Schemas
class ReflexCardAction(BaseModel):
    """Reflex card action from voice command"""
    card_type: str
    title: str
    description: str
    action_data: Dict[str, Any] = Field(default_factory=dict)
    source_command: VoiceCommand


class VoiceToReflexRequest(BaseModel):
    """Request to convert voice to reflex card"""
    transcript: str
    context: Optional[str] = None
    medical_mode: bool = False


class VoiceToReflexResponse(BaseModel):
    """Response with reflex card"""
    success: bool
    card: Optional[ReflexCardAction] = None
    command: Optional[VoiceCommand] = None
    error: Optional[str] = None
