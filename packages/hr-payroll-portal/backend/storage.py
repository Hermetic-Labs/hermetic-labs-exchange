"""
HR & Payroll Portal - Persistent Storage Implementations

This module provides concrete storage backends that implement StorageProtocol.
The default is JsonFileStorage for simplicity and portability.

For production at scale, swap in SQLiteStorage or a database backend.
"""

import json
import os
import sqlite3
import aiosqlite
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
import uuid


# ============================================================================
# JSON File Storage (Default - Simple, Portable)
# ============================================================================

class JsonFileStorage:
    """
    File-based JSON storage for HR data.

    Simple, portable, and works everywhere. Good for single-user/small deployments.
    Data persists across restarts in a JSON file.

    Usage:
        storage = JsonFileStorage("./data/hr_data.json")
        await storage.create("employees", {"id": "emp_1", "name": "Alice"})
    """

    def __init__(self, filepath: str = "./data/hr_data.json"):
        self.filepath = Path(filepath)
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._load()

    def _load(self):
        """Load data from file or initialize empty."""
        if self.filepath.exists():
            try:
                with open(self.filepath, "r") as f:
                    self._data = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._data = {}
        else:
            self._data = {}

        # Ensure all collections exist
        for collection in ["employees", "departments", "paystubs", "job_postings"]:
            if collection not in self._data:
                self._data[collection] = {}

    def _save(self):
        """Persist data to file."""
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(self.filepath, "w") as f:
            json.dump(self._data, f, indent=2, default=str)

    async def get(self, collection: str, id: str) -> Optional[Dict[str, Any]]:
        """Get a single item by ID."""
        return self._data.get(collection, {}).get(id)

    async def list(self, collection: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """List items with optional filters."""
        items = list(self._data.get(collection, {}).values())
        if filters:
            for key, value in filters.items():
                items = [i for i in items if i.get(key) == value]
        return items

    async def create(self, collection: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item."""
        if collection not in self._data:
            self._data[collection] = {}

        # Ensure ID exists
        if "id" not in data:
            data["id"] = f"{collection[:3]}_{uuid.uuid4().hex[:8]}"

        self._data[collection][data["id"]] = data
        self._save()
        return data

    async def update(self, collection: str, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing item."""
        if id not in self._data.get(collection, {}):
            return None

        self._data[collection][id].update(data)
        self._data[collection][id]["updated_at"] = datetime.utcnow().isoformat()
        self._save()
        return self._data[collection][id]

    async def delete(self, collection: str, id: str) -> bool:
        """Delete an item."""
        if id in self._data.get(collection, {}):
            del self._data[collection][id]
            self._save()
            return True
        return False


# ============================================================================
# SQLite Storage (For larger deployments)
# ============================================================================

class SQLiteStorage:
    """
    SQLite-based storage for HR data.

    Better for larger datasets and concurrent access.
    Uses aiosqlite for async operations.

    Usage:
        storage = SQLiteStorage("./data/hr_data.db")
        await storage.initialize()
        await storage.create("employees", {"id": "emp_1", "name": "Alice"})
    """

    def __init__(self, db_path: str = "./data/hr_data.db"):
        self.db_path = db_path
        self._initialized = False

    async def initialize(self):
        """Create tables if they don't exist."""
        if self._initialized:
            return

        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        async with aiosqlite.connect(self.db_path) as db:
            # Generic key-value store for each collection
            await db.execute("""
                CREATE TABLE IF NOT EXISTS employees (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS departments (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS paystubs (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS job_postings (
                    id TEXT PRIMARY KEY,
                    department_id TEXT,
                    status TEXT,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """)
            await db.commit()

        self._initialized = True

    async def get(self, collection: str, id: str) -> Optional[Dict[str, Any]]:
        """Get a single item by ID."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"SELECT data FROM {collection} WHERE id = ?",
                (id,)
            )
            row = await cursor.fetchone()
            if row:
                return json.loads(row[0])
            return None

    async def list(self, collection: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """List items with optional filters."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(f"SELECT data FROM {collection}")
            rows = await cursor.fetchall()
            items = [json.loads(row[0]) for row in rows]

            # Apply filters in Python (simple approach)
            if filters:
                for key, value in filters.items():
                    items = [i for i in items if i.get(key) == value]

            return items

    async def create(self, collection: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item."""
        await self.initialize()

        if "id" not in data:
            data["id"] = f"{collection[:3]}_{uuid.uuid4().hex[:8]}"

        data["created_at"] = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            # Build column list based on collection
            columns = ["id", "data"]
            values = [data["id"], json.dumps(data, default=str)]

            if collection == "paystubs" and "employee_id" in data:
                columns.append("employee_id")
                values.append(data["employee_id"])
            elif collection == "job_postings":
                if "department_id" in data:
                    columns.append("department_id")
                    values.append(data["department_id"])
                if "status" in data:
                    columns.append("status")
                    values.append(data["status"])

            placeholders = ",".join(["?" for _ in values])
            cols = ",".join(columns)

            await db.execute(
                f"INSERT OR REPLACE INTO {collection} ({cols}) VALUES ({placeholders})",
                values
            )
            await db.commit()

        return data

    async def update(self, collection: str, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing item."""
        await self.initialize()

        existing = await self.get(collection, id)
        if not existing:
            return None

        existing.update(data)
        existing["updated_at"] = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE {collection} SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (json.dumps(existing, default=str), id)
            )
            await db.commit()

        return existing

    async def delete(self, collection: str, id: str) -> bool:
        """Delete an item."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"DELETE FROM {collection} WHERE id = ?",
                (id,)
            )
            await db.commit()
            return cursor.rowcount > 0


# ============================================================================
# Storage Factory
# ============================================================================

def get_storage(storage_type: str = "json", **kwargs) -> Any:
    """
    Factory function to get the appropriate storage backend.

    Args:
        storage_type: "json" or "sqlite"
        **kwargs: Additional arguments for the storage constructor

    Returns:
        Storage instance implementing StorageProtocol

    Usage:
        storage = get_storage("json", filepath="./data/hr.json")
        storage = get_storage("sqlite", db_path="./data/hr.db")
    """
    if storage_type == "json":
        return JsonFileStorage(kwargs.get("filepath", "./data/hr_data.json"))
    elif storage_type == "sqlite":
        return SQLiteStorage(kwargs.get("db_path", "./data/hr_data.db"))
    else:
        raise ValueError(f"Unknown storage type: {storage_type}")


# Default storage instance (can be imported and used directly)
default_storage = JsonFileStorage()
