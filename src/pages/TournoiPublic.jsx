import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { calculerClassement, calculerPalmares, PHASE_LABEL, PHASE_ORDRE } from '../lib/tournoi'
import SelecteurRosterEquipe from '../components/SelecteurRosterEquipe'

const VIDE_VOTE_PUBLIC = {
  vote_beau_jeu_equipe_id: '',
  vote_fairplay_equipe_id: '',
  vote_supporters_fairplay_equipe_id: '',
  vote_meilleur_joueur_nom: '',
  vote_meilleur_joueur_equipe: '',
  vote_meilleur_gardien_nom: '',
  vote_meilleur_gardien_equipe: '',
}

const ONGLETS_BASE = [
  { key: 'planning', label: 'Planning' },
  { key: 'classement', label: 'Classement' },
  { key: 'votes', label: 'Votes' },
  { key: 'reglement', label: 'Règlement' },
]

// Repris des libellés du sélecteur de format dans TournoiOrganise.jsx (côté
// club) — dupliqué plutôt qu'importé, cette page publique doit rester
// autonome (pas de dépendance vers un composant de gestion réservé au club).
const FORMAT_INFO = {
  poules: { label: 'Championnat / Poules uniquement', desc: 'Classement final par points, pas de phase éliminatoire.' },
  poules_elimination: { label: 'Poules + Élimination directe', desc: "Les meilleures équipes de chaque poule s'affrontent ensuite en élimination directe jusqu'à la finale." },
  poules_minichampionnat: { label: 'Poules + Mini-championnat', desc: 'Les équipes qualifiées forment une nouvelle poule, rejouée en matchs aller simple, pour désigner le vainqueur.' },
  elimination: { label: 'Élimination directe', desc: 'Tableau à élimination directe dès le premier tour, pas de phase de poules.' },
}

export default function TournoiPublic() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [tournoi, setTournoi] = useState(null)
  const [equipes, setEquipes] = useState([])
  const [matchs, setMatchs] = useState([])
  const [onglet, setOnglet] = useState('planning')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [votes, setVotes] = useState(null) // null = pas encore dévoilé (pas chargé), [] = dévoilé sans vote
  const [chargementVotes, setChargementVotes] = useState(false)
  const [roster, setRoster] = useState([]) // lister_roster_tournoi(tournoi_id) — joueurs inscrits par club, pour choisir par n° de maillot
  const [buteurs, setButeurs] = useState([])
  const [voteForm, setVoteForm] = useState(VIDE_VOTE_PUBLIC)
  const [dejaVotePublic, setDejaVotePublic] = useState(false)
  const [submittingVote, setSubmittingVote] = useState(false)
  const [voteSoumis, setVoteSoumis] = useState(false)
  const [erreurVote, setErreurVote] = useState(null)

  const reveler = async () => {
    setChargementVotes(true)
    const { data } = await supabase.from('tournois_votes').select('*').eq('tournoi_id', tournoi.id)
    setVotes(data || [])
    setChargementVotes(false)
  }

  const soumettreVotePublic = async () => {
    setSubmittingVote(true)
    setErreurVote(null)
    const { error } = await supabase.from('tournois_votes').insert({
      tournoi_id: tournoi.id,
      inscription_id: null,
      ...voteForm,
      vote_beau_jeu_equipe_id: voteForm.vote_beau_jeu_equipe_id || null,
      vote_fairplay_equipe_id: voteForm.vote_fairplay_equipe_id || null,
      vote_supporters_fairplay_equipe_id: voteForm.vote_supporters_fairplay_equipe_id || null,
    })
    setSubmittingVote(false)
    if (error) {
      console.error('vote public error:', error)
      setErreurVote("Erreur lors de l'enregistrement du vote. Réessaie.")
      return
    }
    localStorage.setItem(`vote_public_${tournoi.id}`, '1')
    setDejaVotePublic(true)
    setVoteSoumis(true)
  }

  const charger = useCallback(async () => {
    const { data: t } = await supabase.from('tournois_organises').select('*').eq('code_public', code?.toUpperCase()).maybeSingle()
    if (!t) { setNotFound(true); setLoading(false); return }
    setTournoi(t)
    setDejaVotePublic(localStorage.getItem(`vote_public_${t.id}`) === '1')
    const [{ data: eqs }, { data: mts }, { data: buts }, { data: rosterData }] = await Promise.all([
      supabase.from('tournois_equipes').select('*').eq('tournoi_id', t.id).order('poule'),
      supabase.from('tournois_matchs_organises').select('*').eq('tournoi_id', t.id).order('heure_debut'),
      supabase.from('tournois_buteurs').select('*').eq('tournoi_id', t.id),
      supabase.rpc('lister_roster_tournoi', { p_tournoi_id: t.id }),
    ])
    setEquipes(eqs || []); setMatchs(mts || [])
    setButeurs(buts || [])
    setRoster(rosterData || [])
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
    input: { background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '14px 28px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', fontFamily: 'Inter, sans-serif' },
    option: (sel) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${sel ? colors.accent.green : colors.border.faint}`, background: sel ? colors.accent.green + '11' : colors.background.raised, marginBottom: '8px' }),
    radio: (sel) => ({ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${sel ? colors.accent.green : colors.border.strong}`, background: sel ? colors.accent.green : 'transparent', flexShrink: 0 }),
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
                    <thead><tr>{['#', 'Équipe', 'J', 'V', 'N', 'D', 'BC', 'Diff', 'Fair-play', 'Pts'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {classement.map((s, i) => (
                        <tr key={s.equipe.id} style={{ background: i === 0 ? colors.accent.green + '11' : 'transparent' }}>
                          <td style={st.td}><span style={{ fontWeight: 700, color: i === 0 ? colors.accent.green : i === 1 ? colors.accent.amber : colors.text.disabled }}>{i + 1}</span></td>
                          <td style={{ ...st.td, fontWeight: 700 }}>{s.equipe.nom}</td>
                          <td style={st.td}>{s.j}</td>
                          <td style={{ ...st.td, color: colors.accent.green }}>{s.v}</td>
                          <td style={st.td}>{s.n}</td>
                          <td style={{ ...st.td, color: colors.accent.red }}>{s.d}</td>
                          <td style={st.td}>{s.bc}</td>
                          <td style={{ ...st.td, color: s.diff >= 0 ? colors.accent.green : colors.accent.red }}>{s.diff > 0 ? '+' : ''}{s.diff}</td>
                          <td style={{ ...st.td, color: colors.text.faint, fontSize: '12px' }}>🟨{s.cj} 🟥{s.cr}</td>
                          <td style={{ ...st.td, fontWeight: 800, color: colors.accent.green, fontSize: '15px' }}>{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })
        )}

        {onglet === 'votes' && (() => {
          const statsButeurs = {}
          buteurs.forEach(b => {
            const cle = `${b.prenom_joueur} ${b.nom_joueur}`.trim()
            if (!statsButeurs[cle]) statsButeurs[cle] = { nom: cle, equipe: equipes.find(e => e.id === b.equipe_id)?.nom || '', total: 0 }
            statsButeurs[cle].total += b.nb_buts
          })
          const topButeurs = Object.values(statsButeurs).sort((a, b) => b.total - a.total).slice(0, 5)
          const aucunVote = !voteForm.vote_beau_jeu_equipe_id && !voteForm.vote_fairplay_equipe_id && !voteForm.vote_supporters_fairplay_equipe_id
            && !voteForm.vote_meilleur_joueur_nom.trim() && !voteForm.vote_meilleur_gardien_nom.trim()

          return (
            <div>
              {equipes.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '40px', color: colors.text.faint }}>Aucune équipe pour l'instant.</div>
              ) : dejaVotePublic ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontWeight: 800, fontSize: '17px', color: colors.accent.green, marginBottom: '6px' }}>{voteSoumis ? 'Vote enregistré, merci !' : 'Tu as déjà voté sur cet appareil'}</div>
                  <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>Un seul vote par appareil pour ce tournoi.</p>
                </div>
              ) : (
                <div>
                  <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
                    Vote du public — un vote par appareil. Les catégories par équipe proposent toutes les équipes du tournoi ; pour les catégories individuelles, dépliez une équipe pour choisir par numéro de maillot.
                  </p>

                  {[
                    { champ: 'vote_beau_jeu_equipe_id', titre: 'Plus beau jeu', sousTitre: "L'équipe qui a proposé le jeu le plus agréable à regarder" },
                    { champ: 'vote_fairplay_equipe_id', titre: 'Équipe la plus fair-play', sousTitre: 'L\'équipe qui a montré le meilleur esprit sportif' },
                    { champ: 'vote_supporters_fairplay_equipe_id', titre: 'Supporters les plus fair-play', sousTitre: "Le public qui a soutenu dans le respect et la bonne humeur" },
                  ].map(({ champ, titre, sousTitre }) => (
                    <div key={champ} style={st.card}>
                      <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>{titre}</h3>
                      <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>{sousTitre}</p>
                      {equipes.map(eq => (
                        <div key={eq.id} style={st.option(voteForm[champ] === eq.id)}
                          onClick={() => setVoteForm(v => ({ ...v, [champ]: eq.id }))}>
                          <div style={st.radio(voteForm[champ] === eq.id)} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{eq.nom}</div>
                            {eq.club && <div style={{ color: colors.text.disabled, fontSize: '12px' }}>{eq.club}</div>}
                          </div>
                          <span style={{ marginLeft: 'auto', color: colors.text.disabled, fontSize: '12px' }}>Poule {eq.poule}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div style={st.card}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Meilleur joueur du tournoi</h3>
                    <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>Dépliez une équipe pour choisir par numéro de maillot</p>
                    {topButeurs.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ color: colors.text.disabled, fontSize: '11px', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Suggestions (top buteurs)</div>
                        {topButeurs.map(b => (
                          <div key={b.nom} style={st.option(voteForm.vote_meilleur_joueur_nom === b.nom && voteForm.vote_meilleur_joueur_equipe === b.equipe)}
                            onClick={() => setVoteForm(v => ({ ...v, vote_meilleur_joueur_nom: b.nom, vote_meilleur_joueur_equipe: b.equipe }))}>
                            <div style={st.radio(voteForm.vote_meilleur_joueur_nom === b.nom)} />
                            <div style={{ fontWeight: 600 }}>{b.nom}</div>
                            <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{b.equipe}</span>
                            <span style={{ color: colors.accent.green, fontSize: '12px', marginLeft: 'auto', fontWeight: 700 }}>{b.total} but{b.total > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <SelecteurRosterEquipe equipes={equipes} roster={roster}
                      nomChoisi={voteForm.vote_meilleur_joueur_nom} equipeChoisie={voteForm.vote_meilleur_joueur_equipe}
                      onChoisir={(nom, equipe) => setVoteForm(v => ({ ...v, vote_meilleur_joueur_nom: nom, vote_meilleur_joueur_equipe: equipe }))}
                      colors={colors} st={st} />
                  </div>

                  <div style={st.card}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Meilleur gardien</h3>
                    <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>Dépliez une équipe pour choisir par numéro de maillot</p>
                    <SelecteurRosterEquipe equipes={equipes} roster={roster}
                      nomChoisi={voteForm.vote_meilleur_gardien_nom} equipeChoisie={voteForm.vote_meilleur_gardien_equipe}
                      onChoisir={(nom, equipe) => setVoteForm(v => ({ ...v, vote_meilleur_gardien_nom: nom, vote_meilleur_gardien_equipe: equipe }))}
                      colors={colors} st={st} />
                  </div>

                  {erreurVote && <p style={{ color: colors.accent.red, fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{erreurVote}</p>}

                  <button style={{ ...st.btn, opacity: submittingVote || aucunVote ? 0.5 : 1, marginBottom: '24px' }}
                    disabled={submittingVote || aucunVote}
                    onClick={soumettreVotePublic}>
                    {submittingVote ? 'Envoi en cours…' : 'Soumettre mon vote'}
                  </button>
                </div>
              )}

              <div style={{ ...st.card, textAlign: 'center', padding: '32px 24px' }}>
                {votes === null ? (
                  <>
                    <p style={{ color: colors.text.faint, fontSize: '13px', margin: '0 0 18px', lineHeight: 1.6 }}>
                      Les résultats restent secrets jusqu'à ce que l'organisateur les dévoile.
                    </p>
                    <button onClick={reveler} disabled={chargementVotes}
                      style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, cursor: chargementVotes ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: chargementVotes ? 0.6 : 1 }}>
                      {chargementVotes ? 'Chargement…' : 'Dévoiler les résultats'}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '12px' }}>
                      {votes.length} vote{votes.length > 1 ? 's' : ''} reçu{votes.length > 1 ? 's' : ''}
                    </div>
                    {calculerPalmares(votes, equipes).map(d => (
                      <div key={d.key} style={{ ...st.card, padding: '18px 22px' }}>
                        <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{d.label}</div>
                        {d.valeur ? (
                          <>
                            <div style={{ fontWeight: 800, fontSize: '17px', color: colors.text.primary }}>{d.valeur}</div>
                            {d.detail && <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '3px' }}>{d.detail}</div>}
                          </>
                        ) : (
                          <div style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucun vote pour l'instant</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

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

        {onglet === 'reglement' && (() => {
          const info = FORMAT_INFO[tournoi.format] || FORMAT_INFO.poules
          const avecQualification = tournoi.format === 'poules_elimination' || tournoi.format === 'poules_minichampionnat'
          const avecPoules = tournoi.format !== 'elimination'
          const k = tournoi.qualifies_meilleurs_troisiemes || 0
          const parPoule = tournoi.qualifies_par_poule || 2
          const rangSuivant = parPoule + 1
          return (
            <div>
              <div style={st.card}>
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: colors.text.primary }}>Format — {info.label}</h3>
                <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px', lineHeight: 1.6 }}>{info.desc}</p>
              </div>

              {avecQualification && (
                <div style={st.card}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: colors.text.primary }}>Qualification</h3>
                  <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px', lineHeight: 1.6 }}>
                    {parPoule > 1 ? `Les ${parPoule} premiers` : 'Le premier'} de chaque poule {parPoule > 1 ? 'sont qualifiés' : 'est qualifié'}{k > 0 ? `, ainsi que les ${k} meilleur${k > 1 ? 's' : ''} ${rangSuivant}e de poule.` : '.'}
                  </p>
                </div>
              )}

              {avecPoules && (
                <div style={st.card}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: colors.text.primary }}>Départage en cas d'égalité</h3>
                  <ol style={{ margin: 0, paddingLeft: '20px', color: colors.text.faint, fontSize: '13px', lineHeight: 1.9 }}>
                    <li>Points</li>
                    <li>Différence de buts</li>
                    <li>Buts marqués</li>
                    <li>Fair-play (cartons)</li>
                    <li>Buts encaissés</li>
                  </ol>
                </div>
              )}
            </div>
          )
        })()}

        <div style={{ textAlign: 'center', marginTop: '32px', color: colors.text.ghost, fontSize: '12px' }}>
          Propulsé par <span style={{ color: colors.accent.green, fontWeight: 700 }}>Digital Football</span>
        </div>
      </div>
    </div>
  )
}
