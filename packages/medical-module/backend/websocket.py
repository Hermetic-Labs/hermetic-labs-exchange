"""
Medical WebSocket Handlers

Real-time communication between bedside units, nurse stations, and the hospital server.
Handles:
- Fall/bed exit alerts
- Video call signaling
- Room status updates
- Call queue management with overflow
"""

import json
import logging
import asyncio
from typing import Dict, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RoomConnection:
    """Represents a connected bedside/patient room."""
    websocket: WebSocket
    room_id: str
    patient_id: str
    patient_name: str
    connected_at: datetime = field(default_factory=datetime.utcnow)
    in_call: bool = False
    call_with: Optional[str] = None  # Station ID if in call


@dataclass
class StationConnection:
    """Represents a connected nurse station."""
    websocket: WebSocket
    station_id: str
    station_name: str
    location: str = ""
    max_calls: int = 2
    current_calls: int = 0
    connected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class QueuedCall:
    """Call waiting in the queue."""
    call_id: str
    room_id: str
    patient_id: str
    patient_name: str
    prompt_message: Optional[str]
    timestamp: datetime
    offer: Optional[dict]
    overflow_attempts: int = 0
    assigned_station: Optional[str] = None


class MedicalWebSocketManager:
    """
    Manages WebSocket connections for the medical module.

    Handles:
    - Room (bedside) connections
    - Nurse station connections
    - Alert routing
    - Video call signaling
    - Call queue with overflow
    """

    def __init__(self):
        # Room connections: room_id -> RoomConnection
        self.rooms: Dict[str, RoomConnection] = {}

        # Station connections: station_id -> StationConnection
        self.stations: Dict[str, StationConnection] = {}

        # Call queue
        self.call_queue: Dict[str, QueuedCall] = {}

        # Active calls: call_id -> (room_id, station_id)
        self.active_calls: Dict[str, tuple] = {}

        # Lock for thread safety
        self._lock = asyncio.Lock()

    # =========================================================================
    # Connection Management
    # =========================================================================

    async def connect_room(
        self,
        websocket: WebSocket,
        room_id: str,
        patient_id: str = "",
        patient_name: str = ""
    ) -> RoomConnection:
        """Register a new room connection (websocket already accepted)."""
        async with self._lock:
            connection = RoomConnection(
                websocket=websocket,
                room_id=room_id,
                patient_id=patient_id,
                patient_name=patient_name
            )
            self.rooms[room_id] = connection

        logger.info(f"Room {room_id} connected")

        # Notify all stations about new room
        await self.broadcast_to_stations({
            "type": "ROOM_CONNECTED",
            "roomId": room_id,
            "patientId": patient_id,
            "patientName": patient_name
        })

        return connection

    async def disconnect_room(self, room_id: str):
        """Handle room disconnection."""
        async with self._lock:
            if room_id in self.rooms:
                connection = self.rooms[room_id]

                # End any active call
                if connection.in_call and connection.call_with:
                    await self.end_call_for_room(room_id)

                del self.rooms[room_id]
                logger.info(f"Room {room_id} disconnected")

        # Notify stations
        await self.broadcast_to_stations({
            "type": "ROOM_DISCONNECTED",
            "roomId": room_id
        })

    async def connect_station(
        self,
        websocket: WebSocket,
        station_id: str,
        station_name: str = "",
        location: str = "",
        max_calls: int = 2
    ) -> StationConnection:
        """Register a new nurse station connection (websocket already accepted)."""
        async with self._lock:
            connection = StationConnection(
                websocket=websocket,
                station_id=station_id,
                station_name=station_name,
                location=location,
                max_calls=max_calls
            )
            self.stations[station_id] = connection

        logger.info(f"Station {station_id} ({station_name}) connected")

        # Send current room list
        room_list = [
            {
                "roomId": r.room_id,
                "patientId": r.patient_id,
                "patientName": r.patient_name
            }
            for r in self.rooms.values()
        ]

        await self.send_to_station(station_id, {
            "type": "ROOM_LIST",
            "rooms": room_list
        })

        # Notify other stations
        await self.broadcast_to_stations({
            "type": "STATION_CONNECTED",
            "stationId": station_id,
            "stationName": station_name,
            "location": location,
            "maxCalls": max_calls
        }, exclude=station_id)

        return connection

    async def disconnect_station(self, station_id: str):
        """Handle station disconnection."""
        async with self._lock:
            if station_id in self.stations:
                # Reassign any queued calls
                for call_id, call in list(self.call_queue.items()):
                    if call.assigned_station == station_id:
                        call.assigned_station = None
                        await self.try_assign_call(call)

                del self.stations[station_id]
                logger.info(f"Station {station_id} disconnected")

        # Notify other stations
        await self.broadcast_to_stations({
            "type": "STATION_DISCONNECTED",
            "stationId": station_id
        })

    # =========================================================================
    # Alert Routing
    # =========================================================================

    async def send_fall_alert(
        self,
        room_id: str,
        event: dict,
        patient: dict,
        vitals: dict
    ):
        """Send a fall/bed exit alert to all nurse stations."""
        alert = {
            "type": "FALL_ALERT",
            "event": event,
            "patient": patient,
            "vitals": vitals,
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.warning(f"FALL ALERT from room {room_id}: {event.get('type')}")

        await self.broadcast_to_stations(alert)

    async def send_vitals_alert(
        self,
        room_id: str,
        patient_name: str,
        vitals: dict,
        alerts: list
    ):
        """Send vitals warning to nurse stations."""
        alert = {
            "type": "VITALS_ALERT",
            "roomId": room_id,
            "patientName": patient_name,
            "vitals": vitals,
            "alerts": alerts,
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.broadcast_to_stations(alert)

    # =========================================================================
    # Video Call Signaling
    # =========================================================================

    async def handle_call_from_room(
        self,
        room_id: str,
        patient_id: str,
        patient_name: str,
        offer: dict,
        prompt_message: Optional[str] = None
    ) -> str:
        """Handle incoming call request from a room."""
        call_id = f"call-{room_id}-{datetime.utcnow().timestamp()}"

        call = QueuedCall(
            call_id=call_id,
            room_id=room_id,
            patient_id=patient_id,
            patient_name=patient_name,
            prompt_message=prompt_message,
            timestamp=datetime.utcnow(),
            offer=offer
        )

        async with self._lock:
            self.call_queue[call_id] = call

            if room_id in self.rooms:
                self.rooms[room_id].in_call = True

        # Broadcast to all stations
        await self.broadcast_to_stations({
            "type": "CALL_REQUEST",
            "callId": call_id,
            "roomId": room_id,
            "patientId": patient_id,
            "patientName": patient_name,
            "promptMessage": prompt_message,
            "timestamp": call.timestamp.isoformat(),
            "offer": offer
        })

        logger.info(f"Call request from room {room_id} queued: {call_id}")

        return call_id

    async def handle_call_from_station(
        self,
        station_id: str,
        station_name: str,
        room_id: str,
        offer: dict,
        prompt_message: Optional[str] = None
    ):
        """Handle call initiated by nurse station to room."""
        if room_id not in self.rooms:
            logger.warning(f"Cannot call room {room_id}: not connected")
            return

        # Send to room
        await self.send_to_room(room_id, {
            "type": "INCOMING_CALL",
            "callId": f"call-{station_id}-{room_id}",
            "fromStationId": station_id,
            "fromStationName": station_name,
            "promptMessage": prompt_message,
            "offer": offer
        })

        logger.info(f"Station {station_id} calling room {room_id}")

    async def handle_call_accepted(
        self,
        room_id: str,
        call_id: str = None,
        answer: dict = None
    ):
        """Handle call acceptance from room or station."""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            room.in_call = True

        # Find the call and station
        if call_id and call_id in self.call_queue:
            call = self.call_queue[call_id]
            if call.assigned_station:
                room.call_with = call.assigned_station

                # Update station
                if call.assigned_station in self.stations:
                    self.stations[call.assigned_station].current_calls += 1

                # Send answer to station
                await self.send_to_station(call.assigned_station, {
                    "type": "CALL_ACCEPTED",
                    "roomId": room_id,
                    "answer": answer
                })

                # Move to active calls
                self.active_calls[call_id] = (room_id, call.assigned_station)
                del self.call_queue[call_id]
        else:
            # Direct call (station initiated), send answer back
            await self.broadcast_to_stations({
                "type": "CALL_ACCEPTED",
                "roomId": room_id,
                "answer": answer
            })

    async def handle_call_rejected(self, room_id: str, call_id: str):
        """Handle call rejection from room."""
        if call_id in self.call_queue:
            call = self.call_queue[call_id]
            if call.assigned_station:
                await self.send_to_station(call.assigned_station, {
                    "type": "CALL_REJECTED",
                    "roomId": room_id,
                    "callId": call_id
                })
            del self.call_queue[call_id]

        if room_id in self.rooms:
            self.rooms[room_id].in_call = False

    async def handle_station_answer_call(
        self,
        station_id: str,
        call_id: str
    ):
        """Station is answering a queued call."""
        if call_id not in self.call_queue:
            return

        call = self.call_queue[call_id]
        call.assigned_station = station_id

        # Send to room that station is answering
        await self.send_to_room(call.room_id, {
            "type": "CALL_ANSWERED",
            "callId": call_id,
            "stationId": station_id,
            "stationName": self.stations[station_id].station_name if station_id in self.stations else station_id
        })

    async def end_call(self, call_id: str):
        """End an active call."""
        if call_id in self.active_calls:
            room_id, station_id = self.active_calls[call_id]

            # Update room
            if room_id in self.rooms:
                self.rooms[room_id].in_call = False
                self.rooms[room_id].call_with = None
                await self.send_to_room(room_id, {"type": "CALL_ENDED"})

            # Update station
            if station_id in self.stations:
                self.stations[station_id].current_calls = max(0, self.stations[station_id].current_calls - 1)
                await self.send_to_station(station_id, {
                    "type": "CALL_ENDED",
                    "roomId": room_id
                })

            del self.active_calls[call_id]
            logger.info(f"Call {call_id} ended")

    async def end_call_for_room(self, room_id: str):
        """End any call involving this room."""
        for call_id, (r_id, s_id) in list(self.active_calls.items()):
            if r_id == room_id:
                await self.end_call(call_id)
                break

    # =========================================================================
    # Call Queue & Overflow
    # =========================================================================

    async def try_assign_call(self, call: QueuedCall):
        """Try to assign a call to an available station."""
        for station_id, station in self.stations.items():
            if station.current_calls < station.max_calls:
                call.assigned_station = station_id

                await self.send_to_station(station_id, {
                    "type": "CALL_ASSIGNED",
                    "callId": call.call_id,
                    "roomId": call.room_id,
                    "patientId": call.patient_id,
                    "patientName": call.patient_name,
                    "promptMessage": call.prompt_message,
                    "offer": call.offer
                })
                return True

        return False

    async def overflow_call(
        self,
        call_id: str,
        from_station: str,
        to_station_id: str
    ):
        """Overflow a call to another station."""
        if call_id not in self.call_queue:
            return False

        call = self.call_queue[call_id]
        call.overflow_attempts += 1
        call.assigned_station = to_station_id

        await self.send_to_station(to_station_id, {
            "type": "CALL_OVERFLOW",
            "callId": call_id,
            "fromStation": from_station,
            "roomId": call.room_id,
            "patientId": call.patient_id,
            "patientName": call.patient_name,
            "promptMessage": call.prompt_message,
            "timestamp": call.timestamp.isoformat(),
            "overflowAttempts": call.overflow_attempts,
            "offer": call.offer
        })

        logger.info(f"Call {call_id} overflowed from {from_station} to {to_station_id}")
        return True

    # =========================================================================
    # ICE Candidate Relay
    # =========================================================================

    async def relay_ice_candidate(
        self,
        from_room: bool,
        identifier: str,  # room_id or station_id
        candidate: dict,
        target_room_id: str = None
    ):
        """Relay ICE candidate between peers."""
        if from_room:
            # From room to all stations (or specific station if in call)
            if identifier in self.rooms and self.rooms[identifier].call_with:
                await self.send_to_station(self.rooms[identifier].call_with, {
                    "type": "ICE_CANDIDATE",
                    "candidate": candidate,
                    "roomId": identifier
                })
            else:
                await self.broadcast_to_stations({
                    "type": "ICE_CANDIDATE",
                    "candidate": candidate,
                    "roomId": identifier
                })
        else:
            # From station to room
            if target_room_id:
                await self.send_to_room(target_room_id, {
                    "type": "ICE_CANDIDATE",
                    "candidate": candidate
                })

    # =========================================================================
    # Prompt Messages
    # =========================================================================

    async def send_prompt_to_room(
        self,
        room_id: str,
        message: str,
        from_station: str
    ):
        """Send a prompt message to a room during call."""
        await self.send_to_room(room_id, {
            "type": "PROMPT_MESSAGE",
            "message": message,
            "fromStation": from_station
        })

    async def send_prompt_to_station(
        self,
        room_id: str,
        message: str,
        patient_name: str
    ):
        """Send a prompt message from room to station during call."""
        if room_id in self.rooms and self.rooms[room_id].call_with:
            await self.send_to_station(self.rooms[room_id].call_with, {
                "type": "PROMPT_MESSAGE",
                "message": message,
                "roomId": room_id,
                "patientName": patient_name
            })

    # =========================================================================
    # Message Sending
    # =========================================================================

    async def send_to_room(self, room_id: str, message: dict):
        """Send message to a specific room."""
        if room_id in self.rooms:
            try:
                await self.rooms[room_id].websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to room {room_id}: {e}")
                await self.disconnect_room(room_id)

    async def send_to_station(self, station_id: str, message: dict):
        """Send message to a specific station."""
        if station_id in self.stations:
            try:
                await self.stations[station_id].websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to station {station_id}: {e}")
                await self.disconnect_station(station_id)

    async def broadcast_to_stations(
        self,
        message: dict,
        exclude: str = None
    ):
        """Broadcast message to all connected stations."""
        for station_id in list(self.stations.keys()):
            if station_id != exclude:
                await self.send_to_station(station_id, message)

    async def broadcast_to_rooms(
        self,
        message: dict,
        exclude: str = None
    ):
        """Broadcast message to all connected rooms."""
        for room_id in list(self.rooms.keys()):
            if room_id != exclude:
                await self.send_to_room(room_id, message)


# Global instance
medical_ws_manager = MedicalWebSocketManager()


# =========================================================================
# WebSocket Route Handlers
# =========================================================================

async def handle_room_websocket(websocket: WebSocket, room_id: str):
    """WebSocket handler for bedside/room connections."""
    connection = None

    try:
        # Wait for registration message
        await websocket.accept()

        # First message should be registration
        data = await websocket.receive_json()

        if data.get("type") == "REGISTER_ROOM":
            connection = await medical_ws_manager.connect_room(
                websocket,
                room_id,
                data.get("patientId", ""),
                data.get("patientName", "")
            )
        else:
            # Default connection
            connection = RoomConnection(
                websocket=websocket,
                room_id=room_id,
                patient_id="",
                patient_name=""
            )
            medical_ws_manager.rooms[room_id] = connection

        # Message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "FALL_ALERT":
                await medical_ws_manager.send_fall_alert(
                    room_id,
                    data.get("event", {}),
                    data.get("patient", {}),
                    data.get("vitals", {})
                )

            elif msg_type == "CALL_NURSE_STATION":
                await medical_ws_manager.handle_call_from_room(
                    room_id,
                    data.get("patientId", ""),
                    data.get("patientName", ""),
                    data.get("offer"),
                    data.get("promptMessage")
                )

            elif msg_type == "ACCEPT_CALL":
                await medical_ws_manager.handle_call_accepted(
                    room_id,
                    data.get("callId"),
                    data.get("answer")
                )

            elif msg_type == "REJECT_CALL":
                await medical_ws_manager.handle_call_rejected(
                    room_id,
                    data.get("callId")
                )

            elif msg_type == "END_CALL":
                await medical_ws_manager.end_call_for_room(room_id)

            elif msg_type == "ICE_CANDIDATE":
                await medical_ws_manager.relay_ice_candidate(
                    from_room=True,
                    identifier=room_id,
                    candidate=data.get("candidate")
                )

            elif msg_type == "PROMPT_MESSAGE":
                await medical_ws_manager.send_prompt_to_station(
                    room_id,
                    data.get("message", ""),
                    connection.patient_name if connection else ""
                )

    except WebSocketDisconnect:
        logger.info(f"Room {room_id} WebSocket disconnected")
    except Exception as e:
        logger.error(f"Room {room_id} WebSocket error: {e}")
    finally:
        await medical_ws_manager.disconnect_room(room_id)


async def handle_station_websocket(websocket: WebSocket, station_id: str):
    """WebSocket handler for nurse station connections."""
    connection = None

    try:
        await websocket.accept()

        # First message should be registration
        data = await websocket.receive_json()

        if data.get("type") == "REGISTER_STATION":
            connection = await medical_ws_manager.connect_station(
                websocket,
                station_id,
                data.get("stationName", station_id),
                data.get("location", ""),
                data.get("maxCalls", 2)
            )
        else:
            connection = StationConnection(
                websocket=websocket,
                station_id=station_id,
                station_name=station_id
            )
            medical_ws_manager.stations[station_id] = connection

        # Message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "CALL_ROOM":
                await medical_ws_manager.handle_call_from_station(
                    station_id,
                    connection.station_name,
                    data.get("roomId"),
                    data.get("offer"),
                    data.get("promptMessage")
                )

            elif msg_type == "ANSWER_CALL":
                await medical_ws_manager.handle_station_answer_call(
                    station_id,
                    data.get("callId")
                )

            elif msg_type == "CALL_ACCEPTED":
                # Station accepted a call, relay to room
                await medical_ws_manager.send_to_room(data.get("roomId"), {
                    "type": "CALL_ACCEPTED",
                    "answer": data.get("answer")
                })

            elif msg_type == "END_CALL":
                room_id = data.get("roomId")
                # Find and end the call
                for call_id, (r_id, s_id) in list(medical_ws_manager.active_calls.items()):
                    if r_id == room_id and s_id == station_id:
                        await medical_ws_manager.end_call(call_id)
                        break

            elif msg_type == "ICE_CANDIDATE":
                await medical_ws_manager.relay_ice_candidate(
                    from_room=False,
                    identifier=station_id,
                    candidate=data.get("candidate"),
                    target_room_id=data.get("roomId")
                )

            elif msg_type == "PROMPT_MESSAGE":
                await medical_ws_manager.send_prompt_to_room(
                    data.get("roomId"),
                    data.get("message", ""),
                    connection.station_name
                )

            elif msg_type == "OVERFLOW_CALL":
                await medical_ws_manager.overflow_call(
                    data.get("callId"),
                    connection.station_name,
                    data.get("toStationId")
                )

    except WebSocketDisconnect:
        logger.info(f"Station {station_id} WebSocket disconnected")
    except Exception as e:
        logger.error(f"Station {station_id} WebSocket error: {e}")
    finally:
        await medical_ws_manager.disconnect_station(station_id)
