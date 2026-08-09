// Algorithme de répartition des mini-bus — partagé entre l'outil "Répartition
// mini-bus" (scan/import) et l'onglet "Planning week-end" de l'outil
// Déplacements, pour ne pas maintenir deux copies de la même logique.
//
// Règles :
// 1. Trie les déplacements par heure de départ.
// 2. Pour chaque déplacement, cherche un bus déjà utilisé qui revient à temps
//    (heure_retour_estimee + marge <= heure_depart suivant) — priorité au bus
//    dont la capacité est la plus proche du besoin, pour garder les gros bus
//    disponibles pour de plus gros groupes plus tard.
// 3. Si aucun bus seul ne suffit (capacité), essaie de combiner deux bus
//    disponibles dont la capacité cumulée couvre le groupe.
// 4. Si rien ne convient (timing ou capacité), le déplacement est marqué
//    "insuffisant" pour alerte et affectation manuelle.
//
// Exception : pour un tournoi ou un stage, le bus reste sur place toute la
// journée avec le groupe (pas d'aller-retour comme pour un match) — même si
// heure_retour_estimee est renseignée, elle ne reflète pas un vrai moment de
// disponibilité. Le bus est donc bloqué pour le reste de la journée dès qu'il
// est assigné à ce type de déplacement, plutôt que réputé libre à retour.

export const MARGE_MIN_DEFAUT = 30

// Effectif par défaut d'un déplacement match (joueurs convoqués + staff),
// basé sur le type de compétition — pas l'effectif total de l'équipe (un
// match n'embarque qu'une partie du groupe) : 14 joueurs habituellement, 16
// en coupe, + 2 dirigeants dans tous les cas. Sert de valeur de départ tant
// que l'éducateur n'a pas ajusté nb_personnes à la main pour ce match précis
// (nombre réel de convoqués, qui varie d'un match à l'autre).
export const effectifParDefautMatch = (competition) => {
  const estCoupe = /coupe/i.test(competition || '')
  return (estCoupe ? 16 : 14) + 2
}

export const toMinutes = (hhmm) => {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h * 60 + (m || 0)
}

export function repartirBus(deplacements, vehicules, margeMin = MARGE_MIN_DEFAUT) {
  const flotte = vehicules.map(v => ({ ...v, disponibleDepuis: 0 }))
  const sorted = [...deplacements].sort((a, b) => (toMinutes(a.heure_depart) ?? 0) - (toMinutes(b.heure_depart) ?? 0))

  return sorted.map(dep => {
    const depart = toMinutes(dep.heure_depart)
    const nbPersonnes = Number(dep.nb_personnes) || 0
    const journeeComplete = dep.nature === 'tournoi' || dep.nature === 'stage'
    const retour = journeeComplete ? Infinity : (toMinutes(dep.heure_retour_estimee) ?? depart)

    if (depart == null) {
      return { ...dep, vehicule: '', vehicules: [], conducteur: '', statut: 'insuffisant' }
    }

    const disponibles = flotte.filter(v => v.disponibleDepuis + margeMin <= depart)

    // 1. Un seul bus suffit — on prend celui dont la capacité est la plus juste.
    const unSeul = disponibles.filter(v => v.capacite >= nbPersonnes).sort((a, b) => a.capacite - b.capacite)[0]
    if (unSeul) {
      unSeul.disponibleDepuis = retour
      return { ...dep, vehicule: unSeul.plaque, vehicules: [unSeul.plaque], conducteur: '', statut: 'assigne' }
    }

    // 2. Combiner deux bus disponibles dont la capacité cumulée suffit.
    for (let i = 0; i < disponibles.length; i++) {
      for (let j = i + 1; j < disponibles.length; j++) {
        if (disponibles[i].capacite + disponibles[j].capacite >= nbPersonnes) {
          disponibles[i].disponibleDepuis = retour
          disponibles[j].disponibleDepuis = retour
          return {
            ...dep,
            vehicule: `${disponibles[i].plaque} + ${disponibles[j].plaque}`,
            vehicules: [disponibles[i].plaque, disponibles[j].plaque],
            conducteur: '',
            statut: 'combine',
          }
        }
      }
    }

    // 3. Rien ne convient : à traiter manuellement.
    return { ...dep, vehicule: '', vehicules: [], conducteur: '', statut: 'insuffisant' }
  })
}
