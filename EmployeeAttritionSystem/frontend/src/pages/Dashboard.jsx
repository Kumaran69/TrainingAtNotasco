import { useState, useEffect } from 'react';
import { analysisAPI } from '../api/analysis';
import { useWebSocket } from '../context/WebSocketContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#818cf8', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastEvent, activityLog } = useWebSocket();

  const fetchStats = async () => {
    try {
      const res = await analysisAPI.getDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // Real-time stats update
  useEffect(() => {
    if (lastEvent?.type === 'stats_update') {
      setStats(lastEvent.data);
    }
  }, [lastEvent]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Executive Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Employees', value: stats?.total_employees || 0, icon: '👥', color: '#6366f1', glow: 'stat-glow-indigo' },
    { label: 'Average Salary', value: `$${(stats?.average_salary || 0).toLocaleString()}`, icon: '💰', color: '#10b981', glow: 'stat-glow-emerald' },
    { label: 'Attrition Rate', value: `${stats?.attrition_rate || 0}%`, icon: '📉', color: '#f59e0b', glow: 'stat-glow-amber' },
    { label: 'High Risk Count', value: stats?.high_risk_count || 0, icon: '🔴', color: '#ef4444', glow: 'stat-glow-rose' },
  ];

  const deptData = stats?.departments || [];
  const riskData = stats?.risk_summary ? [
    { name: 'High', value: stats.risk_summary.high_count, color: RISK_COLORS.High },
    { name: 'Medium', value: stats.risk_summary.medium_count, color: RISK_COLORS.Medium },
    { name: 'Low', value: stats.risk_summary.low_count, color: RISK_COLORS.Low },
  ] : [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Executive Dashboard
            </h2>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              Admin Overview
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Real-time workforce analytics, predictive risk scores & company metrics
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass-card ${card.glow} animate-fade-in-up stagger-${i + 1}`}
            style={{ padding: '22px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `${card.color}15`,
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.label}
                </p>
                <p className="animate-fade-in-up" style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginTop: '8px',
                  letterSpacing: '-0.02em',
                }}>
                  {card.value}
                </p>
              </div>
              <span style={{ fontSize: '28px' }}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Department Distribution */}
        <div className="glass-card animate-fade-in-up stagger-5" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Department Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={deptData}
                dataKey="count"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={3}
                strokeWidth={0}
              >
                {deptData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="glass-card animate-fade-in-up stagger-6" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Attrition Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskData} barCategoryGap="30%">
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {riskData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats + Live Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick Metrics */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
            Executive Quick Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Avg Satisfaction', value: `${stats?.avg_satisfaction || 0}/5`, color: '#818cf8' },
              { label: 'Avg Attendance', value: `${stats?.avg_attendance || 0}%`, color: 'var(--success)' },
              { label: 'Active Employees', value: stats?.active_employees || 0, color: 'var(--accent-primary)' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live System Feed
            </h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#10b981', animation: 'pulse-glow 2s infinite',
              }} />
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Live</span>
            </div>
          </div>
          <div style={{ maxHeight: '220px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activityLog.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No recent activity
              </p>
            ) : (
              activityLog.slice(0, 8).map((activity, i) => (
                <div
                  key={i}
                  className="animate-slide-right"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '13px',
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{activity.message}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
