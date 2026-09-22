import { colors } from '../tokens'

// Formules nutrition footballeur (forfait Pro, DashboardJoueur). Les
// couleurs d'accent sont identiques entre les deux thèmes (cf. tokens.js :
// colorsClaire.accent = colors.accent), donc les référencer ici en dehors
// d'un composant (pas de useColors() possible dans un module) reste correct
// quel que soit le thème actif.

// BMR (Mifflin-St Jeor).
export function calculerBMR({ poids_kg, taille_cm, age, sexe }) {
  const base = (10 * poids_kg) + (6.25 * taille_cm) - (5 * age)
  return sexe === 'femme' ? base - 161 : base + 5
}

// Multiplicateur d'activité selon le nombre d'entraînements/semaine.
const MULTIPLICATEURS = {
  1: 1.375, 2: 1.375,
  3: 1.55, 4: 1.55,
  5: 1.725, 6: 1.725,
  7: 1.9,
}

const AJUSTEMENT_POSTE = { gardien: 0, defenseur: 50, milieu: 150, attaquant: 100 }
const AJUSTEMENT_OBJECTIF = { performance: 0, prise_masse: 300, perte_poids: -300, endurance: 100 }

// TDEE (Total Daily Energy Expenditure).
export function calculerTDEE(profil) {
  const bmr = calculerBMR(profil)
  const mult = MULTIPLICATEURS[Math.min(profil.nb_entrainements_semaine, 7)] || 1.55
  const ajPoste = AJUSTEMENT_POSTE[profil.poste] || 0
  const ajObj = AJUSTEMENT_OBJECTIF[profil.objectif] || 0
  return Math.round(bmr * mult + ajPoste + ajObj)
}

// Répartition macros selon le type de journée. Retourne les grammes et les
// pourcentages de calories (glucides/protéines = 4 kcal/g, lipides = 9 kcal/g).
export function calculerMacros(calories, typeJournee) {
  const splits = {
    match: { g: 0.60, p: 0.20, l: 0.20 },
    avant_match: { g: 0.65, p: 0.18, l: 0.17 },
    apres_match: { g: 0.45, p: 0.35, l: 0.20 },
    entrainement: { g: 0.50, p: 0.25, l: 0.25 },
    repos: { g: 0.40, p: 0.30, l: 0.30 },
  }
  const s = splits[typeJournee] || splits.entrainement
  return {
    glucides_g: Math.round((calories * s.g) / 4),
    proteines_g: Math.round((calories * s.p) / 4),
    lipides_g: Math.round((calories * s.l) / 9),
    glucides_pct: Math.round(s.g * 100),
    proteines_pct: Math.round(s.p * 100),
    lipides_pct: Math.round(s.l * 100),
  }
}

// Multiplicateur calorique appliqué au TDEE de base selon le type de
// journée, pour le "programme semaine type".
export const MULTIPLICATEUR_JOURNEE = { match: 1.1, avant_match: 1.05, apres_match: 0.95, entrainement: 1, repos: 0.85 }

export const CONSEILS_JOURNEE = {
  match: {
    titre: 'Jour de match',
    couleur: colors.accent.amber,
    conseils: [
      "Repas pré-match 3h avant le coup d'envoi (pâtes, riz, pain)",
      'Évite les fibres et graisses dans les 3h avant le match',
      "Hydratation : 500ml d'eau dans l'heure avant le match",
      'Pendant le match : 150-200ml d\'eau toutes les 20min',
      'Après le match : glucides rapides dans les 30min (banane, boisson sportive)',
    ],
  },
  avant_match: {
    titre: 'Veille de match — Charge glucides',
    couleur: colors.accent.orange,
    conseils: [
      'Augmente les glucides : riz, pâtes, pommes de terre',
      'Réduis les lipides et protéines lourdes',
      'Dîner léger mais riche en glucides complexes',
      "Hydratation optimale : 2-3L d'eau dans la journée",
    ],
  },
  apres_match: {
    titre: 'Lendemain de match — Récupération',
    couleur: colors.accent.green,
    conseils: [
      'Priorité aux protéines : poulet, poisson, œufs, fromage blanc',
      'Glucides pour reconstituer le glycogène musculaire',
      'Anti-inflammatoires naturels : fruits rouges, curcuma, oméga-3',
      'Hydratation ++ pour éliminer les toxines',
    ],
  },
  entrainement: {
    titre: "Jour d'entraînement",
    couleur: colors.accent.blue,
    conseils: [
      "Repas 2h avant l'entraînement si possible",
      'Collation pré-entraînement : banane + amandes',
      "Collation post-entraînement dans les 30min : protéines + glucides rapides",
      'Objectif : 1.6–2g de protéines/kg de poids corporel',
    ],
  },
  repos: {
    titre: 'Jour de repos',
    couleur: colors.accent.purple,
    conseils: [
      'Réduire légèrement les glucides (moins de dépense énergétique)',
      'Maintenir les protéines pour la récupération musculaire',
      'Privilégier les légumes verts, fibres, et aliments anti-inflammatoires',
      "C'est le jour idéal pour préparer ses repas de la semaine",
    ],
  },
}
