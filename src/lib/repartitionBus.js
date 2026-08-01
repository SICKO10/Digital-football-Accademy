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

export const MARGE_MIN_DEFAUT = 30

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
    const retour = toMinutes(dep.heure_retour_estimee) ?? depart

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
