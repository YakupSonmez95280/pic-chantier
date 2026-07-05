import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  startOfMonth, endOfMonth, isSameDay, addWeeks, subWeeks,
  addMonths, subMonths, isToday
} from 'date-fns'
import { fr } from 'date-fns/locale'

const CRENEAUX = ['6h00–8h00','8h00–10h00','10h00–12h00','12h00–14h00','14h00–16h00','16h00–18h00']
const COLORS = [
  ['#D4EDDF','#0F6E56'],['#E0ECFC','#185FA5'],['#FDF0DC','#854F0B'],
  ['#EDE9FE','#5B21B6'],['#FBEAEA','#8B2020'],['#EAF3DE','#3B6D11'],
]

// ── Vue SEMAINE ──────────────────────────────────────────
function VueSemaine({ demandes, weekStart, zoneColors, onSelect }) {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
    .filter(d => d.getDay() !== 0 && d.getDay() !== 6) // sans samedi (6) et dimanche (0)

  const demandesForSlot = (day, slot) =>
    demandes.filter(d =>
      isSameDay(new Date(d.date_souhaitee + 'T12:00'), day) && d.creneau === slot
    )

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600, fontSize:12 }}>
        <thead>
          <tr style={{ background:'#1a4c8b' }}>
            <th style={{ padding:'8px 6px', color:'#fff', fontWeight:700, fontSize:12, width:90, border:'1px solid #1a4c8b' }}>Créneau</th>
            {days.map(d => (
              <th key={d.toISOString()} style={{ padding:'8px 6px', color:'#fff', fontWeight:700, fontSize:12, textAlign:'center', border:'1px solid #1a4c8b', background: isToday(d) ? '#0F6E56' : '#1a4c8b' }}>
                {format(d, 'EEE d MMM', { locale: fr })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRENEAUX.map((slot, si) => (
            <tr key={slot} style={{ background: si % 2 === 0 ? '#fff' : '#f8f8f6' }}>
              <td style={{ padding:'6px 8px', fontWeight:600, color:'#1a4c8b', border:'1px solid #ddd', fontSize:11, whiteSpace:'nowrap' }}>{slot}</td>
              {days.map(d => {
                const dels = demandesForSlot(d, slot)
                return (
                  <td key={d.toISOString()} style={{ padding:'4px', border:'1px solid #ddd', verticalAlign:'top', minHeight:40 }}>
                    {dels.map(del => {
                      const [bg, tc] = zoneColors[del.zone_nom] || COLORS[0]
                      return (
                        <div key={del.id} onClick={() => onSelect(del)}
                          style={{ background:bg, color:tc, borderRadius:4, padding:'3px 6px', marginBottom:2, cursor:'pointer', fontSize:11, fontWeight:500, lineHeight:1.3 }}>
                          <div style={{ fontWeight:700 }}>{del.entreprise}</div>
                          <div style={{ opacity:0.8 }}>{del.zone_nom?.split('–')[0]?.trim()}</div>
                        </div>
                      )
                    })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Vue MOIS ─────────────────────────────────────────────
function VueMois({ demandes, month, zoneColors, onSelect }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const firstDow = (startOfMonth(month).getDay() + 6) % 7

  return (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'var(--surface2)' }}>
        {['L','M','M','J','V','S','D'].map((d,i) => (
          <div key={i} style={{ padding:'8px 0', textAlign:'center', fontSize:12, fontWeight:600, color:'var(--text3)', borderBottom:'1px solid var(--border)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={'e'+i} style={{ minHeight:70, borderRight:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', background:'var(--bg)', opacity:0.5 }}/>
        ))}
        {days.map((day, i) => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const dayDels = isWeekend ? [] : demandes.filter(d => isSameDay(new Date(d.date_souhaitee + 'T12:00'), day))
          return (
            <div key={i} style={{ minHeight:70, padding:'4px', borderRight:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', background: isToday(day) ? 'var(--green-l)' : isWeekend ? 'var(--surface2)' : 'white' }}>
              <div style={{ fontSize:11, fontWeight: isToday(day)?700:400, color: isToday(day)?'var(--green)':'var(--text3)', textAlign:'right', paddingRight:2, marginBottom:2 }}>
                {format(day, 'd')}
              </div>
              {dayDels.slice(0,2).map(d => {
                const [bg,tc] = zoneColors[d.zone_nom] || COLORS[0]
                return (
                  <div key={d.id} onClick={() => onSelect(d)}
                    style={{ fontSize:9, fontWeight:500, padding:'2px 4px', borderRadius:3, marginBottom:1, cursor:'pointer', background:bg, color:tc, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {d.entreprise}
                  </div>
                )
              })}
              {dayDels.length > 2 && <div style={{ fontSize:9, color:'var(--text3)' }}>+{dayDels.length-2}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PlanningPage() {
  const { profile } = useAuth()
  const isEG = profile?.role === 'eg'
  const [vue, setVue]           = useState('semaine')
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [month, setMonth]       = useState(new Date())
  const [demandes, setDemandes] = useState([])
  const [selected, setSelected] = useState(null)
  const [zoneColors, setZoneColors] = useState({})
  const [exporting, setExporting] = useState(false)
  const tableRef = useRef(null)

  const weekEnd = addDays(weekStart, 4) // vendredi
  const periodLabel = vue === 'semaine'
    ? `Semaine du ${format(weekStart, 'd MMM', { locale: fr })} au ${format(weekEnd, 'd MMM yyyy', { locale: fr })} (lun–ven)`
    : format(month, 'MMMM yyyy', { locale: fr })

  useEffect(() => {
    async function load() {
      let debut, fin
      if (vue === 'semaine') {
        debut = format(weekStart, 'yyyy-MM-dd')
        fin   = format(endOfWeek(weekStart, { weekStartsOn:1 }), 'yyyy-MM-dd')
      } else {
        debut = format(startOfMonth(month), 'yyyy-MM-dd')
        fin   = format(endOfMonth(month), 'yyyy-MM-dd')
      }
      let q = supabase.from('demandes').select('*')
        .eq('statut', 'validee')
        .gte('date_souhaitee', debut)
        .lte('date_souhaitee', fin)
      if (!isEG) q = q.eq('email_demandeur', profile?.email)
      const { data } = await q.order('date_souhaitee')
      setDemandes(data || [])
      const zones = [...new Set((data || []).map(d => d.zone_nom))]
      const map = {}
      zones.forEach((z, i) => { map[z] = COLORS[i % COLORS.length] })
      setZoneColors(map)
    }
    if (profile) load()
  }, [vue, weekStart, month, profile, isEG])

  const exportPDF = async () => {
    setExporting(true)
    try {
      // Génération HTML du planning semaine (sans week-end)
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn:1 }) })
        .filter(d => d.getDay() !== 0 && d.getDay() !== 6)
      const numSemaine = format(weekStart, 'w')
      const debutStr = format(weekStart, 'dd/MM/yy', { locale: fr })
      const finStr   = format(endOfWeek(weekStart, { weekStartsOn:1 }), 'dd/MM/yy', { locale: fr })

      const demandesForSlot = (day, slot) =>
        demandes.filter(d => isSameDay(new Date(d.date_souhaitee + 'T12:00'), day) && d.creneau === slot)

      const lignes = CRENEAUX.map(slot => {
        const cells = days.map(day => {
          const dels = demandesForSlot(day, slot)
          const content = dels.map(d => `<div style="font-size:9px;font-weight:bold;line-height:1.3">${d.entreprise}</div><div style="font-size:8px;color:#555">${d.type_livraison?.substring(0,20) || ''}</div>`).join('')
          return `<td style="border:1px solid #ccc;padding:4px;width:12%;vertical-align:top;min-height:35px">${content || ''}</td>`
        }).join('')
        return `<tr><td style="border:1px solid #ccc;padding:6px 4px;font-size:10px;font-weight:bold;color:#1a4c8b;white-space:nowrap;background:#f0f4ff">${slot}</td>${cells}</tr>`
      }).join('')

      const entetes = days.map(d =>
        `<th style="border:1px solid #1a4c8b;padding:6px 2px;font-size:10px;text-align:center;color:white;background:#1a4c8b">${format(d, 'EEE d MMM', { locale: fr }).toUpperCase()}</th>`
      ).join('')

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; margin: 10px; }
  @page { size: A3 landscape; margin: 10mm; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:3px solid #1a4c8b;padding-bottom:6px">
  <div style="font-size:11px;font-weight:bold;color:#1a4c8b">BATEG</div>
  <div style="text-align:center">
    <div style="font-size:16px;font-weight:bold;color:#1a4c8b;letter-spacing:1px">PLANNING DES LIVRAISONS</div>
    <div style="font-size:10px;color:#555">Semaine ${numSemaine} — du ${debutStr} au ${finStr}</div>
  </div>
  <div style="font-size:11px;font-weight:bold;color:#1a4c8b">VINCI Construction</div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:10px">
  <thead>
    <tr>
      <th style="border:1px solid #1a4c8b;padding:6px;font-size:10px;text-align:left;color:white;background:#1a4c8b;width:90px">Créneau</th>
      ${entetes}
    </tr>
  </thead>
  <tbody>${lignes}</tbody>
</table>
<div style="margin-top:10px;font-size:8px;color:#999;text-align:right">Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} — PIC Chantier</div>
</body></html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url  = URL.createObjectURL(blob)
      const win  = window.open(url, '_blank')
      if (win) {
        win.onload = () => { win.print() }
      }
    } catch (e) {
      console.error(e)
    }
    setExporting(false)
  }

  const prev = () => vue === 'semaine' ? setWeekStart(w => subWeeks(w, 1)) : setMonth(m => subMonths(m, 1))
  const next = () => vue === 'semaine' ? setWeekStart(w => addWeeks(w, 1)) : setMonth(m => addMonths(m, 1))
  const goToday = () => { setWeekStart(startOfWeek(new Date(), { weekStartsOn:1 })); setMonth(new Date()) }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Planning des livraisons</h1>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {/* Vue toggle */}
          <div style={{ display:'flex', border:'1.5px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            {['semaine','mois'].map(v => (
              <button key={v} onClick={() => setVue(v)}
                style={{ padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer', border:'none',
                  background: vue===v ? 'var(--green)' : 'var(--surface)',
                  color: vue===v ? '#fff' : 'var(--text2)' }}>
                {v === 'semaine' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          {/* Navigation */}
          <button onClick={prev} style={{ padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', display:'flex', cursor:'pointer' }}><ChevronLeft size={18}/></button>
          <button onClick={goToday} style={{ padding:'7px 12px', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', fontSize:12, fontWeight:500, cursor:'pointer', color:'var(--text2)' }}>Aujourd'hui</button>
          <button onClick={next} style={{ padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', display:'flex', cursor:'pointer' }}><ChevronRight size={18}/></button>
          {/* Export PDF */}
          {vue === 'semaine' && (
            <button onClick={exportPDF} disabled={exporting}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', opacity: exporting ? 0.7 : 1 }}>
              <Download size={15}/> {exporting ? 'Génération…' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Période affichée */}
      <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:14, textAlign:'center' }}>
        {periodLabel}
      </div>

      {/* Contenu */}
      <div ref={tableRef}>
        {vue === 'semaine'
          ? <VueSemaine demandes={demandes} weekStart={weekStart} zoneColors={zoneColors} onSelect={setSelected}/>
          : <VueMois demandes={demandes} month={month} zoneColors={zoneColors} onSelect={setSelected}/>
        }
      </div>

      {/* Légende */}
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

      {demandes.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:14 }}>
          Aucune livraison validée sur cette période
        </div>
      )}

      {/* Récap tableau */}
      {demandes.length > 0 && (
        <div style={{ marginTop:20, background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:14 }}>
            {demandes.length} livraison{demandes.length !== 1 ? 's' : ''} validée{demandes.length !== 1 ? 's' : ''}
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  {['Date','Créneau','Entreprise','Lot','Zone','Livraison','Qté'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, color:'var(--text2)', fontSize:11, whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demandes.map(d => {
                  const [bg, tc] = zoneColors[d.zone_nom] || COLORS[0]
                  return (
                    <tr key={d.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={() => setSelected(d)}>
                      <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>{d.date_souhaitee}</td>
                      <td style={{ padding:'8px 10px', whiteSpace:'nowrap', color:'var(--text2)' }}>{d.creneau}</td>
                      <td style={{ padding:'8px 10px', fontWeight:500 }}>{d.entreprise}</td>
                      <td style={{ padding:'8px 10px', color:'var(--text2)' }}>{d.lot}</td>
                      <td style={{ padding:'8px 10px' }}><span style={{ padding:'2px 7px', borderRadius:4, background:bg, color:tc, fontWeight:600, fontSize:11 }}>{d.zone_nom}</span></td>
                      <td style={{ padding:'8px 10px', color:'var(--text2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.type_livraison}</td>
                      <td style={{ padding:'8px 10px', color:'var(--text2)' }}>{d.quantite}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background:'var(--surface)', borderRadius:16, padding:24, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Détail livraison</h2>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:22, lineHeight:1 }}>×</button>
            </div>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <tbody>
                {[
                  ['Entreprise', selected.entreprise],
                  ['Lot', selected.lot],
                  ['Demandeur', `${selected.prenom} ${selected.nom}`],
                  ['Email', selected.email_demandeur],
                  ['Zone', selected.zone_nom],
                  ['Livraison', selected.type_livraison],
                  ['Date', selected.date_souhaitee],
                  ['Créneau', selected.creneau],
                  ['Quantité', selected.quantite],
                  ['Remarques', selected.notes || '—'],
                ].map(([k,v]) => (
                  <tr key={k} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 8px', color:'var(--text3)', width:110, fontSize:12 }}>{k}</td>
                    <td style={{ padding:'7px 8px', fontWeight:500, fontSize:13 }}>{v}</td>
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
