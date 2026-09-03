import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

export default function DeplacementsAssignesWidget({ userId, equipeActiveId, equipeUnique = true, accentColor = '#60a5fa', onOuvrirFiche }) {
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
    setDeplacements(scopes.slice(0, 2))
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

  if (loading || deplacements.length === 0) return null

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 10px', color: accentColor }}>🚌 Prochains déplacements</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {deplacements.slice(0, 2).map(d => {
          const date = new Date(d.date_depart + 'T12:00:00')
          const joursRestants = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
          const urgent = joursRestants <= 3
          const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
          const badge = joursRestants <= 0 ? "Aujourd'hui" : joursRestants === 1 ? 'Demain' : `J-${joursRestants}`

          return (
            <div key={d.id} style={{
              background: urgent ? 'rgba(249,115,22,0.06)' : 'rgba(96,165,250,0.05)',
              border: `1px solid ${urgent ? 'rgba(249,115,22,0.2)' : 'rgba(96,165,250,0.15)'}`,
              borderRadius: '10px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                background: urgent ? 'rgba(249,115,22,0.12)' : 'rgba(96,165,250,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>
                🚌
              </div>

              <div style={{ flex: 1, minWidth: '140px' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.lieu_destination || d.equipe || 'Déplacement'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>
                  {dateStr}
                  {d.heure_depart ? ` · départ ${d.heure_depart.slice(0, 5)}` : ''}
                  {d.ville_destination ? ` · ${d.ville_destination}` : ''}
                  {' · '}{d.vehicule || 'Bus à confirmer'}
                </p>
              </div>

              <div style={{
                flexShrink: 0,
                background: urgent ? 'rgba(249,115,22,0.15)' : 'rgba(96,165,250,0.10)',
                border: `1px solid ${urgent ? '#f97316' : '#3b82f6'}`,
                borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                color: urgent ? '#f97316' : '#60a5fa',
              }}>
                {badge}
              </div>

              {onOuvrirFiche && (
                <button onClick={() => onOuvrirFiche(d)}
                  style={{ flexShrink: 0, background: 'transparent', border: `1px solid ${colors.border.default}`, color: d.fiche_completee ? accentColor : colors.text.faint, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {d.fiche_completee ? '✅ Fiche remplie' : '✏️ Remplir la fiche'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
