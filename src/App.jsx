import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WeeklyPlan from './pages/WeeklyPlan'
import ActivityLog from './pages/ActivityLog'
import Metas from './pages/Metas'
import ProfilePage from './pages/ProfilePage'
import StravaCallback from './pages/StravaCallback'
import WeeklySummary from './pages/WeeklySummary'
import Layout from './components/Layout'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', background: '#0a0b0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #c8ff3c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mtspin 0.9s linear infinite' }} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/onboarding" element={
        session && !new URLSearchParams(window.location.search).get('strava')
          ? <Navigate to="/" replace />
          : <Onboarding />
      } />
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/strava/callback" element={<StravaCallback />} />
      <Route path="/" element={session ? <Layout /> : <Navigate to="/onboarding" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<WeeklyPlan />} />
        <Route path="register" element={<ActivityLog />} />
        <Route path="metas" element={<Metas />} />
        <Route path="yo" element={<ProfilePage />} />
        <Route path="weekly-summary" element={<WeeklySummary />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
