import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    const timeout = setTimeout(() => setSession(s => s === undefined ? null : s), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
    }).catch(() => {
      clearTimeout(timeout)
      setSession(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
