import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import InstallBanner from '../components/InstallBanner'

const mono = { fontFamily: "'JetBrains Mono', monospace" }
const inputStyle = { width: '100%', background: '#131417', border: '1px solid #232629', borderRadius: '14px', padding: '15px 16px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', color: '#f2f3f0', outline: 'none' }
const labelStyle = { ...mono, fontSize: '11px', letterSpacing: '0.14em', color: '#6b7075', marginBottom: '8px', display: 'block' }

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', flexDirection: 'column', padding: '32px 28px' }}>
      <InstallBanner />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '10px', color: '#f2f3f0' }}>
            My<span style={{ color: '#c8ff3c' }}>Train</span>
          </div>
          <div style={{ fontSize: '15px', color: '#9a9ea2' }}>Inicia sesión para continuar</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={labelStyle}>CORREO</div>
            <input style={inputStyle} type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <div style={labelStyle}>CONTRASEÑA</div>
            <input style={inputStyle} type="password" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ marginTop: '8px', width: '100%', background: '#c8ff3c', border: 'none', borderRadius: '14px', padding: '18px', fontSize: '16px', fontWeight: 600, color: '#0a0b0d', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#5a5f64', marginTop: '20px' }}>
          ¿Primera vez?{' '}
          <Link to="/onboarding" style={{ color: '#9a9ea2', textDecoration: 'none' }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  )
}
