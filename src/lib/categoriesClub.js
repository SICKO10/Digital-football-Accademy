// Calculs purs de l'écran « Catégories » du club (bloc 2 du chantier catégories).
export const LETTRES_EQUIPES = ['A', 'B', 'C', 'D', 'E']

export const MODES_CATEGORIE = {
  commun: { label: 'Effectif commun', aide: 'Une seule liste de joueurs partagée par toutes les équipes de la catégorie.' },
  par_equipe: { label: 'Effectifs par équipe', aide: 'Chaque équipe a sa propre liste de joueurs, comme aujourd\'hui.' },
}

export const cleNom = (nom) => String(nom || '').replace(/\s+/g, '').toUpperCase()

// Catégories de la base + leurs équipes, triées par nom. Une catégorie sans
// équipe reste visible (elle peut être supprimée).
export function regrouperCategories(categories, equipes) {
  return [...(categories || [])]
    .map(c => ({
      ...c,
      equipes: (equipes || [])
        .filter(e => e.categorie_id === c.id)
        .sort((a, b) => (a.equipe || '').localeCompare(b.equipe || '')),
    }))
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { numeric: true }))
}

// Places restantes avant la limite du forfait (null = pas de limite).
export function placesRestantes(quota, nbEquipes) {
  if (quota == null) return null
  return Math.max(0, quota - nbEquipes)
}

// Pourquoi le bouton « Créer » est bloqué (texte d'aide), ou null s'il peut servir.
export function raisonBlocage({ nom, mode, nbEquipes, existe, places }) {
  if (!nom) return 'Choisis une catégorie.'
  if (existe) return 'Cette catégorie existe déjà : ajoute les équipes depuis la liste des équipes.'
  if (!mode) return 'Choisis comment les joueurs sont organisés pour pouvoir créer la catégorie.'
  if (nbEquipes < 1) return 'Ajoute au moins une équipe.'
  if (places != null && nbEquipes > places) return `Ton forfait permet ${places} équipe${places > 1 ? 's' : ''} de plus : retire-en ${nbEquipes - places}.`
  return null
}
