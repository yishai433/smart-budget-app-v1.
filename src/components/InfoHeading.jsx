import { useState } from 'react'

// Section title with a small "i" button that opens a short explanation below it.
export default function InfoHeading({ children, tip, style }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5,
        display: 'flex', alignItems: 'center', ...style,
      }}>
        {children}
        {tip && (
          <button
            type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`הסבר על ${typeof children === 'string' ? children : 'ההגדרה'}`}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--c-text3)', background: 'transparent',
              color: 'var(--c-text2)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', fontFamily: 'Georgia, serif',
              padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              marginInlineStart: 6, position: 'relative', cursor: 'pointer',
            }}
          >
            i
            <span style={{ position: 'absolute', inset: -11 }} />
          </button>
        )}
      </h3>
      {tip && open && (
        <div style={{
          margin: '0 0 10px', padding: '10px 14px', borderRadius: 14, background: 'var(--c-card)',
          border: '1px solid var(--c-border)', fontSize: 13, lineHeight: 1.5, color: 'var(--c-text)', textTransform: 'none', letterSpacing: 0,
        }}>
          {tip}
        </div>
      )}
    </>
  )
}
