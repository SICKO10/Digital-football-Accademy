// Sous-dossiers "principes de jeu" affichés dans les dossiers Offensif/Défensif
// de "Mes séances" (séances libres uniquement — ne touche pas aux gabarits
// BMF/BEF/DEF). Le matching se fait par sous-chaîne sur le champ `theme`
// (texte libre saisi par le coach), pas sur `categorie_tactique` (thèmes
// officiels FFF, utilisés uniquement pour le tri Offensif/Défensif/Sans
// catégorie du niveau au-dessus).
export const PRINCIPES_OFFENSIFS = [
  {
    id: 'conservation',
    label: 'Conservation / maîtrise du ballon',
    themes: ['Conservation', 'Maîtrise du ballon', 'Sécuriser la possession'],
  },
  {
    id: 'progression',
    label: 'Progression / déséquilibre',
    themes: ['Progression', 'Déséquilibrer et finir', 'Fixer et renverser', 'Renverser le jeu'],
  },
  {
    id: 'espaces',
    label: 'Occupation et exploitation des espaces',
    themes: ['Utilisation et création des espaces', "Agrandir l'espace de jeu"],
  },
  {
    id: 'desequilibre',
    label: 'Déséquilibre individuel et collectif',
    themes: ['Dribble et élimination', 'Déséquilibrer'],
  },
  {
    id: 'finition',
    label: 'Finition / dernière zone',
    themes: ['Finition', 'Coup de pied arrêté'],
  },
  {
    id: 'transition_off',
    label: 'Transition offensive',
    themes: ['Transition offensive'],
  },
]

export const PRINCIPES_DEFENSIFS = [
  { id: 'protection_but', label: 'Protection du but / cadrage', themes: ['Protéger son but en déséquilibre', 'Gardien de but'] },
  { id: 'bloc', label: 'Organisation du bloc', themes: ['Réformer le bloc équipe', 'Récupérer le ballon en bloc'] },
  { id: 'pressing', label: 'Pressing / récupération', themes: ['Récupérer le ballon en bloc', 'Se remplacer sur l\'axe ballon/but'] },
  { id: 'couverture', label: 'Couverture / entraide', themes: ['Duels', 'Défense en infériorité numérique'] },
  { id: 'profondeur', label: 'Gestion de la profondeur', themes: ['Se remplacer sur l\'axe ballon/but'] },
  { id: 'surface', label: 'Défense de la surface', themes: ['Protéger son but en déséquilibre', 'Gardien de but'] },
  { id: 'transition_def', label: 'Transition défensive', themes: ['Transition défensive'] },
]
