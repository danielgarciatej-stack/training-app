import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const inputStyle = { width: '100%', background: '#0f1012', border: '1px solid #232629', borderRadius: '12px', padding: '13px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', color: '#f2f3f0', outline: 'none', textAlign: 'center' }
const labelStyle = { ...mono, fontSize: '10px', letterSpacing: '0.12em', color: '#6b7075', marginBottom: '7px', display: 'block' }

const STRAVA_CLIENT_ID = '260486'

export default function ActivityLog() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = location.state?.session || null

  const [mode, setMode] = useState(null) // null | 'strava' | 'manual'
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null) // { synced, activity }
  const [form, setForm] = useState({ distance: '', duration: '', pace: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaActual, setStravaActual] = useState(null) // actual data from strava sync

  useEffect(() => {
    const checkStrava = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('strava_connected').eq('id', user.id).single()
      setStravaConnected(!!data?.strava_connected)
    }
    checkStrava()

    if (session) {
      setForm({
        distance: session.target_distance?.toString() || '',
        duration: session.target_duration?.toString() || '',
        pace: session.target_pace || '',
      })
    }
  }, [])

  const syncStrava = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.functions.invoke('strava-sync', { body: { userId: user.id } })
      if (error || data?.error) throw new Error(error?.message || data?.error)
      setSyncResult(data)
      if (data.synced > 0 && session) {
        // Fetch updated session to get actual values from Strava
        const { data: updated } = await supabase.from('plan_sessions').select('*').eq('id', session.id).single()
        if (updated) setStravaActual({ distance: updated.actual_distance, duration: updated.actual_duration, pace: updated.actual_pace })
        setTimeout(() => { setDone(true) }, 1200)
      }
    } catch (err) {
      setSyncResult({ error: err.message })
    }
    setSyncing(false)
  }

  const saveManual = async () => {
    if (!session) return
    setSaving(true)
    try {
      await supabase.from('plan_sessions').update({
        status: 'completed',
        actual_distance: form.distance ? parseFloat(form.distance) : null,
        actual_duration: form.duration ? parseInt(form.duration) : null,
        actual_pace: form.pace || null,
        completed_at: new Date().toISOString(),
      }).eq('id', session.id)
      setDone(true)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const getComparison = () => {
    if (!session) return []
    const actual = stravaActual || {
      distance: form.distance ? parseFloat(form.distance) : null,
      duration: form.duration ? parseInt(form.duration) : null,
      pace: form.pace || null,
    }
    const items = []
    if (session.target_distance && actual.distance !== null) {
      const ok = actual.distance >= session.target_distance * 0.95
      items.push({ label: 'Distancia', planned: `${session.target_distance} km`, actual: `${actual.distance} km`, ok })
    }
    if (session.target_duration && actual.duration !== null) {
      const ok = actual.duration >= session.target_duration * 0.9
      items.push({ label: 'Duración', planned: `${session.target_duration} min`, actual: `${actual.duration} min`, ok })
    }
    if (session.target_pace && actual.pace) {
      const toSecs = p => { const [m, s] = p.split(':').map(Number); return m * 60 + (s || 0) }
      const ok = toSecs(actual.pace) <= toSecs(session.target_pace) * 1.05
      items.push({ label: 'Ritmo', planned: `${session.target_pace}/km`, actual: `${actual.pace}/km`, ok })
    }
    return items
  }

  const connectStrava = () => {
    const redirect = `${window.location.origin}/strava/callback`
    const url = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&approval_prompt=force&scope=read,activity:read_all`
    window.location.href = url
  }

  if (done) {
    const comparison = getComparison()
    return (
      <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#0a0b0d' }}>✓</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f2f3f0' }}>¡Sesión completada!</div>
          <div style={{ fontSize: '13px', color: '#8a8e92' }}>{session?.session_type}</div>
        </div>

        {comparison.length > 0 && (
          <>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '12px' }}>COMPARATIVA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {comparison.map(({ label, planned, actual, ok }) => (
                <div key={label} style={{ background: '#131417', border: `1px solid ${ok ? 'rgba(200,255,60,0.25)' : 'rgba(255,80,80,0.25)'}`, borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', color: '#6b7075' }}>{label.toUpperCase()}</span>
                    <span style={{ fontSize: '14px', color: ok ? '#c8ff3c' : '#ff5050' }}>{ok ? '✓' : '✗'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7075', marginBottom: '2px' }}>Planificado</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', color: '#9a9ea2' }}>{planned}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: ok ? '#c8ff3c' : '#ff5050', marginBottom: '2px' }}>Real</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', color: ok ? '#c8ff3c' : '#ff5050', fontWeight: 600 }}>{actual}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={() => navigate('/', { replace: true, state: { refresh: Date.now() } })} style={{ marginTop: 'auto', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '24px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#9a9ea2', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '22px', fontFamily: "'Space Grotesk', sans-serif" }}>
        <span style={{ fontSize: '19px', lineHeight: 1 }}>‹</span> Atrás
      </button>

      <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f3f0', marginBottom: '4px' }}>Registrar sesión</div>
      <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '22px' }}>¿Cómo fue el entrenamiento?</div>

      {/* Session summary */}
      {session && (
        <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '16px', padding: '16px 18px', marginBottom: '22px' }}>
          <div style={{ ...mono, fontSize: '10px', color: '#c8ff3c', letterSpacing: '0.14em', marginBottom: '6px' }}>
            SESIÓN PLANIFICADA
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0', marginBottom: '8px' }}>{session.session_type}</div>
          <div style={{ display: 'flex', gap: '18px' }}>
            {session.target_distance && <div style={{ ...mono, fontSize: '13px', color: '#9a9ea2' }}>{session.target_distance} km</div>}
            {session.target_duration && <div style={{ ...mono, fontSize: '13px', color: '#9a9ea2' }}>{session.target_duration} min</div>}
            {session.target_pace && <div style={{ ...mono, fontSize: '13px', color: '#c8ff3c' }}>{session.target_pace}/km</div>}
          </div>
        </div>
      )}

      {/* Mode selector */}
      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Strava option */}
          <button onClick={() => stravaConnected ? setMode('strava') : connectStrava()}
            style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fc4c02', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#f2f3f0', marginBottom: '3px' }}>
                {stravaConnected ? 'Importar desde Strava' : 'Conectar con Strava'}
              </div>
              <div style={{ fontSize: '13px', color: '#8a8e92' }}>
                {stravaConnected ? 'Sincroniza tu actividad automáticamente' : 'Conecta tu cuenta para importar actividades'}
              </div>
            </div>
            <span style={{ fontSize: '18px', color: '#5a5f64' }}>›</span>
          </button>

          {/* Manual option */}
          <button onClick={() => setMode('manual')}
            style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#1d2024', border: '1px solid #2a2e33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>
              ✏️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#f2f3f0', marginBottom: '3px' }}>Registrar manualmente</div>
              <div style={{ fontSize: '13px', color: '#8a8e92' }}>Introduce tú mismo los datos del entrenamiento</div>
            </div>
            <span style={{ fontSize: '18px', color: '#5a5f64' }}>›</span>
          </button>
        </div>
      )}

      {/* Strava sync screen */}
      {mode === 'strava' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => { setMode(null); setSyncResult(null) }} style={{ ...mono, fontSize: '11px', color: '#6b7075', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px', textAlign: 'left' }}>← CAMBIAR MÉTODO</button>

          {!syncResult && !syncing && (
            <>
              <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', color: '#cdd0d2', lineHeight: 1.6 }}>
                  La app buscará en tus actividades recientes de Strava una carrera de hoy que coincida con esta sesión y la marcará como completada con tus datos reales.
                </div>
              </div>
              <button onClick={syncStrava} style={{ width: '100%', background: '#fc4c02', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#fff', cursor: 'pointer', marginTop: 'auto' }}>
                Sincronizar con Strava
              </button>
            </>
          )}

          {syncing && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ width: 36, height: 36, border: '2px solid #fc4c02', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
              <div style={{ ...mono, fontSize: '13px', color: '#8a8e92' }}>BUSCANDO EN STRAVA…</div>
            </div>
          )}

          {syncResult && !syncing && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
              {syncResult.synced > 0 ? (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#0a0b0d', fontWeight: 700 }}>✓</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>Actividad encontrada</div>
                  <div style={{ fontSize: '14px', color: '#8a8e92' }}>{syncResult.synced} sesión sincronizada desde Strava</div>
                </>
              ) : (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1d2024', border: '1px solid #2a2e33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔍</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>No se encontró actividad</div>
                  <div style={{ fontSize: '14px', color: '#8a8e92', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>
                    No hay ninguna carrera en Strava de hoy que coincida con esta sesión.
                  </div>
                  <button onClick={() => setMode('manual')} style={{ marginTop: '8px', background: '#131417', border: '1px solid #2a2e33', borderRadius: '14px', padding: '14px 28px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', color: '#f2f3f0', cursor: 'pointer' }}>
                    Registrar manualmente
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual entry screen */}
      {mode === 'manual' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => setMode(null)} style={{ ...mono, fontSize: '11px', color: '#6b7075', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px', textAlign: 'left' }}>← CAMBIAR MÉTODO</button>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>DISTANCIA (KM)</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="5.0" value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>DURACIÓN (MIN)</label>
              <input style={inputStyle} type="number" placeholder="35" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>RITMO MEDIO (MIN/KM)</label>
            <input style={inputStyle} placeholder="7:00" value={form.pace} onChange={e => setForm(f => ({ ...f, pace: e.target.value }))} />
          </div>

          <button onClick={saveManual} disabled={saving || (!form.distance && !form.duration)} style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '17px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer', opacity: saving ? 0.6 : 1, marginTop: 'auto' }}>
            {saving ? 'Guardando…' : 'Guardar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
