// RPE (Rate of Perceived Exertion, indice d'effort perçu) : note sur 10
// donnée par le joueur environ 30 minutes après la séance, qui combine
// fatigue musculaire, souffle et stress mental. Échelle et libellés fournis
// par l'utilisateur — partagés par le formulaire joueur (NoteSeanceForm) et
// la page Ressenti RPE de l'éducateur, pour que les deux parlent la même
// langue. couleur = clé de colors.accent (cf. tokens.js).
export const ZONES_RPE = [
  { min: 0, max: 1, label: 'Repos total ou effort très léger', exemple: '', couleur: 'blue' },
  { min: 2, max: 3, label: 'Effort léger', exemple: 'échauffement, passes à côté', couleur: 'green' },
  { min: 4, max: 5, label: 'Effort modéré', exemple: 'exercices techniques rythmés', couleur: 'amber' },
  { min: 6, max: 7, label: 'Effort difficile', exemple: 'jeu réduit, séquences intenses', couleur: 'orange' },
  { min: 8, max: 9, label: 'Effort très difficile', exemple: 'match amical ou gros bloc physique', couleur: 'red' },
  { min: 10, max: 10, label: 'Effort maximal', exemple: 'épuisement total, match officiel difficile', couleur: 'purple' },
]

export const DEFINITION_RPE = "Note sur 10 donnée par le joueur environ 30 minutes après la séance : à quel point l'effort lui a semblé difficile. Elle combine la fatigue musculaire, le souffle et le stress mental."

export function zoneRpe(valeur) {
  if (valeur == null || Number.isNaN(Number(valeur))) return null
  const v = Math.round(Number(valeur))
  return ZONES_RPE.find(z => v >= z.min && v <= z.max) || null
}

// Réponses enregistrées avant le passage au RPE : seule la « charge de
// travail » sur 5 existe (colonne charge_travail, rpe vide). Convertie ×2
// pour rester comparable, et signalée comme estimée à l'affichage.
export function rpeDeReponse(r) {
  if (r?.rpe != null) return { valeur: Number(r.rpe), estime: false }
  if (r?.charge_travail != null) return { valeur: Number(r.charge_travail) * 2, estime: true }
  return null
}
