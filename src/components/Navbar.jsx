import React from 'react';

export default function Navbar({ 
  activeTab, 
  onNavigateTab, 
  stats, 
  theme, 
  toggleTheme, 
  user, 
  onOpenAuth, 
  onOpenProfile 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'practice', label: 'Practice Exam', icon: 'fa-bolt' },
    { id: 'flashcards', label: 'Flashcards', icon: 'fa-clone' },
    { id: 'qbank', label: 'QBank Catalog', icon: 'fa-book-open' },
    { id: 'mistakes', label: 'Mistakes Bank', icon: 'fa-triangle-exclamation', badge: stats?.mistakesCount || 0 }
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.75rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1300px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigateTab('dashboard')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label="FCPS Pro Home Dashboard"
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTab('dashboard'); }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-stethoscope" style={{ fontSize: '1.25rem' }}></i>
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', lineHeight: 1 }} className="gradient-text">
              FCPS Pro
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Part 1 Medical Prep
            </span>
          </div>
        </div>

        {/* Desktop Nav Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {navItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigateTab(tab.id)}
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === tab.id ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : 'rgba(244,63,94,0.2)',
                  color: activeTab === tab.id ? '#fff' : 'var(--accent-rose)',
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '99px',
                  fontWeight: 700
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Solved Count Badge */}
          <div className="badge" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
            <i className="fa-solid fa-fire" style={{ color: 'var(--accent-amber)' }}></i>
            <span>{stats?.attemptedCount || 0} Solved</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem'
            }}
            title="Toggle Light/Dark Theme"
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          {/* Authentication / Candidate Profile Button */}
          {user ? (
            <button
              onClick={onOpenProfile}
              aria-label="Open candidate profile"
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: 'var(--accent-cyan)'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'D'}
              </div>
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-primary"
              aria-label="Candidate Sign In"
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.85rem'
              }}
            >
              <i className="fa-solid fa-user-doctor"></i> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
