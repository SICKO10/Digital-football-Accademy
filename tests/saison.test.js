// Tests de src/lib/saison.js (calculs de saison, données fictives en mémoire,
// aucun accès à la base). Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  saisonActuelle, libelleSaison, bornesDatesSaison, saisonDeDate,
  dansSaison, filtrerParSaison, saisonsAvecDonnees, aSaisonsPassees,
} from '../src/lib/saison.js'

test('bascule de saison le 1er juillet', () => {
  assert.equal(saisonActuelle(new Date(2027, 5, 30)), '2026-2027')
  assert.equal(saisonActuelle(new Date(2027, 6, 1)), '2027-2028')
  assert.equal(saisonActuelle(new Date(2026, 9, 31)), '2026-2027')
})

test('libellé et bornes', () => {
  assert.equal(libelleSaison('2026-2027'), '2026 - 2027')
  assert.deepEqual(bornesDatesSaison('2026-2027'), { debut: '2026-07-01', fin: '2027-06-30' })
})

test('saisonDeDate : 30 juin, 1er juillet, année bissextile', () => {
  assert.equal(saisonDeDate('2027-06-30'), '2026-2027')
  assert.equal(saisonDeDate('2027-07-01'), '2027-2028')
  assert.equal(saisonDeDate('2028-02-29'), '2027-2028')
  assert.equal(saisonDeDate('2027-06-30T23:59:59Z'), '2026-2027')
  assert.equal(saisonDeDate(null), null)
  assert.equal(saisonDeDate('pas une date'), null)
})

test('dansSaison : bornes incluses', () => {
  assert.equal(dansSaison('2026-07-01', '2026-2027'), true)
  assert.equal(dansSaison('2027-06-30', '2026-2027'), true)
  assert.equal(dansSaison('2026-06-30', '2026-2027'), false)
  assert.equal(dansSaison('2027-07-01', '2026-2027'), false)
  assert.equal(dansSaison(null, '2026-2027'), false)
})

test('filtrerParSaison sur une saison passée simulée', () => {
  const matchs = [
    { id: 1, date: '2026-06-30' },
    { id: 2, date: '2026-07-01' },
    { id: 3, date: '2027-02-28' },
    { id: 4, date: '2027-06-30' },
    { id: 5, date: '2027-07-01' },
    { id: 6, date: null },
  ]
  assert.deepEqual(filtrerParSaison(matchs, '2026-2027').map(m => m.id), [2, 3, 4])
  assert.deepEqual(filtrerParSaison(matchs, '2027-2028').map(m => m.id), [5])
  assert.deepEqual(filtrerParSaison(null, '2026-2027'), [])
  assert.deepEqual(filtrerParSaison([{ d: '2026-09-01' }], '2026-2027', x => x.d).length, 1)
})

test('saisonsAvecDonnees : saison en cours toujours là, récentes d\'abord', () => {
  const l = saisonsAvecDonnees([], '2026-2027')
  assert.deepEqual(l, [{ valeur: '2026-2027', libelle: '2026 - 2027', enCours: true }])
  assert.equal(aSaisonsPassees(l), false)

  const l2 = saisonsAvecDonnees(['2026-09-01', '2027-08-15', '2027-01-10', null], '2027-2028')
  assert.deepEqual(l2.map(s => s.valeur), ['2027-2028', '2026-2027'])
  assert.deepEqual(l2.map(s => s.enCours), [true, false])
  assert.equal(aSaisonsPassees(l2), true)
})
