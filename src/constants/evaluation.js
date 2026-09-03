// Fiche d'évaluation joueur — 3 évaluations par saison (début / mi-saison /
// fin de saison), 4 aspects avec points forts + points à améliorer chacun.
export const PERIODES = [
  { key: 'debut', label: 'Début de saison' },
  { key: 'mi_saison', label: 'Mi-saison' },
  { key: 'fin_saison', label: 'Fin de saison' },
]

export const ASPECTS = [
  { key: 'tactique', label: 'Tactique', couleur: '#f59e0b' },
  { key: 'technique', label: 'Technique', couleur: '#3b82f6' },
  { key: 'physique', label: 'Physique', couleur: '#4ade80' },
  { key: 'mental', label: 'Mental', couleur: '#a78bfa' },
]

export const evaluationVide = (equipeJoueurId, educateurId, saison, periode) => ({
  equipe_joueur_id: equipeJoueurId, educateur_id: educateurId, saison, periode,
  tactique_points_forts: '', tactique_a_ameliorer: '',
  technique_points_forts: '', technique_a_ameliorer: '',
  physique_points_forts: '', physique_a_ameliorer: '',
  mental_points_forts: '', mental_a_ameliorer: '',
  objectif_personnel: '', objectif_collectif: '',
  satisfaction_staff: null, satisfaction_equipe: null, plaisir_terrain: null, note_globale_saison: null,
  visible_joueur: false, autorise_prefill_joueur: false, verrouillee_joueur: false,
})
