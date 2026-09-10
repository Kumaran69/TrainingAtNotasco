import { useState, useEffect, useCallback } from 'react';
import { employeesAPI } from '../api/employees';
import { useWebSocket } from '../context/WebSocketContext';
import { useToast } from '../context/ToastContext';
import { formatErrorMessage } from '../utils/helpers';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
const RISK_LEVELS = ['High', 'Medium', 'Low'];

const emptyForm = {
  employee_id: '', name: '', age: '', department: 'Engineering',
  salary: '', experience: '', satisfaction: '', attendance: '',
  overtime: false, skills: '', attrition_status: false,
  email: '', phone: '', position: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { lastEvent } = useWebSocket();
  const { addToast } = useToast();
  const limit = 10;

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params.query = search;
      if (filterDept) params.department = filterDept;
      if (filterRisk) params.risk_level = filterRisk;
      const res = await employeesAPI.list(params);
      setEmployees(res.data.employees);
      setTotal(res.data.total);
    } catch (err) {
      addToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDept, filterRisk]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Real-time refresh on changes
  useEffect(() => {
    if (['employee_added', 'employee_updated', 'employee_deleted', 'data_imported'].includes(lastEvent?.type)) {
      fetchEmployees();
    }
  }, [lastEvent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const data = {
        ...form,
        age: parseInt(form.age),
        salary: parseFloat(form.salary),
        experience: parseInt(form.experience),
        satisfaction: parseFloat(form.satisfaction),
        attendance: parseFloat(form.attendance),
        skills: typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : form.skills,
      };

      if (editingId) {
        await employeesAPI.update(editingId, data);
        addToast('Employee updated successfully', 'success');
      } else {
        await employeesAPI.create(data);
        addToast('Employee added successfully', 'success');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Failed to save employee'));
    }
  };

  const handleEdit = (emp) => {
    setForm({
      employee_id: emp.employee_id,
      name: emp.name,
      age: emp.age.toString(),
      department: emp.department,
      salary: emp.salary.toString(),
      experience: emp.experience.toString(),
      satisfaction: emp.satisfaction.toString(),
      attendance: emp.attendance.toString(),
      overtime: emp.overtime,
      skills: Array.isArray(emp.skills) ? emp.skills.join(', ') : emp.skills,
      attrition_status: emp.attrition_status,
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position || '',
    });
    setEditingId(emp.employee_id);
    setShowModal(true);
    setFormError('');
  };

  const handleDelete = async (employeeId) => {
    try {
      await employeesAPI.delete(employeeId);
      addToast('Employee deleted', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      addToast('Failed to delete employee', 'error');
    }
  };

  const getRiskBadge = (level) => {
    const cls = `risk-badge-${level.toLowerCase()}`;
    return (
      <span className={cls} style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      }}>
        {level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢'} {level}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>Employees Management</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage your workforce records — {total} total employees
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); setFormError(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>+</span> Add Employee
        </button>
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Search by name, ID, or position..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: '1', minWidth: '200px' }}
        />
        <select
          className="input-field"
          value={filterDept}
          onChange={(e) => { setFilterDept(e.target.value); setPage(0); }}
          style={{ width: '170px' }}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          className="input-field"
          value={filterRisk}
          onChange={(e) => { setFilterRisk(e.target.value); setPage(0); }}
          style={{ width: '150px' }}
        >
          <option value="">All Risk Levels</option>
          {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Employee Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="animate-shimmer" style={{ height: '200px' }} />
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
            <p style={{ color: '#64748b', fontSize: '15px' }}>No employees found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Satisfaction</th>
                  <th>Attendance</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.employee_id} className={`animate-fade-in-up`} style={{ animationDelay: `${i * 0.03}s` }}>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#818cf8' }}>
                      {emp.employee_id}
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '14px' }}>{emp.name}</p>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>{emp.position || '—'}</p>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        background: 'rgba(99, 102, 241, 0.08)', color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                      }}>
                        {emp.department}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>
                      ${emp.salary?.toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '40px', height: '4px', borderRadius: '2px',
                          background: 'rgba(255,255,255,0.1)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${(emp.satisfaction / 5) * 100}%`,
                            height: '100%',
                            borderRadius: '2px',
                            background: emp.satisfaction >= 3.5 ? '#10b981' : emp.satisfaction >= 2.5 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ fontSize: '13px' }}>{emp.satisfaction}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{emp.attendance}%</td>
                    <td>{getRiskBadge(emp.risk_level)}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: emp.attrition_status ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: emp.attrition_status ? '#fca5a5' : '#6ee7b7',
                        border: `1px solid ${emp.attrition_status ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      }}>
                        {emp.attrition_status ? 'Left' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleEdit(emp)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: '5px 10px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.2)' }}
                          onClick={() => setDeleteConfirm(emp)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: '12px', padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <button
              className="btn-ghost"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={{ opacity: page === 0 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Page {page + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              className="btn-ghost"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage(p => p + 1)}
              style={{ opacity: (page + 1) * limit >= total ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>
                {editingId ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5', fontSize: '13px',
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Employee ID *</label>
                <input className="input-field" placeholder="EMP026" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} required disabled={!!editingId} style={editingId ? {opacity: 0.5} : {}} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input className="input-field" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Age *</label>
                <input className="input-field" type="number" min="18" max="65" placeholder="30" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Department *</label>
                <select className="input-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Salary *</label>
                <input className="input-field" type="number" min="1" placeholder="65000" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Experience (years) *</label>
                <input className="input-field" type="number" min="0" max="45" placeholder="5" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Satisfaction (1-5) *</label>
                <input className="input-field" type="number" min="1" max="5" step="0.1" placeholder="3.5" value={form.satisfaction} onChange={e => setForm({...form, satisfaction: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Attendance (%) *</label>
                <input className="input-field" type="number" min="0" max="100" step="0.1" placeholder="95" value={form.attendance} onChange={e => setForm({...form, attendance: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Position</label>
                <input className="input-field" placeholder="Software Engineer" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email</label>
                <input className="input-field" type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Skills (comma-separated)</label>
                <input className="input-field" placeholder="Python, React, Docker" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.overtime} onChange={e => setForm({...form, overtime: e.target.checked})} />
                  Overtime
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.attrition_status} onChange={e => setForm({...form, attrition_status: e.target.checked})} />
                  Has Left
                </label>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingId ? '💾 Update' : '➕ Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</p>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
              Delete Employee?
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
              Are you sure you want to delete <strong style={{ color: '#f1f5f9' }}>{deleteConfirm.name}</strong> ({deleteConfirm.employee_id})?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.employee_id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
