// Modèles de départ de Mon club : un clic pré-règle les étapes « Outils du club »
// et « Dashboard de mes éducateurs ». Un modèle ne fait qu'afficher ou masquer
// (listes de ce qui reste AFFICHÉ) : il n'achète ni n'active jamais un outil
// payant d'un éducateur. Les ids sont ceux de catalogueOutils.js.
export const MODELES = [
  {
    id: 'competition',
    nom: 'Club compétition',
    pour: 'Équipes en championnat : tout est affiché.',
    club: ['competition', 'projet_sportif', 'finances', 'vie_club', 'stages', 'cff4'],
    educateurs: ['suivi_joueurs', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4', 'stages'],
  },
  {
    id: 'ecole',
    nom: 'École de foot / formation',
    pour: 'Club centré sur les jeunes : séances, suivi, préparation physique et projet.',
    club: ['projet_sportif', 'vie_club', 'stages', 'cff4'],
    educateurs: ['seances', 'prep_physique', 'suivi_joueurs', 'projet_sportif', 'cff4', 'stages'],
  },
  {
    id: 'minimal',
    nom: 'Minimal',
    pour: 'Club bénévole qui veut du simple : l\'essentiel seulement.',
    club: ['vie_club'],
    educateurs: ['seances', 'suivi_joueurs'],
  },
  {
    id: 'tout',
    nom: 'Tout afficher',
    pour: 'Remet tous les outils et tout le menu des éducateurs.',
    club: ['competition', 'projet_sportif', 'finances', 'vie_club', 'stages', 'cff4'],
    educateurs: ['suivi_joueurs', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4', 'stages'],
  },
]

// Ce que le modèle change par rapport à l'état actuel.
// `clubIds` / `educIds` : tous les outils réglables ; `clubAffiche(id)` et
// `educAffiche(id)` : état actuel. Rend { club: { retires, affiches },
// educateurs: { retires, affiches } } (ids), vides si rien ne change.
export function planModele(modele, { clubIds, educIds, clubAffiche, educAffiche }) {
  const diff = (ids, gardes, affiche) => ({
    retires: ids.filter(id => !gardes.includes(id) && affiche(id)),
    affiches: ids.filter(id => gardes.includes(id) && !affiche(id)),
  })
  return {
    club: diff(clubIds, modele.club, clubAffiche),
    educateurs: diff(educIds, modele.educateurs, educAffiche),
  }
}

export const planVide = (plan) => ['club', 'educateurs'].every(k => plan[k].retires.length === 0 && plan[k].affiches.length === 0)
