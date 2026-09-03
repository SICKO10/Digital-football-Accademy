// Regroupement des catégories du club en 4 pôles (masculin + féminin) — sert
// de filtre dans le Planning et de structure pour le Projet Sportif. Les
// tranches d'âge sont définies une seule fois (TIERS) puis déclinées en
// masculin/féminin ci-dessous, pour éviter que les deux listes divergent.
// Codes réels : src/lib/categories.js (U7 à U20 + Seniors, variantes
// féminines en +F).
const TIERS = {
  ecole_de_foot: { label: 'École de Foot', couleur: '#f59e0b', couleurFeminin: '#f59e0b', categories: ['U7', 'U8', 'U9', 'U10', 'U11'] },
  preformation: { label: 'Préformation', couleur: '#3b82f6', couleurFeminin: '#ec4899', categories: ['U12', 'U13', 'U14'] },
  formation: { label: 'Formation', couleur: '#4ade80', couleurFeminin: '#f472b6', categories: ['U15', 'U16', 'U17', 'U18'] },
  pole_senior: { label: 'Pôle Senior', couleur: '#a78bfa', couleurFeminin: '#c084fc', categories: ['U19', 'U20', 'Seniors'] },
}

export const POLES = {}
for (const [key, t] of Object.entries(TIERS)) {
  POLES[key] = { label: t.label, couleur: t.couleur, genre: 'masculin', categories: t.categories }
  POLES[`${key}_f`] = { label: t.label, couleur: t.couleurFeminin, genre: 'feminin', categories: t.categories.map(c => c + 'F') }
}

// Retrouve le pôle d'une catégorie (ex: 'U16F' → Formation féminin).
export const getPoleDeCategorie = (categorie) => {
  if (!categorie) return null
  for (const [key, pole] of Object.entries(POLES)) {
    if (pole.categories.includes(categorie)) return { key, ...pole }
  }
  return null
}

export const polesMasculins = () => Object.entries(POLES).filter(([, p]) => p.genre === 'masculin').map(([key, p]) => ({ key, ...p }))
export const polesFeminins = () => Object.entries(POLES).filter(([, p]) => p.genre === 'feminin').map(([key, p]) => ({ key, ...p }))
