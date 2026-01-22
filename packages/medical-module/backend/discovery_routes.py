"""
Network Discovery WebSocket Routes

Provides WebSocket endpoint for medical module node discovery.
Nodes (bedside units, nurse stations) announce themselves and
discover other nodes on the network.

Protocol:
- NODE_ANNOUNCE: Node announces its presence
- NODE_LIST: Server sends list of known nodes
- NODE_LEAVE: Node is leaving the network
- PING/PONG: Keep-alive mechanism
"""

import asyncio
import time
from typing import Dict, Optional, Set
from dataclasses import dataclass, asdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from starlette.websockets import WebSocketState


router = APIRouter(tags=["discovery"])


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class DiscoveredNode:
    """Represents a discovered node on the network."""
    node_id: str
    node_type: str  # 'bedside', 'nurse-station', 'admin'
    node_name: str
    room: Optional[str]
    ip: str
    port: int
    last_seen: float
    capabilities: list


# =============================================================================
# NODE REGISTRY
# =============================================================================

class NodeRegistry:
    """Thread-safe registry of discovered nodes."""

    def __init__(self):
        self.nodes: Dict[str, DiscoveredNode] = {}
        self.connections: Dict[str, WebSocket] = {}
        self.node_timeout = 30.0  # Seconds before node considered offline

    def register(self, node: DiscoveredNode, ws: WebSocket) -> None:
        """Register or update a node."""
        self.nodes[node.node_id] = node
        self.connections[node.node_id] = ws

    def unregister(self, node_id: str) -> None:
        """Remove a node from the registry."""
        self.nodes.pop(node_id, None)
        self.connections.pop(node_id, None)

    def update_heartbeat(self, node_id: str) -> None:
        """Update last_seen timestamp for a node."""
        if node_id in self.nodes:
            self.nodes[node_id].last_seen = time.time()

    def get_active_nodes(self) -> list:
        """Get list of nodes seen within timeout period."""
        now = time.time()
        active = []
        for node in self.nodes.values():
            if now - node.last_seen < self.node_timeout:
                active.append({
                    "nodeId": node.node_id,
                    "nodeType": node.node_type,
                    "nodeName": node.node_name,
                    "room": node.room,
                    "ip": node.ip,
                    "port": node.port,
                    "capabilities": node.capabilities
                })
        return active

    def get_nodes_by_type(self, node_type: str) -> list:
        """Get active nodes of a specific type."""
        return [n for n in self.get_active_nodes() if n["nodeType"] == node_type]

    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> None:
        """Broadcast a message to all connected nodes."""
        disconnected = []

        for node_id, ws in self.connections.items():
            if node_id == exclude:
                continue

            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(message)
            except Exception:
                disconnected.append(node_id)

        # Clean up disconnected nodes
        for node_id in disconnected:
            self.unregister(node_id)

    async def cleanup_stale(self) -> None:
        """Remove nodes that haven't sent heartbeat."""
        now = time.time()
        stale = [
            node_id for node_id, node in self.nodes.items()
            if now - node.last_seen > self.node_timeout
        ]

        for node_id in stale:
            self.unregister(node_id)
            await self.broadcast({
                "type": "NODE_LEAVE",
                "nodeId": node_id
            })


# Global registry
registry = NodeRegistry()


# =============================================================================
# WEBSOCKET ENDPOINT
# =============================================================================

@router.websocket("/discovery")
async def discovery_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for node discovery.

    Nodes connect here to:
    1. Announce their presence (NODE_ANNOUNCE)
    2. Receive list of other nodes (NODE_LIST)
    3. Get notified when nodes join/leave
    """
    await websocket.accept()

    node_id: Optional[str] = None
    client_ip = websocket.client.host if websocket.client else "unknown"

    try:
        # Send current node list immediately
        await websocket.send_json({
            "type": "NODE_LIST",
            "nodes": registry.get_active_nodes()
        })

        while True:
            try:
                # Wait for message with timeout for ping
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=15.0
                )
            except asyncio.TimeoutError:
                # Send ping to check connection
                try:
                    await websocket.send_json({"type": "PING"})
                except Exception:
                    break
                continue

            msg_type = data.get("type")

            if msg_type == "NODE_ANNOUNCE":
                # Register/update node
                node_id = data.get("nodeId")
                if not node_id:
                    continue

                node = DiscoveredNode(
                    node_id=node_id,
                    node_type=data.get("nodeType", "unknown"),
                    node_name=data.get("nodeName", "Unknown"),
                    room=data.get("room"),
                    ip=client_ip,
                    port=data.get("port", 8001),
                    last_seen=time.time(),
                    capabilities=data.get("capabilities", [])
                )

                registry.register(node, websocket)

                # Broadcast to other nodes
                await registry.broadcast({
                    "type": "NODE_ANNOUNCE",
                    "nodeId": node.node_id,
                    "nodeType": node.node_type,
                    "nodeName": node.node_name,
                    "room": node.room,
                    "ip": node.ip,
                    "port": node.port,
                    "capabilities": node.capabilities
                }, exclude=node_id)

            elif msg_type == "PONG":
                # Update heartbeat
                if node_id:
                    registry.update_heartbeat(node_id)

            elif msg_type == "GET_NODES":
                # Return current node list
                await websocket.send_json({
                    "type": "NODE_LIST",
                    "nodes": registry.get_active_nodes()
                })

            elif msg_type == "GET_NURSE_STATIONS":
                # Return only nurse stations
                await websocket.send_json({
                    "type": "NODE_LIST",
                    "nodes": registry.get_nodes_by_type("nurse-station")
                })

            elif msg_type == "GET_BEDSIDES":
                # Return only bedside units
                await websocket.send_json({
                    "type": "NODE_LIST",
                    "nodes": registry.get_nodes_by_type("bedside")
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Discovery] WebSocket error: {e}")
    finally:
        # Clean up on disconnect
        if node_id:
            registry.unregister(node_id)
            await registry.broadcast({
                "type": "NODE_LEAVE",
                "nodeId": node_id
            })


# =============================================================================
# REST ENDPOINTS (for debugging/admin)
# =============================================================================

@router.get("/nodes")
async def get_discovered_nodes():
    """Get all currently discovered nodes (REST endpoint)."""
    return {
        "nodes": registry.get_active_nodes(),
        "total": len(registry.get_active_nodes())
    }


@router.get("/nodes/bedside")
async def get_bedside_nodes():
    """Get all bedside units."""
    nodes = registry.get_nodes_by_type("bedside")
    return {
        "nodes": nodes,
        "total": len(nodes)
    }


@router.get("/nodes/nurse-station")
async def get_nurse_station_nodes():
    """Get all nurse stations."""
    nodes = registry.get_nodes_by_type("nurse-station")
    return {
        "nodes": nodes,
        "total": len(nodes)
    }
