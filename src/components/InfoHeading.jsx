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

// Switch row: label + "i" that opens a short explanation under the row + the switch itself.
export function InfoRow({ label, tip, sub, icon, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="toggle-wrap">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon}{label}
            {tip && <button
              type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`הסבר על ${label}`}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--c-text3)', background: 'transparent',
                color: 'var(--c-text2)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', fontFamily: 'Georgia, serif',
                padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                position: 'relative', cursor: 'pointer',
              }}
            >i<span style={{ position: 'absolute', inset: -11 }} /></button>}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{sub}</div>}
        </div>
        {children}
      </div>
      {open && (
        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 14, background: 'var(--c-bg)', fontSize: 13, lineHeight: 1.5 }}>
          {tip}
        </div>
      )}
    </div>
  )
}
