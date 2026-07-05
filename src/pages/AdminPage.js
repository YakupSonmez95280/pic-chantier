import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, Trash2, Plus, Link2 } from 'lucide-react'

const LOTS_DEFAUT = ['Gros œuvre','Charpente / Couverture','Façade / Isolation','Électricité','Plomberie / CVC','Menuiseries extérieures','Menuiseries intérieures','Peinture / Revêtements','Carrelage / Sols','Serrurerie / Métallerie','Ascenseurs','Espaces verts']

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }

const ROLE_LABEL = { eg:'EG', rt:'RT', subcontractor:'ST' }
const ROLE_COLOR = {
  eg: { bg:'#EDE9FE', color:'#5B21B6' },
  rt: { bg:'var(--blue-l)', color:'var(--blue)' },
  subcontractor: { bg:'var(--green-l)', color:'var(--green-d)' },
}

export default function AdminPage() {
  const [users, setUsers]       = useState([])
  const [lots, setLots]         = useState([])
  const [newLot, setNewLot]     = useState('')
  const [showInvite, setShow]   = useState(false)
  const [invForm, setInvForm]   = useState({ email:'', prenom:'', nom:'', entreprise:'', role:'subcontractor' })
  const [invMsg, setInvMsg]     = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [delMsg, setDelMsg]     = useState('')

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('entreprise')
    setUsers(data || [])
  }
  const loadLots = async () => {
    const { data } = await supabase.from('lots').select('*, profiles!lots_rt_id_fkey(prenom,nom)').order('nom')
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

  const deleteUser = async (id, email) => {
    if (!window.confirm(`Supprimer ${email} ?\n\nLe compte de connexion doit être supprimé manuellement dans Supabase > Authentication > Users (limitation de sécurité).`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { setDelMsg('Erreur : ' + error.message); return }
    setDelMsg('Profil supprimé. Pensez à supprimer aussi le compte dans Supabase > Authentication > Users.')
    loadUsers()
    setTimeout(() => setDelMsg(''), 6000)
  }

  const addLot = async () => {
    if (!newLot.trim()) return
    const { data } = await supabase.from('lots').insert({ nom: newLot.trim() }).select().single()
    if (data) setLots(prev => [...prev, data])
    setNewLot('')
  }

  const deleteLot = async (id) => {
    await supabase.from('lots').delete().eq('id', id); loadLots()
  }

  const assignRT = async (lotId, rtId) => {
    await supabase.from('lots').update({ rt_id: rtId || null }).eq('id', lotId)
    loadLots()
  }

  const importDefaut = async () => {
    const existants = lots.map(l => l.nom)
    const manquants = LOTS_DEFAUT.filter(l => !existants.includes(l))
    if (!manquants.length) return
    await supabase.from('lots').insert(manquants.map(nom => ({ nom })))
    loadLots()
  }

  const rts = users.filter(u => u.role === 'rt')

  const s = {
    section: { marginBottom:32 },
    title: { fontSize:16, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8, color:'var(--text)' },
    card: { background:'var(--surface)', borderRadius:12, padding:'12px 14px', marginBottom:8, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:12 },
    btn: (v='green') => ({ padding:'9px 16px', background: v==='green'?'var(--green)':'var(--surface)', color: v==='green'?'#fff':'var(--text)', border: v==='green'?'none':'1.5px solid var(--border)', borderRadius:'var(--r-sm)', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }),
    delBtn: { padding:8, background:'var(--red-l)', color:'var(--red)', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', display:'flex' },
    rolePill: (r) => ({ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.3px', ...(ROLE_COLOR[r] || ROLE_COLOR.subcontractor) }),
  }

  return (
    <div>
      <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>Administration</h1>
      <p style={{ fontSize:14, color:'var(--text2)', marginBottom:24 }}>Gérez les accès, les responsables de travaux et la configuration du chantier.</p>

      {delMsg && <div style={{ fontSize:13, color:'var(--amber)', background:'var(--amber-l)', padding:'10px 14px', borderRadius:8, marginBottom:16 }}>{delMsg}</div>}

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
                  <option value="rt">Responsable de Travaux</option>
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
            <span style={s.rolePill(u.role)}>{ROLE_LABEL[u.role] || u.role}</span>
            <button style={s.delBtn} onClick={()=>deleteUser(u.id, u.email)}><Trash2 size={15}/></button>
          </div>
        ))}
      </div>

      {/* Lots + assignation RT */}
      <div style={s.section}>
        <div style={s.title}>
          <Link2 size={18}/> Lots & Responsables de travaux ({lots.length})
          <button style={{ ...s.btn('white'), marginLeft:'auto', fontSize:12 }} onClick={importDefaut}>Importer les lots par défaut</button>
        </div>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>
          Assignez un Responsable de Travaux à chaque lot. Les demandes de livraison de ce lot ne seront visibles et validables que par lui (et par vous en tant qu'EG).
        </p>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input style={{ ...inp, flex:1 }} value={newLot} onChange={e=>setNewLot(e.target.value)} placeholder="Nouveau lot…" onKeyDown={e=>e.key==='Enter'&&addLot()}/>
          <button style={s.btn()} onClick={addLot}><Plus size={14}/> Ajouter</button>
        </div>

        {lots.length === 0
          ? <p style={{ fontSize:13, color:'var(--text3)' }}>Aucun lot — cliquez sur "Importer les lots par défaut"</p>
          : lots.map(l => (
            <div key={l.id} style={s.card}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{l.nom}</div>
              </div>
              <select
                value={l.rt_id || ''}
                onChange={e => assignRT(l.id, e.target.value)}
                style={{ ...inp, width:220, padding:'7px 10px', fontSize:13 }}>
                <option value="">— Aucun RT assigné —</option>
                {rts.map(rt => <option key={rt.id} value={rt.id}>{rt.prenom} {rt.nom}</option>)}
              </select>
              <button style={s.delBtn} onClick={()=>deleteLot(l.id)}><Trash2 size={15}/></button>
            </div>
          ))
        }

        {rts.length === 0 && (
          <div style={{ marginTop:10, fontSize:13, color:'var(--amber)', background:'var(--amber-l)', padding:'10px 14px', borderRadius:8 }}>
            💡 Aucun Responsable de Travaux créé pour l'instant. Invitez-en un ci-dessus avec le rôle "Responsable de Travaux" pour pouvoir l'assigner à un lot.
          </div>
        )}
      </div>
    </div>
  )
}
