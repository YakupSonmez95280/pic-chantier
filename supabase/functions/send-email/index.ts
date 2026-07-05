// supabase/functions/send-email/index.ts
// Déployée via : supabase functions deploy send-email
// Variables à configurer dans Supabase > Settings > Edge Functions > Secrets :
//   RESEND_API_KEY  → votre clé Resend (resend.com, gratuit 100 emails/jour)
//   EG_EMAIL        → email de l'entreprise générale (alerte de secours si aucun RT assigné)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont déjà injectées automatiquement par Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const EG_EMAIL   = Deno.env.get('EG_EMAIL')!
const FROM       = 'PIC Chantier <noreply@resend.dev>'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function sendMail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

function tableauDemande(d: any) {
  return `
  <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
    <tbody>
      ${[
        ['Entreprise',    d.entreprise],
        ['Lot',           d.lot],
        ['Demandeur',     `${d.prenom} ${d.nom}`],
        ['Email',         d.email_demandeur],
        ['Zone',          d.zone_nom],
        ['Type livraison',d.type_livraison],
        ['Date souhaitée',d.date_souhaitee],
        ['Créneau',       d.creneau],
        ['Quantité',      d.quantite],
        ['Remarques',     d.notes || '—'],
      ].map(([k,v]) => `
        <tr>
          <td style="padding:8px 12px;background:#f5f4f0;font-weight:600;width:160px;border-bottom:1px solid #ddd">${k}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #ddd">${v}</td>
        </tr>`).join('')}
    </tbody>
  </table>`
}

// Trouve l'email du Responsable de Travaux assigné au lot, sinon retourne l'email EG par défaut
async function getDestinataireAlerte(lotNom: string): Promise<string> {
  const { data: lot } = await supabaseAdmin
    .from('lots')
    .select('rt_id')
    .eq('nom', lotNom)
    .single()

  if (lot?.rt_id) {
    const { data: rtProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', lot.rt_id)
      .single()
    if (rtProfile?.email) return rtProfile.email
  }
  return EG_EMAIL
}

serve(async (req) => {
  const { type, demande } = await req.json()

  // ── Alerte : nouvelle demande en attente → envoyée au RT du lot (ou à l'EG si aucun RT) ──
  if (type === 'alerte_eg') {
    const destinataire = await getDestinataireAlerte(demande.lot)
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1A6B45;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;font-size:20px;margin:0">🚛 Nouvelle demande de livraison</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <p style="color:#6b6860;margin:0 0 16px">Une nouvelle demande est en attente de validation pour le lot <strong>${demande.lot}</strong> :</p>
          ${tableauDemande(demande)}
          <div style="margin-top:20px;padding:14px 18px;background:#FDF0DC;border-left:4px solid #854F0B;border-radius:4px">
            <strong style="color:#854F0B">⏳ Action requise</strong>
            <p style="color:#6b6860;margin:6px 0 0;font-size:13px">Connectez-vous au site pour valider ou refuser cette demande. Une fois validée, elle sera automatiquement ajoutée au planning.</p>
          </div>
        </div>
      </div>`
    await sendMail(destinataire, `[PIC Chantier] Nouvelle demande – Lot ${demande.lot}`, html)
  }

  // ── Email ST : demande validée ───────────────────────
  if (type === 'validation_st') {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1A6B45;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;font-size:20px;margin:0">✅ Demande validée</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <p style="color:#333;margin:0 0 16px">Bonjour <strong>${demande.prenom} ${demande.nom}</strong>,</p>
          <p style="color:#6b6860;margin:0 0 16px">Votre demande de livraison a été <strong style="color:#1A6B45">validée</strong>.</p>
          ${tableauDemande(demande)}
          <div style="margin-top:20px;padding:14px 18px;background:#D4EDDF;border-left:4px solid #1A6B45;border-radius:4px">
            <strong style="color:#0F4A2F">📅 Confirmé</strong>
            <p style="color:#0F4A2F;margin:6px 0 0;font-size:13px">
              Livraison le <strong>${demande.date_souhaitee}</strong> créneau <strong>${demande.creneau}</strong> en <strong>${demande.zone_nom}</strong>. Elle est désormais inscrite au planning.
            </p>
          </div>
        </div>
      </div>`
    await sendMail(demande.email_demandeur, `[PIC Chantier] ✅ Demande validée – ${demande.date_souhaitee}`, html)
  }

  // ── Email ST : demande refusée ───────────────────────
  if (type === 'refus_st') {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#8B2020;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;font-size:20px;margin:0">❌ Demande refusée</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <p style="color:#333;margin:0 0 16px">Bonjour <strong>${demande.prenom} ${demande.nom}</strong>,</p>
          <p style="color:#6b6860;margin:0 0 16px">Votre demande de livraison a été <strong style="color:#8B2020">refusée</strong>.</p>
          ${tableauDemande(demande)}
          ${demande.commentaire_eg ? `
          <div style="margin-top:20px;padding:14px 18px;background:#FBEAEA;border-left:4px solid #8B2020;border-radius:4px">
            <strong style="color:#8B2020">Motif du refus</strong>
            <p style="color:#8B2020;margin:6px 0 0;font-size:13px">${demande.commentaire_eg}</p>
          </div>` : ''}
          <p style="color:#6b6860;margin-top:16px;font-size:13px">Vous pouvez soumettre une nouvelle demande en vous connectant au site.</p>
        </div>
      </div>`
    await sendMail(demande.email_demandeur, `[PIC Chantier] ❌ Demande refusée – ${demande.date_souhaitee}`, html)
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
