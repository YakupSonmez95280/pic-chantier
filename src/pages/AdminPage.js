import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, Trash2, Plus } from 'lucide-react'

const LOTS_DEFAUT = ['Gros œuvre','Charpente / Couverture','Façade / Isolation','Électricité','Plomberie / CVC','Menuiseries extérieures','Menuiseries intérieures','Peinture / Revêtements','Carrelage / Sols','Serrurerie / Métallerie','Ascenseurs','Espaces verts']

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }

export default function AdminPage() {
  const [users, setUsers]       = useState([])
  const [lots, setLots]         = useState([])
  const [newLot, setNewLot]     = useState('')
  const [showInvite, setShow]   = useState(false)
  const [invForm, setInvForm]   = useState({ email:'', prenom:'', nom:'', entreprise:'', role:'subcontractor' })
  const [invMsg, setInvMsg]     = useState('')
  const [invLoading, setInvLoading] = useState(false)

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('entreprise')
    setUsers(data || [])
  }
  const loadLots = async () => {
    const { data } = await supabase.from('lots').select('*').order('nom')
    setLots(data || [])
  }
  useEffect(() => { loadUsers(); loadLots() }, [])

  const invite = async (e) => {
    e.preventDefault()
    setInvLoading(true); setInvMsg('')
    const pwdTmp = Math.random().toString(36).slice(-8) + 'Aa1!'
    const { error } = await supabase.auth.signUp({
      email: invForm.email, password: pwdTmp,
      options: { data: { prenom: invForm.prenom, nom: invForm.nom, entreprise: invForm.entreprise, role: invForm.role } }
    })
    if (error) setInvMsg('Erreur : ' + error.message)
    else { setInvMsg(`Invitation envoyée à ${invForm.email} ✓`); setInvForm({ email:'', prenom:'', nom:'', entreprise:'', role:'subcontractor' }); loadUsers() }
    setInvLoading(false)
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Supprimer ?')) return
    await supabase.from('profiles').delete().eq('id', id); loadUsers()
  }

  const addLot = async () => {
    if (!newLot.trim()) return
    const { data } = await supabase.from('lots').insert({ nom: newLot.trim() }).select().single()
    setLots(prev => [...prev, data]); setNewLot('')
  }

  const deleteLot = async (id) => {
    await supabase.from('lots').delete().eq('id', id); loadLots()
  }

  const importDefaut = async () => {
    const existants = lots.map(l => l.nom)
    const manquants = LOTS_DEFAUT.filter(l => !existants.includes(l))
    if (!manquants.length) return
    await supabase.from('lots').insert(manquants.map(nom => ({ nom })))
    loadLots()
  }

  const s = {
    section: { marginBottom:32 },
    title: { fontSize:16, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8, color:'var(--text)' },
    card: { background:'var(--surface)', borderRadius:12, padding:'12px 14px', marginBottom:8, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:12 },
    btn: (v='green') => ({ padding:'9px 16px', background: v==='green'?'var(--green)':'var(--surface)', color: v==='green'?'#fff':'var(--text)', border: v==='green'?'none':'1.5px solid var(--border)', borderRadius:'var(--r-sm)', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }),
    delBtn: { padding:8, background:'var(--red-l)', color:'var(--red)', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', display:'flex' },
    rolePill: (r) => ({ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.3px', background: r==='eg'?'#EDE9FE':'var(--green-l)', color: r==='eg'?'#5B21B6':'var(--green-d)' }),
  }

  return (
    <div>
      <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>Administration</h1>
      <p style={{ fontSize:14, color:'var(--text2)', marginBottom:24 }}>Gérez les accès et la configuration du chantier.</p>

      {/* Utilisateurs */}
      <div style={s.section}>
        <div style={s.title}>
          <UserPlus size={18}/> Utilisateurs ({users.length})
          <button style={{ ...s.btn(), marginLeft:'auto' }} onClick={() => setShow(v=>!v)}>
            <Plus size={14}/> Inviter
          </button>
        </div>

        {showInvite && (
          <div style={{ background:'var(--surface)', borderRadius:12, padding:16, marginBottom:12, border:'1.5px solid var(--green)' }}>
            <form onSubmit={invite}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Prénom *</label><input style={inp} value={invForm.prenom} onChange={e=>setInvForm(f=>({...f,prenom:e.target.value}))} required/></div>
                <div><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Nom *</label><input style={inp} value={invForm.nom} onChange={e=>setInvForm(f=>({...f,nom:e.target.value}))} required/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Email *</label><input style={inp} type="email" value={invForm.email} onChange={e=>setInvForm(f=>({...f,email:e.target.value}))} required/></div>
                <div><label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Entreprise *</label><input style={inp} value={invForm.entreprise} onChange={e=>setInvForm(f=>({...f,entreprise:e.target.value}))} required/></div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Rôle</label>
                <select style={inp} value={invForm.role} onChange={e=>setInvForm(f=>({...f,role:e.target.value}))}>
                  <option value="subcontractor">Sous-traitant</option>
                  <option value="eg">Entreprise Générale</option>
                </select>
              </div>
              {invMsg && <p style={{ fontSize:13, color: invMsg.includes('Erreur')?'var(--red)':'var(--green)', marginBottom:10 }}>{invMsg}</p>}
              <button type="submit" style={s.btn()} disabled={invLoading}>{invLoading?'Envoi…':'Envoyer l\'invitation'}</button>
            </form>
          </div>
        )}

        {users.map(u => (
          <div key={u.id} style={s.card}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'var(--text2)', flexShrink:0 }}>
              {(u.prenom||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{u.prenom} {u.nom}</div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>{u.entreprise} · {u.email}</div>
            </div>
            <span style={s.rolePill(u.role)}>{u.role==='eg'?'EG':'ST'}</span>
            <button style={s.delBtn} onClick={()=>deleteUser(u.id)}><Trash2 size={15}/></button>
          </div>
        ))}
      </div>

      {/* Lots */}
      <div style={s.section}>
        <div style={s.title}>
          📋 Lots ({lots.length})
          <button style={{ ...s.btn('white'), marginLeft:'auto', fontSize:12 }} onClick={importDefaut}>Importer les lots par défaut</button>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input style={{ ...inp, flex:1 }} value={newLot} onChange={e=>setNewLot(e.target.value)} placeholder="Nouveau lot…" onKeyDown={e=>e.key==='Enter'&&addLot()}/>
          <button style={s.btn()} onClick={addLot}><Plus size={14}/> Ajouter</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {lots.map(l => (
            <div key={l.id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px 5px 12px', borderRadius:99, background:'var(--surface)', border:'1px solid var(--border)', fontSize:13, fontWeight:500 }}>
              {l.nom}
              <button onClick={()=>deleteLot(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex', padding:0 }}><Trash2 size={12}/></button>
            </div>
          ))}
          {lots.length===0 && <p style={{ fontSize:13, color:'var(--text3)' }}>Aucun lot — cliquez sur "Importer les lots par défaut"</p>}
        </div>
      </div>
    </div>
  )
}
