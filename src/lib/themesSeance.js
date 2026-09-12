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
