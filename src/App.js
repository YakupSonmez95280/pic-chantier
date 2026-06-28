import React, { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import LoginPage     from './pages/LoginPage'
import Layout        from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PicPage       from './pages/PicPage'
import PlanningPage  from './pages/PlanningPage'
import AdminPage     from './pages/AdminPage'
import DemandesPage  from './pages/DemandesPage'

export const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function Guard({ children, egOnly }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#9E9C97', fontSize:14 }}>Chargement…</div>
  if (!user) return <Navigate to="/login" replace />
  if (egOnly && profile?.role !== 'eg') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (u) => {
    if (!u) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthCtx.Provider value={{ user, profile, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<DashboardPage />} />
            <Route path="pic"      element={<PicPage />} />
            <Route path="planning" element={<PlanningPage />} />
            <Route path="demandes" element={<Guard egOnly><DemandesPage /></Guard>} />
            <Route path="admin"    element={<Guard egOnly><AdminPage /></Guard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
