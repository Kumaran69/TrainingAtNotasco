import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;

    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8002') + '/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);

        // Update activity log
        if (data.type === 'connected' && data.data?.activity_log) {
          setActivityLog(data.data.activity_log);
        } else if (data.type !== 'stats_update') {
          setActivityLog((prev) => [
            {
              type: data.type,
              message: data.data?.message || formatEventMessage(data.type, data.data),
              timestamp: data.timestamp,
              user: data.user,
            },
            ...prev.slice(0, 49),
          ]);
        }

        // Add notification for important events
        if (['employee_added', 'employee_updated', 'employee_deleted', 'risk_alert'].includes(data.type)) {
          const notification = {
            id: Date.now(),
            type: data.type === 'risk_alert' ? 'warning' : 'info',
            message: formatEventMessage(data.type, data.data),
            timestamp: data.timestamp,
          };
          setNotifications((prev) => [notification, ...prev.slice(0, 9)]);

          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          }, 5000);
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('🔌 WebSocket disconnected');
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        lastEvent,
        activityLog,
        notifications,
        dismissNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

function formatEventMessage(type, data) {
  const name = data?.name || data?.employee_id || 'Unknown';
  const messages = {
    employee_added: `New employee added: ${name}`,
    employee_updated: `Employee updated: ${name}`,
    employee_deleted: `Employee removed: ${name}`,
    risk_alert: `⚠️ Risk alert: ${name} flagged as ${data?.risk_level || 'High'} risk`,
    risk_recalculated: `Risk levels recalculated for ${data?.total || 0} employees`,
    data_imported: `Data imported: ${data?.imported || 0} employees`,
    data_exported: 'Data exported successfully',
    user_login: `User logged in: ${name}`,
  };
  return messages[type] || `Event: ${type}`;
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
