import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Répartition manuelle Bus 1 / Bus 2 / Location pour un déplacement donné.
// `joueurs` est le roster par défaut (tous les joueurs de l'équipe du
// déplacement, cf. joueursDuDeplacement dans Deplacements.jsx) — il n'y a pas
// d'étape de sélection des convoqués séparée pour l'instant, donc tous ces
// joueurs apparaissent d'office, à affiner manuellement bus par bus.
const BUS_LABELS = {
  1: { label: 'Bus 1', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  2: { label: 'Bus 2', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  3: { label: 'Location', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
}
const CAPACITE_BUS = 9

export default function RepartitionBus({ deplacementId, joueurs, onSaved, readOnly = false }) {
  const [repartition, setRepartition] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const charger = async () => {
      setLoading(true)
      const { data } = await supabase.from('deplacements_joueurs').select('joueur_id, bus_numero').eq('deplacement_id', deplacementId)
      const init = {}
      ;(data || []).forEach(c => { init[c.joueur_id] = c.bus_numero })
      setRepartition(init)
      setLoading(false)
    }
    charger()
  }, [deplacementId])

  const joueursDuBus = (busNum) => joueurs.filter(j => (repartition[j.id] || 1) === busNum)
  const assignerBus = (joueurId, busNum) => setRepartition(prev => ({ ...prev, [joueurId]: busNum }))

  const sauvegarder = async () => {
    setSaving(true)
    const payload = joueurs.map(j => ({ deplacement_id: deplacementId, joueur_id: j.id, bus_numero: repartition[j.id] || 1 }))
    const { error } = await supabase.from('deplacements_joueurs').upsert(payload, { onConflict: 'deplacement_id,joueur_id' })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    onSaved?.()
  }

  if (loading) return <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Chargement...</p>
  if (joueurs.length === 0) return <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Aucun joueur trouvé pour l'équipe de ce déplacement — vérifie que la catégorie et l'effectif sont bien renseignés dans Sportif.</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[1, 2, 3].map(busNum => {
          const joueursBus = joueursDuBus(busNum)
          const { label, color, bg } = BUS_LABELS[busNum]
          const plein = joueursBus.length >= CAPACITE_BUS
          return (
            <div key={busNum} style={{ flex: 1, minWidth: '120px', background: bg, border: `1px solid ${color}40`, borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '4px' }}>{busNum === 3 ? '🚐' : '🚌'} {label}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>
                {joueursBus.length}<span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>/{CAPACITE_BUS}</span>
              </div>
              {plein && <div style={{ fontSize: '10px', color: '#fb923c', fontWeight: 600, marginTop: '2px' }}>⚠️ Complet</div>}
            </div>
          )
        })}
      </div>

      {readOnly ? (
        <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>La répartition nominative des joueurs par bus est gérée par l'éducateur de l'équipe.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {joueurs.map(j => {
              const busActuel = repartition[j.id] || 1
              const { color: couleurBus } = BUS_LABELS[busActuel]
              return (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#151515', borderRadius: '8px', border: '1px solid #262626' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: couleurBus + '30', color: couleurBus, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {(j.prenom?.[0] || '') + (j.nom?.[0] || '')}
                  </div>
                  <span style={{ flex: 1, fontSize: '13px', color: '#fff', fontWeight: 500 }}>{j.prenom} {j.nom}</span>
                  {j.poste && <span style={{ fontSize: '11px', color: '#666' }}>{j.poste}</span>}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3].map(busNum => {
                      const { color, bg } = BUS_LABELS[busNum]
                      const actif = busActuel === busNum
                      return (
                        <button key={busNum} onClick={() => assignerBus(j.id, busNum)}
                          style={{ padding: '4px 9px', borderRadius: '6px', border: actif ? `2px solid ${color}` : '2px solid #333', background: actif ? bg : 'transparent', color: actif ? color : '#666', fontSize: '11px', fontWeight: 700, cursor: 'pointer', minWidth: '50px', fontFamily: 'Inter, sans-serif' }}>
                          {busNum === 3 ? '🚐 Loc.' : `🚌 B${busNum}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={sauvegarder} disabled={saving}
            style={{ width: '100%', padding: '11px', background: saving ? '#333' : '#4ade80', color: saving ? '#999' : '#0a0a0a', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Sauvegarde...' : '💾 Enregistrer la répartition'}
          </button>
        </>
      )}
    </div>
  )
}
