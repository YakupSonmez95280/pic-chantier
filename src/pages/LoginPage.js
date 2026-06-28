import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Map, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [pwd, setPwd]         = useState('')
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pwd })
    if (err) { setError('Email ou mot de passe incorrect.'); setLoading(false) }
    else nav('/')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', borderRadius:16, padding:32, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:42, height:42, background:'var(--green)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Map size={22} color="#fff"/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:20, letterSpacing:'-0.4px' }}>PIC Chantier</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>Gestion des livraisons</div>
          </div>
        </div>

        {error && <div style={{ fontSize:13, color:'var(--red)', background:'var(--red-l)', padding:'10px 14px', borderRadius:8, marginBottom:16 }}>{error}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="vous@entreprise.fr"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:15, background:'var(--bg)', outline:'none', color:'var(--text)' }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:6 }}>Mot de passe</label>
            <div style={{ position:'relative' }}>
              <input type={show?'text':'password'} value={pwd} onChange={e=>setPwd(e.target.value)} required placeholder="••••••••"
                style={{ width:'100%', padding:'11px 42px 11px 14px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:15, background:'var(--bg)', outline:'none', color:'var(--text)' }} />
              <button type="button" onClick={()=>setShow(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', display:'flex' }}>
                {show ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'var(--green)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:15, fontWeight:600, opacity:loading?0.7:1 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginTop:18 }}>Accès sur invitation de votre entreprise générale</p>
      </div>
    </div>
  )
}
