// supabase/functions/send-email/index.ts
// Secrets: BREVO_API_KEY, EG_EMAIL, SENDER_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_KEY    = Deno.env.get('BREVO_API_KEY')!
const EG_EMAIL     = Deno.env.get('EG_EMAIL')!
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || EG_EMAIL
const SITE_URL     = Deno.env.get('SITE_URL') || 'https://pic-chantier.vercel.app'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

async function sendMail(to: string, subject: string, html: string, fromName = 'PIC Chantier') {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: fromName, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) console.error('Brevo error:', await res.text())
  else console.log('Email sent to:', to)
}

function tableauDemande(d: any) {
  const lignes = [
    ['Entreprise', d.entreprise], ['Lot', d.lot],
    ['Demandeur', `${d.prenom} ${d.nom}`], ['Email', d.email_demandeur],
    ['Zone', d.zone_nom], ['Type livraison', d.type_livraison],
    ['Date souhaitée', d.date_souhaitee], ['Créneau', d.creneau],
    ['Quantité', d.quantite], ['Remarques', d.notes || '—'],
  ]
  return `
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
    <thead><tr style="background:#1a4c8b">
      <th style="padding:10px 14px;color:#fff;text-align:left;width:40%">Champ</th>
      <th style="padding:10px 14px;color:#fff;text-align:left">Valeur</th>
    </tr></thead>
    <tbody>${lignes.map(([k,v],i)=>`
      <tr style="background:${i%2===0?'#f8f8f6':'#fff'}">
        <td style="padding:9px 14px;font-weight:600;color:#444;border-bottom:1px solid #e8e8e4">${k}</td>
        <td style="padding:9px 14px;color:#1a1916;border-bottom:1px solid #e8e8e4">${v}</td>
      </tr>`).join('')}</tbody>
  </table>`
}

function header(titre: string, couleur: string, emoji: string) {
  return `<div style="background:${couleur};padding:20px 28px;border-radius:10px 10px 0 0">
    <h1 style="color:#fff;font-size:20px;margin:0;font-family:Arial">${emoji} ${titre}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">PIC Chantier — Gestion des livraisons</p>
  </div>`
}

function lienAction(texte: string) {
  return `<div style="margin-top:20px;text-align:center">
    <a href="${SITE_URL}/demandes" style="display:inline-block;padding:12px 28px;background:#1A6B45;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;font-family:Arial">
      ${texte} →
    </a>
  </div>`
}

function wrapper(contenu: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:20px;background:#f4f3ef;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto">
      <div style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden">
        ${contenu}
        <div style="padding:14px 28px;background:#f8f8f6;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee">
          Mail automatique PIC Chantier · Ne pas répondre directement
        </div>
      </div>
    </div>
  </body></html>`
}

async function getDestinataireAlerte(lotNom: string): Promise<{ email: string; nom: string }> {
  const { data: lot } = await supabaseAdmin.from('lots').select('rt_id').eq('nom', lotNom).single()
  if (lot?.rt_id) {
    const { data: rt } = await supabaseAdmin.from('profiles').select('email, prenom, nom').eq('id', lot.rt_id).single()
    if (rt?.email) return { email: rt.email, nom: `${rt.prenom} ${rt.nom}` }
  }
  return { email: EG_EMAIL, nom: 'Entreprise Générale' }
}

async function getValideur(validePar?: string): Promise<{ email: string; nom: string } | null> {
  if (!validePar) return null
  const { data } = await supabaseAdmin.from('profiles').select('email, prenom, nom').eq('id', validePar).single()
  if (data) return { email: data.email, nom: `${data.prenom} ${data.nom}` }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const text = await req.text()
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
    }
    const { type, demande } = JSON.parse(text)

    // ── ALERTE nouvelle demande → RT ou EG ──────────────
    if (type === 'alerte_eg') {
      const dest = await getDestinataireAlerte(demande.lot)

      // Enregistrer la relance dans la table relances
      if (demande.id) {
        await supabaseAdmin.from('relances').insert({ demande_id: demande.id, type: 'alerte' }).catch(()=>{})
        await supabaseAdmin.from('demandes').update({ soumise_le: new Date().toISOString() }).eq('id', demande.id).catch(()=>{})
      }

      const html = wrapper(`
        ${header('Nouvelle demande de livraison', '#854F0B', '🚛')}
        <div style="padding:24px 28px">
          <p style="color:#444;margin:0 0 16px">Bonjour <strong>${dest.nom}</strong>,<br>
          Une nouvelle demande attend votre validation pour le lot <strong>${demande.lot}</strong>.</p>
          ${tableauDemande(demande)}
          <div style="margin-top:20px;padding:14px 18px;background:#FDF0DC;border-left:4px solid #854F0B;border-radius:4px">
            <strong style="color:#854F0B">⏳ Action requise sous 48h</strong>
            <p style="color:#6b6860;margin:6px 0 0;font-size:12px">Sans réponse de votre part, un rappel automatique vous sera envoyé.</p>
          </div>
          ${lienAction('Traiter cette demande')}
        </div>`)
      await sendMail(dest.email, `[PIC Chantier] 🚛 Nouvelle demande – Lot ${demande.lot} – ${demande.entreprise}`, html)
    }

    // ── RELANCE (appelée par un cron après 48h) ──────────
    if (type === 'relance') {
      const dest = await getDestinataireAlerte(demande.lot)

      if (demande.id) {
        await supabaseAdmin.from('relances').insert({ demande_id: demande.id, type: 'relance_1' }).catch(()=>{})
        await supabaseAdmin.from('demandes').update({ nb_relances: 1 }).eq('id', demande.id).catch(()=>{})
      }

      const html = wrapper(`
        ${header('Rappel — Demande en attente de validation', '#5B21B6', '🔔')}
        <div style="padding:24px 28px">
          <p style="color:#444;margin:0 0 16px">Bonjour <strong>${dest.nom}</strong>,<br>
          Une demande de livraison est toujours en attente de votre validation depuis <strong>48h</strong>.</p>
          ${tableauDemande(demande)}
          <div style="margin-top:20px;padding:14px 18px;background:#EDE9FE;border-left:4px solid #5B21B6;border-radius:4px">
            <strong style="color:#5B21B6">🔔 Rappel automatique</strong>
            <p style="color:#5B21B6;margin:6px 0 0;font-size:12px">Merci de traiter cette demande dès que possible.</p>
          </div>
          ${lienAction('Traiter cette demande maintenant')}
        </div>`)
      await sendMail(dest.email, `[PIC Chantier] 🔔 RAPPEL – Demande en attente – Lot ${demande.lot}`, html)
    }

    // ── VALIDATION → ST ───────────────────────────────────
    if (type === 'validation_st') {
      const valideur = await getValideur(demande.valide_par)
      const valideurNom = valideur?.nom || 'l\'entreprise générale'
      const valideurEmail = valideur?.email || EG_EMAIL

      if (demande.id) {
        await supabaseAdmin.from('demandes').update({ traitee_le: new Date().toISOString() }).eq('id', demande.id).catch(()=>{})
      }

      const html = wrapper(`
        ${header('Demande de livraison validée', '#1A6B45', '✅')}
        <div style="padding:24px 28px">
          <p style="color:#444;margin:0 0 16px">Bonjour <strong>${demande.prenom} ${demande.nom}</strong>,<br>
          Votre demande a été <strong style="color:#1A6B45">validée</strong> par ${valideurNom}.</p>
          ${tableauDemande(demande)}
          <div style="margin-top:20px;padding:16px 18px;background:#D4EDDF;border-left:4px solid #1A6B45;border-radius:4px">
            <strong style="color:#0F4A2F">📅 Livraison confirmée</strong>
            <p style="color:#0F4A2F;margin:8px 0 0">Le <strong>${demande.date_souhaitee}</strong> · Créneau <strong>${demande.creneau}</strong> · Zone <strong>${demande.zone_nom}</strong></p>
          </div>
          <p style="color:#999;font-size:12px;margin-top:16px">Contact : ${valideurNom} — <a href="mailto:${valideurEmail}">${valideurEmail}</a></p>
        </div>`)
      await sendMail(demande.email_demandeur, `[PIC Chantier] ✅ Livraison validée – ${demande.date_souhaitee} – ${demande.zone_nom}`, html, valideurNom)
    }

    // ── REFUS → ST ────────────────────────────────────────
    if (type === 'refus_st') {
      const valideur = await getValideur(demande.valide_par)
      const valideurNom = valideur?.nom || 'l\'entreprise générale'
      const valideurEmail = valideur?.email || EG_EMAIL

      if (demande.id) {
        await supabaseAdmin.from('demandes').update({ traitee_le: new Date().toISOString() }).eq('id', demande.id).catch(()=>{})
      }

      const html = wrapper(`
        ${header('Demande de livraison refusée', '#8B2020', '❌')}
        <div style="padding:24px 28px">
          <p style="color:#444;margin:0 0 16px">Bonjour <strong>${demande.prenom} ${demande.nom}</strong>,<br>
          Votre demande a été <strong style="color:#8B2020">refusée</strong> par ${valideurNom}.</p>
          ${tableauDemande(demande)}
          ${demande.commentaire_eg ? `
          <div style="margin-top:20px;padding:16px 18px;background:#FBEAEA;border-left:4px solid #8B2020;border-radius:4px">
            <strong style="color:#8B2020">Motif</strong>
            <p style="color:#8B2020;margin:8px 0 0">${demande.commentaire_eg}</p>
          </div>` : ''}
          <p style="color:#999;font-size:12px;margin-top:16px">Contact : ${valideurNom} — <a href="mailto:${valideurEmail}">${valideurEmail}</a></p>
        </div>`)
      await sendMail(demande.email_demandeur, `[PIC Chantier] ❌ Demande refusée – ${demande.date_souhaitee}`, html, valideurNom)
    }

    // ── ANNULATION → ST ───────────────────────────────────
    if (type === 'annulation_st') {
      const valideur = await getValideur(demande.valide_par)
      const valideurNom = valideur?.nom || 'l\'entreprise générale'
      const valideurEmail = valideur?.email || EG_EMAIL

      const html = wrapper(`
        ${header('Livraison annulée', '#854F0B', '⚠️')}
        <div style="padding:24px 28px">
          <p style="color:#444;margin:0 0 16px">Bonjour <strong>${demande.prenom} ${demande.nom}</strong>,<br>
          Votre livraison a été <strong style="color:#854F0B">annulée</strong> par ${valideurNom}.</p>
          ${tableauDemande(demande)}
          ${demande.commentaire_eg ? `
          <div style="margin-top:20px;padding:16px 18px;background:#FDF0DC;border-left:4px solid #854F0B;border-radius:4px">
            <strong style="color:#854F0B">Motif</strong>
            <p style="color:#854F0B;margin:8px 0 0">${demande.commentaire_eg}</p>
          </div>` : ''}
          <p style="color:#999;font-size:12px;margin-top:16px">Contact : ${valideurNom} — <a href="mailto:${valideurEmail}">${valideurEmail}</a></p>
        </div>`)
      await sendMail(demande.email_demandeur, `[PIC Chantier] ⚠️ Livraison annulée – ${demande.date_souhaitee}`, html, valideurNom)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })

  } catch (e) {
    console.error('Function error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
  }
})
