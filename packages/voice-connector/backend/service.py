"""
Voice Connector Service

Provides business logic for voice recognition,
command processing, and voice-to-reflex-card integration.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import re

from .schemas import (
    VoiceCredentials,
    VoiceConnectionConfig,
    VoiceConnectionResponse,
    SessionState,
    VoiceRecognitionRequest,
    VoiceRecognitionResponse,
    TranscriptEntry,
    MedicalTerm,
    MedicalTermCategory,
    VoiceCommand,
    VoiceCommandResponse,
    VoiceSessionState,
    VoiceEvent,
    VoiceEventType,
    ReflexCardAction,
    VoiceToReflexRequest,
    VoiceToReflexResponse,
)


class VoiceService:
    """Service for voice recognition operations"""

    # Supported action verbs
    SUPPORTED_VERBS = [
        "read", "write", "monitor", "notify", "get", "call",
        "route", "move", "render", "show", "open", "close",
        "start", "stop", "pause", "resume", "search", "find"
    ]

    # Medical vocabulary
    MEDICAL_VOCABULARY: List[Dict[str, Any]] = [
        {
            "term": "vital signs",
            "aliases": ["vitals", "vital signs", "vitals signs"],
            "category": MedicalTermCategory.MEASUREMENT,
            "confidence": 0.95,
            "definition": "Basic physiological measurements"
        },
        {
            "term": "blood pressure",
            "aliases": ["blood pressure", "bp", "pressure"],
            "category": MedicalTermCategory.MEASUREMENT,
            "confidence": 0.98,
            "definition": "Arterial blood pressure measurement"
        },
        {
            "term": "heart rate",
            "aliases": ["heart rate", "pulse", "hr", "bpm"],
            "category": MedicalTermCategory.MEASUREMENT,
            "confidence": 0.98,
            "definition": "Number of heartbeats per minute"
        },
        {
            "term": "oxygen saturation",
            "aliases": ["oxygen saturation", "spo2", "oxygen"],
            "category": MedicalTermCategory.MEASUREMENT,
            "confidence": 0.95,
            "definition": "Percentage of oxygen in blood"
        },
        {
            "term": "temperature",
            "aliases": ["temperature", "temp", "body temp"],
            "category": MedicalTermCategory.MEASUREMENT,
            "confidence": 0.97,
            "definition": "Body temperature reading"
        },
        {
            "term": "medication",
            "aliases": ["medication", "medicine", "drug", "prescription"],
            "category": MedicalTermCategory.MEDICATION,
            "confidence": 0.94,
            "definition": "Pharmaceutical treatment"
        },
    ]

    def __init__(self, config: Optional[VoiceConnectionConfig] = None):
        """Initialize voice service
        
        Args:
            config: Voice connection configuration
        """
        self.config = config or VoiceConnectionConfig()
        self._connected: bool = False
        self._session_state = VoiceSessionState()
        self._transcripts: List[TranscriptEntry] = []
        self._commands: List[VoiceCommand] = []

    async def connect(
        self,
        config: VoiceConnectionConfig,
        credentials: Optional[VoiceCredentials] = None,
    ) -> VoiceConnectionResponse:
        """Establish voice connection
        
        Args:
            config: Connection configuration
            credentials: Optional credentials
            
        Returns:
            Connection response with status
        """
        self.config = config
        self._connected = True
        self._session_state = VoiceSessionState(
            state=SessionState.IDLE,
            language=config.language,
            medical_mode=config.medical_mode,
        )
        
        provider = credentials.provider if credentials else "browser"
        
        return VoiceConnectionResponse(
            connected=True,
            language=config.language,
            medical_mode=config.medical_mode,
            provider=provider,
        )

    async def disconnect(self) -> bool:
        """Disconnect voice service"""
        self._connected = False
        self._session_state.state = SessionState.IDLE
        self._session_state.is_listening = False
        return True

    async def start_listening(self) -> VoiceSessionState:
        """Start voice recognition"""
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        self._session_state.state = SessionState.LISTENING
        self._session_state.is_listening = True
        self._session_state.last_activity = datetime.utcnow()
        
        return self._session_state

    async def stop_listening(self) -> VoiceSessionState:
        """Stop voice recognition"""
        self._session_state.state = SessionState.IDLE
        self._session_state.is_listening = False
        self._session_state.last_activity = datetime.utcnow()
        
        return self._session_state

    async def get_session_state(self) -> VoiceSessionState:
        """Get current session state"""
        return self._session_state

    async def recognize(
        self,
        request: VoiceRecognitionRequest,
    ) -> VoiceRecognitionResponse:
        """Process voice recognition request
        
        Args:
            request: Recognition request with audio
            
        Returns:
            Recognition response with transcript
        """
        start_time = datetime.utcnow()
        
        try:
            # In production, this would call speech-to-text API
            # For now, return mock response
            transcript = TranscriptEntry(
                text="",
                confidence=0.0,
                is_final=True,
            )
            
            end_time = datetime.utcnow()
            processing_time = int((end_time - start_time).total_seconds() * 1000)
            
            return VoiceRecognitionResponse(
                success=True,
                transcript=transcript,
                processing_time_ms=processing_time,
            )
        except Exception as e:
            end_time = datetime.utcnow()
            processing_time = int((end_time - start_time).total_seconds() * 1000)
            
            return VoiceRecognitionResponse(
                success=False,
                error=str(e),
                processing_time_ms=processing_time,
            )

    async def process_transcript(
        self,
        transcript: str,
        confidence: float = 1.0,
    ) -> TranscriptEntry:
        """Process a transcript and extract medical terms
        
        Args:
            transcript: Text transcript
            confidence: Recognition confidence
            
        Returns:
            Processed transcript entry
        """
        medical_terms: List[MedicalTerm] = []
        
        if self.config.medical_mode:
            medical_terms = self._extract_medical_terms(transcript)
            
        entry = TranscriptEntry(
            text=transcript,
            confidence=confidence,
            is_final=True,
            medical_terms=medical_terms,
        )
        
        self._transcripts.append(entry)
        self._session_state.transcript_count += 1
        self._session_state.last_activity = datetime.utcnow()
        
        return entry

    def _extract_medical_terms(self, text: str) -> List[MedicalTerm]:
        """Extract medical terms from text"""
        terms: List[MedicalTerm] = []
        text_lower = text.lower()
        
        for vocab in self.MEDICAL_VOCABULARY:
            for alias in vocab["aliases"]:
                if alias.lower() in text_lower:
                    terms.append(MedicalTerm(
                        term=vocab["term"],
                        aliases=vocab["aliases"],
                        category=vocab["category"],
                        confidence=vocab["confidence"],
                        definition=vocab.get("definition"),
                    ))
                    break
                    
        return terms

    async def parse_command(
        self,
        transcript: str,
    ) -> Optional[VoiceCommand]:
        """Parse transcript into voice command
        
        Args:
            transcript: Text transcript
            
        Returns:
            Parsed command if detected
        """
        text_lower = transcript.lower().strip()
        
        # Find action verb
        verb = None
        for v in self.SUPPORTED_VERBS:
            if text_lower.startswith(v) or f" {v} " in text_lower:
                verb = v
                break
                
        if not verb:
            return None
            
        # Extract noun (simplified parsing)
        words = text_lower.split()
        verb_index = -1
        for i, w in enumerate(words):
            if w == verb:
                verb_index = i
                break
                
        noun = ""
        if verb_index >= 0 and verb_index < len(words) - 1:
            noun = " ".join(words[verb_index + 1:])
            
        # Check for medical terms
        medical_term = None
        if self.config.medical_mode:
            terms = self._extract_medical_terms(transcript)
            if terms:
                medical_term = terms[0].term
                
        command = VoiceCommand(
            verb=verb,
            noun=noun,
            modifiers={},
            confidence=0.9,
            medical_term=medical_term,
            original_transcript=transcript,
        )
        
        self._commands.append(command)
        self._session_state.command_count += 1
        
        return command

    async def execute_command(
        self,
        command: VoiceCommand,
    ) -> VoiceCommandResponse:
        """Execute a voice command
        
        Args:
            command: Parsed voice command
            
        Returns:
            Command execution response
        """
        start_time = datetime.utcnow()
        
        try:
            # In production, this would dispatch to appropriate handler
            result = {
                "action": command.verb,
                "target": command.noun,
                "status": "executed",
            }
            
            end_time = datetime.utcnow()
            execution_time = int((end_time - start_time).total_seconds() * 1000)
            
            return VoiceCommandResponse(
                success=True,
                command=command,
                result=result,
                execution_time_ms=execution_time,
            )
        except Exception as e:
            end_time = datetime.utcnow()
            execution_time = int((end_time - start_time).total_seconds() * 1000)
            
            return VoiceCommandResponse(
                success=False,
                command=command,
                error=str(e),
                execution_time_ms=execution_time,
            )

    async def convert_to_reflex_card(
        self,
        request: VoiceToReflexRequest,
    ) -> VoiceToReflexResponse:
        """Convert voice command to reflex card
        
        Args:
            request: Conversion request
            
        Returns:
            Reflex card response
        """
        command = await self.parse_command(request.transcript)
        
        if not command:
            return VoiceToReflexResponse(
                success=False,
                error="No command detected in transcript",
            )
            
        # Create reflex card action
        card = ReflexCardAction(
            card_type=f"voice_{command.verb}",
            title=f"{command.verb.capitalize()} {command.noun}",
            description=f"Voice command: {request.transcript}",
            action_data={
                "verb": command.verb,
                "noun": command.noun,
                "modifiers": command.modifiers,
            },
            source_command=command,
        )
        
        return VoiceToReflexResponse(
            success=True,
            card=card,
            command=command,
        )

    async def get_transcripts(
        self,
        limit: int = 100,
    ) -> List[TranscriptEntry]:
        """Get recent transcripts"""
        return self._transcripts[-limit:]

    async def get_commands(
        self,
        limit: int = 100,
    ) -> List[VoiceCommand]:
        """Get recent commands"""
        return self._commands[-limit:]

    async def clear_history(self) -> None:
        """Clear transcript and command history"""
        self._transcripts.clear()
        self._commands.clear()
        self._session_state.transcript_count = 0
        self._session_state.command_count = 0
