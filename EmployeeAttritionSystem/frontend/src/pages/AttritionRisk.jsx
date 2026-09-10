import { useState, useEffect } from 'react';
import { attritionAPI } from '../api/attrition';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';

export default function AttritionRisk() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const { addToast } = useToast();
  const { lastEvent } = useWebSocket();

  const fetchRisk = async () => {
    try {
      const res = await attritionAPI.getRiskOverview();
      setData(res.data);
    } catch (err) {
      addToast('Failed to load risk data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRisk(); }, []);

  useEffect(() => {
    if (['risk_recalculated', 'employee_added', 'employee_updated'].includes(lastEvent?.type)) {
      fetchRisk();
    }
  }, [lastEvent]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await attritionAPI.recalculateAll();
      addToast('Risk levels recalculated', 'success');
      fetchRisk();
    } catch (err) {
      addToast('Recalculation failed', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  const viewBreakdown = async (employeeId) => {
    try {
      const res = await attritionAPI.getEmployeeRisk(employeeId);
      setBreakdown(res.data);
      setSelectedEmployee(employeeId);
    } catch (err) {
      addToast('Failed to load risk breakdown', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Attrition Risk Assessment</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />)}
        </div>
      </div>
    );
  }

  const { summary, high_risk_employees, medium_risk_employees } = data || {};

  const RiskCard = ({ employee, index }) => (
    <div
      className="glass-card animate-fade-in-up"
      style={{ padding: '18px', cursor: 'pointer', animationDelay: `${index * 0.05}s` }}
      onClick={() => viewBreakdown(employee.employee_id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{employee.department} — {employee.position || employee.employee_id}</p>
        </div>
        <span className={`risk-badge-${employee.risk_level?.toLowerCase()}`} style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        }}>
          {employee.risk_level === 'High' ? '🔴' : '🟡'} {employee.risk_score}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ color: '#64748b', marginBottom: '2px' }}>Satisfaction</p>
          <p style={{ fontWeight: 600, color: employee.satisfaction <= 2 ? '#ef4444' : '#94a3b8' }}>{employee.satisfaction}/5</p>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ color: '#64748b', marginBottom: '2px' }}>Attendance</p>
          <p style={{ fontWeight: 600, color: employee.attendance < 75 ? '#ef4444' : '#94a3b8' }}>{employee.attendance}%</p>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ color: '#64748b', marginBottom: '2px' }}>Overtime</p>
          <p style={{ fontWeight: 600, color: employee.overtime ? '#f59e0b' : '#94a3b8' }}>{employee.overtime ? 'Yes' : 'No'}</p>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ color: '#64748b', marginBottom: '2px' }}>Exp</p>
          <p style={{ fontWeight: 600, color: '#94a3b8' }}>{employee.experience}y</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9' }}>Attrition Risk</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            AI-powered employee retention risk assessment
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleRecalculate}
          disabled={recalculating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: recalculating ? 0.6 : 1 }}
        >
          {recalculating ? '⏳ Recalculating...' : '🔄 Recalculate All'}
        </button>
      </div>

      {/* Risk Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {[
          { label: 'High Risk', count: summary?.high_count, pct: summary?.high_percentage, color: '#ef4444', icon: '🔴', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Medium Risk', count: summary?.medium_count, pct: summary?.medium_percentage, color: '#f59e0b', icon: '🟡', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Low Risk', count: summary?.low_count, pct: summary?.low_percentage, color: '#10b981', icon: '🟢', bg: 'rgba(16,185,129,0.08)' },
        ].map((item, i) => (
          <div key={item.label} className={`glass-card animate-fade-in-up stagger-${i + 1}`} style={{ padding: '22px', borderLeft: `3px solid ${item.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</p>
                <p style={{ fontSize: '32px', fontWeight: 800, color: item.color, marginTop: '4px' }}>{item.count}</p>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>{item.pct}% of workforce</p>
              </div>
              <span style={{ fontSize: '36px' }}>{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* High Risk Employees */}
      {high_risk_employees?.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fca5a5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔴 High Risk — Immediate Attention Required
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {high_risk_employees.map((emp, i) => <RiskCard key={emp.employee_id} employee={emp} index={i} />)}
          </div>
        </div>
      )}

      {/* Medium Risk Employees */}
      {medium_risk_employees?.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fcd34d', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🟡 Medium Risk — Monitor Closely
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {medium_risk_employees.map((emp, i) => <RiskCard key={emp.employee_id} employee={emp} index={i} />)}
          </div>
        </div>
      )}

      {/* Risk Breakdown Modal */}
      {breakdown && (
        <div className="modal-overlay" onClick={() => { setBreakdown(null); setSelectedEmployee(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
                  Risk Breakdown
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  {breakdown.employee?.name} — {breakdown.employee?.department}
                </p>
              </div>
              <button onClick={() => setBreakdown(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Overall Score */}
            <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Overall Risk Score</p>
              <p style={{
                fontSize: '48px', fontWeight: 800,
                color: breakdown.risk_level === 'High' ? '#ef4444' : breakdown.risk_level === 'Medium' ? '#f59e0b' : '#10b981',
              }}>
                {breakdown.total_score}
              </p>
              <span className={`risk-badge-${breakdown.risk_level?.toLowerCase()}`} style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600,
              }}>
                {breakdown.risk_level} Risk
              </span>
            </div>

            {/* Factor Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(breakdown.risk_breakdown || {}).map(([factor, info]) => (
                <div key={factor} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', textTransform: 'capitalize' }}>
                      {factor}
                    </span>
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: info.score > info.max * 0.6 ? '#ef4444' : info.score > info.max * 0.3 ? '#f59e0b' : '#10b981',
                    }}>
                      {info.score}/{info.max}
                    </span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                    <div style={{
                      width: `${(info.score / info.max) * 100}%`,
                      height: '100%',
                      borderRadius: '3px',
                      background: info.score > info.max * 0.6 ? '#ef4444' : info.score > info.max * 0.3 ? '#f59e0b' : '#10b981',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{info.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
