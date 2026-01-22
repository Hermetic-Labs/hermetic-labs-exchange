"""
VRM Companion Backend Routes

Provides status and optional phoneme generation endpoints.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List
from pathlib import Path
import os
import mimetypes

router = APIRouter()

# Static file serving for model assets
# Assets are inside frontend/ folder so they get copied during module install
assets_dir = Path(__file__).parent.parent / "frontend" / "assets"
models_dir = assets_dir / "models"


@router.get("/assets/models/{file_path:path}")
async def serve_model(file_path: str):
    """
    Serve model files (.vrm, .fbx, .glb) with proper MIME types.
    FastAPI route handler for static assets since we can't mount StaticFiles in a router.
    """
    full_path = models_dir / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail=f"Model file not found: {file_path}")
    
    # Detect MIME type
    content_type, _ = mimetypes.guess_type(str(full_path))
    if not content_type:
        # Default to binary for .vrm, .fbx, .glb files
        ext = full_path.suffix.lower()
        if ext in ['.vrm', '.glb']:
            content_type = 'model/gltf-binary'
        elif ext == '.fbx':
            content_type = 'application/octet-stream'
        else:
            content_type = 'application/octet-stream'
    
    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        filename=full_path.name
    )


@router.get("/status")
async def get_status():
    """
    Health check endpoint: /marketplace/modules/vrm-companion/status
    """
    return {
        "status": "online",
        "module": "vrm-companion",
        "version": "1.0.0"
    }

@router.get("/models")
async def list_models():
    """
    List all available 3D models (VRM, FBX, GLB) organized in subdirectories.
    Pattern: Family/CharacterName/CharacterName.ext
    Returns: [{"name": "CharacterName (Family)", "url": "...", "type": "vrm|fbx|glb"}]
    """
    # Use models_dir which is already set to frontend/assets/models
    models_base = models_dir
    models = []
    
    # Model family configurations: (folder_name, display_suffix, extensions)
    # Supported: VRoid (.vrm), Reallusion/CC4 (.fbx), Unreal Engine (.fbx)
    families = [
        ("VRoid", "VRoid", [".vrm"]),
        ("Reallusion", "Reallusion/CC", [".fbx"]),
        ("UnrealEngine", "UE5", [".fbx"]),
    ]
    
    for family_folder, display_name, extensions in families:
        family_dir = models_base / family_folder
        if not family_dir.exists():
            continue
            
        # Scan each character subfolder
        for char_dir in family_dir.iterdir():
            if not char_dir.is_dir():
                continue

            # Look for main model file - priority: exact name match > any model file
            for ext in extensions:
                main_model = None

                # Try exact match first (folder name matches file name)
                exact_match = char_dir / f"{char_dir.name}{ext}"
                if exact_match.exists():
                    main_model = exact_match
                else:
                    # Try case-insensitive match on folder name
                    for f in char_dir.iterdir():
                        if f.suffix.lower() == ext and f.stem.lower() == char_dir.name.lower():
                            main_model = f
                            break

                    # Fallback: use any model file with this extension in the folder
                    if not main_model:
                        for f in char_dir.iterdir():
                            if f.is_file() and f.suffix.lower() == ext:
                                main_model = f
                                break

                if main_model and main_model.exists():
                    rel_path = main_model.relative_to(models_base)
                    models.append({
                        "name": f"{char_dir.name} ({display_name})",
                        "url": f"/marketplace/modules/vrm-companion/assets/models/{rel_path.as_posix()}",
                        "type": ext[1:]  # Remove leading dot
                    })
                    break  # Only add one model per character folder
    
    # Also scan for GLB/GLTF files anywhere
    for ext in [".glb", ".gltf"]:
        for file in models_base.rglob(f"*{ext}"):
            rel_path = file.relative_to(models_base)
            # Use parent folder as character name if in a subfolder
            char_name = file.parent.name if file.parent != models_base else file.stem
            models.append({
                "name": f"{char_name} (GLB)",
                "url": f"/marketplace/modules/vrm-companion/assets/models/{rel_path.as_posix()}",
                "type": "glb"
            })
    
    return models


# Environment/HDRI serving
environments_dir = assets_dir / "environments"


@router.get("/assets/environments/{file_path:path}")
async def serve_environment(file_path: str):
    """
    Serve environment files (.hdr, .exr, .jpg, .png) with proper MIME types.
    """
    full_path = environments_dir / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail=f"Environment file not found: {file_path}")
    
    # Detect MIME type
    ext = full_path.suffix.lower()
    content_types = {
        '.hdr': 'application/octet-stream',
        '.exr': 'application/octet-stream',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        filename=full_path.name
    )


@router.get("/environments")
async def list_environments():
    """
    List available HDRI environments with projection types.

    Directory structure:
    - environments/ultrahdr/  - .hdr.jpg files (UltraHDR format, most efficient)
    - environments/hdr/       - .hdr files (Radiance format, most common)
    - environments/exr/       - .exr files (OpenEXR format, highest quality)

    Returns: [{"name": "...", "url": "...", "projection": "sphere|dome|pano", "type": "...", "format": "..."}]

    Projection types:
    - sphere: Full 360° spherical environment (standard HDRI)
    - dome: Upper hemisphere only (sky dome)
    - pano: Panoramic strip (360° x ~90°)
    """
    environments = [
        # Built-in procedural options (no file needed, Pi 5 friendly)
        {"name": "Procedural Studio", "url": "__procedural_studio__", "projection": "sphere", "type": "procedural", "format": "procedural"},
        {"name": "Procedural Outdoor", "url": "__procedural_outdoor__", "projection": "dome", "type": "procedural", "format": "procedural"},
    ]

    def get_projection(filename: str) -> str:
        """Detect projection type from filename."""
        name_lower = filename.lower()
        if '_dome' in name_lower or 'dome' in name_lower:
            return 'dome'
        elif '_pano' in name_lower or 'pano' in name_lower:
            return 'pano'
        return 'sphere'

    def scan_format_dir(subdir: str, extensions: List[str], format_type: str, format_name: str):
        """Scan a format subdirectory for environment files."""
        format_dir = environments_dir / subdir
        if not format_dir.exists():
            return

        for ext in extensions:
            for file in format_dir.glob(f"*{ext}"):
                environments.append({
                    "name": f"{file.stem.replace('_', ' ').title()} ({format_name})",
                    "url": f"/marketplace/modules/vrm-companion/assets/environments/{subdir}/{file.name}",
                    "projection": get_projection(file.stem),
                    "type": format_type,
                    "format": format_name
                })

    if environments_dir.exists():
        # Priority order: UltraHDR > HDR > EXR
        # UltraHDR (.hdr.jpg) - most efficient for Pi 5
        scan_format_dir("ultrahdr", [".hdr.jpg", ".jpg"], "ultrahdr", "UltraHDR")

        # Standard HDR (.hdr) - Radiance format, most common
        scan_format_dir("hdr", [".hdr"], "hdr", "HDR")

        # OpenEXR (.exr) - highest quality, larger files
        scan_format_dir("exr", [".exr"], "exr", "EXR")

        # Also scan root for legacy files (backwards compatibility)
        for ext in ['.hdr', '.exr']:
            for file in environments_dir.glob(f"*{ext}"):
                # Skip if it's a directory
                if file.is_dir():
                    continue
                environments.append({
                    "name": file.stem.replace("_", " ").title(),
                    "url": f"/marketplace/modules/vrm-companion/assets/environments/{file.name}",
                    "projection": get_projection(file.stem),
                    "type": "hdr" if ext == '.hdr' else "exr",
                    "format": "HDR" if ext == '.hdr' else "EXR"
                })

    return environments

@router.post("/phonemes")
async def generate_phonemes(data: Dict[str, Any]):
    """
    Generate phonemes from text using the main backend's phonemizer.
    Proxies to /tts/phonemes which uses the phonemizer library.
    """
    text = data.get("text", "")
    if not text:
        return {
            "text": "",
            "phonemes": "",
            "message": "No text provided"
        }
    
    try:
        # Call the main backend's phonemizer endpoint
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://127.0.0.1:8001/tts/phonemes",
                json={"text": text},
                timeout=5.0
            )
            
            if response.status_code == 200:
                result = response.json()
                # Main backend returns {"phonemes": "..."}
                return {
                    "text": text,
                    "phonemes": result.get("phonemes", ""),
                    "message": "Phonemes generated successfully"
                }
            else:
                # Fallback if main backend unavailable
                return {
                    "text": text,
                    "phonemes": "",
                    "message": f"Phonemizer unavailable (status {response.status_code})"
                }
    except Exception as e:
        # Graceful fallback - return empty phonemes
        return {
            "text": text,
            "phonemes": "",
            "message": f"Phoneme generation failed: {str(e)}"
        }
