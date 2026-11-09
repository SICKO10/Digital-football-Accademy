// Tests de src/lib/disciplineCartons.js : cumul de cartons jaunes sur 3 mois.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatCartons, ajouterMois } from '../src/lib/disciplineCartons.js'

test('ajouterMois : fin de mois', () => {
  assert.equal(ajouterMois('2026-09-06', 3), '2026-12-06')
  assert.equal(ajouterMois('2026-11-30', 3), '2027-02-28')
})

test('exemple : 6 sept et 18 oct = menace, puis fin de menace après le 6 décembre', () => {
  const d = ['2026-09-06', '2026-10-18']
  assert.equal(etatCartons(d, '2026-10-20').etat, 'menace')
  assert.equal(etatCartons(d, '2026-12-06').etat, 'menace')
  assert.equal(etatCartons(d, '2026-12-06').echeance, '2026-12-06')
  const fin = etatCartons(d, '2026-12-07')
  assert.equal(fin.etat, 'fin_menace')
  assert.equal(fin.finLe, '2026-12-07')
  assert.equal(etatCartons(d, '2026-12-20').etat, 'fin_menace')
  assert.equal(etatCartons(d, '2026-12-22').etat, 'aucun')
})

test('un seul carton : aucune alerte', () => {
  assert.equal(etatCartons(['2026-10-01'], '2026-10-10').etat, 'aucun')
})

test('trois avertissements dans les 3 mois : suspension potentielle, jamais "suspendu"', () => {
  const r = etatCartons(['2026-09-06', '2026-10-18', '2026-11-08'], '2026-11-09')
  assert.equal(r.etat, 'trois')
  assert.equal(r.actifs, 3)
})

test('trois cartons étalés sur plus de 3 mois : pas de suspension potentielle', () => {
  const r = etatCartons(['2026-08-30', '2026-10-18', '2026-12-05'], '2026-12-10')
  assert.equal(r.etat, 'menace')
})

test('les cartons de la saison précédente ne comptent pas', () => {
  const r = etatCartons(['2026-06-10', '2026-06-20'], '2026-07-02')
  assert.equal(r.etat, 'aucun')
})

test('un carton à une date future ou sans date est ignoré', () => {
  assert.equal(etatCartons(['2026-12-01', null, '2026-10-01'], '2026-10-10').etat, 'aucun')
  assert.equal(etatCartons([], '2026-10-10').etat, 'aucun')
})
