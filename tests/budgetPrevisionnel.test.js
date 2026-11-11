// Tests de src/lib/budgetPrevisionnel.js (données fictives, aucune base).
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { totalAnnuelLigne, totalType } from '../src/lib/budgetPrevisionnel.js'

test('éducateur 1 200 € par mois sur 10 mois = 12 000 € par an', () => {
  assert.equal(totalAnnuelLigne({ quantite: 1, prix_unitaire: 1200, periodicite: 'mois' }, 10), 12000)
})
test('le nombre de mois d’activité est pris en compte', () => {
  assert.equal(totalAnnuelLigne({ quantite: 1, prix_unitaire: 1200, periodicite: 'mois' }, 9), 10800)
})
test('ligne annuelle : un seul paiement', () => {
  assert.equal(totalAnnuelLigne({ quantite: 1, prix_unitaire: 500, periodicite: 'an' }, 10), 500)
})
test('par match : quantité = nombre de matchs', () => {
  assert.equal(totalAnnuelLigne({ quantite: 20, prix_unitaire: 60, periodicite: 'match' }, 10), 1200)
})
test('cotisations : quantité = nombre de joueurs', () => {
  assert.equal(totalAnnuelLigne({ quantite: 18, prix_unitaire: 120, periodicite: 'an' }, 10), 2160)
})
test('prix vide = 0, jamais de valeur inventée', () => {
  assert.equal(totalAnnuelLigne({ quantite: 5, prix_unitaire: null, periodicite: 'mois' }, 10), 0)
})
test('totaux par type', () => {
  const l = [
    { type: 'depense', quantite: 1, prix_unitaire: 1200, periodicite: 'mois' },
    { type: 'depense', quantite: 1, prix_unitaire: 300, periodicite: 'an' },
    { type: 'recette', quantite: 10, prix_unitaire: 100, periodicite: 'an' },
  ]
  assert.equal(totalType(l, 'depense', 10), 12300)
  assert.equal(totalType(l, 'recette', 10), 1000)
})

import { repartitionMensuelle, totauxParEquipe, depensesParCategorie, moisActifs } from '../src/lib/budgetPrevisionnel.js'

test('10 mois d’activité : septembre à juin', () => {
  assert.deepEqual(moisActifs(10), [9, 10, 11, 12, 1, 2, 3, 4, 5, 6])
})
test('ligne par mois : 1 200 € chaque mois d’activité, rien en juillet et août', () => {
  const r = repartitionMensuelle([{ type: 'depense', quantite: 1, prix_unitaire: 1200, periodicite: 'mois' }], 10)
  assert.equal(r[0].depenses, 1200)
  assert.equal(r[9].depenses, 1200)
  assert.equal(r[10].depenses, 0)
  assert.equal(r.reduce((s, m) => s + m.depenses, 0), 12000)
})
test('ligne annuelle : tombe dans le mois de paiement choisi', () => {
  const r = repartitionMensuelle([{ type: 'depense', quantite: 1, prix_unitaire: 500, periodicite: 'an', mois_paiement: 7 }], 10)
  assert.equal(r.find(m => m.num === 7).depenses, 500)
  assert.equal(r.reduce((s, m) => s + m.depenses, 0), 500)
})
test('ligne annuelle sans mois : étalée sur les mois d’activité, total inchangé', () => {
  const r = repartitionMensuelle([{ type: 'depense', quantite: 1, prix_unitaire: 500, periodicite: 'an', mois_paiement: null }], 10)
  assert.equal(Math.round(r.reduce((s, m) => s + m.depenses, 0)), 500)
  assert.equal(r[0].depenses, 50)
})
test('solde cumulé : recettes moins dépenses, mois après mois', () => {
  const r = repartitionMensuelle([
    { type: 'depense', quantite: 1, prix_unitaire: 100, periodicite: 'mois' },
    { type: 'recette', quantite: 1, prix_unitaire: 1000, periodicite: 'an', mois_paiement: 9 },
  ], 10)
  assert.equal(r[0].cumul, 900)
  assert.equal(r[1].cumul, 800)
  assert.equal(r[9].cumul, 0)
})
test('totaux par équipe et charges communes', () => {
  const t = totauxParEquipe([
    { equipe_id: 'u15', type: 'depense', quantite: 1, prix_unitaire: 1200, periodicite: 'mois' },
    { equipe_id: null, type: 'depense', quantite: 1, prix_unitaire: 500, periodicite: 'an' },
    { equipe_id: 'u15', type: 'recette', quantite: 18, prix_unitaire: 100, periodicite: 'an' },
  ], 10)
  assert.deepEqual(t.u15, { depenses: 12000, recettes: 1800 })
  assert.deepEqual(t.club, { depenses: 500, recettes: 0 })
})
test('répartition par catégorie triée, sans les lignes à 0', () => {
  const c = depensesParCategorie([
    { type: 'depense', categorie: 'A', quantite: 1, prix_unitaire: 100, periodicite: 'an' },
    { type: 'depense', categorie: 'B', quantite: 1, prix_unitaire: 300, periodicite: 'an' },
    { type: 'depense', categorie: 'C', quantite: 1, prix_unitaire: null, periodicite: 'an' },
  ], 10)
  assert.deepEqual(c, [['B', 300], ['A', 100]])
})

import { budgetVersCsv } from '../src/lib/budgetPrevisionnel.js'

test('export CSV : en-têtes, séparateur « ; », guillemets échappés, prix vide laissé vide', () => {
  const csv = budgetVersCsv([
    { type: 'recette', categorie: 'Cotisations', libelle: 'Cotisations', equipe_id: 'u15', quantite: 18, prix_unitaire: 100, periodicite: 'an', mois_paiement: 9 },
    { type: 'depense', categorie: 'Encadrement', libelle: 'Éducateur "A"; chargé', equipe_id: null, quantite: 1, prix_unitaire: null, periodicite: 'mois', mois_paiement: null },
  ], id => id ? 'U15' : 'Club', 10)
  const lignes = csv.replace('﻿', '').split('\r\n')
  assert.equal(lignes[0], 'Type;Catégorie;Libellé;Équipe;Quantité;Prix unitaire (€);Périodicité;Mois de paiement;Total annuel (€)')
  assert.equal(lignes[1], 'Dépense;Encadrement;"Éducateur ""A""; chargé";Club;1;;par mois;;0')
  assert.equal(lignes[2], 'Recette;Cotisations;Cotisations;U15;18;100;par an;septembre;1800')
})
