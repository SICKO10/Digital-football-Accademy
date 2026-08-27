export const CATEGORIES_MASCULIN = [
  'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14',
  'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Seniors'
]

export const CATEGORIES_FEMININ = CATEGORIES_MASCULIN.map(c => c + 'F')

export const CATEGORIES = [...CATEGORIES_MASCULIN, ...CATEGORIES_FEMININ]

export const labelCategorie = (cat) => {
  if (cat?.endsWith('F') && CATEGORIES_FEMININ.includes(cat)) return `${cat.slice(0, -1)} Féminin`
  return cat || 'Sans catégorie'
}
