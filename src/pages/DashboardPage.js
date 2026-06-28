import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Map, CalendarDays, ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function Stat({ icon, label, value, color, bg }) {
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'var(--shadow)' }}>
      <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1.1 }}>{value}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const isEG = profile?.role === 'eg'
  const [stats, setStats] = useState({ pending:0, approved:0, rejected:0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    if (!profile) return
    async function load() {
      let q = supabase.from('demandes').select('*')
      if (!isEG) q = q.eq('email_demandeur', profile.email)
      const { data } = await q.order('created_at', { ascending: false }).limit(50)
      if (!data) return
      setRecent(data.slice(0, 4))
      setStats({
        pending:  data.filter(d => d.statut === 'en_attente').length,
        approved: data.filter(d => d.statut === 'validee').length,
        rejected: data.filter(d => d.statut === 'refusee').length,
      })
    }
    load()
  }, [profile, isEG])

  const STATUS = {
    en_attente: { label:'En attente', color:'var(--amber)', bg:'var(--amber-l)' },
    validee:    { label:'Validée',    color:'var(--green)', bg:'var(--green-l)' },
    refusee:    { label:'Refusée',    color:'var(--red)',   bg:'var(--red-l)'   },
  }

  const h = new Date().getHours()
  const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>{greet}, {profile?.prenom} 👋</h1>
        <p style={{ fontSize:14, color:'var(--text2)', marginTop:4 }}>
          {profile?.entreprise} · {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
        <Stat icon={<Clock size={18}/>}        label="En attente" value={stats.pending}  color="var(--amber)" bg="var(--amber-l)"/>
        <Stat icon={<CheckCircle size={18}/>}  label="Validées"   value={stats.approved} color="var(--green)" bg="var(--green-l)"/>
        <Stat icon={<XCircle size={18}/>}      label="Refusées"   value={stats.rejected} color="var(--red)"   bg="var(--red-l)"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:28 }}>
        <button onClick={()=>nav('/pic')}
          style={{ padding:'18px 14px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, cursor:'pointer', textAlign:'left' }}>
          <Map size={22} color="var(--green)" style={{ marginBottom:8 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>Plan du chantier</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Cliquer sur une zone pour demander</div>
        </button>
        <button onClick={()=>nav('/planning')}
          style={{ padding:'18px 14px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, cursor:'pointer', textAlign:'left' }}>
          <CalendarDays size={22} color="var(--blue)" style={{ marginBottom:8 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>Planning</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Livraisons validées du mois</div>
        </button>
      </div>

      <div style={{ fontWeight:600, fontSize:15, marginBottom:12 }}>Dernières demandes</div>
      {recent.length === 0
        ? <p style={{ fontSize:14, color:'var(--text3)', textAlign:'center', padding:'32px 0' }}>Aucune demande pour l'instant</p>
        : recent.map(d => {
          const sm = STATUS[d.statut] || STATUS.en_attente
          return (
            <div key={d.id} style={{ background:'var(--surface)', borderRadius:12, padding:'12px 14px', marginBottom:8, boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.type_livraison}</div>
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Zone {d.zone_nom} · {d.date_souhaitee} · {d.creneau}</div>
              </div>
              <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:99, background:sm.bg, color:sm.color, flexShrink:0 }}>{sm.label}</span>
            </div>
          )
        })
      }
    </div>
  )
}
