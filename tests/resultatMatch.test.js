// Tests de src/lib/resultatMatch.js : résultat V/N/D avec tirs au but.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resultatMatch, scoreAffiche, estCoupe } from '../src/lib/resultatMatch.js'

test('victoire, défaite, nul au temps réglementaire', () => {
  assert.equal(resultatMatch({ score_nous: 2, score_eux: 1 }), 'V')
  assert.equal(resultatMatch({ score_nous: '0', score_eux: '3' }), 'D')
  assert.equal(resultatMatch({ score_nous: 1, score_eux: 1 }), 'N')
})

test('nul départagé aux tirs au but', () => {
  assert.equal(resultatMatch({ score_nous: 1, score_eux: 1, tab_nous: 4, tab_eux: 2 }), 'V')
  assert.equal(resultatMatch({ score_nous: 0, score_eux: 0, tab_nous: 3, tab_eux: 5 }), 'D')
})

test('tirs au but ignorés si le score n\'est pas nul ou s\'ils sont incomplets', () => {
  assert.equal(resultatMatch({ score_nous: 2, score_eux: 1, tab_nous: 1, tab_eux: 5 }), 'V')
  assert.equal(resultatMatch({ score_nous: 1, score_eux: 1, tab_nous: 4, tab_eux: null }), 'N')
})

test('match non joué', () => {
  assert.equal(resultatMatch({ score_nous: null, score_eux: null }), null)
  assert.equal(resultatMatch({ score_nous: '', score_eux: '' }), null)
})

test('affichage avec t.a.b. et détection de la coupe', () => {
  assert.equal(scoreAffiche({ score_nous: 1, score_eux: 1, tab_nous: 4, tab_eux: 2 }), '1-1 (4-2 t.a.b.)')
  assert.equal(scoreAffiche({ score_nous: 1, score_eux: 1 }), '1-1')
  assert.equal(scoreAffiche({ score_nous: 1, score_eux: 1 }, ' - '), '1 - 1')
  assert.equal(estCoupe('Coupe de France'), true)
  assert.equal(estCoupe('Championnat'), false)
})
