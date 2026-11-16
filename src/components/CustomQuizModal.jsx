import React, { useState, useMemo } from 'react';

export default function CustomQuizModal({ 
  isOpen, 
  onClose, 
  questions, 
  mistakesList = [], 
  bookmarks = {}, 
  onStartCustomQuiz, 
  addToast 
}) {
  const [testMode, setTestMode] = useState('tutor'); // 'exam' | 'tutor' | 'untimed'
  const [questionSource, setQuestionSource] = useState('all'); // 'all' | 'mistakes' | 'bookmarks'
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [questionCount, setQuestionCount] = useState(25);
  const [customTimeMinutes, setCustomTimeMinutes] = useState(25);
  const [isTimed, setIsTimed] = useState(true);

  // Extract distinct subjects and question counts
  const subjectCounts = useMemo(() => {
    const map = {};
    const baseList = questionSource === 'mistakes' 
      ? mistakesList 
      : (questionSource === 'bookmarks' ? questions.filter(q => !!bookmarks[q.id]) : questions);

    baseList.forEach(q => {
      const subj = q.category.split('-')[0].trim();
      map[subj] = (map[subj] || 0) + 1;
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [questions, mistakesList, bookmarks, questionSource]);

  // Total available questions based on selections
  const availableQuestions = useMemo(() => {
    let pool = questions;
    if (questionSource === 'mistakes') {
      pool = mistakesList;
    } else if (questionSource === 'bookmarks') {
      pool = questions.filter(q => !!bookmarks[q.id]);
    }

    if (selectedSubjects.length > 0) {
      pool = pool.filter(q => {
        const subj = q.category.split('-')[0].trim();
        return selectedSubjects.includes(subj);
      });
    }

    return pool;
  }, [questions, mistakesList, bookmarks, questionSource, selectedSubjects]);

  if (!isOpen) return null;

  const toggleSubject = (subj) => {
    setSelectedSubjects(prev => 
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const handleSelectAllSubjects = () => {
    if (selectedSubjects.length === subjectCounts.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(subjectCounts.map(([subj]) => subj));
    }
  };

  const handleLaunch = () => {
    if (availableQuestions.length === 0) {
      addToast('No questions match your selected filters. Please adjust criteria.', 'warning');
      return;
    }

    const count = Math.min(questionCount, availableQuestions.length);
    const duration = isTimed && testMode !== 'untimed' 
      ? (customTimeMinutes || count) 
      : null;

    onStartCustomQuiz({
      mode: 'custom',
      testMode, // 'tutor' | 'exam' | 'untimed'
      pool: availableQuestions,
      limit: count,
      durationMinutes: duration,
      title: `Custom ${testMode === 'tutor' ? 'Tutor' : 'Practice'} Session (${count} MCQs)`
    });

    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2.25rem',
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close custom quiz modal"
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

        <div style={{ marginBottom: '1.75rem' }}>
          <div className="badge" style={{ marginBottom: '0.4rem' }}>
            <i className="fa-solid fa-sliders"></i> High-Yield Test Generator
          </div>
          <h2 style={{ fontSize: '1.8rem' }}>Custom Exam & Tutor Builder</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Configure your preferred test mode, targeted disciplines, and question count.
          </p>
        </div>

        {/* 1. Test Mode Selection */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.6rem' }}>
            1. Select Practice Mode
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {/* Tutor Mode */}
            <div
              onClick={() => { setTestMode('tutor'); setIsTimed(false); }}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${testMode === 'tutor' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                background: testMode === 'tutor' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <i className="fa-solid fa-graduation-cap" style={{ color: 'var(--accent-cyan)' }}></i>
                <strong style={{ fontSize: '0.95rem' }}>Tutor Mode</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Immediate feedback & explanation revealed after each MCQ.
              </p>
            </div>

            {/* Exam Mode */}
            <div
              onClick={() => { setTestMode('exam'); setIsTimed(true); }}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${testMode === 'exam' ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
                background: testMode === 'exam' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <i className="fa-solid fa-stopwatch" style={{ color: 'var(--accent-indigo)' }}></i>
                <strong style={{ fontSize: '0.95rem' }}>Timed Exam Mode</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Official test simulation with countdown timer; review at the end.
              </p>
            </div>

            {/* Untimed Mode */}
            <div
              onClick={() => { setTestMode('untimed'); setIsTimed(false); }}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${testMode === 'untimed' ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                background: testMode === 'untimed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <i className="fa-solid fa-book-open-reader" style={{ color: 'var(--accent-emerald)' }}></i>
                <strong style={{ fontSize: '0.95rem' }}>Untimed Practice</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Solve questions without time pressure at your own pace.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Question Source */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.6rem' }}>
            2. Question Source Pool
          </label>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={() => setQuestionSource('all')}
              style={{
                background: questionSource === 'all' ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.04)',
                color: questionSource === 'all' ? '#fff' : 'var(--text-muted)',
                borderColor: questionSource === 'all' ? 'transparent' : 'var(--border-subtle)',
                fontSize: '0.85rem',
                padding: '0.45rem 0.95rem'
              }}
            >
              <i className="fa-solid fa-layer-group"></i> All 3,967 Questions
            </button>

            <button
              className="btn-secondary"
              onClick={() => setQuestionSource('mistakes')}
              style={{
                background: questionSource === 'mistakes' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255,255,255,0.04)',
                color: questionSource === 'mistakes' ? 'var(--accent-rose)' : 'var(--text-muted)',
                borderColor: questionSource === 'mistakes' ? 'var(--accent-rose)' : 'var(--border-subtle)',
                fontSize: '0.85rem',
                padding: '0.45rem 0.95rem'
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> Mistakes Bank ({mistakesList.length})
            </button>

            <button
              className="btn-secondary"
              onClick={() => setQuestionSource('bookmarks')}
              style={{
                background: questionSource === 'bookmarks' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.04)',
                color: questionSource === 'bookmarks' ? 'var(--accent-amber)' : 'var(--text-muted)',
                borderColor: questionSource === 'bookmarks' ? 'var(--accent-amber)' : 'var(--border-subtle)',
                fontSize: '0.85rem',
                padding: '0.45rem 0.95rem'
              }}
            >
              <i className="fa-solid fa-bookmark"></i> Bookmarked Questions ({Object.keys(bookmarks).length})
            </button>
          </div>
        </div>

        {/* 3. Subject Filter */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              3. Target Subjects & Disciplines ({selectedSubjects.length === 0 ? 'All Selected' : `${selectedSubjects.length} selected`})
            </label>
            <button
              onClick={handleSelectAllSubjects}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {selectedSubjects.length === subjectCounts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.5rem',
            maxHeight: '160px',
            overflowY: 'auto',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            {subjectCounts.map(([subj, count]) => {
              const isChecked = selectedSubjects.includes(subj);
              return (
                <div
                  key={subj}
                  onClick={() => toggleSubject(subj)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    border: `1px solid ${isChecked ? 'var(--accent-cyan)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                    {subj}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subdued)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Question Count & Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Number of MCQs
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[10, 20, 50, 100].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => { setQuestionCount(cnt); setCustomTimeMinutes(cnt); }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: questionCount === cnt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: questionCount === cnt ? 'var(--accent-cyan)' : 'var(--bg-card)',
                    color: questionCount === cnt ? '#fff' : 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Time Limit (Minutes)
            </label>
            <input
              type="number"
              min="5"
              max="240"
              disabled={testMode === 'untimed'}
              value={customTimeMinutes}
              onChange={(e) => setCustomTimeMinutes(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                opacity: testMode === 'untimed' ? 0.5 : 1
              }}
            />
          </div>
        </div>

        {/* Summary & Launch Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Pool matched:</span>
            <strong style={{ fontSize: '1rem', color: 'var(--accent-cyan)', display: 'block' }}>
              {Math.min(questionCount, availableQuestions.length)} of {availableQuestions.length} Questions
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleLaunch} disabled={availableQuestions.length === 0}>
              <i className="fa-solid fa-play"></i> Launch Custom Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

