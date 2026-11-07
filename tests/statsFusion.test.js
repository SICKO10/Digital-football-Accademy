import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fusionnerMatchs } from '../src/lib/statsFusion.js'

test('un match saisi par les deux compte une seule fois, la version éducateur fait foi', () => {
  const off = [{ id: 'm1', date: '2026-10-10', buts: 1, minutes: 90 }]
  const man = [{ id: 'a', date: '2026-10-10', buts: 2, minutes: 80 }, { id: 'b', date: '2026-10-17', buts: 1, minutes: 45 }]
  const r = fusionnerMatchs(man, off)
  assert.equal(r.length, 2)
  assert.equal(r.find(x => x.date === '2026-10-10').origine, 'educateur')
  assert.equal(r.find(x => x.date === '2026-10-10').buts, 1)
  assert.equal(r[0].date, '2026-10-17')
})

test('sans match de l\'éducateur, les saisies du joueur restent', () => {
  assert.equal(fusionnerMatchs([{ id: 'a', date: '2026-10-10' }], []).length, 1)
})

test('un match remonté avec le même match_id n\'est pas doublé', () => {
  const r = fusionnerMatchs([{ id: 'x', date: '2026-10-11', match_id: 'm1' }], [{ id: 'm1', date: '2026-10-10' }])
  assert.equal(r.length, 1)
})

import { choisirEquipePrincipale } from '../src/lib/statsFusion.js'

test('l\'équipe principale est celle qui a le plus de séances enregistrées', () => {
  const r = choisirEquipePrincipale([
    { affiliation: { id: 'a' }, stats: { total: 1, matchsJoues: 0 } },
    { affiliation: { id: 'b' }, stats: { total: 40, matchsJoues: 14 } },
    { affiliation: { id: 'c' }, stats: null },
  ])
  assert.equal(r.affiliation.id, 'b')
  assert.equal(choisirEquipePrincipale([]), null)
})
