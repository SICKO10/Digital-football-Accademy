import { test } from 'node:test'
import assert from 'node:assert/strict'
import { principesDeLaPhase, numerosParZone, basculerSelection, selectionDerivee } from '../src/lib/planDeJeu.js'

const zones = [{ id: 'z1' }, { id: 'z2' }]
const principes = [
  { id: 'p3', phase: 'a', ordre: 2, zone_id: 'z1', created_at: '2026-01-03' },
  { id: 'p1', phase: 'a', ordre: 0, zone_id: 'z1', created_at: '2026-01-01' },
  { id: 'p2', phase: 'a', ordre: 1, zone_id: null, created_at: '2026-01-02' },
  { id: 'p4', phase: 'b', ordre: 0, zone_id: 'z2', created_at: '2026-01-04' },
]

test('les principes d\'une phase sont classés par ordre, puis par date', () => {
  assert.deepEqual(principesDeLaPhase(principes, 'a').map(p => p.id), ['p1', 'p2', 'p3'])
  assert.deepEqual(principesDeLaPhase(principes, 'b').map(p => p.id), ['p4'])
  assert.deepEqual(principesDeLaPhase(null, 'a'), [])
  // même ordre : la date départage
  const doublons = [{ id: 'x', phase: 'a', ordre: 1, created_at: '2026-02-02' }, { id: 'y', phase: 'a', ordre: 1, created_at: '2026-02-01' }]
  assert.deepEqual(principesDeLaPhase(doublons, 'a').map(p => p.id), ['y', 'x'])
})

test('chaque zone reçoit les numéros de ses principes', () => {
  const liste = principesDeLaPhase(principes, 'a')
  assert.deepEqual(numerosParZone(liste, zones), { z1: [1, 3] })
})

test('un principe relié à une zone absente de la phase n\'a pas de pastille', () => {
  const liste = principesDeLaPhase(principes, 'a')
  assert.deepEqual(numerosParZone(liste, [{ id: 'z2' }]), {})
  assert.deepEqual(numerosParZone([], zones), {})
})

test('toucher deux fois le même élément annule la sélection', () => {
  const s = basculerSelection(null, 'zone', 'z1')
  assert.deepEqual(s, { type: 'zone', id: 'z1' })
  assert.equal(basculerSelection(s, 'zone', 'z1'), null)
  assert.deepEqual(basculerSelection(s, 'principe', 'p1'), { type: 'principe', id: 'p1' })
  assert.deepEqual(basculerSelection(s, 'zone', 'z2'), { type: 'zone', id: 'z2' })
})

test('toucher une zone allume ses principes ; toucher un principe allume sa zone', () => {
  const liste = principesDeLaPhase(principes, 'a')
  const parZone = selectionDerivee({ type: 'zone', id: 'z1' }, liste)
  assert.equal(parZone.zoneActiveId, 'z1')
  assert.deepEqual([...parZone.principesActifs].sort(), ['p1', 'p3'])

  const parPrincipe = selectionDerivee({ type: 'principe', id: 'p3' }, liste)
  assert.equal(parPrincipe.zoneActiveId, 'z1')
  assert.deepEqual([...parPrincipe.principesActifs], ['p3'])
})

test('un principe sans zone n\'allume aucune zone, une sélection périmée ne casse rien', () => {
  const liste = principesDeLaPhase(principes, 'a')
  const sansZone = selectionDerivee({ type: 'principe', id: 'p2' }, liste)
  assert.equal(sansZone.zoneActiveId, null)
  assert.deepEqual([...sansZone.principesActifs], ['p2'])

  const perimee = selectionDerivee({ type: 'principe', id: 'disparu' }, liste)
  assert.equal(perimee.zoneActiveId, null)
  assert.equal(perimee.principesActifs.size, 0)
  assert.equal(selectionDerivee(null, liste).zoneActiveId, null)
})

import { posteVersLignes, principeConcerne } from '../src/constants/lignesJeu.js'

test('posteVersLignes : postes courants', () => {
  assert.deepEqual(posteVersLignes('gardien'), ['gardien'])
  assert.deepEqual(posteVersLignes('Défenseur central'), ['defense'])
  assert.deepEqual(posteVersLignes('Latéral droit'), ['defense'])
  assert.deepEqual(posteVersLignes('MILIEU'), ['milieu'])
  assert.deepEqual(posteVersLignes('Milieu défensif'), ['milieu'])
  assert.deepEqual(posteVersLignes('Avant-centre'), ['attaque'])
  assert.deepEqual(posteVersLignes('Ailier'), ['attaque'])
  assert.deepEqual(posteVersLignes('Piston'), ['defense', 'milieu'])
  assert.deepEqual(posteVersLignes('Milieu offensif / Ailier'), ['milieu', 'attaque'])
  assert.deepEqual(posteVersLignes(''), [])
  assert.deepEqual(posteVersLignes(null), [])
  assert.deepEqual(posteVersLignes('COACH'), [])
})

test('principeConcerne : vide = tout le monde', () => {
  assert.equal(principeConcerne({ lignes: [] }, ['defense']), true)
  assert.equal(principeConcerne({}, []), true)
  assert.equal(principeConcerne({ lignes: ['milieu', 'attaque'] }, ['attaque']), true)
  assert.equal(principeConcerne({ lignes: ['defense'] }, ['attaque']), false)
  assert.equal(principeConcerne({ lignes: ['defense'] }, []), false)
})
