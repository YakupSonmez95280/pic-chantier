import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { UserPlus, Trash2, Plus, Link2, Edit2, Check, X, AlertTriangle } from 'lucide-react'

const LOTS_DEFAUT = ['Gros œuvre','Charpente / Couverture','Façade / Isolation','Électricité','Plomberie / CVC','Menuiseries extérieures','Menuiseries intérieures','Peinture / Revêtements','Carrelage / Sols','Serrurerie / Métallerie','Ascenseurs','Espaces verts']
const ROLE_LABEL = { eg:'EG', rt:'RT', subcontractor:'ST' }
const ROLE_COLOR = {
  eg: { bg:'#EDE9FE', color:'#5B21B6' },
  rt: { bg:'var(--blue-l)', color:'var(--blue)' },
  subcontractor: { bg:'var(--green-l)', color:'var(--green-d)' },
}

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit' }

export default function AdminPage() {
  const { chantier } = useAuth()
  const [users, setUsers]         = useState([])
  const [lots, setLots]           = useState([])
  const [zones, setZones]         = useState([])
  const [newLot, setNewLot]       = useState('')
  const [showInvite, setShow]     = useState(false)
  const [invForm, setInvForm]     = useState({ email:'', prenom:'', nom:'', entreprise:'', role:'subcontractor' })
  const [invMsg, setInvMsg]       = useState('')
  const [invLoading, setInvLoading] = useState(false)
  const [delMsg, setDelMsg]       = useState('')
  const [editZone, setEditZone]   = useState(null)
  const [editZoneName, setEditZoneName] = useState('')
  const [showDelHistory, setShowDelHistory] = useState(false)

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('entreprise')
    setUsers(data || [])
  }
  const loadLots = async () => {
    const { data } = await supabase.from('lots').select('*, profiles!lots_rt_id_fkey(prenom,nom)')
      .eq('chantier_id', chantier?.id).order('nom')
    setLots(data || [])
  }
  const loadZones = async () => {
    const { data } = await supabase.from('zones').select('*').eq('chantier_id', chantier?.id).order('nom')
    setZones(data || [])
  }
  useEffect(() => { if (chantier) { loadUsers(); loadLots(); loadZones() } }, [chantier])

  // Inviter un utilisateur
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

  // Supprimer un utilisateur (profil uniquement)
  const deleteUser = async (id, email) => {
    if (!window.confirm(`Supprimer ${email} ?\n\nSupprimez aussi le compte dans Supabase > Authentication > Users.`)) return
    await supabase.from('profiles').delete().eq('id', id)
    setDelMsg('Profil supprimé. Pensez à supprimer aussi dans Supabase > Authentication > Users.')
    setTimeout(() => setDelMsg(''), 6000)
    loadUsers()
  }

  // Changer le rôle d'un utilisateur
  const changeRole = async (id, role) => {
    await supabase.rpc('set_user_role', { user_id: id, new_role: role })
    loadUsers()
  }

  // Assigner un chantier à un utilisateur
  const assignChantier = async (id) => {
    await supabase.rpc('set_user_chantier', { user_id: id, new_chantier_id: chantier?.id })
    loadUsers()
  }

  // Lots
  const addLot = async () => {
    if (!newLot.trim()) return
    await supabase.from('lots').insert({ nom: newLot.trim(), chantier_id: chantier?.id })
    setNewLot(''); loadLots()
  }
  const deleteLot = async (id) => {
    await supabase.from('lots').delete().eq('id', id); loadLots()
  }
  const assignRT = async (lotId, rtId) => {
    await supabase.from('lots').update({ rt_id: rtId || null }).eq('id', lotId); loadLots()
  }
  const importDefaut = async () => {
    const existants = lots.map(l => l.nom)
    const manquants = LOTS_DEFAUT.filter(l => !existants.includes(l))
    if (!manquants.length) return
    await supabase.from('lots').insert(manquants.map(nom => ({ nom, chantier_id: chantier?.id }))); loadLots()
  }

  // Renommer une zone
  const saveZoneName = async (id) => {
    if (!editZoneName.trim()) return
    await supabase.from('zones').update({ nom: editZoneName.trim() }).eq('id', id)
    setEditZone(null); setEditZoneName(''); loadZones()
  }

  // Supprimer tout l'historique des demandes
  const deleteHistory = async () => {
    if (!window.confirm('Supprimer TOUT l\'historique des demandes de ce chantier ? Cette action est irréversible.')) return
    await supabase.from('demandes').delete().eq('chantier_id', chantier?.id)
    setShowDelHistory(false)
    setDelMsg('Historique supprimé.')
    setTimeout(() => setDelMsg(''), 4000)
  }

  const rts = users.filter(u => u.role === 'rt')
  const usersNotOnChantier = users.filter(u => u.chantier_id !== chantier?.id && u.role !== 'eg')

  const s = {
    section: { marginBottom:32 },
    title: { fontSize:16, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8 },
    card: { background:'var(--surface)', borderRadius:12, padding:'12px 14px', marginBottom:8, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:12 },
    btn: (v='green') => ({ padding:'9px 16px', background:v==='green'?'var(--green)':'var(--surface)', color:v==='green'?'#fff':'var(--text)', border:v==='green'?'none':'1.5px solid var(--border)', borderRadius:'var(--r-sm)', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }),
    delBtn: { padding:8, background:'var(--red-l)', color:'var(--red)', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', display:'flex' },
  }

  return (
    <div>
      <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>Administration</h1>
      <p style={{ fontSize:14, color:'var(--text2)', marginBottom:24 }}>Chantier : <strong>{chantier?.nom}</strong></p>

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
              {invMsg && <p style={{ fontSize:13, color:invMsg.includes('Erreur')?'var(--red)':'var(--green)', marginBottom:10 }}>{invMsg}</p>}
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
              {u.chantier_id !== chantier?.id && u.role !== 'eg' && (
                <div style={{ fontSize:11, color:'var(--amber)', marginTop:2 }}>⚠ Non assigné à ce chantier</div>
              )}
            </div>
            {/* Changer rôle */}
            <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
              style={{ fontSize:12, padding:'4px 6px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg)', cursor:'pointer', color:'var(--text)' }}>
              <option value="subcontractor">ST</option>
              <option value="rt">RT</option>
              <option value="eg">EG</option>
            </select>
            {/* Assigner au chantier */}
            {u.chantier_id !== chantier?.id && u.role !== 'eg' && (
              <button onClick={() => assignChantier(u.id)}
                style={{ fontSize:11, padding:'5px 8px', background:'var(--green-l)', color:'var(--green-d)', border:'none', borderRadius:6, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                + Ce chantier
              </button>
            )}
            <button style={s.delBtn} onClick={()=>deleteUser(u.id, u.email)}><Trash2 size={15}/></button>
          </div>
        ))}
      </div>

      {/* Zones — renommage */}
      <div style={s.section}>
        <div style={s.title}><Link2 size={18}/> Zones de stockage ({zones.length})</div>
        {zones.length === 0
          ? <p style={{ fontSize:13, color:'var(--text3)' }}>Dessinez des zones sur le PIC pour les voir ici.</p>
          : zones.map(z => (
            <div key={z.id} style={s.card}>
              {editZone === z.id ? (
                <>
                  <input style={{ ...inp, flex:1 }} value={editZoneName} onChange={e=>setEditZoneName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveZoneName(z.id)} autoFocus/>
                  <button onClick={()=>saveZoneName(z.id)} style={{ ...s.btn(), padding:8 }}><Check size={15}/></button>
                  <button onClick={()=>{setEditZone(null);setEditZoneName('')}} style={{ ...s.delBtn }}><X size={15}/></button>
                </>
              ) : (
                <>
                  <div style={{ flex:1, fontSize:14, fontWeight:500 }}>{z.nom}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background: z.etat==='libre'?'var(--green-l)':z.etat==='occupee'?'var(--amber-l)':'var(--red-l)', color: z.etat==='libre'?'var(--green)':z.etat==='occupee'?'var(--amber)':'var(--red)', fontWeight:600 }}>
                    {z.etat==='libre'?'Libre':z.etat==='occupee'?'Occupée':'Bloquée'}
                  </span>
                  <button onClick={()=>{setEditZone(z.id);setEditZoneName(z.nom)}} style={{ padding:8, background:'var(--blue-l)', color:'var(--blue)', border:'none', borderRadius:6, cursor:'pointer', display:'flex' }}><Edit2 size={14}/></button>
                </>
              )}
            </div>
          ))
        }
      </div>

      {/* Lots */}
      <div style={s.section}>
        <div style={s.title}>
          📋 Lots ({lots.length})
          <button style={{ ...s.btn('white'), marginLeft:'auto', fontSize:12 }} onClick={importDefaut}>Importer par défaut</button>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input style={{ ...inp, flex:1 }} value={newLot} onChange={e=>setNewLot(e.target.value)} placeholder="Nouveau lot…" onKeyDown={e=>e.key==='Enter'&&addLot()}/>
          <button style={s.btn()} onClick={addLot}><Plus size={14}/> Ajouter</button>
        </div>
        {lots.map(l => (
          <div key={l.id} style={s.card}>
            <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{l.nom}</div>
            <select value={l.rt_id||''} onChange={e=>assignRT(l.id,e.target.value)}
              style={{ ...inp, width:180, padding:'6px 8px', fontSize:12 }}>
              <option value="">— Aucun RT —</option>
              {rts.map(rt=><option key={rt.id} value={rt.id}>{rt.prenom} {rt.nom}</option>)}
            </select>
            <button style={s.delBtn} onClick={()=>deleteLot(l.id)}><Trash2 size={15}/></button>
          </div>
        ))}
        {rts.length===0 && <div style={{ fontSize:13, color:'var(--amber)', background:'var(--amber-l)', padding:'10px 14px', borderRadius:8, marginTop:8 }}>💡 Invitez d'abord un utilisateur avec le rôle RT pour pouvoir l'assigner à un lot.</div>}
      </div>

      {/* Zone dangereuse */}
      <div style={{ ...s.section, borderTop:'1px solid var(--border)', paddingTop:24 }}>
        <div style={s.title}><AlertTriangle size={18} color="var(--red)"/> Zone dangereuse</div>
        <div style={{ background:'var(--red-l)', borderRadius:12, padding:16, border:'1px solid var(--red)' }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--red)', marginBottom:6 }}>Supprimer l'historique des demandes</div>
          <p style={{ fontSize:13, color:'var(--red)', marginBottom:12, opacity:0.8 }}>
            Supprime définitivement toutes les demandes de livraison de ce chantier. Le planning sera vidé. Action irréversible.
          </p>
          <button onClick={deleteHistory}
            style={{ padding:'9px 16px', background:'var(--red)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
            🗑️ Supprimer tout l'historique
          </button>
        </div>
      </div>
    </div>
  )
}
