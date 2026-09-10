import { useState, useRef } from 'react';
import { employeesAPI } from '../api/employees';
import { attritionAPI } from '../api/attrition';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatErrorMessage } from '../utils/helpers';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const isAdmin = user?.role === 'admin';

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await employeesAPI.exportData();
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees.json';
      a.click();
      URL.revokeObjectURL(url);
      addToast('Data exported successfully!', 'success');
    } catch (err) {
      addToast(formatErrorMessage(err, 'Export failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await employeesAPI.importData(file);
      setImportResult(res.data);
      addToast(`Imported ${res.data.imported} employees!`, 'success');
    } catch (err) {
      addToast('Import failed: ' + formatErrorMessage(err, 'Invalid file'), 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRecalculate = async () => {
    try {
      await attritionAPI.recalculateAll();
      addToast('All risk scores recalculated!', 'success');
    } catch (err) {
      addToast('Recalculation failed', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>Settings & Preferences</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Theme customization, account profile, and administrative data management
        </p>
      </div>

      {/* Theme Customization Card */}
      <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          🎨 Interface Theme & Contrast
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Switch between Light Mode and Dark Mode for optimal visual comfort.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: theme === 'dark' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: theme === 'dark' ? 'var(--accent-glow)' : 'var(--glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '22px' }}>🌙</span>
            <div>
              <p style={{ textAlign: 'left' }}>Dark Theme</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Sleek low-light workspace</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: theme === 'light' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: theme === 'light' ? 'var(--accent-glow)' : 'var(--glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '22px' }}>☀️</span>
            <div>
              <p style={{ textAlign: 'left' }}>Light Theme</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>High-contrast daylight mode</p>
            </div>
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          👤 User Profile & Role
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name || 'User'}</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email || 'user@company.com'}</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Access Role</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)', textTransform: 'capitalize' }}>
              {isAdmin ? '🛡️ Administrator' : '👤 Employee / Viewer'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Management (Admin Only) */}
      {isAdmin ? (
        <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            💾 Administrative Data Management
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Export */}
            <div style={{
              padding: '24px', borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '36px', marginBottom: '12px' }}>📤</p>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Export System Data
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Download all employee records as JSON
              </p>
              <button
                className="btn-primary"
                onClick={handleExport}
                disabled={exporting}
                style={{ width: '100%', opacity: exporting ? 0.6 : 1 }}
              >
                {exporting ? '⏳ Exporting...' : '📥 Export JSON'}
              </button>
            </div>

            {/* Import */}
            <div style={{
              padding: '24px', borderRadius: '12px',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-primary)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '36px', marginBottom: '12px' }}>📥</p>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Import Employee Data
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Bulk import records from JSON file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{ width: '100%', opacity: importing ? 0.6 : 1 }}
              >
                {importing ? '⏳ Importing...' : '📤 Import JSON'}
              </button>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div style={{
              marginTop: '16px', padding: '14px', borderRadius: '10px',
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              fontSize: '13px',
            }}>
              <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px' }}>Import Results:</p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span style={{ color: 'var(--success)' }}>✅ Imported: {importResult.imported}</span>
                <span style={{ color: 'var(--warning)' }}>⏩ Skipped: {importResult.skipped}</span>
                <span style={{ color: 'var(--danger)' }}>❌ Errors: {importResult.errors?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '20px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ℹ️ Bulk data import/export controls are reserved for Administrator accounts.
          </p>
        </div>
      )}

      {/* System Actions */}
      {isAdmin && (
        <div className="glass-card animate-fade-in-up stagger-4" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            🔧 System Actions
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={handleRecalculate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔄 Recalculate All Risk Scores
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
