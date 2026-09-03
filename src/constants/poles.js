// Regroupement des catégories du club en 4 pôles — sert de filtre dans le
// Planning et de structure pour le Projet Sportif. Basé sur les codes réels de
// src/lib/categories.js (U7 à U20 + Seniors, variantes féminines en +F) : le
// pôle se calcule sur la tranche d'âge, indépendamment du genre.

export const POLES = {
  ecole_de_foot: {
    label: 'École de Foot',
    couleur: '#f59e0b',
    categories: ['U7', 'U8', 'U9', 'U10', 'U11'],
  },
  preformation: {
    label: 'Préformation',
    couleur: '#3b82f6',
    categories: ['U12', 'U13', 'U14'],
  },
  formation: {
    label: 'Formation',
    couleur: '#4ade80',
    categories: ['U15', 'U16', 'U17', 'U18'],
  },
  pole_senior: {
    label: 'Pôle Senior',
    couleur: '#a78bfa',
    categories: ['U19', 'U20', 'Seniors'],
  },
}

// Retrouve le pôle d'une catégorie (ex: 'U16F' → Formation, comme 'U16') —
// le genre n'a pas d'incidence sur le pôle, seule la tranche d'âge compte.
export const getPoleDeCategorie = (categorie) => {
  if (!categorie) return null
  const base = categorie.endsWith('F') ? categorie.slice(0, -1) : categorie
  for (const [key, pole] of Object.entries(POLES)) {
    if (pole.categories.includes(base)) return { key, ...pole }
  }
  return null
}
