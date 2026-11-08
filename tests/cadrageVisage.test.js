import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cadrerSurVisage } from '../src/lib/cadrageVisage.js'

const zone = { x: 30, y: 70, l: 350, h: 330 }

test('sans visage détecté, aucun cadrage (la carte garde son cadrage par défaut)', () => {
  assert.equal(cadrerSurVisage(null), null)
})

test('le visage est amené au centre voulu', () => {
  const visage = { largeurImage: 1000, hauteurImage: 1200, cx: 500, cy: 400, l: 250, h: 250 }
  const c = cadrerSurVisage(visage, { cx: 214, cy: 206, largeur: 112 }, zone)
  const cxFinal = c.x + visage.cx * (c.largeur / visage.largeurImage)
  assert.ok(Math.abs(cxFinal - 214) < 1)
})

test('l\'image couvre toujours la zone, même si le visage est près d\'un bord', () => {
  const visage = { largeurImage: 800, hauteurImage: 800, cx: 120, cy: 100, l: 140, h: 140 }
  const c = cadrerSurVisage(visage, { cx: 214, cy: 206, largeur: 112 }, zone)
  assert.ok(c.x <= zone.x && c.x + c.largeur >= zone.x + zone.l)
  assert.ok(c.y <= zone.y && c.y + c.hauteur >= zone.y + zone.h)
})
