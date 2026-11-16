import React, { useState, useMemo, useEffect } from 'react';
import { shuffleArray } from '../utils/helpers';
import Pagination from './Pagination';

export default function FlashcardsMode({ questions, mistakesList = [], bookmarks = {}, addToast }) {
  const [source, setSource] = useState('mistakes'); // 'mistakes' | 'bookmarks' | 'all'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cards pool based on source
  const deck = useMemo(() => {
    let pool = questions;
    if (source === 'mistakes') {
      pool = mistakesList.length > 0 ? mistakesList : questions;
    } else if (source === 'bookmarks') {
      const bList = questions.filter(q => !!bookmarks[q.id]);
      pool = bList.length > 0 ? bList : questions;
    }
    return shuffleArray(pool);
  }, [questions, mistakesList, bookmarks, source]);

  const currentCard = deck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    stopSpeaking();
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(p => p + 1);
    } else {
      addToast('You have reached the end of this flashcard deck!', 'success');
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    stopSpeaking();
    setCurrentIndex(p => Math.max(0, p - 1));
  };

  const markMastered = () => {
    if (!currentCard) return;
    setMasteredIds(prev => new Set(prev).add(currentCard.id));
    addToast('Marked as Mastered! 🎉', 'success');
    handleNext();
  };

  const markNeedsReview = () => {
    addToast('Card retained in active review queue', 'info');
    handleNext();
  };

  // Text to speech narration
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      addToast('Speech synthesis not supported on this device', 'warning');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  if (!currentCard) {
    return (
      <div className="glass-panel text-center" style={{ padding: '4rem 2rem', margin: '2rem 0' }}>
        <h2>No flashcards available.</h2>
        <p style={{ color: 'var(--text-muted)' }}>Try changing the source deck.</p>
      </div>
    );
  }

  const isMastered = masteredIds.has(currentCard.id);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0', maxWidth: '840px', margin: '0 auto' }}>
      {/* Header and Source Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge" style={{ marginBottom: '0.4rem', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
            <i className="fa-solid fa-clone"></i> Spaced Repetition Flashcards
          </span>
          <h2 style={{ fontSize: '2rem' }}>High-Yield Clinical Pearls</h2>
        </div>

        {/* Deck Source Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>
          <button
            onClick={() => { setSource('mistakes'); setCurrentIndex(0); setIsFlipped(false); }}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: source === 'mistakes' ? 'var(--accent-rose)' : 'transparent',
              color: source === 'mistakes' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Mistakes ({mistakesList.length})
          </button>

          <button
            onClick={() => { setSource('bookmarks'); setCurrentIndex(0); setIsFlipped(false); }}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: source === 'bookmarks' ? 'var(--accent-amber)' : 'transparent',
              color: source === 'bookmarks' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Bookmarks ({Object.keys(bookmarks).length})
          </button>

          <button
            onClick={() => { setSource('all'); setCurrentIndex(0); setIsFlipped(false); }}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: source === 'all' ? 'var(--accent-cyan)' : 'transparent',
              color: source === 'all' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Bank ({questions.length})
          </button>
        </div>
      </div>

      {/* Progress & Deck Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Card <strong>{currentIndex + 1}</strong> of {deck.length}</span>
        <span>
          <i className="fa-solid fa-trophy" style={{ color: 'var(--accent-emerald)', marginRight: '0.35rem' }}></i>
          {masteredIds.size} Mastered ({Math.round((masteredIds.size / deck.length) * 100)}%)
        </span>
      </div>

      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((currentIndex + 1) / deck.length) * 100}%`,
          background: 'var(--gradient-primary)',
          transition: 'width 0.25s ease'
        }}></div>
      </div>

      {/* Top Flashcards Pagination Controls */}
      {deck.length > 1 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Pagination
            currentPage={currentIndex + 1}
            totalPages={deck.length}
            onPageChange={(p) => {
              setCurrentIndex(p - 1);
              setIsFlipped(false);
              stopSpeaking();
            }}
            totalItems={deck.length}
            pageSize={1}
            itemLabel="flashcards"
          />
        </div>
      )}

      {/* 3D Flashcard Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="glass-panel"
        style={{
          minHeight: '340px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          border: isFlipped ? '1.5px solid var(--accent-emerald)' : '1.5px solid var(--border-glow)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          marginBottom: '2rem',
          background: isFlipped 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)' 
            : 'var(--bg-card)'
        }}
      >
        {/* Top Badges & Audio Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span className="badge">{currentCard.category}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {isMastered && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}>
                ✓ Mastered
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                speakText(isFlipped ? currentCard.explanation : currentCard.question);
              }}
              aria-label="Listen to card audio"
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.82rem',
                background: isSpeaking ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: isSpeaking ? '#fff' : 'var(--text-main)'
              }}
              title="Read Aloud"
            >
              <i className={`fa-solid ${isSpeaking ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
              <span style={{ marginLeft: '0.35rem' }}>{isSpeaking ? 'Stop' : 'Listen'}</span>
            </button>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-subdued)' }}>
              {isFlipped ? 'Answer & Pearl' : 'Question Stem'}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem 0' }}>
          {!isFlipped ? (
            <div>
              <h3 style={{ fontSize: '1.35rem', lineHeight: 1.6, fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                {currentCard.question}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', opacity: 0.75 }}>
                {['A', 'B', 'C', 'D', 'E'].map(letter => {
                  const opt = currentCard[`option_${letter.toLowerCase()}`];
                  if (!opt) return null;
                  return (
                    <div key={letter} style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                      <strong>{letter}.</strong> {opt}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{
                display: 'inline-block',
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-emerald)',
                fontWeight: 700,
                fontSize: '1.1rem',
                marginBottom: '1.25rem',
                border: '1px solid var(--accent-emerald)'
              }}>
                Correct Answer: Option {currentCard.correct_answer.toUpperCase()} &bull; {currentCard[`option_${currentCard.correct_answer.toLowerCase()}`]}
              </div>

              <h4 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-lightbulb"></i> High-Yield Clinical Explanation:
              </h4>

              <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-main)' }}>
                {currentCard.explanation || 'Detailed clinical vignette review.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Hint */}
        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-subdued)', fontSize: '0.85rem' }}>
          <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '0.4rem' }}></i>
          Click card to flip ({isFlipped ? 'view question' : 'reveal answer & clinical pearl'})
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: deck.length > 1 ? '1.5rem' : 0 }}>
        <button
          className="btn-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          <i className="fa-solid fa-chevron-left"></i> Previous Card
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={markNeedsReview}
            className="btn-secondary"
            style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
          >
            <i className="fa-solid fa-rotate-left"></i> Needs Review
          </button>

          <button
            onClick={markMastered}
            className="btn-primary"
            style={{ background: 'var(--gradient-success)' }}
          >
            <i className="fa-solid fa-check"></i> Mastered
          </button>
        </div>

        <button className="btn-secondary" onClick={handleNext}>
          Next Card <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* Bottom Flashcards Pagination Controls */}
      {deck.length > 1 && (
        <Pagination
          currentPage={currentIndex + 1}
          totalPages={deck.length}
          onPageChange={(p) => {
            setCurrentIndex(p - 1);
            setIsFlipped(false);
            stopSpeaking();
          }}
          totalItems={deck.length}
          pageSize={1}
          itemLabel="flashcards"
        />
      )}
    </div>
  );
}

