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
// image = URL Unsplash (photo fixe, pas de recherche dynamique) ; pourquoi =
// justification nutritionnelle affichée dans la carte dépliée ; emoji = icône
// de secours si l'image ne charge pas (RecetteCard bascule dessus via onError).
export const RECETTES = {
  match: [
    {
      nom: 'Pâtes au poulet grillé',
      timing: '3h avant le match',
      calories: 620, proteines_g: 42, glucides_g: 78, lipides_g: 10,
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80',
      difficulte: 'Facile', temps: '20 min', emoji: '🍝',
      ingredients: ['200g de pâtes complètes', '150g de blanc de poulet', 'Sauce tomate (150ml)', 'Parmesan (20g)', 'Herbes de Provence'],
      preparation: "Cuire les pâtes al dente (10 min). Griller le poulet coupé en morceaux avec un filet d'huile d'olive (8 min). Mélanger avec la sauce tomate chaude. Ajouter le parmesan et les herbes.",
      pourquoi: "Riche en glucides complexes pour charger le glycogène musculaire avant l'effort. Le poulet apporte les protéines sans alourdir la digestion.",
    },
    {
      nom: 'Riz thaï au thon',
      timing: '3h avant le match',
      calories: 540, proteines_g: 38, glucides_g: 70, lipides_g: 8,
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
      difficulte: 'Facile', temps: '15 min', emoji: '🍱',
      ingredients: ['180g de riz basmati', '1 boîte de thon au naturel (120g)', 'Carottes (100g)', 'Haricots verts (100g)', 'Sauce soja légère (1cs)', 'Citron'],
      preparation: 'Cuire le riz. Faire sauter les légumes 5 min à la poêle. Égoutter le thon. Mélanger le tout, assaisonner avec sauce soja et citron.',
      pourquoi: "Le thon est une protéine maigre idéale (peu de graisses). Le riz basmati a un index glycémique modéré — énergie stable pendant 90 minutes.",
    },
    {
      nom: 'Shake banane-avoine pré-match',
      timing: '1h avant le match',
      calories: 310, proteines_g: 18, glucides_g: 52, lipides_g: 4,
      image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
      difficulte: 'Très facile', temps: '5 min', emoji: '🍌',
      ingredients: ['2 bananes mûres', "200ml lait d'avoine", "40g flocons d'avoine", '1 scoop whey vanille (30g)', '1cs miel'],
      preparation: "Mixer tous les ingrédients 1 minute. Consommer froid 45-60 min avant le coup d'envoi.",
      pourquoi: "La banane = glucides rapides + potassium contre les crampes. L'avoine = glucides lents pour tenir dans la durée. La whey booste les acides aminés.",
    },
    {
      nom: 'Toast avocat-œuf poché',
      timing: 'Petit déj jour de match',
      calories: 380, proteines_g: 20, glucides_g: 42, lipides_g: 14,
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80',
      difficulte: 'Facile', temps: '10 min', emoji: '🥑',
      ingredients: ['2 tranches pain complet', '1 avocat mûr', '2 œufs', 'Sel, poivre, piment doux', 'Jus de citron'],
      preparation: "Griller le pain. Écraser l'avocat avec le citron. Pocher les œufs 3 min dans l'eau frémissante vinaigrée. Assembler.",
      pourquoi: "L'avocat = graisses saines oméga-9. Les œufs = protéines complètes. Le pain complet = fibres pour une satiété durable sans lourdeur.",
    },
  ],

  apres_match: [
    {
      nom: 'Bowl récupération saumon-quinoa',
      timing: '30-45 min après le match',
      calories: 580, proteines_g: 48, glucides_g: 52, lipides_g: 14,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
      difficulte: 'Moyen', temps: '25 min', emoji: '🐟',
      ingredients: ['150g saumon frais', '100g quinoa cuit', 'Épinards frais (60g)', '½ avocat', "Citron, huile d'olive", 'Graines de sésame'],
      preparation: "Griller le saumon 4 min/côté. Cuire le quinoa (15 min). Disposer dans un bol avec les épinards, l'avocat en dés. Arroser d'huile d'olive et citron.",
      pourquoi: "Le saumon = oméga-3 anti-inflammatoires pour récupérer des micro-déchirures musculaires. Le quinoa = protéines complètes + glucides pour reconstituer le glycogène.",
    },
    {
      nom: 'Omelette protéinée aux légumes',
      timing: '1-2h après le match',
      calories: 420, proteines_g: 36, glucides_g: 18, lipides_g: 22,
      image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&q=80',
      difficulte: 'Facile', temps: '12 min', emoji: '🍳',
      ingredients: ['4 œufs entiers', 'Poivrons (½)', 'Tomates cerises (8)', 'Oignons (½)', '30g fromage râpé', 'Herbes fraîches'],
      preparation: "Faire revenir les légumes 4 min. Battre les œufs avec sel et herbes. Verser sur les légumes, cuire à feu moyen 6 min. Ajouter le fromage. Accompagner de pain complet.",
      pourquoi: "Les œufs = source de protéines la plus complète existante. Les légumes apportent les vitamines C et B pour la récupération cellulaire.",
    },
    {
      nom: 'Yaourt grec fruits rouges',
      timing: 'Dans les 30 min (vestiaire)',
      calories: 220, proteines_g: 18, glucides_g: 28, lipides_g: 3,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
      difficulte: 'Très facile', temps: '2 min', emoji: '🍓',
      ingredients: ['200g yaourt grec 0%', '100g fruits rouges (fraises, myrtilles)', '1cs miel', '20g granola'],
      preparation: 'Mélanger le yaourt avec le miel. Ajouter les fruits rouges et le granola. Prêt à emporter dans le sac de sport.',
      pourquoi: "Les fruits rouges = anthocyanines, puissants anti-oxydants qui neutralisent les radicaux libres produits par l'effort. Le yaourt grec = protéines rapides.",
    },
  ],

  avant_match: [
    {
      nom: 'Risotto aux légumes',
      timing: 'Dîner la veille',
      calories: 560, proteines_g: 22, glucides_g: 88, lipides_g: 10,
      image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80',
      difficulte: 'Moyen', temps: '30 min', emoji: '🍚',
      ingredients: ['200g riz arborio', 'Champignons (100g)', 'Courgettes (1)', 'Bouillon légumes (500ml)', 'Parmesan (25g)', "Huile d'olive (1cs)"],
      preparation: "Faire revenir les légumes. Ajouter le riz et nacrer 2 min. Verser le bouillon chaud louche par louche en remuant (20 min). Finir avec parmesan.",
      pourquoi: "La veille d'un match = charge maximale en glucides. Le riz arborio est très riche en amidon. Évite les sauces lourdes et les fibres en excès.",
    },
    {
      nom: 'Pancakes protéinés banane-avoine',
      timing: 'Petit déj matin du match',
      calories: 420, proteines_g: 24, glucides_g: 58, lipides_g: 10,
      image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
      difficulte: 'Facile', temps: '15 min', emoji: '🥞',
      ingredients: ["80g flocons d'avoine mixés", '2 œufs', '1 banane écrasée', '1 scoop whey (30g)', '100ml lait', "Sirop d'érable"],
      preparation: "Mixer l'avoine en farine. Mélanger avec œufs, banane, whey et lait. Cuire en petites galettes 2-3 min/côté. Napper de sirop d'érable.",
      pourquoi: "Le matin d'un match, le corps a besoin d'une base solide. Cette recette combine glucides complexes + protéines + sucres naturels pour partir avec de l'énergie.",
    },
  ],

  entrainement: [
    {
      nom: 'Bowl poulet patate douce',
      timing: "Déjeuner 2h avant l'entraînement",
      calories: 520, proteines_g: 44, glucides_g: 55, lipides_g: 8,
      image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80',
      difficulte: 'Facile', temps: '30 min', emoji: '🍠',
      ingredients: ['180g blanc de poulet', '200g patate douce', '150g brocolis', 'Curcuma, paprika fumé', "Huile d'olive (1cs)", 'Graines de courge'],
      preparation: "Cuire la patate douce au four 25 min (200°C). Assaisonner le poulet et griller 8 min. Cuire les brocolis vapeur 6 min. Assembler dans un bol, parsemer de graines.",
      pourquoi: "La patate douce = index glycémique bas, vitamines A et C. Les brocolis = calcium et fer. Le curcuma = anti-inflammatoire naturel puissant.",
    },
    {
      nom: 'Shake récupération post-entraînement',
      timing: "Dans les 30 min après l'entraînement",
      calories: 290, proteines_g: 30, glucides_g: 32, lipides_g: 4,
      image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=400&q=80',
      difficulte: 'Très facile', temps: '3 min', emoji: '💪',
      ingredients: ['1 scoop whey (30g)', "250ml lait écrémé ou d'avoine", '1 banane', '1cs beurre de cacahuète', 'Glaçons'],
      preparation: "Mixer le tout 30 secondes. Consommer immédiatement après l'effort. La fenêtre anabolique dure 30-45 min après l'entraînement.",
      pourquoi: "La whey est absorbée en 20 min — idéale pour déclencher la synthèse protéique après l'effort. La banane reconstitue le glycogène rapidement.",
    },
    {
      nom: 'Salade niçoise sportive',
      timing: 'Déjeuner léger',
      calories: 460, proteines_g: 38, glucides_g: 32, lipides_g: 18,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      difficulte: 'Facile', temps: '15 min', emoji: '🥗',
      ingredients: ['150g thon au naturel', '2 œufs durs', 'Haricots verts (100g)', 'Tomates (2)', 'Olives noires (10)', 'Pommes de terre cuites (150g)', 'Vinaigrette légère'],
      preparation: 'Cuire les œufs 10 min. Blanchir les haricots verts 4 min. Disposer tous les ingrédients sur la salade. Assaisonner.',
      pourquoi: "Une salade complète qui couvre protéines + glucides + graisses saines. Les olives = oméga-9. Idéale les jours d'entraînement modéré.",
    },
    {
      nom: 'Wrap dinde-légumes',
      timing: 'Snack pré-entraînement',
      calories: 340, proteines_g: 28, glucides_g: 38, lipides_g: 7,
      image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
      difficulte: 'Très facile', temps: '5 min', emoji: '🌯',
      ingredients: ['1 tortilla complète', '100g blanc de dinde tranché', 'Fromage blanc (2cs)', 'Salade, tomates, concombre', 'Moutarde (1cc)'],
      preparation: 'Tartiner la tortilla de fromage blanc et moutarde. Disposer la dinde et les légumes. Rouler serré. Couper en deux.',
      pourquoi: "La dinde est la viande la plus maigre (moins de 2% de graisses). Pratique à emporter. La tortilla complète évite le pic glycémique du pain blanc.",
    },
  ],

  repos: [
    {
      nom: 'Salade méditerranéenne complète',
      timing: 'Déjeuner',
      calories: 420, proteines_g: 30, glucides_g: 28, lipides_g: 22,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80',
      difficulte: 'Très facile', temps: '10 min', emoji: '🥗',
      ingredients: ['Roquette + épinards (80g)', 'Pois chiches cuits (100g)', 'Feta (40g)', 'Tomates cerises (10)', 'Concombre', 'Olives (10)', "Vinaigrette citron-huile d'olive"],
      preparation: 'Rincer les pois chiches. Couper les légumes. Émietter la feta. Mélanger le tout. Assaisonner.',
      pourquoi: "Le jour de repos = moins de calories, mais maintenir les protéines pour la récupération passive. Les pois chiches = protéines végétales + fibres.",
    },
    {
      nom: 'Soupe lentilles corail au lait de coco',
      timing: 'Dîner',
      calories: 360, proteines_g: 22, glucides_g: 50, lipides_g: 6,
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
      difficulte: 'Facile', temps: '25 min', emoji: '🍲',
      ingredients: ['150g lentilles corail', 'Oignons, carottes, céleri', '100ml lait de coco', 'Cumin, curcuma, gingembre frais', 'Bouillon légumes (500ml)'],
      preparation: 'Faire revenir les légumes 5 min avec les épices. Ajouter les lentilles et le bouillon. Cuire 20 min. Mixer et incorporer le lait de coco.',
      pourquoi: "Les lentilles = fer + protéines végétales. Le curcuma + gingembre = combo anti-inflammatoire puissant. Parfait pour optimiser la récupération en repos actif.",
    },
    {
      nom: 'Porridge protéiné aux fruits',
      timing: 'Petit déjeuner',
      calories: 380, proteines_g: 22, glucides_g: 55, lipides_g: 8,
      image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&q=80',
      difficulte: 'Très facile', temps: '8 min', emoji: '🥣',
      ingredients: ["80g flocons d'avoine", "250ml lait d'amande", '1 scoop whey (30g)', 'Myrtilles (50g)', 'Amandes effilées (15g)', 'Cannelle'],
      preparation: "Chauffer l'avoine avec le lait 5 min en remuant. Hors feu, incorporer la whey. Garnir de myrtilles, amandes et cannelle.",
      pourquoi: "L'avoine = bêta-glucanes qui réduisent le cholestérol et stabilisent la glycémie. Parfait le matin d'un jour off pour partir sur de bonnes bases.",
    },
  ],
}
