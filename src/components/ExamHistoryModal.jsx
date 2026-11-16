import React, { useState, useMemo } from 'react';
import Pagination from './Pagination';

export default function ExamHistoryModal({ isOpen, onClose, examAttempt }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'INCORRECT' | 'CORRECT'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const details = examAttempt?.details || [];

  const filtered = useMemo(() => {
    if (filter === 'CORRECT') return details.filter(d => d.isCorrect);
    if (filter === 'INCORRECT') return details.filter(d => !d.isCorrect);
    return details;
  }, [details, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  if (!isOpen || !examAttempt) return null;

  const isPassed = examAttempt.scorePercentage >= 70;
  const incorrectCount = (examAttempt.attemptedCount || details.length) - (examAttempt.correctCount || 0);

  const handlePrint = () => {
    window.print();
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
      <div className="glass-panel animate-fade-in printable-report" style={{
        maxWidth: '860px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2.5rem',
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close exam review modal"
          className="no-print"
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

        {/* Header Summary */}
        <div style={{
          padding: '1.75rem',
          borderRadius: 'var(--radius-md)',
          background: isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1.5px solid ${isPassed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <span className="badge" style={{ marginBottom: '0.4rem' }}>
              <i className="fa-solid fa-calendar-day"></i> {examAttempt.date || 'Exam History'}
            </span>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>
              {examAttempt.title || 'FCPS Mock Exam'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Duration: {examAttempt.timeTaken || '—'} &bull; {examAttempt.attemptedCount} Questions Solved
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: isPassed ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {examAttempt.scorePercentage}%
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subdued)' }}>
              {examAttempt.correctCount} / {examAttempt.attemptedCount} Correct
            </span>
          </div>
        </div>

        {/* Controls: Filter & Print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setFilter('ALL'); setPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: filter === 'ALL' ? 'var(--gradient-primary)' : 'var(--bg-card)',
                color: filter === 'ALL' ? '#fff' : 'var(--text-muted)',
                border: filter === 'ALL' ? 'none' : '1px solid var(--border-subtle)'
              }}
            >
              All ({details.length})
            </button>

            <button
              onClick={() => { setFilter('INCORRECT'); setPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: filter === 'INCORRECT' ? 'rgba(244, 63, 94, 0.25)' : 'var(--bg-card)',
                color: filter === 'INCORRECT' ? 'var(--accent-rose)' : 'var(--text-muted)',
                borderColor: filter === 'INCORRECT' ? 'var(--accent-rose)' : 'var(--border-subtle)'
              }}
            >
              Incorrect ({incorrectCount})
            </button>

            <button
              onClick={() => { setFilter('CORRECT'); setPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: filter === 'CORRECT' ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
                color: filter === 'CORRECT' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                borderColor: filter === 'CORRECT' ? 'var(--accent-emerald)' : 'var(--border-subtle)'
              }}
            >
              Correct ({examAttempt.correctCount || 0})
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <i className="fa-solid fa-print"></i> Print / Save PDF
          </button>
        </div>

        {/* Questions List */}
        {details.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            No question details stored for this previous test session.
          </div>
        ) : (
          <>
            {/* Top Pagination Controls */}
            {totalPages > 1 && (
              <div className="no-print" style={{ marginBottom: '1.25rem' }}>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filtered.length}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="attempted questions"
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {paginated.map((item, idx) => (
                <div key={item.q?.id || idx} className="glass-panel" style={{
                  padding: '1.5rem',
                  borderLeft: `4px solid ${item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span className="badge">{item.q?.category}</span>
                    <span className="badge" style={{
                      background: item.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      borderColor: item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }}>
                      {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                    Q{item.index || (idx + 1)}. {item.q?.question}
                  </h4>

                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <div><strong>Your Choice:</strong> Option {item.selected}</div>
                    <div><strong>Correct Answer:</strong> Option {item.correctAnswer?.toUpperCase()}</div>
                    {item.explanation && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <strong>Explanation:</strong> {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Pagination Controls */}
            {totalPages > 1 && (
              <div className="no-print">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filtered.length}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="attempted questions"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

