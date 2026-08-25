import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

const st = {
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.25rem' },
  totalCard: { background: '#161616', border: '1px solid #333', borderRadius: '12px', padding: '1.25rem' },
  groupWrap: { border: '1px solid #1e1e1e', borderRadius: '14px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 },
  value: { fontSize: '13px', fontWeight: 700, color: '#fff', margin: '2px 0 0' },
  chip: { fontSize: '10px', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '20px', padding: '2px 8px' },
  chipOrpheline: { fontSize: '10px', fontWeight: 700, color: '#666', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '2px 8px' },
}

const CHAMPS_SOMMABLES = ['matchs_joues', 'buts', 'passes_decisives', 'minutes_jouees', 'cleansheets', 'victoires', 'nuls', 'defaites', 'seances_realisees', 'seances_total']

const sommerLignes = (rows) => rows.reduce((acc, r) => {
  CHAMPS_SOMMABLES.forEach(k => { acc[k] = (acc[k] || 0) + (r[k] || 0) })
  return acc
}, {})

// Affichage lecture seule des saisons clôturées d'un joueur (historique_saisons,
// alimenté côté éducateur par GestionCloturesSaison). Un joueur peut avoir
// plusieurs lignes pour une même saison (une par équipe/educateur_id) — on
// les étiquette par équipe et on affiche un total combiné quand il y en a
// plus d'une.
function CarteStats({ s, taille = 'normal' }) {
  const totalMatchs = (s.victoires || 0) + (s.nuls || 0) + (s.defaites || 0)
  const tauxPresence = s.seances_total > 0 ? Math.round((s.seances_realisees / s.seances_total) * 100) : null
  return (
    <>
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
      {totalMatchs > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '11px' }}>
          <span style={{ color: '#4ade80' }}>{s.victoires || 0}V</span>
          <span style={{ color: '#eab308' }}>{s.nuls || 0}N</span>
          <span style={{ color: '#ef4444' }}>{s.defaites || 0}D</span>
        </div>
      )}
      {taille === 'normal' && s.notes && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>"{s.notes}"</p>}
    </>
  )
}

export default function HistoriqueSaisons({ joueurId }) {
  const [saisons, setSaisons] = useState([])
  const [equipeLabels, setEquipeLabels] = useState({})
  const [loading, setLoading] = useState(true)
  const [cartesOuvertes, setCartesOuvertes] = useState({})

  const toggleCarte = (id) => {
    setCartesOuvertes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    if (!joueurId) return
    setLoading(true)
    supabase
      .from('historique_saisons')
      .select('*')
      .eq('joueur_id', joueurId)
      .eq('cloturee', true)
      .order('saison', { ascending: false })
      .then(async ({ data }) => {
        const rows = data || []
        const educateurIds = [...new Set(rows.map(r => r.educateur_id).filter(Boolean))]
        const labels = {}
        if (educateurIds.length > 0) {
          const [{ data: eqData }, { data: eduData }] = await Promise.all([
            supabase.from('equipe_joueurs').select('educateur_id, categorie').eq('joueur_id', joueurId).in('educateur_id', educateurIds),
            supabase.from('profiles').select('id, prenom, nom').in('id', educateurIds),
          ])
          // Repli (nom du coach) posé en premier, la catégorie l'écrase quand elle existe — libellé le plus parlant en priorité.
          ;(eduData || []).forEach(p => { labels[p.id] = `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Équipe' })
          ;(eqData || []).forEach(e => { if (e.categorie) labels[e.educateur_id] = e.categorie })
        }
        setEquipeLabels(labels)
        setSaisons(rows)
        setLoading(false)
      })
  }, [joueurId])

  if (loading) return <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
  if (saisons.length === 0) return <p style={{ color: '#444', fontSize: '13px' }}>Aucune saison clôturée pour l'instant.</p>

  const labelEquipe = (s) => s.educateur_id ? (equipeLabels[s.educateur_id] || 'Équipe') : 'Coach parti'

  const saisonKeys = [...new Set(saisons.map(s => s.saison))]
  const parSaison = saisons.reduce((acc, s) => { (acc[s.saison] ||= []).push(s); return acc }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {saisonKeys.map(saison => {
        const rows = parSaison[saison]
        const multi = rows.length > 1
        const totaux = multi ? sommerLignes(rows) : null

        return (
          <div key={saison} style={multi ? st.groupWrap : undefined}>
            {multi && (
              <div style={st.totalCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{saison} — Total {rows.length} équipes</p>
                </div>
                <CarteStats s={totaux} taille="total" />
              </div>
            )}
            {rows.map(s => {
              const ouverte = !!cartesOuvertes[s.id]
              return (
                <div key={s.id} style={st.card}>
                  <div
                    onClick={() => toggleCarte(s.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: ouverte ? '10px' : 0, flexWrap: 'wrap', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#555', fontSize: '11px', transform: ouverte ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                      {!multi && <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{s.saison}</p>}
                      <span style={s.educateur_id ? st.chip : st.chipOrpheline}>{labelEquipe(s)}</span>
                    </div>
                    {((s.victoires || 0) + (s.nuls || 0) + (s.defaites || 0)) > 0 && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                        <span style={{ color: '#4ade80' }}>{s.victoires || 0}V</span>
                        <span style={{ color: '#eab308' }}>{s.nuls || 0}N</span>
                        <span style={{ color: '#ef4444' }}>{s.defaites || 0}D</span>
                      </div>
                    )}
                  </div>
                  {ouverte && <CarteStats s={s} />}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
