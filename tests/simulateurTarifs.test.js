// Simulateur de la page des tarifs (bloc 13) : mêmes totaux que le paiement.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulerOffre, MAX_EQUIPES } from '../src/lib/simulateurTarifs.js'
import { compositionPaiement, outilsAchetables, forfaitPourEquipes, PALIERS_EDUCATEUR } from '../src/lib/catalogueOutils.js'

const ids = (n) => outilsAchetables('educateur').slice(0, n).map(o => o.id)

test('éducateur : le total suit le palier du nombre d\'outils, comme le paiement', () => {
  for (const n of [1, 3, 4, 6, 7, 9]) {
    for (const periodicite of ['mensuel', 'annuel']) {
      const s = simulerOffre('educateur', { outils: ids(n), periodicite })
      assert.equal(s.total, compositionPaiement('educateur', { outils: ids(n), periodicite }).total, `${n} outils ${periodicite}`)
    }
  }
  assert.equal(simulerOffre('educateur', { outils: ids(1) }).total, PALIERS_EDUCATEUR[0].prixMensuel)
  assert.equal(simulerOffre('educateur', { outils: ids(5), periodicite: 'annuel' }).total, PALIERS_EDUCATEUR[1].prixAnnuel)
})

test('éducateur : aucun outil = socle gratuit, 7 outils ou plus = palier des 9', () => {
  const rien = simulerOffre('educateur', { outils: [] })
  assert.equal(rien.total, 0)
  assert.equal(rien.horsGamme, false)
  const sept = simulerOffre('educateur', { outils: ids(7) })
  assert.equal(sept.total, PALIERS_EDUCATEUR[2].prixMensuel)
  assert.match(sept.aide, /donne les 9 outils/)
})

test('éducateur : message d\'aide sur les outils sans supplément', () => {
  assert.match(simulerOffre('educateur', { outils: ids(2) }).aide, /ajouter 1 outil sans supplément/)
  assert.match(simulerOffre('educateur', { outils: ids(4) }).aide, /ajouter 2 outils sans supplément/)
  assert.equal(simulerOffre('educateur', { outils: ids(3) }).aide, '')
})

test('éducateur : économie annuelle = 12 mensualités moins l\'année', () => {
  const p = PALIERS_EDUCATEUR[0]
  assert.equal(simulerOffre('educateur', { outils: ids(2), periodicite: 'annuel' }).economie, p.prixMensuel * 12 - p.prixAnnuel)
  assert.equal(simulerOffre('educateur', { outils: ids(2), periodicite: 'mensuel' }).economie, 0)
})

test('club : forfait selon les équipes, comme le paiement, et hors grille au delà', () => {
  for (const nb of [1, 2, 3, 4, 7, 11, 15, MAX_EQUIPES]) {
    for (const periodicite of ['mensuel', 'annuel']) {
      const f = forfaitPourEquipes(nb)
      const s = simulerOffre('club', { nbEquipes: nb, periodicite })
      assert.equal(s.total, compositionPaiement('club', { palier: f.palier, periodicite }, nb).total, `${nb} équipes ${periodicite}`)
    }
  }
  const trop = simulerOffre('club', { nbEquipes: MAX_EQUIPES + 1 })
  assert.equal(trop.horsGamme, true)
  assert.equal(trop.total, null)
})

test('périodicité inconnue : retombe sur le mensuel', () => {
  assert.equal(simulerOffre('educateur', { outils: ids(1), periodicite: 'x' }).total, PALIERS_EDUCATEUR[0].prixMensuel)
})
