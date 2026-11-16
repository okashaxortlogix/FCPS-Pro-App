import React, { useState } from 'react';
import { hashPassword } from '../utils/helpers';

export default function AuthModal({ isOpen, onClose, onLogin, addToast }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // For password reset flow
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen) return null;

  // Password strength logic
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 33, text: 'Weak', color: 'var(--accent-rose)' };
    if (score <= 4) return { score: 66, text: 'Medium', color: 'var(--accent-amber)' };
    return { score: 100, text: 'Strong', color: 'var(--accent-emerald)' };
  };

  const strength = getPasswordStrength(view === 'reset-password' ? newPassword : password);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const hashedInput = await hashPassword(password);

      // Retrieve registered users from localStorage
      const usersStr = localStorage.getItem('fcps_users') || '[]';
      let users = [];
      try {
        users = JSON.parse(usersStr);
      } catch (err) {
        users = [];
      }

      const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (found) {
        // Compare with hashed password or upgrade legacy plaintext
        const isMatch = found.passwordHash 
          ? found.passwordHash === hashedInput 
          : found.password === password;

        if (isMatch) {
          // Upgrade legacy user to hashed password if needed
          if (!found.passwordHash) {
            found.passwordHash = hashedInput;
            delete found.password;
            localStorage.setItem('fcps_users', JSON.stringify(users));
          }

          onLogin({
            id: found.id || found.email,
            name: found.name,
            email: found.email,
            joined: found.joined
          }, rememberMe);
          addToast(`Welcome back, ${found.name}!`, 'success');
          onClose();
        } else {
          addToast('Incorrect password. Please verify your credentials.', 'error');
        }
      } else {
        // Explicitly require registration - NO GHOST LOGIN BYPASS (SEC-03)
        addToast('No candidate account found with this email. Please register below.', 'error');
      }
    } catch (err) {
      addToast('Authentication error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      addToast('Please fill in all registration fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const usersStr = localStorage.getItem('fcps_users') || '[]';
      let users = [];
      try {
        users = JSON.parse(usersStr);
      } catch (err) {
        users = [];
      }

      const cleanEmail = email.trim().toLowerCase();
      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        addToast('An account with this email already exists. Please sign in.', 'error');
        setLoading(false);
        return;
      }

      // SEC-01: Hash password using SHA-256 before storage
      const passwordHash = await hashPassword(password);

      const newUser = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        passwordHash, // Stored as cryptographic hash, never plaintext
        joined: new Date().toLocaleDateString()
      };

      users.push(newUser);
      localStorage.setItem('fcps_users', JSON.stringify(users));

      onLogin({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        joined: newUser.joined
      }, rememberMe);

      addToast('Candidate account created successfully!', 'success');
      onClose();
    } catch (err) {
      addToast('Failed to create account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Password Reset: Verify candidate email exists
  const handleVerifyEmailForReset = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      addToast('Please enter your registered email address', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const usersStr = localStorage.getItem('fcps_users') || '[]';
      let users = [];
      try {
        users = JSON.parse(usersStr);
      } catch (err) {
        users = [];
      }

      const cleanEmail = email.trim().toLowerCase();
      const found = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (found) {
        setVerifiedEmail(cleanEmail);
        setView('reset-password');
        addToast(`Account verified for ${found.name}. Please enter your new password.`, 'info');
      } else {
        addToast('No registered candidate account found with this email.', 'error');
      }
    }, 400);
  };

  // Step 2 of Password Reset: Set new password
  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      addToast('Please enter and confirm your new password', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const usersStr = localStorage.getItem('fcps_users') || '[]';
      let users = JSON.parse(usersStr);

      const newHash = await hashPassword(newPassword);
      users = users.map(u => {
        if (u.email.toLowerCase() === verifiedEmail) {
          return {
            ...u,
            passwordHash: newHash,
            password: undefined
          };
        }
        return u;
      });

      localStorage.setItem('fcps_users', JSON.stringify(users));
      addToast('Password updated successfully! Please sign in with your new credentials.', 'success');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setView('login');
    } catch (err) {
      addToast('Could not update password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: 'rgba(11, 15, 25, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2.5rem',
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close authentication modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <i className="fa-solid fa-user-doctor" style={{ fontSize: '1.5rem' }}></i>
          </div>
          <h2 style={{ fontSize: '1.6rem' }} className="gradient-text">
            {view === 'login' && 'Medical Portal Sign In'}
            {view === 'register' && 'Create Candidate Account'}
            {view === 'forgot' && 'Reset Account Password'}
            {view === 'reset-password' && 'Enter New Password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {view === 'login' && 'Access your FCPS Part 1 QBank & Mock History'}
            {view === 'register' && 'Join thousands of doctors preparing for FCPS Part 1'}
            {view === 'forgot' && 'Enter your registered email to reset your candidate credentials'}
            {view === 'reset-password' && `Setting a new password for ${verifiedEmail}`}
          </p>
        </div>

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="dr.name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
                <span
                  onClick={() => setView('forgot')}
                  style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 2.8rem 0.8rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
              <label htmlFor="remember" style={{ cursor: 'pointer' }}>Keep me logged in on this device</label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <span onClick={() => { setView('register'); setPassword(''); }} style={{ color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer' }}>
                Create one now
              </span>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Full Name & Title
              </label>
              <input
                type="text"
                placeholder="Dr. Ahmed Khan"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="dr.ahmed@hospital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Password (minimum 6 characters)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              {password && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${strength.score}%`, background: strength.color, transition: 'all 0.3s' }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>
                    Password Strength: {strength.text}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-user-plus"></i>}
              {loading ? 'Registering...' : 'Register Candidate Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <span onClick={() => { setView('login'); setPassword(''); }} style={{ color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer' }}>
                Sign in here
              </span>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM: STEP 1 */}
        {view === 'forgot' && (
          <form onSubmit={handleVerifyEmailForReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Registered Email Address
              </label>
              <input
                type="email"
                placeholder="dr.name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
              {loading ? 'Verifying Account...' : 'Verify Candidate Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span onClick={() => setView('login')} style={{ color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer' }}>
                Back to Sign In
              </span>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM: STEP 2 - NEW PASSWORD */}
        {view === 'reset-password' && (
          <form onSubmit={handleSaveNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              {newPassword && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${strength.score}%`, background: strength.color, transition: 'all 0.3s' }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>
                    Password Strength: {strength.text}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
              {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span onClick={() => setView('login')} style={{ color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer' }}>
                Cancel and Return to Sign In
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
