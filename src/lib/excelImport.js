// Utilitaires partagés pour les imports Excel/CSV (SheetJS) : normalisation
// des heures saisies dans des formats variés, et mapping flexible des noms
// de colonnes (insensible à la casse et aux accents) — utilisé par tous les
// outils d'import de planning (répartition mini-bus, planning des terrains...).

export const normaliserHeure = (val) => {
  if (!val) return ''
  const s = String(val).trim().replace(/[h.]/i, ':')
  const m = s.match(/^(\d{1,2}):?(\d{2})?$/)
  if (!m) return ''
  const h = m[1].padStart(2, '0')
  const min = (m[2] || '00').padStart(2, '0')
  return `${h}:${min}`
}

export const normaliserCle = (k) => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')

// Trouve, dans les clés d'un objet ligne Excel, celle qui correspond à l'un
// des alias donnés (comparaison sur la clé normalisée), et renvoie sa valeur
// (chaîne vide si aucune colonne ne correspond).
export const trouverValeur = (obj, alias) => {
  const cle = Object.keys(obj).find(k => alias.some(a => normaliserCle(k).includes(a)))
  return cle != null ? String(obj[cle] ?? '').trim() : ''
}
