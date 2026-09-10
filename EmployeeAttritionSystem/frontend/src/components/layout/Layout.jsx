import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useWebSocket } from '../../context/WebSocketContext';

export default function Layout() {
  const { notifications, dismissNotification } = useWebSocket();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', transition: 'background 0.3s ease' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: '260px',
        padding: '28px 32px',
        minHeight: '100vh',
        position: 'relative',
      }}>
        {/* Real-time notification banner */}
        {notifications.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '400px',
          }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                className="animate-toast-in"
                onClick={() => dismissNotification(n.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backdropFilter: 'blur(16px)',
                  boxShadow: 'var(--card-shadow)',
                  background: n.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'var(--accent-glow)',
                  border: `1px solid ${n.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'var(--accent-primary)'}`,
                  color: n.type === 'warning' ? 'var(--warning)' : 'var(--accent-primary)',
                }}
              >
                <span style={{ fontSize: '16px' }}>
                  {n.type === 'warning' ? '⚠️' : '🔔'}
                </span>
                <span style={{ flex: 1 }}>{n.message}</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>✕</span>
              </div>
            ))}
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
