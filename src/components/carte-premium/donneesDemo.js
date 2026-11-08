// Données FICTIVES, codées en dur, uniquement pour la prévisualisation de la carte.
// Aucune de ces valeurs ne vient de la base ni d'un calcul : la note générale et
// les six caractéristiques sont de simples nombres de démonstration.
export const joueurDemo = {
  note: 87,
  poste: 'MIL',
  nom: 'Léo Marchand',
  stats: [
    { cle: 'VIT', valeur: 88 },
    { cle: 'TIR', valeur: 84 },
    { cle: 'PAS', valeur: 86 },
    { cle: 'DRI', valeur: 89 },
    { cle: 'DEF', valeur: 61 },
    { cle: 'PHY', valeur: 74 },
  ],
}

// Même carte avec les libellés réellement utilisés dans « Mes statistiques » (valeurs fictives).
export const joueurDemoReel = {
  note: 66,
  poste: 'MIL',
  nom: 'Rayan Attia',
  drapeau: false,
  stats: [
    { cle: 'BUTS', icone: 'TIR', valeur: 0 },
    { cle: 'PASSES', icone: 'PAS', valeur: 1 },
    { cle: 'MATCHS', icone: 'MAT', valeur: 14 },
    { cle: 'MIN.', icone: 'MIN', valeur: 1085 },
    { cle: 'PRÉS.', icone: 'PRE', valeur: '98%' },
    { cle: 'NOTE', icone: 'NOT', valeur: '6,1' },
  ],
}
