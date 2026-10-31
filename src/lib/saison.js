// Saison française de football (juillet → juin) : en juillet/août on est déjà
// sur la saison qui commence, sinon sur celle en cours depuis l'automne précédent.
export const saisonActuelle = (d = new Date()) => {
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

// Bornes usuelles d'une saison (1er août → 31 mai), à partir de son libellé
// 'YYYY-YYYY' — sert de valeur par défaut dans les formulaires de création.
export const bornesSaison = (saison = saisonActuelle()) => {
  const [debut, fin] = saison.split('-').map(Number)
  return { date_debut: `${debut}-08-01`, date_fin: `${fin}-05-31` }
}

export const dateFr = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts)

// ── Calculs sur une saison quelconque (fonctions pures, testées dans
// tests/saison.test.js). Une saison va du 1er juillet au 30 juin ; les dates
// sont comparées en texte 'YYYY-MM-DD' pour éviter tout décalage de fuseau.

export const libelleSaison = (saison) => saison.replace('-', ' - ')

// Bornes exactes de filtrage : 1er juillet → 30 juin (inclus).
export const bornesDatesSaison = (saison) => {
  const [debut, fin] = saison.split('-').map(Number)
  return { debut: `${debut}-07-01`, fin: `${fin}-06-30` }
}

// Saison d'une date ISO ('2027-06-30' → '2026-2027', '2027-07-01' → '2027-2028').
export const saisonDeDate = (iso) => {
  if (!iso) return null
  const [y, m] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m) return null
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export const dansSaison = (iso, saison) => {
  if (!iso) return false
  const { debut, fin } = bornesDatesSaison(saison)
  const jour = iso.slice(0, 10)
  return jour >= debut && jour <= fin
}

// Garde les éléments datés dans la saison ; `getDate` extrait la date de chaque élément.
export const filtrerParSaison = (items, saison, getDate = (x) => x.date) =>
  (items || []).filter(x => dansSaison(getDate(x), saison))

// Saisons à proposer dans le sélecteur : celles qui contiennent au moins une
// date, plus toujours la saison en cours. Récentes d'abord.
export const saisonsAvecDonnees = (dates, enCours = saisonActuelle()) => {
  const set = new Set([enCours])
  ;(dates || []).forEach(d => { const s = saisonDeDate(d); if (s) set.add(s) })
  return [...set].sort().reverse().map(valeur => ({
    valeur,
    libelle: libelleSaison(valeur),
    enCours: valeur === enCours,
  }))
}

// Une saison est « passée » (donc archivable) si elle n'est pas la saison en cours.
export const aSaisonsPassees = (saisons) => (saisons || []).some(s => !s.enCours)

// Première saison réellement archivable : la plateforme a été créée en juin 2026.
export const MESSAGE_AUCUNE_SAISON_ARCHIVEE = 'Ta première saison archivée apparaîtra en juillet 2027.'
