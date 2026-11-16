import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import Pagination from './Pagination';

export default function QuizEngine({ quizList, onAnswer, onRecordResult, onFinish, config, addToast }) {
  // Pagination State for active exam
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(1); // 1, 5, 10, or 20 MCQs per page

  const [userAnswers, setUserAnswers] = useState({}); // { [qId]: { selected, isCorrect } }
  const [markedForReview, setMarkedForReview] = useState({}); // { [qId]: true }
  const [eliminatedOptions, setEliminatedOptions] = useState({}); // { [qId]: { [optKey]: true } }

  // Tutor Mode State (Instant feedback)
  const [isTutorMode, setIsTutorMode] = useState(config?.testMode === 'tutor' || !!config?.isTutor);

  // Audio Text-to-Speech State
  const [speakingQId, setSpeakingQId] = useState(null);

  // Font Size Zoom (0.9, 1.0, 1.15, 1.3)
  const [fontScale, setFontScale] = useState(1);

  // Question Notes
  const [activeNoteQId, setActiveNoteQId] = useState(null);
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('fcps_notes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Results review pagination & filter
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsFilter, setResultsFilter] = useState('ALL'); // 'ALL' | 'INCORRECT' | 'CORRECT'
  const resultsPageSize = 10;
  
  // Timer initialization
  const initialDurationMinutes = config?.durationMinutes || (config?.isMock ? 120 : null);
  const initialSeconds = initialDurationMinutes ? initialDurationMinutes * 60 : null;
  const [timerSeconds, setTimerSeconds] = useState(initialSeconds);

  const [showPalette, setShowPalette] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState('ALL'); // 'ALL' | 'ANSWERED' | 'MARKED' | 'UNANSWERED'
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [startTime] = useState(Date.now());

  // Refs to avoid stale closure
  const userAnswersRef = useRef(userAnswers);
  userAnswersRef.current = userAnswers;

  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;

  const quizListRef = useRef(quizList);
  quizListRef.current = quizList;

  const configRef = useRef(config);
  configRef.current = config;

  // Final Submit Handler
  const handleFinalSubmit = useCallback((auto = false) => {
    if (isCompletedRef.current) return;
    setIsCompleted(true);
    setShowSubmitModal(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const currentAnswers = userAnswersRef.current;
    const currentList = quizListRef.current || [];
    const currentConfig = configRef.current;

    const totalQ = currentList.length;
    let correctCount = 0;
    let attemptedCount = 0;
    const details = [];

    currentList.forEach((q, idx) => {
      const ans = currentAnswers[q.id];
      const selected = ans ? ans.selected : null;
      const isCorrect = ans ? ans.isCorrect : false;

      if (selected !== null && selected !== undefined) {
        attemptedCount++;
        if (isCorrect) correctCount++;
        
        details.push({
          q,
          index: idx + 1,
          selected,
          isCorrect,
          correctAnswer: q.correct_answer,
          explanation: q.explanation
        });
      }
    });

    const scorePercentage = attemptedCount > 0 
      ? Math.round((correctCount / attemptedCount) * 100) 
      : 0;

    const elapsedMs = Date.now() - startTime;
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
    const timeTakenStr = `${elapsedMins}m ${elapsedSecs}s`;

    const examTitle = currentConfig?.title || (currentConfig?.isMock ? 'FCPS 200-MCQ Examination' : 'Practice Exam Session');

    const resultObj = {
      id: `result_${Date.now()}`,
      title: examTitle,
      totalQuestions: totalQ,
      attemptedCount,
      skippedCount: totalQ - attemptedCount,
      correctCount,
      scorePercentage,
      timeTaken: timeTakenStr,
      details,
      date: new Date().toLocaleDateString()
    };

    setExamResult(resultObj);
    if (onRecordResult) {
      onRecordResult(resultObj);
    }

    if (scorePercentage >= 70 && attemptedCount > 0) {
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}
      addToast(
        auto ? `Time Expired! Auto-submitted. Passed with ${scorePercentage}%!` : `Exam Passed! Accuracy: ${scorePercentage}% (${correctCount}/${attemptedCount} Solved)`,
        'success'
      );
    } else {
      addToast(
        auto ? `Time Expired! Auto-submitted. Score: ${scorePercentage}%` : `Exam Submitted. Accuracy: ${scorePercentage}% (${correctCount}/${attemptedCount} Solved)`,
        'warning'
      );
    }
  }, [startTime, onRecordResult, addToast]);

  // Wall-clock based timer countdown
  useEffect(() => {
    if (initialSeconds === null || isCompleted) return;

    const targetEndTime = Date.now() + (initialSeconds * 1000);

    const interval = setInterval(() => {
      if (isCompletedRef.current) {
        clearInterval(interval);
        return;
      }

      const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
      setTimerSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleFinalSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds, isCompleted, handleFinalSubmit]);

  // Pagination for questions in the exam
  const totalExamPages = Math.ceil(quizList.length / pageSize) || 1;
  const currentQuestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return quizList.slice(start, start + pageSize);
  }, [quizList, page, pageSize]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Keyboard Navigation: Left & Right arrow keys to change question/page
  useEffect(() => {
    if (isCompleted) return;

    const handleKeyDown = (e) => {
      // Do not trigger when interacting with inputs, notes, or modals
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        if (page > 1) {
          handlePageChange(page - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (page < totalExamPages) {
          handlePageChange(page + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, totalExamPages, isCompleted]);

  const handleSelectOption = (q, key) => {
    if (isCompleted) return;
    const isCorrect = key.toUpperCase() === q.correct_answer.toUpperCase();
    
    const updatedAnswers = {
      ...userAnswers,
      [q.id]: { selected: key, isCorrect }
    };
    setUserAnswers(updatedAnswers);
    if (typeof onAnswer === 'function') {
      onAnswer(q, key, isCorrect);
    }
  };

  // Toggle Strikethrough / Elimination
  const toggleEliminate = (e, qId, optKey) => {
    e.stopPropagation();
    setEliminatedOptions(prev => {
      const qElim = prev[qId] || {};
      const nextQElim = { ...qElim, [optKey]: !qElim[optKey] };
      return { ...prev, [qId]: nextQElim };
    });
  };

  const toggleMarkForReview = (qId) => {
    setMarkedForReview(prev => {
      const next = { ...prev, [qId]: !prev[qId] };
      if (!prev[qId]) {
        addToast(`Question marked for review`, 'info');
      }
      return next;
    });
  };

  const handleSaveNote = (qId, text) => {
    const updated = { ...notes, [qId]: text };
    if (!text.trim()) delete updated[qId];
    setNotes(updated);
    localStorage.setItem('fcps_notes', JSON.stringify(updated));
  };

  // Text to Speech
  const toggleSpeech = (q) => {
    if (!('speechSynthesis' in window)) {
      addToast('Speech synthesis not supported on this browser', 'warning');
      return;
    }

    if (speakingQId === q.id) {
      window.speechSynthesis.cancel();
      setSpeakingQId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${q.question}. Option A: ${q.option_a}. Option B: ${q.option_b}. Option C: ${q.option_c}. Option D: ${q.option_d}.`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingQId(null);
    utterance.onerror = () => setSpeakingQId(null);

    setSpeakingQId(q.id);
    window.speechSynthesis.speak(utterance);
  };

  const formatTimer = (seconds) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Stats
  const answeredCount = Object.keys(userAnswers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = quizList.length - answeredCount;
  const progressPercent = Math.round((answeredCount / quizList.length) * 100);

  // Filtered & Paginated Results Details
  const filteredDetails = useMemo(() => {
    if (!examResult?.details) return [];
    if (resultsFilter === 'CORRECT') return examResult.details.filter(d => d.isCorrect);
    if (resultsFilter === 'INCORRECT') return examResult.details.filter(d => !d.isCorrect);
    return examResult.details;
  }, [examResult, resultsFilter]);

  const totalResultsPages = Math.ceil(filteredDetails.length / resultsPageSize) || 1;
  const paginatedDetails = useMemo(() => {
    const start = (resultsPage - 1) * resultsPageSize;
    return filteredDetails.slice(start, start + resultsPageSize);
  }, [filteredDetails, resultsPage, resultsPageSize]);

  // RENDER EXAM RESULTS PAGE IF COMPLETED
  if (isCompleted && examResult) {
    const isPassed = examResult.scorePercentage >= 70;
    const incorrectCount = examResult.attemptedCount - examResult.correctCount;

    return (
      <div className="animate-fade-in" style={{ padding: '2.5rem 0', maxWidth: '960px', margin: '0 auto' }}>
        {/* Results Header Card */}
        <div className="glass-panel text-center" style={{
          padding: '3rem 2rem',
          marginBottom: '2rem',
          background: isPassed 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)' 
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)',
          border: `1.5px solid ${isPassed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            color: isPassed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '2rem'
          }}>
            <i className={`fa-solid ${isPassed ? 'fa-award' : 'fa-chart-pie'}`}></i>
          </div>

          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>
            {examResult.title} — {isPassed ? 'Passed!' : 'Submitted'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '1.75rem' }}>
            {examResult.skippedCount > 0 
              ? `${examResult.skippedCount} skipped question(s) were excluded from final accuracy.` 
              : 'All questions in this examination were answered.'}
          </p>

          {/* Key Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            maxWidth: '750px',
            margin: '0 auto 2rem'
          }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Attempted Accuracy</span>
              <strong style={{ fontSize: '1.8rem', color: isPassed ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {examResult.scorePercentage}%
              </strong>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Correct / Solved</span>
              <strong style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)' }}>
                {examResult.correctCount} / {examResult.attemptedCount}
              </strong>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Skipped</span>
              <strong style={{ fontSize: '1.8rem', color: 'var(--text-subdued)' }}>
                {examResult.skippedCount}
              </strong>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Time Elapsed</span>
              <strong style={{ fontSize: '1.8rem', color: 'var(--accent-purple)' }}>
                {examResult.timeTaken}
              </strong>
            </div>
          </div>

          <button className="btn-primary" onClick={() => onFinish && onFinish()}>
            <i className="fa-solid fa-house"></i> Return to Dashboard
          </button>
        </div>

        {/* Detailed Question Review List with Full Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--accent-cyan)' }}></i>
            Attempted Questions Review ({examResult.details.length} Total)
          </h3>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setResultsFilter('ALL'); setResultsPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: resultsFilter === 'ALL' ? 'var(--gradient-primary)' : 'var(--bg-card)',
                color: resultsFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                border: resultsFilter === 'ALL' ? 'none' : '1px solid var(--border-subtle)'
              }}
            >
              All ({examResult.details.length})
            </button>

            <button
              onClick={() => { setResultsFilter('INCORRECT'); setResultsPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: resultsFilter === 'INCORRECT' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-card)',
                color: resultsFilter === 'INCORRECT' ? 'var(--accent-rose)' : 'var(--text-muted)',
                borderColor: resultsFilter === 'INCORRECT' ? 'var(--accent-rose)' : 'var(--border-subtle)'
              }}
            >
              Incorrect ({incorrectCount})
            </button>

            <button
              onClick={() => { setResultsFilter('CORRECT'); setResultsPage(1); }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: resultsFilter === 'CORRECT' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)',
                color: resultsFilter === 'CORRECT' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                borderColor: resultsFilter === 'CORRECT' ? 'var(--accent-emerald)' : 'var(--border-subtle)'
              }}
            >
              Correct ({examResult.correctCount})
            </button>
          </div>
        </div>

        {filteredDetails.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '2.5rem', color: 'var(--text-muted)' }}>
            No questions found for the selected filter.
          </div>
        ) : (
          <>
            {totalResultsPages > 1 && (
              <div style={{ marginBottom: '1rem' }}>
                <Pagination
                  currentPage={resultsPage}
                  totalPages={totalResultsPages}
                  onPageChange={setResultsPage}
                  totalItems={filteredDetails.length}
                  pageSize={resultsPageSize}
                  itemLabel="solved questions"
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {paginatedDetails.map((item) => (
                <div key={item.q.id} className="glass-panel" style={{
                  padding: '1.75rem',
                  borderLeft: `4px solid ${item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="badge">{item.q.category}</span>
                    <span className="badge" style={{
                      background: item.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      borderColor: item.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }}>
                      {item.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Answer'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Q{item.index}. {item.q.question}
                  </h4>

                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                    <div><strong>Your Choice:</strong> Option {item.selected}</div>
                    <div><strong>Correct Answer:</strong> Option {item.correctAnswer.toUpperCase()}</div>
                    {item.explanation && (
                      <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <strong>Explanation:</strong> {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalResultsPages > 1 && (
              <Pagination
                currentPage={resultsPage}
                totalPages={totalResultsPages}
                onPageChange={setResultsPage}
                totalItems={filteredDetails.length}
                pageSize={resultsPageSize}
                itemLabel="solved questions"
              />
            )}
          </>
        )}
      </div>
    );
  }

  // ACTIVE EXAM ENGINE VIEW
  return (
    <div className="animate-fade-in" style={{ padding: '1.75rem 0', maxWidth: '1260px', margin: '0 auto', position: 'relative' }}>
      {/* 1. Header & Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Left: Overall Exam Progress Counter */}
        <div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pageSize === 1 ? (
              <span>Question <strong className="gradient-text">#{page}</strong> of {quizList.length}</span>
            ) : (
              <span>Page <strong className="gradient-text">{page}</strong> of {totalExamPages} <span style={{ fontSize: '0.85rem', color: 'var(--text-subdued)' }}>(Q{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, quizList.length)})</span></span>
            )}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              &bull; {answeredCount} / {quizList.length} Solved ({progressPercent}%)
            </span>
          </h3>
        </div>

        {/* Right: Tutor Mode Toggle, Timer, Palette, Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* Tutor Mode Toggle */}
          <button
            onClick={() => {
              setIsTutorMode(!isTutorMode);
              addToast(isTutorMode ? 'Tutor Mode Disabled' : 'Tutor Mode Activated (Instant Explanations)', 'info');
            }}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              background: isTutorMode ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: isTutorMode ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: isTutorMode ? 'var(--accent-cyan)' : 'var(--border-subtle)',
              fontWeight: 600
            }}
            title="Toggle instant explanations after answering"
          >
            <i className="fa-solid fa-graduation-cap"></i> Tutor: {isTutorMode ? 'ON' : 'OFF'}
          </button>

          {timerSeconds !== null && (
            <div 
              className="badge" 
              style={{ 
                background: timerSeconds < 300 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.15)', 
                color: timerSeconds < 300 ? 'var(--accent-rose)' : 'var(--accent-amber)', 
                borderColor: timerSeconds < 300 ? 'var(--accent-rose)' : 'rgba(245, 158, 11, 0.3)', 
                padding: '0.45rem 0.85rem', 
                fontSize: '0.92rem',
                fontWeight: 700 
              }}
            >
              <i className="fa-solid fa-clock"></i> {formatTimer(timerSeconds)}
            </div>
          )}

          {/* Palette Drawer Toggle */}
          <button
            className="btn-secondary"
            onClick={() => setShowPalette(!showPalette)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            <i className="fa-solid fa-grip"></i> Palette ({answeredCount}/{quizList.length})
          </button>

          {/* Submit Exam Button */}
          <button
            className="btn-primary"
            onClick={() => setShowSubmitModal(true)}
            style={{ padding: '0.45rem 1.05rem', fontSize: '0.82rem', background: 'var(--gradient-success)' }}
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* 2. Progress Bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(answeredCount / quizList.length) * 100}%`,
          background: 'var(--gradient-primary)',
          transition: 'width 0.25s ease'
        }}></div>
      </div>

      {/* 3. TOP QUESTION PAGINATION CONTROLS (Full Pagination) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Pagination
          currentPage={page}
          totalPages={totalExamPages}
          onPageChange={handlePageChange}
          totalItems={quizList.length}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[1, 5, 10, 20]}
          itemLabel="MCQs in exam"
        />
      </div>

      {/* Palette Drawer (Collapsible) */}
      {showPalette && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '1.05rem' }}>Question Palette Navigator ({quizList.length} MCQs)</h4>

            {/* Palette Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setPaletteFilter('ALL')}
                className="btn-secondary"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  background: paletteFilter === 'ALL' ? 'var(--gradient-primary)' : 'transparent',
                  color: paletteFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                  borderColor: paletteFilter === 'ALL' ? 'transparent' : 'var(--border-subtle)'
                }}
              >
                All ({quizList.length})
              </button>

              <button
                type="button"
                onClick={() => setPaletteFilter('ANSWERED')}
                className="btn-secondary"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  background: paletteFilter === 'ANSWERED' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: paletteFilter === 'ANSWERED' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderColor: paletteFilter === 'ANSWERED' ? 'var(--accent-cyan)' : 'var(--border-subtle)'
                }}
              >
                Answered ({answeredCount})
              </button>

              <button
                type="button"
                onClick={() => setPaletteFilter('MARKED')}
                className="btn-secondary"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  background: paletteFilter === 'MARKED' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: paletteFilter === 'MARKED' ? 'var(--accent-purple)' : 'var(--text-muted)',
                  borderColor: paletteFilter === 'MARKED' ? 'var(--accent-purple)' : 'var(--border-subtle)'
                }}
              >
                Marked ({markedCount})
              </button>

              <button
                type="button"
                onClick={() => setPaletteFilter('UNANSWERED')}
                className="btn-secondary"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  background: paletteFilter === 'UNANSWERED' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: paletteFilter === 'UNANSWERED' ? '#fff' : 'var(--text-muted)',
                  borderColor: paletteFilter === 'UNANSWERED' ? '#fff' : 'var(--border-subtle)'
                }}
              >
                Unanswered ({unansweredCount})
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
            {quizList.map((q, idx) => {
              const isAns = !!userAnswers[q.id];
              const isM = !!markedForReview[q.id];
              const isCurr = (page - 1) * pageSize <= idx && idx < page * pageSize;

              if (paletteFilter === 'ANSWERED' && !isAns) return null;
              if (paletteFilter === 'MARKED' && !isM) return null;
              if (paletteFilter === 'UNANSWERED' && isAns) return null;

              let bg = 'rgba(255,255,255,0.05)';
              let color = 'var(--text-muted)';
              let border = '1px solid var(--border-subtle)';

              if (isM) {
                bg = 'rgba(168, 85, 247, 0.25)';
                color = 'var(--accent-purple)';
                border = '1px solid var(--accent-purple)';
              } else if (isAns) {
                bg = 'rgba(6, 182, 212, 0.2)';
                color = 'var(--accent-cyan)';
                border = '1px solid var(--accent-cyan)';
              }

              if (isCurr) {
                border = '2px solid #ffffff';
              }

              return (
                <button
                  key={q.id || idx}
                  onClick={() => {
                    const targetPage = Math.floor(idx / pageSize) + 1;
                    setPage(targetPage);
                    setShowPalette(false);
                  }}
                  aria-label={`Jump to question ${idx + 1}`}
                  style={{
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    color,
                    border,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. RENDER CURRENT PAGE QUESTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
        {currentQuestions.map((q, qSubIdx) => {
          const globalIdx = (page - 1) * pageSize + qSubIdx;
          const currentAnswer = userAnswers[q.id];
          const isMarked = !!markedForReview[q.id];
          const currentEliminated = eliminatedOptions[q.id] || {};
          const currentNote = notes[q.id] || '';
          const isNoteOpen = activeNoteQId === q.id;

          const options = [
            { key: 'A', text: q.option_a },
            { key: 'B', text: q.option_b },
            { key: 'C', text: q.option_c },
            { key: 'D', text: q.option_d },
            { key: 'E', text: q.option_e }
          ].filter(o => o.text && o.text.trim() !== '');

          return (
            <div key={q.id || globalIdx} className="glass-panel" style={{ padding: '2.25rem', position: 'relative', fontSize: `${fontScale}rem` }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="badge">
                    <i className="fa-solid fa-tag"></i> {q.category}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Question #{globalIdx + 1}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Mark for Review */}
                  <button
                    onClick={() => toggleMarkForReview(q.id)}
                    className="btn-secondary"
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.78rem',
                      background: isMarked ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                      color: isMarked ? 'var(--accent-purple)' : 'var(--text-main)',
                      borderColor: isMarked ? 'var(--accent-purple)' : 'var(--border-subtle)'
                    }}
                  >
                    <i className="fa-solid fa-bookmark"></i> {isMarked ? 'Marked' : 'Mark'}
                  </button>

                  {/* Audio */}
                  <button
                    onClick={() => toggleSpeech(q)}
                    className="btn-secondary"
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.78rem',
                      background: speakingQId === q.id ? 'var(--accent-cyan)' : 'transparent',
                      color: speakingQId === q.id ? '#fff' : 'var(--text-main)'
                    }}
                    title="Read aloud"
                  >
                    <i className={`fa-solid ${speakingQId === q.id ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                  </button>

                  {/* Note */}
                  <button
                    onClick={() => setActiveNoteQId(isNoteOpen ? null : q.id)}
                    className="btn-secondary"
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.78rem',
                      background: currentNote ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: currentNote ? 'var(--accent-amber)' : 'var(--text-main)',
                      borderColor: currentNote ? 'var(--accent-amber)' : 'var(--border-subtle)'
                    }}
                    title="Add Study Note"
                  >
                    <i className="fa-solid fa-pen-to-square"></i> {currentNote ? 'Note' : 'Note'}
                  </button>

                  {/* Font Zoom */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.15rem' }}>
                    <button
                      onClick={() => setFontScale(s => Math.max(0.85, s - 0.1))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem 0.35rem', fontSize: '0.75rem' }}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontScale(s => Math.min(1.35, s + 0.1))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem 0.35rem', fontSize: '0.75rem' }}
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* 2-COLUMN SPLIT CONTAINER: Question Statement Left, Options Block Right */}
              <div className="exam-split-container">
                {/* LEFT COLUMN: Question Statement, Notes & Tutor Explanations */}
                <div className="question-statement-panel">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <i className="fa-solid fa-file-waveform"></i> Question Statement & Clinical Vignette
                  </div>

                  <h3 style={{
                    fontSize: `${1.18 * fontScale}rem`,
                    lineHeight: 1.75,
                    fontWeight: 500,
                    color: 'var(--text-main)',
                    marginBottom: '1.5rem',
                    flex: 1
                  }}>
                    {q.question}
                  </h3>

                  {/* Study Note Box (if toggled open) */}
                  {isNoteOpen && (
                    <div className="animate-fade-in" style={{
                      marginTop: '1.25rem',
                      marginBottom: '1rem',
                      padding: '1.15rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--accent-amber)'
                    }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.45rem' }}>
                        <i className="fa-solid fa-sticky-note"></i> My Study Notes for Question #{globalIdx + 1}:
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Write memory hooks or clinical rules..."
                        value={currentNote}
                        onChange={(e) => handleSaveNote(q.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {/* Tutor Mode Explanation (shown in Left Column below question stem) */}
                  {isTutorMode && currentAnswer && (
                    <div className="animate-fade-in" style={{
                      marginTop: '1.5rem',
                      padding: '1.35rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(6, 182, 212, 0.08)',
                      borderLeft: '4px solid var(--accent-cyan)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <strong style={{ color: currentAnswer.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '0.98rem' }}>
                          {currentAnswer.isCorrect ? '✓ Correct Answer!' : '✗ Incorrect Choice'} &bull; Option {q.correct_answer.toUpperCase()}
                        </strong>
                        <span className="badge" style={{ fontSize: '0.72rem' }}>Tutor Explanation</span>
                      </div>
                      <p style={{ color: 'var(--text-main)', fontSize: `${0.92 * fontScale}rem`, lineHeight: 1.65 }}>
                        {q.explanation || 'Detailed high-yield clinical explanation and discussion for FCPS Part 1 candidates.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Options Consolidated into a Single Block */}
                <div className="options-block-panel">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.15rem',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <i className="fa-solid fa-list-check" style={{ marginRight: '0.4rem', color: 'var(--accent-cyan)' }}></i>
                      Answer Choices ({options.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subdued)' }}>
                      Click to select &bull; <i className="fa-solid fa-strikethrough"></i> strike
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {options.map((opt) => {
                      const isSelected = currentAnswer?.selected === opt.key;
                      const isStruck = !!currentEliminated[opt.key];
                      const isCorrectAnswer = opt.key.toUpperCase() === q.correct_answer.toUpperCase();

                      let cardBg = isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-card)';
                      let cardBorder = isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)';
                      let textColor = isSelected ? 'var(--accent-cyan)' : 'var(--text-main)';

                      if (isTutorMode && currentAnswer) {
                        if (isCorrectAnswer) {
                          cardBg = 'rgba(16, 185, 129, 0.2)';
                          cardBorder = 'var(--accent-emerald)';
                          textColor = 'var(--accent-emerald)';
                        } else if (isSelected && !currentAnswer.isCorrect) {
                          cardBg = 'rgba(244, 63, 94, 0.2)';
                          cardBorder = 'var(--accent-rose)';
                          textColor = 'var(--accent-rose)';
                        }
                      }

                      return (
                        <div
                          key={opt.key}
                          onClick={() => {
                            if (!isStruck) handleSelectOption(q, opt.key);
                          }}
                          style={{
                            padding: '1.05rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            background: cardBg,
                            border: `1.5px solid ${cardBorder}`,
                            color: textColor,
                            cursor: isStruck ? 'not-allowed' : 'pointer',
                            opacity: isStruck ? 0.35 : 1,
                            textDecoration: isStruck ? 'line-through' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.85rem',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
                              color: isSelected ? '#fff' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              flexShrink: 0
                            }}>
                              {isTutorMode && currentAnswer && isCorrectAnswer ? '✓' : (isTutorMode && isSelected && !currentAnswer.isCorrect ? '✗' : opt.key)}
                            </div>

                            <span style={{ fontSize: `${0.96 * fontScale}rem`, fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.5 }}>
                              {opt.text}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => toggleEliminate(e, q.id, opt.key)}
                            aria-label={isStruck ? "Restore option" : "Eliminate option"}
                            title={isStruck ? "Restore option" : "Eliminate / Strikethrough"}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isStruck ? 'var(--accent-rose)' : 'var(--text-subdued)',
                              cursor: 'pointer',
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className={`fa-solid ${isStruck ? 'fa-eye' : 'fa-strikethrough'}`}></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. BOTTOM QUESTION PAGINATION CONTROLS (Full Pagination) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <Pagination
          currentPage={page}
          totalPages={totalExamPages}
          onPageChange={handlePageChange}
          totalItems={quizList.length}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[1, 5, 10, 20]}
          itemLabel="MCQs in exam"
        />
      </div>

      {/* 6. Clean Bottom Action Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '1rem',
        background: 'rgba(21, 28, 44, 0.5)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <button
          className="btn-secondary"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{ opacity: page === 1 ? 0.5 : 1 }}
        >
          <i className="fa-solid fa-chevron-left"></i> {pageSize === 1 ? 'Previous Question' : 'Previous Page'}
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {page < totalExamPages ? (
            <button className="btn-primary" onClick={() => handlePageChange(page + 1)}>
              {pageSize === 1 ? `Next Question (#${page + 1})` : `Next Page (${page + 1}/${totalExamPages})`} <i className="fa-solid fa-chevron-right"></i>
            </button>
          ) : (
            <button className="btn-primary" style={{ background: 'var(--gradient-success)' }} onClick={() => setShowSubmitModal(true)}>
              Submit Examination <i className="fa-solid fa-check"></i>
            </button>
          )}
        </div>
      </div>

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
          background: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
            <i className="fa-solid fa-circle-question" style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}></i>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Submit Examination?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Final scoring is calculated from answered questions.
            </p>

            {markedCount > 0 && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid var(--accent-purple)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                textAlign: 'left'
              }}>
                <i className="fa-solid fa-bookmark" style={{ color: 'var(--accent-purple)' }}></i>
                <span>You have <strong>{markedCount}</strong> question(s) marked for review.</span>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginBottom: '2rem',
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Answered</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>{answeredCount}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Marked</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--accent-purple)' }}>{markedCount}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Skipped</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--text-subdued)' }}>{unansweredCount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShowSubmitModal(false)}>
                Return to Test
              </button>
              <button className="btn-primary" style={{ background: 'var(--gradient-success)' }} onClick={() => handleFinalSubmit(false)}>
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
