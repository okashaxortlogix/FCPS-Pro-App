import React, { useState, useMemo } from 'react';
import Pagination from './Pagination';

export default function QBankExplorer({ questions, bookmarks, toggleBookmark, addToast }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set();
    questions.forEach(q => {
      const cat = q.category.split('-')[0].trim();
      set.add(cat);
    });
    return Array.from(set).sort();
  }, [questions]);

  // Filtered list
  const filtered = useMemo(() => {
    return questions.filter(q => {
      const matchBookmark = !showBookmarksOnly || !!bookmarks?.[q.id];
      const matchCat = selectedCategory === 'ALL' || q.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchQuery = !search.trim() || 
        q.question.toLowerCase().includes(search.toLowerCase()) || 
        (q.explanation && q.explanation.toLowerCase().includes(search.toLowerCase())) ||
        q.category.toLowerCase().includes(search.toLowerCase());
      return matchBookmark && matchCat && matchQuery;
    });
  }, [questions, selectedCategory, search, showBookmarksOnly, bookmarks]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Safe clipboard copying
  const copyExplanation = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        addToast('Explanation copied to clipboard', 'info');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        addToast('Explanation copied to clipboard', 'info');
      }
    } catch (err) {
      addToast('Unable to copy text to clipboard', 'error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      {/* Search & Filter Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div className="badge" style={{ marginBottom: '0.5rem' }}>
          <i className="fa-solid fa-book-medical"></i> Complete Catalog
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>QBank Catalog Explorer</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Search and browse through all {questions.length.toLocaleString()} FCPS & MBBS clinical questions, categories, and verified explanations.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              placeholder="Search by topic, symptom, diagnosis, or keyword (e.g. Posterior Triangle, Nerve, Stab wound)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Subjects ({categories.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Bookmark filter toggle */}
          <button
            className="btn-secondary"
            onClick={() => { setShowBookmarksOnly(!showBookmarksOnly); setPage(1); }}
            style={{
              background: showBookmarksOnly ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card)',
              color: showBookmarksOnly ? 'var(--accent-amber)' : 'var(--text-main)',
              borderColor: showBookmarksOnly ? 'var(--accent-amber)' : 'var(--border-subtle)'
            }}
          >
            <i className="fa-solid fa-bookmark"></i> {showBookmarksOnly ? 'Showing Bookmarks' : 'Saved Bookmarks'}
          </button>
        </div>
      </div>

      {/* Top Pagination Controls */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          itemLabel="questions"
        />
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {paginated.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2.2rem', marginBottom: '1rem', color: 'var(--text-subdued)' }}></i>
            <h3 style={{ marginBottom: '0.4rem' }}>No questions found</h3>
            <p>Try adjusting your search query or subject filters.</p>
          </div>
        ) : (
          paginated.map((q) => {
            const isExpanded = expandedId === q.id;
            const isBookmarked = !!bookmarks?.[q.id];

            return (
              <div key={q.id} className="glass-panel" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span className="badge">{q.category}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-subdued)', fontWeight: 600 }}>MCQ #{q.id}</span>
                    
                    <button
                      onClick={() => toggleBookmark(q.id)}
                      aria-label={isBookmarked ? "Remove bookmark" : "Save bookmark"}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-subdued)',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                      }}
                      title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
                    >
                      <i className={`fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark`}></i>
                    </button>
                  </div>
                </div>

                <h4 style={{ fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>{q.question}</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map(letter => {
                    const optText = q[`option_${letter.toLowerCase()}`];
                    if (!optText) return null;
                    const isCorrect = letter.toUpperCase() === q.correct_answer.toUpperCase();
                    return (
                      <div
                        key={letter}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isCorrect && isExpanded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                          border: isCorrect && isExpanded ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                          fontSize: '0.9rem',
                          color: isCorrect && isExpanded ? 'var(--accent-emerald)' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem'
                        }}
                      >
                        <strong style={{ opacity: 0.7 }}>{letter}.</strong> {optText}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-lightbulb'}`} style={{ color: 'var(--accent-cyan)' }}></i>
                    {isExpanded ? 'Hide Answer & Explanation' : 'Reveal Answer & Explanation'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="animate-fade-in" style={{
                    marginTop: '1.25rem',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(6, 182, 212, 0.08)',
                    borderLeft: '4px solid var(--accent-cyan)',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        Correct Answer: Option {q.correct_answer.toUpperCase()}
                      </div>
                      {q.explanation && (
                        <button
                          onClick={() => copyExplanation(q.explanation)}
                          aria-label="Copy explanation to clipboard"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                          title="Copy explanation"
                        >
                          <i className="fa-regular fa-copy"></i> Copy
                        </button>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {q.explanation || 'Detailed clinical vignette explanation.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          itemLabel="questions"
        />
      )}
    </div>
  );
}
