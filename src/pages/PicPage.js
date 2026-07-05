import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Upload, Plus, Trash2, CheckCircle, X, Maximize2, Minimize2 } from 'lucide-react'

const LOTS_DEFAUT = ['Gros œuvre','Charpente / Couverture','Façade / Isolation','Électricité','Plomberie / CVC','Menuiseries extérieures','Menuiseries intérieures','Peinture / Revêtements','Carrelage / Sols','Serrurerie / Métallerie','Ascenseurs','Espaces verts','Autre']
const CRENEAUX   = ['6h00–8h00','8h00–10h00','10h00–12h00','12h00–14h00','14h00–16h00','16h00–18h00']

function inp(extra) {
  return {
    width:'100%', padding:'10px 13px',
    border:'1.5px solid var(--border)', borderRadius:'var(--r)',
    fontSize:14, outline:'none', color:'var(--text)',
    background:'var(--bg)', fontFamily:'inherit', ...extra
  }
}

function ZoneBadge({ zone, scale, onClick, isEG, onDelete }) {
  const x = zone.x * scale
  const y = zone.y * scale
  const w = zone.w * scale
  const h = zone.h * scale

  const colors = {
    libre:   { bg:'#D4EDDF', border:'#1A6B45', text:'#0F4A2F' },
    occupee: { bg:'#FDF0DC', border:'#854F0B', text:'#412402' },
    bloquee: { bg:'#FBEAEA', border:'#8B2020', text:'#501313' },
  }
  const c = colors[zone.etat] || colors.libre

  return (
    <div
      onClick={() => !isEG && onClick(zone)}
      title={isEG ? zone.nom : `Cliquer pour demander — ${zone.nom}`}
      style={{
        position:'absolute', left:x, top:y, width:w, height:h,
        background:c.bg, border:`2px solid ${c.border}`,
        borderRadius:6, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:2,
        cursor: isEG ? 'default' : 'pointer',
        transition:'transform 0.1s, box-shadow 0.1s',
        userSelect:'none',
      }}
      onMouseEnter={e => { if (!isEG) { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.15)' }}}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
    >
      <span style={{ fontSize: Math.max(9, Math.min(13, w/8)), fontWeight:700, color:c.text, textAlign:'center', lineHeight:1.2, padding:'0 4px', wordBreak:'break-word' }}>{zone.nom}</span>
      {w > 60 && <span style={{ fontSize: Math.max(8, Math.min(10, w/10)), color:c.border, fontWeight:500 }}>{zone.etat === 'libre' ? '● Libre' : zone.etat === 'occupee' ? '● Occupée' : '● Bloquée'}</span>}
      {isEG && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(zone.id) }}
          style={{ position:'absolute', top:-8, right:-8, width:18, height:18, borderRadius:'50%', background:c.border, border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
          <X size={10}/>
        </button>
      )}
    </div>
  )
}

function FormulaireModal({ zone, lots, onClose, onSubmit }) {
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type_livraison || !form.date_souhaitee || !form.quantite) {
      setError('Merci de remplir tous les champs obligatoires (*)'); return
    }
    setLoading(true); setError('')
    const { error: err } = await supabase.from('demandes').insert({
      zone_id: zone.id,
      zone_nom: zone.nom,
      ...form,
      statut: 'en_attente',
    })
    if (err) { setError('Erreur : ' + err.message); setLoading(false); return }

    await supabase.functions.invoke('send-email', {
      body: { type: 'alerte_eg', demande: { zone_nom: zone.nom, ...form } }
    }).catch(() => {})

    setLoading(false)
    onSubmit()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--surface)', borderRadius:'16px 16px 0 0', padding:24, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700 }}>Demande de livraison</h2>
            <p style={{ fontSize:13, color:'var(--text2)' }}>Zone : <strong>{zone.nom}</strong></p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', display:'flex', cursor:'pointer' }}><X size={22}/></button>
        </div>

        {error && <div style={{ fontSize:13, color:'var(--red)', background:'var(--red-l)', padding:'10px 12px', borderRadius:8, marginBottom:14 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Entreprise *</label>
              <input style={inp()} value={form.entreprise} onChange={e=>set('entreprise',e.target.value)} required/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Lot *</label>
              <select style={inp()} value={form.lot} onChange={e=>set('lot',e.target.value)}>
                {(lots.length > 0 ? lots : LOTS_DEFAUT).map(l=><option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Prénom *</label>
              <input style={inp()} value={form.prenom} onChange={e=>set('prenom',e.target.value)} required/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Nom *</label>
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
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Date *</label>
              <input style={inp()} type="date" value={form.date_souhaitee} min={today} onChange={e=>set('date_souhaitee',e.target.value)} required/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Créneau *</label>
              <select style={inp()} value={form.creneau} onChange={e=>set('creneau',e.target.value)}>
                {CRENEAUX.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Quantité *</label>
              <input style={inp()} value={form.quantite} onChange={e=>set('quantite',e.target.value)} placeholder="ex : 3 palettes…" required/>
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:4 }}>Remarques</label>
            <textarea style={{ ...inp(), resize:'none' }} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Informations complémentaires…"/>
          </div>

          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'var(--green)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:15, fontWeight:600, opacity:loading?0.7:1 }}>
            {loading ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PicPage() {
  const { profile } = useAuth()
  const isEG = profile?.role === 'eg'

  const [picUrl, setPicUrl]           = useState(null)
  const [zones, setZones]             = useState([])
  const [lots, setLots]               = useState([])
  const [imgSize, setImgSize]         = useState({ w:800, h:500 })
  const [scale, setScale]             = useState(1)
  const [drawMode, setDrawMode]       = useState(false)
  const [drawRect, setDrawRect]       = useState(null)
  const [startPt, setStartPt]         = useState(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [selectedZone, setSelectedZone] = useState(null)
  const [success, setSuccess]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [fullscreen, setFullscreen]   = useState(false)
  const containerRef = useRef(null)
  const imgRef       = useRef(null)

  const loadData = useCallback(async () => {
    const [{ data: cfg }, { data: z }, { data: l }] = await Promise.all([
      supabase.from('config').select('*').eq('cle', 'pic_url').single(),
      supabase.from('zones').select('*').order('created_at'),
      supabase.from('lots').select('nom').order('nom'),
    ])
    if (cfg?.valeur) setPicUrl(cfg.valeur)
    setZones(z || [])
    setLots(l ? l.map(x=>x.nom) : [])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const recalcScale = useCallback(() => {
    if (!containerRef.current || imgSize.w === 0) return
    const cw = containerRef.current.clientWidth
    setScale(cw / imgSize.w)
  }, [imgSize.w])

  const onImgLoad = (e) => {
    const w = e.target.naturalWidth
    const h = e.target.naturalHeight
    setImgSize({ w, h })
    if (containerRef.current) setScale(containerRef.current.clientWidth / w)
  }

  useEffect(() => {
    window.addEventListener('resize', recalcScale)
    return () => window.removeEventListener('resize', recalcScale)
  }, [recalcScale])

  useEffect(() => {
    // recalc after fullscreen layout change
    const t = setTimeout(recalcScale, 50)
    return () => clearTimeout(t)
  }, [fullscreen, recalcScale])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `pic/plan.${ext}`
    await supabase.storage.from('chantier').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('chantier').getPublicUrl(path)
    await supabase.from('config').upsert({ cle:'pic_url', valeur: publicUrl })
    setPicUrl(publicUrl)
    setZones([])
    setUploading(false)
  }

  const getRelPos = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top)  / scale,
    }
  }

  const handleMouseDown = (e) => {
    if (!drawMode || !isEG) return
    e.preventDefault()
    const pt = getRelPos(e.clientX, e.clientY)
    setStartPt(pt)
    setDrawRect({ x: pt.x, y: pt.y, w: 0, h: 0 })
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!drawMode || !isDragging || !startPt) return
    e.preventDefault()
    const pt = getRelPos(e.clientX, e.clientY)
    setDrawRect({
      x: Math.min(pt.x, startPt.x),
      y: Math.min(pt.y, startPt.y),
      w: Math.abs(pt.x - startPt.x),
      h: Math.abs(pt.y - startPt.y),
    })
  }

  const handleMouseUp = (e) => {
    if (!drawMode || !isDragging) return
    e.preventDefault()
    setIsDragging(false)
    setStartPt(null)
    // Si le rectangle est trop petit, on annule
    if (!drawRect || drawRect.w < 20 || drawRect.h < 10) {
      setDrawRect(null)
      return
    }
    // Le rectangle est valide — on garde drawRect et on attend le nom
    setDrawMode(false)
  }

  const saveZone = async () => {
    if (!newZoneName.trim() || !drawRect) return
    const { data } = await supabase.from('zones').insert({
      nom: newZoneName.trim(),
      x: Math.round(drawRect.x), y: Math.round(drawRect.y),
      w: Math.round(drawRect.w), h: Math.round(drawRect.h),
      etat: 'libre'
    }).select().single()
    if (data) setZones(prev => [...prev, data])
    setDrawRect(null); setNewZoneName('')
  }

  const cancelZone = () => {
    setDrawRect(null); setNewZoneName(''); setDrawMode(false)
  }

  const deleteZone = async (id) => {
    if (!window.confirm('Supprimer cette zone ?')) return
    await supabase.from('zones').delete().eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
  }

  const handleZoneClick = (zone) => {
    if (isEG) return
    if (zone.etat === 'bloquee') { alert('Cette zone est bloquée et indisponible.'); return }
    setSelectedZone(zone)
  }

  const handleSuccess = () => {
    setSelectedZone(null)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 4000)
    loadData()
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Plan d'installation de chantier</h1>
        <div style={{ display:'flex', gap:8 }}>
          {picUrl && (
            <button
              onClick={() => setFullscreen(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--surface)', color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {fullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
              {fullscreen ? 'Réduire' : 'Agrandir'}
            </button>
          )}
          {isEG && (
            <>
              <label style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--green)', color:'#fff', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                <Upload size={14}/>
                {uploading ? 'Upload…' : 'Changer le PIC'}
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display:'none' }}/>
              </label>
              {picUrl && (
                <button
                  onClick={() => { setDrawMode(v => !v); setDrawRect(null); setNewZoneName('') }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background: drawMode ? 'var(--green)' : 'var(--surface)', color: drawMode ? '#fff' : 'var(--text)', border:'1.5px solid var(--border)', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  <Plus size={14}/>{drawMode ? '✏️ Dessinez une zone…' : 'Ajouter une zone'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {fullscreen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:300, display:'flex', flexDirection:'column', padding:16 }}
          onClick={e => e.target === e.currentTarget && setFullscreen(false)}
        >
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
            <button onClick={() => setFullscreen(false)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              <Minimize2 size={14}/> Fermer
            </button>
          </div>
          <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center' }}>
            <div
              ref={fullscreen ? containerRef : null}
              style={{ position:'relative', width:'min(95vw, 1400px)', userSelect:'none', cursor: drawMode ? 'crosshair' : 'default' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {picUrl && (
                <img src={picUrl} alt="PIC plein écran" onLoad={onImgLoad} style={{ width:'100%', display:'block', pointerEvents:'none', borderRadius:8 }}/>
              )}
              {zones.map(z => (
                <ZoneBadge key={z.id} zone={z} scale={scale} onClick={handleZoneClick} isEG={isEG} onDelete={deleteZone}/>
              ))}
              {drawRect && drawRect.w > 5 && (
                <div style={{
                  position:'absolute',
                  left: drawRect.x * scale, top: drawRect.y * scale,
                  width: drawRect.w * scale, height: drawRect.h * scale,
                  border:'2px dashed var(--green)', background:'rgba(26,107,69,0.12)',
                  borderRadius:6, pointerEvents:'none'
                }}/>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'var(--green-l)', color:'var(--green-d)', borderRadius:10, marginBottom:14, fontWeight:500 }}>
          <CheckCircle size={18}/>
          Demande envoyée ! L'entreprise générale va la traiter sous peu.
        </div>
      )}

      {drawMode && isEG && (
        <div style={{ padding:'10px 14px', background:'var(--amber-l)', color:'var(--amber)', borderRadius:8, marginBottom:12, fontSize:13, fontWeight:500 }}>
          ✏️ Mode dessin actif — Cliquez et glissez sur le plan pour délimiter une zone, puis relâchez.
        </div>
      )}

      {!isEG && picUrl && (
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>
          Cliquez sur une zone <span style={{ background:'var(--green-l)', color:'var(--green)', padding:'2px 7px', borderRadius:4, fontWeight:600 }}>libre</span> pour soumettre une demande de livraison.
        </p>
      )}

      {/* Conteneur PIC */}
      <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden', maxWidth:1100, margin:'0 auto' }}>
        {!picUrl ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'var(--text3)', gap:12 }}>
            <Upload size={36} style={{ opacity:0.4 }}/>
            <p style={{ fontSize:14 }}>{isEG ? 'Uploadez votre PIC ci-dessus pour commencer.' : 'Le plan du chantier n\'a pas encore été chargé.'}</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ position:'relative', width:'100%', userSelect:'none', cursor: drawMode ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img
              ref={imgRef}
              src={picUrl}
              alt="PIC"
              onLoad={onImgLoad}
              style={{ width:'100%', display:'block', pointerEvents:'none' }}
            />

            {zones.map(z => (
              <ZoneBadge key={z.id} zone={z} scale={scale} onClick={handleZoneClick} isEG={isEG} onDelete={deleteZone}/>
            ))}

            {drawRect && drawRect.w > 5 && (
              <div style={{
                position:'absolute',
                left: drawRect.x * scale, top: drawRect.y * scale,
                width: drawRect.w * scale, height: drawRect.h * scale,
                border:'2px dashed var(--green)', background:'rgba(26,107,69,0.12)',
                borderRadius:6, pointerEvents:'none'
              }}/>
            )}
          </div>
        )}
      </div>

      {/* Légende */}
      {picUrl && (
        <div style={{ display:'flex', gap:14, marginTop:10, flexWrap:'wrap' }}>
          {[['var(--green-l)','var(--green)','Libre'],['var(--amber-l)','var(--amber)','Occupée'],['var(--red-l)','var(--red)','Bloquée']].map(([bg,c,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
              <div style={{ width:12, height:12, background:bg, border:`2px solid ${c}`, borderRadius:3 }}/>
              <span style={{ color:'var(--text2)' }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Panneau sauvegarde zone */}
      {isEG && drawRect && drawRect.w > 20 && !drawMode && (
        <div style={{ marginTop:14, padding:16, background:'var(--surface)', borderRadius:12, border:'1.5px solid var(--green)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ fontSize:13, color:'var(--green-d)', fontWeight:500, flexShrink:0 }}>📍 Nommez cette zone :</div>
          <input
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveZone()}
            placeholder="ex : Zone A – Stockage gros œuvre"
            autoFocus
            style={{ flex:1, minWidth:200, padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:14, outline:'none', color:'var(--text)', background:'var(--bg)' }}
          />
          <button onClick={saveZone} disabled={!newZoneName.trim()}
            style={{ padding:'9px 16px', background:'var(--green)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', opacity: newZoneName.trim() ? 1 : 0.5 }}>
            Enregistrer
          </button>
          <button onClick={cancelZone}
            style={{ padding:'9px', background:'var(--red-l)', color:'var(--red)', border:'none', borderRadius:8, display:'flex', cursor:'pointer' }}>
            <X size={16}/>
          </button>
        </div>
      )}

      {selectedZone && (
        <FormulaireModal zone={selectedZone} lots={lots.length ? lots : LOTS_DEFAUT} onClose={()=>setSelectedZone(null)} onSubmit={handleSuccess}/>
      )}
    </div>
  )
}
