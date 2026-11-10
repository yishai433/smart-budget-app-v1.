import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { monthLabel } from '../../utils/months'

// Month navigator: previous / next arrows around the month name.
// Tapping the name (when viewing a past month) jumps back to the current month.
// Arrow directions follow the document direction (RTL: right = previous).
export default function MonthSwitcher({ eyebrow, style }) {
  const { monthKey, isCurrentMonth, shiftMonth, goToCurrentMonth, settings } = useApp()
  const lang = settings.language || 'he'
  const isRTL = lang === 'he'

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft
  const NextIcon = isRTL ? ChevronLeft : ChevronRight

  const arrowStyle = (disabled) => ({
    width: 36, height: 36, borderRadius: 999, border: 'none', padding: 0,
    background: 'var(--c-card)', color: 'var(--c-text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    transition: 'opacity .15s',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
      <button
        type="button"
        style={arrowStyle(false)}
        onClick={() => shiftMonth(-1)}
        aria-label={lang === 'he' ? 'חודש קודם' : 'Previous month'}
      >
        <PrevIcon size={18} strokeWidth={2.2} />
      </button>

      <button
        type="button"
        onClick={goToCurrentMonth}
        disabled={isCurrentMonth}
        aria-label={lang === 'he' ? 'חזרה לחודש הנוכחי' : 'Back to current month'}
        style={{
          background: 'none', border: 'none', padding: '2px 10px',
          textAlign: 'center', cursor: isCurrentMonth ? 'default' : 'pointer',
          color: 'var(--c-text)',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>
          {eyebrow ? `${eyebrow} · ` : ''}{monthLabel(monthKey, lang)}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-primary)', height: 14, marginTop: 1 }}>
          {isCurrentMonth
            ? (lang === 'he' ? 'החודש הנוכחי' : 'Current month')
            : (lang === 'he' ? 'חזרה להיום' : 'Back to today')}
        </div>
      </button>

      <button
        type="button"
        style={arrowStyle(isCurrentMonth)}
        onClick={() => shiftMonth(1)}
        disabled={isCurrentMonth}
        aria-label={lang === 'he' ? 'חודש הבא' : 'Next month'}
      >
        <NextIcon size={18} strokeWidth={2.2} />
      </button>
    </div>
  )
}
