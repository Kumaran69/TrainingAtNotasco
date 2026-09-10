import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { formatErrorMessage } from '../utils/helpers';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [portalRole, setPortalRole] = useState('admin'); // 'admin' | 'viewer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const authSectionRef = useRef(null);

  const scrollToAuth = (role = null, isRegister = false) => {
    if (role) {
      setPortalRole(role);
      if (role === 'admin') {
        setEmail('admin@company.com');
        setPassword('admin123');
      } else {
        setEmail('user@company.com');
        setPassword('user123');
      }
    }
    if (isRegister) {
      setIsLogin(false);
    }
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleMode = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handlePortalSwitch = (role) => {
    setPortalRole(role);
    setError('');
    if (role === 'admin') {
      setEmail('admin@company.com');
      setPassword('admin123');
    } else {
      setEmail('user@company.com');
      setPassword('user123');
    }
  };

  const fillQuickDemo = (role) => {
    setPortalRole(role);
    setIsLogin(true);
    setError('');
    if (role === 'admin') {
      setEmail('admin@company.com');
      setPassword('admin123');
    } else {
      setEmail('user@company.com');
      setPassword('user123');
    }
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin) {
      if (cleanName.length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password, cleanName, registerRole);
      }
      navigate('/');
    } catch (err) {
      setError(formatErrorMessage(err, 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const isDuplicateError = error.toLowerCase().includes('already exists');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      transition: 'background 0.3s ease, color 0.3s ease',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1000px',
        height: '600px',
        background: theme === 'dark'
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.08) 50%, transparent 80%)'
          : 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 80%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ===== STICKY TOP NAVBAR ===== */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--sidebar-border)',
        padding: '16px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 4px 16px var(--accent-glow)',
          }}>
            🏢
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              AttritionAI
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Workforce Intelligence</p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#about" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>
            About AttritionAI
          </a>
          <a href="#why-choose" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>
            Why Choose Us
          </a>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>
            Features
          </a>
        </nav>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title="Toggle Light / Dark Theme"
          >
            <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => scrollToAuth()}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            Get Started →
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section id="about" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '72px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="animate-fade-in-up" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '30px',
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '24px',
          }}>
            ⚡ AI-Powered Workforce Retention Platform
          </span>

          <h1 style={{
            fontSize: '52px',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Predict Employee Attrition.<br />
            Retain Top Talent.
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '36px',
            maxWidth: '720px',
            margin: '0 auto 36px',
          }}>
            AttritionAI helps organizations proactively identify turnover risks, understand workplace burnout drivers, and empower employees with personalized retention insights.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => scrollToAuth()}
              style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700 }}
            >
              Get Started Now 🚀
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fillQuickDemo('admin')}
              style={{ padding: '14px 28px', fontSize: '15px', fontWeight: 600 }}
            >
              🛡️ Try Admin Demo
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fillQuickDemo('viewer')}
              style={{ padding: '14px 28px', fontSize: '15px', fontWeight: 600 }}
            >
              👤 Try Employee Demo
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginTop: '56px',
            padding: '24px',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
          }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent-primary)' }}>95%+</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Prediction Accuracy</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success)' }}>Real-Time</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>WebSocket Risk Alerts</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--warning)' }}>Dual Role</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Admin & Employee Hubs</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 900, color: '#818cf8' }}>Light & Dark</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Adaptive Design</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE ATTRITION AI SECTION ===== */}
      <section id="why-choose" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Why Choose AttritionAI?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Empowering modern HR teams with data science and proactive retention workflows.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            {
              icon: '🔮',
              title: 'Proactive Risk Engine',
              desc: 'Detect flight risk and burnout signals before an employee submits resignation, enabling timely HR interventions.',
              color: 'var(--accent-primary)',
            },
            {
              icon: '👥',
              title: 'Role-Tailored Portals',
              desc: 'Executive analytics for HR leaders alongside self-service retention estimator tools and feedback channels for employees.',
              color: 'var(--success)',
            },
            {
              icon: '⚡',
              title: 'Real-Time Insights',
              desc: 'Instant WebSocket notifications trigger live updates whenever risk levels shift or new employee records are imported.',
              color: 'var(--warning)',
            },
          ].map((card, i) => (
            <div
              key={i}
              className="glass-card animate-fade-in-up"
              style={{ padding: '32px', animationDelay: `${i * 0.1}s` }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '20px',
              }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES SHOWCASE SECTION ===== */}
      <section id="features" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Powerful Platform Features
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Everything you need for comprehensive workforce management.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[
            { icon: '🧠', title: 'Risk Calculator', text: 'Multi-factor algorithm evaluating overtime, satisfaction, attendance & salary.' },
            { icon: '📈', title: 'Deep HR Analytics', text: 'Department statistics, salary distributions, and top performance metrics.' },
            { icon: '💌', title: 'Confidential Support', text: 'Direct confidential workplace feedback channels connecting employees with HR.' },
            { icon: '🎨', title: 'Adaptive Theme UI', text: 'High-contrast Light and Dark mode options tailored for high visual comfort.' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-card animate-fade-in-up"
              style={{ padding: '24px', animationDelay: `${idx * 0.08}s` }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '14px' }}>{item.icon}</span>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== GET STARTED / SIGN IN & REGISTER SECTION ===== */}
      <section ref={authSectionRef} id="auth-portal" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px 90px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span style={{
            padding: '4px 14px',
            borderRadius: '20px',
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Access Portal
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            Get Started with AttritionAI
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Sign in to your portal or set up a new account in seconds.
          </p>
        </div>

        <div style={{
          maxWidth: '560px',
          margin: '0 auto',
        }}>
          <div className="glass-card animate-scale-in" style={{ padding: '36px' }}>
            {/* Quick Demo Access Bar */}
            <div style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚡ Quick Demo Sign In
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('admin')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: portalRole === 'admin' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: portalRole === 'admin' ? 'var(--accent-glow)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🛡️ Admin Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('viewer')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: portalRole === 'viewer' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: portalRole === 'viewer' ? 'var(--accent-glow)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  👤 User Demo
                </button>
              </div>
            </div>

            {/* Sign In vs Register Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => toggleMode(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isLogin ? 'var(--accent-primary)' : 'transparent',
                  color: isLogin ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => toggleMode(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !isLogin ? 'var(--accent-primary)' : 'transparent',
                  color: !isLogin ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Role Portal Selector */}
            {isLogin && (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                padding: '8px',
                borderRadius: '10px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
              }}>
                <button
                  type="button"
                  onClick={() => handlePortalSwitch('admin')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: portalRole === 'admin' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: portalRole === 'admin' ? 'var(--accent-glow)' : 'transparent',
                    color: portalRole === 'admin' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🛡️ Admin Portal
                </button>
                <button
                  type="button"
                  onClick={() => handlePortalSwitch('viewer')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: portalRole === 'viewer' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: portalRole === 'viewer' ? 'var(--accent-glow)' : 'transparent',
                    color: portalRole === 'viewer' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  👤 User Portal
                </button>
              </div>
            )}

            <h3 style={{
              fontSize: '22px',
              fontWeight: 800,
              marginBottom: '6px',
              color: 'var(--text-primary)',
            }}>
              {isLogin
                ? (portalRole === 'admin' ? 'Sign In — Admin Portal' : 'Sign In — Employee Portal')
                : 'Create Account'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              {isLogin
                ? (portalRole === 'admin' ? 'Access full system analytics & employee controls' : 'Access team insights & personal retention hub')
                : 'Fill in your details to join AttritionAI'}
            </p>

            {error && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div>{error}</div>
                {isDuplicateError && (
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Switch to Sign In →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!isLogin && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder={portalRole === 'admin' ? 'admin@company.com' : 'user@company.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Password <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Confirm Password <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Account Role
                    </label>
                    <select
                      className="input-field"
                      value={registerRole}
                      onChange={(e) => setRegisterRole(e.target.value)}
                    >
                      <option value="admin">Administrator (Full Access)</option>
                      <option value="viewer">Employee / Viewer (Restricted Access)</option>
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '⏳ Authenticating...' : isLogin ? `Sign In (${portalRole === 'admin' ? 'Admin' : 'User'})` : 'Create Account'}
              </button>
            </form>

            {isLogin && (
              <div style={{
                textAlign: 'center',
                marginTop: '18px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
              }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Active Credentials: <strong style={{ color: 'var(--text-secondary)' }}>{email || 'admin@company.com'}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        padding: '24px 48px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
      }}>
        <p>© 2026 AttritionAI Prediction System. Powered by FastAPI & React.</p>
      </footer>
    </div>
  );
}
