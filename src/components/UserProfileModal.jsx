import React, { useRef } from 'react';
import { exportBackupData, importBackupData } from '../utils/backup';

export default function UserProfileModal({ isOpen, onClose, user, stats, history, onLogout, resetProgress, addToast }) {
  const fileInputRef = useRef(null);

  if (!isOpen || !user) return null;

  const handleReset = () => {
    if (window.confirm('Are you sure you want to completely reset all your test statistics and history? This action cannot be undone.')) {
      resetProgress();
      addToast('All progress statistics and exam history have been reset', 'info');
      onClose();
    }
  };

  const handleLogoutClick = () => {
    onLogout();
    addToast('Signed out of candidate account', 'info');
    onClose();
  };

  const handleExportBackup = () => {
    try {
      exportBackupData();
      addToast('Backup JSON file downloaded successfully', 'success');
    } catch (e) {
      addToast('Failed to export backup data', 'error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importBackupData(file);
      addToast('Candidate data restored! Refreshing platform...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      addToast('Invalid backup file. Could not restore data.', 'error');
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const completedExams = history ? history.length : 0;
  const accuracy = stats.attemptedCount > 0
    ? Math.round((stats.correctCount / stats.attemptedCount) * 100)
    : 0;

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
        maxWidth: '560px',
        width: '100%',
        padding: '2.5rem',
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close user profile modal"
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

        {/* Profile Avatar & Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.8rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-glow)',
            flexShrink: 0
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'D'}
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>{user.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
            <span className="badge" style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
              <i className="fa-solid fa-user-doctor"></i> FCPS Part 1 Candidate &bull; {user.joined ? `Member since ${user.joined}` : 'Registered'}
            </span>
          </div>
        </div>

        {/* User Quick Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.75rem',
          background: 'rgba(255,255,255,0.03)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Attempted</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--accent-cyan)' }}>{stats.attemptedCount}</strong>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Accuracy</span>
            <strong style={{ fontSize: '1.3rem', color: accuracy >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {stats.attemptedCount > 0 ? `${accuracy}%` : '—'}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Mock Exams</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--accent-purple)' }}>{completedExams}</strong>
          </div>
        </div>

        {/* Backup & Portability Controls */}
        <div style={{ marginBottom: '1.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
            <i className="fa-solid fa-cloud-arrow-down"></i> Data Portability & Backup
          </span>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportBackup}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.82rem', justifyContent: 'center' }}
            >
              <i className="fa-solid fa-download"></i> Export Backup (.json)
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.82rem', justifyContent: 'center' }}
            >
              <i className="fa-solid fa-upload"></i> Restore Backup
            </button>

            <button
              onClick={handlePrintSummary}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
              title="Print Progress Report"
            >
              <i className="fa-solid fa-print"></i>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button
            onClick={handleReset}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.3)' }}
          >
            <i className="fa-solid fa-rotate-left"></i> Reset All Test Statistics & Exam History
          </button>

          <button
            onClick={handleLogoutClick}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: 'var(--gradient-danger)' }}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
