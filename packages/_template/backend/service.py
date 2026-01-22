"""
Package Name - Business Logic Service

This is where your core business logic lives, separate from the routes.
Benefits of this pattern:
- Routes stay thin (just HTTP handling)
- Logic is easily testable
- Can be reused by other parts of the system

Design Guidelines:
- Use async methods for I/O operations
- Return structured responses (not raw data)
- Handle errors gracefully
- Use dependency injection for external services
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import time

from .schemas import (
    PackageRequest,
    PackageResponse,
    StatusResponse,
)

# Track when service was initialized (for uptime)
_start_time = time.time()


class PackageService:
    """
    Main service class for package business logic.
    
    This class handles all the core functionality. Routes call these methods
    and handle the HTTP layer (status codes, headers, etc).
    """
    
    def __init__(self):
        """Initialize the service."""
        # Add any initialization here
        # Example: database connections, cache setup, etc.
        self._cache: Dict[str, Any] = {}
    
    # ========================================================================
    # Status Methods
    # ========================================================================
    
    async def get_status(self) -> StatusResponse:
        """
        Get service status for health checks.
        
        Returns:
            StatusResponse with current status and uptime
        """
        uptime = time.time() - _start_time
        
        return StatusResponse(
            status="ok",
            version="1.0.0",
            uptime_seconds=uptime,
            details={
                "cache_size": len(self._cache),
                "initialized": True
            }
        )
    
    # ========================================================================
    # CRUD Methods
    # ========================================================================
    
    async def get_item(self, item_id: str) -> PackageResponse:
        """
        Get an item by ID.
        
        Args:
            item_id: The unique identifier
            
        Returns:
            PackageResponse with the item data or error
        """
        # TODO: Replace with your actual data retrieval logic
        # Example: database query, cache lookup, API call
        
        if item_id in self._cache:
            return PackageResponse(
                success=True,
                data=self._cache[item_id]
            )
        
        return PackageResponse(
            success=False,
            error=f"Item '{item_id}' not found"
        )
    
    async def create_item(self, request: PackageRequest) -> PackageResponse:
        """
        Create a new item.
        
        Args:
            request: The item data to create
            
        Returns:
            PackageResponse with the created item
        """
        # Generate a simple ID (replace with your ID generation)
        item_id = f"item_{int(time.time() * 1000)}"
        
        item_data = {
            "id": item_id,
            "name": request.name,
            "description": request.description,
            "metadata": request.metadata,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # TODO: Replace with your actual storage logic
        self._cache[item_id] = item_data
        
        return PackageResponse(
            success=True,
            data=item_data
        )
    
    async def update_item(
        self,
        item_id: str,
        request: PackageRequest
    ) -> PackageResponse:
        """
        Update an existing item.
        
        Args:
            item_id: The ID of the item to update
            request: The updated data
            
        Returns:
            PackageResponse with the updated item
        """
        if item_id not in self._cache:
            return PackageResponse(
                success=False,
                error=f"Item '{item_id}' not found"
            )
        
        # Update the item
        item_data = self._cache[item_id]
        item_data.update({
            "name": request.name,
            "description": request.description,
            "metadata": request.metadata,
            "updated_at": datetime.utcnow().isoformat(),
        })
        
        return PackageResponse(
            success=True,
            data=item_data
        )
    
    async def delete_item(self, item_id: str) -> bool:
        """
        Delete an item.
        
        Args:
            item_id: The ID of the item to delete
            
        Returns:
            True if deleted, False if not found
        """
        if item_id in self._cache:
            del self._cache[item_id]
            return True
        return False
    
    async def list_items(
        self,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        List all items with pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            
        Returns:
            Dict with items and pagination info
        """
        items = list(self._cache.values())
        total = len(items)
        
        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated = items[start:end]
        
        return {
            "items": paginated,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page or 1
        }
