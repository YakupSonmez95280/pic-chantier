import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Map, Plus, ChevronRight, LogOut } from 'lucide-react'

export default function ChantierSelect() {
  const { profile, setChantier } = useAuth()
  const nav = useNavigate()
  const [chantiers, setChantiers] = useState([])
  const [showNew, setShowNew]     = useState(false)
  const [form, setForm]           = useState({ nom:'', adresse:'', description:'' })
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    supabase.from('chantiers').select('*').eq('actif', true).order('created_at', { ascending: false })
      .then(({ data }) => setChantiers(data || []))
  }, [])

  const [editId, setEditId]   = useState(null)
  const [editNom, setEditNom] = useState('')

  const renommer = async (id) => {
    if (!editNom.trim()) return
    await supabase.from('chantiers').update({ nom: editNom.trim() }).eq('id', id)
    setChantiers(prev => prev.map(c => c.id === id ? { ...c, nom: editNom.trim() } : c))
    setEditId(null); setEditNom('')
  }
    e.preventDefault()
    if (!form.nom.trim()) return
    setLoading(true)
    const { data } = await supabase.from('chantiers').insert({ nom: form.nom.trim(), adresse: form.adresse.trim(), description: form.description.trim() }).select().single()
    if (data) {
      setChantiers(prev => [data, ...prev])
      setShowNew(false)
      setForm({ nom:'', adresse:'', description:'' })
    }
    setLoading(false)
  }

  const choisir = (c) => {
    setChantier(c)
    nav('/')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    nav('/login')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:16, display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:500, marginTop:40 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, background:'var(--green)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Map size={20} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:20, letterSpacing:'-0.3px' }}>PIC Chantier</div>
              <div style={{ fontSize:13, color:'var(--text2)' }}>Bonjour {profile?.prenom} — Choisissez un chantier</div>
            </div>
          </div>
          <button onClick={logout} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', display:'flex' }}>
            <LogOut size={18}/>
          </button>
        </div>

        {/* Liste des chantiers */}
        {chantiers.length === 0 && !showNew ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)' }}>
            <Map size={40} style={{ display:'block', margin:'0 auto 12px', opacity:0.3 }}/>
            <p style={{ fontSize:14 }}>Aucun chantier pour l'instant</p>
            <p style={{ fontSize:13, marginTop:4 }}>Créez votre premier chantier ci-dessous</p>
          </div>
        ) : (
          <div style={{ marginBottom:16 }}>
        {chantiers.map(c => (
          <div key={c.id}
            style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px', marginBottom:10, boxShadow:'var(--shadow)' }}>
            {editId === c.id ? (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input autoFocus value={editNom} onChange={e=>setEditNom(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&renommer(c.id)}
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid var(--green)', borderRadius:8, fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }}/>
                <button onClick={()=>renommer(c.id)}
                  style={{ padding:'9px 14px', background:'var(--green)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>✓</button>
                <button onClick={()=>{setEditId(null);setEditNom('')}}
                  style={{ padding:'9px 12px', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div onClick={() => choisir(c)} style={{ display:'flex', alignItems:'center', gap:12, flex:1, cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.8'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  <div style={{ width:40, height:40, background:'var(--green-l)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Map size={18} color="var(--green)"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:16 }}>{c.nom}</div>
                    {c.adresse && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{c.adresse}</div>}
                  </div>
                  <ChevronRight size={18} color="var(--text3)"/>
                </div>
                <button onClick={()=>{setEditId(c.id);setEditNom(c.nom)}}
                  style={{ padding:'7px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, cursor:'pointer', color:'var(--text2)', flexShrink:0 }}>
                  ✏️ Renommer
                </button>
              </div>
            )}
          </div>
        ))}
          </div>
        )}

        {/* Formulaire nouveau chantier */}
        {showNew ? (
          <div style={{ background:'var(--surface)', borderRadius:12, padding:20, border:'1.5px solid var(--green)', boxShadow:'var(--shadow)' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Nouveau chantier</div>
            <form onSubmit={creer}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Nom du chantier *</label>
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }}
                  value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="ex : Tour Belleville – Paris 20e" required autoFocus/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Adresse</label>
                <input style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }}
                  value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))} placeholder="Adresse du chantier"/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Description</label>
                <textarea style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit', resize:'none' }}
                  rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description optionnelle"/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" disabled={loading}
                  style={{ flex:1, padding:'11px', background:'var(--green)', color:'#fff', border:'none', borderRadius:'var(--r)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                  {loading ? 'Création…' : 'Créer le chantier'}
                </button>
                <button type="button" onClick={()=>setShowNew(false)}
                  style={{ padding:'11px 16px', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowNew(true)}
            style={{ width:'100%', padding:'13px', background:'var(--green)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Plus size={18}/> Créer un nouveau chantier
          </button>
        )}
      </div>
    </div>
  )
}
