import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Rangée compacte de badges de palmarès (joueur_badges, cf. Phase F —
// TournoiOrganise.jsx/LierTournoi.jsx) pour les écrans recruteur. Chaque
// insertion de badge fixe déjà sa propre couleur (colonne `couleur`, jamais
// nulle) — pas besoin de deviner une couleur à partir du `type` comme dans
// les autres variantes de ce composant.
export default function BadgesJoueur({ joueurId, limite = null, afficherSaison = false }) {
  const colors = useColors()
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!joueurId) { setLoading(false); return }
    let query = supabase.from('joueur_badges').select('*').eq('joueur_id', joueurId).order('created_at', { ascending: false })
    if (limite) query = query.limit(limite)
    query.then(({ data }) => { setBadges(data || []); setLoading(false) })
  }, [joueurId, limite])

  if (loading || badges.length === 0) return null

  const groupes = afficherSaison
    ? badges.reduce((acc, b) => { (acc[b.saison || 'Autre'] ||= []).push(b); return acc }, {})
    : { toutes: badges }

  return (
    <div>
      {Object.entries(groupes).map(([saison, items]) => (
        <div key={saison} style={{ marginBottom: afficherSaison ? '10px' : 0 }}>
          {afficherSaison && saison !== 'toutes' && (
            <div style={{ color: colors.text.disabled, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
              Saison {saison}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {items.map(badge => {
              const couleur = badge.couleur || colors.accent.green
              return (
                <div key={badge.id} title={[badge.competition, badge.club, badge.categorie].filter(Boolean).join(' · ')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: couleur + '1f', border: `1px solid ${couleur}`, color: couleur, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                  {badge.icone && <span>{badge.icone}</span>}
                  <span>{badge.label}</span>
                  {badge.sous_label && <span style={{ opacity: 0.7, fontWeight: 500 }}>· {badge.sous_label}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
