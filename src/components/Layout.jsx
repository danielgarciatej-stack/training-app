import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <main style={{ flex: 1, paddingBottom: '72px', overflowY: 'auto' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
