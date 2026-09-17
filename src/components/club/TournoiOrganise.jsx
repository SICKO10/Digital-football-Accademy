import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { calculerClassement, PHASE_LABEL, PHASE_ORDRE } from '../../lib/tournoi'

const IcoArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
const IcoTrophy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoX = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
const IcoRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
const IcoShuffle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
const IcoLink = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>

const STATUT_COULEUR = { preparation: '#f59e0b', en_cours: '#4ade80', termine: '#888' }
const STATUT_LABEL = { preparation: 'Préparation', en_cours: 'En cours', termine: 'Terminé' }
const LETTRES_POULE = ['A', 'B', 'C', 'D', 'E', 'F']

const VIDE_TOURNOI = {
  nom: '', date: '', lieu: '', categorie_age: '',
  nb_terrains: 2, duree_match: 15, pause_minutes: 5,
  heure_debut: '09:00', nb_equipes_poule: 4,
  heure_fin: '18:00', pause_midi_debut: '12:00', pause_midi_duree: 90,
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
const timeToMin = (t) => {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const minToTime = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

// Rounds d'une poule en round-robin par la méthode du cercle : n-1 rounds
// pour n équipes (n pair, un "bye" ajouté sinon), chaque équipe joue
// exactement une fois par round. Contrairement à une simple liste de paires
// i<j, ça donne une vraie structure "round 1, round 2…" qu'on peut entrelacer
// entre poules ci-dessous — sans ça, la file de matchs contenait toute la
// poule A d'abord, puis B, puis C : la poule A occupait les premiers
// créneaux/terrains disponibles et les autres ne démarraient vraiment
// qu'une fois la poule A bien avancée, au lieu de progresser en parallèle.
function genererRoundsPoule(equipes) {
  const teams = [...equipes]
  if (teams.length % 2 !== 0) teams.push(null)
  const rounds = []
  for (let r = 0; r < teams.length - 1; r++) {
    const round = []
    for (let i = 0; i < teams.length / 2; i++) {
      const a = teams[i], b = teams[teams.length - 1 - i]
      if (a && b) round.push({ equipe_a: a, equipe_b: b })
    }
    rounds.push(round)
    teams.splice(1, 0, teams.pop())
  }
  return rounds
}

function genererPlanning(equipes, nbTerrains, dureeMatch, pauseMinutes, heureDebut = '09:00', heureFin = null, pauseMidiDebut = '12:00', pauseMidiDuree = 90) {
  const poules = {}
  equipes.forEach(e => { (poules[e.poule] ||= []).push(e) })

  const roundsParPoule = {}
  Object.entries(poules).forEach(([poule, eqs]) => {
    roundsParPoule[poule] = genererRoundsPoule(eqs).map(round => round.map(m => ({ ...m, poule, phase: 'poule' })))
  })

  // Entrelacement : round 1 de toutes les poules, puis round 2 de toutes les
  // poules, etc. — la file `restants` alterne donc naturellement entre
  // poules au lieu de les traiter en blocs séparés.
  const maxRounds = Math.max(0, ...Object.values(roundsParPoule).map(r => r.length))
  const restants = []
  for (let r = 0; r < maxRounds; r++) {
    Object.keys(roundsParPoule).sort().forEach(poule => {
      const round = roundsParPoule[poule][r]
      if (round) restants.push(...round)
    })
  }

  const debutJournee = timeToMin(heureDebut)
  const finJournee = heureFin ? timeToMin(heureFin) : null
  const midiDebut = timeToMin(pauseMidiDebut)
  const midiFin = midiDebut + pauseMidiDuree

  // Décale un horaire après la pause méridienne s'il tombe dedans ou si le
  // match empièterait sur son début — appliqué à chaque fois qu'un terrain
  // (ou une équipe) se libère, pour que la pause soit bloquée sur tous les
  // terrains en même temps plutôt que gérée équipe par équipe.
  const eviterPauseMidi = (t) => {
    if (t >= midiDebut && t < midiFin) return midiFin
    if (t < midiDebut && t + dureeMatch > midiDebut) return midiFin
    return t
  }

  const terrainLibreA = Array(nbTerrains).fill(debutJournee).map(eviterPauseMidi)
  const equipeLibreA = {}
  equipes.forEach(e => { equipeLibreA[e.id] = debutJournee })

  const matchs = []
  const nonPlanifies = []
  let garde = restants.length * nbTerrains + 200 // filet de sécurité anti boucle infinie
  while (restants.length > 0 && garde-- > 0) {
    const terrainIdx = terrainLibreA.indexOf(Math.min(...terrainLibreA))
    const dispoTerrain = terrainLibreA[terrainIdx]

    if (finJournee && dispoTerrain + dureeMatch > finJournee) {
      nonPlanifies.push(...restants.splice(0))
      break
    }

    // Parmi les matchs jouables maintenant (aucune des deux équipes encore
    // sur un autre terrain), on note chacun 0/1/2 selon qu'une équipe vient
    // juste de terminer (enchaînement direct, à éviter) — et on prend
    // toujours le score le plus bas plutôt que le premier match jouable
    // trouvé, pour ne forcer un enchaînement que si vraiment aucune équipe
    // n'a eu le temps de souffler.
    let meilleurIdx = -1
    let meilleurScore = Infinity
    restants.forEach((mt, idx) => {
      const aLibre = equipeLibreA[mt.equipe_a.id]
      const bLibre = equipeLibreA[mt.equipe_b.id]
      if (aLibre > dispoTerrain || bLibre > dispoTerrain) return
      const score = (aLibre === dispoTerrain ? 1 : 0) + (bLibre === dispoTerrain ? 1 : 0)
      if (score < meilleurScore) { meilleurScore = score; meilleurIdx = idx }
    })

    if (meilleurIdx === -1) {
      const prochaine = Math.min(...restants.flatMap(mt => [equipeLibreA[mt.equipe_a.id], equipeLibreA[mt.equipe_b.id]]))
      terrainLibreA[terrainIdx] = eviterPauseMidi(Math.max(dispoTerrain + 1, prochaine))
      continue
    }
    const match = restants.splice(meilleurIdx, 1)[0]
    const debut = dispoTerrain
    matchs.push({ ...match, terrain: terrainIdx + 1, heure_debut: minToTime(debut) })
    const finMatch = debut + dureeMatch
    const finTerrain = eviterPauseMidi(finMatch + pauseMinutes)
    terrainLibreA[terrainIdx] = finTerrain
    equipeLibreA[match.equipe_a.id] = finMatch
    equipeLibreA[match.equipe_b.id] = finMatch
  }
  return { planifies: matchs, nonPlanifies }
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
  const [lienCopie, setLienCopie] = useState(false)
  const [reglagesForm, setReglagesForm] = useState(VIDE_TOURNOI)
  const [reglagesSaving, setReglagesSaving] = useState(false)

  useEffect(() => { if (clubId) chargerTournois() }, [clubId])

  async function chargerTournois() {
    const { data } = await supabase.from('tournois_organises').select('*').eq('club_id', clubId).order('date', { ascending: false })
    setTournois(data || [])
  }

  async function chargerDetail(t) {
    setTournoi(t); setVue('detail'); setOnglet('equipes')
    setReglagesForm({
      heure_debut: t.heure_debut || '09:00', nb_terrains: t.nb_terrains || 2, nb_equipes_poule: t.nb_equipes_poule || 4,
      duree_match: t.duree_match || 15, pause_minutes: t.pause_minutes || 5,
      heure_fin: t.heure_fin || '18:00', pause_midi_debut: t.pause_midi_debut || '12:00', pause_midi_duree: t.pause_midi_duree || 90,
    })
    const [{ data: eqs }, { data: mts }] = await Promise.all([
      supabase.from('tournois_equipes').select('*').eq('tournoi_id', t.id).order('poule'),
      supabase.from('tournois_matchs_organises').select('*').eq('tournoi_id', t.id).order('heure_debut'),
    ])
    setEquipes(eqs || []); setMatchs(mts || [])
  }

  function ouvrirCreation() { setForm(VIDE_TOURNOI); setVue('creation') }

  async function sauvegarderReglages() {
    setReglagesSaving(true)
    const { data, error } = await supabase.from('tournois_organises').update(reglagesForm).eq('id', tournoi.id).select().single()
    setReglagesSaving(false)
    if (!error && data) setTournoi(data)
  }

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
    const { planifies, nonPlanifies } = genererPlanning(
      equipes, tournoi.nb_terrains, tournoi.duree_match, tournoi.pause_minutes,
      tournoi.heure_debut || '09:00', tournoi.heure_fin || null,
      tournoi.pause_midi_debut || '12:00', tournoi.pause_midi_duree || 90,
    )
    const { data } = await supabase.from('tournois_matchs_organises').insert(
      planifies.map(mt => ({ tournoi_id: tournoi.id, equipe_a_id: mt.equipe_a.id, equipe_b_id: mt.equipe_b.id, terrain: mt.terrain, heure_debut: mt.heure_debut, phase: mt.phase, poule: mt.poule, statut: 'a_jouer' }))
    ).select()
    setMatchs(data || [])
    if (tournoi.statut === 'preparation') {
      await supabase.from('tournois_organises').update({ statut: 'en_cours' }).eq('id', tournoi.id)
      setTournoi(t => ({ ...t, statut: 'en_cours' }))
    }
    setOnglet('planning')
    if (nonPlanifies.length > 0) {
      alert(`⚠️ ${nonPlanifies.length} match${nonPlanifies.length > 1 ? 's' : ''} n'ont pas pu être placés avant ${tournoi.heure_fin}. Augmente le nombre de terrains ou avance l'heure de début.`)
    }
  }

  async function saisirScore(matchId) {
    const s = scoreEdit[matchId]
    if (s?.a === undefined || s?.b === undefined || s.a === '' || s.b === '') return
    const { data, error } = await supabase.from('tournois_matchs_organises').update({ score_a: +s.a, score_b: +s.b, statut: 'termine' }).eq('id', matchId).select().single()
    // Sans ce check, un échec (RLS, colonne manquante...) était totalement
    // silencieux : le bouton ✓ semblait "ne rien faire" sans aucune trace,
    // aussi bien pour l'utilisateur que pour nous en debug.
    if (error) { console.error('saisirScore error:', error); alert('Erreur en enregistrant le score : ' + error.message); return }
    if (data) setMatchs(p => p.map(mt => (mt.id === matchId ? data : mt)))
    setScoreEdit(p => { const n = { ...p }; delete n[matchId]; return n })
  }

  // Ligne de saisie/affichage de score — partagée entre les matchs de poule
  // et les matchs à élimination directe (même comportement, juste des
  // groupements différents en amont).
  function ligneMatch(mt) {
    const ea = getEquipe(mt.equipe_a_id), eb = getEquipe(mt.equipe_b_id), edit = scoreEdit[mt.id]
    const enEdition = mt.statut !== 'termine' || edit !== undefined
    return (
      <div key={mt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
        <span style={{ color: colors.text.disabled, fontSize: '12px', minWidth: '42px' }}>{mt.heure_debut?.slice(0, 5)}</span>
        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, textAlign: 'right', fontSize: '13px' }}>{ea?.nom || '?'}</span>
        {!enEdition ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: colors.accent.green, minWidth: '50px', textAlign: 'center' }}>{mt.score_a} - {mt.score_b}</span>
            {!readOnly && <button onClick={() => setScoreEdit(p => ({ ...p, [mt.id]: { a: mt.score_a, b: mt.score_b } }))} style={st.iconBtn(colors.text.faint)}><IcoEdit /></button>}
          </div>
        ) : readOnly ? (
          <span style={{ background: colors.accent.amber + '20', color: colors.accent.amber, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>À jouer</span>
        ) : (() => {
          const aVide = edit?.a === undefined || edit?.a === ''
          const bVide = edit?.b === undefined || edit?.b === ''
          const pret = !aVide && !bVide
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="number" min="0" style={{ ...st.input, width: '50px', padding: '6px', textAlign: 'center', border: `1px solid ${aVide ? colors.accent.amber + '80' : colors.border.strong}` }} placeholder="?" value={edit?.a ?? ''}
                onChange={e => setScoreEdit(p => ({ ...p, [mt.id]: { ...(p[mt.id] || {}), a: e.target.value } }))} />
              <span style={{ color: colors.text.disabled }}>-</span>
              <input type="number" min="0" style={{ ...st.input, width: '50px', padding: '6px', textAlign: 'center', border: `1px solid ${bVide ? colors.accent.amber + '80' : colors.border.strong}` }} placeholder="?" value={edit?.b ?? ''}
                onChange={e => setScoreEdit(p => ({ ...p, [mt.id]: { ...(p[mt.id] || {}), b: e.target.value } }))} />
              <button onClick={() => saisirScore(mt.id)} disabled={!pret} title={pret ? 'Valider le score' : 'Saisis les deux scores (même 0) pour valider'}
                style={{ ...st.iconBtn(colors.accent.green), opacity: pret ? 1 : 0.35, cursor: pret ? 'pointer' : 'not-allowed' }}>
                <IcoCheck />
              </button>
            </div>
          )
        })()}
        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, fontSize: '13px' }}>{eb?.nom || '?'}</span>
      </div>
    )
  }

  async function tirageAuSort() {
    if (equipes.length < 2 || !confirm(`Répartir aléatoirement ${equipes.length} équipes dans les poules ?`)) return
    const melangees = [...equipes].sort(() => Math.random() - 0.5)
    const cible = tournoi.nb_equipes_poule || 4
    const maj = melangees.map((eq, i) => ({ id: eq.id, poule: LETTRES_POULE[Math.floor(i / cible)] || 'A' }))
    await Promise.all(maj.map(u => supabase.from('tournois_equipes').update({ poule: u.poule }).eq('id', u.id)))
    const { data } = await supabase.from('tournois_equipes').select('*').eq('tournoi_id', tournoi.id).order('poule')
    setEquipes(data || [])
  }

  async function ajusterHoraire(matchId, deltaMinutes) {
    const mt = matchs.find(m => m.id === matchId)
    if (!mt?.heure_debut) return
    const [h, mn] = mt.heure_debut.split(':').map(Number)
    const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + mn + deltaMinutes))
    const nouvelleHeure = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    const { data } = await supabase.from('tournois_matchs_organises').update({ heure_debut: nouvelleHeure }).eq('id', matchId).select().single()
    if (data) setMatchs(p => p.map(m => (m.id === matchId ? data : m)))
  }

  const getEquipe = (id) => equipes.find(e => e.id === id)
  const poules = [...new Set(equipes.map(e => e.poule))].sort()
  const matchsPoule = matchs.filter(m => m.phase === 'poule')
  const matchsElim = matchs.filter(m => m.phase !== 'poule')

  // Génère la phase finale en un seul coup à partir du classement actuel des
  // poules (pas besoin d'attendre que tous les matchs de poule soient joués),
  // selon le format choisi dans l'onglet Réglages — remplace l'ancien système
  // "un round à la fois, seulement pour 1/2/4 poules" par une génération
  // directe qui couvre aussi le mini-championnat et n'importe quel nombre de
  // poules (via un tableau à quarts généralisé, sinon).
  async function genererPhaseFinale() {
    if (matchs.some(m => m.phase !== 'poule')) {
      if (!confirm('Effacer la phase finale existante et la régénérer ?')) return
      await supabase.from('tournois_matchs_organises').delete().eq('tournoi_id', tournoi.id).neq('phase', 'poule')
    }

    const classements = {}
    poules.forEach(p => { classements[p] = calculerClassement(equipes, matchsPoule, p) })

    const finDernierMatch = matchsPoule.reduce((max, m) => {
      if (!m.heure_debut) return max
      const t = timeToMin(m.heure_debut) + (tournoi.duree_match || 15)
      return t > max ? t : max
    }, timeToMin(tournoi.heure_debut || '09:00') + (tournoi.duree_match || 15))

    // La phase finale démarre juste après le dernier match de poule, mais ce
    // créneau peut tomber dans la pause méridienne (contrairement à
    // genererPlanning, rien ne le décalait ici) — même logique d'évitement,
    // réappliquée à chaque nouveau créneau calculé plus bas.
    const midiDebut = timeToMin(tournoi.pause_midi_debut || '12:00')
    const midiFin = midiDebut + (tournoi.pause_midi_duree || 90)
    const eviterPauseMidiFinale = (t) => {
      if (t >= midiDebut && t < midiFin) return midiFin
      if (t < midiDebut && t + (tournoi.duree_match || 15) > midiDebut) return midiFin
      return t
    }
    const debutFinale = eviterPauseMidiFinale(finDernierMatch + 15)

    const inserts = []

    if (tournoi.format === 'poules_minichampionnat') {
      // Les qualifiés (1ers de chaque poule, + 2èmes si peu de poules) forment
      // une nouvelle poule unique, rejouée en round-robin.
      const qualifies = []
      poules.forEach(p => {
        if (classements[p]?.[0]) qualifies.push({ ...classements[p][0].equipe, poule: 'Finale' })
        if (poules.length <= 3 && classements[p]?.[1]) qualifies.push({ ...classements[p][1].equipe, poule: 'Finale' })
      })
      const rounds = genererRoundsPoule(qualifies)
      let temps = debutFinale
      let terrainIdx = 0
      rounds.forEach(round => {
        round.forEach(m => {
          inserts.push({
            tournoi_id: tournoi.id, equipe_a_id: m.equipe_a.id, equipe_b_id: m.equipe_b.id,
            phase: 'finale_poule', poule: 'Finale',
            terrain: (terrainIdx % tournoi.nb_terrains) + 1, heure_debut: minToTime(temps), statut: 'a_jouer',
          })
          terrainIdx++
        })
        temps = eviterPauseMidiFinale(temps + (tournoi.duree_match || 15) + (tournoi.pause_minutes || 5))
      })
    } else {
      // Élimination directe (seule, ou après les poules) — croisements
      // standards pour 1 ou 2 poules, tableau de quarts généralisé sinon.
      if (poules.length === 1) {
        inserts.push({
          tournoi_id: tournoi.id, equipe_a_id: classements[poules[0]]?.[0]?.equipe.id, equipe_b_id: classements[poules[0]]?.[1]?.equipe.id,
          phase: 'finale', terrain: 1, heure_debut: minToTime(debutFinale), statut: 'a_jouer',
        })
      } else if (poules.length === 2) {
        inserts.push(
          { tournoi_id: tournoi.id, equipe_a_id: classements[poules[0]]?.[0]?.equipe.id, equipe_b_id: classements[poules[1]]?.[1]?.equipe.id, phase: 'demi', terrain: 1, heure_debut: minToTime(debutFinale), statut: 'a_jouer' },
          { tournoi_id: tournoi.id, equipe_a_id: classements[poules[1]]?.[0]?.equipe.id, equipe_b_id: classements[poules[0]]?.[1]?.equipe.id, phase: 'demi', terrain: Math.min(2, tournoi.nb_terrains), heure_debut: minToTime(debutFinale), statut: 'a_jouer' },
        )
        const debutF = eviterPauseMidiFinale(debutFinale + (tournoi.duree_match || 15) + 10)
        inserts.push(
          { tournoi_id: tournoi.id, equipe_a_id: null, equipe_b_id: null, phase: 'troisieme', terrain: 1, heure_debut: minToTime(debutF), statut: 'a_jouer' },
          { tournoi_id: tournoi.id, equipe_a_id: null, equipe_b_id: null, phase: 'finale', terrain: Math.min(2, tournoi.nb_terrains), heure_debut: minToTime(debutF), statut: 'a_jouer' },
        )
      } else {
        const paires = []
        for (let i = 0; i < Math.floor(poules.length / 2); i++) {
          paires.push([classements[poules[i]]?.[0], classements[poules[poules.length - 1 - i]]?.[1]])
          paires.push([classements[poules[poules.length - 1 - i]]?.[0], classements[poules[i]]?.[1]])
        }
        paires.forEach(([a, b], i) => {
          inserts.push({
            tournoi_id: tournoi.id, equipe_a_id: a?.equipe.id, equipe_b_id: b?.equipe.id,
            phase: 'quart', terrain: (i % tournoi.nb_terrains) + 1,
            heure_debut: minToTime(eviterPauseMidiFinale(debutFinale + Math.floor(i / tournoi.nb_terrains) * ((tournoi.duree_match || 15) + 5))),
            statut: 'a_jouer',
          })
        })
      }
    }

    const { data, error } = await supabase.from('tournois_matchs_organises').insert(inserts.filter(m => m.equipe_a_id !== undefined)).select()
    if (error) { console.error('genererPhaseFinale error:', error); alert('Erreur en générant la phase finale : ' + error.message); return }
    setMatchs(p => [...p.filter(m => m.phase === 'poule'), ...(data || [])])
    setOnglet('classement')
  }

  // Résout le tour suivant du tableau à élimination directe une fois le tour
  // en cours entièrement joué — nécessaire à partir de 3 poules, où
  // genererPhaseFinale ne peut créer que les quarts (demies/finale dépendent
  // des vainqueurs, inconnus à cet instant). Pour 2 poules, genererPhaseFinale
  // crée déjà les lignes "troisieme"/"finale" à équipes nulles en attendant
  // les demies : on les régénère ici plutôt que de bricoler un UPDATE, même
  // logique "supprimer puis réinsérer" que genererPhaseFinale plus haut.
  async function genererTourSuivant(phaseActuelle, phaseSuivante) {
    const matchsPhase = matchs
      .filter(m => m.phase === phaseActuelle && m.statut === 'termine')
      .sort((a, b) => a.heure_debut?.localeCompare(b.heure_debut) || a.terrain - b.terrain)
    if (matchsPhase.length === 0) return

    const gagnant = (m) => (m.score_a > m.score_b ? m.equipe_a_id : m.equipe_b_id)
    const perdant = (m) => (m.score_a > m.score_b ? m.equipe_b_id : m.equipe_a_id)

    const midiDebut = timeToMin(tournoi.pause_midi_debut || '12:00')
    const midiFin = midiDebut + (tournoi.pause_midi_duree || 90)
    const eviterPauseMidiFinale = (t) => {
      if (t >= midiDebut && t < midiFin) return midiFin
      if (t < midiDebut && t + (tournoi.duree_match || 15) > midiDebut) return midiFin
      return t
    }
    const finDernier = matchsPhase.reduce((max, m) => {
      if (!m.heure_debut) return max
      return Math.max(max, timeToMin(m.heure_debut) + (tournoi.duree_match || 15))
    }, 0)
    const debut = eviterPauseMidiFinale(finDernier + 15)

    if (phaseSuivante === 'demi') {
      const gagnants = matchsPhase.map(gagnant)
      const n = gagnants.length
      const paires = []
      for (let i = 0; i < Math.floor(n / 2); i++) paires.push([gagnants[i], gagnants[n - 1 - i]])
      const inserts = paires.filter(([a, b]) => a && b).map(([a, b], i) => ({
        tournoi_id: tournoi.id, equipe_a_id: a, equipe_b_id: b, phase: 'demi',
        terrain: (i % tournoi.nb_terrains) + 1, heure_debut: minToTime(debut), statut: 'a_jouer',
      }))
      if (inserts.length === 0) { alert('Impossible de déterminer les demi-finales — vérifiez les scores saisis.'); return }
      const { data, error } = await supabase.from('tournois_matchs_organises').insert(inserts).select()
      if (error) { console.error('genererTourSuivant error:', error); alert('Erreur en générant les demi-finales : ' + error.message); return }
      setMatchs(p => [...p, ...(data || [])])
    } else if (phaseSuivante === 'finale') {
      const gagnants = matchsPhase.map(gagnant)
      const perdants = matchsPhase.map(perdant)
      if (gagnants.length < 2 || !gagnants[0] || !gagnants[1]) { alert('Impossible de déterminer la finale — vérifiez les scores saisis.'); return }
      await supabase.from('tournois_matchs_organises').delete().eq('tournoi_id', tournoi.id).in('phase', ['troisieme', 'finale'])
      const inserts = []
      if (perdants[0] && perdants[1]) {
        inserts.push({ tournoi_id: tournoi.id, equipe_a_id: perdants[0], equipe_b_id: perdants[1], phase: 'troisieme', terrain: 1, heure_debut: minToTime(debut), statut: 'a_jouer' })
      }
      inserts.push({ tournoi_id: tournoi.id, equipe_a_id: gagnants[0], equipe_b_id: gagnants[1], phase: 'finale', terrain: Math.min(2, tournoi.nb_terrains), heure_debut: minToTime(debut), statut: 'a_jouer' })
      const { data, error } = await supabase.from('tournois_matchs_organises').insert(inserts).select()
      if (error) { console.error('genererTourSuivant error:', error); alert('Erreur en générant la finale : ' + error.message); return }
      setMatchs(p => [...p.filter(m => m.phase !== 'troisieme' && m.phase !== 'finale'), ...(data || [])])
    }
  }

  const lienPublic = tournoi?.code_public ? `${window.location.origin}/tournoi/${tournoi.code_public}` : null
  const copierLien = () => {
    if (!lienPublic) return
    navigator.clipboard.writeText(lienPublic)
    setLienCopie(true)
    setTimeout(() => setLienCopie(false), 2000)
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Heure de fin</label>
            <input type="time" value={form.heure_fin} onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Début pause midi</label>
            <input type="time" value={form.pause_midi_debut} onChange={e => setForm(f => ({ ...f, pause_midi_debut: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Durée pause midi</label>
            <select value={form.pause_midi_duree} onChange={e => setForm(f => ({ ...f, pause_midi_duree: parseInt(e.target.value) }))} style={st.input}>
              <option value={60}>1h00</option>
              <option value={75}>1h15</option>
              <option value={90}>1h30</option>
              <option value={105}>1h45</option>
              <option value={120}>2h00</option>
            </select>
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
      ...(!readOnly ? [{ key: 'reglages', label: 'Réglages' }] : []),
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

        {lienPublic && (
          <div style={{ ...st.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <div>
              <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '2px' }}>Page publique · suivi en direct pour les parents</div>
              <div style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 600 }}>{lienPublic.replace(/^https?:\/\//, '')}</div>
            </div>
            <button onClick={copierLien} style={{ ...st.btnSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}><IcoLink /> {lienCopie ? 'Copié !' : 'Copier le lien'}</button>
          </div>
        )}

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
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button onClick={genererPlanningAuto} style={st.btnSolid}>
                  Générer le planning · {equipes.length} équipes · {tournoi.nb_terrains} terrain{tournoi.nb_terrains > 1 ? 's' : ''}
                </button>
                <button onClick={tirageAuSort} style={{ ...st.btnGhost, background: colors.background.raised, border: `1px solid ${colors.border.strong}`, padding: '10px 16px', borderRadius: '10px' }}>
                  <IcoShuffle /> Tirage au sort des poules
                </button>
              </div>
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
                        {mt.phase === 'poule' ? (
                          <span style={{ background: colors.accent.blue + '20', color: colors.accent.blue, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, minWidth: '56px', textAlign: 'center' }}>Poule {mt.poule}</span>
                        ) : (
                          <span style={{ background: colors.accent.purple + '20', color: colors.accent.purple, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>{PHASE_LABEL[mt.phase] || mt.phase}</span>
                        )}
                        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, textAlign: 'right', fontSize: '13px' }}>{ea?.nom || '?'}</span>
                        <span style={{ color: colors.text.disabled, fontWeight: 700, padding: '0 10px' }}>vs</span>
                        <span style={{ color: colors.text.primary, fontWeight: 600, flex: 1, fontSize: '13px' }}>{eb?.nom || '?'}</span>
                        {mt.statut === 'termine'
                          ? <span style={{ fontWeight: 700, color: colors.accent.green, minWidth: '50px', textAlign: 'center' }}>{mt.score_a} - {mt.score_b}</span>
                          : <span style={{ background: colors.accent.amber + '20', color: colors.accent.amber, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>À jouer</span>}
                        {!readOnly && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => ajusterHoraire(mt.id, -5)} style={{ ...st.iconBtn(colors.text.faint), width: 'auto', padding: '0 6px', fontSize: '11px', fontWeight: 700 }} title="Décaler -5 min">-5</button>
                            <button onClick={() => ajusterHoraire(mt.id, 5)} style={{ ...st.iconBtn(colors.text.faint), width: 'auto', padding: '0 6px', fontSize: '11px', fontWeight: 700 }} title="Décaler +5 min">+5</button>
                          </div>
                        )}
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
            ) : (
              <>
                {!readOnly && (
                  <div style={{ background: colors.accent.blue + '15', border: `1px solid ${colors.accent.blue}30`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', color: colors.accent.blue, fontSize: '12px', lineHeight: 1.5 }}>
                    Pour valider un score : clique sur les deux champs (marqués « ? » tant qu'ils sont vides) et saisis un chiffre dans chacun — y compris 0 pour un 0-0. La coche verte ne s'active qu'une fois les deux scores renseignés.
                  </div>
                )}
                {poules.map(poule => (
                  <div key={poule} style={{ ...st.card, marginBottom: '12px' }}>
                    <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Poule {poule}</div>
                    {matchs.filter(mt => mt.poule === poule).map(ligneMatch)}
                  </div>
                ))}

                {!readOnly && tournoi.format && tournoi.format !== 'poules' && matchsPoule.length > 0 && (
                  <div style={{ ...st.card, marginBottom: '16px', borderColor: colors.accent.green + '44' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>🏆 Phase finale</div>
                        <div style={{ color: colors.text.faint, fontSize: '12px' }}>
                          {matchsPoule.filter(m => m.statut === 'termine').length} / {matchsPoule.length} matchs de poule terminés
                        </div>
                      </div>
                      <button onClick={genererPhaseFinale} style={st.btnSolid}>
                        {matchsElim.length > 0 ? '🔄 Regénérer' : '⚡ Générer'}
                      </button>
                    </div>
                  </div>
                )}

                {PHASE_ORDRE.filter(ph => matchsElim.some(mt => mt.phase === ph)).map(phase => (
                  <div key={phase} style={{ ...st.card, marginBottom: '12px' }}>
                    <div style={{ color: colors.accent.purple, fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>{PHASE_LABEL[phase]}</div>
                    {matchsElim.filter(mt => mt.phase === phase).map(ligneMatch)}
                  </div>
                ))}

                {!readOnly && (() => {
                  const quarts = matchsElim.filter(mt => mt.phase === 'quart')
                  const demis = matchsElim.filter(mt => mt.phase === 'demi')
                  const finale = matchsElim.filter(mt => mt.phase === 'finale')
                  const quartsTermines = quarts.length > 0 && quarts.every(mt => mt.statut === 'termine')
                  const demisTermines = demis.length > 0 && demis.every(mt => mt.statut === 'termine')
                  if (quartsTermines && demis.length === 0) {
                    return <button onClick={() => genererTourSuivant('quart', 'demi')} style={{ ...st.btnSolid, marginTop: '4px' }}>⚡ Générer les demi-finales</button>
                  }
                  if (demisTermines && (finale.length === 0 || finale.some(mt => !mt.equipe_a_id || !mt.equipe_b_id))) {
                    return <button onClick={() => genererTourSuivant('demi', 'finale')} style={{ ...st.btnSolid, marginTop: '4px' }}>🏆 Générer la finale</button>
                  }
                  return null
                })()}
              </>
            )}
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

        {onglet === 'reglages' && !readOnly && (
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={st.card}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: colors.text.primary }}>Format du tournoi</h3>
              {[
                { value: 'poules', label: '🏅 Championnat / Poules uniquement', desc: 'Classement final par points, pas de phase éliminatoire' },
                { value: 'poules_elimination', label: '⚡ Poules + Élimination directe', desc: "Les meilleurs de chaque poule s'affrontent en demi-finales et finale" },
                { value: 'poules_minichampionnat', label: '🔄 Poules + Mini-championnat', desc: 'Les qualifiés forment une nouvelle poule finale' },
                { value: 'elimination', label: '🎯 Élimination directe uniquement', desc: 'Tableau à partir des équipes engagées, pas de poules' },
              ].map(f => (
                <div key={f.value}
                  onClick={async () => {
                    const { data } = await supabase.from('tournois_organises').update({ format: f.value }).eq('id', tournoi.id).select().single()
                    if (data) setTournoi(data)
                  }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', marginBottom: '8px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${tournoi.format === f.value ? colors.accent.green : colors.border.strong}`, background: tournoi.format === f.value ? colors.accent.green + '11' : colors.background.raised }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${tournoi.format === f.value ? colors.accent.green : colors.border.strong}`, background: tournoi.format === f.value ? colors.accent.green : 'transparent', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: colors.text.primary }}>{f.label}</div>
                    <div style={{ color: colors.text.faint, fontSize: '12px' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          <div style={{ ...st.card, maxWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={st.label}>Heure de début</label>
                <input type="time" value={reglagesForm.heure_debut} onChange={e => setReglagesForm(f => ({ ...f, heure_debut: e.target.value }))} style={st.input} />
              </div>
              <div>
                <label style={st.label}>Nb terrains</label>
                <input type="number" min="1" value={reglagesForm.nb_terrains} onChange={e => setReglagesForm(f => ({ ...f, nb_terrains: parseInt(e.target.value) || 1 }))} style={st.input} />
              </div>
              <div>
                <label style={st.label}>Équipes/poule</label>
                <select value={reglagesForm.nb_equipes_poule} onChange={e => setReglagesForm(f => ({ ...f, nb_equipes_poule: parseInt(e.target.value) }))} style={st.input}>
                  {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={st.label}>Durée d'un match (min)</label>
                <input type="number" min="1" value={reglagesForm.duree_match} onChange={e => setReglagesForm(f => ({ ...f, duree_match: parseInt(e.target.value) || 1 }))} style={st.input} />
              </div>
              <div>
                <label style={st.label}>Pause entre matchs (min)</label>
                <input type="number" min="0" value={reglagesForm.pause_minutes} onChange={e => setReglagesForm(f => ({ ...f, pause_minutes: parseInt(e.target.value) || 0 }))} style={st.input} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={st.label}>Heure de fin</label>
                <input type="time" value={reglagesForm.heure_fin} onChange={e => setReglagesForm(f => ({ ...f, heure_fin: e.target.value }))} style={st.input} />
              </div>
              <div>
                <label style={st.label}>Début pause midi</label>
                <input type="time" value={reglagesForm.pause_midi_debut} onChange={e => setReglagesForm(f => ({ ...f, pause_midi_debut: e.target.value }))} style={st.input} />
              </div>
              <div>
                <label style={st.label}>Durée pause midi</label>
                <select value={reglagesForm.pause_midi_duree} onChange={e => setReglagesForm(f => ({ ...f, pause_midi_duree: parseInt(e.target.value) }))} style={st.input}>
                  <option value={60}>1h00</option>
                  <option value={75}>1h15</option>
                  <option value={90}>1h30</option>
                  <option value={105}>1h45</option>
                  <option value={120}>2h00</option>
                </select>
              </div>
            </div>
            <button onClick={sauvegarderReglages} disabled={reglagesSaving} style={{ ...st.btnSolid, opacity: reglagesSaving ? 0.6 : 1, marginTop: '16px' }}>
              {reglagesSaving ? 'Enregistrement…' : 'Enregistrer — puis régénère le planning pour appliquer'}
            </button>
          </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
