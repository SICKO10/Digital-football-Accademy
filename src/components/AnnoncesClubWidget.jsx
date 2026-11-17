import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { styleCarteLiseree, styleTitreEcran, styleChiffreHeros, CLASSE_CLIQUABLE } from '../lib/identite'
import { EtiquetteStatut } from './identite'
import { police } from '../tokens'

// Aperçu des dernières actualités du club sur l'Accueil éducateur — remplace
// le lien de nav dédié "Actualités du club" (retiré, la nav étant déjà
// dense) : la page complète (activeSection === 'annonces', inchangée) reste
// accessible via "Voir tout".
export default function AnnoncesClubWidget({ clubId, userId, onVoirTout }) {
  const colors = useColors()
  const [annonces, setAnnonces] = useState([])
  const [luesIds, setLuesIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) { setLoading(false); return }
    const charger = async () => {
      const [{ data }, { data: lues }] = await Promise.all([
        supabase.from('annonces_club').select('id, titre, auteur_nom, created_at')
          .eq('club_id', clubId).in('cible', ['tous', 'educateurs'])
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('annonces_lues').select('annonce_id').eq('user_id', userId),
      ])
      setAnnonces(data || [])
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

  const lien = { background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: police.texte }
  return (
    <div style={{ ...styleCarteLiseree(colors), marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ ...styleTitreEcran(colors), fontSize: '20px' }}>Actualités du club</p>
        {nbNonLues > 0 && <EtiquetteStatut couleur={colors.accent.brand}>{nbNonLues} nouvelle{nbNonLues > 1 ? 's' : ''}</EtiquetteStatut>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {annonces.map(a => (
          <button key={a.id} type="button" onClick={onVoirTout} className={CLASSE_CLIQUABLE} style={{ ...lien, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', minHeight: '32px' }}>
            <span style={{ fontSize: '14px', color: luesIds.has(a.id) ? colors.text.secondary : colors.text.primary, fontWeight: luesIds.has(a.id) ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.titre}
            </span>
            <span style={{ ...styleChiffreHeros(colors, 14), fontFamily: police.texte, fontWeight: 500, color: colors.text.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onVoirTout} className={CLASSE_CLIQUABLE} style={{ ...lien, color: colors.text.primary, fontSize: '13px', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        Voir tout
      </button>
    </div>
  )
}
