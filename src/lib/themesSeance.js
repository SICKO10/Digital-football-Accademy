import { PHASE_PAR_CLE } from '../constants/phasesJeu'

// Thèmes de séance officiels FFF, groupés par phase de jeu (offensif/défensif).
// Remplace l'ancienne classification maison à 6 valeurs (categorie_tactique) —
// même colonne, nouvelles valeurs. La phase n'est pas stockée en base, elle se
// déduit du thème via themeSeanceInfo().
export const THEMES_SEANCE = {
  offensif: {
    label: 'Offensif',
    color: '#f59e0b',
    themes: [
      { value: 'conservation', label: 'Conservation' },
      { value: 'utilisation_creation_espaces', label: 'Utilisation et création des espaces' },
      { value: 'dribble_elimination', label: 'Dribble et élimination' },
      { value: 'fixer_renverser', label: 'Fixer et renverser' },
      { value: 'agrandir_espace_jeu', label: "Agrandir l'espace de jeu" },
      { value: 'desequilibrer_finir', label: 'Déséquilibrer et finir' },
      { value: 'progression', label: 'Progression' },
      { value: 'coup_pied_arrete', label: 'Coup de pied arrêté' },
    ],
  },
  defensif: {
    label: 'Défensif',
    color: '#3b82f6',
    themes: [
      { value: 'defense_inferiorite_numerique', label: 'Défense en infériorité numérique' },
      { value: 'remplacer_axe_ballon_but', label: "Se remplacer sur l'axe ballon/but" },
      { value: 'duels', label: 'Duels' },
      { value: 'reformer_bloc_equipe', label: 'Reformer le bloc équipe' },
      { value: 'recuperer_ballon_bloc', label: 'Récupérer le ballon en bloc' },
      { value: 'proteger_but_desequilibre', label: 'Protéger son but en déséquilibre' },
      { value: 'gardien_de_but', label: 'Gardien de but' },
    ],
  },
}

export const TOUS_THEMES_SEANCE = Object.entries(THEMES_SEANCE).flatMap(
  ([phase, groupe]) => groupe.themes.map(t => ({ ...t, phase, color: groupe.color }))
)

export const themeSeanceInfo = (value) => TOUS_THEMES_SEANCE.find(t => t.value === value) || null

// Regroupement d'affichage des thèmes sous les 8 phases de jeu (+ CPA et gardien à part).
// Sert aux sélecteurs de thème (fiche séance, procédés, vidéos). La valeur enregistrée reste
// celle du thème : rien ne change en base, les anciennes séances et vidéos gardent leur thème.
// Un thème peut figurer dans plusieurs phases. `phase` (offensif/défensif) reste le camp du thème.
const RANGEMENT_PHASES = [
  { cle: 'construction_basse', themes: ['conservation', 'progression'] },
  { cle: 'construction_mediane', themes: ['conservation', 'progression', 'utilisation_creation_espaces', 'fixer_renverser', 'agrandir_espace_jeu'] },
  { cle: 'construction_haute', themes: ['utilisation_creation_espaces', 'dribble_elimination', 'fixer_renverser', 'agrandir_espace_jeu', 'desequilibrer_finir'] },
  { cle: 'transition_off_def', themes: ['reformer_bloc_equipe', 'proteger_but_desequilibre', 'defense_inferiorite_numerique'] },
  { cle: 'defense_bloc_haut', themes: ['recuperer_ballon_bloc', 'duels'] },
  { cle: 'defense_bloc_median', themes: ['recuperer_ballon_bloc', 'duels', 'remplacer_axe_ballon_but', 'reformer_bloc_equipe'] },
  { cle: 'defense_bloc_bas', themes: ['recuperer_ballon_bloc', 'duels', 'remplacer_axe_ballon_but', 'defense_inferiorite_numerique', 'proteger_but_desequilibre'] },
  { cle: 'transition_def_off', themes: ['progression', 'desequilibrer_finir', 'dribble_elimination'] },
  { cle: 'cpa', label: 'Coups de pied arrêtés', camp: 'offensif', themes: ['coup_pied_arrete'] },
  { cle: 'gardien', label: 'Gardien de but', camp: 'defensif', themes: ['gardien_de_but'] },
]

export const GROUPES_THEMES_PHASES = RANGEMENT_PHASES.map(g => {
  const phase = PHASE_PAR_CLE[g.cle]
  const camp = phase?.camp || g.camp
  return {
    cle: g.cle,
    label: phase?.long || g.label,
    camp,
    color: THEMES_SEANCE[camp].color,
    themes: g.themes.map(v => TOUS_THEMES_SEANCE.find(t => t.value === v)),
  }
})

// Groupe affiché à la réouverture d'une séance ou d'une vidéo : le premier qui contient le thème.
export const groupeThemeSeance = (value) => GROUPES_THEMES_PHASES.find(g => g.themes.some(t => t.value === value)) || null
