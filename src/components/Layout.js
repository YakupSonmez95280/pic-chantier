import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, CalendarDays, ClipboardList, Settings, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const ROLE_LABEL = { eg:'EG', rt:'RT', subcontractor:'ST' }
const ROLE_STYLE = {
  eg:  { bg:'#EDE9FE', color:'#5B21B6' },
  rt:  { bg:'var(--blue-l)', color:'var(--blue)' },
  subcontractor: { bg:'var(--green-l)', color:'var(--green-d)' },
}

export default function Layout() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const isEG = profile?.role === 'eg'
  const isRT = profile?.role === 'rt'
  const canValidate = isEG || isRT

  const logout = async () => { await supabase.auth.signOut(); nav('/login') }

  const links = [
    { to: '/',        icon: <LayoutDashboard size={20}/>, label: 'Accueil',  exact: true },
    { to: '/pic',     icon: <Map size={20}/>,             label: 'PIC'               },
    { to: '/planning',icon: <CalendarDays size={20}/>,    label: 'Planning'          },
    ...(canValidate ? [{ to: '/demandes', icon: <ClipboardList size={20}/>, label: 'Demandes' }] : []),
    ...(isEG ? [{ to: '/admin', icon: <Settings size={20}/>, label: 'Admin' }] : []),
  ]

  const roleStyle = ROLE_STYLE[profile?.role] || ROLE_STYLE.subcontractor

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', maxWidth:780, margin:'0 auto' }}>

      <header style={{ position:'sticky', top:0, zIndex:50, background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, background:'var(--green)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Map size={16} color="#fff" />
          </div>
          <span style={{ fontWeight:700, fontSize:16, letterSpacing:'-0.3px' }}>PIC Chantier</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:'var(--r-full)', background: roleStyle.bg, color: roleStyle.color, textTransform:'uppercase', letterSpacing:'0.3px' }}>
            {ROLE_LABEL[profile?.role] || 'ST'}
          </span>
          <span style={{ fontSize:13, color:'var(--text2)' }}>{profile?.prenom} {profile?.nom}</span>
          <button onClick={logout} title="Déconnexion" style={{ background:'none', border:'none', color:'var(--text3)', display:'flex', padding:4, borderRadius:6 }}>
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      <main style={{ flex:1, padding:'16px 16px 80px' }}>
        <Outlet />
      </main>

      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:780, background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', zIndex:50 }}>
        {links.map(({ to, icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            style={({ isActive }) => ({
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              padding:'9px 0 7px', fontSize:11, fontWeight:500, color: isActive ? 'var(--green)' : 'var(--text3)',
              borderTop: isActive ? '2px solid var(--green)' : '2px solid transparent'
            })}>
            {icon}<span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
