import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

export default function StravaCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('connecting') // connecting | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      setStatus('error')
      setMessage(error === 'access_denied' ? 'Cancelaste la conexión con Strava.' : 'Error al conectar con Strava.')
      return
    }

    const connect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No hay sesión activa')

        const { data, error: fnError } = await supabase.functions.invoke('strava-callback', {
          body: { code, userId: user.id },
        })

        if (fnError || data?.error) throw new Error(fnError?.message || data?.error)

        setStatus('success')
        setMessage(`Conectado como ${data.athlete?.name || 'atleta'}`)
        setTimeout(() => navigate('/yo'), 2000)
      } catch (err) {
        setStatus('error')
        setMessage(err.message || 'Error inesperado')
      }
    }

    connect()
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '20px' }}>
      {status === 'connecting' && (
        <>
          <div style={{ width: 36, height: 36, border: '2px solid #c8ff3c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
          <div style={{ ...mono, fontSize: '13px', color: '#8a8e92', letterSpacing: '0.08em' }}>CONECTANDO CON STRAVA…</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#c8ff3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#0a0b0d' }}>✓</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>Strava conectado</div>
          <div style={{ fontSize: '14px', color: '#8a8e92' }}>{message}</div>
          <div style={{ ...mono, fontSize: '11px', color: '#6b7075' }}>Volviendo al perfil…</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1d2024', border: '1px solid #ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ff6b6b' }}>✕</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f2f3f0' }}>Error de conexión</div>
          <div style={{ fontSize: '14px', color: '#8a8e92', textAlign: 'center' }}>{message}</div>
          <button onClick={() => navigate('/yo')} style={{ marginTop: '8px', background: 'transparent', border: '1px solid #2a2e33', borderRadius: '12px', padding: '12px 24px', color: '#9a9ea2', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', cursor: 'pointer' }}>
            Volver al perfil
          </button>
        </>
      )}
    </div>
  )
}
