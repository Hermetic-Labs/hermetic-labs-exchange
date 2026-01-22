"""
Developer Portal - Business Logic Service

This service handles:
- Package generation from remix basket elements
- Element registry operations
- Dependency resolution
- File generation and bundling
"""

from typing import Dict, Any, Optional, List, Set, Tuple
from datetime import datetime
import time
import os
import json
import zipfile
import io
from pathlib import Path

from .schemas import (
    RemixElementSchema,
    GeneratorOptionsSchema,
    PackageGenerateResponse,
    GeneratedFileSchema,
    StatusResponse,
    ElementQueryResponse,
)

# Track when service was initialized (for uptime)
_start_time = time.time()


class DevPortalService:
    """
    Main service class for Developer Portal business logic.

    Handles package generation, element management, and remix operations.
    """

    # External NPM packages that shouldn't be bundled
    NPM_EXTERNALS = [
        'react', 'react-dom', 'react-router-dom',
        '@xyflow/react', 'zustand', 'three', '@react-three/fiber',
        'lucide-react', 'framer-motion'
    ]

    def __init__(self, market_source_path: Optional[str] = None):
        """Initialize the service."""
        self.market_source_path = market_source_path or self._detect_market_source()
        self._element_cache: Dict[str, RemixElementSchema] = {}

    def _detect_market_source(self) -> str:
        """Detect the market_source directory path."""
        # Try common locations
        candidates = [
            Path(__file__).parent.parent.parent.parent,  # packages/dev-portal/backend -> market_source
            Path.cwd() / 'market_source',
            Path.cwd().parent / 'market_source',
        ]
        for candidate in candidates:
            if (candidate / 'packages').exists():
                return str(candidate)
        return str(Path.cwd() / 'market_source')

    # ========================================================================
    # Status Methods
    # ========================================================================

    async def get_status(self) -> StatusResponse:
        """Get service status for health checks."""
        uptime = time.time() - _start_time

        return StatusResponse(
            status="ok",
            version="1.0.0",
            uptime_seconds=uptime,
            details={
                "market_source": self.market_source_path,
                "element_cache_size": len(self._element_cache),
            }
        )

    # ========================================================================
    # Package Generation
    # ========================================================================

    async def generate_package(
        self,
        elements: List[RemixElementSchema],
        options: GeneratorOptionsSchema
    ) -> PackageGenerateResponse:
        """
        Generate a new package from remix basket elements.

        Args:
            elements: Elements to include in the package
            options: Package generation options

        Returns:
            PackageGenerateResponse with generated files
        """
        warnings: List[str] = []

        try:
            # 1. Resolve all dependencies (including transitive)
            all_elements, external_deps, missing_deps = await self._resolve_dependencies(elements)

            if missing_deps:
                warnings.append(f"Missing dependencies: {', '.join(missing_deps)}")

            # 2. Group elements by type
            grouped = self._group_elements_by_type(all_elements)

            # 3. Generate files
            files: List[GeneratedFileSchema] = []

            # Generate component files
            for element in grouped['components']:
                files.append(self._generate_component_file(element, options.package_name))

            # Generate service files
            for element in grouped['services']:
                files.append(self._generate_service_file(element, options.package_name))

            # Generate hook files
            for element in grouped['hooks']:
                files.append(self._generate_hook_file(element, options.package_name))

            # Generate type file
            if options.include_types and grouped['types']:
                type_file = self._generate_types_file(grouped['types'], options.package_name)
                if type_file:
                    files.append(type_file)

            # Generate index.ts barrel export
            files.append(self._generate_index_file(all_elements, options))

            # Generate manifest.json
            manifest = self._generate_manifest(all_elements, external_deps, options)
            files.append(GeneratedFileSchema(
                path='manifest.json',
                content=json.dumps(manifest, indent=4),
                type='manifest'
            ))

            # Generate README
            if options.generate_readme:
                files.append(self._generate_readme(all_elements, options))

            # Generate backend skeleton
            files.extend(self._generate_backend_skeleton(options))

            return PackageGenerateResponse(
                success=True,
                name=options.package_name,
                display_name=options.display_name or self._to_display_name(options.package_name),
                version=options.version or '1.0.0',
                description=options.description or f"Generated package containing {len(all_elements)} elements",
                files=files,
                warnings=warnings,
            )

        except Exception as e:
            return PackageGenerateResponse(
                success=False,
                name=options.package_name,
                display_name=options.display_name or self._to_display_name(options.package_name),
                version=options.version or '1.0.0',
                description=options.description or '',
                error=str(e),
            )

    async def _resolve_dependencies(
        self,
        elements: List[RemixElementSchema]
    ) -> Tuple[List[RemixElementSchema], List[str], List[str]]:
        """
        Resolve all dependencies including transitive ones.

        Returns:
            Tuple of (all_elements, external_deps, missing_deps)
        """
        seen: Set[str] = set()
        all_elements: List[RemixElementSchema] = []
        external_deps: List[str] = []
        missing_deps: List[str] = []

        def resolve(element: RemixElementSchema):
            if element.id in seen:
                return
            seen.add(element.id)
            all_elements.append(element)

            for dep_id in element.dependencies:
                # Check if it's an external npm package
                if self._is_external_npm_dep(dep_id):
                    if dep_id not in external_deps:
                        external_deps.append(dep_id)
                    continue

                # Check if it's another element we have
                dep_element = next((e for e in elements if e.id == dep_id), None)
                if dep_element:
                    resolve(dep_element)
                else:
                    # Mark as missing
                    if dep_id not in missing_deps:
                        missing_deps.append(dep_id)

        for element in elements:
            resolve(element)

        return all_elements, external_deps, missing_deps

    def _is_external_npm_dep(self, dep_id: str) -> bool:
        """Check if a dependency ID is an external npm package."""
        return any(
            dep_id == ext or dep_id.startswith(f"{ext}/")
            for ext in self.NPM_EXTERNALS
        )

    def _group_elements_by_type(
        self,
        elements: List[RemixElementSchema]
    ) -> Dict[str, List[RemixElementSchema]]:
        """Group elements by their type."""
        return {
            'components': [e for e in elements if e.type == 'component'],
            'services': [e for e in elements if e.type == 'service'],
            'hooks': [e for e in elements if e.type == 'hook'],
            'types': [e for e in elements if e.type == 'type'],
            'functions': [e for e in elements if e.type == 'function'],
            'constants': [e for e in elements if e.type == 'constant'],
        }

    def _generate_component_file(
        self,
        element: RemixElementSchema,
        package_name: str
    ) -> GeneratedFileSchema:
        """Generate a component file."""
        content = element.code or self._generate_placeholder_component(element)

        return GeneratedFileSchema(
            path=f"frontend/components/{element.name}.tsx",
            content=self._rewrite_imports(content, package_name),
            type='component'
        )

    def _generate_service_file(
        self,
        element: RemixElementSchema,
        package_name: str
    ) -> GeneratedFileSchema:
        """Generate a service file."""
        content = element.code or self._generate_placeholder_service(element)

        return GeneratedFileSchema(
            path=f"frontend/services/{element.name}.ts",
            content=self._rewrite_imports(content, package_name),
            type='service'
        )

    def _generate_hook_file(
        self,
        element: RemixElementSchema,
        package_name: str
    ) -> GeneratedFileSchema:
        """Generate a hook file."""
        content = element.code or self._generate_placeholder_hook(element)

        return GeneratedFileSchema(
            path=f"frontend/hooks/{element.name}.ts",
            content=self._rewrite_imports(content, package_name),
            type='hook'
        )

    def _generate_types_file(
        self,
        types: List[RemixElementSchema],
        package_name: str
    ) -> Optional[GeneratedFileSchema]:
        """Generate types file."""
        if not types:
            return None

        type_exports = '\n\n'.join(
            t.code or f"export interface {t.name} {{}}"
            for t in types
        )

        return GeneratedFileSchema(
            path='frontend/types/index.ts',
            content=f"/**\n * Type definitions for {package_name}\n */\n\n{type_exports}\n",
            type='type'
        )

    def _generate_index_file(
        self,
        elements: List[RemixElementSchema],
        options: GeneratorOptionsSchema
    ) -> GeneratedFileSchema:
        """Generate index.ts barrel export."""
        grouped = self._group_elements_by_type(elements)
        lines = [
            f"/**",
            f" * {options.display_name or self._to_display_name(options.package_name)}",
            f" * ",
            f" * {options.description or 'Generated package'}",
            f" */",
            f"",
            f"// Package Metadata",
            f"export const PACKAGE_ID = '{options.package_name}';",
            f"export const PACKAGE_VERSION = '{options.version or '1.0.0'}';",
            f""
        ]

        # Export components
        if grouped['components']:
            lines.append("// Components")
            for comp in grouped['components']:
                lines.append(f"export {{ {comp.name} }} from './components/{comp.name}';")
            lines.append("")

        # Export services
        if grouped['services']:
            lines.append("// Services")
            for svc in grouped['services']:
                lines.append(f"export {{ {svc.name} }} from './services/{svc.name}';")
            lines.append("")

        # Export hooks
        if grouped['hooks']:
            lines.append("// Hooks")
            for hook in grouped['hooks']:
                lines.append(f"export {{ {hook.name} }} from './hooks/{hook.name}';")
            lines.append("")

        # Export types
        if grouped['types']:
            lines.append("// Types")
            lines.append("export type {")
            for t in grouped['types']:
                lines.append(f"    {t.name},")
            lines.append("} from './types';")
            lines.append("")

        return GeneratedFileSchema(
            path='frontend/index.ts',
            content='\n'.join(lines),
            type='index'
        )

    def _generate_manifest(
        self,
        elements: List[RemixElementSchema],
        external_deps: List[str],
        options: GeneratorOptionsSchema
    ) -> Dict[str, Any]:
        """Generate manifest.json."""
        grouped = self._group_elements_by_type(elements)
        component_names = [c.name for c in grouped['components']]
        source_packages = list(set(e.source_package for e in elements))

        return {
            "$schema": "../_shared/manifest.schema.json",
            "name": options.package_name,
            "version": options.version or "1.0.0",
            "type": "component",
            "displayName": options.display_name or self._to_display_name(options.package_name),
            "description": options.description or f"Generated package containing {len(elements)} elements from {', '.join(source_packages)}",
            "entry": "./frontend/index.ts",
            "icon": options.icon or "📦",
            "sidebar": True,
            "components": component_names,
            "permissions": [],
            "tags": ["remix", "generated"] + source_packages,
            "category": options.category or "Generated",
            "author": options.author or "Remix IDE",
            "license": "EVE-MARKET-001",
            "marketId": f"{options.package_name}-{options.version or '1.0.0'}",
            "price": "free",
            "features": [
                f for f in [
                    f"{len(grouped['components'])} components" if grouped['components'] else None,
                    f"{len(grouped['services'])} services" if grouped['services'] else None,
                    f"{len(grouped['hooks'])} hooks" if grouped['hooks'] else None,
                ]
                if f
            ],
            "dependencies": {
                "npm": external_deps,
                "python": [],
                "packages": source_packages
            }
        }

    def _generate_readme(
        self,
        elements: List[RemixElementSchema],
        options: GeneratorOptionsSchema
    ) -> GeneratedFileSchema:
        """Generate README.md."""
        grouped = self._group_elements_by_type(elements)
        source_packages = list(set(e.source_package for e in elements))

        lines = [
            f"# {options.display_name or self._to_display_name(options.package_name)}",
            "",
            options.description or "Generated with EVE-OS Remix IDE",
            "",
            "## Source Packages",
            "",
            "This package was generated from elements in:",
            *[f"- {p}" for p in source_packages],
            "",
            "## Contents",
            "",
        ]

        if grouped['components']:
            lines.extend([
                "### Components",
                "",
                "| Component | Source |",
                "|-----------|--------|",
                *[f"| {c.name} | {c.source_package} |" for c in grouped['components']],
                "",
            ])

        if grouped['services']:
            lines.extend([
                "### Services",
                "",
                *[f"- `{s.name}` from {s.source_package}" for s in grouped['services']],
                "",
            ])

        if grouped['hooks']:
            lines.extend([
                "### Hooks",
                "",
                *[f"- `{h.name}` from {h.source_package}" for h in grouped['hooks']],
                "",
            ])

        lines.extend([
            "## Installation",
            "",
            "```bash",
            f"eve install {options.package_name}",
            "```",
            "",
            "## License",
            "",
            "EVE-MARKET-001",
            "",
            "---",
            "",
            "*Generated by EVE-OS Remix IDE*",
        ])

        return GeneratedFileSchema(
            path='README.md',
            content='\n'.join(lines),
            type='readme'
        )

    def _generate_backend_skeleton(
        self,
        options: GeneratorOptionsSchema
    ) -> List[GeneratedFileSchema]:
        """Generate backend skeleton files."""
        package_name = options.package_name
        class_name = self._to_class_name(package_name)

        return [
            GeneratedFileSchema(
                path='backend/__init__.py',
                content=f'''"""
{options.display_name or self._to_display_name(package_name)} - Backend Module
Generated by EVE-OS Remix IDE
"""

from .routes import router
from .service import {class_name}Service

__all__ = ['router', '{class_name}Service']
''',
                type='index'
            ),
            GeneratedFileSchema(
                path='backend/routes.py',
                content=f'''"""
{options.display_name or self._to_display_name(package_name)} - FastAPI Routes
Generated by EVE-OS Remix IDE
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/{package_name}",
    tags=["{package_name}"]
)

@router.get("/status")
async def get_status():
    """Get package status."""
    return {{"status": "ok", "version": "{options.version or '1.0.0'}"}}
''',
                type='index'
            ),
            GeneratedFileSchema(
                path='backend/service.py',
                content=f'''"""
{options.display_name or self._to_display_name(package_name)} - Business Logic Service
Generated by EVE-OS Remix IDE
"""

class {class_name}Service:
    """Main service class for {options.display_name or self._to_display_name(package_name)}."""

    def __init__(self):
        pass
''',
                type='service'
            ),
            GeneratedFileSchema(
                path='backend/requirements.txt',
                content=f'''# {options.display_name or self._to_display_name(package_name)} - Python Dependencies
# Generated by EVE-OS Remix IDE
#
# Core dependencies already available from EVE OS:
# - fastapi
# - pydantic

# Add package-specific dependencies below:
''',
                type='index'
            ),
        ]

    def _rewrite_imports(self, code: str, package_name: str) -> str:
        """Rewrite imports to be relative within the package."""
        rewritten = code
        rewritten = rewritten.replace('@/components/devportal/', '../')
        rewritten = rewritten.replace('@/services/', '../services/')
        rewritten = rewritten.replace('@/hooks/', '../hooks/')
        return rewritten

    def _to_display_name(self, name: str) -> str:
        """Convert package name to display name."""
        return ' '.join(word.capitalize() for word in name.split('-'))

    def _to_class_name(self, name: str) -> str:
        """Convert package name to class name."""
        return ''.join(word.capitalize() for word in name.split('-'))

    def _generate_placeholder_component(self, element: RemixElementSchema) -> str:
        """Generate placeholder component code."""
        return f'''/**
 * {element.name}
 * Imported from {element.source_package}
 */
import React from 'react';

export interface {element.name}Props {{
    // TODO: Add props
}}

export function {element.name}(props: {element.name}Props) {{
    return (
        <div className="{element.name.lower()}">
            <h2>{element.name}</h2>
            <p>Component imported from {element.source_package}</p>
        </div>
    );
}}

export default {element.name};
'''

    def _generate_placeholder_service(self, element: RemixElementSchema) -> str:
        """Generate placeholder service code."""
        return f'''/**
 * {element.name}
 * Imported from {element.source_package}
 */

class {element.name}Class {{
    // TODO: Implement service methods
}}

export const {element.name} = new {element.name}Class();
export default {element.name};
'''

    def _generate_placeholder_hook(self, element: RemixElementSchema) -> str:
        """Generate placeholder hook code."""
        return f'''/**
 * {element.name}
 * Imported from {element.source_package}
 */
import {{ useState, useCallback }} from 'react';

export function {element.name}() {{
    // TODO: Implement hook logic
    return {{}};
}}

export default {element.name};
'''

    # ========================================================================
    # Package Export Methods
    # ========================================================================

    async def create_package_zip(
        self,
        response: PackageGenerateResponse
    ) -> bytes:
        """
        Create a zip file from generated package.

        Args:
            response: The package generation response

        Returns:
            Bytes of the zip file
        """
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in response.files:
                # Add file to zip at package_name/path
                zip_path = f"{response.name}/{file.path}"
                zf.writestr(zip_path, file.content)

        buffer.seek(0)
        return buffer.read()

    async def save_package_to_disk(
        self,
        response: PackageGenerateResponse,
        base_path: Optional[str] = None
    ) -> str:
        """
        Save generated package to the market_source directory.

        Args:
            response: The package generation response
            base_path: Override base path (defaults to market_source/packages)

        Returns:
            Path where package was saved
        """
        if not response.success:
            raise ValueError(f"Cannot save failed package: {response.error}")

        packages_dir = Path(base_path or self.market_source_path) / 'packages'
        package_dir = packages_dir / response.name

        # Create package directory
        package_dir.mkdir(parents=True, exist_ok=True)

        # Write all files
        for file in response.files:
            file_path = package_dir / file.path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(file.content, encoding='utf-8')

        return str(package_dir)
