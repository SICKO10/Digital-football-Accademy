// Les 8 phases de jeu de la plateforme (modèle de jeu AS Cannes, fiche séance « Fiche club »).
// Une seule source : la fiche séance, le projet sportif, la planification et les thèmes
// de séance les liront ici (blocs 8 à 10 du plan PLAN-fiche-seance.md).
// Les clés sont celles qui seront écrites en base (terrain_fonds.phase, etc.) : ne pas les renommer.

export const PHASES_JEU = [
  { cle: 'construction_basse', court: 'Constr. basse', long: 'Construction basse', camp: 'offensif' },
  { cle: 'construction_mediane', court: 'Constr. méd.', long: 'Construction médiane', camp: 'offensif' },
  { cle: 'construction_haute', court: 'Constr. haute', long: 'Construction haute', camp: 'offensif' },
  { cle: 'transition_off_def', court: 'Trans. OFF-DEF', long: 'Transition offensive vers défensive', camp: 'defensif' },
  { cle: 'defense_bloc_haut', court: 'Déf. bloc haut', long: 'Défense en bloc haut', camp: 'defensif' },
  { cle: 'defense_bloc_median', court: 'Déf. bloc médian', long: 'Défense en bloc médian', camp: 'defensif' },
  { cle: 'defense_bloc_bas', court: 'Déf. bloc bas', long: 'Défense en bloc bas', camp: 'defensif' },
  { cle: 'transition_def_off', court: 'Trans. DEF-OFF', long: 'Transition défensive vers offensive', camp: 'offensif' },
]

// Les coups de pied arrêtés restent une rubrique à part, hors des 8 phases.
export const RUBRIQUE_CPA = {
  offensif: { cle: 'cpa_offensif', long: 'Coups de pied arrêtés offensifs' },
  defensif: { cle: 'cpa_defensif', long: 'Coups de pied arrêtés défensifs' },
}

// Correspondance anciennes phases vers nouvelles (décision du 17/11, voir le plan).
// Une ancienne phase peut donner plusieurs nouvelles phases.
export const ANCIENNES_VERS_NOUVELLES = {
  attaque: ['construction_basse', 'construction_mediane', 'construction_haute'],
  defense: ['defense_bloc_haut', 'defense_bloc_median', 'defense_bloc_bas'],
  transition_att: ['transition_def_off'],
  transition_def: ['transition_off_def'],
  pressing: ['defense_bloc_haut'],
}

export const PHASE_PAR_CLE = Object.fromEntries(PHASES_JEU.map(p => [p.cle, p]))
