import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

function paceToSecs(pace) {
  if (!pace || typeof pace !== 'string') return 0
  const parts = pace.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function secsToTime(secs) {
  secs = Math.round(Math.abs(secs))
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function riegel(baseTimeSecs, baseDist, targetDist) {
  return baseTimeSecs * Math.pow(targetDist / baseDist, 1.06)
}

function vo2maxFromEasyPace(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return null
  const easySpeedMmin = 1000 / paceSecPerKm * 60
  const raceSpeedMmin = easySpeedMmin / 0.70
  const vo2 = -4.6 + 0.182258 * raceSpeedMmin + 0.000104 * raceSpeedMmin * raceSpeedMmin
  return Math.max(20, Math.min(90, Math.round(vo2)))
}

function chartPoints(vals, invert) {
  const w = 300, top = 14, bot = 74
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = (max - min) || 1
  const step = w / (vals.length - 1)
  return vals.map((v, i) => {
    let norm = (v - min) / span
    if (invert) norm = 1 - norm
    const y = bot - norm * (bot - top)
    return [Math.round(i * step), Math.round(y)]
  })
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function DeltaPill({ delta, improved }) {
  if (!delta) return null
  const color = improved ? '#c8ff3c' : '#ff8c42'
  const bg = improved ? 'rgba(200,255,60,0.12)' : 'rgba(255,140,66,0.12)'
  const bdr = improved ? 'rgba(200,255,60,0.28)' : 'rgba(255,140,66,0.3)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: bg, border: `1px solid ${bdr}`, borderRadius: '9px', padding: '5px 9px', flexShrink: 0 }}>
      <span style={{ color, fontSize: '12px' }}>{improved ? '↑' : '↓'}</span>
      <span style={{ ...mono, fontSize: '12px', fontWeight: 700, color }}>{delta}</span>
    </div>
  )
}

function TrendChart({ vals, invert, label }) {
  if (!vals || vals.length < 2) return null
  const pts = chartPoints(vals, invert)
  const line = pts.map(p => p.join(',')).join(' ')
  const fill = `0,90 ${line} 300,90`
  const last = pts[pts.length - 1]
  return (
    <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '18px 20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em' }}>{label}</div>
        <div style={{ ...mono, fontSize: '10px', color: '#c8ff3c' }}>6 SEM</div>
      </div>
      <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1="0" y1="24" x2="300" y2="24" stroke="#1c1f23" strokeWidth="1" />
        <line x1="0" y1="60" x2="300" y2="60" stroke="#1c1f23" strokeWidth="1" />
        <polyline points={fill} fill="rgba(200,255,60,0.08)" stroke="none" />
        <polyline points={line} fill="none" stroke="#c8ff3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill="#c8ff3c" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <span style={{ ...mono, fontSize: '9px', color: '#5a5f64' }}>-6sem</span>
        <span style={{ ...mono, fontSize: '9px', color: '#5a5f64' }}>hoy</span>
      </div>
    </div>
  )
}

function EstimatesTable({ rows }) {
  return (
    <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '18px 20px 8px', marginBottom: '12px' }}>
      <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '4px' }}>TIEMPOS ESTIMADOS</div>
      {rows.map((r, i) => (
        <div key={r.dist} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < rows.length - 1 ? '1px solid #1c1f23' : 'none' }}>
          <div style={{ ...mono, fontSize: '15px', fontWeight: 700, color: '#cdd0d2', width: '60px' }}>{r.dist}</div>
          <div style={{ ...mono, fontSize: '21px', fontWeight: 500, color: '#f2f3f0', flex: 1, textAlign: 'right', paddingRight: '16px' }}>{r.time}</div>
          <DeltaPill delta={r.delta} improved={r.improved} />
        </div>
      ))}
    </div>
  )
}

function NoData({ sport }) {
  const labels = { run: 'running', bike: 'ciclismo', swim: 'natación' }
  return (
    <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
      <div style={{ fontSize: '15px', color: '#9a9ea2', marginBottom: '8px' }}>Sin datos todavía</div>
      <div style={{ fontSize: '13px', color: '#6b7075', lineHeight: 1.5 }}>Completa sesiones de {labels[sport]} o conecta Strava para ver tu estado de forma.</div>
    </div>
  )
}

function formaLabel(trend, higherIsBetter) {
  if (!trend || trend.length < 3) return 'En progreso'
  const recent = trend.slice(-3)
  const improving = recent.filter((v, i) => i > 0 && (higherIsBetter ? v > recent[i-1] : v < recent[i-1])).length
  if (improving >= 2) return 'Alta'
  if (improving >= 1) return 'Buena'
  return 'Moderada'
}

export default function FitnessState() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState('run')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('plan_sessions').select('*').eq('user_id', user.id).eq('status', 'completed').order('week_start', { ascending: false }).limit(200),
      ])
      setProfile(prof)
      setSessions(sess || [])
      const sports = prof?.sports || ['running']
      if (sports.includes('running') || sports.includes('trail')) setSport('run')
      else if (sports.includes('cycling')) setSport('bike')
      else if (sports.includes('natacion')) setSport('swim')
      setLoading(false)
    }
    load()
  }, [])

  const strava = profile?.strava_stats || {}
  const weight = profile?.weight || null
  const userSports = profile?.sports || ['running']

  // Last 6 week starts
  const today = new Date()
  const sixWeeks = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    return toDateStr(getWeekStart(d))
  }).reverse()

  // ---- RUNNING ----
  const runSessions = sessions.filter(s => s.sport === 'running' || s.sport === 'trail')

  const runWeeklyPaceSecs = sixWeeks.map(ws => {
    const ws_sess = runSessions.filter(s => s.week_start === ws && s.actual_pace)
    if (!ws_sess.length) return null
    return ws_sess.reduce((a, s) => a + paceToSecs(s.actual_pace), 0) / ws_sess.length
  })

  // Fill nulls using Strava as anchor for current week
  const stravaEasyPaceSecs = strava.avg_easy_pace ? paceToSecs(strava.avg_easy_pace) : null
  const runPaceFilled = [...runWeeklyPaceSecs]
  if (runPaceFilled[5] === null && stravaEasyPaceSecs) {
    // Anchor current to Strava, interpolate backwards slightly
    for (let i = 5; i >= 0; i--) {
      if (runPaceFilled[i] === null) runPaceFilled[i] = stravaEasyPaceSecs + (5 - i) * 3
    }
  }

  const currentRunPaceSecs = runPaceFilled[5]
  const prevRunPaceSecs = runPaceFilled[4]
  const runPaceDelta = (currentRunPaceSecs && prevRunPaceSecs)
    ? Math.abs(Math.round(prevRunPaceSecs - currentRunPaceSecs)) : null
  const runPaceImproved = (currentRunPaceSecs && prevRunPaceSecs) ? currentRunPaceSecs < prevRunPaceSecs : null

  const thresholdSecs = currentRunPaceSecs ? Math.round(currentRunPaceSecs * 0.88) : null
  const vo2max = currentRunPaceSecs ? vo2maxFromEasyPace(currentRunPaceSecs) : null
  const racePace5kSecs = thresholdSecs ? Math.round(thresholdSecs * 0.96) : null
  const time5kSecs = racePace5kSecs ? racePace5kSecs * 5 : null

  const prevRacePace5k = (prevRunPaceSecs) ? Math.round(prevRunPaceSecs * 0.88 * 0.96) : null
  const prevTime5kSecs = prevRacePace5k ? prevRacePace5k * 5 : null

  const runEstimates = time5kSecs ? [
    { dist: '5K', baseDist: 5 },
    { dist: '10K', baseDist: 10 },
    { dist: '21K', baseDist: 21.1 },
    { dist: '42K', baseDist: 42.2 },
  ].map(r => {
    const t = riegel(time5kSecs, 5, r.baseDist)
    const prev = prevTime5kSecs ? riegel(prevTime5kSecs, 5, r.baseDist) : null
    const deltaSecs = prev ? Math.abs(Math.round(prev - t)) : null
    return { dist: r.dist, time: secsToTime(t), delta: deltaSecs ? secsToTime(deltaSecs) : null, improved: prev ? t < prev : null }
  }) : []

  const runTrend = runPaceFilled.filter(v => v !== null)
  const runForma = formaLabel(runPaceFilled.filter(v => v !== null), false)
  const hasRunData = !!currentRunPaceSecs

  // ---- CYCLING ----
  const rideSessions = sessions.filter(s => s.sport === 'cycling')

  const bikeWeeklySpeed = sixWeeks.map(ws => {
    const ws_sess = rideSessions.filter(s => s.week_start === ws && s.actual_distance && s.actual_duration)
    if (!ws_sess.length) return null
    const avg = ws_sess.reduce((a, s) => a + (s.actual_distance / (s.actual_duration / 60)), 0) / ws_sess.length
    return Math.round(avg * 10) / 10
  })

  const avgWatts = strava.avg_watts || null
  const maxWatts = strava.max_watts || null
  const ftp = maxWatts ? Math.round(maxWatts * 0.95) : avgWatts ? Math.round(avgWatts * 1.05) : null
  const wkg = (ftp && weight) ? Math.round((ftp / weight) * 10) / 10 : null

  const currentBikeSpeed = bikeWeeklySpeed[5]
  const prevBikeSpeed = bikeWeeklySpeed[4]
  const bikeSpeedDelta = (currentBikeSpeed && prevBikeSpeed) ? Math.abs(Math.round((currentBikeSpeed - prevBikeSpeed) * 10) / 10) : null
  const bikeSpeedImproved = (currentBikeSpeed && prevBikeSpeed) ? currentBikeSpeed > prevBikeSpeed : null
  const bikeForma = formaLabel(bikeWeeklySpeed.filter(v => v !== null), true)

  const bikeEstimates = currentBikeSpeed ? [
    { dist: '20 km', km: 20 },
    { dist: '40 km', km: 40 },
    { dist: '100 km', km: 100 },
  ].map(r => {
    const t = r.km / currentBikeSpeed * 3600
    const prev = prevBikeSpeed ? r.km / prevBikeSpeed * 3600 : null
    const deltaSecs = prev ? Math.abs(Math.round(prev - t)) : null
    return { dist: r.dist, time: secsToTime(t), delta: deltaSecs ? secsToTime(deltaSecs) : null, improved: prev ? t < prev : null }
  }) : []

  const bikeTrend = bikeWeeklySpeed.filter(v => v !== null)
  const hasBikeData = !!currentBikeSpeed || !!avgWatts

  // Sport tabs
  const sportTabs = [
    (userSports.includes('running') || userSports.includes('trail')) && { id: 'run', label: 'Running' },
    userSports.includes('cycling') && { id: 'bike', label: 'Ciclismo' },
    userSports.includes('natacion') && { id: 'swim', label: 'Natación' },
  ].filter(Boolean)

  if (loading) return (
    <div style={{ minHeight: '100%', background: '#0a0b0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #c8ff3c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '14px 24px 32px', background: '#0a0b0d', minHeight: '100%', overflowY: 'auto' }}>
      <button onClick={() => navigate('/yo')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#9a9ea2', fontSize: '14px', marginBottom: '18px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
        <span style={{ fontSize: '19px', lineHeight: 0.5 }}>‹</span> Perfil
      </button>
      <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: '#f2f3f0' }}>Estado de forma</div>
      <div style={{ fontSize: '13px', color: '#8a8e92', marginBottom: '20px' }}>Estimado a partir de tus últimas 6 semanas.</div>

      {sportTabs.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', background: '#0f1012', border: '1px solid #1c1f23', borderRadius: '14px', padding: '5px', marginBottom: '20px' }}>
          {sportTabs.map(t => (
            <div key={t.id} onClick={() => setSport(t.id)} style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: '10px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: sport === t.id ? '#c8ff3c' : 'transparent', color: sport === t.id ? '#0a0b0d' : '#9a9ea2' }}>
              {t.label}
            </div>
          ))}
        </div>
      )}

      {/* RUNNING */}
      {sport === 'run' && (hasRunData ? (
        <>
          <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ ...mono, fontSize: '10px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '11px' }}>RITMO FÁCIL ACTUAL</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ ...mono, fontSize: '46px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 0.9 }}>{secsToTime(currentRunPaceSecs)}</span>
                  <span style={{ ...mono, fontSize: '16px', color: '#6b7075' }}>/km</span>
                </div>
              </div>
              {runPaceDelta !== null && (
                <div style={{ textAlign: 'right' }}>
                  <DeltaPill delta={`${runPaceDelta}s/km`} improved={runPaceImproved} />
                  <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.08em', marginTop: '7px' }}>VS SEMANA ANT.</div>
                </div>
              )}
            </div>
            <div style={{ height: '1px', background: '#1c1f23', margin: '18px 0 14px' }} />
            <div style={{ display: 'flex', gap: '24px' }}>
              {thresholdSecs && (
                <div>
                  <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>UMBRAL</div>
                  <div style={{ ...mono, fontSize: '17px', fontWeight: 500 }}>{secsToTime(thresholdSecs)}<span style={{ fontSize: '11px', color: '#6b7075' }}>/km</span></div>
                </div>
              )}
              {vo2max && (
                <div>
                  <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>VO2 MÁX</div>
                  <div style={{ ...mono, fontSize: '17px', fontWeight: 500 }}>{vo2max}<span style={{ fontSize: '11px', color: '#6b7075' }}> ml/kg</span></div>
                </div>
              )}
              <div>
                <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>FORMA</div>
                <div style={{ ...mono, fontSize: '17px', fontWeight: 500, color: '#c8ff3c' }}>{runForma}</div>
              </div>
            </div>
          </div>
          {runEstimates.length > 0 && <EstimatesTable rows={runEstimates} />}
          {runTrend.length >= 2 && <TrendChart vals={runTrend} invert={true} label="TENDENCIA · RITMO FÁCIL" />}
        </>
      ) : <NoData sport="run" />)}

      {/* CYCLING */}
      {sport === 'bike' && (hasBikeData ? (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            {currentBikeSpeed && (
              <div style={{ flex: 1, background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '18px' }}>
                <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '11px' }}>VEL. MEDIA</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ ...mono, fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 0.9 }}>{currentBikeSpeed}</span>
                  <span style={{ ...mono, fontSize: '12px', color: '#6b7075' }}>km/h</span>
                </div>
                {bikeSpeedDelta !== null && <div style={{ marginTop: '12px' }}><DeltaPill delta={`${bikeSpeedDelta}`} improved={bikeSpeedImproved} /></div>}
              </div>
            )}
            {avgWatts && (
              <div style={{ flex: 1, background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '18px' }}>
                <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '11px' }}>POTENCIA MEDIA</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ ...mono, fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 0.9 }}>{avgWatts}</span>
                  <span style={{ ...mono, fontSize: '12px', color: '#6b7075' }}>W</span>
                </div>
              </div>
            )}
          </div>
          {(ftp || wkg) && (
            <div style={{ background: '#131417', border: '1px solid #232629', borderRadius: '16px', padding: '18px 20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                {ftp && <div><div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>FTP</div><div style={{ ...mono, fontSize: '17px', fontWeight: 500 }}>{ftp}<span style={{ fontSize: '11px', color: '#6b7075' }}> W</span></div></div>}
                {wkg && <div><div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>W/KG</div><div style={{ ...mono, fontSize: '17px', fontWeight: 500 }}>{wkg}</div></div>}
                <div><div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.1em', marginBottom: '6px' }}>FORMA</div><div style={{ ...mono, fontSize: '17px', fontWeight: 500, color: '#c8ff3c' }}>{bikeForma}</div></div>
              </div>
            </div>
          )}
          {bikeEstimates.length > 0 && <EstimatesTable rows={bikeEstimates} />}
          {bikeTrend.length >= 2 && <TrendChart vals={bikeTrend} invert={false} label="TENDENCIA · VEL. MEDIA" />}
        </>
      ) : <NoData sport="bike" />)}

      {/* SWIMMING */}
      {sport === 'swim' && <NoData sport="swim" />}
    </div>
  )
}
