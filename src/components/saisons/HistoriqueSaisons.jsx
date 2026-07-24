import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

const st = {
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.25rem' },
  label: { fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 },
  value: { fontSize: '13px', fontWeight: 700, color: '#fff', margin: '2px 0 0' },
}

// Affichage lecture seule des saisons clôturées d'un joueur (historique_saisons,
// alimenté côté éducateur par GestionCloturesSaison).
export default function HistoriqueSaisons({ joueurId }) {
  const [saisons, setSaisons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!joueurId) return
    setLoading(true)
    supabase
      .from('historique_saisons')
      .select('*')
      .eq('joueur_id', joueurId)
      .eq('cloturee', true)
      .order('saison', { ascending: false })
      .then(({ data }) => {
        setSaisons(data || [])
        setLoading(false)
      })
  }, [joueurId])

  if (loading) return <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
  if (saisons.length === 0) return <p style={{ color: '#444', fontSize: '13px' }}>Aucune saison clôturée pour l'instant.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {saisons.map(s => {
        const totalMatchs = (s.victoires || 0) + (s.nuls || 0) + (s.defaites || 0)
        const tauxPresence = s.seances_total > 0 ? Math.round((s.seances_realisees / s.seances_total) * 100) : null
        return (
          <div key={s.id} style={st.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{s.saison}</p>
              {totalMatchs > 0 && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  <span style={{ color: '#4ade80' }}>{s.victoires || 0}V</span>
                  <span style={{ color: '#eab308' }}>{s.nuls || 0}N</span>
                  <span style={{ color: '#ef4444' }}>{s.defaites || 0}D</span>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
              <div><p style={st.label}>Matchs</p><p style={st.value}>{s.matchs_joues || 0}</p></div>
              <div><p style={st.label}>Buts</p><p style={st.value}>{s.buts || 0}</p></div>
              <div><p style={st.label}>Passes</p><p style={st.value}>{s.passes_decisives || 0}</p></div>
              <div><p style={st.label}>Minutes</p><p style={st.value}>{s.minutes_jouees || 0}</p></div>
              {s.cleansheets > 0 && <div><p style={st.label}>Clean sheets</p><p style={st.value}>{s.cleansheets}</p></div>}
              {tauxPresence !== null && (
                <div>
                  <p style={st.label}>Présence entr.</p>
                  <p style={{ ...st.value, color: tauxPresence >= 80 ? '#4ade80' : tauxPresence >= 50 ? '#eab308' : '#ef4444' }}>{tauxPresence}%</p>
                </div>
              )}
            </div>
            {s.notes && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>"{s.notes}"</p>}
          </div>
        )
      })}
    </div>
  )
}
