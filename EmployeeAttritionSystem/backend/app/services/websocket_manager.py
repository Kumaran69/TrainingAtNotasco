"""WebSocket Connection Manager — Real-time feature.

Manages WebSocket connections and broadcasts events to all connected clients.
Events: employee_added, employee_updated, employee_deleted, risk_alert, activity_log, stats_update
"""

from fastapi import WebSocket
from datetime import datetime
import json
from typing import Optional


class ConnectionManager:
    """Manages WebSocket connections for real-time updates.

    Supports:
      - Multiple simultaneous connections
      - Event-type broadcasts (employee changes, risk alerts, stats)
      - Activity log with timestamps
      - Automatic cleanup on disconnect
    """

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.activity_log: list[dict] = []
        self.max_activity_log = 50  # Keep last 50 activities

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict, user: Optional[str] = None):
        """Broadcast an event to all connected clients.

        Args:
            event_type: Type of event (employee_added, risk_alert, etc.)
            data: Event payload data
            user: Optional user who triggered the event
        """
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "user": user,
        }

        # Add to activity log
        activity = {
            "type": event_type,
            "message": self._format_activity_message(event_type, data),
            "timestamp": datetime.utcnow().isoformat(),
            "user": user,
        }
        self.activity_log.insert(0, activity)
        if len(self.activity_log) > self.max_activity_log:
            self.activity_log = self.activity_log[:self.max_activity_log]

        # Send to all connections
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up broken connections
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: dict):
        """Send a message to a specific client."""
        try:
            await websocket.send_json({
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            self.disconnect(websocket)

    async def broadcast_stats_update(self, stats: dict):
        """Broadcast updated dashboard statistics to all clients."""
        await self.broadcast("stats_update", stats)

    async def broadcast_risk_alert(self, employee_data: dict):
        """Broadcast a high-risk employee alert."""
        await self.broadcast("risk_alert", {
            "employee_id": employee_data.get("employee_id"),
            "name": employee_data.get("name"),
            "risk_level": employee_data.get("risk_level"),
            "risk_score": employee_data.get("risk_score"),
            "message": f"⚠️ {employee_data.get('name')} flagged as {employee_data.get('risk_level')} risk",
        })

    def get_activity_log(self, limit: int = 20) -> list[dict]:
        """Get recent activity log entries."""
        return self.activity_log[:limit]

    def _format_activity_message(self, event_type: str, data: dict) -> str:
        """Format a human-readable activity message."""
        name = data.get("name", data.get("employee_id", "Unknown"))
        messages = {
            "employee_added": f"🆕 New employee added: {name}",
            "employee_updated": f"✏️ Employee updated: {name}",
            "employee_deleted": f"🗑️ Employee removed: {name}",
            "risk_alert": f"⚠️ Risk alert for: {name}",
            "risk_recalculated": f"🔄 Risk levels recalculated",
            "data_imported": f"📥 Data imported: {data.get('imported', 0)} employees",
            "data_exported": f"📤 Data exported successfully",
            "stats_update": f"📊 Dashboard stats updated",
            "user_login": f"🔑 User logged in: {name}",
        }
        return messages.get(event_type, f"📋 {event_type}: {name}")

    @property
    def connection_count(self) -> int:
        """Number of active WebSocket connections."""
        return len(self.active_connections)


# Global singleton instance
manager = ConnectionManager()
