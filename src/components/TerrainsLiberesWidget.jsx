import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Date du jour au format local YYYY-MM-DD — jamais toISOString() (convertit en
// UTC, ce qui décale la date d'un jour en France, cf. le même bug déjà corrigé
// dans PlanningTerrains.jsx/getDatesSemaine).
const aujourdhuiStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TerrainsLiberesWidget({ clubId, accentColor = '#4ade80', titre = 'Terrains disponibles ce jour' }) {
  const [creneaux, setCreneaux] = useState([])
  const [loading, setLoading] = useState(true)

  // Les libérations passent par planning_terrains_exceptions (date précise),
  // pas par l'ancienne colonne planning_terrains.libere (recurrente par jour
  // de semaine, plus jamais écrite depuis l'introduction des exceptions —
  // cf. liberer_creneau_date dans PlanningTerrains.jsx) : interroger cette
  // colonne ne renvoyait donc plus jamais rien.
  const charger = async () => {
    const { data } = await supabase
      .from('planning_terrains_exceptions')
      .select('id, date_exception, libere_par, creneau:creneau_id(heure_debut, heure_fin, terrain:terrain_id(nom))')
      .eq('club_id', clubId)
      .eq('type', 'liberation')
      .eq('date_exception', aujourdhuiStr())
    const tries = (data || []).slice().sort((a, b) => (a.creneau?.heure_debut || '').localeCompare(b.creneau?.heure_debut || ''))
    setCreneaux(tries)
    setLoading(false)
  }

  useEffect(() => {
    if (!clubId) return
    charger()

    // Live : dès qu'un éducateur libère (ou reprend) un créneau, le bandeau se met à jour sans reload.
    const channel = supabase
      .channel(`terrains_liberes_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_terrains_exceptions', filter: `club_id=eq.${clubId}` }, () => charger())
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
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
            <span>
              <span style={{ color: accentColor, fontWeight: 600, marginRight: '8px' }}>
                {new Date(`${c.date_exception}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
              · {c.creneau?.terrain?.nom || 'Terrain'} · {c.creneau?.heure_debut?.slice(0, 5)}–{c.creneau?.heure_fin?.slice(0, 5)}
            </span>
            <span style={{ color: '#555', fontSize: '11px', whiteSpace: 'nowrap' }}>libéré par {c.libere_par || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
