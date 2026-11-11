// Calculs du budget prévisionnel (fonctions pures, testées dans
// tests/budgetPrevisionnel.test.js). Aucun accès à la base.
//
// Total annuel d'une ligne = quantité x prix unitaire x facteur.
//   - 'mois'  : facteur = nombre de mois d'activité de la saison
//   - 'match' : la quantité est le nombre de matchs, facteur 1
//   - 'an' / 'saison' : un seul paiement, facteur 1
// Un prix vide (« à renseigner ») compte pour 0, jamais pour une valeur inventée.

export const PERIODICITES = [
  { val: 'mois', label: 'par mois' },
  { val: 'an', label: 'par an' },
  { val: 'match', label: 'par match' },
  { val: 'saison', label: 'par saison' },
]

// Mois de la saison dans l'ordre (septembre à août), numéros de mois civils.
export const MOIS_SAISON = [
  { num: 9, nom: 'septembre' }, { num: 10, nom: 'octobre' }, { num: 11, nom: 'novembre' },
  { num: 12, nom: 'décembre' }, { num: 1, nom: 'janvier' }, { num: 2, nom: 'février' },
  { num: 3, nom: 'mars' }, { num: 4, nom: 'avril' }, { num: 5, nom: 'mai' },
  { num: 6, nom: 'juin' }, { num: 7, nom: 'juillet' }, { num: 8, nom: 'août' },
]

const nombre = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export const totalAnnuelLigne = (ligne, nbMois = 10) => {
  if (ligne.prix_unitaire == null || ligne.prix_unitaire === '') return 0
  const facteur = ligne.periodicite === 'mois' ? nombre(nbMois) : 1
  return nombre(ligne.quantite) * nombre(ligne.prix_unitaire) * facteur
}

export const totalType = (lignes, type, nbMois = 10) =>
  lignes.filter(l => l.type === type).reduce((s, l) => s + totalAnnuelLigne(l, nbMois), 0)

export const eurosFr = (n) => `${Math.round(n * 100) / 100 === Math.round(n) ? Math.round(n).toLocaleString('fr-FR') : (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`

// ── Répartition par mois (septembre à août) ───────────────────────────────
// Les mois d'activité sont les nbMois premiers mois de la saison (septembre,
// octobre…). Règles :
//   'mois'  : le montant tombe chaque mois d'activité
//   'match' : le total est étalé également sur les mois d'activité
//   'an' / 'saison' : tombe dans mois_paiement ; sans mois choisi, étalé
//                     également sur les mois d'activité (hypothèse neutre)
export const moisActifs = (nbMois = 10) => MOIS_SAISON.slice(0, Math.min(12, Math.max(1, nombre(nbMois) || 10))).map(m => m.num)

export const montantsParMois = (ligne, nbMois = 10) => {
  const actifs = moisActifs(nbMois)
  const res = Object.fromEntries(MOIS_SAISON.map(m => [m.num, 0]))
  const total = totalAnnuelLigne(ligne, nbMois)
  if (!total) return res
  if (ligne.periodicite === 'mois') {
    actifs.forEach(n => { res[n] = nombre(ligne.quantite) * nombre(ligne.prix_unitaire) })
  } else if ((ligne.periodicite === 'an' || ligne.periodicite === 'saison') && ligne.mois_paiement) {
    res[ligne.mois_paiement] = total
  } else {
    actifs.forEach(n => { res[n] = total / actifs.length })
  }
  return res
}

export const repartitionMensuelle = (lignes, nbMois = 10) => {
  let cumul = 0
  return MOIS_SAISON.map(m => {
    let depenses = 0, recettes = 0
    for (const l of lignes) {
      const v = montantsParMois(l, nbMois)[m.num]
      if (l.type === 'depense') depenses += v; else recettes += v
    }
    cumul += recettes - depenses
    return { ...m, depenses, recettes, solde: recettes - depenses, cumul }
  })
}

// Totaux par équipe (equipe_id null = charges communes du club).
export const totauxParEquipe = (lignes, nbMois = 10) => {
  const res = {}
  for (const l of lignes) {
    const cle = l.equipe_id || 'club'
    res[cle] ||= { depenses: 0, recettes: 0 }
    res[cle][l.type === 'depense' ? 'depenses' : 'recettes'] += totalAnnuelLigne(l, nbMois)
  }
  return res
}

// Répartition des dépenses par catégorie, de la plus grosse à la plus petite.
export const depensesParCategorie = (lignes, nbMois = 10) => {
  const acc = {}
  for (const l of lignes) if (l.type === 'depense') acc[l.categorie] = (acc[l.categorie] || 0) + totalAnnuelLigne(l, nbMois)
  return Object.entries(acc).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
}

// ── Export CSV (séparateur « ; » et BOM pour qu'Excel français l'ouvre bien) ──
const cellule = (v) => {
  const t = String(v ?? '')
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export const budgetVersCsv = (lignes, nomEquipe, nbMois = 10) => {
  const entetes = ['Type', 'Catégorie', 'Libellé', 'Équipe', 'Quantité', 'Prix unitaire (€)', 'Périodicité', 'Mois de paiement', 'Total annuel (€)']
  const periodicite = Object.fromEntries(PERIODICITES.map(p => [p.val, p.label]))
  const mois = Object.fromEntries(MOIS_SAISON.map(m => [m.num, m.nom]))
  const ordre = [...lignes].sort((a, b) => (a.type === b.type ? 0 : a.type === 'depense' ? -1 : 1))
  const corps = ordre.map(l => [
    l.type === 'depense' ? 'Dépense' : 'Recette', l.categorie, l.libelle, nomEquipe(l.equipe_id), l.quantite,
    l.prix_unitaire == null ? '' : l.prix_unitaire, periodicite[l.periodicite] || l.periodicite, mois[l.mois_paiement] || '',
    totalAnnuelLigne(l, nbMois),
  ])
  return '﻿' + [entetes, ...corps].map(r => r.map(cellule).join(';')).join('\r\n')
}
