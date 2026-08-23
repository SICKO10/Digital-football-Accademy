// Regroupement des valeurs canoniques de profiles.plan (cf. src/pages/Register.jsx)
// en familles lisibles pour un admin — partagé entre Overview et Users pour
// que le clic sur une stat card filtre le tableau avec la même définition.
// colorKey référence une clé de la palette du thème courant (cf. theme.js).
export const TYPE_FAMILIES = [
  { key: 'joueurs', label: 'Joueurs', plans: ['joueur_starter', 'joueur_pro'], colorKey: 'accent' },
  { key: 'educateurs', label: 'Éducateurs', plans: ['educateur'], colorKey: 'success' },
  { key: 'clubs', label: 'Clubs', plans: ['club'], colorKey: 'warn' },
  { key: 'recruteurs', label: 'Recruteurs', plans: ['scout'], colorKey: 'accent' },
]

export const TYPE_LABEL = {
  joueur_starter: 'Joueur Starter',
  joueur_pro: 'Joueur Pro',
  educateur: 'Éducateur',
  club: 'Club',
  scout: 'Recruteur',
  dirigeant: 'Dirigeant',
}
