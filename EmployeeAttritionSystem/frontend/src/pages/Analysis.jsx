import { useState, useEffect } from 'react';
import { analysisAPI } from '../api/analysis';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#818cf8', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];

export default function Analysis() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisAPI.getFullReport()
      .then(res => setReport(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Analysis & Reports</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />)}
        </div>
      </div>
    );
  }

  const { attrition, department_counts, salary_stats, department_salaries, top_paid, low_satisfaction, risk_summary } = report || {};

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>Deep Analysis & Reports</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Comprehensive workforce analytics & attrition risk factors
        </p>
      </div>

      {/* Top Row: Attrition + Salary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Attrition Rate */}
        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: '24px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
            Attrition Rate
          </h4>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={attrition?.attrition_percentage > 15 ? '#ef4444' : attrition?.attrition_percentage > 8 ? '#f59e0b' : '#10b981'}
                strokeWidth="10"
                strokeDasharray={`${(attrition?.attrition_percentage / 100) * 327} 327`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9' }}>
                {attrition?.attrition_percentage || 0}%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px' }}>
            <div><span style={{ color: '#10b981', fontWeight: 700 }}>{attrition?.active_count}</span> <span style={{ color: '#64748b' }}>Active</span></div>
            <div><span style={{ color: '#ef4444', fontWeight: 700 }}>{attrition?.attrited_count}</span> <span style={{ color: '#64748b' }}>Left</span></div>
          </div>
        </div>

        {/* Salary Stats */}
        <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
            Salary Statistics
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Average', value: salary_stats?.average, color: '#818cf8' },
              { label: 'Highest', value: salary_stats?.highest, color: '#10b981' },
              { label: 'Lowest', value: salary_stats?.lowest, color: '#f59e0b' },
              { label: 'Total Payroll', value: salary_stats?.total_payroll, color: '#a855f7' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.label}</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>
                  ${(item.value || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Summary */}
        <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
            Risk Summary
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'High Risk', count: risk_summary?.high_count, pct: risk_summary?.high_percentage, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              { label: 'Medium Risk', count: risk_summary?.medium_count, pct: risk_summary?.medium_percentage, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { label: 'Low Risk', count: risk_summary?.low_count, pct: risk_summary?.low_percentage, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 600 }}>{item.count} ({item.pct}%)</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{
                    width: `${item.pct || 0}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: item.color,
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Department Distribution */}
        <div className="glass-card animate-fade-in-up stagger-4" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
            Department-wise Employee Count
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={department_counts} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="department" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9', fontSize: '13px' }}
                formatter={(v) => [`${v} employees`, 'Count']}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {(department_counts || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Salary Comparison */}
        <div className="glass-card animate-fade-in-up stagger-5" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
            Average Salary by Department
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={department_salaries} barCategoryGap="25%">
              <XAxis dataKey="department" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9', fontSize: '13px' }}
                formatter={v => [`$${v.toLocaleString()}`, 'Avg Salary']}
              />
              <Bar dataKey="average_salary" radius={[8, 8, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Top Paid + Low Satisfaction */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top 5 Highest Paid */}
        <div className="glass-card animate-fade-in-up stagger-5" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
            🏆 Top 5 Highest-Paid Employees
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(top_paid || []).map((emp, i) => (
              <div key={emp.employee_id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #eab308)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: i === 0 ? '#000' : '#94a3b8',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{emp.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{emp.department} — {emp.position || 'N/A'}</p>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>
                  ${emp.salary?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Satisfaction */}
        <div className="glass-card animate-fade-in-up stagger-6" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
            ⚠️ Low Satisfaction Employees (≤ 2.0)
          </h4>
          {(low_satisfaction || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</p>
              <p style={{ color: '#64748b' }}>No low-satisfaction employees!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(low_satisfaction || []).map(emp => (
                <div key={emp.employee_id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.1)',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{emp.name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{emp.department}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>
                      {emp.satisfaction}/5
                    </span>
                    <br />
                    <span className={`risk-badge-${emp.risk_level?.toLowerCase()}`} style={{
                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                    }}>
                      {emp.risk_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
