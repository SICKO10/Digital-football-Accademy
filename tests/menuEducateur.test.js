import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apercuMenuEducateur } from '../src/lib/menuEducateur.js'

const entrees = (sections) => Object.fromEntries(sections.flatMap(s => s.items).map(i => [i.key, i]))

test('sans réglage, rien n\'est retiré', () => {
  const e = entrees(apercuMenuEducateur('commun', []))
  assert.ok(Object.values(e).every(i => i.visible && !i.retire))
})

test('réglage commun : Tacticboard retiré, signalé', () => {
  const e = entrees(apercuMenuEducateur('commun', [{ cible: 'educateurs', outil: 'tactique', visible: false }]))
  assert.equal(e.tactipad.visible, false)
  assert.equal(e.tactipad.retire, true)
  assert.equal(e.bibliotheque.visible, true)
})

test('mode individualisé : la ligne de l\'éducateur passe avant le commun, pas celle d\'un autre', () => {
  const lignes = [
    { cible: 'educateurs', outil: 'tactique', visible: false },
    { cible: 'educateur', educateur_id: 'a', outil: 'tactique', visible: true },
  ]
  assert.equal(entrees(apercuMenuEducateur('individualise', lignes, 'a')).tactipad.visible, true)
  assert.equal(entrees(apercuMenuEducateur('individualise', lignes, 'b')).tactipad.visible, false)
  assert.equal(entrees(apercuMenuEducateur('commun', lignes, 'a')).tactipad.visible, false)
})

test('Suivi des joueurs retiré : Mon équipe reste (Statistiques jamais masqué)', () => {
  const e = entrees(apercuMenuEducateur('commun', [{ cible: 'educateurs', outil: 'suivi_joueurs', visible: false }]))
  assert.equal(e.equipe.visible, true)
})
