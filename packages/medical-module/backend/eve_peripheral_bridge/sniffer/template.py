"""Plugin skeleton generator from protocol analysis."""
from __future__ import annotations
import re
from pathlib import Path

from .analyzer import ProtocolProfile, FieldHypothesis
from ..plugins.base import PLUGIN_TEMPLATE


class PluginGenerator:
    """Generates plugin code from protocol analysis."""
    
    def __init__(self, profile: ProtocolProfile):
        self.profile = profile
    
    def generate(self, output_path: Path | str | None = None) -> str:
        """
        Generate plugin skeleton from protocol profile.
        
        Args:
            output_path: Optional path to write plugin file
        
        Returns:
            Generated plugin code
        """
        # Sanitize device name for class name
        clean_name = re.sub(r"[^a-zA-Z0-9]", "", self.profile.device_name)
        class_name = clean_name or "Custom"
        plugin_id = clean_name.lower() or "custom"
        
        # Build field map documentation
        field_lines = []
        for uuid, char in self.profile.characteristics.items():
            if char.fields:
                field_lines.append(f"# {uuid}:")
                for f in char.fields:
                    field_lines.append(f"#   [{f.offset}:{f.offset + f.length}] {f.name} ({f.data_type})")
        field_map = "\n        ".join(field_lines) if field_lines else "# No fields analyzed yet"
        
        # Build sniffer notes
        sniffer_notes = []
        for uuid, char in self.profile.characteristics.items():
            if char.patterns:
                sniffer_notes.append(f"# {uuid}: {char.patterns}")
        if self.profile.init_sequence:
            sniffer_notes.append("# Init sequence:")
            for op in self.profile.init_sequence[:5]:
                sniffer_notes.append(f"#   WRITE {op.characteristic}: {op.data.hex()}")
        notes_str = "\n        ".join(sniffer_notes) if sniffer_notes else "# Run sniffer to capture protocol"
        
        # Generate code
        code = PLUGIN_TEMPLATE.format(
            device_name=self.profile.device_name,
            class_name=class_name,
            plugin_id=plugin_id,
            vendor="Unknown",
            patterns=[f"(?i){re.escape(self.profile.device_name)}"],
            sniffer_notes=notes_str,
            field_map=field_map,
        )
        
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(code)
        
        return code
    
    def generate_parser_snippet(self, char_uuid: str) -> str:
        """Generate parsing code for specific characteristic."""
        char = self.profile.characteristics.get(char_uuid)
        if not char or not char.fields:
            return "# No field analysis available for this characteristic"
        
        lines = [
            "def parse(self, raw: bytes) -> dict:",
            '    """Auto-generated parser."""',
            "    result = {}",
        ]
        
        for f in char.fields:
            if f.length == 1:
                lines.append(f"    result['{f.name}'] = raw[{f.offset}]")
            elif "float" in f.data_type:
                lines.append(f"    result['{f.name}'] = struct.unpack('<f', raw[{f.offset}:{f.offset + f.length}])[0]")
            else:
                signed = "True" if "int" in f.data_type and "u" not in f.data_type.lower() else "False"
                lines.append(
                    f"    result['{f.name}'] = int.from_bytes("
                    f"raw[{f.offset}:{f.offset + f.length}], 'little', signed={signed})"
                )
        
        lines.append("    return result")
        return "\n".join(lines)
