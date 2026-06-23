import { useState } from 'react'

// spotFn(w, h) → { x, y, sw, sh, r } — SVG cutout rectangle
// cardPos: 'center' | 'bottom' | 'mid'
// tail: 'up' | 'down' | null
const STEPS = [
  {
    icon: '👋',
    title: '¡Bienvenido a MyTrain!',
    body: 'Tu entrenador personal con IA. En 4 pasos te explicamos lo esencial.',
    cardPos: 'center',
    spotFn: null,
    tail: null,
    tailTabFn: null,
  },
  {
    icon: '📅',
    title: 'Tu sesión de hoy',
    body: 'Aquí ves la sesión planificada para hoy. Cuando la termines, toca "Registrar sesión" para hacer el seguimiento.',
    cardPos: 'bottom',
    spotFn: (w) => ({ x: 12, y: 145, sw: w - 24, sh: 245, r: 16 }),
    tail: 'up',
    tailTabFn: null, // centered
  },
  {
    icon: '🗓️',
    title: 'Pestaña PLAN',
    body: 'Consulta toda tu semana. Si un día no puedes, usa ⇄ para intercambiar sesiones entre días.',
    cardPos: 'mid',
    spotFn: (w, h) => ({ x: Math.round(w / 3), y: h - 72, sw: Math.round(w / 3), sh: 72, r: 10 }),
    tail: 'down',
    tailTabFn: (w) => w * 0.5,     // PLAN tab center (px from left)
  },
  {
    icon: '📊',
    title: 'Pestaña YO',
    body: 'Tu estado de forma: ritmos estimados, tiempos por distancia y tendencia semanal. También puedes ajustar tu plan y conectar Strava.',
    cardPos: 'mid',
    spotFn: (w, h) => ({ x: Math.round(w * 2 / 3), y: h - 72, sw: Math.round(w / 3), sh: 72, r: 10 }),
    tail: 'down',
    tailTabFn: (w) => w * (5 / 6),  // YO tab center (px from left)
  },
  {
    icon: '🏆',
    title: '¡Todo listo!',
    body: 'La IA analiza tus sesiones completadas y ajusta el plan cada semana. Cuanto más registres, más preciso será.',
    cardPos: 'center',
    spotFn: null,
    tail: null,
    tailTabFn: null,
  },
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)

  const handleClose = () => {
    localStorage.setItem('tutorial_done', '1')
    onClose()
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleClose()
  }

  const w = window.innerWidth
  const h = window.innerHeight
  const { icon, title, body, cardPos, spotFn, tail, tailTabFn } = STEPS[step]
  const isLast = step === STEPS.length - 1
  const spot = spotFn ? spotFn(w, h) : null

  const cardWidth = Math.min(340, w - 48)
  const cardLeftPx = (w - cardWidth) / 2

  // Compute tail horizontal position as % of card width
  const tailLeftPct = (() => {
    if (!tailTabFn) return '50%'
    const tabCenterPx = tailTabFn(w)
    const relPx = tabCenterPx - cardLeftPx
    const pct = Math.min(88, Math.max(12, (relPx / cardWidth) * 100))
    return `${Math.round(pct)}%`
  })()

  const cardStyle = (() => {
    const base = { position: 'fixed', width: cardWidth, left: '50%', zIndex: 10001 }
    if (cardPos === 'center') return { ...base, top: '50%', transform: 'translate(-50%, -50%)' }
    if (cardPos === 'bottom') return { ...base, bottom: '90px', transform: 'translateX(-50%)' }
    if (cardPos === 'mid') return { ...base, top: '26%', transform: 'translateX(-50%)' }
    return base
  })()

  return (
    <>
      {/* SVG overlay with spotlight cutout */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 10000, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect x={spot.x} y={spot.y} width={spot.sw} height={spot.sh} rx={spot.r} ry={spot.r} fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(10,11,13,0.80)" mask="url(#tut-mask)" />
        {/* Spotlight border glow */}
        {spot && (
          <rect
            x={spot.x} y={spot.y} width={spot.sw} height={spot.sh} rx={spot.r} ry={spot.r}
            fill="none" stroke="rgba(200,255,60,0.5)" strokeWidth="2"
          />
        )}
      </svg>

      {/* Card */}
      <div style={cardStyle}>
        {/* Tail pointing UP (card is below spotlight) */}
        {tail === 'up' && (
          <div style={{ position: 'relative', height: '12px' }}>
            <div style={{ position: 'absolute', left: tailLeftPct, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: '12px solid #131417' }} />
          </div>
        )}

        <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '20px', padding: '22px 22px 18px', position: 'relative' }}>
          <button
            onClick={handleClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6b7075', fontSize: '13px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", padding: '4px 8px', zIndex: 1 }}
          >
            Saltar
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '16px' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? '18px' : '5px', height: '5px', borderRadius: '3px', background: i === step ? '#c8ff3c' : '#2a2e33', transition: 'width 0.2s' }} />
            ))}
          </div>

          <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', color: '#f2f3f0', marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '14px', color: '#9a9ea2', lineHeight: 1.6, marginBottom: '22px' }}>{body}</div>

          <button
            onClick={next}
            style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '12px', padding: '14px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}
          >
            {isLast ? '¡Empezar!' : 'Continuar →'}
          </button>
        </div>

        {/* Tail pointing DOWN (card is above nav spotlight) */}
        {tail === 'down' && (
          <div style={{ position: 'relative', height: '12px' }}>
            <div style={{ position: 'absolute', left: tailLeftPct, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '12px solid #131417' }} />
          </div>
        )}
      </div>
    </>
  )
}
