import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

// Bandeau "Nos partenaires" — cf. supabase_sponsors_bandeau.sql. Ne jamais
// select('*') ici : la table sponsors porte aussi des données de contrat
// (montant, paiements, documents) réservées au staff du club.
export default function SponsorsBar({ clubId }) {
  const colors = useColors()
  const [sponsors, setSponsors] = useState([])

  useEffect(() => {
    if (!clubId) return
    supabase.from('sponsors')
      .select('id, entreprise, logo_url, lien_url, ordre_bandeau')
      .eq('club_id', clubId).eq('saison', saisonActuelle()).eq('afficher_bandeau', true)
      .order('ordre_bandeau', { ascending: true })
      .then(({ data }) => setSponsors(data || []))
  }, [clubId])

  if (!sponsors.length) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
      background: colors.background.surface, borderTop: `1px solid ${colors.border.subtle}`,
      padding: '10px 20px',
    }}>
      <div style={{ color: colors.text.faint, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
        Nos partenaires
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {sponsors.map(sponsor => (
          <a key={sponsor.id} href={sponsor.lien_url || undefined} target={sponsor.lien_url ? '_blank' : undefined} rel="noreferrer"
            title={sponsor.entreprise} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', pointerEvents: sponsor.lien_url ? 'auto' : 'none' }}>
            {sponsor.logo_url ? (
              <img src={sponsor.logo_url} alt={sponsor.entreprise}
                style={{ height: '28px', maxWidth: '80px', objectFit: 'contain', opacity: 0.85, transition: 'opacity 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1 }} onMouseLeave={e => { e.currentTarget.style.opacity = 0.85 }} />
            ) : (
              <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, padding: '4px 10px', border: `1px solid ${colors.border.default}`, borderRadius: '6px' }}>
                {sponsor.entreprise}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
