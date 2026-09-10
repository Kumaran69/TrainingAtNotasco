import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { path: '/', label: 'Admin Dashboard', icon: '📊' },
        { path: '/employees', label: 'Employees', icon: '👥' },
        { path: '/analysis', label: 'Deep Analysis', icon: '📈' },
        { path: '/attrition', label: 'Risk Matrix', icon: '⚠️' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ]
    : [
        { path: '/', label: 'My Dashboard', icon: '📊' },
        { path: '/attrition', label: 'Retention Hub', icon: '⚠️' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '4px 8px',
        marginBottom: '28px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 4px 16px var(--accent-glow)',
        }}>
          🏢
        </div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            AttritionAI
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {isAdmin ? 'Admin Management' : 'Employee Workspace'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Theme Switcher Toggle */}
      <div style={{ marginBottom: '14px' }}>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span>{theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}</span>
        </button>
      </div>

      {/* Connection Status */}
      <div style={{
        padding: '12px',
        borderRadius: '12px',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? 'var(--success)' : 'var(--danger)',
            boxShadow: connected ? '0 0 8px rgba(16, 185, 129, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)',
          }} />
          <span style={{ fontSize: '12px', color: connected ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {connected ? 'Live Connected' : 'Reconnecting...'}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Real-time updates {connected ? 'active' : 'paused'}
        </p>
      </div>

      {/* User Profile & Role Badge */}
      <div style={{
        padding: '12px',
        borderRadius: '12px',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isAdmin
            ? 'linear-gradient(135deg, #ef4444, #f59e0b)'
            : 'linear-gradient(135deg, #6366f1, #10b981)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: 'white',
        }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.full_name || 'User'}
          </p>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)',
          }}>
            {isAdmin ? '🛡️ Admin' : '👤 Employee'}
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--danger)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          title="Logout"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
