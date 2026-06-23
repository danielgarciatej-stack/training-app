import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [todaySession, setTodaySession] = useState(null)
  const [nextSession, setNextSession] = useState(null)
  const [weekSessions, setWeekSessions] = useState([])
  const [generatingPlan, setGeneratingPlan] = useState(!!location.state?.generating)
  const [planError, setPlanError] = useState('')

  const today = new Date()
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      // If coming from recalculate flow, use the already-updated profile directly
      const forceGenerate = !!location.state?.generating
      let prof
      if (forceGenerate && location.state?.updatedProfile) {
        prof = location.state.updatedProfile
        setProfile(prof)
        if (!cancelled) { generatePlan(user.id, prof); return }
      }

      const { data: fetched } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (cancelled) return
      prof = fetched
      if (prof) setProfile(prof)

      // Auto-generate if no plan exists yet
      if (prof?.plan_status !== 'active') {
        const { count: totalCount } = await supabase
          .from('plan_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (totalCount === 0 && !cancelled) {
          generatePlan(user.id, prof)
          return
        }
      }

      // Check if we need to show last week's summary
      const prevWeekDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const prevWeekStart = toLocalDateStr(getWeekStart(prevWeekDate))
      const lastReviewed = localStorage.getItem('lastReviewedWeek')
      if (lastReviewed !== prevWeekStart) {
        const { data: prevSessions } = await supabase
          .from('plan_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start', prevWeekStart)
          .order('day_of_week')
        if (prevSessions?.length > 0 && !cancelled) {
          navigate('/weekly-summary', { state: { prevWeekSessions: prevSessions, prevWeekStart } })
          return
        }
      }

      // Load this week's sessions
      const weekStart = toLocalDateStr(getWeekStart(today))
      const { data: sessions } = await supabase
        .from('plan_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .order('day_of_week')

      if (cancelled) return
      const todaySess = sessions?.find(s => s.day_of_week === todayDow) || null
      setTodaySession(todaySess)
      setWeekSessions(sessions || [])
      const upcoming = sessions?.find(s => s.day_of_week > todayDow && s.status === 'pending')
      setNextSession(upcoming || null)
    }
    load()
    return () => { cancelled = true }
  }, [location.state?.refresh])

  const generatePlan = async (userId, profileData) => {
    setGeneratingPlan(true)
    setPlanError('')
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('generate-plan', {
        body: { profile: { ...profileData, id: userId } },
      })
      if (fnError) throw fnError
      if (!fnData?.plan) throw new Error('Formato de plan incorrecto')

      const sessions = []
      for (const week of fnData.plan) {
        for (const session of week.sessions) {
          sessions.push({
            user_id: userId, week_start: week.week_start,
            day_of_week: session.day_of_week, sport: session.sport,
            session_type: session.session_type, description: session.description,
            target_distance: session.target_distance || null,
            target_duration: session.target_duration || null,
            target_pace: session.target_pace || null,
            status: 'pending',
          })
        }
      }
      if (sessions.length > 0) {
        await supabase.from('plan_sessions').delete().eq('user_id', userId)
        await supabase.from('plan_sessions').insert(sessions)
        await supabase.from('profiles').update({ plan_status: 'active' }).eq('id', userId)
        const weekStart = toLocalDateStr(getWeekStart(today))
        const weekSess = sessions.filter(s => s.week_start === weekStart)
        setWeekSessions(weekSess)
        setTodaySession(weekSess.find(s => s.day_of_week === todayDow) || null)
        const upcoming = weekSess.find(s => s.day_of_week > todayDow && s.status === 'pending')
        setNextSession(upcoming || null)
      }
    } catch (err) {
      setPlanError(err.message)
    } finally {
      setGeneratingPlan(false)
    }
  }

  const name = profile?.name?.split(' ')[0] || 'Atleta'
  const hour = today.getHours()
  const dayLabel = `${DAYS[today.getDay()].toUpperCase()} ${today.getDate()} ${today.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}`

  // Week strip: map 0=Mon...6=Sun
  const weekDays = [0, 1, 2, 3, 4, 5, 6]
  const completedCount = weekSessions.filter(s => s.status === 'completed').length
  const totalSessions = weekSessions.length

  return (
    <div style={{ padding: '14px 24px 24px', minHeight: '100%', background: '#0a0b0d' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingTop: '14px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f2f3f0' }}>
          Hola, {name}
        </div>
        <div style={{ ...mono, fontSize: '11px', color: '#6b7075', letterSpacing: '0.1em', marginTop: '3px' }}>
          {dayLabel} · {hour < 12 ? 'MAÑANA' : hour < 20 ? 'TARDE' : 'NOCHE'}
        </div>
      </div>

      {/* Generating overlay */}
      {generatingPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,11,13,0.92)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '52px', height: '52px', border: '3px solid #1d2024', borderTopColor: '#c8ff3c', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0', marginBottom: '8px' }}>Generando tu plan</div>
            <div style={{ fontSize: '13px', color: '#6b7075', animation: 'mtpulse 1.4s ease-in-out infinite' }}>La IA está personalizando tu entrenamiento…</div>
          </div>
        </div>
      )}

      {planError && (
        <div style={{ background: '#1a0a0a', border: '1px solid #5a1a1a', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '0 0 6px 0' }}>Error: {planError}</p>
          <button onClick={async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && profile) generatePlan(user.id, profile)
          }} style={{ ...mono, fontSize: '11px', color: '#c8ff3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            REINTENTAR
          </button>
        </div>
      )}

      {/* Week strip */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {weekDays.map(dow => {
          const sess = weekSessions.find(s => s.day_of_week === dow)
          const isToday = dow === todayDow
          const isDone = sess?.status === 'completed'
          const hasSess = !!sess
          const pillStyle = isDone
            ? { background: '#c8ff3c', color: '#0a0b0d', border: '1px solid #c8ff3c' }
            : isToday
            ? { background: '#131417', color: '#c8ff3c', border: '2px solid #c8ff3c' }
            : hasSess
            ? { background: '#131417', color: '#f2f3f0', border: '1px solid #232629' }
            : { background: 'transparent', color: '#5a5f64', border: '1px solid #16191c' }
          // 0=Mon, 1=Tue... → L M X J V S D
          const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
          const dateOffset = dow - todayDow
          const d = new Date(today); d.setDate(d.getDate() + dateOffset)
          return (
            <div key={dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
              <span style={{ ...mono, fontSize: '10px', color: isToday ? '#c8ff3c' : '#6b7075' }}>{labels[dow]}</span>
              <div style={{ width: '38px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '15px', fontWeight: 600, ...pillStyle }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Today session card */}
      {todaySession ? (
        <div style={{ background: '#131417', border: `1px solid ${todaySession.status === 'completed' ? 'rgba(200,255,60,0.3)' : '#232629'}`, borderRadius: '20px', padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: '20px', bottom: '20px', width: '3px', background: '#c8ff3c', borderRadius: '0 2px 2px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '9px' }}>
                {todaySession.status === 'completed' ? 'COMPLETADO' : 'HOY'} · {(todaySession.sport || 'RUNNING').toUpperCase()}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f2f3f0' }}>{todaySession.session_type}</div>
              <div style={{ fontSize: '13px', color: '#8a8e92', marginTop: '6px' }}>
                {todaySession.sport === 'running' ? 'Running' : 'Ciclismo'}
              </div>
            </div>
            {todaySession.status === 'completed'
              ? <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#0a0b0d', flexShrink: 0 }}>✓</div>
              : <div style={{ textAlign: 'center', background: '#0f1012', border: '1px solid #232629', borderRadius: '12px', padding: '9px 11px' }}>
                  <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: '#c8ff3c', lineHeight: 1 }}>{todaySession.target_duration || '—'}</div>
                  <div style={{ ...mono, fontSize: '8px', color: '#6b7075', letterSpacing: '0.12em', marginTop: '3px' }}>MIN</div>
                </div>
            }
          </div>
          <div style={{ display: 'flex', gap: '22px', marginBottom: '18px' }}>
            {(todaySession.actual_distance || todaySession.target_distance) && (
              <div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '5px' }}>DISTANCIA</div>
                <div style={{ ...mono, fontSize: '22px', fontWeight: 500, color: '#f2f3f0' }}>
                  {todaySession.actual_distance || todaySession.target_distance}<span style={{ fontSize: '12px', color: '#6b7075' }}> km</span>
                </div>
              </div>
            )}
            {(todaySession.actual_duration || todaySession.target_duration) && (
              <div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '5px' }}>DURACIÓN</div>
                <div style={{ ...mono, fontSize: '22px', fontWeight: 500, color: '#f2f3f0' }}>
                  {todaySession.actual_duration || todaySession.target_duration}<span style={{ fontSize: '12px', color: '#6b7075' }}> min</span>
                </div>
              </div>
            )}
            {(todaySession.actual_pace || todaySession.target_pace) && (
              <div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '5px' }}>RITMO</div>
                <div style={{ ...mono, fontSize: '22px', fontWeight: 500, color: '#c8ff3c' }}>
                  {todaySession.actual_pace || todaySession.target_pace}
                </div>
              </div>
            )}
          </div>
          {todaySession.status === 'completed' ? (
            <div style={{ background: '#161a12', border: '1px solid rgba(200,255,60,0.2)', borderRadius: '12px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#c8ff3c' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#dfeecb' }}>Sesión registrada correctamente</span>
            </div>
          ) : (
            <button onClick={() => navigate('/register', { state: { session: todaySession } })} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}>
              Registrar sesión
            </button>
          )}
        </div>
      ) : !generatingPlan && (
        <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '20px', padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', color: '#9a9ea2' }}>Sin entrenamiento hoy 😴</div>
          <div style={{ fontSize: '13px', color: '#6b7075', marginTop: '6px' }}>Día de descanso</div>
        </div>
      )}

      {/* Streak */}
      <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#c8ff3c' }} />
          <div>
            <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.12em', marginBottom: '3px' }}>RACHA</div>
            <div style={{ fontSize: '19px', fontWeight: 700, color: '#f2f3f0' }}>
              {completedCount} <span style={{ fontSize: '13px', color: '#9a9ea2', fontWeight: 500 }}>días esta semana</span>
            </div>
          </div>
        </div>
        <div style={{ ...mono, fontSize: '11px', color: '#6b7075' }}>{completedCount}/{totalSessions}</div>
      </div>

      {/* Week / progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px', marginBottom: '14px' }}>
        <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em' }}>SEMANA</span>
            <span style={{ ...mono, fontSize: '10px', color: '#9a9ea2' }}>{completedCount}/{totalSessions}</span>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '9px', color: '#f2f3f0' }}>
            {weekSessions.filter(s => s.status === 'completed').reduce((a, s) => a + (s.target_distance || 0), 0).toFixed(0)}
            <span style={{ fontSize: '11px', color: '#6b7075', fontWeight: 500 }}> / {weekSessions.reduce((a, s) => a + (s.target_distance || 0), 0).toFixed(0)} km</span>
          </div>
          <div style={{ height: '5px', background: '#1d2024', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#c8ff3c', borderRadius: '3px', width: totalSessions ? `${(completedCount / totalSessions) * 100}%` : '0%' }} />
          </div>
        </div>
        <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '15px' }}>
          <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '10px' }}>PRÓXIMA</div>
          {nextSession ? (
            <>
              <div style={{ ...mono, fontSize: '11px', color: '#c8ff3c', marginBottom: '5px' }}>
                {['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'][nextSession.day_of_week]}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f0', marginBottom: '3px' }}>{nextSession.session_type}</div>
              <div style={{ ...mono, fontSize: '11px', color: '#6b7075' }}>
                {nextSession.target_distance ? `${nextSession.target_distance} km` : ''}{nextSession.target_distance && nextSession.target_duration ? ' · ' : ''}{nextSession.target_duration ? `${nextSession.target_duration} min` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#6b7075' }}>Sin sesión próxima</div>
          )}
        </div>
      </div>

      {/* Next session description */}
      {nextSession?.description && (
        <div onClick={() => navigate('/plan')} style={{ background: '#131417', border: '1px solid #1c1f23', borderRadius: '16px', padding: '16px 18px', cursor: 'pointer' }}>
          <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.12em', marginBottom: '8px' }}>
            DESCRIPCIÓN · {['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'][nextSession.day_of_week]}
          </div>
          <div style={{ fontSize: '13px', color: '#9a9ea2', lineHeight: 1.6 }}>
            {nextSession.description}
          </div>
        </div>
      )}
    </div>
  )
}
