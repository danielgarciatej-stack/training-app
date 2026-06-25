import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEK_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const SPORT_ICONS = {
  running: '🏃',
  trail: '🏔️',
  cycling: '🚴',
  natacion: '🏊',
  triatlon: '🏅',
  futbol: '⚽',
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

export default function WeeklyPlan() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [planEvent, setPlanEvent] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [swapMode, setSwapMode] = useState(false)
  const [swapSource, setSwapSource] = useState(null)
  const [swapping, setSwapping] = useState(false)

  const today = new Date()
  const todayStr = toDateStr(today)
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('goal_event, goal_date').eq('id', user.id).single(),
        supabase.from('plan_sessions').select('*').eq('user_id', user.id).order('week_start').order('day_of_week'),
      ])
      if (prof?.goal_event) setPlanEvent(prof.goal_event)
      setSessions(sess || [])
      // Auto-select today's session
      const todayWS = toDateStr(getWeekStart(today))
      const todaySess = sess?.find(s => s.week_start === todayWS && s.day_of_week === todayDow)
      if (todaySess) setSelected(todaySess)
      setLoading(false)
    }
    load()
  }, [])

  // Build sessionMap: 'YYYY-MM-DD' → session
  const sessionMap = {}
  for (const s of sessions) {
    const d = new Date(s.week_start + 'T12:00:00')
    d.setDate(d.getDate() + s.day_of_week)
    sessionMap[toDateStr(d)] = s
  }

  // Monthly calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDow = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, session: sessionMap[dateStr] || null })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
  }

  const cancelSwap = () => { setSwapMode(false); setSwapSource(null) }

  const performSwap = async (targetSession) => {
    if (!swapSource || targetSession.id === swapSource.id || swapping) return
    setSwapping(true)
    const srcDow = swapSource.day_of_week, srcWS = swapSource.week_start
    const tgtDow = targetSession.day_of_week, tgtWS = targetSession.week_start
    setSessions(prev => prev.map(s => {
      if (s.id === swapSource.id) return { ...s, day_of_week: tgtDow, week_start: tgtWS }
      if (s.id === targetSession.id) return { ...s, day_of_week: srcDow, week_start: srcWS }
      return s
    }))
    cancelSwap()
    setSelected(null)
    await Promise.all([
      supabase.from('plan_sessions').update({ day_of_week: tgtDow, week_start: tgtWS }).eq('id', swapSource.id),
      supabase.from('plan_sessions').update({ day_of_week: srcDow, week_start: srcWS }).eq('id', targetSession.id),
    ])
    setSwapping(false)
  }

  const handleCellClick = (session) => {
    if (!session) return
    if (swapMode) {
      if (session.status === 'completed') return
      if (!swapSource) {
        setSwapSource(session)
      } else if (swapSource.id === session.id) {
        setSwapSource(null)
      } else {
        performSwap(session)
      }
    } else {
      setSelected(prev => prev?.id === session.id ? null : session)
    }
  }

  // Month stats
  const monthSessions = sessions.filter(s => {
    const d = new Date(s.week_start + 'T12:00:00')
    d.setDate(d.getDate() + s.day_of_week)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const monthCompleted = monthSessions.filter(s => s.status === 'completed').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', background: '#0a0b0d' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #c8ff3c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
    </div>
  )

  if (!sessions.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', padding: '24px', background: '#0a0b0d' }}>
      <p style={{ color: '#6b7075', textAlign: 'center', fontSize: '14px' }}>Tu plan se está generando. Vuelve al inicio y espera unos segundos.</p>
    </div>
  )

  return (
    <div style={{ background: '#0a0b0d', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#0a0b0d', borderBottom: '1px solid #1c1f23', padding: '18px 24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0' }}>Plan</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', ...mono, fontSize: '18px', color: '#5a5f64', cursor: 'pointer', padding: '4px 10px' }}>‹</button>
            <span style={{ ...mono, fontSize: '11px', color: '#9a9ea2', letterSpacing: '0.05em', minWidth: '110px', textAlign: 'center' }}>
              {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', ...mono, fontSize: '18px', color: '#5a5f64', cursor: 'pointer', padding: '4px 10px' }}>›</button>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#6b7075', marginBottom: '16px' }}>
          {planEvent ? <>Plan hacia <span style={{ color: '#c8ff3c' }}>{planEvent}</span></> : <span style={{ color: '#5a5f64' }}>{monthCompleted} / {monthSessions.length} sesiones completadas</span>}
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '6px' }}>
          {DAY_LETTERS.map(d => <div key={d} style={{ textAlign: 'center', ...mono, fontSize: '10px', color: '#5a5f64', paddingBottom: '2px' }}>{d}</div>)}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} style={{ height: '52px' }} />
            const { day, dateStr, session } = cell
            const isToday = dateStr === todayStr
            const isDone = session?.status === 'completed'
            const isSelected = selected?.id === session?.id
            const isSwapSrc = swapSource?.id === session?.id
            const isSwapTarget = swapSource && session && session.status !== 'completed' && swapSource.id !== session.id

            let bg = 'transparent', border = '1px solid transparent', dayColor = '#4a4e52'
            if (session) {
              if (isDone) { bg = 'rgba(200,255,60,0.14)'; border = '1px solid rgba(200,255,60,0.35)'; dayColor = '#c8ff3c' }
              else if (isSwapSrc) { bg = '#1a2010'; border = '2px solid #c8ff3c'; dayColor = '#c8ff3c' }
              else if (isSwapTarget) { bg = '#131417'; border = '1px dashed rgba(200,255,60,0.45)'; dayColor = '#9a9ea2' }
              else if (isSelected) { bg = '#1d2024'; border = '1px solid #f2f3f0'; dayColor = '#f2f3f0' }
              else if (isToday) { bg = '#131417'; border = '2px solid #c8ff3c'; dayColor = '#c8ff3c' }
              else { bg = '#131417'; border = '1px solid #232629'; dayColor = '#cdd0d2' }
            } else if (isToday) {
              border = '1px solid rgba(200,255,60,0.3)'; dayColor = '#c8ff3c'
            }

            return (
              <div
                key={dateStr}
                onClick={() => handleCellClick(session)}
                style={{ height: '52px', borderRadius: '10px', background: bg, border, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: session ? 'pointer' : 'default', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <span style={{ ...mono, fontSize: '12px', fontWeight: isToday ? 700 : 500, color: dayColor }}>{day}</span>
                {session && <span style={{ fontSize: '13px', lineHeight: 1 }}>{SPORT_ICONS[session.sport] || '●'}</span>}
              </div>
            )
          })}
        </div>

        {/* Legend + swap button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { style: { width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(200,255,60,0.14)', border: '1px solid rgba(200,255,60,0.35)' }, label: 'Completado' },
              { style: { width: '10px', height: '10px', borderRadius: '3px', border: '2px solid #c8ff3c' }, label: 'Hoy' },
              { style: { width: '10px', height: '10px', borderRadius: '3px', border: '1px solid #2a2e33' }, label: 'Planificado' },
            ].map(({ style, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#8a8e92' }}>
                <span style={style} />{label}
              </div>
            ))}
          </div>
          <button
            onClick={() => swapMode ? cancelSwap() : setSwapMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: swapMode ? 'rgba(200,255,60,0.12)' : '#131417', border: `1px solid ${swapMode ? 'rgba(200,255,60,0.4)' : '#2a2e33'}`, borderRadius: '10px', padding: '7px 12px', color: swapMode ? '#c8ff3c' : '#9a9ea2', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}
          >
            <span>⇄</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px' }}>{swapMode ? 'Cancelar' : 'Cambiar'}</span>
          </button>
        </div>
      </div>

      {/* Content below calendar */}
      <div style={{ padding: '16px 24px 24px' }}>

        {/* Swap mode banner */}
        {swapMode && (
          <div style={{ background: 'rgba(200,255,60,0.08)', border: '1px solid rgba(200,255,60,0.28)', borderRadius: '12px', padding: '11px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', color: '#c8ff3c', marginBottom: '2px' }}>
              {!swapSource ? '1. Toca el día que quieres mover' : '2. Toca el día con el que intercambiar'}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7075' }}>
              {swapSource ? `Origen: ${WEEK_NAMES[swapSource.day_of_week]} — ${swapSource.session_type}` : 'Selecciona primero el origen'}
            </div>
          </div>
        )}

        {/* Selected session detail */}
        {selected ? (
          <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '20px', padding: '20px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.16em', color: '#c8ff3c', marginBottom: '8px' }}>
              {selected.status === 'completed' ? 'COMPLETADO' : 'PLANIFICADO'} · {WEEK_NAMES[selected.day_of_week]}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0' }}>{selected.session_type}</div>
                <div style={{ fontSize: '13px', color: '#8a8e92', marginTop: '3px' }}>
                  {SPORT_ICONS[selected.sport] || ''} {selected.sport || 'Running'}
                </div>
              </div>
              {!selected.status === 'completed' && !swapSource && (
                <button
                  onClick={() => setSwapSource(selected)}
                  style={{ background: 'none', border: '1px solid #2a2e33', borderRadius: '8px', color: '#6b7075', fontSize: '16px', padding: '6px 10px', cursor: 'pointer', flexShrink: 0 }}
                  title="Intercambiar"
                >⇄</button>
              )}
            </div>

            {(selected.target_distance || selected.target_duration || selected.target_pace) && (() => {
              const isDone = selected.status === 'completed'
              const toSecs = p => { if (!p) return 0; const [m, s] = p.split(':').map(Number); return m * 60 + (s || 0) }
              const metrics = [
                { label: 'DISTANCIA', planned: selected.target_distance ? `${selected.target_distance} km` : '—', actual: selected.actual_distance ? `${selected.actual_distance} km` : null, ok: selected.actual_distance != null ? selected.actual_distance >= selected.target_distance * 0.95 : null },
                { label: 'DURACIÓN', planned: selected.target_duration ? `${selected.target_duration} min` : '—', actual: selected.actual_duration ? `${selected.actual_duration} min` : null, ok: selected.actual_duration != null ? selected.actual_duration >= selected.target_duration * 0.9 : null },
                { label: selected.sport === 'running' ? 'RITMO' : 'VELOCIDAD', planned: selected.target_pace || '—', actual: selected.actual_pace || null, ok: selected.actual_pace && selected.target_pace ? toSecs(selected.actual_pace) <= toSecs(selected.target_pace) * 1.05 : null, accent: true },
              ]
              return (
                <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
                  {metrics.map(({ label, planned, actual, ok, accent }) => (
                    <div key={label} style={{ flex: 1, background: '#0f1012', border: `1px solid ${isDone && ok !== null ? (ok ? 'rgba(200,255,60,0.3)' : 'rgba(255,80,80,0.3)') : '#232629'}`, borderRadius: '12px', padding: '11px' }}>
                      <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{label}</span>
                        {isDone && ok !== null && <span style={{ color: ok ? '#c8ff3c' : '#ff5050' }}>{ok ? '✓' : '✗'}</span>}
                      </div>
                      {isDone && actual
                        ? <><div style={{ ...mono, fontSize: '16px', color: ok ? '#c8ff3c' : '#ff5050', fontWeight: 600 }}>{actual}</div><div style={{ ...mono, fontSize: '10px', color: '#5a5f64', marginTop: '2px' }}>{planned}</div></>
                        : <div style={{ ...mono, fontSize: '16px', color: accent ? '#c8ff3c' : '#f2f3f0' }}>{planned}</div>}
                    </div>
                  ))}
                </div>
              )
            })()}

            {selected.description && (
              <div style={{ fontSize: '13px', color: '#8a8e92', lineHeight: 1.6, marginBottom: '16px' }}>{selected.description}</div>
            )}

            {selected.status === 'pending' && (() => {
              const sessDate = new Date(selected.week_start + 'T12:00:00')
              sessDate.setDate(sessDate.getDate() + selected.day_of_week)
              const isPastOrToday = sessDate <= today
              return isPastOrToday ? (
                <button onClick={() => navigate('/register', { state: { session: selected } })} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '15px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}>
                  Registrar sesión
                </button>
              ) : null
            })()}

            {selected.status === 'completed' && (
              <div style={{ background: '#161a12', border: '1px solid rgba(200,255,60,0.3)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0b0d', fontWeight: 700, fontSize: '13px' }}>✓</div>
                <div style={{ fontSize: '13px', color: '#dfeecb' }}>Sesión completada</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#5a5f64', fontSize: '13px' }}>
            Toca una sesión del calendario para ver los detalles
          </div>
        )}
      </div>
    </div>
  )
}
