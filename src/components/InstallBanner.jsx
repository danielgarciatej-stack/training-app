import { useState } from 'react'

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

export default function InstallBanner() {
  const [visible, setVisible] = useState(isIOS && !isStandalone)

  if (!visible) return null

  const dismiss = () => setVisible(false)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#131417', borderTop: '1px solid #2a2e33',
      padding: '14px 18px 28px', display: 'flex', alignItems: 'center', gap: '14px',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ width: 38, height: 38, background: '#1d2024', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V6m0 0L8.5 9.5M12 6l3.5 3.5" stroke="#c8ff3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="14" width="16" height="7" rx="2" stroke="#c8ff3c" strokeWidth="1.8" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f2f3f0', marginBottom: '3px' }}>
          Instala MyTrain
        </div>
        <div style={{ fontSize: '12px', color: '#9a9ea2', lineHeight: 1.45 }}>
          Toca <span style={{ color: '#c8ff3c' }}>⬆</span> y luego <span style={{ color: '#c8ff3c' }}>"Añadir a pantalla de inicio"</span>
        </div>
      </div>
      <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#5a5f64', fontSize: '20px', cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  )
}
