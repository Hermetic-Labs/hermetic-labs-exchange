"""
VRM Companion Backend Service

Business logic for avatar management and EVE Core integration.
"""

from typing import Optional, Dict, Any, List
from pathlib import Path
import httpx
import logging

from .schemas import (
    RepresentationType,
    EveCoreIntegrationConfig,
    CompanionCapabilities,
    CompanionStatus,
    AvatarModel,
    ModelType,
)

logger = logging.getLogger(__name__)


class VRMCompanionService:
    """
    VRM Companion service handling avatar management and EVE Core integration.
    """
    
    def __init__(self):
        self._is_registered = False
        self._current_representation = RepresentationType.SPHERE
        self._current_avatar_url: Optional[str] = None
        self._config = EveCoreIntegrationConfig()
        self._models_base = Path(__file__).parent.parent / "assets" / "models"

    # =========================================================================
    # Avatar Management
    # =========================================================================

    def list_available_models(self) -> List[AvatarModel]:
        """List all available 3D models."""
        models = []
        
        # Scan VRM folder
        vrm_dir = self._models_base / "VRM"
        if vrm_dir.exists():
            for file in vrm_dir.rglob("*.vrm"):
                rel_path = file.relative_to(self._models_base)
                models.append(AvatarModel(
                    name=f"{file.stem.replace('_', ' ').title()} (VRM)",
                    url=f"/marketplace/modules/vrm-companion/assets/models/{rel_path.as_posix()}",
                    type=ModelType.VRM,
                ))
        
        # Scan FBX folder
        fbx_dir = self._models_base / "FBX"
        if fbx_dir.exists():
            for file in fbx_dir.rglob("*.fbx"):
                rel_path = file.relative_to(self._models_base)
                models.append(AvatarModel(
                    name=f"{file.stem.replace('_', ' ').title()} (FBX)",
                    url=f"/marketplace/modules/vrm-companion/assets/models/{rel_path.as_posix()}",
                    type=ModelType.FBX,
                ))
        
        # Scan GLB/GLTF
        for ext, model_type in [("*.glb", ModelType.GLB), ("*.gltf", ModelType.GLTF)]:
            for file in self._models_base.rglob(ext):
                rel_path = file.relative_to(self._models_base)
                models.append(AvatarModel(
                    name=f"{file.stem.replace('_', ' ').title()} ({model_type.value.upper()})",
                    url=f"/marketplace/modules/vrm-companion/assets/models/{rel_path.as_posix()}",
                    type=model_type,
                ))
        
        return models

    # =========================================================================
    # Phoneme Generation
    # =========================================================================

    async def generate_phonemes(self, text: str) -> Dict[str, Any]:
        """Generate phonemes from text using main backend's phonemizer."""
        if not text:
            return {
                "text": "",
                "phonemes": "",
                "message": "No text provided"
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://127.0.0.1:8001/tts/phonemes",
                    json={"text": text},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "text": text,
                        "phonemes": result.get("phonemes", ""),
                        "message": "Phonemes generated successfully"
                    }
                else:
                    return {
                        "text": text,
                        "phonemes": "",
                        "message": f"Phonemizer unavailable (status {response.status_code})"
                    }
        except Exception as e:
            logger.error(f"Phoneme generation failed: {e}")
            return {
                "text": text,
                "phonemes": "",
                "message": f"Phoneme generation failed: {str(e)}"
            }

    # =========================================================================
    # EVE Core Integration
    # =========================================================================

    async def check_eve_core_available(self) -> bool:
        """Check if EVE Core is available."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://127.0.0.1:8001/api/views/eve-core/status",
                    timeout=2.0
                )
                return response.status_code == 200
        except:
            return False

    async def check_vr_engine_installed(self) -> bool:
        """Check if VR spatial engine is installed."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://127.0.0.1:8001/marketplace/modules/vr-spatial-engine/status",
                    timeout=2.0
                )
                return response.status_code == 200
        except:
            return False

    def register_with_eve_core(self, config: EveCoreIntegrationConfig) -> bool:
        """Register companion with EVE Core."""
        self._config = config
        self._is_registered = True
        
        if config.auto_replace_sphere and config.default_avatar_url:
            self._current_representation = RepresentationType.VRM_COMPANION
            self._current_avatar_url = config.default_avatar_url
        
        logger.info("VRM Companion registered with EVE Core")
        return True

    def unregister_from_eve_core(self) -> bool:
        """Unregister from EVE Core."""
        self._is_registered = False
        self._current_representation = RepresentationType.SPHERE
        self._current_avatar_url = None
        logger.info("VRM Companion unregistered from EVE Core")
        return True

    def swap_representation(
        self, 
        representation: RepresentationType, 
        avatar_url: Optional[str] = None
    ) -> RepresentationType:
        """Swap EVE Core's representation."""
        self._current_representation = representation
        
        if representation == RepresentationType.VRM_COMPANION and avatar_url:
            self._current_avatar_url = avatar_url
        elif representation == RepresentationType.SPHERE:
            # Keep avatar URL for next swap
            pass
        
        logger.info(f"Representation swapped to: {representation}")
        return self._current_representation

    # =========================================================================
    # Status & Capabilities
    # =========================================================================

    async def get_capabilities(self) -> CompanionCapabilities:
        """Get companion capabilities."""
        vr_ready = await self.check_vr_engine_installed()
        
        return CompanionCapabilities(
            avatar_loading=True,
            lip_sync=True,
            phoneme_driven=True,
            amplitude_mode=True,
            vr_ready=vr_ready,
            eve_core_integration=True,
        )

    async def get_status(self) -> CompanionStatus:
        """Get full companion status."""
        capabilities = await self.get_capabilities()
        
        return CompanionStatus(
            status="online",
            module="vrm-companion",
            version="1.0.0",
            registered_with_eve_core=self._is_registered,
            current_representation=self._current_representation,
            current_avatar_url=self._current_avatar_url,
            capabilities=capabilities,
        )

    @property
    def is_registered(self) -> bool:
        return self._is_registered
    
    @property
    def current_representation(self) -> RepresentationType:
        return self._current_representation
    
    @property
    def current_avatar_url(self) -> Optional[str]:
        return self._current_avatar_url


# Singleton instance
_service_instance: Optional[VRMCompanionService] = None


def get_companion_service() -> VRMCompanionService:
    """Get singleton service instance."""
    global _service_instance
    if _service_instance is None:
        _service_instance = VRMCompanionService()
    return _service_instance
