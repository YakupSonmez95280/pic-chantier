// Ce fichier remplace le formulaire dans PicPage.js
// Les règles sont vérifiées côté client ET confirmées côté serveur (Supabase)

import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { X, AlertTriangle } from 'lucide-react'
import { addDays, format, parseISO, differenceInHours } from 'date-fns'

const LOTS_DEFAUT = ['Gros œuvre','Charpente / Couverture','Façade / Isolation','Électricité','Plomberie / CVC','Menuiseries extérieures','Menuiseries intérieures','Peinture / Revêtements','Carrelage / Sols','Serrurerie / Métallerie','Ascenseurs','Espaces verts','Autre']
const CRENEAUX   = ['6h00–8h00','8h00–10h00','10h00–12h00','12h00–14h00','14h00–16h00','16h00–18h00']

function inp(extra) {
  return { width:'100%', padding:'10px 13px', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)', fontFamily:'inherit', ...extra }
}

// Calcule la date minimale (aujourd'hui + 48h)
function getMinDate() {
  return format(addDays(new Date(), 2), 'yyyy-MM-dd')
}

export default function FormulaireModal({ zone, lots, onClose, onSubmit }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    entreprise: profile?.entreprise || '',
    lot: lots[0] || LOTS_DEFAUT[0],
    nom: profile?.nom || '',
    prenom: profile?.prenom || '',
    email_demandeur: profile?.email || '',
    type_livraison: '',
    date_souhaitee: '',
    creneau: CRENEAUX[0],
    quantite: '',
    notes: '',
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [warnings, setWarnings] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const minDate = getMinDate()

  // Vérification des règles dès que date ou créneau change
  useEffect(() => {
    if (!form.date_souhaitee) return
    async function check() {
      const w = []

      // Règle 1 : 48h à l'avance
      const dateChoisie = new Date(form.date_souhaitee + 'T08:00')
      const diffH = differenceInHours(dateChoisie, new Date())
      if (diffH < 48) {
        w.push('Cette date ne respecte pas le délai minimum de 48h à l\'avance.')
      }

      // Règle 2 : max 3 livraisons ce jour-là
      const { data: sameDay } = await supabase
        .from('demandes')
        .select('id')
        .eq('date_souhaitee', form.date_souhaitee)
        .in('statut', ['en_attente', 'validee'])
      if (sameDay && sameDay.length >= 3) {
        w.push(`Le maximum de 3 livraisons est déjà atteint pour le ${form.date_souhaitee}.`)
      }

      // Règle 3 : pas deux livraisons au même créneau
      const { data: sameSlot } = await supabase
        .from('demandes')
        .select('id, entreprise')
        .eq('date_souhaitee', form.date_souhaitee)
        .eq('creneau', form.creneau)
        .in('statut', ['en_attente', 'validee'])
      if (sameSlot && sameSlot.length > 0) {
        w.push(`Le créneau ${form.creneau} est déjà occupé par ${sameSlot[0].entreprise} ce jour-là.`)
      }

      setWarnings(w)
    }
    check()
  }, [form.date_souhaitee, form.creneau])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type_livraison || !form.date_souhaitee || !form.quantite) {
      setError('Merci de remplir tous les champs obligatoires (*)'); return
    }

    // Bloquer si règles non respectées
    const dateChoisie = new Date(form.date_souhaitee + 'T08:00')
    if (differenceInHours(dateChoisie, new Date()) < 48) {
      setError('La date doit être au minimum 48h à l\'avance.'); return
    }

    const { data: sameDay } = await supabase
      .from('demandes').select('id')
      .eq('date_souhaitee', form.date_souhaitee)
      .in('statut', ['en_attente', 'validee'])
    if (sameDay && sameDay.length >= 3) {
      setError('Le maximum de 3 livraisons par jour est atteint pour cette date.'); return
    }

    const { data: sameSlot } = await supabase
      .from('demandes').select('id, entreprise')
      .eq('date_souhaitee', form.date_souhaitee)
      .eq('creneau', form.creneau)
      .in('statut', ['en_attente', 'validee'])
    if (sameSlot && sameSlot.length > 0) {
      setError(`Le créneau ${form.creneau} est déjà pris par ${sameSlot[0].entreprise} ce jour-là.`); return
    }

    setLoading(true); setError('')
    const { error: err } = await supabase.from('demandes').insert({
      zone_id: zone.id,
      zone_nom: zone.nom,
      ...form,
      statut: 'en_attente',
    })
    if (err) { setError('Erreur : ' + err.message); setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.REACT_APP_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ type: 'alerte_eg', demande: { zone_nom: zone.nom, ...form } })
    }).catch(err => console.error('Email error:', err))

    setLoading(false)
    onSubmit()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--surface)', borderRadius:'16px 16px 0 0', padding:24, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700 }}>Demande de livraison</h2>
            <p style={{ fontSize:13, color:'var(--text2)' }}>Zone : <strong>{zone.nom}</strong></p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', display:'flex', cursor:'pointer' }}><X size={22}/></button>
        </div>

        {/* Règles info */}
        <div style={{ padding:'10px 12px', background:'var(--blue-l)', borderRadius:8, marginBottom:14, fontSize:12, color:'var(--blue)' }}>
          <strong>Règles :</strong> délai minimum 48h · max 3 livraisons/jour · pas de doublon de créneau
        </div>

        {error && <div style={{ fontSize:13, color:'var(--red)', background:'var(--red-l)', padding:'10px 12px', borderRadius:8, marginBottom:12 }}>{error}</div>}

        {/* Alertes en temps réel */}
        {warnings.length > 0 && (
          <div style={{ padding:'10px 12px', background:'var(--amber-l)', borderRadius:8, marginBottom:12 }}>
            {warnings.map((w,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, fontSize:12, color:'var(--amber)', marginBottom: i < warnings.length-1 ? 4 : 0 }}>
                <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/> {w}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Entreprise *</label>
              <input style={inp()} value={form.entreprise} onChange={e=>set('entreprise',e.target.value)} required/>
            </div>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Lot *</label>
              <select style={inp()} value={form.lot} onChange={e=>set('lot',e.target.value)}>
                {(lots.length > 0 ? lots : LOTS_DEFAUT).map(l=><option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Prénom *</label>
              <input style={inp()} value={form.prenom} onChange={e=>set('prenom',e.target.value)} required/>
            </div>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Nom *</label>
              <input style={inp()} value={form.nom} onChange={e=>set('nom',e.target.value)} required/>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Email *</label>
            <input style={inp()} type="email" value={form.email_demandeur} onChange={e=>set('email_demandeur',e.target.value)} required/>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Type de livraison *</label>
            <input style={inp()} value={form.type_livraison} onChange={e=>set('type_livraison',e.target.value)} placeholder="ex : Béton C25/30, Ferraillage HA12…" required/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>
                Date * <span style={{ fontSize:11, color:'var(--text3)' }}>(min +48h)</span>
              </label>
              <input style={{ ...inp(), borderColor: form.date_souhaitee && form.date_souhaitee < minDate ? 'var(--red)' : 'var(--border)' }}
                type="date" value={form.date_souhaitee} min={minDate} onChange={e=>set('date_souhaitee',e.target.value)} required/>
            </div>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Créneau *</label>
              <select style={inp()} value={form.creneau} onChange={e=>set('creneau',e.target.value)}>
                {CRENEAUX.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Quantité *</label>
              <input style={inp()} value={form.quantite} onChange={e=>set('quantite',e.target.value)} placeholder="ex : 3 palettes…" required/>
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Remarques</label>
            <textarea style={{ ...inp(), resize:'none' }} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Informations complémentaires…"/>
          </div>

          <button type="submit" disabled={loading || warnings.some(w => w.includes('maximum') || w.includes('48h') || w.includes('occupé'))}
            style={{ width:'100%', padding:13, background:'var(--green)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:15, fontWeight:600,
              opacity: (loading || warnings.some(w => w.includes('maximum') || w.includes('48h') || w.includes('occupé'))) ? 0.5 : 1 }}>
            {loading ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </div>
  )
}
