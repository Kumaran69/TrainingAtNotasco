import { useState, useEffect } from 'react';
import { analysisAPI } from '../api/analysis';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

export default function UserDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Self risk calculator state
  const [overtime, setOvertime] = useState('No');
  const [workLife, setWorkLife] = useState(3);
  const [jobSat, setJobSat] = useState(4);
  const [calculatedScore, setCalculatedScore] = useState(null);

  // Retention feedback form
  const [feedback, setFeedback] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  useEffect(() => {
    analysisAPI.getDashboard()
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Failed to load user stats:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCalculateRisk = (e) => {
    e.preventDefault();
    let score = 20; // baseline low risk
    if (overtime === 'Yes') score += 35;
    if (workLife <= 2) score += 25;
    if (jobSat <= 2) score += 20;
    score = Math.min(score, 95);
    setCalculatedScore(score);
    addToast('Risk assessment calculated successfully!', 'info');
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmittedFeedback(true);
    setFeedback('');
    addToast('Feedback submitted confidentially to HR!', 'success');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>My Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  const deptData = stats?.departments || [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Welcome Header */}
      <div style={{
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Welcome back, {user?.full_name || 'Team Member'} 👋
            </h2>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--accent-primary)',
            }}>
              Employee Portal
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Your personal workplace stability, retention insights & wellness hub
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Stability Index
              </p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
                88%
              </p>
            </div>
            <span style={{ fontSize: '28px' }}>🛡️</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Healthy Retention Rating
          </p>
        </div>

        <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Company Employees
              </p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                {stats?.total_employees || 0}
              </p>
            </div>
            <span style={{ fontSize: '28px' }}>👥</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Active Workforce
          </p>
        </div>

        <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Avg Satisfaction
              </p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: '#818cf8', marginTop: '8px' }}>
                {stats?.avg_satisfaction || 4.2}/5
              </p>
            </div>
            <span style={{ fontSize: '28px' }}>⭐</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Overall Happiness Score
          </p>
        </div>

        <div className="glass-card animate-fade-in-up stagger-4" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Workplace Climate
              </p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
                Positive
              </p>
            </div>
            <span style={{ fontSize: '28px' }}>🌿</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Optimal Work-Life Balance
          </p>
        </div>
      </div>

      {/* Main Grid: Key Drivers & Calculator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Key Retention Drivers Breakdown */}
        <div className="glass-card animate-fade-in-up stagger-5" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
            🎯 Key Retention Factors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { title: 'Work-Life Balance', score: 'Strong', desc: 'Flexible schedule & healthy workload balance', icon: '⚖️', color: 'var(--success)' },
              { title: 'Overtime Load', score: 'Balanced', desc: 'Standard working hours with minimal overtime', icon: '⏰', color: 'var(--accent-primary)' },
              { title: 'Career Development', score: 'Active', desc: 'Continuous learning opportunities & mentorship', icon: '🚀', color: '#818cf8' },
              { title: 'Compensation Growth', score: 'Competitive', desc: 'Regular performance reviews & incentives', icon: '💡', color: 'var(--warning)' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</p>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.score}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Self-Assessment Risk Estimator */}
        <div className="glass-card animate-fade-in-up stagger-6" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            🧮 Personal Risk Estimator
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Check how current work factors influence attrition risk.
          </p>

          <form onSubmit={handleCalculateRisk} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Frequent Overtime Work?
              </label>
              <select
                className="input-field"
                value={overtime}
                onChange={(e) => setOvertime(e.target.value)}
              >
                <option value="No">No — Regular Hours</option>
                <option value="Yes">Yes — Frequent Overtime</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Work-Life Balance Score (1 = Poor, 5 = Excellent): {workLife}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={workLife}
                onChange={(e) => setWorkLife(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Job Satisfaction Rating (1 = Low, 5 = High): {jobSat}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={jobSat}
                onChange={(e) => setJobSat(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '6px' }}>
              Estimate Retention Risk
            </button>
          </form>

          {calculatedScore !== null && (
            <div style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '12px',
              background: calculatedScore > 50 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${calculatedScore > 50 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated Attrition Risk</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: calculatedScore > 50 ? 'var(--danger)' : 'var(--success)' }}>
                  {calculatedScore}% — {calculatedScore > 50 ? 'Medium / High Risk' : 'Low Attrition Risk'}
                </p>
              </div>
              <span style={{ fontSize: '24px' }}>{calculatedScore > 50 ? '⚠️' : '✅'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Department Breakdown & HR Feedback */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Department Overview */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            📊 Department Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={deptData}
                dataKey="count"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Confidential HR Feedback Submit */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            💌 Confidential Retention Support
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Share workplace concerns or career growth feedback directly with HR.
          </p>

          {submittedFeedback ? (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--success)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</p>
              <p style={{ fontWeight: 700, fontSize: '15px' }}>Feedback Submitted!</p>
              <p style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                Thank you. HR team will review your comments discreetly.
              </p>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSubmittedFeedback(false)}
                style={{ marginTop: '12px', fontSize: '12px' }}
              >
                Submit another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Share your thoughts on work environment, compensation, or team support..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">
                Submit Confidential Feedback
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
