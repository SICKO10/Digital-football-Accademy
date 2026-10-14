import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// horizontal (optionnel) : infos à gauche, bouton de fiche à droite, sur
// une ligne (desktop) ; sinon carte empilée. Chargement et filtres identiques.
export default function DeplacementsAssignesWidget({ userId, equipeActiveId, equipeUnique = true, accentColor = '#60a5fa', onOuvrirFiche, horizontal = false }) {
  const colors = useColors()
  const [deplacements, setDeplacements] = useState([])
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    const aujourdHui = new Date().toISOString().split('T')[0]
    // Filtre équipe côté client (comme Deplacements.jsx) : reste robuste même
    // si club_categorie_id n'existe pas encore en base. Le .limit() passe
    // donc après le filtre, pas dans la requête, sinon on risquerait de ne
    // récupérer que des lignes d'une autre équipe avant même de filtrer.
    const { data } = await supabase
      .from('deplacements')
      .select('*')
      .eq('educateur_id', userId)
      .gte('date_depart', aujourdHui)
      .order('date_depart')
      .limit(10)
    const scopes = equipeActiveId
      ? (data || []).filter(d => d.club_categorie_id === equipeActiveId || (d.club_categorie_id == null && equipeUnique))
      : (data || [])
    setDeplacements(scopes.slice(0, 1))
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    charger()

    // Live : un déplacement fraîchement publié (ou modifié) apparaît sans reload.
    // Filtre realtime volontairement large (educateur_id, pas club_categorie_id) —
    // charger() ré-applique le filtre équipe active à chaque déclenchement.
    const channel = supabase
      .channel(`deplacements_assignes_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deplacements', filter: `educateur_id=eq.${userId}` }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, equipeActiveId])

  // Carte unique "Prochain déplacement" (accueil éducateur, colonne Club) :
  // seul le déplacement à venir le plus proche, présentation sobre. Les
  // autres déplacements restent gérés dans la rubrique Déplacements.
  if (loading) return null
  const d = deplacements[0]

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', padding: '14px 16px', ...(horizontal ? { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' } : {}) }}>
      <p style={{ margin: horizontal ? 0 : '0 0 10px', flexShrink: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>Prochain déplacement</p>
      {!d ? (
        <p style={{ margin: 0, fontSize: '12px', color: colors.text.disabled }}>Aucun déplacement prévu.</p>
      ) : (() => {
        const date = new Date(d.date_depart + 'T12:00:00')
        const joursRestants = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
        const echeance = joursRestants <= 0 ? "Aujourd'hui" : joursRestants === 1 ? 'Demain' : `J-${joursRestants}`
        return (
          <>
            <div style={horizontal ? { flex: '1 1 220px', minWidth: 0 } : undefined}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.lieu_destination || d.equipe || 'Déplacement'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>
              {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {d.heure_depart ? ` · départ ${d.heure_depart.slice(0, 5)}` : ''}
              <span style={{ color: colors.text.muted, fontWeight: 700 }}>{` · ${echeance}`}</span>
            </p>
            </div>
            {onOuvrirFiche && (
              <button onClick={() => onOuvrirFiche(d)}
                style={{ marginTop: horizontal ? 0 : '12px', width: horizontal ? 'auto' : '100%', flexShrink: 0, minHeight: '36px', background: 'transparent', border: `1px solid ${d.fiche_completee ? accentColor + '60' : colors.border.default}`, color: d.fiche_completee ? accentColor : colors.text.secondary, borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {d.fiche_completee ? 'Fiche remplie' : 'Remplir la fiche'}
              </button>
            )}
          </>
        )
      })()}
    </div>
  )
}
