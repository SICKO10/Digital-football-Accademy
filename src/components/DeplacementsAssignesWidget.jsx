import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function DeplacementsAssignesWidget({ userId, accentColor = '#60a5fa', onOuvrirFiche }) {
  const [deplacements, setDeplacements] = useState([])
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    const aujourdHui = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('deplacements')
      .select('*')
      .eq('educateur_id', userId)
      .gte('date_depart', aujourdHui)
      .order('date_depart')
      .limit(5)
    setDeplacements(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    charger()

    // Live : un déplacement fraîchement publié (ou modifié) apparaît sans reload.
    const channel = supabase
      .channel(`deplacements_assignes_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deplacements', filter: `educateur_id=eq.${userId}` }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading || deplacements.length === 0) return null

  return (
    <div style={{ background: accentColor + '10', border: `1px solid ${accentColor}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 10px', color: accentColor }}>🚌 Déplacements qui te concernent</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {deplacements.map(d => (
          <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span>{d.equipe || 'Équipe'} · {new Date(d.date_depart + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{d.heure_depart ? ` · ${d.heure_depart.slice(0, 5)}` : ''}</span>
              <span style={{ color: '#555', fontSize: '11px', whiteSpace: 'nowrap' }}>{d.vehicule || 'Bus à confirmer'}</span>
            </div>
            {onOuvrirFiche && (
              <button onClick={() => onOuvrirFiche(d)}
                style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid #2a2a2a', color: d.fiche_completee ? accentColor : '#888', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {d.fiche_completee ? '✅ Fiche remplie — modifier' : '✏️ Remplir la fiche'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
