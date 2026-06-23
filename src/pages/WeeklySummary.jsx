import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const PERF_CONFIG = {
  above:    { label: 'Por encima del plan', color: '#c8ff3c', icon: '↑' },
  on_track: { label: 'En línea con el plan', color: '#c8ff3c', icon: '✓' },
  below:    { label: 'Por debajo del plan',  color: '#ff8c42', icon: '↓' },
}

export default function WeeklySummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { prevWeekSessions = [], prevWeekStart = '' } = location.state || {}

  const [status, setStatus] = useState('loading') // loading | done | error
  const [result, setResult] = useState(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    analyze()
  }, [])

  const analyze = async () => {
    setStatus('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      // Get next week sessions
      const nextWeekDate = new Date(prevWeekStart + 'T12:00:00')
      nextWeekDate.setDate(nextWeekDate.getDate() + 7)
      const nextWeekStart = toLocalDateStr(nextWeekDate)

      const { data: nextWeekSessions } = await supabase
        .from('plan_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', nextWeekStart)
        .order('day_of_week')

      const { data, error } = await supabase.functions.invoke('weekly-review', {
        body: { profile, prevWeekSessions, nextWeekSessions: nextWeekSessions || [], prevWeekStart },
      })

      if (error || data?.error) throw new Error(error?.message || data?.error)
      setResult({ ...data, nextWeekStart, nextWeekSessions: nextWeekSessions || [] })
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const applyAndContinue = async () => {
    if (!result?.adjustedSessions?.length) { markReviewed(); navigate('/'); return }
    setApplying(true)
    try {
      for (const adj of result.adjustedSessions) {
        if (!adj.id) continue
        await supabase.from('plan_sessions').update({
          session_type: adj.session_type,
          description: adj.description,
          target_distance: adj.target_distance || null,
          target_duration: adj.target_duration || null,
          target_pace: adj.target_pace || null,
        }).eq('id', adj.id)
      }
    } catch (err) {
      console.error(err)
    }
    markReviewed()
    navigate('/', { state: { refresh: Date.now() } })
  }

  const markReviewed = () => {
    localStorage.setItem('lastReviewedWeek', prevWeekStart)
  }

  const completedCount = prevWeekSessions.filter(s => s.status === 'completed').length
  const totalCount = prevWeekSessions.length
  const totalKm = prevWeekSessions
    .filter(s => s.status === 'completed')
    .reduce((a, s) => a + (s.actual_distance || s.target_distance || 0), 0)

  if (status === 'loading') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px' }}>
      <div style={{ width: '52px', height: '52px', border: '3px solid #1d2024', borderTopColor: '#c8ff3c', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0', marginBottom: '8px' }}>Analizando tu semana</div>
        <div style={{ fontSize: '13px', color: '#6b7075' }}>La IA está revisando tus entrenamientos…</div>
      </div>
    </div>
  )

  if (status === 'error') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
      <div style={{ fontSize: '40px' }}>⚠️</div>
      <div style={{ fontSize: '16px', color: '#f2f3f0' }}>No se pudo analizar la semana</div>
      <button onClick={() => { markReviewed(); navigate('/') }} style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '14px', padding: '14px 28px', color: '#cdd0d2', fontSize: '14px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
        Continuar sin análisis
      </button>
    </div>
  )

  const perf = PERF_CONFIG[result?.performance] || PERF_CONFIG.on_track

  return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '32px 24px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '10px' }}>RESUMEN SEMANAL</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0', marginBottom: '24px' }}>
        Semana completada
      </div>

      {/* Performance badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#131417', border: `1px solid ${perf.color}30`, borderRadius: '12px', padding: '10px 16px', marginBottom: '20px' }}>
        <span style={{ fontSize: '18px', color: perf.color }}>{perf.icon}</span>
        <span style={{ ...mono, fontSize: '12px', color: perf.color, letterSpacing: '0.08em' }}>{perf.label.toUpperCase()}</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Sesiones', value: `${completedCount}/${totalCount}` },
          { label: 'Km reales', value: totalKm.toFixed(1) },
          { label: 'Completado', value: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: '#f2f3f0', marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#6b7075' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#c8ff3c', marginBottom: '10px' }}>ANÁLISIS IA</div>
        <div style={{ fontSize: '15px', color: '#f2f3f0', lineHeight: 1.65 }}>{result?.summary}</div>
      </div>

      {/* Feedback */}
      {result?.feedback && (
        <div style={{ background: '#0f1012', border: '1px solid #1c1f23', borderRadius: '16px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '8px' }}>CONSEJO PARA LA PRÓXIMA SEMANA</div>
          <div style={{ fontSize: '14px', color: '#9a9ea2', lineHeight: 1.6 }}>{result.feedback}</div>
        </div>
      )}

      {/* Session list */}
      <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '10px' }}>ESTA SEMANA</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
        {prevWeekSessions.map(s => {
          const done = s.status === 'completed'
          return (
            <div key={s.id} style={{ background: '#131417', border: `1px solid ${done ? 'rgba(200,255,60,0.2)' : '#232629'}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: done ? '#f2f3f0' : '#5a5f64', fontWeight: 500 }}>{s.session_type}</div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', marginTop: '3px' }}>
                  {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][s.day_of_week]}
                  {done && s.actual_distance ? ` · ${s.actual_distance} km` : s.target_distance ? ` · ${s.target_distance} km` : ''}
                </div>
              </div>
              <span style={{ fontSize: '16px', color: done ? '#c8ff3c' : '#3a3e42' }}>{done ? '✓' : '✗'}</span>
            </div>
          )
        })}
      </div>

      <button onClick={applyAndContinue} disabled={applying} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: applying ? 'default' : 'pointer', opacity: applying ? 0.7 : 1 }}>
        {applying ? 'Ajustando plan…' : 'Ver plan de la próxima semana →'}
      </button>
    </div>
  )
}

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
