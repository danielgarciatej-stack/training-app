import { useState } from 'react'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const STEPS = [
  {
    pos: 'center',
    icon: '👋',
    title: '¡Bienvenido a MyTrain!',
    body: 'Tu entrenador personal con IA. En 4 pasos te explicamos cómo sacarle el máximo partido.',
    tail: null,
    navTab: null,
  },
  {
    pos: 'bottom',
    icon: '📅',
    title: 'Tu sesión de hoy',
    body: 'Cada día verás la sesión que la IA ha planificado para ti. Cuando la completes, toca "Registrar sesión" para hacer el seguimiento.',
    tail: 'up',
    navTab: null,
  },
  {
    pos: 'bottom',
    icon: '🗓️',
    title: 'Pestaña PLAN',
    body: 'Consulta toda tu semana de un vistazo. Si un día no puedes entrenar, usa el botón ⇄ en cualquier sesión para intercambiarla con otro día.',
    tail: 'down',
    navTab: 1, // índice 0=HOY, 1=PLAN, 2=YO
  },
  {
    pos: 'bottom',
    icon: '📊',
    title: 'Pestaña YO',
    body: 'Aquí tienes tu estado de forma: ritmos estimados, tiempos por distancia y tendencia de las últimas semanas. También puedes ajustar tu plan y conectar Strava.',
    tail: 'down',
    navTab: 2,
  },
  {
    pos: 'center',
    icon: '🏆',
    title: '¡Todo listo!',
    body: 'La IA analiza tus sesiones completadas y ajusta el plan cada semana. Cuanto más registres, más preciso será tu entrenamiento.',
    tail: null,
    navTab: null,
  },
]

function Tail({ dir, tabIndex }) {
  // dir: 'up' | 'down'
  // tabIndex: 0 | 1 | 2 | null (for horizontal offset when pointing to nav)
  const base = {
    width: 0,
    height: 0,
    flexShrink: 0,
  }

  const tabOffsets = { 0: '16.6%', 1: '50%', 2: '83.3%' }
  const left = tabIndex !== null ? tabOffsets[tabIndex] : '50%'

  if (dir === 'up') {
    return (
      <div style={{ position: 'absolute', top: '-12px', left, transform: 'translateX(-50%)', ...base, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: '12px solid #131417' }} />
    )
  }
  if (dir === 'down') {
    return (
      <div style={{ position: 'absolute', bottom: '-12px', left, transform: 'translateX(-50%)', ...base, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '12px solid #131417' }} />
    )
  }
  return null
}

function NavHighlight({ tabIndex }) {
  if (tabIndex === null) return null
  const tabOffsets = { 0: 'calc(16.6% - 26px)', 1: 'calc(50% - 26px)', 2: 'calc(83.3% - 26px)' }
  return (
    <div style={{
      position: 'fixed',
      bottom: '12px',
      left: tabOffsets[tabIndex],
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      border: '2px solid #c8ff3c',
      boxShadow: '0 0 0 4px rgba(200,255,60,0.15)',
      zIndex: 10001,
      pointerEvents: 'none',
      animation: 'mtspin-pulse 1.8s ease-in-out infinite',
    }} />
  )
}

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

  const { pos, icon, title, body, tail, navTab } = STEPS[step]
  const isLast = step === STEPS.length - 1

  const cardStyle = pos === 'center'
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(340px, calc(100vw - 48px))',
        zIndex: 10000,
      }
    : {
        position: 'fixed',
        bottom: tail === 'down' ? '90px' : '88px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 48px))',
        zIndex: 10000,
      }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,11,13,0.82)', backdropFilter: 'blur(3px)', zIndex: 9999 }}
      />

      {/* Nav highlight ring */}
      <NavHighlight tabIndex={navTab} />

      {/* Card */}
      <div style={{ ...cardStyle, position: 'fixed' }}>
        {tail === 'up' && <Tail dir="up" tabIndex={null} />}

        <div style={{ background: '#131417', border: '1px solid #2a2e33', borderRadius: '20px', padding: '22px 22px 18px', position: 'relative' }}>
          {/* Skip */}
          <button
            onClick={handleClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6b7075', fontSize: '13px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", padding: '4px 8px' }}
          >
            Saltar
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '16px' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? '18px' : '5px', height: '5px', borderRadius: '3px', background: i === step ? '#c8ff3c' : '#2a2e33', transition: 'width 0.2s' }} />
            ))}
          </div>

          {/* Icon + Title */}
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', color: '#f2f3f0', marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '14px', color: '#9a9ea2', lineHeight: 1.6, marginBottom: '22px' }}>{body}</div>

          {/* Buttons */}
          <button
            onClick={next}
            style={{ width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '12px', padding: '14px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer' }}
          >
            {isLast ? '¡Empezar!' : 'Continuar →'}
          </button>
        </div>

        {tail === 'down' && <Tail dir="down" tabIndex={navTab} />}
      </div>

      <style>{`
        @keyframes mtspin-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
      `}</style>
    </>
  )
}
