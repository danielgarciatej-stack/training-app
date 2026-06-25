import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Tutorial from '../components/Tutorial'

const LEVEL_LABELS = { principiante: 'Principiante', inter: 'Intermedio', avanzado: 'Avanzado' }

const STRAVA_CLIENT_ID = '260486'
const STRAVA_REDIRECT = `${window.location.origin}/strava/callback`
const STRAVA_URL = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT)}&approval_prompt=force&scope=read,activity:read_all`

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const SPORTS = [
  { id: 'running', name: 'Running', desc: 'CARRERA A PIE' },
  { id: 'cycling', name: 'Ciclismo', desc: 'CARRETERA / MTB' },
  { id: 'triatlon', name: 'Triatlón', desc: 'NADO·BICI·CARRERA' },
  { id: 'trail', name: 'Trail', desc: 'MONTAÑA' },
  { id: 'natacion', name: 'Natación', desc: 'PISCINA' },
  { id: 'futbol', name: 'Fútbol', desc: 'EQUIPO' },
]
const LEVELS = [
  { id: 'principiante', name: 'Principiante', desc: 'Empiezo o vuelvo tras un parón' },
  { id: 'inter', name: 'Intermedio', desc: 'Entreno con regularidad' },
  { id: 'avanzado', name: 'Avanzado', desc: 'Compito / alto volumen' },
]
const GOALS = [
  { id: 'carrera', name: 'Preparar una competición' },
  { id: 'marca', name: 'Mejorar marca / ritmo' },
  { id: 'fitness', name: 'Salud y forma general' },
  { id: 'peso', name: 'Bajar peso / composición' },
]

function card(active) {
  return { background: active ? '#161a12' : '#131417', border: `1px solid ${active ? '#c8ff3c' : '#232629'}`, borderRadius: '14px', padding: '14px 16px', cursor: 'pointer' }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [screen, setScreen] = useState('profile') // 'profile' | 'edit' | 'saving'
  const [showTutorial, setShowTutorial] = useState(false) // unused, kept for safety
  const [edit, setEdit] = useState(null) // editable copy of profile fields
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [location.key])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const parseGoals = (val) => {
    if (!val) return []
    try { return JSON.parse(val) } catch { return val ? [val] : [] }
  }

  const openEdit = () => {
    setEdit({
      sports: profile?.sports || ['running'],
      level: profile?.level || 'inter',
      training_days: profile?.training_days || [0, 1, 2, 3],
      session_duration: profile?.session_duration || 60,
      running_goals: parseGoals(profile?.running_goal),
      goal_event: profile?.goal_event || '',
      goal_date: profile?.goal_date || '',
    })
    setScreen('edit')
  }

  const saveAndRecalculate = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: updateError } = await supabase.from('profiles').update({
      sports: edit.sports,
      level: edit.level,
      training_days: edit.training_days,
      session_duration: edit.session_duration,
      running_goal: edit.running_goals?.length ? JSON.stringify(edit.running_goals) : null,
      goal_event: edit.goal_event || null,
      goal_date: edit.goal_date || null,
      plan_status: 'none',
    }).eq('id', user.id)
    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      alert('Error al guardar el perfil: ' + updateError.message)
      setSaving(false)
      return
    }
    await supabase.from('plan_sessions').delete().eq('user_id', user.id)
    setSaving(false)
    const updatedProfile = { ...profile, ...edit, plan_status: 'none', id: user.id }
    navigate('/', { replace: true, state: { generating: true, refresh: Date.now(), updatedProfile } })
  }

  const toggleDay = (d) => {
    const days = edit.training_days.includes(d)
      ? edit.training_days.filter(x => x !== d)
      : [...edit.training_days, d].sort()
    setEdit(e => ({ ...e, training_days: days }))
  }

  const handleStravaSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.functions.invoke('strava-sync', { body: { userId: user.id } })
      if (error || data?.error) throw new Error(error?.message || data?.error)
      setSyncMsg(`${data.synced} sesión${data.synced !== 1 ? 'es' : ''} sincronizada${data.synced !== 1 ? 's' : ''}`)
    } catch (err) {
      setSyncMsg('Error al sincronizar')
    }
    setSyncing(false)
  }

  const sports = profile?.sports || ['running']
  const sportsLabel = sports.map(s => SPORTS.find(x => x.id === s)?.name || s).join(' · ')
  const sportIcon = sports.includes('running') ? '🏃' : '🚴'
  const name = profile?.name || 'Atleta'
  const days = profile?.training_days?.length || 0
  const duration = profile?.session_duration || 60

  // ---- EDIT SCREEN ----
  if (screen === 'edit' && edit) {
    const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    const DURATION_OPTS = [{ v: 30, l: "30'" }, { v: 45, l: "45'" }, { v: 60, l: "60'" }, { v: 90, l: "90'" }]
    return (
      <div style={{ padding: '18px 24px 32px', background: '#0a0b0d', minHeight: '100%', overflowY: 'auto' }}>
        <button onClick={() => setScreen('profile')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#9a9ea2', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px', fontFamily: "'Space Grotesk', sans-serif" }}>
          <span style={{ fontSize: '19px', lineHeight: 1 }}>‹</span> Cancelar
        </button>

        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0', marginBottom: '4px' }}>Revisar perfil</div>
        <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '26px' }}>Modifica lo que necesites antes de regenerar el plan.</div>

        {/* Deportes */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '10px' }}>DEPORTES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
          {SPORTS.map(s => {
            const on = edit.sports.includes(s.id)
            return (
              <div key={s.id} onClick={() => setEdit(e => ({ ...e, sports: on ? e.sports.filter(x => x !== s.id) : [...e.sports, s.id] }))}
                style={{ ...card(on), position: 'relative' }}>
                {on && <span style={{ position: 'absolute', top: '10px', right: '12px', color: '#c8ff3c', fontSize: '13px' }}>✓</span>}
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f2f3f0' }}>{s.name}</div>
                <div style={{ ...mono, fontSize: '9px', color: '#6b7075', marginTop: '3px' }}>{s.desc}</div>
              </div>
            )
          })}
        </div>

        {/* Nivel */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '10px' }}>NIVEL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
          {LEVELS.map(l => (
            <div key={l.id} onClick={() => setEdit(e => ({ ...e, level: l.id }))} style={{ ...card(edit.level === l.id), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f2f3f0' }}>{l.name}</div>
                <div style={{ fontSize: '12px', color: '#8a8e92', marginTop: '2px' }}>{l.desc}</div>
              </div>
              {edit.level === l.id && <span style={{ color: '#c8ff3c' }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Días */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '10px' }}>DÍAS DE ENTRENAMIENTO</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
          {DAY_LABELS.map((d, i) => {
            const on = edit.training_days.includes(i)
            return (
              <div key={i} onClick={() => toggleDay(i)} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: '10px', ...mono, fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: on ? '#c8ff3c' : '#131417', color: on ? '#0a0b0d' : '#cdd0d2', border: `1px solid ${on ? '#c8ff3c' : '#232629'}` }}>
                {d}
              </div>
            )
          })}
        </div>

        {/* Duración */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '10px' }}>MINUTOS POR SESIÓN</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
          {DURATION_OPTS.map(o => (
            <div key={o.v} onClick={() => setEdit(e => ({ ...e, session_duration: o.v }))} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: '10px', ...mono, fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: edit.session_duration === o.v ? '#c8ff3c' : '#131417', color: edit.session_duration === o.v ? '#0a0b0d' : '#cdd0d2', border: `1px solid ${edit.session_duration === o.v ? '#c8ff3c' : '#232629'}` }}>
              {o.l}
            </div>
          ))}
        </div>

        {/* Objetivo */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '10px' }}>OBJETIVOS (puedes seleccionar varios)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
          {GOALS.map(g => {
            const on = edit.running_goals?.includes(g.id)
            return (
              <div key={g.id} onClick={() => setEdit(e => ({ ...e, running_goals: on ? e.running_goals.filter(x => x !== g.id) : [...(e.running_goals || []), g.id] }))} style={{ ...card(on), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: '#f2f3f0' }}>{g.name}</span>
                {on && <span style={{ color: '#c8ff3c' }}>✓</span>}
              </div>
            )
          })}
        </div>

        {/* Evento */}
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '8px' }}>EVENTO / COMPETICIÓN (opcional)</div>
        <input value={edit.goal_event} onChange={e => setEdit(f => ({ ...f, goal_event: e.target.value }))} placeholder="Ej. Media maratón de Madrid" style={{ width: '100%', background: '#0f1012', border: '1px solid #232629', borderRadius: '12px', padding: '13px 14px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', color: '#f2f3f0', outline: 'none', marginBottom: '16px' }} />

        <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '8px' }}>FECHA OBJETIVO (opcional)</div>
        <input type="date" value={edit.goal_date} onChange={e => setEdit(f => ({ ...f, goal_date: e.target.value }))} style={{ width: '100%', background: '#0f1012', border: '1px solid #232629', borderRadius: '12px', padding: '13px 14px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', color: '#f2f3f0', outline: 'none', colorScheme: 'dark', marginBottom: '28px' }} />

        <button onClick={saveAndRecalculate} disabled={saving || edit.sports.length === 0} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer', opacity: (saving || edit.sports.length === 0) ? 0.6 : 1 }}>
          {saving ? 'Guardando…' : 'Guardar y regenerar plan'}
        </button>
      </div>
    )
  }

  // ---- MAIN PROFILE ----
  return (
    <div style={{ padding: '18px 24px 24px', background: '#0a0b0d', minHeight: '100%' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '22px', color: '#f2f3f0' }}>Perfil</div>

      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: '#1d2024', border: '1px solid #2a2e33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          {sportIcon}
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#f2f3f0' }}>{name}</div>
          <div style={{ ...mono, fontSize: '11px', color: '#6b7075', letterSpacing: '0.08em', marginTop: '4px' }}>
            {LEVEL_LABELS[profile?.level] || 'Principiante'} · {sportsLabel}
          </div>
        </div>
      </div>

      {/* Strava */}
      <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: profile?.strava_connected ? '#c8ff3c' : '#5a5f64', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '15px', color: '#f2f3f0' }}>Strava</div>
              {syncMsg && <div style={{ ...mono, fontSize: '10px', color: '#c8ff3c', marginTop: '2px' }}>{syncMsg}</div>}
            </div>
          </div>
          {profile?.strava_connected
            ? <button onClick={handleStravaSync} disabled={syncing} style={{ background: 'transparent', border: '1px solid #2a2e33', borderRadius: '10px', padding: '7px 13px', ...mono, fontSize: '11px', color: syncing ? '#6b7075' : '#c8ff3c', cursor: syncing ? 'default' : 'pointer', letterSpacing: '0.06em' }}>
                {syncing ? 'SINCRONIZANDO…' : 'SINCRONIZAR'}
              </button>
            : <button onClick={() => window.location.href = STRAVA_URL} style={{ background: '#fc4c02', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                Conectar
              </button>
          }
        </div>
      </div>

      {/* Settings */}
      <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', overflow: 'hidden', marginBottom: '22px' }}>
        <div style={{ padding: '16px', fontSize: '15px', color: '#cdd0d2', borderBottom: '1px solid #1c1f23', display: 'flex', justifyContent: 'space-between' }}>
          Disponibilidad <span style={{ color: '#6b7075' }}>{days} días · {duration} min</span>
        </div>
        <div style={{ padding: '16px', fontSize: '15px', color: '#cdd0d2', borderBottom: '1px solid #1c1f23', display: 'flex', justifyContent: 'space-between' }}>
          Deportes <span style={{ color: '#6b7075' }}>{sportsLabel}</span>
        </div>
        <div onClick={() => navigate('/fitness')} style={{ padding: '16px', fontSize: '15px', color: '#cdd0d2', borderBottom: '1px solid #1c1f23', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          Estado de forma <span style={{ color: '#c8ff3c' }}>›</span>
        </div>
        <div onClick={openEdit} style={{ padding: '16px', fontSize: '15px', color: '#cdd0d2', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          Recalcular plan con IA <span style={{ color: '#c8ff3c' }}>›</span>
        </div>
      </div>

      <button onClick={() => { localStorage.removeItem('tutorial_done'); navigate('/', { state: { showTutorial: true } }) }} style={{ width: '100%', background: 'transparent', border: '1px solid #232629', borderRadius: '14px', padding: '15px', fontSize: '14px', color: '#9a9ea2', cursor: 'pointer', marginBottom: '10px' }}>
        Ver tutorial
      </button>

      <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', background: 'transparent', border: '1px solid #232629', borderRadius: '14px', padding: '15px', fontSize: '14px', color: '#6b7075', cursor: 'pointer' }}>
        Cerrar sesión
      </button>
    </div>
  )
}
