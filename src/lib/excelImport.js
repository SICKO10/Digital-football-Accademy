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

export const normaliserCle = (k) => String(k ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')

// Trouve, dans les clés d'un objet ligne Excel, celle qui correspond à l'un
// des alias donnés (comparaison sur la clé normalisée), et renvoie sa valeur
// (chaîne vide si aucune colonne ne correspond).
export const trouverValeur = (obj, alias) => {
  const cle = Object.keys(obj).find(k => alias.some(a => normaliserCle(k).includes(a)))
  return cle != null ? String(obj[cle] ?? '').trim() : ''
}

const MOTS_CLES_ENTETES_DEFAUT = ['terrain', 'equipe', 'educateur', 'coach', 'jour', 'heure', 'debut', 'fin', 'categorie']

// Cherche, dans un tableau de lignes brutes (array de arrays — ex. sortie de
// XLSX.utils.sheet_to_json avec { header: 1 }), l'index de la ligne qui
// contient les vrais en-têtes de colonnes. Nécessaire quand le fichier a une
// ou plusieurs lignes de titre au-dessus des en-têtes (sinon sheet_to_json en
// mode objet prend la 1ère ligne du fichier comme en-têtes, quelle qu'elle
// soit). Cherche dans les 20 premières lignes celle qui a au moins 2 cellules
// reconnaissables parmi motsCles ; renvoie -1 si aucune ne correspond.
export const trouverLigneEnTetes = (rows, motsCles = MOTS_CLES_ENTETES_DEFAUT) => {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const nbMatches = (rows[i] || []).filter(cell => motsCles.some(mot => normaliserCle(cell).includes(mot))).length
    if (nbMatches >= 2) return i
  }
  return -1
}

// Convertit un tableau de lignes brutes (array-of-arrays) en tableau d'objets
// { enTete: valeur }, en localisant automatiquement la ligne d'en-têtes via
// trouverLigneEnTetes plutôt que de supposer que c'est la première ligne.
// Renvoie { lignes: [], headerRow: [] } si aucune ligne d'en-têtes trouvée.
export const lignesVersObjets = (rows, motsCles = MOTS_CLES_ENTETES_DEFAUT) => {
  const idx = trouverLigneEnTetes(rows, motsCles)
  if (idx === -1) return { lignes: [], headerRow: [] }
  const headerRow = rows[idx]
  const lignes = rows.slice(idx + 1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {}
      headerRow.forEach((h, i) => { if (h) obj[h] = row[i] ?? '' })
      return obj
    })
  return { lignes, headerRow }
}
