import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import InstallBanner from '../components/InstallBanner'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const inputStyle = { width: '100%', background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '15px 16px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', color: '#f2f3f0', outline: 'none', '--placeholder-color': '#3a3e42' }
const labelStyle = { ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '8px', display: 'block' }
const btnPrimary = { width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '18px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }
const backStyle = { display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#9a9ea2', fontSize: '14px', marginBottom: '18px', background: 'none', border: 'none', padding: 0, fontFamily: "'Space Grotesk', sans-serif" }

const STRAVA_CLIENT_ID = '260486'
const STRAVA_REDIRECT = `${window.location.origin}/strava/callback`
const STRAVA_URL = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT)}&approval_prompt=force&scope=read,profile:read_all,activity:read_all`

const SPORTS = [
  { id: 'running', name: 'Running', desc: 'CARRERA A PIE' },
  { id: 'cycling', name: 'Ciclismo', desc: 'CARRETERA / MTB' },
  { id: 'triatlon', name: 'Triatlón', desc: 'NADO·BICI·CARRERA' },
  { id: 'natacion', name: 'Natación', desc: 'PISCINA' },
]
const LEVELS = [
  { id: 'principiante', name: 'Principiante', desc: 'Empiezo o vuelvo tras un parón', tag: '01' },
  { id: 'inter', name: 'Intermedio', desc: 'Entreno con regularidad', tag: '02' },
  { id: 'avanzado', name: 'Avanzado', desc: 'Compito / alto volumen', tag: '03' },
]
const GOALS = [
  { id: 'carrera', name: 'Preparar una competición' },
  { id: 'marca', name: 'Mejorar marca / ritmo' },
  { id: 'fitness', name: 'Salud y forma general' },
  { id: 'peso', name: 'Bajar peso / composición' },
]
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const FLOW = ['welcome', 'sport', 'level', 'avail', 'goals', 'goaldate', 'data', 'summary']

const initialForm = {
  name: '', email: '', password: '', pwVisible: false,
  sports: ['running'], level: 'inter',
  training_days: [1, 3, 5], time: 60,
  goals: ['carrera'],
  eventName: '', eventDate: '',
  stravaConnected: false, stravaStats: null,
  weight: '', age: '', hrMax: '', weekKm: '',
  t5k: '', t10k: '', t21k: '',
}

function card(active) {
  return { background: active ? '#161a12' : '#131417', border: `1px solid ${active ? '#c8ff3c' : '#232629'}`, borderRadius: '16px', padding: '18px', cursor: 'pointer' }
}
function chip(active) {
  return { flex: 1, textAlign: 'center', padding: '14px 0', borderRadius: '12px', ...mono, fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? '#c8ff3c' : '#232629'}`, background: active ? '#c8ff3c' : '#131417', color: active ? '#0a0b0d' : '#cdd0d2' }
}

export default function Onboarding() {
  const [screen, setScreen] = useState('welcome')
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editing, setEditing] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Returning from Strava OAuth during onboarding
    const params = new URLSearchParams(location.search)
    const stravaDone = params.get('strava') === 'done'
    const savedForm = localStorage.getItem('onboarding_form')
    if (stravaDone && savedForm) {
      const restored = JSON.parse(savedForm)
      localStorage.removeItem('onboarding_form')
      // Load strava data from the already-created profile
      loadStravaProfile(restored)
    }
  }, [])

  const loadStravaProfile = async (restoredForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile) {
      const updatedForm = {
        // Restore only structural fields (not manual data fields)
        ...initialForm,
        name: restoredForm.name,
        email: restoredForm.email,
        password: restoredForm.password,
        sports: restoredForm.sports,
        level: restoredForm.level,
        training_days: restoredForm.training_days,
        time: restoredForm.time,
        goals: restoredForm.goals,
        eventName: restoredForm.eventName,
        eventDate: restoredForm.eventDate,
        // Data fields: only from Strava profile, never from old localStorage
        stravaConnected: true,
        stravaStats: profile.strava_stats,
        weight: profile.weight?.toString() || '',
        age: profile.age?.toString() || '',
        hrMax: profile.hr_max?.toString() || '',
        weekKm: profile.running_weekly_km?.toString() || '',
      }
      setForm(updatedForm)
    }
    setScreen('data')
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setFieldErrors(e => ({ ...e, [k]: '' })) }

  const toggleDay = (d) => {
    const days = form.training_days.includes(d)
      ? form.training_days.filter(x => x !== d)
      : [...form.training_days, d].sort()
    set('training_days', days)
  }

  const validate = () => {
    if (screen === 'welcome') {
      const errs = {}
      if (!form.name.trim()) errs.name = 'Escribe tu nombre'
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Correo no válido'
      if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres'
      setFieldErrors(errs)
      return Object.keys(errs).length === 0
    }
    // Note: account is created async in advance() for welcome screen
    return true
    if (screen === 'sport') {
      if (form.sports.length === 0) { setFieldErrors({ sports: 'Elige al menos un deporte' }); return false }
    }
    if (screen === 'avail') {
      if (form.training_days.length === 0) { setFieldErrors({ days: 'Elige al menos un día' }); return false }
    }
    if (screen === 'goals') {
      if (form.goals.length === 0) { setFieldErrors({ goals: 'Elige al menos un objetivo' }); return false }
    }
    return true
  }

  const advance = async () => {
    if (!validate()) return
    if (screen === 'welcome') {
      setSaving(true)
      setError('')
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name } },
        })
        if (signUpError) throw signUpError
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            name: form.name,
            sports: form.sports,
            level: form.level,
            training_days: form.training_days,
            session_duration: form.time,
            plan_status: 'none',
          })
        }
      } catch (err) {
        setError(err.message)
        setSaving(false)
        return
      }
      setSaving(false)
    }
    if (editing) { setScreen('summary'); setEditing(false); return }
    const i = FLOW.indexOf(screen)
    setScreen(FLOW[Math.min(FLOW.length - 1, i + 1)])
  }
  const back = () => {
    if (editing) { setScreen('summary'); setEditing(false); return }
    const i = FLOW.indexOf(screen)
    setScreen(FLOW[Math.max(0, i - 1)])
  }
  const editStep = (s) => { setScreen(s); setEditing(true) }

  const connectStrava = async () => {
    setSaving(true)
    setError('')
    try {
      // Update profile with latest form data before redirecting
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')
      await supabase.from('profiles').update({
        sports: form.sports,
        level: form.level,
        training_days: form.training_days,
        session_duration: form.time,
        running_goal: form.goals.join(', '),
        goal_event: form.eventName || null,
        goal_date: form.eventDate || null,
      }).eq('id', user.id)
      // Save form state to restore after OAuth
      localStorage.setItem('onboarding_form', JSON.stringify(form))
      localStorage.setItem('strava_from_onboarding', 'true')
      window.location.href = STRAVA_URL
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const finish = async () => {
    setSaving(true)
    setError('')
    try {
      // Account was created at step 1 — just update with all final data
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')
      const { error: profileError } = await supabase.from('profiles').update({
        sports: form.sports,
        level: form.level,
        training_days: form.training_days,
        session_duration: form.time,
        running_goal: form.goals.join(', '),
        goal_event: form.eventName || null,
        goal_date: form.eventDate || null,
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        running_weekly_km: form.weekKm ? parseFloat(form.weekKm) : null,
        plan_status: 'none',
      }).eq('id', user.id)
      if (profileError) throw profileError
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const fmtDate = (d) => {
    if (!d) return 'Sin fecha · plan abierto'
    const [y, m, day] = d.split('-')
    const mn = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${day} ${mn[+m - 1]} ${y}`
  }

  const stepNum = { sport: '01', level: '02', avail: '03', goals: '04', goaldate: '05', data: '06' }[screen]
  const nextLabel = editing ? 'Guardar y volver' : 'Continuar'

  // ---- WELCOME ----
  if (screen === 'welcome') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '66px 32px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <InstallBanner />
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.2em', color: '#6b7075' }}>CREAR CUENTA</div>
      <div style={{ marginTop: '28px', marginBottom: '30px' }}>
        <div style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#f2f3f0' }}>
          My<span style={{ color: '#c8ff3c' }}>Train</span>
        </div>
        <div style={{ fontSize: '16px', color: '#9a9ea2', marginTop: '12px', lineHeight: 1.5, maxWidth: '290px' }}>
          Tu entrenador con IA. Crea tu cuenta para guardar tu plan y progreso.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={labelStyle}>ALIAS</div>
          <input style={{ ...inputStyle, border: `1px solid ${fieldErrors.name ? '#ff6b6b' : '#232629'}` }} placeholder="¿Cómo te llamas?" value={form.name} onChange={e => set('name', e.target.value)} />
          {fieldErrors.name && <p style={{ color: '#ff6b6b', fontSize: '12px', margin: '6px 0 0 4px' }}>{fieldErrors.name}</p>}
        </div>
        <div>
          <div style={labelStyle}>CORREO</div>
          <input style={{ ...inputStyle, border: `1px solid ${fieldErrors.email ? '#ff6b6b' : '#232629'}` }} type="email" placeholder="tu@correo.com" value={form.email} onChange={e => set('email', e.target.value)} />
          {fieldErrors.email && <p style={{ color: '#ff6b6b', fontSize: '12px', margin: '6px 0 0 4px' }}>{fieldErrors.email}</p>}
        </div>
        <div>
          <div style={labelStyle}>CONTRASEÑA</div>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: '52px', border: `1px solid ${fieldErrors.password ? '#ff6b6b' : '#232629'}` }} type={form.pwVisible ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
            <span onClick={() => set('pwVisible', !form.pwVisible)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', ...mono, fontSize: '11px', color: '#c8ff3c', cursor: 'pointer', letterSpacing: '0.06em' }}>
              {form.pwVisible ? 'OCULTAR' : 'VER'}
            </span>
          </div>
          {fieldErrors.password && <p style={{ color: '#ff6b6b', fontSize: '12px', margin: '6px 0 0 4px' }}>{fieldErrors.password}</p>}
        </div>
      </div>
      {error && <p style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center', margin: '12px 0 0' }}>{error}</p>}
      <button onClick={advance} disabled={saving} style={{ ...btnPrimary, marginTop: '18px', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#5a5f64', marginTop: '14px', lineHeight: 1.45 }}>
        <span style={{ color: '#c8ff3c' }}>🔒</span> Tus datos están protegidos.
      </div>
      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: '#5a5f64' }}>
        ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#9a9ea2', textDecoration: 'none' }}>Inicia sesión</Link>
      </div>
    </div>
  )

  // ---- SPORT ----
  if (screen === 'sport') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>01 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>¿Qué entrenas?</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '24px' }}>Puedes elegir varios deportes.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {SPORTS.map(s => {
          const on = form.sports.includes(s.id)
          return (
            <div key={s.id} onClick={() => set('sports', on ? form.sports.filter(x => x !== s.id) : [...form.sports, s.id])}
              style={{ ...card(on), padding: '16px', position: 'relative' }}>
              {on && <span style={{ position: 'absolute', top: '10px', right: '12px', color: '#c8ff3c', fontSize: '14px', fontWeight: 700 }}>✓</span>}
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#f2f3f0' }}>{s.name}</div>
              <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.06em', marginTop: '5px' }}>{s.desc}</div>
            </div>
          )
        })}
      </div>
      {fieldErrors.sports && <p style={{ color: '#ff6b6b', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{fieldErrors.sports}</p>}
      <button onClick={advance} style={{ ...btnPrimary, marginTop: 'auto' }}>Continuar</button>
    </div>
  )

  // ---- LEVEL ----
  if (screen === 'level') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>02 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>¿Cuál es tu nivel?</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '24px' }}>Lo ajustaremos con tus datos reales.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {LEVELS.map(l => (
          <div key={l.id} onClick={() => { set('level', l.id); advance() }} style={{ ...card(form.level === l.id), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>{l.name}</div>
              <div style={{ fontSize: '13px', color: '#8a8e92', marginTop: '4px' }}>{l.desc}</div>
            </div>
            <div style={{ ...mono, fontSize: '20px', color: '#3a3e42' }}>{l.tag}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ---- AVAIL ----
  if (screen === 'avail') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>03 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>¿Cuándo puedes entrenar?</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '30px' }}>Selecciona los días disponibles.</div>

      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '12px' }}>DÍAS DE ENTRENAMIENTO</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {DAY_LABELS.map((label, i) => {
          const on = form.training_days.includes(i)
          return (
            <div key={i} onClick={() => toggleDay(i)} style={{ flex: 1, textAlign: 'center', padding: '14px 0', borderRadius: '12px', ...mono, fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? '#c8ff3c' : '#232629'}`, background: on ? '#c8ff3c' : '#131417', color: on ? '#0a0b0d' : '#cdd0d2' }}>
              {label}
            </div>
          )
        })}
      </div>
      <div style={{ ...mono, fontSize: '10px', color: '#6b7075', marginBottom: '28px' }}>
        {form.training_days.length} día{form.training_days.length !== 1 ? 's' : ''} seleccionado{form.training_days.length !== 1 ? 's' : ''}
      </div>
      {fieldErrors.days && <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '10px' }}>{fieldErrors.days}</p>}

      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '12px' }}>MINUTOS POR SESIÓN</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '30px' }}>
        {[{ v: 30, l: "30'" }, { v: 45, l: "45'" }, { v: 60, l: "60'" }, { v: 90, l: "90'" }].map(o => (
          <div key={o.v} onClick={() => set('time', o.v)} style={chip(form.time === o.v)}>{o.l}</div>
        ))}
      </div>
      <button onClick={advance} style={{ ...btnPrimary, marginTop: 'auto' }}>{nextLabel}</button>
    </div>
  )

  // ---- GOALS ----
  if (screen === 'goals') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>04 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>¿Qué quieres conseguir?</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '24px' }}>Puedes elegir varios.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '24px' }}>
        {GOALS.map(g => {
          const on = form.goals.includes(g.id)
          return (
            <div key={g.id} onClick={() => set('goals', on ? form.goals.filter(x => x !== g.id) : [...form.goals, g.id])}
              style={{ ...card(on), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#f2f3f0' }}>{g.name}</div>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#0a0b0d', background: on ? '#c8ff3c' : 'transparent', border: `1px solid ${on ? '#c8ff3c' : '#2a2e33'}` }}>
                {on ? '✓' : ''}
              </div>
            </div>
          )
        })}
      </div>
      {fieldErrors.goals && <p style={{ color: '#ff6b6b', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{fieldErrors.goals}</p>}
      <button onClick={advance} style={{ ...btnPrimary, marginTop: 'auto' }}>{nextLabel}</button>
    </div>
  )

  // ---- GOAL DATE ----
  if (screen === 'goaldate') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>05 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>¿Tienes una fecha?</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '26px', lineHeight: 1.5 }}>Si preparas una competición, planificamos toda la carga hacia ese día.</div>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '10px' }}>EVENTO / COMPETICIÓN</div>
      <input value={form.eventName} onChange={e => set('eventName', e.target.value)} placeholder="Ej. Media maratón de Madrid…" style={{ ...inputStyle, marginBottom: '20px' }} />
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '10px' }}>FECHA OBJETIVO</div>
      <input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark', marginBottom: '18px' }} />
      <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '15px 16px', display: 'flex', gap: '11px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#c8ff3c', marginTop: '6px', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#9a9ea2', lineHeight: 1.5 }}>La IA periodiza el plan: base, fase específica y puesta a punto antes de tu fecha.</div>
      </div>
      <button onClick={advance} style={{ ...btnPrimary, marginTop: 'auto' }}>{nextLabel}</button>
      <button onClick={() => { set('eventName', ''); set('eventDate', ''); advance() }} style={{ marginTop: '10px', width: '100%', background: 'transparent', border: 'none', padding: '6px', fontSize: '13px', color: '#6b7075', cursor: 'pointer' }}>
        No tengo fecha · plan abierto
      </button>
    </div>
  )

  // ---- DATA ----
  if (screen === 'data') return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#c8ff3c', marginBottom: '8px' }}>06 / 06</div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>Tus datos</div>
      <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '22px', lineHeight: 1.5 }}>Conecta Strava para importar tu historial y personalizar el plan al máximo.</div>

      {/* Strava button */}
      {form.stravaConnected ? (
        <div style={{ background: '#161a12', border: '1px solid rgba(200,255,60,0.3)', borderRadius: '14px', padding: '16px', marginBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ color: '#c8ff3c', fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#c8ff3c' }}>Strava conectado</span>
          </div>
          {form.stravaStats && (() => {
            const s = form.stravaStats
            const hasRunData = s.running_weekly_km || s.avg_easy_pace || s.longest_run_km || s.ytd_run_km
            const hasCycleData = s.cycling_weekly_km || s.ytd_ride_km
            const hasAnyData = hasRunData || hasCycleData || s.avg_heart_rate || s.total_runs_8w

            if (!hasAnyData) return (
              <div style={{ background: '#0f1012', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '13px', color: '#6b7075' }}>Sin actividades recientes en Strava. Puedes rellenar los datos a mano abajo.</div>
              </div>
            )

            const items = [
              s.weight             && { label: 'PESO',                 value: `${s.weight} kg` },
              s.age                && { label: 'EDAD',                 value: `${s.age} años` },
              s.running_weekly_km  && { label: 'KM/SEM RUNNING',      value: `${s.running_weekly_km} km` },
              s.cycling_weekly_km  && { label: 'KM/SEM CICLISMO',     value: `${s.cycling_weekly_km} km` },
              s.avg_easy_pace      && { label: 'RITMO MEDIO',          value: `${s.avg_easy_pace}/km` },
              s.longest_run_km     && { label: 'CARRERA MÁS LARGA',   value: `${s.longest_run_km} km` },
              s.longest_ride_km    && { label: 'RUTA MÁS LARGA',      value: `${s.longest_ride_km} km` },
              s.avg_heart_rate     && { label: 'FC MEDIA',             value: `${s.avg_heart_rate} bpm` },
              s.max_heart_rate     && { label: 'FC MÁXIMA REAL',       value: `${s.max_heart_rate} bpm` },
              s.elevation_run_8w   && { label: 'DESNIVEL RUNNING',     value: `${s.elevation_run_8w} m` },
              s.elevation_ride_8w  && { label: 'DESNIVEL CICLISMO',    value: `${s.elevation_ride_8w} m` },
              s.avg_watts          && { label: 'VATIOS MEDIOS',        value: `${s.avg_watts} W` },
              s.max_watts          && { label: 'VATIOS MÁXIMOS',       value: `${s.max_watts} W` },
              (s.total_runs_8w > 0)  && { label: 'CARRERAS (8 SEM)',   value: `${s.total_runs_8w}` },
              (s.total_rides_8w > 0) && { label: 'RUTAS (8 SEM)',      value: `${s.total_rides_8w}` },
              s.ytd_run_km         && { label: 'KM AÑO RUNNING',      value: `${s.ytd_run_km} km` },
              s.ytd_ride_km        && { label: 'KM AÑO CICLISMO',     value: `${s.ytd_ride_km} km` },
            ].filter(Boolean)

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {items.map(({ label, value }) => (
                  <div key={label} style={{ background: '#0f1012', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '3px' }}>{label}</div>
                    <div style={{ ...mono, fontSize: '14px', color: '#f2f3f0', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      ) : (
        <button onClick={connectStrava} disabled={saving} style={{ width: '100%', background: '#fc4c02', border: 'none', borderRadius: '14px', padding: '16px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#fff', cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: saving ? 0.7 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          {saving ? 'Creando cuenta…' : 'Conectar con Strava'}
        </button>
      )}
      {error && <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '10px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', background: '#232629' }} />
        <div style={{ ...mono, fontSize: '10px', color: '#5a5f64', letterSpacing: '0.1em' }}>O A MANO</div>
        <div style={{ flex: 1, height: '1px', background: '#232629' }} />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>PESO (KG)</div><input value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="opcional" style={inputStyle} /></div>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>EDAD</div><input value={form.age} onChange={e => set('age', e.target.value)} placeholder="opcional" style={inputStyle} /></div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '22px' }}>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>FC MÁX</div><input value={form.hrMax} onChange={e => set('hrMax', e.target.value)} placeholder="opcional" style={inputStyle} /></div>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>KM / SEMANA</div><input value={form.weekKm} onChange={e => set('weekKm', e.target.value)} placeholder="opcional" style={inputStyle} /></div>
      </div>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '12px' }}>MARCAS ACTUALES <span style={{ color: '#3a3e42', fontWeight: 400 }}>· opcional</span></div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>5K</div><input value={form.t5k} onChange={e => set('t5k', e.target.value)} placeholder="M:SS" style={{ ...inputStyle, textAlign: 'center', padding: '13px 6px' }} /></div>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>10K</div><input value={form.t10k} onChange={e => set('t10k', e.target.value)} placeholder="M:SS" style={{ ...inputStyle, textAlign: 'center', padding: '13px 6px' }} /></div>
        <div style={{ flex: 1 }}><div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '7px' }}>21K</div><input value={form.t21k} onChange={e => set('t21k', e.target.value)} placeholder="H:MM:SS" style={{ ...inputStyle, textAlign: 'center', padding: '13px 6px' }} /></div>
      </div>
      <button onClick={advance} style={btnPrimary}>{editing ? 'Guardar y volver' : 'Revisar y continuar'}</button>
    </div>
  )

  // ---- SUMMARY ----
  if (screen === 'summary') {
    const sportNames = { running: 'Running', cycling: 'Ciclismo', triatlon: 'Triatlón', natacion: 'Natación' }
    const levelNames = { principiante: 'Principiante', inter: 'Intermedio', avanzado: 'Avanzado' }
    const goalNames = { carrera: 'Competición', marca: 'Marca / ritmo', fitness: 'Salud', peso: 'Peso' }
    const daysLabel = form.training_days.map(d => DAY_LABELS[d]).join(' · ')
    const rows = [
      { label: 'DEPORTE', value: form.sports.map(s => sportNames[s] || s).join(', '), step: 'sport' },
      { label: 'NIVEL', value: levelNames[form.level], step: 'level' },
      { label: 'DÍAS', value: `${daysLabel} · ${form.time} min/sesión`, step: 'avail' },
      { label: 'OBJETIVOS', value: form.goals.map(g => goalNames[g] || g).join(', ') || 'Ninguno', step: 'goals' },
      { label: 'FECHA OBJETIVO', value: form.eventName ? `${form.eventName} · ${fmtDate(form.eventDate)}` : fmtDate(form.eventDate), step: 'goaldate' },
      { label: 'DATOS', value: form.stravaConnected ? '✓ Importados de Strava' : (form.weight ? `${form.weight} kg · ${form.weekKm || '—'} km/sem` : 'Sin completar'), step: 'data' },
    ]
    return (
      <div style={{ minHeight: '100svh', background: '#0a0b0d', padding: '56px 28px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <button style={backStyle} onClick={back}><span style={{ fontSize: '19px', lineHeight: '0.5' }}>‹</span> Atrás</button>
        <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px', color: '#f2f3f0' }}>Revisa tu perfil</div>
        <div style={{ fontSize: '14px', color: '#8a8e92', marginBottom: '22px' }}>Pulsa cualquier dato para corregirlo.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '24px' }}>
          {rows.map(r => (
            <div key={r.label} onClick={() => editStep(r.step)} style={{ background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '5px' }}>{r.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: '#f2f3f0' }}>{r.value}</div>
              </div>
              <span style={{ fontSize: '13px', color: '#c8ff3c' }}>Editar</span>
            </div>
          ))}
        </div>
        {error && <p style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button onClick={finish} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Creando cuenta...' : 'Generar mi plan con IA'}
        </button>
      </div>
    )
  }

  return null
}
