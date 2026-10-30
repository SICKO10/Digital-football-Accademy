// Conseils nutrition adaptés au joueur, choisis à partir de deux données déjà
// enregistrées dans nutrition_profil : le poste et l'objectif (plus l'âge pour
// une précaution). Aucune donnée n'est inventée : si le profil ne dit rien,
// rien n'est affiché.
//
// Contenu volontairement général et prudent (principes de nutrition sportive
// courants, sans chiffre nouveau) : à enrichir par Kevin s'il a des conseils
// maison par poste.

export const CONSEILS_POSTE = {
  gardien: {
    titre: 'Gardien de but',
    resume: 'Des efforts courts et explosifs, une concentration à garder jusqu\'à la dernière minute.',
    conseils: [
      'Des protéines à chaque repas pour entretenir les muscles des plongeons et des relances.',
      'Des glucides en quantité modérée, un peu plus la veille et le jour du match.',
      'Bois régulièrement : une baisse de concentration arrive vite quand on manque d\'eau.',
    ],
  },
  defenseur: {
    titre: 'Défenseur',
    resume: 'Beaucoup de duels, de reprises d\'appuis et de courses de récupération.',
    conseils: [
      'Des protéines à chaque repas pour récupérer des duels et des courses répétées.',
      'Des glucides complets (riz, pâtes, pommes de terre) pour tenir les 90 minutes.',
      'Pense à la collation d\'après match : les jambes se reconstruisent dans les heures qui suivent.',
    ],
  },
  milieu: {
    titre: 'Milieu de terrain',
    resume: 'L\'un des postes qui courent le plus : ton carburant, ce sont les glucides.',
    conseils: [
      'Ne saute jamais le repas d\'avant match : tes réserves d\'énergie sont ce qui te fait tenir.',
      'Les glucides sont la base de tes repas les jours d\'entraînement et de match.',
      'Une collation (banane, compote, pain) les jours chargés évite le coup de fatigue de fin de séance.',
    ],
  },
  attaquant: {
    titre: 'Attaquant',
    resume: 'Des accélérations, des frappes et des appuis vifs : de l\'explosivité avant tout.',
    conseils: [
      'Des glucides avant l\'effort pour avoir de l\'énergie dans les premières secondes d\'une course.',
      'Des protéines après chaque séance pour que les muscles récupèrent.',
      'Évite un repas lourd ou gras dans les heures qui précèdent un match.',
    ],
  },
}

export const CONSEILS_OBJECTIF = {
  performance: {
    titre: 'Performance',
    resume: 'Ton plan couvre tes dépenses, ni plus ni moins.',
    conseils: [
      'Le piège classique : manger trop peu les jours chargés. Suis ton journal pour t\'en rendre compte.',
      'Adapte ton assiette au type de journée (match, entraînement, repos) : c\'est ce que fait ton plan.',
    ],
  },
  prise_masse: {
    titre: 'Prise de masse',
    resume: 'Ton plan ajoute des calories chaque jour par rapport à tes dépenses.',
    conseils: [
      'Ajoute une collation par jour plutôt que de gonfler tous les repas.',
      'Pèse-toi une fois par semaine dans l\'onglet Poids. Si rien ne bouge après quelques semaines, augmente un peu les portions.',
      'Garde des protéines à chaque repas : ce sont elles qui construisent le muscle.',
    ],
  },
  perte_poids: {
    titre: 'Perte de poids',
    resume: 'Ton plan retire quelques calories par jour, sans te mettre à plat.',
    conseils: [
      'Ne descends pas plus bas que ton plan : tu as besoin d\'énergie pour t\'entraîner et récupérer.',
      'Garde les protéines en priorité, elles protègent tes muscles.',
      'Évite de couper les glucides les jours de match et d\'entraînement.',
    ],
  },
  endurance: {
    titre: 'Endurance',
    resume: 'Ton plan ajoute un peu d\'énergie pour soutenir des efforts longs.',
    conseils: [
      'Les glucides sont la base les jours d\'entraînement : ils font durer l\'effort.',
      'Bois avant, pendant et après les séances longues.',
      'Prévois une collation après l\'effort pour reconstituer tes réserves.',
    ],
  },
}

// Précaution liée à l'âge, uniquement si la date de naissance est connue
// (le profil nutrition enregistre l'âge). Un jeune en croissance ne doit pas
// suivre un régime sans avis d'un professionnel.
export function precautionAge(profil) {
  const age = parseInt(profil?.age, 10)
  if (!age || age >= 18) return null
  if (profil.objectif === 'perte_poids') {
    return 'Tu es encore en pleine croissance : avant de chercher à perdre du poids, parles-en à ton éducateur, à tes parents ou à un médecin.'
  }
  if (profil.objectif === 'prise_masse') {
    return 'Tu es encore en pleine croissance : ton corps change déjà seul. Mange à ta faim et évite les compléments.'
  }
  return null
}
