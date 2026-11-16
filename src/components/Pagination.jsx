import React, { useState } from 'react';

/**
 * Generate smart pagination numbers with ellipsis
 */
function getPaginationRange(current, total, delta = 2) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'items'
}) {
  const [jumpVal, setJumpVal] = useState('');

  if (totalPages <= 1 && !onPageSizeChange) return null;

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpVal, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpVal('');
    }
  };

  const pages = getPaginationRange(currentPage, totalPages);

  // Range info (e.g. 1-20 of 100 or single item #2 of 100)
  const startItem = totalItems !== undefined && pageSize 
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems) 
    : null;
  const endItem = totalItems !== undefined && pageSize 
    ? Math.min(currentPage * pageSize, totalItems) 
    : null;

  return (
    <div className="pagination-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      padding: '0.85rem 1.15rem',
      background: 'rgba(21, 28, 44, 0.45)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
      fontSize: '0.88rem',
      color: 'var(--text-muted)'
    }}>
      {/* Range and Items Per Page Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {startItem !== null && endItem !== null ? (
          startItem === endItem ? (
            <span>
              Showing <strong style={{ color: 'var(--accent-cyan)' }}>#{startItem}</strong> of{' '}
              <strong style={{ color: 'var(--text-main)' }}>{totalItems.toLocaleString()}</strong> {itemLabel}
            </span>
          ) : (
            <span>
              Showing <strong style={{ color: 'var(--text-main)' }}>{startItem}–{endItem}</strong> of{' '}
              <strong style={{ color: 'var(--text-main)' }}>{totalItems.toLocaleString()}</strong> {itemLabel}
            </span>
          )
        ) : (
          <span>
            Page <strong style={{ color: 'var(--text-main)' }}>{currentPage}</strong> of{' '}
            <strong style={{ color: 'var(--text-main)' }}>{totalPages}</strong>
          </span>
        )}

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label="Select items per page"
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt === 1 ? '1 per screen' : `${opt} per page`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          title="First page"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: currentPage === 1 ? 'var(--text-subdued)' : 'var(--text-main)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            fontSize: '0.82rem'
          }}
        >
          <i className="fa-solid fa-angles-left"></i>
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          title="Previous page"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: currentPage === 1 ? 'var(--text-subdued)' : 'var(--text-main)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            fontSize: '0.82rem'
          }}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        {/* Numbered Page Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-subdued)' }}>
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 0.45rem',
                borderRadius: 'var(--radius-sm)',
                border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: isCurrent ? 'var(--gradient-primary)' : 'var(--bg-card)',
                color: isCurrent ? '#ffffff' : 'var(--text-main)',
                fontWeight: isCurrent ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          title="Next page"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: currentPage === totalPages ? 'var(--text-subdued)' : 'var(--text-main)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
            fontSize: '0.82rem'
          }}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          title="Last page"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: currentPage === totalPages ? 'var(--text-subdued)' : 'var(--text-main)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
            fontSize: '0.82rem'
          }}
        >
          <i className="fa-solid fa-angles-right"></i>
        </button>

        {/* Jump to Page Quick Input */}
        {totalPages > 3 && (
          <form onSubmit={handleJumpSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
            <input
              type="number"
              min="1"
              max={totalPages}
              placeholder="#"
              title="Jump to page number"
              value={jumpVal}
              onChange={(e) => setJumpVal(e.target.value)}
              aria-label="Jump to page number"
              style={{
                width: '48px',
                height: '32px',
                padding: '0 0.35rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="btn-secondary"
              style={{
                padding: '0 0.55rem',
                height: '32px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

