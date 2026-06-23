import { NavLink } from 'react-router-dom'

const ICONS = {
  '/': ({ active }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M13 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill={active ? '#c8ff3c' : '#5a5f64'} />
      <path d="M8.5 8.5c.8-1.2 2-1.8 3.5-1.8s2.7.6 3 1.8l.5 2-2 1v4.5" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 10.5l-2.5 4.5" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 12l2 5" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 20l1.5-4.5" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  '/plan': ({ active }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" />
      <path d="M3 10h18" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1" fill={active ? '#c8ff3c' : '#5a5f64'} />
      <circle cx="12" cy="15" r="1" fill={active ? '#c8ff3c' : '#5a5f64'} />
      <circle cx="16" cy="15" r="1" fill={active ? '#c8ff3c' : '#5a5f64'} />
    </svg>
  ),
  '/metas': ({ active }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 3h14v9a7 7 0 0 1-14 0V3Z" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 7H2v4a3 3 0 0 0 3 3M19 7h3v4a3 3 0 0 1-3 3" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  '/yo': ({ active }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#c8ff3c' : '#5a5f64'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
}

const tabs = [
  { to: '/', label: 'HOY' },
  { to: '/plan', label: 'PLAN' },
  { to: '/metas', label: 'METAS' },
  { to: '/yo', label: 'YO' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[448px] z-50"
      style={{ background: '#0d0e11', borderTop: '1px solid #1c1f23', height: '72px', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
      {tabs.map(({ to, label }) => {
        const Icon = ICONS[to]
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', paddingTop: '4px', textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', color: isActive ? '#c8ff3c' : '#5a5f64' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
