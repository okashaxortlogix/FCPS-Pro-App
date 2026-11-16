import React, { useState, useMemo } from 'react';
import Pagination from './Pagination';

export default function Dashboard({ 
  questions, 
  stats, 
  history = [], 
  startQuiz, 
  onOpenCustomModal, 
  onOpenFlashcards, 
  onSelectExamAttempt 
  onSelectExamAttempt,
  user,
  onOpenAuth
}) {
  // Pagination for Subject-Wise Breakdown
  const [subjectPage, setSubjectPage] = useState(1);
  const subjectPageSize = 8;

  // Pagination for Recent Exam Activity
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 3;

  // Pagination for Discipline Mastery
  const [masteryPage, setMasteryPage] = useState(1);
  const masteryPageSize = 6;

  const accuracy = stats.attemptedCount > 0 
    ? Math.round((stats.correctCount / stats.attemptedCount) * 100) 
    : null;

  // Calculate Best & Average Score from attempt history
  const totalTests = history ? history.length : 0;
  const completedTests = history ? history.filter(h => h.completed || h.scorePercentage !== undefined).length : 0;
  const scores = history && history.length > 0 ? history.map(h => h.scorePercentage).filter(s => typeof s === 'number') : [];
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Group categories into broad subjects
  const categories = useMemo(() => {
    const map = {};
    questions.forEach(q => {
      const subject = q.category.split('-')[0].trim();
      map[subject] = (map[subject] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [questions]);

  // Paginated subjects
  const totalSubjectPages = Math.ceil(categories.length / subjectPageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (subjectPage - 1) * subjectPageSize;
    return categories.slice(start, start + subjectPageSize);
  }, [categories, subjectPage, subjectPageSize]);

  // Paginated recent exams
  const totalHistoryPages = Math.ceil((history?.length || 0) / historyPageSize) || 1;
  const paginatedHistory = useMemo(() => {
    if (!history) return [];
    const start = (historyPage - 1) * historyPageSize;
    return history.slice(start, start + historyPageSize);
  }, [history, historyPage, historyPageSize]);

  // Identify Weak Subjects from mistakes list
  const weakSubjects = useMemo(() => {
    if (!stats.mistakesList || stats.mistakesList.length === 0) return [];
    const counts = {};
    stats.mistakesList.forEach(m => {
      const subj = m.category.split('-')[0].trim();
      counts[subj] = (counts[subj] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [stats.mistakesList]);

  // Subject Mastery Stats (Computed from solved exam details)
  const subjectMastery = useMemo(() => {
    const counts = {};
    if (history && Array.isArray(history)) {
      history.forEach(exam => {
        if (exam.details && Array.isArray(exam.details)) {
          exam.details.forEach(item => {
            const subj = item.q?.category?.split('-')[0].trim() || 'General';
            if (!counts[subj]) counts[subj] = { correct: 0, total: 0 };
            counts[subj].total++;
            if (item.isCorrect) counts[subj].correct++;
          });
        }
      });
    }

    return Object.entries(counts)
      .map(([subj, data]) => ({
        subject: subj,
        percentage: Math.round((data.correct / data.total) * 100),
        correct: data.correct,
        total: data.total
      }))
      .sort((a, b) => b.total - a.total);
  }, [history]);

  // Paginated mastery disciplines
  const totalMasteryPages = Math.ceil(subjectMastery.length / masteryPageSize) || 1;
  const paginatedMastery = useMemo(() => {
    const start = (masteryPage - 1) * masteryPageSize;
    return subjectMastery.slice(start, start + masteryPageSize);
  }, [subjectMastery, masteryPage, masteryPageSize]);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      {/* Guest Authentication Warning Banner */}
      {!user && (
        <div className="glass-panel animate-fade-in" style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1.5px solid var(--accent-amber)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.18)',
              color: 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0
            }}>
              <i className="fa-solid fa-lock"></i>
            </div>
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                Candidate Authentication Required for Exams
              </strong>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                You are currently browsing as a Guest. You must sign in or register to take exams, track analytics, and save certified results.
              </span>
            </div>
          </div>

          <button className="btn-primary" onClick={onOpenAuth} style={{ padding: '0.55rem 1.35rem', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-right-to-bracket"></i> Sign In / Register
          </button>
        </div>
      )}

      {/* Hero Banner with Primary Launchers & Custom Test Builder */}
      <div className="glass-panel" style={{
        padding: '2.5rem',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
        border: '1px solid var(--border-glow)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="badge" style={{ marginBottom: '0.85rem' }}>
            <i className="fa-solid fa-graduation-cap"></i> Official FCPS Part-1 Medical Preparation Platform
          </div>
          {user ? (
            <div className="badge" style={{ marginBottom: '0.85rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}>
              <i className="fa-solid fa-user-doctor"></i> Candidate: Dr. {user.name} &bull; FCPS Part-1 Verified
            </div>
          ) : (
            <div className="badge" style={{ marginBottom: '0.85rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <i className="fa-solid fa-lock"></i> Guest Mode &bull; Sign In to Launch Certified Exams
            </div>
          )}
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>
            Master <span className="gradient-text">{questions.length.toLocaleString()} Verified High-Yield Clinical MCQs</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '720px', fontSize: '1.05rem', marginBottom: '1.75rem' }}>
            Comprehensive medical exam simulation with Tutor Mode, question elimination, spaced repetition flashcards, customizable mock examinations, and discipline mastery analytics.
          </p>

          {/* Test Launch Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => startQuiz({ mode: 'full_fcps', limit: 200 })}>
              <i className="fa-solid fa-trophy" style={{ color: 'var(--accent-amber)' }}></i> Launch 200-MCQ FCPS Exam
            </button>

            <button className="btn-secondary" onClick={() => startQuiz({ mode: 'mock', limit: 100 })}>
              <i className="fa-solid fa-stopwatch"></i> 100-MCQ Timed Mock
            </button>

            <button 
              className="btn-secondary" 
              onClick={onOpenCustomModal}
              style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            >
              <i className="fa-solid fa-sliders"></i> Custom Test Builder
            </button>

            <button 
              className="btn-secondary" 
              onClick={onOpenFlashcards}
              style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
            >
              <i className="fa-solid fa-clone"></i> Flashcards
            </button>

            <button className="btn-secondary" onClick={() => startQuiz({ mode: 'all' })}>
              <i className="fa-solid fa-play"></i> Full Practice
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Total Exams Taken</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-file-signature"></i>
            </div>
          </div>
          <h2 style={{ fontSize: '2rem' }}>{totalTests}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-subdued)' }}>{completedTests} Submitted & Analyzed</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Average Score</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', color: avgScore !== null && avgScore >= 70 ? 'var(--accent-emerald)' : 'var(--text-main)' }}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-subdued)' }}>
            {avgScore !== null ? 'Overall Average Performance' : 'Take an exam to view average'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Best Score</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-crown"></i>
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-amber)' }}>
            {bestScore !== null ? `${bestScore}%` : '—'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-subdued)' }}>
            {bestScore !== null ? 'Highest Exam Percentage' : 'No recorded exams yet'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Mistakes Revision</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-rose)' }}>{stats.mistakesCount}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-subdued)' }}>Questions requiring review</span>
        </div>
      </div>

      {/* Discipline Mastery Analytics */}
      {subjectMastery.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-chart-column" style={{ color: 'var(--accent-cyan)' }}></i>
              Discipline Mastery & Performance Breakdown ({subjectMastery.length} Disciplines)
            </h3>
            {totalMasteryPages > 1 && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page {masteryPage} of {totalMasteryPages}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: totalMasteryPages > 1 ? '1.25rem' : 0 }}>
            {paginatedMastery.map(sub => (
              <div key={sub.subject} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{sub.subject}</strong>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: sub.percentage >= 70 ? 'var(--accent-emerald)' : (sub.percentage >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)')
                  }}>
                    {sub.percentage}% ({sub.correct}/{sub.total})
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${sub.percentage}%`,
                    background: sub.percentage >= 70 ? 'var(--accent-emerald)' : (sub.percentage >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'),
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>

          {totalMasteryPages > 1 && (
            <Pagination
              currentPage={masteryPage}
              totalPages={totalMasteryPages}
              onPageChange={setMasteryPage}
              totalItems={subjectMastery.length}
              pageSize={masteryPageSize}
              itemLabel="disciplines"
            />
          )}
        </div>
      )}

      {/* Analytics Breakdown: Weak Subjects & Paginated Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Weak Subjects Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--accent-rose)' }}></i>
            Weak Subjects (Focus Areas)
          </h3>

          {weakSubjects.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', padding: '1rem 0' }}>
              <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-emerald)', marginRight: '0.5rem' }}></i>
              No specific weak areas detected yet! Keep practicing to track performance.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {weakSubjects.map(([subject, count]) => (
                <div key={subject} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-rose)' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{subject}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{count} Incorrect Answers</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exam Activity History (Paginated!) */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-cyan)' }}></i>
              Recent Exam Activity ({history?.length || 0})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subdued)' }}>Click to review past test</span>
          </div>

          {!history || history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', padding: '1rem 0' }}>
              No exam attempts recorded yet. Click one of the buttons above to start your first session!
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {paginatedHistory.map((h, i) => (
                  <div 
                    key={h.id || `${h.date}-${h.title}-${i}`} 
                    onClick={() => onSelectExamAttempt && onSelectExamAttempt(h)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.75rem 1rem', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view question-by-question review"
                  >
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{h.title || 'FCPS Mock Exam'}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {h.date} &bull; {h.attemptedCount || h.totalQuestions} Solved &bull; {h.timeTaken}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: h.scorePercentage >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {h.scorePercentage}%
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-subdued)' }}>
                        {h.correctCount} / {h.attemptedCount || h.totalQuestions} Marks &bull; <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.65rem' }}></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {totalHistoryPages > 1 && (
                <Pagination
                  currentPage={historyPage}
                  totalPages={totalHistoryPages}
                  onPageChange={setHistoryPage}
                  totalItems={history.length}
                  pageSize={historyPageSize}
                  itemLabel="past exams"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Subject-Wise Information Breakdown (Paginated!) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-cyan)' }}></i>
            Subject-Wise Question Breakdown ({categories.length} Topics)
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing page {subjectPage} of {totalSubjectPages}
          </span>
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {paginatedCategories.map(([subject, count]) => (
          <div
            key={subject}
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{subject}</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{count} Verified MCQs</span>
            </div>

            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.1)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 700
            }}>
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
        ))}
      </div>

      {/* Subject Breakdown Pagination Controls */}
      {totalSubjectPages > 1 && (
        <Pagination
          currentPage={subjectPage}
          totalPages={totalSubjectPages}
          onPageChange={setSubjectPage}
          totalItems={categories.length}
          pageSize={subjectPageSize}
          itemLabel="disciplines"
        />
      )}
    </div>
  );
}
