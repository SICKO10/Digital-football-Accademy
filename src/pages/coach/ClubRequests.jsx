import { useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'

// Email pré-rédigé avec le lien de paiement du bon palier, à copier ou ouvrir
// directement dans l'app Mail — évite à l'admin de retaper le message à
// chaque demande. Palier/prix viennent de STRIPE_LINKS_CLUB (source unique),
// pas d'une liste dupliquée ici. Lien brut, sans client_reference_id
// (contrairement à copierLienClub de la page Lien Stripe Club) : à ce
// stade la demande n'a pas encore de compte — le webhook Stripe identifie le
// paiement par montant + email et crée le compte via invitation.
function EmailBlockClub({ demande, onLienEnvoye }) {
  const { c } = useCoachTheme()
  const [copie, setCopie] = useState(null)
  const [ouvert, setOuvert] = useState(false)
  const [cycle, setCycle] = useState(demande.cycle === 'annuel' ? 'annuel' : 'mensuel')

  const palier = STRIPE_LINKS_CLUB[demande.nb_licencies]
  const lien = palier?.[cycle]
  const prix = cycle === 'mensuel' ? palier?.mensuelPrix : palier?.annuelPrix
  const lienInscription = demande.nb_licencies
    ? `https://digital-football-accademy.vercel.app/register?profil=club&palier=${demande.nb_licencies}&cycle=${cycle}`
    : null

  const objet = "Digital Football — Votre lien d'inscription club"
  const corps = (palier && lienInscription)
    ? `Bonjour ${demande.prenom},

Suite à votre demande d'abonnement pour ${demande.nom_club}, voici votre lien d'inscription :

👉 ${lienInscription}

Créez votre compte, vous serez ensuite redirigé automatiquement vers le paiement sécurisé du palier sélectionné : ${palier.label} — ${prix}

Une fois le paiement effectué, vous accéderez directement à votre espace club Digital Football.

Nous proposons également un accompagnement personnalisé pour vous aider à configurer votre dashboard selon les besoins spécifiques de votre club : import de l'effectif, paramétrage des équipes, formation à l'outil.

Si vous souhaitez bénéficier de cet accompagnement, répondez simplement à ce mail en nous indiquant vos disponibilités et nous organiserons un rendez-vous à votre convenance.

L'équipe Digital Football`
    : `Bonjour ${demande.prenom},

Suite à votre demande pour ${demande.nom_club}, nous vous recontactons sous 24-48h.

L'équipe Digital Football`

  const marquerEnvoye = async () => {
    await supabase.from('demandes_club').update({ lien_paiement_envoye: true, lien_paiement_envoye_le: new Date().toISOString() }).eq('id', demande.id)
    onLienEnvoye?.()
  }

  const copierEmail = async () => {
    await navigator.clipboard.writeText(`OBJET : ${objet}\n\n${corps}`)
    setCopie('email')
    setTimeout(() => setCopie(null), 3000)
    if (lienInscription) await marquerEnvoye()
  }

  const copierLienInscription = async () => {
    if (!lienInscription) return
    await navigator.clipboard.writeText(lienInscription)
    setCopie('inscription')
    setTimeout(() => setCopie(null), 2000)
    await marquerEnvoye()
  }

  const copierLienDirect = async () => {
    if (!lien) return
    await navigator.clipboard.writeText(lien)
    setCopie('direct')
    setTimeout(() => setCopie(null), 2000)
    await marquerEnvoye()
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <button onClick={() => setOuvert(p => !p)}
        style={{ background: c.surface2, border: `1px solid ${c.border}`, color: c.success, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ✉️ {ouvert ? "Masquer l'email" : "Voir l'email à envoyer"}
      </button>

      {ouvert && (
        <div style={{ marginTop: '10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '16px' }}>
          {palier && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <button onClick={() => setCycle('mensuel')}
                style={{ background: cycle === 'mensuel' ? c.accent : 'transparent', color: cycle === 'mensuel' ? '#fff' : c.textMuted, border: cycle === 'mensuel' ? 'none' : `1px solid ${c.border}`, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                Mensuel
              </button>
              <button onClick={() => setCycle('annuel')}
                style={{ background: cycle === 'annuel' ? c.accent : 'transparent', color: cycle === 'annuel' ? '#fff' : c.textMuted, border: cycle === 'annuel' ? 'none' : `1px solid ${c.border}`, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                Annuel
              </button>
            </div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Objet</span>
            <div style={{ color: c.text, fontSize: '13px', marginTop: '4px', fontFamily: 'monospace' }}>{objet}</div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Corps du mail</span>
            <pre style={{ color: c.text, fontSize: '12px', marginTop: '6px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.6', background: 'transparent', border: 'none', padding: 0 }}>
              {corps}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={copierEmail}
              style={{ background: c.accent, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              {copie === 'email' ? '✓ Copié !' : "📋 Copier tout l'email"}
            </button>
            {lienInscription && (
              <button onClick={copierLienInscription}
                style={{ background: c.surface2, border: `1px solid ${c.border}`, color: c.text, padding: '9px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                {copie === 'inscription' ? '✓ Copié !' : "🔗 Copier le lien d'inscription"}
              </button>
            )}
            {lien && (
              <button onClick={copierLienDirect}
                style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, padding: '9px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                {copie === 'direct' ? '✓ Copié !' : '💳 Lien Stripe direct (déjà inscrit)'}
              </button>
            )}
            <a href={`mailto:${demande.email}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`}
              onClick={() => { if (lienInscription) marquerEnvoye() }}
              style={{ background: c.surface2, border: `1px solid ${c.border}`, color: c.text, padding: '9px 16px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              📨 Ouvrir dans Mail
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClubRequests({ demandesClub, traitantDemande, marquerDemandeTraitee, setDemandesClub }) {
  const { c, rgba } = useCoachTheme()
  return (
    <>
      <p style={{ color: c.textMuted, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Demandes de contact envoyées depuis la page /offres (formulaire club — pas de paiement en
        libre-service). Recontacte sous 24-48h, puis marque comme traité une fois le club activé
        ou la demande close.
      </p>
      {demandesClub.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📨</p>
            <p style={{ color: c.textMuted }}>Aucune demande pour le moment</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {demandesClub.map(d => (
            <div key={d.id} style={{ background: c.surface, border: `1px solid ${d.statut === 'nouveau' ? rgba(c.warn, 0.4) : c.border}`, borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: c.text }}>{d.prenom} {d.nom}</p>
                    {d.type ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: d.type === 'abonnement' ? c.success : c.accent, background: rgba(d.type === 'abonnement' ? c.success : c.accent, 0.12), border: `1px solid ${rgba(d.type === 'abonnement' ? c.success : c.accent, 0.3)}`, padding: '2px 8px', borderRadius: '20px' }}>
                        {d.type === 'abonnement' ? '💳 Abonnement' : '💬 Question'}
                      </span>
                    ) : d.role ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: c.accent, background: rgba(c.accent, 0.12), border: `1px solid ${rgba(c.accent, 0.3)}`, padding: '2px 8px', borderRadius: '20px' }}>{d.role}</span>
                    ) : null}
                    {d.statut === 'nouveau' && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: c.warn, background: rgba(c.warn, 0.12), border: `1px solid ${rgba(c.warn, 0.3)}`, padding: '2px 8px', borderRadius: '20px' }}>NOUVEAU</span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.textMuted }}>{d.email}{d.telephone ? ` · ${d.telephone}` : ''}</p>
                  {d.nom_club && (
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: c.textMuted }}>
                      🏟️ {d.nom_club}{d.ville ? ` · ${d.ville}` : ''}{d.nb_licencies && STRIPE_LINKS_CLUB[d.nb_licencies] ? ` · ${STRIPE_LINKS_CLUB[d.nb_licencies].label}` : ''}{d.cycle ? ` · ${d.cycle}` : ''}
                    </p>
                  )}
                  {(d.ligue || d.nb_membres) && (
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: c.textMuted }}>
                      {d.ligue ? `🏆 ${d.ligue}` : ''}{d.ligue && d.nb_membres ? ' · ' : ''}{d.nb_membres ? `👥 ${d.nb_membres} membres` : ''}
                    </p>
                  )}
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: c.textMuted }}>{new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {d.lien_paiement_envoye && (
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: c.success }}>
                      ✓ Lien copié le {new Date(d.lien_paiement_envoye_le).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {d.statut === 'nouveau' ? (
                    <button onClick={() => marquerDemandeTraitee(d.id)} disabled={traitantDemande === d.id}
                      style={{ background: rgba(c.success, 0.12), border: `1px solid ${rgba(c.success, 0.4)}`, color: c.success, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {traitantDemande === d.id ? 'Mise à jour...' : '✓ Marquer comme traité'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: c.success, fontWeight: 600 }}>✓ Traité</span>
                  )}
                </div>
              </div>
              {d.message && (
                <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: 1.6, borderTop: `1px solid ${c.border}`, paddingTop: '10px' }}>{d.message}</p>
              )}
              {d.type === 'abonnement' && d.nb_licencies && d.statut !== 'traite' && (
                <EmailBlockClub demande={d} onLienEnvoye={() => setDemandesClub(prev => prev.map(x => x.id === d.id ? { ...x, lien_paiement_envoye: true, lien_paiement_envoye_le: new Date().toISOString() } : x))} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
