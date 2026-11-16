import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuizEngine from './components/QuizEngine';
import MistakesBank from './components/MistakesBank';
import QBankExplorer from './components/QBankExplorer';
import FlashcardsMode from './components/FlashcardsMode';
import CustomQuizModal from './components/CustomQuizModal';
import ExamHistoryModal from './components/ExamHistoryModal';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import ToastNotification from './components/ToastNotification';
import questionsData from './data/questions.json';
import { shuffleArray, generateUniqueId } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'practice' | 'flashcards' | 'qbank' | 'mistakes'
  const [theme, setTheme] = useState(() => localStorage.getItem('fcps_theme') || 'dark');
  const [quizState, setQuizState] = useState(null); // { id, list, config }

  // Custom Quiz Builder & Exam Review Modals
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedExamHistory, setSelectedExamHistory] = useState(null);

  // Authentication & Candidate Profile State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fcps_current_user') || sessionStorage.getItem('fcps_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Bookmarks for QBank Explorer
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('fcps_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Global Toasts State
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = generateUniqueId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Persistent User Progress Stats
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('fcps_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse saved stats', e);
    }
    return {
      attemptedCount: 0,
      correctCount: 0,
      mistakesCount: 0,
      mistakesList: []
    };
  });

  // Persistent Exam History
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('fcps_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse saved history', e);
    }
    return [];
  });

  // Theme Sync
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('fcps_theme', theme);
  }, [theme]);

  // Save Stats & History
  useEffect(() => {
    localStorage.setItem('fcps_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('fcps_history', JSON.stringify(history));
  }, [history]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (userObj, remember = true) => {
    setCurrentUser(userObj);
    if (remember) {
      localStorage.setItem('fcps_current_user', JSON.stringify(userObj));
    } else {
      sessionStorage.setItem('fcps_current_user', JSON.stringify(userObj));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fcps_current_user');
    sessionStorage.removeItem('fcps_current_user');
  };

  const toggleBookmark = (qId) => {
    setBookmarks(prev => {
      const next = { ...prev, [qId]: !prev[qId] };
      if (!next[qId]) delete next[qId];
      localStorage.setItem('fcps_bookmarks', JSON.stringify(next));
      addToast(next[qId] ? 'Question bookmarked' : 'Question removed from bookmarks', 'info');
      return next;
    });
  };

  // Launch Standard Quizzes
  const startQuiz = ({ mode, limit }) => {
    if (!currentUser) {
      addToast('Please sign in or create an account to start an examination session!', 'warning');
      setShowAuthModal(true);
      return;
    }

    let list = [...questionsData];
    let durationMinutes = null;
    let examTitle = 'Practice Session';

    if (mode === 'full_fcps') {
      list = shuffleArray(list).slice(0, 200);
      durationMinutes = 120; // Official FCPS standard: 200 questions in 120 minutes
      examTitle = 'Official FCPS 200-MCQ Examination';
      addToast('Launching Official FCPS 200-MCQ Exam (120 Minutes)', 'info');
    } else if (mode === 'mock') {
      const count = limit || 100;
      list = shuffleArray(list).slice(0, count);
      durationMinutes = Math.round(count * 0.8);
      examTitle = `${count}-MCQ Timed Practice Mock`;
      addToast(`Launching Timed Mock Exam (${list.length} MCQs — ${durationMinutes} Minutes)`, 'info');
    } else if (mode === 'mistakes') {
      if (!stats.mistakesList || stats.mistakesList.length === 0) {
        addToast('Your Mistakes Bank is clean! Solve exam questions to record incorrect items.', 'warning');
        return;
      }
      list = shuffleArray([...stats.mistakesList]);
      durationMinutes = null;
      examTitle = `Mistakes Bank Practice (${list.length} MCQs)`;
      addToast(`Practicing Mistakes Bank (${list.length} MCQs)`, 'info');
    } else {
      list = shuffleArray(list);
      durationMinutes = null;
      examTitle = 'Full Practice Session';
      addToast('Starting Full Practice Session', 'info');
    }

    const sessionId = Date.now();
    setQuizState({
      id: sessionId,
      list,
      config: {
        mode,
        title: examTitle,
        isMock: mode === 'mock' || mode === 'full_fcps',
        isTutor: false,
        durationMinutes
      }
    });
    setActiveTab('practice');
  };

  // Launch Custom Quiz / Tutor Builder
  const handleStartCustomQuiz = ({ testMode, pool, limit, durationMinutes, title }) => {
    if (!currentUser) {
      addToast('Please sign in or create an account to launch a custom exam session!', 'warning');
      setShowAuthModal(true);
      return;
    }

    const list = shuffleArray(pool).slice(0, limit);
    const sessionId = Date.now();

    setQuizState({
      id: sessionId,
      list,
      config: {
        mode: 'custom',
        testMode,
        isTutor: testMode === 'tutor',
        isMock: testMode === 'exam',
        title: title || `Custom ${testMode === 'tutor' ? 'Tutor' : 'Practice'} Session`,
        durationMinutes
      }
    });
    setActiveTab('practice');
    addToast(`Launched ${testMode === 'tutor' ? 'Tutor Mode' : 'Custom Practice'} (${list.length} MCQs)`, 'success');
  };

  // UX-01: Safe Tab Navigation with active exam confirmation
  const handleNavigateTab = (targetTab) => {
    if (activeTab === 'practice' && quizState && targetTab !== 'practice') {
      const confirmExit = window.confirm(
        'You have an active examination session in progress. Leaving now will discard your current exam. Are you sure you want to exit?'
      );
      if (!confirmExit) return;
      setQuizState(null);
    }

    if (targetTab === 'practice' && !quizState) {
      startQuiz({ mode: 'all' });
    } else {
      setActiveTab(targetTab);
    if (targetTab === 'practice') {
      if (!currentUser) {
        addToast('Please sign in or create an account to access Practice Exams!', 'warning');
        setShowAuthModal(true);
        return;
      }
      if (!quizState) {
        startQuiz({ mode: 'all' });
        return;
      }
    }
    setActiveTab(targetTab);
  };

  // Record Exam Result cleanly upon submit
  const recordExamResult = (examResultObj) => {
    if (!examResultObj) return;

    setHistory(prev => [examResultObj, ...prev]);

    setStats(prev => {
      const newAttempted = prev.attemptedCount + (examResultObj.attemptedCount || 0);
      const newCorrect = prev.correctCount + (examResultObj.correctCount || 0);

      let updatedMistakes = [...prev.mistakesList];

      if (examResultObj.details && Array.isArray(examResultObj.details)) {
        examResultObj.details.forEach(item => {
          if (!item.isCorrect) {
            if (!updatedMistakes.some(m => m.id === item.q.id)) {
              updatedMistakes.push(item.q);
            }
          } else {
            updatedMistakes = updatedMistakes.filter(m => m.id !== item.q.id);
          }
        });
      }

      return {
        attemptedCount: newAttempted,
        correctCount: newCorrect,
        mistakesCount: updatedMistakes.length,
        mistakesList: updatedMistakes
      };
    });
  };

  // Finish Quiz Handler
  const handleFinishQuiz = () => {
    setQuizState(null);
    setActiveTab('dashboard');
    addToast('Returned to Dashboard', 'info');
  };

  const removeSingleMistake = (qId) => {
    setStats(prev => {
      const filtered = prev.mistakesList.filter(m => m.id !== qId);
      return {
        ...prev,
        mistakesCount: filtered.length,
        mistakesList: filtered
      };
    });
    addToast('Question removed from Mistakes Bank', 'info');
  };

  // Clear ONLY mistakes
  const clearMistakesOnly = () => {
    setStats(prev => ({
      ...prev,
      mistakesCount: 0,
      mistakesList: []
    }));
    addToast('Mistakes Bank cleared successfully', 'info');
  };

  // Full Progress Reset
  const resetAllProgress = () => {
    setStats({
      attemptedCount: 0,
      correctCount: 0,
      mistakesCount: 0,
      mistakesList: []
    });
    setHistory([]);
    localStorage.removeItem('fcps_stats');
    localStorage.removeItem('fcps_history');
    addToast('All test statistics and exam history have been reset', 'info');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastNotification toasts={toasts} removeToast={removeToast} />

      {/* Candidate Auth & Profile Modals */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        addToast={addToast}
      />

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        stats={stats}
        history={history}
        onLogout={handleLogout}
        resetProgress={resetAllProgress}
        addToast={addToast}
      />

      {/* Custom Test Builder Modal */}
      <CustomQuizModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        questions={questionsData}
        mistakesList={stats.mistakesList}
        bookmarks={bookmarks}
        onStartCustomQuiz={handleStartCustomQuiz}
        addToast={addToast}
      />

      {/* Past Exam Attempt Review Modal */}
      <ExamHistoryModal
        isOpen={!!selectedExamHistory}
        onClose={() => setSelectedExamHistory(null)}
        examAttempt={selectedExamHistory}
      />

      <Navbar 
        activeTab={activeTab} 
        onNavigateTab={handleNavigateTab}
        stats={stats} 
        theme={theme} 
        toggleTheme={toggleTheme}
        user={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main style={{ flex: 1, maxWidth: '1300px', width: '100%', margin: '0 auto', padding: '0 1.5rem' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            questions={questionsData} 
            stats={stats} 
            history={history} 
            startQuiz={startQuiz} 
            onOpenCustomModal={() => setShowCustomModal(true)}
            user={currentUser}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenCustomModal={() => {
              if (!currentUser) {
                addToast('Please sign in or create an account to use the Custom Test Builder!', 'warning');
                setShowAuthModal(true);
              } else {
                setShowCustomModal(true);
              }
            }}
            onOpenFlashcards={() => setActiveTab('flashcards')}
            onSelectExamAttempt={(h) => setSelectedExamHistory(h)}
          />
        )}

        {activeTab === 'practice' && (
          <QuizEngine 
            key={quizState?.id || 'default_session'} 
            quizList={quizState?.list || questionsData} 
            onRecordResult={recordExamResult} 
            onFinish={handleFinishQuiz} 
            config={quizState?.config} 
            addToast={addToast} 
          />
          currentUser ? (
            <QuizEngine 
              key={quizState?.id || 'default_session'} 
              quizList={quizState?.list || questionsData} 
              onRecordResult={recordExamResult} 
              onFinish={handleFinishQuiz} 
              config={quizState?.config} 
              addToast={addToast} 
            />
          ) : (
            <div className="glass-panel text-center animate-fade-in" style={{ padding: '4rem 2rem', maxWidth: '640px', margin: '3rem auto' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
                <i className="fa-solid fa-lock"></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Authentication Required</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
                You must be signed in with your candidate account to take examination sessions, track analytics, and save your certified results.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setShowAuthModal(true)}>
                  <i className="fa-solid fa-right-to-bracket"></i> Sign In / Register
                </button>
                <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>
                  Return to Dashboard
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsMode
            questions={questionsData}
            mistakesList={stats.mistakesList}
            bookmarks={bookmarks}
            addToast={addToast}
          />
        )}

        {activeTab === 'qbank' && (
          <QBankExplorer
            questions={questionsData}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
            addToast={addToast}
          />
        )}

        {activeTab === 'mistakes' && (
          <MistakesBank 
            mistakesList={stats.mistakesList} 
            startMistakesQuiz={() => startQuiz({ mode: 'mistakes' })} 
            clearMistakes={clearMistakesOnly} 
            removeSingleMistake={removeSingleMistake} 
          />
        )}
      </main>

      <footer className="no-print" style={{
        textAlign: 'center',
        padding: '1.5rem',
        color: 'var(--text-subdued)',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '3rem',
        fontSize: '0.85rem'
      }}>
        FCPS Pro &bull; Medical Exam Platform &bull; {questionsData.length.toLocaleString()} Questions
      </footer>
    </div>
  );
}
