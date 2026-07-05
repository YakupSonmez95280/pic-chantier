import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Map, CalendarDays, Clock, CheckCircle, XCircle, TrendingUp, Truck, AlertTriangle, Package } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS = {
  en_attente: { label:'En attente', color:'var(--amber)', bg:'var(--amber-l)' },
  validee:    { label:'Validée',    color:'var(--green)', bg:'var(--green-l)' },
  refusee:    { label:'Refusée',    color:'var(--red)',   bg:'var(--red-l)'   },
}

function StatCard({ icon, label, value, color, bg, sub }) {
  return (
    <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', boxShadow:'var(--shadow)', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</div>
        {sub !== undefined && (
          <div style={{ fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:3 }}>
            <TrendingUp size={11}/>{sub}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize:28, fontWeight:700, color, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12, color:'var(--text3)', fontWeight:500, marginTop:4, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</div>
      </div>
    </div>
  )
}

function RecentRow({ d, onClick }) {
  const sm = STATUS[d.statut] || STATUS.en_attente
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', borderRadius:12, marginBottom:8, cursor:'pointer', boxShadow:'var(--shadow)' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.type_livraison}</div>
        <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
          Zone {d.zone_nom} · {d.date_souhaitee} · {d.creneau}
        </div>
      </div>
      <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:99, background:sm.bg, color:sm.color, flexShrink:0 }}>{sm.label}</span>
    </div>
  )
}

function BarChart({ data, label }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:10 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)' }}>{d.value || ''}</div>
            <div style={{ width:'100%', background: d.color || 'var(--green-l)', borderRadius:'4px 4px 0 0', height: `${Math.max((d.value / max) * 60, d.value > 0 ? 8 : 0)}px`, transition:'height 0.3s' }}/>
            <div style={{ fontSize:10, color:'var(--text3)', textAlign:'center', whiteSpace:'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const isEG = profile?.role === 'eg'
  const isRT = profile?.role === 'rt'
  const isST = profile?.role === 'subcontractor'

  const [stats, setStats] = useState({ pending:0, approved:0, rejected:0, total:0 })
  const [recent, setRecent] = useState([])
  const [moisData, setMoisData] = useState([])
  const [tauxValidation, setTauxValidation] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function load() {
      setLoading(true)

      // Demandes selon le rôle
      let q = supabase.from('demandes').select('*')
      if (isST) q = q.eq('email_demandeur', profile.email)
      const { data: all } = await q.order('created_at', { ascending: false })
      if (!all) { setLoading(false); return }

      setRecent(all.slice(0, 5))
      const pending  = all.filter(d => d.statut === 'en_attente').length
      const approved = all.filter(d => d.statut === 'validee').length
      const rejected = all.filter(d => d.statut === 'refusee').length
      setStats({ pending, approved, rejected, total: all.length })
      setTauxValidation(all.length > 0 ? Math.round((approved / all.length) * 100) : 0)

      // Stats des 4 derniers mois
      const mois = []
      for (let i = 3; i >= 0; i--) {
        const d = subMonths(new Date(), i)
        const debut = format(startOfMonth(d), 'yyyy-MM-dd')
        const fin   = format(endOfMonth(d),   'yyyy-MM-dd')
        const count = all.filter(x => x.date_souhaitee >= debut && x.date_souhaitee <= fin && x.statut === 'validee').length
        mois.push({ label: format(d, 'MMM', { locale: fr }), value: count, color:'var(--green-l)' })
      }
      setMoisData(mois)
      setLoading(false)
    }
    load()
  }, [profile, isST])

  const h = new Date().getHours()
  const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Chargement…</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>{greet}, {profile?.prenom} 👋</h1>
        <p style={{ fontSize:14, color:'var(--text2)', marginTop:4 }}>
          {profile?.entreprise} · {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* BOUTON PRINCIPAL pour ST */}
      {isST && (
        <button onClick={() => nav('/pic')}
          style={{ width:'100%', padding:'18px 20px', background:'var(--green)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:20, boxShadow:'0 4px 14px rgba(26,107,69,0.3)' }}>
          <Truck size={22}/> Faire une demande de livraison
        </button>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:10, marginBottom:20 }}>
        <StatCard icon={<Clock size={18}/>}       label="En attente" value={stats.pending}  color="var(--amber)" bg="var(--amber-l)" sub={stats.pending > 0 ? 'À traiter' : undefined}/>
        <StatCard icon={<CheckCircle size={18}/>} label="Validées"   value={stats.approved} color="var(--green)" bg="var(--green-l)" sub={`${tauxValidation}% taux`}/>
        <StatCard icon={<XCircle size={18}/>}     label="Refusées"   value={stats.rejected} color="var(--red)"   bg="var(--red-l)"/>
        <StatCard icon={<Package size={18}/>}     label="Total"      value={stats.total}    color="var(--blue)"  bg="var(--blue-l)"/>
      </div>

      {/* Alerte si demandes en attente (EG/RT) */}
      {(isEG || isRT) && stats.pending > 0 && (
        <div onClick={() => nav('/demandes')}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'var(--amber-l)', border:'1.5px solid var(--amber)', borderRadius:12, marginBottom:20, cursor:'pointer' }}>
          <AlertTriangle size={20} color="var(--amber)"/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, color:'var(--amber)', fontSize:14 }}>{stats.pending} demande{stats.pending > 1 ? 's' : ''} en attente de validation</div>
            <div style={{ fontSize:12, color:'var(--amber)', opacity:0.8 }}>Cliquez pour les traiter →</div>
          </div>
        </div>
      )}

      {/* Graphique livraisons par mois */}
      {moisData.length > 0 && stats.total > 0 && (
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', marginBottom:20, boxShadow:'var(--shadow)' }}>
          <BarChart data={moisData} label="Livraisons validées — 4 derniers mois"/>
        </div>
      )}

      {/* Raccourcis */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <button onClick={() => nav('/pic')}
          style={{ padding:'16px 14px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, cursor:'pointer', textAlign:'left' }}>
          <Map size={20} color="var(--green)" style={{ marginBottom:8 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>Plan du chantier</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{isST ? 'Cliquer sur une zone pour demander' : 'Voir les zones de stockage'}</div>
        </button>
        <button onClick={() => nav('/planning')}
          style={{ padding:'16px 14px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, cursor:'pointer', textAlign:'left' }}>
          <CalendarDays size={20} color="var(--blue)" style={{ marginBottom:8 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>Planning</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Livraisons validées du mois</div>
        </button>
      </div>

      {/* Dernières demandes */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15 }}>Dernières demandes</div>
        <button onClick={() => nav(isST ? '/pic' : '/demandes')} style={{ fontSize:13, color:'var(--green)', background:'none', border:'none', fontWeight:500, cursor:'pointer' }}>
          {isST ? 'Nouvelle demande →' : 'Tout voir →'}
        </button>
      </div>

      {recent.length === 0
        ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:14 }}>
            <Truck size={32} style={{ display:'block', margin:'0 auto 12px', opacity:0.3 }}/>
            {isST ? 'Aucune demande — cliquez sur "Faire une demande" ci-dessus !' : 'Aucune demande pour l\'instant'}
          </div>
        : recent.map(d => <RecentRow key={d.id} d={d} onClick={() => nav(isST ? '/pic' : '/demandes')}/>)
      }
    </div>
  )
}
