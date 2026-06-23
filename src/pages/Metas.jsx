import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const inputStyle = { width: '100%', background: '#0f1012', border: '1px solid #232629', borderRadius: '12px', padding: '13px 14px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', color: '#f2f3f0', outline: 'none' }
const labelStyle = { ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '7px', display: 'block' }

const GOAL_OPTIONS = [
  { id: 'carrera', name: 'Preparar una competición' },
  { id: 'marca', name: 'Mejorar marca / ritmo' },
  { id: 'fitness', name: 'Salud y forma general' },
  { id: 'peso', name: 'Bajar peso / composición' },
]

function fmtDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  const mn = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(day)} ${mn[+m - 1]} ${y}`
}

export default function Metas() {
  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ goal_event: '', goal_date: '', running_goal: '' })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    setForm({
      goal_event: prof?.goal_event || '',
      goal_date: prof?.goal_date || '',
      running_goal: prof?.running_goal || '',
    })
    const { data: sess } = await supabase.from('plan_sessions').select('*').eq('user_id', user.id)
    setSessions(sess || [])
  }

  const save = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({
      goal_event: form.goal_event || null,
      goal_date: form.goal_date || null,
      running_goal: form.running_goal || null,
    }).eq('id', user.id)
    await load()
    setSaving(false)
    setEditing(false)
  }

  const clearGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ goal_event: null, goal_date: null, running_goal: null }).eq('id', user.id)
    setForm({ goal_event: '', goal_date: '', running_goal: '' })
    await load()
    setEditing(true)
  }

  const totalKm = sessions.filter(s => s.status === 'completed').reduce((a, s) => a + (s.target_distance || 0), 0)
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const totalSessions = sessions.length
  const daysLeft = form.goal_date ? Math.max(0, Math.round((new Date(form.goal_date) - new Date()) / 86400000)) : null
  const sport = profile?.sports?.[0] || 'running'
  const hasGoal = form.goal_event || form.goal_date || form.running_goal

  if (editing) return (
    <div style={{ padding: '18px 24px 32px', background: '#0a0b0d', minHeight: '100%' }}>
      <button onClick={() => setEditing(false)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#9a9ea2', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px', fontFamily: "'Space Grotesk', sans-serif" }}>
        <span style={{ fontSize: '19px', lineHeight: 1 }}>‹</span> Atrás
      </button>
      <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: '#f2f3f0' }}>
        {hasGoal ? 'Editar objetivo' : 'Nuevo objetivo'}
      </div>
      <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '26px' }}>Define hacia dónde entrenas.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>TIPO DE OBJETIVO</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {GOAL_OPTIONS.map(g => {
              const active = form.running_goal === g.id
              return (
                <div key={g.id} onClick={() => setForm(f => ({ ...f, running_goal: g.id }))}
                  style={{ background: active ? '#161a12' : '#131417', border: `1px solid ${active ? '#c8ff3c' : '#232629'}`, borderRadius: '12px', padding: '13px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', color: '#f2f3f0' }}>{g.name}</span>
                  {active && <span style={{ color: '#c8ff3c', fontSize: '16px' }}>✓</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <label style={labelStyle}>EVENTO / COMPETICIÓN (opcional)</label>
          <input style={inputStyle} placeholder="Ej. Media maratón de Madrid" value={form.goal_event} onChange={e => setForm(f => ({ ...f, goal_event: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>FECHA OBJETIVO (opcional)</label>
          <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.goal_date} onChange={e => setForm(f => ({ ...f, goal_date: e.target.value }))} />
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Guardando…' : 'Guardar objetivo'}
      </button>
    </div>
  )

  return (
    <div style={{ padding: '18px 24px 24px', background: '#0a0b0d', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0' }}>Objetivos</div>
        {hasGoal && (
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', ...mono, fontSize: '11px', color: '#c8ff3c', cursor: 'pointer', letterSpacing: '0.08em', padding: 0 }}>
            EDITAR
          </button>
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '22px' }}>Tus metas y lo que falta para lograrlas.</div>

      {hasGoal ? (
        <>
          {/* Main goal card */}
          <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <div style={{ ...mono, fontSize: '10px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>
                  {form.goal_event ? 'COMPETICIÓN' : 'META'} · {sport.toUpperCase()}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f2f3f0', lineHeight: 1.2 }}>
                  {form.goal_event || GOAL_OPTIONS.find(g => g.id === form.running_goal)?.name || 'Objetivo personal'}
                </div>
                {form.goal_date && (
                  <div style={{ ...mono, fontSize: '11px', color: '#6b7075', marginTop: '6px' }}>{fmtDate(form.goal_date)}</div>
                )}
              </div>
              {daysLeft !== null && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...mono, fontSize: '28px', fontWeight: 700, color: '#f2f3f0', lineHeight: 1 }}>{daysLeft}</div>
                  <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em' }}>DÍAS</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '13px', color: '#cdd0d2' }}>Sesiones completadas</span>
                  <span style={{ ...mono, fontSize: '12px', color: '#9a9ea2' }}>{completedSessions}/{totalSessions}</span>
                </div>
                <div style={{ height: '6px', background: '#1d2024', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: totalSessions ? `${(completedSessions / totalSessions) * 100}%` : '0%', height: '100%', background: '#c8ff3c', borderRadius: '3px', transition: 'width 0.4s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '13px', color: '#cdd0d2' }}>Kilómetros completados</span>
                  <span style={{ ...mono, fontSize: '12px', color: '#9a9ea2' }}>{totalKm.toFixed(1)} km</span>
                </div>
                <div style={{ height: '6px', background: '#1d2024', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: totalSessions ? `${Math.min(100, (completedSessions / totalSessions) * 100)}%` : '0%', height: '100%', background: '#c8ff3c', borderRadius: '3px', transition: 'width 0.4s' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: 'SEMANAS', value: Math.ceil(totalSessions / (profile?.training_days?.length || 3)) },
              { label: 'SESIONES', value: totalSessions },
              { label: 'KM PLAN', value: sessions.reduce((a, s) => a + (s.target_distance || 0), 0).toFixed(0) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '14px 12px' }}>
                <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
                <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: '#f2f3f0' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Clear / change goal */}
          <button onClick={clearGoal} style={{ width: '100%', background: 'transparent', border: '1px dashed #2a2e33', borderRadius: '14px', padding: '14px', fontSize: '13px', color: '#6b7075', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
            Cambiar objetivo
          </button>
        </>
      ) : (
        /* No goal state */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '48px', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#131417', border: '1px solid #232629', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎯</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>Sin objetivo definido</div>
          <div style={{ fontSize: '14px', color: '#8a8e92', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>Define una meta para dar dirección a tu entrenamiento.</div>
          <button onClick={() => setEditing(true)} style={{ marginTop: '8px', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '15px 32px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}>
            Añadir objetivo
          </button>
        </div>
      )}
    </div>
  )
}
