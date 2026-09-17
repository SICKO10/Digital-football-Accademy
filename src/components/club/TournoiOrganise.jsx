import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'

const IcoArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
const IcoTrophy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoX = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
const IcoRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>

const STATUT_COULEUR = { preparation: '#f59e0b', en_cours: '#4ade80', termine: '#888' }
const STATUT_LABEL = { preparation: 'Préparation', en_cours: 'En cours', termine: 'Terminé' }
const LETTRES_POULE = ['A', 'B', 'C', 'D', 'E', 'F']

const VIDE_TOURNOI = {
  nom: '', date: '', lieu: '', categorie_age: '',
  nb_terrains: 2, duree_match: 15, pause_minutes: 5,
  heure_debut: '09:00', nb_equipes_poule: 4,
}
const VIDE_EQUIPE = { nom: '', club: '', poule: 'A' }

const genererCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

// Round-robin par poule + affectation aux terrains par ordre de libération —
// contrairement à une version naïve qui ne suit que l'occupation des
// terrains, on suit AUSSI la prochaine disponibilité de chaque équipe : une
// équipe ne peut pas être programmée sur deux terrains en même temps. Quand
// aucun match en attente n'a ses deux équipes libres sur le terrain qui vient
// de se libérer, on avance ce terrain jusqu'à la prochaine équipe disponible
// plutôt que de forcer un match en conflit.
function genererPlanning(equipes, nbTerrains, dureeMatch, pauseMinutes, heureDebut = '09:00') {
  const poules = {}
  equipes.forEach(e => { (poules[e.poule] ||= []).push(e) })
  const restants = []
  Object.entries(poules).forEach(([poule, eqs]) => {
    for (let i = 0; i < eqs.length; i++) {
      for (let j = i + 1; j < eqs.length; j++) {
        restants.push({ equipe_a: eqs[i], equipe_b: eqs[j], poule, phase: 'poule' })
      }
    }
  })

  const [h, m] = heureDebut.split(':').map(Number)
  const debutJournee = h * 60 + m
  const terrainLibreA = Array(nbTerrains).fill(debutJournee)
  const equipeLibreA = {}
  equipes.forEach(e => { equipeLibreA[e.id] = debutJournee })

  const matchs = []
  let garde = restants.length * nbTerrains + 200 // filet de sécurité anti boucle infinie
  while (restants.length > 0 && garde-- > 0) {
    const terrainIdx = terrainLibreA.indexOf(Math.min(...terrainLibreA))
    const dispoTerrain = terrainLibreA[terrainIdx]
    const idx = restants.findIndex(mt => equipeLibreA[mt.equipe_a.id] <= dispoTerrain && equipeLibreA[mt.equipe_b.id] <= dispoTerrain)
    if (idx === -1) {
      const prochaine = Math.min(...restants.flatMap(mt => [equipeLibreA[mt.equipe_a.id], equipeLibreA[mt.equipe_b.id]]))
      terrainLibreA[terrainIdx] = Math.max(dispoTerrain + 1, prochaine)
      continue
    }
    const match = restants.splice(idx, 1)[0]
    const debut = dispoTerrain
    matchs.push({ ...match, terrain: terrainIdx + 1, heure_debut: `${String(Math.floor(debut / 60)).padStart(2, '0')}:${String(debut % 60).padStart(2, '0')}` })
    const fin = debut + dureeMatch + pauseMinutes
    terrainLibreA[terrainIdx] = fin
    equipeLibreA[match.equipe_a.id] = fin
    equipeLibreA[match.equipe_b.id] = fin
  }
  return matchs
}

function calculerClassement(equipes, matchs, poule) {
  const stats = {}
  equipes.filter(e => e.poule === poule).forEach(e => {
    stats[e.id] = { equipe: e, pts: 0, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, diff: 0 }
  })
  matchs.filter(mt => mt.poule === poule && mt.statut === 'termine' && mt.score_a !== null).forEach(mt => {
    if (!stats[mt.equipe_a_id] || !stats[mt.equipe_b_id]) return
    const a = stats[mt.equipe_a_id], b = stats[mt.equipe_b_id]
    a.j++; b.j++; a.bp += mt.score_a; a.bc += mt.score_b; b.bp += mt.score_b; b.bc += mt.score_a
    if (mt.score_a > mt.score_b) { a.pts += 3; a.v++; b.d++ }
    else if (mt.score_a < mt.score_b) { b.pts += 3; b.v++; a.d++ }
    else { a.pts++; b.pts++; a.n++; b.n++ }
  })
  Object.values(stats).forEach(s => { s.diff = s.bp - s.bc })
  return Object.values(stats).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.bp - a.bp)
}

export default function TournoiOrganise({ clubId, userId, readOnly = false }) {
  const colors = useColors()
  const [vue, setVue] = useState('liste')
  const [tournois, setTournois] = useState([])
  const [tournoi, setTournoi] = useState(null)
  const [onglet, setOnglet] = useState('equipes')
  const [equipes, setEquipes] = useState([])
  const [matchs, setMatchs] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(VIDE_TOURNOI)
  const [nouvelleEquipe, setNouvelleEquipe] = useState(VIDE_EQUIPE)
  const [scoreEdit, setScoreEdit] = useState({})

  useEffect(() => { if (clubId) chargerTournois() }, [clubId])

  async function chargerTournois() {
    const { data } = await supabase.from('tournois_organises').select('*').eq('club_id', clubId).order('date', { ascending: false })
    setTournois(data || [])
  }

  async function chargerDetail(t) {
    setTournoi(t); setVue('detail'); setOnglet('equipes')
    const [{ data: eqs }, { data: mts }] = await Promise.all([
      supabase.from('tournois_equipes').select('*').eq('tournoi_id', t.id).order('poule'),
      supabase.from('tournois_matchs_organises').select('*').eq('tournoi_id', t.id).order('heure_debut'),
    ])
    setEquipes(eqs || []); setMatchs(mts || [])
  }

  function ouvrirCreation() { setForm(VIDE_TOURNOI); setVue('creation') }

  async function creerTournoi() {
    if (!form.nom.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('tournois_organises').insert({
      ...form, club_id: clubId, educateur_id: userId || null, code_public: genererCode(),
    }).select().single()
    setLoading(false)
    if (!error && data) { await chargerTournois(); await chargerDetail(data) }
  }

  async function supprimerTournoi(id) {
    if (!confirm('Supprimer ce tournoi ? Cette action est définitive.')) return
    await supabase.from('tournois_organises').delete().eq('id', id)
    chargerTournois()
  }

  // Poule suggérée par défaut pour la prochaine équipe : remplit la poule A
  // jusqu'à nb_equipes_poule, puis B, etc. — purement une aide à la saisie,
  // reste modifiable dans le select.
  const pouleSuggeree = () => {
    const cible = tournoi?.nb_equipes_poule || 4
    for (const lettre of LETTRES_POULE) {
      if (equipes.filter(e => e.poule === lettre).length < cible) return lettre
    }
    return 'A'
  }

  async function ajouterEquipe() {
    if (!nouvelleEquipe.nom.trim()) return
    const { data } = await supabase.from('tournois_equipes').insert({ tournoi_id: tournoi.id, ...nouvelleEquipe }).select().single()
    if (data) { setEquipes(p => [...p, data]); setNouvelleEquipe({ ...VIDE_EQUIPE, poule: pouleSuggeree() }) }
  }

  async function supprimerEquipe(id) {
    await supabase.from('tournois_equipes').delete().eq('id', id)
    setEquipes(p => p.filter(e => e.id !== id))
  }

  async function genererPlanningAuto() {
    if (matchs.length > 0 && !confirm('Effacer le planning existant et le régénérer ?')) return
    await supabase.from('tournois_matchs_organises').delete().eq('tournoi_id', tournoi.id)
    const planning = genererPlanning(equipes, tournoi.nb_terrains, tournoi.duree_match, tournoi.pause_minutes, tournoi.heure_debut || '09:00')
    const { data } = await supabase.from('tournois_matchs_organises').insert(
      planning.map(mt => ({ tournoi_id: tournoi.id, equipe_a_id: mt.equipe_a.id, equipe_b_id: mt.equipe_b.id, terrain: mt.terrain, heure_debut: mt.heure_debut, phase: mt.phase, poule: mt.poule, statut: 'a_jouer' }))
    ).select()
    setMatchs(data || [])
    if (tournoi.statut === 'preparation') {
      await supabase.from('tournois_organises').update({ statut: 'en_cours' }).eq('id', tournoi.id)
      setTournoi(t => ({ ...t, statut: 'en_cours' }))
    }
    setOnglet('planning')
  }

  async function saisirScore(matchId) {
    const s = scoreEdit[matchId]
    if (s?.a === undefined || s?.b === undefined || s.a === '' || s.b === '') return
    const { data } = await supabase.from('tournois_matchs_organises').update({ score_a: +s.a, score_b: +s.b, statut: 'termine' }).eq('id', matchId).select().single()
    if (data) setMatchs(p => p.map(mt => (mt.id === matchId ? data : mt)))
    setScoreEdit(p => { const n = { ...p }; delete n[matchId]; return n })
  }

  const getEquipe = (id) => equipes.find(e => e.id === id)
  const poules = [...new Set(equipes.map(e => e.poule))].sort()

  const st = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '18px' },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box' },
    label: { fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px', fontWeight: 700 },
    btnSolid: { background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    btnGhost: { background: 'none', border: 'none', color: colors.accent.green, fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' },
    iconBtn: (couleur) => ({ background: couleur + '15', border: `1px solid ${couleur}40`, color: couleur, borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }),
  }

  if (vue === 'liste') return (
    <div style={{ maxWidth: 900 }}>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={ouvrirCreation} style={st.btnSolid}>+ Créer un tournoi</button>
        </div>
      )}

      {tournois.length === 0 ? (
        <div style={{ ...st.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ color: colors.accent.green, marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><IcoTrophy /></div>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Aucun tournoi organisé</div>
          <div style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '18px' }}>Créez un tournoi pour générer automatiquement le planning sans conflits.</div>
          {!readOnly && <button onClick={ouvrirCreation} style={st.btnSolid}>+ Créer mon premier tournoi</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tournois.map(t => (
            <div key={t.id} style={{ ...st.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ background: STATUT_COULEUR[t.statut] + '20', color: STATUT_COULEUR[t.statut], border: `1px solid ${STATUT_COULEUR[t.statut]}40`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>{STATUT_LABEL[t.statut]}</span>
                  {t.categorie_age && <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{t.categorie_age}</span>}
                </div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '15px' }}>{t.nom}</div>
                <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '3px' }}>
                  {t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}{t.lieu ? ` · ${t.lieu}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => chargerDetail(t)} style={st.btnSecondary}>Gérer →</button>
                {!readOnly && <button onClick={() => supprimerTournoi(t.id)} style={st.iconBtn(colors.accent.red)}><IcoX /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (vue === 'creation') return (
    <div style={{ maxWidth: 560 }}>
      <button onClick={() => setVue('liste')} style={st.btnGhost}><IcoArrowLeft /> Retour</button>
      <h2 style={{ color: colors.text.primary, margin: '16px 0 20px', fontWeight: 900, fontSize: '19px' }}>Créer un tournoi</h2>
      <div style={{ display: 'grid', gap: '14px' }}>
        <div>
          <label style={st.label}>Nom du tournoi *</label>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Tournoi de Noël U15" style={st.input} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Catégorie d'âge</label>
            <input value={form.categorie_age} onChange={e => setForm(f => ({ ...f, categorie_age: e.target.value }))} placeholder="U13, U15…" style={st.input} />
          </div>
        </div>
        <div>
          <label style={st.label}>Lieu</label>
          <input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Complexe sportif…" style={st.input} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Heure de début</label>
            <input type="time" value={form.heure_debut} onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Nb terrains</label>
            <input type="number" min="1" value={form.nb_terrains} onChange={e => setForm(f => ({ ...f, nb_terrains: parseInt(e.target.value) || 1 }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Équipes/poule</label>
            <select value={form.nb_equipes_poule} onChange={e => setForm(f => ({ ...f, nb_equipes_poule: parseInt(e.target.value) }))} style={st.input}>
              {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Durée d'un match (min)</label>
            <input type="number" min="1" value={form.duree_match} onChange={e => setForm(f => ({ ...f, duree_match: parseInt(e.target.value) || 1 }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Pause entre matchs (min)</label>
            <input type="number" min="0" value={form.pause_minutes} onChange={e => setForm(f => ({ ...f, pause_minutes: parseInt(e.target.value) || 0 }))} style={st.input} />
          </div>
        </div>
        <button onClick={creerTournoi} disabled={!form.nom.trim() || loading} style={{ ...st.btnSolid, opacity: (!form.nom.trim() || loading) ? 0.4 : 1, padding: '13px', fontSize: '14px' }}>
          {loading ? 'Création…' : 'Créer le tournoi'}
        </button>
      </div>
    </div>
  )

  if (vue === 'detail' && tournoi) {
    const onglets = [
      { key: 'equipes', label: `Équipes (${equipes.length})` },
      { key: 'planning', label: 'Planning' },
      { key: 'resultats', label: 'Résultats' },
      { key: 'classement', label: 'Classement' },
    ]
    return (
      <div style={{ maxWidth: 900 }}>
        <button onClick={() => setVue('liste')} style={st.btnGhost}><IcoArrowLeft /> Tous les tournois</button>
        <div style={{ ...st.card, margin: '16px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ background: STATUT_COULEUR[tournoi.statut] + '20', color: STATUT_COULEUR[tournoi.statut], border: `1px solid ${STATUT_COULEUR[tournoi.statut]}40`, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700, display: 'inline-block', marginBottom: '8px' }}>{STATUT_LABEL[tournoi.statut]}</span>
              <h2 style={{ color: colors.text.primary, margin: '0 0 6px', fontSize: '19px', fontWeight: 900 }}>{tournoi.nom}</h2>
              <div style={{ color: colors.text.faint, fontSize: '13px' }}>
                {tournoi.date && new Date(tournoi.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {tournoi.lieu && ` · ${tournoi.lieu}`} · {tournoi.duree_match} min · {tournoi.nb_terrains} terrain{tournoi.nb_terrains > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {onglets.map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: onglet === o.key ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: onglet === o.key ? colors.accent.green + '15' : 'transparent', color: onglet === o.key ? colors.accent.green : colors.text.faint, fontWeight: onglet === o.key ? 700 : 400, fontSize: '13px', cursor: 'pointer' }}>
              {o.label}
            </button>
          ))}
        </div>

        {onglet === 'equipes' && (
          <div>
            {!readOnly && (
              <div style={{ ...st.card, marginBottom: '16px' }}>
                <div style={{ color: colors.text.secondary, fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Ajouter une équipe</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input style={{ ...st.input, flex: 2, minWidth: '140px' }} placeholder="Nom de l'équipe *" value={nouvelleEquipe.nom}
                    onChange={e => setNouvelleEquipe(p => ({ ...p, nom: e.target.value }))} onKeyDown={e => e.key === 'Enter' && ajouterEquipe()} />
                  <input style={{ ...st.input, flex: 2, minWidth: '140px' }} placeholder="Club (optionnel)" value={nouvelleEquipe.club}
                    onChange={e => setNouvelleEquipe(p => ({ ...p, club: e.target.value }))} />
                  <select style={{ ...st.input, flex: 1, minWidth: '90px' }} value={nouvelleEquipe.poule}
                    onChange={e => setNouvelleEquipe(p => ({ ...p, poule: e.target.value }))}>
                    {LETTRES_POULE.map(p => <option key={p} value={p}>Poule {p}</option>)}
                  </select>
                  <button onClick={ajouterEquipe} disabled={!nouvelleEquipe.nom.trim()} style={{ ...st.btnSolid, opacity: !nouvelleEquipe.nom.trim() ? 0.4 : 1 }}>+ Ajouter</button>
                </div>
              </div>
            )}

            {poules.length === 0 ? (
              <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '30px' }}>Aucune équipe ajoutée</div>
            ) : poules.map(poule => (
              <div key={poule} style={{ ...st.card, marginBottom: '12px' }}>
                <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Poule {poule} · {equipes.filter(e => e.poule === poule).length} équipes</div>
                {equipes.filter(e => e.poule === poule).map(eq => (
                  <div key={eq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                    <div>
                      <span style={{ color: colors.text.primary, fontWeight: 600 }}>{eq.nom}</span>
                      {eq.club && <span style={{ color: colors.text.disabled, fontSize: '12px', marginLeft: '10px' }}>{eq.club}</span>}
                    </div>
                    {!readOnly && <button onClick={() => supprimerEquipe(eq.id)} style={st.iconBtn(colors.accent.red)}><IcoX /></button>}
                  </div>
                ))}
              </div>
            ))}

            {!readOnly && equipes.length >= 2 && (
              <button onClick={genererPlanningAuto} style={{ ...st.btnSolid, marginTop: '8px' }}>
                Générer le planning · {equipes.length} équipes · {tournoi.nb_terrains} terrain{tournoi.nb_terrains > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {onglet === 'planning' && (
          <div>
            {matchs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '40px' }}>
                <p style={{ color: colors.text.faint }}>Ajoutez des équipes puis générez le planning.</p>
                <button onClick={() => setOnglet('equipes')} style={st.btnSolid}>← Gérer les équipes</button>
              </div>
            ) : (() => {
              const parHeure = {}
              matchs.forEach(mt => { (parHeure[mt.heure_debut] ||= []).push(mt) })
              return Object.entries(parHeure).sort(([a], [b]) => a.localeCompare(b)).map(([heure, mts]) => (
                <div key={heure} style={{ marginBottom: '16px' }}>
                  <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{heure?.slice(0, 5)}</div>
                  {mts.sort((a, b) => a.terrain - b.terrain).map(mt => {
                    const ea = getEquipe(mt.equipe_a_id), eb = getEquipe(mt.equipe_b_id)
                    return (
                      <div key={mt.id} style={{ ...st.card, marginBottom: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ color: colors.text.disabled, fontSize: '12px', minWidth: '68px' }}>Terrain {mt.terrain}</span>
                        <span style={{ background: colors.accent.blue + '20', color: colors.accent.blue, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, minWidth: '56px', textAlign: 'center' }}>Poule {mt.poule}</span>
                        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, textAlign: 'right', fontSize: '13px' }}>{ea?.nom || '?'}</span>
                        <span style={{ color: colors.text.disabled, fontWeight: 700, padding: '0 10px' }}>vs</span>
                        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, fontSize: '13px' }}>{eb?.nom || '?'}</span>
                        {mt.statut === 'termine'
                          ? <span style={{ fontWeight: 700, color: colors.accent.green, minWidth: '50px', textAlign: 'center' }}>{mt.score_a} - {mt.score_b}</span>
                          : <span style={{ background: colors.accent.amber + '20', color: colors.accent.amber, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>À jouer</span>}
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
            {!readOnly && matchs.length > 0 && (
              <button onClick={genererPlanningAuto} style={{ ...st.btnGhost, fontSize: '12px', marginTop: '4px' }}><IcoRefresh /> Régénérer</button>
            )}
          </div>
        )}

        {onglet === 'resultats' && (
          <div>
            {matchs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '40px' }}><p style={{ color: colors.text.faint }}>Générez d'abord le planning.</p></div>
            ) : poules.map(poule => (
              <div key={poule} style={{ ...st.card, marginBottom: '12px' }}>
                <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Poule {poule}</div>
                {matchs.filter(mt => mt.poule === poule).map(mt => {
                  const ea = getEquipe(mt.equipe_a_id), eb = getEquipe(mt.equipe_b_id), edit = scoreEdit[mt.id]
                  const enEdition = mt.statut !== 'termine' || edit !== undefined
                  return (
                    <div key={mt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                      <span style={{ color: colors.text.disabled, fontSize: '12px', minWidth: '42px' }}>{mt.heure_debut?.slice(0, 5)}</span>
                      <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, textAlign: 'right', fontSize: '13px' }}>{ea?.nom}</span>
                      {!enEdition ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: colors.accent.green, minWidth: '50px', textAlign: 'center' }}>{mt.score_a} - {mt.score_b}</span>
                          {!readOnly && <button onClick={() => setScoreEdit(p => ({ ...p, [mt.id]: { a: mt.score_a, b: mt.score_b } }))} style={st.iconBtn(colors.text.faint)}><IcoEdit /></button>}
                        </div>
                      ) : readOnly ? (
                        <span style={{ background: colors.accent.amber + '20', color: colors.accent.amber, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>À jouer</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="number" min="0" style={{ ...st.input, width: '50px', padding: '6px', textAlign: 'center' }} placeholder="0" value={edit?.a ?? ''}
                            onChange={e => setScoreEdit(p => ({ ...p, [mt.id]: { ...(p[mt.id] || {}), a: e.target.value } }))} />
                          <span style={{ color: colors.text.disabled }}>-</span>
                          <input type="number" min="0" style={{ ...st.input, width: '50px', padding: '6px', textAlign: 'center' }} placeholder="0" value={edit?.b ?? ''}
                            onChange={e => setScoreEdit(p => ({ ...p, [mt.id]: { ...(p[mt.id] || {}), b: e.target.value } }))} />
                          <button onClick={() => saisirScore(mt.id)} style={st.iconBtn(colors.accent.green)}><IcoCheck /></button>
                        </div>
                      )}
                      <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, fontSize: '13px' }}>{eb?.nom}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {onglet === 'classement' && (
          <div>
            {poules.length === 0 ? (
              <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '30px' }}>Ajoutez des équipes pour voir le classement</div>
            ) : poules.map(poule => {
              const classement = calculerClassement(equipes, matchs, poule)
              return (
                <div key={poule} style={{ ...st.card, marginBottom: '12px', overflowX: 'auto' }}>
                  <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Poule {poule}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead>
                      <tr>{['#', 'Équipe', 'J', 'V', 'N', 'D', 'BP', 'BC', 'Diff', 'Pts'].map(h => (
                        <th key={h} style={{ background: colors.background.raised, padding: '8px 10px', textAlign: 'left', color: colors.text.faint, fontSize: '11px', fontWeight: 700 }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {classement.map((s, i) => (
                        <tr key={s.equipe.id} style={{ background: i === 0 ? colors.accent.green + '11' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, fontWeight: 700, color: i === 0 ? colors.accent.green : i === 1 ? colors.accent.amber : colors.text.disabled }}>{i + 1}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.text.primary, fontWeight: 600 }}>{s.equipe.nom}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.text.secondary }}>{s.j}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.accent.green }}>{s.v}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.text.secondary }}>{s.n}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.accent.red }}>{s.d}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.text.secondary }}>{s.bp}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: colors.text.secondary }}>{s.bc}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, color: s.diff >= 0 ? colors.accent.green : colors.accent.red }}>{s.diff > 0 ? '+' : ''}{s.diff}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border.faint}`, fontWeight: 800, color: colors.accent.green, fontSize: '14px' }}>{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}
