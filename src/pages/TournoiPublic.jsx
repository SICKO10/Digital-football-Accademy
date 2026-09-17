import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { calculerClassement, PHASE_LABEL, PHASE_ORDRE } from '../lib/tournoi'

const ONGLETS_BASE = [
  { key: 'planning', label: 'Planning' },
  { key: 'classement', label: 'Classement' },
]

export default function TournoiPublic() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [tournoi, setTournoi] = useState(null)
  const [equipes, setEquipes] = useState([])
  const [matchs, setMatchs] = useState([])
  const [onglet, setOnglet] = useState('planning')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const charger = useCallback(async () => {
    const { data: t } = await supabase.from('tournois_organises').select('*').eq('code_public', code?.toUpperCase()).maybeSingle()
    if (!t) { setNotFound(true); setLoading(false); return }
    setTournoi(t)
    const [{ data: eqs }, { data: mts }] = await Promise.all([
      supabase.from('tournois_equipes').select('*').eq('tournoi_id', t.id).order('poule'),
      supabase.from('tournois_matchs_organises').select('*').eq('tournoi_id', t.id).order('heure_debut'),
    ])
    setEquipes(eqs || []); setMatchs(mts || [])
    setLoading(false)
  }, [code])

  useEffect(() => {
    charger()
    const interval = setInterval(charger, 30000)
    return () => clearInterval(interval)
  }, [charger])

  const getEquipe = (id) => equipes.find(e => e.id === id)
  const poules = [...new Set(equipes.map(e => e.poule))].sort()
  const matchsElim = matchs.filter(m => m.phase !== 'poule')
  const onglets = matchsElim.length > 0 ? [...ONGLETS_BASE, { key: 'finale', label: 'Phase finale' }] : ONGLETS_BASE

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    header: { background: colors.background.surface, borderBottom: `1px solid ${colors.border.subtle}`, padding: '20px 24px' },
    body: { padding: '24px 16px', maxWidth: '900px', margin: '0 auto' },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '18px', marginBottom: '12px' },
    tab: (actif) => ({ padding: '8px 18px', borderRadius: '20px', border: actif ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: actif ? colors.accent.green + '15' : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontWeight: actif ? 700 : 400, fontSize: '13px', cursor: 'pointer' }),
    th: { background: colors.background.raised, padding: '8px 10px', textAlign: 'left', color: colors.text.faint, fontSize: '11px', fontWeight: 700 },
    td: { padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, fontSize: '13px' },
  }

  if (loading) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: colors.accent.green, fontSize: '16px' }}>Chargement…</div>
    </div>
  )

  if (notFound) return (
    <div style={{ ...st.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <p style={{ color: colors.text.faint }}>Tournoi introuvable — vérifie le code.</p>
      <button onClick={() => navigate('/')} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Retour à l'accueil</button>
    </div>
  )

  const matchsPoule = matchs.filter(m => m.phase === 'poule')
  const parHeure = {}
  matchsPoule.forEach(m => { (parHeure[m.heure_debut] ||= []).push(m) })

  return (
    <div style={st.page}>
      <div style={st.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Digital Football · Tournoi en direct</div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>{tournoi.nom}</h1>
            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
              {tournoi.date && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{new Date(tournoi.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
              {tournoi.lieu && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{tournoi.lieu}</span>}
              {tournoi.categorie_age && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{tournoi.categorie_age}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: colors.text.disabled, fontSize: '11px' }}>Code</div>
            <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '18px', letterSpacing: '2px' }}>{code?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div style={st.body}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {onglets.map(o => <button key={o.key} onClick={() => setOnglet(o.key)} style={st.tab(onglet === o.key)}>{o.label}</button>)}
        </div>

        {onglet === 'planning' && (
          matchsPoule.length === 0
            ? <div style={{ ...st.card, textAlign: 'center', padding: '40px', color: colors.text.faint }}>Le planning n'a pas encore été publié.</div>
            : Object.entries(parHeure).sort(([a], [b]) => a.localeCompare(b)).map(([heure, mts]) => (
              <div key={heure} style={{ marginBottom: '14px' }}>
                <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>{heure?.slice(0, 5)}</div>
                {mts.sort((a, b) => a.terrain - b.terrain).map(m => {
                  const ea = getEquipe(m.equipe_a_id), eb = getEquipe(m.equipe_b_id)
                  return (
                    <div key={m.id} style={{ ...st.card, marginBottom: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: colors.text.disabled, fontSize: '12px', minWidth: '64px' }}>Terrain {m.terrain}</span>
                      <span style={{ background: colors.accent.blue + '20', color: colors.accent.blue, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, minWidth: '52px', textAlign: 'center' }}>Poule {m.poule}</span>
                      <span style={{ fontWeight: 700, flex: 1, textAlign: 'right', fontSize: '13px' }}>{ea?.nom || '?'}</span>
                      {m.statut === 'termine'
                        ? <span style={{ fontWeight: 800, color: colors.accent.green, fontSize: '15px', padding: '0 10px' }}>{m.score_a} - {m.score_b}</span>
                        : <span style={{ color: colors.text.disabled, fontWeight: 700, padding: '0 10px' }}>vs</span>}
                      <span style={{ fontWeight: 700, flex: 1, fontSize: '13px' }}>{eb?.nom || '?'}</span>
                    </div>
                  )
                })}
              </div>
            ))
        )}

        {onglet === 'classement' && (
          poules.length === 0
            ? <div style={{ ...st.card, textAlign: 'center', padding: '40px', color: colors.text.faint }}>Aucune équipe pour l'instant.</div>
            : poules.map(poule => {
              const classement = calculerClassement(equipes, matchs, poule)
              return (
                <div key={poule} style={{ ...st.card, overflowX: 'auto' }}>
                  <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Poule {poule}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
                    <thead><tr>{['#', 'Équipe', 'J', 'V', 'N', 'D', 'Diff', 'Pts'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {classement.map((s, i) => (
                        <tr key={s.equipe.id} style={{ background: i === 0 ? colors.accent.green + '11' : 'transparent' }}>
                          <td style={st.td}><span style={{ fontWeight: 700, color: i === 0 ? colors.accent.green : i === 1 ? colors.accent.amber : colors.text.disabled }}>{i + 1}</span></td>
                          <td style={{ ...st.td, fontWeight: 700 }}>{s.equipe.nom}</td>
                          <td style={st.td}>{s.j}</td>
                          <td style={{ ...st.td, color: colors.accent.green }}>{s.v}</td>
                          <td style={st.td}>{s.n}</td>
                          <td style={{ ...st.td, color: colors.accent.red }}>{s.d}</td>
                          <td style={{ ...st.td, color: s.diff >= 0 ? colors.accent.green : colors.accent.red }}>{s.diff > 0 ? '+' : ''}{s.diff}</td>
                          <td style={{ ...st.td, fontWeight: 800, color: colors.accent.green, fontSize: '15px' }}>{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })
        )}

        {onglet === 'finale' && (
          PHASE_ORDRE.filter(ph => matchsElim.some(m => m.phase === ph)).map(phase => (
            <div key={phase} style={st.card}>
              <h3 style={{ margin: '0 0 14px', color: phase === 'finale' ? colors.accent.amber : colors.accent.purple, fontSize: '15px', fontWeight: 800 }}>{PHASE_LABEL[phase]}</h3>
              {matchsElim.filter(m => m.phase === phase).map(m => {
                const ea = getEquipe(m.equipe_a_id), eb = getEquipe(m.equipe_b_id)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                    <span style={{ color: colors.text.disabled, fontSize: '12px', minWidth: '40px' }}>{m.heure_debut?.slice(0, 5)}</span>
                    <span style={{ fontWeight: 700, flex: 1, textAlign: 'right', fontSize: '14px' }}>{ea?.nom || '?'}</span>
                    {m.statut === 'termine'
                      ? <span style={{ fontWeight: 800, color: phase === 'finale' ? colors.accent.amber : colors.accent.green, fontSize: '16px', padding: '0 14px' }}>{m.score_a} - {m.score_b}</span>
                      : <span style={{ color: colors.text.disabled, padding: '0 14px', fontWeight: 700 }}>vs</span>}
                    <span style={{ fontWeight: 700, flex: 1, fontSize: '14px' }}>{eb?.nom || '?'}</span>
                  </div>
                )
              })}
            </div>
          ))
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', color: colors.text.ghost, fontSize: '12px' }}>
          Propulsé par <span style={{ color: colors.accent.green, fontWeight: 700 }}>Digital Football</span>
        </div>
      </div>
    </div>
  )
}
