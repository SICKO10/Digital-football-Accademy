import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Aperçu des dernières actualités du club sur l'Accueil éducateur — remplace
// le lien de nav dédié "Actualités du club" (retiré, la nav étant déjà
// dense) : la page complète (activeSection === 'annonces', inchangée) reste
// accessible via "Voir tout".
export default function AnnoncesClubWidget({ clubId, userId, onVoirTout, accentColor = '#60a5fa' }) {
  const colors = useColors()
  const [annonces, setAnnonces] = useState([])
  const [luesIds, setLuesIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) { setLoading(false); return }
    const charger = async () => {
      const { data } = await supabase.from('annonces_club').select('id, titre, auteur_nom, created_at')
        .eq('club_id', clubId).in('cible', ['tous', 'educateurs'])
        .order('created_at', { ascending: false }).limit(3)
      setAnnonces(data || [])
      const { data: lues } = await supabase.from('annonces_lues').select('annonce_id').eq('user_id', userId)
      setLuesIds(new Set((lues || []).map(l => l.annonce_id)))
      setLoading(false)
    }
    charger()
  }, [clubId, userId])

  if (loading || annonces.length === 0) return null
  const nbNonLues = annonces.filter(a => !luesIds.has(a.id)).length
  // Une fois toutes les actualités affichées lues, le widget s'efface —
  // il ne réapparaît qu'à la prochaine actualité publiée par le club,
  // au lieu de rester affiché indéfiniment en grisé.
  if (nbNonLues === 0) return null

  return (
    <div style={{ background: accentColor + '10', border: `1px solid ${accentColor}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: accentColor }}>Actualités du club</p>
        {nbNonLues > 0 && (
          <span style={{ background: accentColor, color: '#000', borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nbNonLues}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {annonces.map(a => (
          <button key={a.id} onClick={onVoirTout} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontFamily: 'Inter, sans-serif' }}>
            <span style={{ fontSize: '12px', color: luesIds.has(a.id) ? colors.text.faint : colors.text.primary, fontWeight: luesIds.has(a.id) ? 400 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.titre}
            </span>
            <span style={{ color: colors.text.faint, fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </button>
        ))}
      </div>
      <button onClick={onVoirTout} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>
        Voir tout →
      </button>
    </div>
  )
}
