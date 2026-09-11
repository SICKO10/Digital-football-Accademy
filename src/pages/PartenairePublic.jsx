import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors, alpha } from '../tokens'

const STATUTS_LABEL = { a_faire: 'À faire', fait: 'Fait' }

// Portail partenaire — accès par lien privé (token uuid dans l'URL), sans
// compte ni mot de passe : cf. supabase_portail_partenaire.sql. Les deux RPC
// SECURITY DEFINER ne renvoient/modifient que la ligne correspondant au
// token fourni, jamais la table sponsors entière.
export default function PartenairePublic() {
  const { token } = useParams()
  const [sponsor, setSponsor] = useState(undefined) // undefined = chargement, null = introuvable
  const [club, setClub] = useState(null)
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_sponsor_by_token', { p_token: token })
      const s = Array.isArray(data) ? data[0] : data
      if (error || !s) { setSponsor(null); return }
      setSponsor(s)
      setDemandeEnvoyee(!!s.demande_renouvellement)
      const { data: c } = await supabase.from('profiles').select('club, avatar_url, couleur_principale').eq('id', s.club_id).maybeSingle()
      setClub(c || null)
    })()
  }, [token])

  const demanderRenouvellement = async () => {
    await supabase.rpc('demander_renouvellement_sponsor', { p_token: token })
    setDemandeEnvoyee(true)
  }

  if (sponsor === undefined) {
    return <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint }}>Chargement...</div>
  }
  if (sponsor === null) {
    return <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint, fontSize: '14px' }}>Lien invalide ou expiré.</div>
  }

  const accent = club?.couleur_principale || colors.accent.green
  const paiements = Array.isArray(sponsor.paiements) ? sponsor.paiements : []
  const totalRecu = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0)
  const total = Number(sponsor.montant_contrat) || 0
  const engagements = sponsor.contreparties_suivi || []
  const documents = sponsor.documents || []
  const finProche = sponsor.date_fin && new Date(sponsor.date_fin) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px 24px', marginBottom: '20px' }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: accent, padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {club?.avatar_url && <img src={club.avatar_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />}
        <div>
          <div style={{ color: colors.black, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7 }}>Espace partenaire</div>
          <h1 style={{ color: colors.black, fontSize: '24px', fontWeight: 900, margin: '2px 0 0' }}>{club?.club || 'Notre club'}</h1>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px' }}>
        <div style={card}>
          <p style={{ margin: '0 0 4px', color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Partenariat</p>
          <h2 style={{ margin: '0 0 16px', color: colors.text.primary, fontSize: '20px', fontWeight: 900 }}>{sponsor.entreprise}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px', color: colors.text.faint, fontSize: '11px' }}>Contrat</p>
              <p style={{ margin: 0, fontWeight: 800, color: colors.text.primary }}>{total.toLocaleString('fr-FR')} €</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: colors.text.faint, fontSize: '11px' }}>Reçu</p>
              <p style={{ margin: 0, fontWeight: 800, color: colors.accent.green }}>{totalRecu.toLocaleString('fr-FR')} €</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: colors.text.faint, fontSize: '11px' }}>Restant</p>
              <p style={{ margin: 0, fontWeight: 800, color: colors.text.primary }}>{Math.max(0, total - totalRecu).toLocaleString('fr-FR')} €</p>
            </div>
          </div>
          {sponsor.date_signature && (
            <p style={{ margin: '16px 0 0', color: colors.text.faint, fontSize: '12px' }}>
              Depuis le {new Date(sponsor.date_signature).toLocaleDateString('fr-FR')}
              {sponsor.date_fin && ` · jusqu'au ${new Date(sponsor.date_fin).toLocaleDateString('fr-FR')}`}
            </p>
          )}
          {finProche && (
            <div style={{ marginTop: '16px' }}>
              {demandeEnvoyee ? (
                <p style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 700, margin: 0 }}>✅ Demande de renouvellement envoyée au club</p>
              ) : (
                <button onClick={demanderRenouvellement} style={{ background: accent, color: colors.black, border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                  ↻ Je souhaite renouveler ce partenariat
                </button>
              )}
            </div>
          )}
        </div>

        {paiements.length > 0 && (
          <div style={card}>
            <p style={{ margin: '0 0 14px', color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>Échéancier de paiement</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {paiements.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : ''} {p.mode ? `· ${p.mode}` : ''}</span>
                  <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>{Number(p.montant).toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {engagements.length > 0 && (
          <div style={card}>
            <p style={{ margin: '0 0 14px', color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>Contreparties</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {engagements.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '10px 14px', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px' }}>{item.label}</p>
                    {item.echeance && <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>Échéance : {new Date(item.echeance).toLocaleDateString('fr-FR')}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.preuve_url && <a href={item.preuve_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: colors.accent.blue }}>📷 Voir</a>}
                    <span style={{ background: item.statut === 'fait' ? colors.accent.green + alpha.subtle : colors.background.base, color: item.statut === 'fait' ? colors.accent.green : colors.text.faint, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                      {STATUTS_LABEL[item.statut] || item.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div style={card}>
            <p style={{ margin: '0 0 14px', color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>Documents</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ color: colors.accent.blue, fontSize: '13px', textDecoration: 'none' }}>📄 {d.label || 'Document'}</a>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', color: colors.text.ghost, fontSize: '11px', marginTop: '20px' }}>
          Merci pour votre soutien à {club?.club || 'notre club'}.
        </p>
      </div>
    </div>
  )
}
