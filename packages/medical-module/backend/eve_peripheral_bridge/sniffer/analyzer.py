"""Protocol pattern analyzer for captured traffic."""
from __future__ import annotations
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from .capture import CaptureSession, CapturedOperation, OperationType

log = logging.getLogger(__name__)


@dataclass
class FieldHypothesis:
    """Hypothesis about a data field."""
    offset: int
    length: int
    name: str
    data_type: str  # uint8, uint16_le, uint16_be, float32, etc.
    values_seen: list[Any] = field(default_factory=list)
    confidence: float = 0.0
    notes: str = ""


@dataclass
class CharacteristicAnalysis:
    """Analysis of a single characteristic."""
    uuid: str
    operation_count: int
    payload_sizes: list[int]
    fields: list[FieldHypothesis] = field(default_factory=list)
    patterns: dict[str, Any] = field(default_factory=dict)
    raw_samples: list[bytes] = field(default_factory=list)


@dataclass
class ProtocolProfile:
    """Complete protocol analysis profile."""
    device_name: str
    characteristics: dict[str, CharacteristicAnalysis] = field(default_factory=dict)
    init_sequence: list[CapturedOperation] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


class ProtocolAnalyzer:
    """
    Analyzes captured GATT traffic to infer protocol structure.
    
    Detects:
    - Payload structure and field boundaries
    - Likely data types per field
    - Initialization/handshake sequences
    - Repeating patterns
    """
    
    def __init__(self):
        self._profile: ProtocolProfile | None = None
    
    def analyze(self, session: CaptureSession, max_samples: int = 50) -> ProtocolProfile:
        """
        Analyze captured session and build protocol profile.
        
        Args:
            session: Completed capture session
            max_samples: Max raw samples to keep per characteristic
        
        Returns:
            ProtocolProfile with inferred structure
        """
        self._profile = ProtocolProfile(device_name=session.device_name)
        
        # Group by characteristic
        by_char: dict[str, list[CapturedOperation]] = defaultdict(list)
        for op in session.operations:
            by_char[op.characteristic].append(op)
        
        # Analyze each characteristic
        for char_uuid, ops in by_char.items():
            analysis = self._analyze_characteristic(char_uuid, ops, max_samples)
            self._profile.characteristics[char_uuid] = analysis
        
        # Detect init sequence (first N writes)
        writes = [op for op in session.operations if op.operation == OperationType.WRITE]
        self._profile.init_sequence = writes[:10]
        
        log.info(f"Analyzed {len(self._profile.characteristics)} characteristics")
        return self._profile
    
    def _analyze_characteristic(
        self, uuid: str, ops: list[CapturedOperation], max_samples: int
    ) -> CharacteristicAnalysis:
        """Analyze operations on a single characteristic."""
        payloads = [op.data for op in ops if op.data]
        sizes = [len(p) for p in payloads]
        
        analysis = CharacteristicAnalysis(
            uuid=uuid,
            operation_count=len(ops),
            payload_sizes=list(set(sizes)),
            raw_samples=payloads[:max_samples],
        )
        
        if not payloads:
            return analysis
        
        # Analyze structure if consistent size
        if len(set(sizes)) == 1:
            analysis.fields = self._infer_fields(payloads)
            analysis.patterns["fixed_size"] = sizes[0]
        else:
            analysis.patterns["variable_size"] = {"min": min(sizes), "max": max(sizes)}
        
        # Check for header patterns
        if len(payloads) >= 3:
            self._detect_headers(payloads, analysis)
        
        return analysis
    
    def _infer_fields(self, payloads: list[bytes]) -> list[FieldHypothesis]:
        """Infer field structure from consistent-size payloads."""
        if not payloads:
            return []
        
        size = len(payloads[0])
        fields = []
        
        # Analyze byte-by-byte variance
        variances = []
        for i in range(size):
            values = [p[i] for p in payloads]
            variance = len(set(values)) / len(values)
            variances.append((i, variance, values))
        
        # Group into fields based on variance patterns
        offset = 0
        while offset < size:
            # Check for common field sizes
            for field_len, dtype in [(1, "uint8"), (2, "uint16_le"), (4, "uint32_le")]:
                if offset + field_len > size:
                    continue
                
                # Extract field values
                values = []
                for p in payloads:
                    chunk = p[offset:offset + field_len]
                    val = int.from_bytes(chunk, "little", signed=False)
                    values.append(val)
                
                # Check if looks meaningful
                unique_ratio = len(set(values)) / len(values)
                
                if unique_ratio < 0.1:  # Likely constant
                    field = FieldHypothesis(
                        offset=offset,
                        length=field_len,
                        name=f"const_{offset}",
                        data_type=dtype,
                        values_seen=list(set(values))[:5],
                        confidence=0.9,
                        notes="Constant or near-constant",
                    )
                elif unique_ratio > 0.5:  # Variable data
                    field = FieldHypothesis(
                        offset=offset,
                        length=field_len,
                        name=f"field_{offset}",
                        data_type=self._guess_type(values, field_len),
                        values_seen=values[:5],
                        confidence=0.6,
                        notes="Variable data",
                    )
                else:
                    field = FieldHypothesis(
                        offset=offset,
                        length=field_len,
                        name=f"field_{offset}",
                        data_type=dtype,
                        values_seen=list(set(values))[:5],
                        confidence=0.4,
                    )
                
                fields.append(field)
                offset += field_len
                break
            else:
                offset += 1  # Skip unrecognized byte
        
        return fields
    
    def _guess_type(self, values: list[int], size: int) -> str:
        """Guess data type from value distribution."""
        min_val = min(values)
        max_val = max(values)
        
        if size == 1:
            return "uint8"
        elif size == 2:
            # Check if might be heart rate, SpO2, etc. (common BLE health ranges)
            if 30 <= min_val <= 250 and 30 <= max_val <= 250:
                return "uint16_le (health_metric?)"
            return "uint16_le"
        elif size == 4:
            # Check for float pattern
            if max_val > 100000:
                return "float32_le"
            return "uint32_le"
        return f"bytes[{size}]"
    
    def _detect_headers(self, payloads: list[bytes], analysis: CharacteristicAnalysis) -> None:
        """Detect common header patterns."""
        if not payloads:
            return
        
        # Check first byte(s) for packet type indicators
        first_bytes = [p[0] if p else 0 for p in payloads]
        unique_first = set(first_bytes)
        
        if len(unique_first) <= 5:
            analysis.patterns["packet_types"] = {
                f"0x{b:02X}": first_bytes.count(b) for b in unique_first
            }
        
        # Check for length byte
        for i in range(min(3, len(payloads[0]) if payloads else 0)):
            matches = sum(1 for p in payloads if len(p) > i and p[i] == len(p) - i - 1)
            if matches > len(payloads) * 0.8:
                analysis.patterns["length_byte_offset"] = i
    
    def export_summary(self) -> str:
        """Export human-readable analysis summary."""
        if not self._profile:
            return "No analysis available"
        
        lines = [
            f"# Protocol Analysis: {self._profile.device_name}",
            "",
        ]
        
        for uuid, char in self._profile.characteristics.items():
            lines.append(f"## Characteristic: {uuid}")
            lines.append(f"Operations: {char.operation_count}")
            lines.append(f"Payload sizes: {char.payload_sizes}")
            
            if char.fields:
                lines.append("### Inferred Fields:")
                for f in char.fields:
                    lines.append(
                        f"  - [{f.offset}:{f.offset + f.length}] {f.name} "
                        f"({f.data_type}) conf={f.confidence:.0%}"
                    )
            
            if char.patterns:
                lines.append(f"### Patterns: {char.patterns}")
            
            lines.append("")
        
        if self._profile.init_sequence:
            lines.append("## Init Sequence (first writes):")
            for op in self._profile.init_sequence:
                lines.append(f"  WRITE {op.characteristic}: {op.data.hex()}")
        
        return "\n".join(lines)
