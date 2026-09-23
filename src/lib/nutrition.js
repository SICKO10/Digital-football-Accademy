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

// Recettes suggérées par type de journée — affichées dans l'onglet Recettes
// de NutritionDashboard.jsx, et ajoutables directement au journal du jour.
export const RECETTES = {
  match: [
    {
      nom: 'Pâtes au poulet grillé',
      timing: '3h avant le match',
      calories: 620, proteines_g: 42, glucides_g: 78, lipides_g: 10,
      ingredients: ['200g de pâtes complètes', '150g de blanc de poulet', 'Sauce tomate maison', 'Parmesan (20g)'],
      preparation: "Cuire les pâtes al dente. Griller le poulet à la poêle avec un filet d'huile d'olive. Mélanger avec la sauce tomate. Éviter les sauces lourdes.",
    },
    {
      nom: 'Riz au thon et légumes',
      timing: '3h avant le match',
      calories: 540, proteines_g: 38, glucides_g: 70, lipides_g: 8,
      ingredients: ['180g de riz basmati', '1 boîte de thon au naturel (120g)', 'Carottes cuites', 'Haricots verts', "Huile d'olive (1 cc)"],
      preparation: 'Cuire le riz. Égoutter le thon. Mélanger avec les légumes cuits vapeur. Assaisonner légèrement.',
    },
    {
      nom: 'Banana & energy shake',
      timing: '1h avant le match',
      calories: 310, proteines_g: 18, glucides_g: 52, lipides_g: 4,
      ingredients: ['2 bananes', "200ml de lait d'avoine", '1 scoop de whey vanille', '1 cs de miel'],
      preparation: 'Mixer tous les ingrédients. Consommer 45-60 min avant le coup d\'envoi.',
    },
  ],
  apres_match: [
    {
      nom: 'Bowl récupération saumon-quinoa',
      timing: 'Dans les 30-45 min après le match',
      calories: 580, proteines_g: 48, glucides_g: 52, lipides_g: 14,
      ingredients: ['150g de saumon grillé', '100g de quinoa cuit', 'Épinards frais', 'Avocat (½)', 'Citron'],
      preparation: "Griller le saumon 4 min de chaque côté. Disposer sur le quinoa chaud. Ajouter les épinards et l'avocat en dés. Arroser de jus de citron.",
    },
    {
      nom: 'Omelette protéinée aux légumes',
      timing: '1-2h après le match',
      calories: 420, proteines_g: 36, glucides_g: 18, lipides_g: 22,
      ingredients: ['4 œufs entiers', 'Poivrons, tomates, oignons', '30g de fromage râpé', 'Herbes fraîches'],
      preparation: "Faire revenir les légumes. Battre les œufs. Cuire l'omelette à feu moyen. Accompagner d'une tartine de pain complet.",
    },
    {
      nom: 'Yaourt grec et fruits rouges',
      timing: 'Dans les 30 min après le match',
      calories: 220, proteines_g: 18, glucides_g: 28, lipides_g: 3,
      ingredients: ['200g de yaourt grec 0%', '100g de fruits rouges (fraises, myrtilles)', '1 cs de miel', 'Granola (20g)'],
      preparation: 'Mélanger le yaourt avec le miel. Ajouter les fruits rouges et le granola. Rapide à préparer dans le vestiaire.',
    },
  ],
  avant_match: [
    {
      nom: 'Risotto aux légumes',
      timing: 'Dîner la veille',
      calories: 560, proteines_g: 22, glucides_g: 88, lipides_g: 10,
      ingredients: ['200g de riz arborio', 'Champignons, courgettes', 'Parmesan (25g)', 'Bouillon de légumes', "Huile d'olive"],
      preparation: 'Faire revenir les légumes. Ajouter le riz et le bouillon chaud progressivement. Finir avec le parmesan. Repas léger mais chargé en glucides.',
    },
    {
      nom: 'Toast avocat-œuf poché',
      timing: 'Petit déjeuner jour de match',
      calories: 380, proteines_g: 20, glucides_g: 42, lipides_g: 14,
      ingredients: ['2 tranches de pain complet grillé', '1 avocat mûr', '2 œufs pochés', 'Sel, poivre, piment doux'],
      preparation: "Griller le pain. Écraser l'avocat. Pocher les œufs 3 min dans l'eau frémissante vinaigrée. Assembler et assaisonner.",
    },
  ],
  entrainement: [
    {
      nom: 'Poulet patate douce brocolis',
      timing: "Déjeuner 2h avant l'entraînement",
      calories: 520, proteines_g: 44, glucides_g: 55, lipides_g: 8,
      ingredients: ['180g de blanc de poulet', '200g de patate douce', '150g de brocolis', 'Épices (curcuma, paprika)', "Huile d'olive (1 cs)"],
      preparation: 'Cuire la patate douce au four 25 min. Faire cuire le poulet épicé à la poêle. Cuire les brocolis vapeur. Assembler dans un bol.',
    },
    {
      nom: 'Shake protéiné post-entraînement',
      timing: "Dans les 30 min après l'entraînement",
      calories: 290, proteines_g: 30, glucides_g: 32, lipides_g: 4,
      ingredients: ['1 scoop de whey protéine (30g)', "250ml de lait écrémé ou d'avoine", '1 banane', '1 cs de beurre de cacahuète (optionnel)'],
      preparation: "Mixer tous les ingrédients. Consommer immédiatement après l'effort pour maximiser la récupération musculaire.",
    },
  ],
  repos: [
    {
      nom: 'Salade complète méditerranéenne',
      timing: 'Déjeuner',
      calories: 420, proteines_g: 30, glucides_g: 28, lipides_g: 22,
      ingredients: ['Roquette, tomates cerises, concombre', '100g de thon ou poulet froid', 'Olives, feta (30g)', 'Pois chiches (50g)', "Vinaigrette citron-huile d'olive"],
      preparation: 'Mélanger tous les ingrédients. La salade de repos doit être riche en fibres et micronutriments pour optimiser la récupération passive.',
    },
    {
      nom: 'Soupe lentilles corail',
      timing: 'Dîner',
      calories: 360, proteines_g: 22, glucides_g: 50, lipides_g: 6,
      ingredients: ['150g de lentilles corail', 'Oignons, carottes, céleri', 'Lait de coco (100ml)', 'Cumin, curcuma, gingembre', 'Bouillon de légumes'],
      preparation: 'Faire revenir les légumes avec les épices. Ajouter les lentilles et le bouillon. Cuire 20 min. Mixer avec le lait de coco. Anti-inflammatoire naturel.',
    },
  ],
}
