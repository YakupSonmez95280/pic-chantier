import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, RotateCcw, Unlock } from 'lucide-react'

const STATUS = {
  en_attente: { label:'En attente', color:'var(--amber)', bg:'var(--amber-l)' },
  validee:    { label:'Validée',    color:'var(--green)', bg:'var(--green-l)' },
  refusee:    { label:'Refusée',    color:'var(--red)',   bg:'var(--red-l)'   },
  annulee:    { label:'Annulée',    color:'var(--text3)', bg:'var(--surface2)' },
}

const FILTERS = [
  { k:'all',        l:'Toutes' },
  { k:'en_attente', l:'En attente' },
  { k:'validee',    l:'Validées' },
  { k:'refusee',    l:'Refusées' },
  { k:'annulee',    l:'Annulées' },
]

function Row({ d, onAction, profile }) {
  const [open, setOpen]           = useState(false)
  const [motif, setMotif]         = useState('')
  const [showRefus, setShowRefus] = useState(false)
  const [loading, setLoading]     = useState(false)
  const isEG = profile?.role === 'eg'
  const isRT = profile?.role === 'rt'
  const canAct = isEG || isRT
  const sm = STATUS[d.statut] || STATUS.en_attente

  const update = async (statut, commentaire = null, libererZone = false) => {
    setLoading(true)
    await supabase.from('demandes').update({ statut, commentaire_eg: commentaire, valide_par: profile.id }).eq('id', d.id)
    if (libererZone && d.zone_id) {
      const { data: autresValidees } = await supabase.from('demandes').select('id').eq('zone_id', d.zone_id).eq('statut', 'validee').neq('id', d.id)
      if (!autresValidees || autresValidees.length === 0) {
        await supabase.from('zones').update({ etat: 'libre' }).eq('id', d.zone_id)
      }
    }
    if (statut === 'validee' || statut === 'refusee' || statut === 'annulee') {
      const type = statut === 'validee' ? 'validation_st' : statut === 'refusee' ? 'refus_st' : 'annulation_st'
      const emailPayload = { type, demande: { ...d, commentaire_eg: commentaire, valide_par: profile.id } }
      supabase.functions.invoke('send-email', {
        body: JSON.stringify(emailPayload),
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Email error:', err))
    }
    setLoading(false); setShowRefus(false); onAction()
  }

  return (
    <div style={{ background:'var(--surface)', borderRadius:12, marginBottom:10, boxShadow:'var(--shadow)', overflow:'hidden' }}>
      <div onClick={() => setOpen(v=>!v)} style={{ padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--text3)' }}>#{d.id.slice(0,8)}</span>
            <span style={{ fontSize:12, fontWeight:600, padding:'3px 8px', borderRadius:99, background:sm.bg, color:sm.color }}>{sm.label}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'var(--surface2)', color:'var(--text2)' }}>{d.lot}</span>
            {d.statut === 'en_attente' && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:99, background:'var(--amber-l)', color:'var(--amber)', display:'flex', alignItems:'center', gap:3 }}><AlertTriangle size={11}/>À traiter</span>}
          </div>
          <div style={{ fontSize:14, fontWeight:600 }}>{d.type_livraison}</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{d.entreprise} · {d.zone_nom} · {d.date_souhaitee} · {d.creneau}</div>
        </div>
        {open ? <ChevronUp size={18} color="var(--text3)"/> : <ChevronDown size={18} color="var(--text3)"/>}
      </div>

      {open && (
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ overflowX:'auto', marginTop:12 }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <tbody>
                {[['Entreprise',d.entreprise],['Lot',d.lot],['Demandeur',`${d.prenom} ${d.nom}`],['Email',d.email_demandeur],['Livraison',d.type_livraison],['Date',d.date_souhaitee],['Créneau',d.creneau],['Quantité',d.quantite],['Zone',d.zone_nom],['Remarques',d.notes||'—']].map(([k,v])=>(
                  <tr key={k} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 10px', color:'var(--text3)', fontWeight:500, width:120, verticalAlign:'top', fontSize:12 }}>{k}</td>
                    <td style={{ padding:'7px 10px', color:'var(--text)', fontWeight:500, fontSize:13 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {d.commentaire_eg && (
            <div style={{ marginTop:10, padding:'10px 12px', background:'var(--red-l)', borderRadius:8, fontSize:13, color:'var(--red)', display:'flex', gap:8 }}>
              <XCircle size={15} style={{ flexShrink:0, marginTop:1 }}/> {d.commentaire_eg}
            </div>
          )}

          {canAct && (
            <div style={{ marginTop:14 }}>
              {d.statut === 'en_attente' && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => update('validee')} disabled={loading}
                    style={{ flex:1, padding:'10px', background:'var(--green)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
                    <CheckCircle size={15}/> Valider
                  </button>
                  <button onClick={() => setShowRefus(v=>!v)} disabled={loading}
                    style={{ flex:1, padding:'10px', background:'var(--red-l)', color:'var(--red)', border:'1px solid var(--red)', borderRadius:8, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
                    <XCircle size={15}/> Refuser
                  </button>
                </div>
              )}
              {d.statut === 'validee' && isEG && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={() => { if(window.confirm('Annuler cette livraison validée ?')) update('annulee','Annulée par l\'EG',false) }} disabled={loading}
                    style={{ flex:1, padding:'10px', background:'var(--amber-l)', color:'var(--amber)', border:'1px solid var(--amber)', borderRadius:8, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
                    <RotateCcw size={15}/> Annuler la livraison
                  </button>
                  <button onClick={() => { if(window.confirm('Annuler ET libérer la zone ?')) update('annulee','Annulée par l\'EG — zone libérée',true) }} disabled={loading}
                    style={{ flex:1, padding:'10px', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
                    <Unlock size={15}/> Annuler + libérer zone
                  </button>
                </div>
              )}
              {(d.statut === 'refusee' || d.statut === 'annulee') && isEG && (
                <button onClick={() => update('en_attente', null)} disabled={loading}
                  style={{ width:'100%', padding:'10px', background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
                  <RotateCcw size={15}/> Remettre en attente
                </button>
              )}
              {showRefus && (
                <div style={{ marginTop:10 }}>
                  <textarea value={motif} onChange={e=>setMotif(e.target.value)} rows={2} placeholder="Motif du refus (obligatoire)"
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid var(--red)', borderRadius:8, fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', color:'var(--text)' }}/>
                  <button onClick={() => { if(motif.trim()) update('refusee', motif) }} disabled={!motif.trim()||loading}
                    style={{ marginTop:6, width:'100%', padding:'10px', background:'var(--red)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, opacity:motif.trim()?1:0.5, cursor:'pointer' }}>
                    Confirmer le refus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DemandesPage() {
  const { profile } = useAuth()
  const isEG = profile?.role === 'eg'
  const isRT = profile?.role === 'rt'
  const [demandes, setDemandes] = useState([])
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('demandes').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('statut', filter)
    const { data } = await q
    setDemandes(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const pending = demandes.filter(d => d.statut === 'en_attente').length

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>
          Demandes{pending > 0 && <span style={{ marginLeft:8, fontSize:13, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'var(--amber-l)', color:'var(--amber)' }}>{pending} en attente</span>}
        </h1>
      </div>
      {isEG && (
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16, padding:'10px 14px', background:'var(--surface2)', borderRadius:8 }}>
          <strong>Vue EG — Contrôle total</strong> : valider, refuser, annuler, remettre en attente, et libérer les zones de stockage.
        </div>
      )}
      {isRT && <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Vous voyez uniquement les demandes de vos lots assignés.</p>}

      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:10, marginBottom:14 }}>
        {FILTERS.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ flexShrink:0, padding:'6px 14px', borderRadius:99, fontSize:13, fontWeight:500, cursor:'pointer', border:'1.5px solid',
              borderColor: filter===f.k ? 'var(--green)' : 'var(--border)',
              background:  filter===f.k ? 'var(--green-l)' : 'var(--surface)',
              color:       filter===f.k ? 'var(--green-d)' : 'var(--text2)' }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading
        ? <p style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:14 }}>Chargement…</p>
        : demandes.length === 0
          ? <p style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:14 }}>Aucune demande</p>
          : demandes.map(d => <Row key={d.id} d={d} onAction={load} profile={profile}/>)
      }
    </div>
  )
}
