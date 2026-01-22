# @eve-os/voice-connector

Voice recognition, command processing, and voice-to-reflex-card integration for EVE OS.

## Features

### Speech Recognition
- Real-time speech-to-text processing
- Multi-language support
- Continuous listening mode
- Confidence scoring

### Command Processing
- Natural language command parsing
- Action verb recognition
- Context-aware command interpretation
- Medical vocabulary support

### Voice Interface
- Voice activity detection
- Noise cancellation integration
- Wake word detection
- Audio feedback

### Reflex Card Integration
- Voice-to-reflex-card conversion
- Command-to-action mapping
- Workflow triggering
- Hands-free operation

### Medical Mode
- Healthcare terminology recognition
- HIPAA-compliant processing
- Clinical command support
- Patient context awareness

## Installation

```bash
pnpm add @eve-os/voice-connector
```

## Usage

```typescript
import { VoiceRecognitionService, VoiceCommandProcessor } from '@eve-os/voice-connector';

// Initialize voice recognition
const recognition = new VoiceRecognitionService({
  language: 'en-US',
  continuous: true,
  medicalMode: true,
  confidenceThreshold: 0.8
});

// Start listening
await recognition.start();

// Handle voice events
recognition.on('speech', (event) => {
  console.log('Transcript:', event.transcript);
  console.log('Confidence:', event.confidence);
});

recognition.on('command', (event) => {
  console.log('Command detected:', event.command);
  // Execute command
});

// Stop listening
await recognition.stop();
```

## API Reference

### VoiceRecognitionService

Main service for speech-to-text recognition.

#### Methods

- `start()` - Start listening
- `stop()` - Stop listening
- `on(event, handler)` - Subscribe to events
- `off(event, handler)` - Unsubscribe from events

### VoiceCommandProcessor

Service for processing voice commands.

#### Methods

- `parseCommand(transcript)` - Parse transcript into command
- `executeCommand(command)` - Execute parsed command
- `registerCommandHandler(verb, handler)` - Register command handler

### VoiceInterfaceManager

Manager for voice interface state.

#### Methods

- `initialize()` - Initialize voice interface
- `setLanguage(language)` - Set recognition language
- `setMedicalMode(enabled)` - Enable/disable medical mode

### VoiceToReflexCardService

Service for converting voice commands to reflex cards.

#### Methods

- `convertToCard(command)` - Convert command to reflex card
- `executeCard(card)` - Execute reflex card
