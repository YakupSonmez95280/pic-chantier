import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

const COLORS = [
  ['#E1F5EE','#0F6E56'], ['#E6F1FB','#185FA5'], ['#FAEEDA','#854F0B'],
  ['#EDE9FE','#5B21B6'], ['#FBEAEA','#8B2020'], ['#EAF3DE','#3B6D11'],
  ['#F3E8FF','#7C3AED'], ['#FFF3E0','#E65100'],
]

export default function PlanningPage() {
  const { profile } = useAuth()
  const isEG = profile?.role === 'eg'
  const [month, setMonth]       = useState(new Date())
  const [demandes, setDemandes] = useState([])
  const [selected, setSelected] = useState(null)
  const [zoneColors, setZoneColors] = useState({})

  useEffect(() => {
    async function load() {
      const debut = format(startOfMonth(month), 'yyyy-MM-dd')
      const fin   = format(endOfMonth(month),   'yyyy-MM-dd')
      let q = supabase.from('demandes').select('*')
        .eq('statut', 'validee')
        .gte('date_souhaitee', debut)
        .lte('date_souhaitee', fin)
      if (!isEG) q = q.eq('email_demandeur', profile?.email)
      const { data } = await q.order('date_souhaitee')
      setDemandes(data || [])

      // Associer une couleur à chaque zone
      const zones = [...new Set((data || []).map(d => d.zone_nom))]
      const map = {}
      zones.forEach((z, i) => { map[z] = COLORS[i % COLORS.length] })
      setZoneColors(map)
    }
    if (profile) load()
  }, [month, profile, isEG])

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })

  // Offset pour le premier jour (lundi = 0)
  const firstDow = (startOfMonth(month).getDay() + 6) % 7

  const demandesForDay = (day) => demandes.filter(d => isSameDay(new Date(d.date_souhaitee + 'T12:00'), day))

  return (
    <div>
      {/* Header mois */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Planning des livraisons</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setMonth(m => subMonths(m,1))}
            style={{ padding:6, border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', display:'flex', cursor:'pointer' }}><ChevronLeft size={18}/></button>
          <span style={{ fontWeight:600, fontSize:15, minWidth:130, textAlign:'center' }}>
            {format(month, 'MMMM yyyy', { locale: fr })}
          </span>
          <button onClick={() => setMonth(m => addMonths(m,1))}
            style={{ padding:6, border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', display:'flex', cursor:'pointer' }}><ChevronRight size={18}/></button>
          <button onClick={() => setMonth(new Date())}
            style={{ padding:'6px 12px', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', fontSize:12, fontWeight:500, cursor:'pointer', color:'var(--text2)' }}>
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Grille calendrier */}
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
        {/* Jours de la semaine */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'var(--surface2)' }}>
          {['L','M','M','J','V','S','D'].map((d,i) => (
            <div key={i} style={{ padding:'8px 0', textAlign:'center', fontSize:12, fontWeight:600, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{d}</div>
          ))}
        </div>

        {/* Cases */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {/* Espaces vides avant le 1er */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={'e'+i} style={{ minHeight:80, borderRight:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', background:'var(--bg)', opacity:0.5 }}/>
          ))}

          {days.map((day, i) => {
            const dayDemandes = demandesForDay(day)
            const todayStyle  = isToday(day) ? { background:'var(--green-l)' } : {}

            return (
              <div key={i} style={{ minHeight:80, padding:'6px 4px', borderRight:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', ...todayStyle }}>
                <div style={{ fontSize:12, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? 'var(--green)' : 'var(--text2)', marginBottom:4, textAlign:'right', paddingRight:4 }}>
                  {format(day, 'd')}
                </div>
                {dayDemandes.slice(0, 3).map(d => {
                  const [bg, tc] = zoneColors[d.zone_nom] || COLORS[0]
                  return (
                    <div key={d.id} onClick={() => setSelected(d)}
                      style={{ fontSize:10, fontWeight:500, padding:'2px 5px', borderRadius:3, marginBottom:2, cursor:'pointer', background:bg, color:tc, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:'14px' }}
                      title={`${d.entreprise} – ${d.type_livraison} – ${d.creneau}`}>
                      {d.zone_nom.split('–')[0].trim()} · {d.entreprise}
                    </div>
                  )
                })}
                {dayDemandes.length > 3 && (
                  <div style={{ fontSize:10, color:'var(--text3)', paddingLeft:5 }}>+{dayDemandes.length-3} autre{dayDemandes.length-3>1?'s':''}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Légende zones */}
      {Object.keys(zoneColors).length > 0 && (
        <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
          {Object.entries(zoneColors).map(([zone, [bg, tc]]) => (
            <div key={zone} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:bg, border:`1.5px solid ${tc}` }}/>
              <span style={{ color:'var(--text2)' }}>{zone}</span>
            </div>
          ))}
        </div>
      )}

      {/* Récap du mois */}
      <div style={{ marginTop:20, background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Récapitulatif — {demandes.length} livraison{demandes.length !== 1 ? 's' : ''} validée{demandes.length !== 1 ? 's' : ''}</span>
        </div>
        {demandes.length === 0
          ? <p style={{ padding:'20px 16px', color:'var(--text3)', fontSize:13, textAlign:'center' }}>Aucune livraison validée ce mois</p>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--surface2)' }}>
                    {['Date','Créneau','Entreprise','Lot','Zone','Livraison','Quantité'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:600, color:'var(--text2)', fontSize:12, whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demandes.map(d => {
                    const [bg, tc] = zoneColors[d.zone_nom] || COLORS[0]
                    return (
                      <tr key={d.id} style={{ borderBottom:'1px solid var(--border)' }} onClick={() => setSelected(d)}>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{d.date_souhaitee}</td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap', color:'var(--text2)' }}>{d.creneau}</td>
                        <td style={{ padding:'8px 12px', fontWeight:500 }}>{d.entreprise}</td>
                        <td style={{ padding:'8px 12px', color:'var(--text2)' }}>{d.lot}</td>
                        <td style={{ padding:'8px 12px' }}><span style={{ padding:'2px 8px', borderRadius:4, background:bg, color:tc, fontWeight:600, fontSize:12 }}>{d.zone_nom}</span></td>
                        <td style={{ padding:'8px 12px', color:'var(--text2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.type_livraison}</td>
                        <td style={{ padding:'8px 12px', color:'var(--text2)' }}>{d.quantite}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Modal détail */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background:'var(--surface)', borderRadius:16, padding:24, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Détail livraison</h2>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:20 }}>×</button>
            </div>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <tbody>
                {[['Entreprise',selected.entreprise],['Lot',selected.lot],['Demandeur',`${selected.prenom} ${selected.nom}`],['Email',selected.email_demandeur],['Zone',selected.zone_nom],['Livraison',selected.type_livraison],['Date',selected.date_souhaitee],['Créneau',selected.creneau],['Quantité',selected.quantite],['Remarques',selected.notes||'—']].map(([k,v])=>(
                  <tr key={k} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 8px', color:'var(--text3)', width:110 }}>{k}</td>
                    <td style={{ padding:'7px 8px', fontWeight:500 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
