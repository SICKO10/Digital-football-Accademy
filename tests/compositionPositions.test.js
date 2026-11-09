import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sansPositions } from '../src/lib/compositionPositions.js'

test('retire les positions glissées à la main et garde le reste du joueur', () => {
  const r = sansPositions([{ joueur_id: 'a', numero: 4, pos: { x: 10, y: 20 } }, null, { joueur_id: 'b' }])
  assert.deepEqual(r, [{ joueur_id: 'a', numero: 4 }, null, { joueur_id: 'b' }])
})

test('tolère une liste absente', () => {
  assert.deepEqual(sansPositions(undefined), [])
})
