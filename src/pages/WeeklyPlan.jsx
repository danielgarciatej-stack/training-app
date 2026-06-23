import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEK_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function WeeklyPlan() {
  const [weeks, setWeeks] = useState([])
  const [weekIndex, setWeekIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [planEvent, setPlanEvent] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('goal_event, goal_date').eq('id', user.id).single()
      if (prof?.goal_event) setPlanEvent(prof.goal_event)
      const { data: sessions } = await supabase.from('plan_sessions').select('*').eq('user_id', user.id).order('week_start').order('day_of_week')
      if (!sessions?.length) { setLoading(false); return }
      const weekMap = {}
      for (const s of sessions) {
        if (!weekMap[s.week_start]) weekMap[s.week_start] = []
        weekMap[s.week_start].push(s)
      }
      const weekList = Object.keys(weekMap).sort().map(ws => ({ week_start: ws, sessions: weekMap[ws] }))
      setWeeks(weekList)
      const todayWS = toDateStr(getWeekStart(new Date()))
      const idx = weekList.findIndex(w => w.week_start === todayWS)
      const cur = idx >= 0 ? idx : 0
      setWeekIndex(cur)
      const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
      const todaySess = weekList[cur]?.sessions.find(s => s.day_of_week === todayDow)
      setSelected(todaySess || weekList[cur]?.sessions[0] || null)
      setLoading(false)
    }
    load()
  }, [])

  const currentWeek = weeks[weekIndex]
  const totalWeeks = weeks.length
  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todayWS = toDateStr(getWeekStart(new Date()))
  const isCurrentWeek = currentWeek?.week_start === todayWS

  const dayGrid = currentWeek
    ? Array.from({ length: 7 }, (_, i) => currentWeek.sessions.find(s => s.day_of_week === i) || { day_of_week: i, sport: null })
    : []

  const completedSessions = currentWeek?.sessions.filter(s => s.status === 'completed') || []
  const completed = completedSessions.length
  const totalSessions = currentWeek?.sessions.length || 0
  const doneKm = completedSessions.reduce((a, s) => a + (s.actual_distance || s.target_distance || 0), 0)
  const plannedKm = currentWeek?.sessions.reduce((a, s) => a + (s.target_distance || 0), 0) || 0
  const doneMin = completedSessions.reduce((a, s) => a + (s.actual_duration || s.target_duration || 0), 0)
  const plannedMin = currentWeek?.sessions.reduce((a, s) => a + (s.target_duration || 0), 0) || 0
  const hours = Math.floor(doneMin / 60)
  const mins = doneMin % 60
  const phours = Math.floor(plannedMin / 60)
  const pmins = plannedMin % 60

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', background: '#0a0b0d' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #c8ff3c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
    </div>
  )

  if (!weeks.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', padding: '24px', background: '#0a0b0d' }}>
      <p style={{ color: '#6b7075', textAlign: 'center', fontSize: '14px' }}>Tu plan se está generando. Vuelve al inicio y espera unos segundos.</p>
    </div>
  )

  return (
    <div style={{ background: '#0a0b0d', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#0a0b0d', borderBottom: '1px solid #1c1f23', padding: '18px 24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0' }}>Plan</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setWeekIndex(i => Math.max(0, i - 1))} disabled={weekIndex === 0} style={{ background: 'none', border: 'none', ...mono, fontSize: '16px', color: weekIndex === 0 ? '#2a2e33' : '#5a5f64', cursor: weekIndex === 0 ? 'default' : 'pointer', padding: '4px 8px' }}>‹</button>
            <span style={{ ...mono, fontSize: '11px', color: '#9a9ea2', letterSpacing: '0.05em' }}>
              {new Date(currentWeek?.week_start + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={() => setWeekIndex(i => Math.min(totalWeeks - 1, i + 1))} disabled={weekIndex === totalWeeks - 1} style={{ background: 'none', border: 'none', ...mono, fontSize: '16px', color: weekIndex === totalWeeks - 1 ? '#2a2e33' : '#5a5f64', cursor: weekIndex === totalWeeks - 1 ? 'default' : 'pointer', padding: '4px 8px' }}>›</button>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '16px' }}>
          Plan hacia <span style={{ color: '#c8ff3c' }}>{planEvent || `Semana ${weekIndex + 1} de ${totalWeeks}`}</span>
        </div>

        {/* Calendar grid header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '8px' }}>
          {WEEK_DAYS.map(d => <div key={d} style={{ textAlign: 'center', ...mono, fontSize: '10px', color: '#5a5f64' }}>{d}</div>)}
        </div>
        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' }}>
          {dayGrid.map((s, i) => {
            const isToday = isCurrentWeek && i === todayDow
            const isDone = s.status === 'completed'
            const hasSess = !!s.sport
            const isSelected = selected?.day_of_week === i && selected?.week_start === currentWeek?.week_start

            // Calculate the actual date for this cell
            const ws = new Date(currentWeek.week_start + 'T12:00:00')
            ws.setDate(ws.getDate() + i)
            const dayNum = ws.getDate()

            let cellStyle = { height: '42px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', ...mono, fontSize: '12px', fontWeight: 500, cursor: hasSess ? 'pointer' : 'default' }
            let dotStyle = { width: '4px', height: '4px', borderRadius: '50%' }
            if (isDone) {
              cellStyle = { ...cellStyle, background: 'rgba(200,255,60,0.13)', color: '#c8ff3c', border: '1px solid rgba(200,255,60,0.28)' }
              dotStyle = { ...dotStyle, background: '#c8ff3c' }
            } else if (isToday) {
              cellStyle = { ...cellStyle, background: '#131417', color: '#c8ff3c', border: '2px solid #c8ff3c' }
              dotStyle = { ...dotStyle, background: '#c8ff3c' }
            } else if (hasSess) {
              cellStyle = { ...cellStyle, background: '#131417', color: isSelected ? '#c8ff3c' : '#cdd0d2', border: isSelected ? '1px solid #c8ff3c' : '1px solid #232629' }
              dotStyle = { ...dotStyle, background: '#4a4e52' }
            } else {
              cellStyle = { ...cellStyle, background: 'transparent', color: '#4a4e52', border: '1px solid #16191c' }
              dotStyle = { ...dotStyle, background: 'transparent' }
            }
            return (
              <div key={i} onClick={() => hasSess && setSelected(s)} style={cellStyle}>
                <span>{dayNum}</span>
                <span style={dotStyle} />
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
          {[
            { style: { width: '10px', height: '10px', borderRadius: '3px', background: '#c8ff3c' }, label: 'Completado' },
            { style: { width: '10px', height: '10px', borderRadius: '3px', border: '2px solid #c8ff3c' }, label: 'Hoy' },
            { style: { width: '10px', height: '10px', borderRadius: '3px', border: '1px solid #2a2e33' }, label: 'Planificado' },
          ].map(({ style, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: '#8a8e92' }}>
              <span style={style} />{label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '18px 24px 24px' }}>
        {/* Week list label */}
        <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '12px' }}>ESTA SEMANA</div>

        {/* Session list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
          {currentWeek?.sessions.map(s => {
            const isDone = s.status === 'completed'
            const isToday = isCurrentWeek && s.day_of_week === todayDow
            const isSelected = selected?.id === s.id
            const dayBoxStyle = { width: '42px', height: '42px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '13px', fontWeight: 700, flexShrink: 0, background: isDone ? '#c8ff3c' : '#0f1012', color: isDone ? '#0a0b0d' : (isToday ? '#c8ff3c' : '#9a9ea2'), border: isToday ? '2px solid #c8ff3c' : '1px solid #232629' }
            const statusStyle = isDone
              ? { ...mono, fontSize: '11px', color: '#c8ff3c' }
              : isToday
              ? { ...mono, fontSize: '10px', color: '#0a0b0d', background: '#c8ff3c', borderRadius: '6px', padding: '4px 7px', fontWeight: 700 }
              : { ...mono, fontSize: '11px', color: '#5a5f64' }
            return (
              <div key={s.id} onClick={() => setSelected(s)} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: isSelected ? '#161a12' : '#131417', border: `1px solid ${isSelected ? '#c8ff3c' : '#232629'}`, borderRadius: '14px', padding: '13px 16px', cursor: 'pointer' }}>
                <div style={dayBoxStyle}>{WEEK_DAYS[s.day_of_week]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#f2f3f0' }}>{s.session_type}</div>
                  <div style={{ ...mono, fontSize: '11px', color: '#6b7075', marginTop: '3px' }}>
                    {s.target_distance ? `${s.target_distance} KM` : ''}{s.target_distance && s.target_duration ? ' · ' : ''}{s.target_duration ? `${s.target_duration} MIN` : ''}
                  </div>
                </div>
                <div style={statusStyle}>
                  {isDone ? '✓' : isToday ? 'HOY' : WEEK_NAMES[s.day_of_week]}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected session detail */}
        {selected && (
          <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.16em', color: '#c8ff3c', marginBottom: '8px' }}>
              {selected.status === 'completed' ? 'COMPLETADO' : 'PLANIFICADO'} · {WEEK_NAMES[selected.day_of_week]}
            </div>
            <div style={{ fontSize: '27px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: '#f2f3f0' }}>{selected.session_type}</div>
            <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '22px' }}>
              {selected.sport === 'running' ? 'Running' : 'Ciclismo'}
            </div>
            {(selected.target_distance || selected.target_duration) && (() => {
              const isDone = selected.status === 'completed'
              const toSecs = p => { if (!p) return 0; const [m, s] = p.split(':').map(Number); return m * 60 + (s || 0) }
              const metrics = [
                {
                  label: 'DISTANCIA',
                  planned: selected.target_distance ? `${selected.target_distance} km` : '—',
                  actual: selected.actual_distance ? `${selected.actual_distance} km` : null,
                  ok: selected.actual_distance != null ? selected.actual_distance >= selected.target_distance * 0.95 : null,
                },
                {
                  label: 'DURACIÓN',
                  planned: selected.target_duration ? `${selected.target_duration} min` : '—',
                  actual: selected.actual_duration ? `${selected.actual_duration} min` : null,
                  ok: selected.actual_duration != null ? selected.actual_duration >= selected.target_duration * 0.9 : null,
                },
                {
                  label: selected.sport === 'running' ? 'RITMO' : 'VELOCIDAD',
                  planned: selected.target_pace || '—',
                  actual: selected.actual_pace || null,
                  ok: selected.actual_pace && selected.target_pace ? toSecs(selected.actual_pace) <= toSecs(selected.target_pace) * 1.05 : null,
                  accent: true,
                },
              ]
              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {metrics.map(({ label, planned, actual, ok, accent }) => (
                    <div key={label} style={{ flex: 1, background: '#0f1012', border: `1px solid ${isDone && ok !== null ? (ok ? 'rgba(200,255,60,0.3)' : 'rgba(255,80,80,0.3)') : '#232629'}`, borderRadius: '14px', padding: '13px' }}>
                      <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{label}</span>
                        {isDone && ok !== null && <span style={{ color: ok ? '#c8ff3c' : '#ff5050' }}>{ok ? '✓' : '✗'}</span>}
                      </div>
                      {isDone && actual ? (
                        <>
                          <div style={{ ...mono, fontSize: '18px', color: ok ? '#c8ff3c' : '#ff5050', fontWeight: 600 }}>{actual}</div>
                          <div style={{ ...mono, fontSize: '10px', color: '#5a5f64', marginTop: '3px' }}>{planned}</div>
                        </>
                      ) : (
                        <div style={{ ...mono, fontSize: '18px', color: accent ? '#c8ff3c' : '#f2f3f0' }}>{planned}</div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
            {selected.description && (
              <div style={{ fontSize: '14px', color: '#8a8e92', lineHeight: 1.6, marginBottom: '20px' }}>{selected.description}</div>
            )}
            {selected.status === 'pending' && selected.sport && (
              <button onClick={() => navigate('/register', { state: { session: selected } })} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}>
                Registrar sesión
              </button>
            )}
            {selected.status === 'completed' && (
              <div style={{ background: '#161a12', border: '1px solid rgba(200,255,60,0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0b0d', fontWeight: 700, fontSize: '14px' }}>✓</div>
                <div style={{ fontSize: '14px', color: '#dfeecb' }}>Sesión completada</div>
              </div>
            )}
          </div>
        )}

        {/* Week summary */}
        <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '16px 18px' }}>
          <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '14px' }}>RESUMEN DE LA SEMANA</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'km completados', value: doneKm.toFixed(1), sub: `/ ${plannedKm.toFixed(0)} km` },
              { label: 'tiempo', value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, sub: `/ ${phours > 0 ? `${phours}h ${pmins}m` : `${pmins}m`}` },
              { label: 'sesiones', value: `${completed}/${totalSessions}` },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <p style={{ ...mono, fontSize: '20px', fontWeight: 700, color: '#f2f3f0', margin: 0 }}>{value} {sub && <span style={{ fontSize: '11px', color: '#6b7075', fontWeight: 400 }}>{sub}</span>}</p>
                <p style={{ fontSize: '12px', color: '#6b7075', margin: '3px 0 0' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
