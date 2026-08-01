import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// index 0 = dimanche, pour matcher Date.getDay()
const JOURS_PAR_INDEX = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const jourDuJour = () => JOURS_PAR_INDEX[new Date().getDay()]

export default function TerrainsLiberesWidget({ clubId, accentColor = '#4ade80', titre = 'Terrains disponibles ce jour' }) {
  const [creneaux, setCreneaux] = useState([])
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    const { data } = await supabase
      .from('planning_terrains')
      .select('*, terrain:terrain_id(nom)')
      .eq('club_id', clubId)
      .eq('jour', jourDuJour())
      .eq('libere', true)
      .order('heure_debut')
    setCreneaux(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!clubId) return
    charger()

    // Live : dès qu'un éducateur libère (ou reprend) un créneau, le bandeau se met à jour sans reload.
    const channel = supabase
      .channel(`terrains_liberes_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_terrains', filter: `club_id=eq.${clubId}` }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  if (loading || creneaux.length === 0) return null

  return (
    <div style={{ background: accentColor + '10', border: `1px solid ${accentColor}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 10px', color: accentColor }}>🏟️ {titre}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {creneaux.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span>{c.terrain?.nom || 'Terrain'} · {c.heure_debut?.slice(0, 5)}–{c.heure_fin?.slice(0, 5)}</span>
            <span style={{ color: '#555', fontSize: '11px', whiteSpace: 'nowrap' }}>libéré par {c.libere_par || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
