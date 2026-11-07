import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

const IcoBus = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 16V6a2 2 0 012-2h12a2 2 0 012 2v10" /><path d="M4 12h16" /><rect x="3" y="16" width="18" height="3" rx="1" /><circle cx="7.5" cy="19" r="1.2" /><circle cx="16.5" cy="19" r="1.2" /></svg>

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

  // Carte unique "Prochain déplacement" (accueil éducateur) : seul le
  // déplacement à venir le plus proche. Les autres restent gérés dans la
  // rubrique Déplacements.
  if (loading) return null
  const d = deplacements[0]

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '16px 18px', ...(horizontal ? { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' } : {}) }}>
      {!d ? (
        <>
          <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--club-primary-soft)', color: 'var(--club-primary-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IcoBus /></span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>Prochain déplacement</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.disabled }}>Aucun déplacement prévu.</p>
          </div>
        </>
      ) : (() => {
        const date = new Date(d.date_depart + 'T12:00:00')
        const debutJour = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
        const joursRestants = Math.round((debutJour(date) - debutJour(new Date())) / (1000 * 60 * 60 * 24))
        const echeance = joursRestants <= 0 ? "Aujourd'hui" : joursRestants === 1 ? 'Demain' : `J-${joursRestants}`
        return (
          <>
            <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--club-primary-soft)', color: 'var(--club-primary-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IcoBus /></span>
            <div style={{ flex: '1 1 220px', minWidth: 0, marginTop: horizontal ? 0 : '10px' }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>Prochain déplacement</p>
              <p style={{ margin: '3px 0 0', fontWeight: 800, fontSize: '15px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.lieu_destination || d.equipe || 'Déplacement'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: colors.text.faint }}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                {d.heure_depart ? ` · départ ${d.heure_depart.slice(0, 5)}` : ''}
              </p>
            </div>
            <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '999px', background: 'var(--club-primary-soft)', color: 'var(--club-primary-dark)', fontSize: '12px', fontWeight: 800, marginTop: horizontal ? 0 : '10px' }}>{echeance}</span>
            {onOuvrirFiche && (
              <button onClick={() => onOuvrirFiche(d)}
                style={{ marginTop: horizontal ? 0 : '12px', width: horizontal ? 'auto' : '100%', flexShrink: 0, minHeight: '40px', background: 'transparent', border: `1.5px solid ${accentColor}`, color: accentColor, borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {d.fiche_completee ? 'Fiche remplie' : 'Remplir la fiche'}
              </button>
            )}
          </>
        )
      })()}
    </div>
  )
}
