// Tests de src/lib/finSaisonJoueur.js (états du joueur et messages, données fictives en mémoire).
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatSaisonJoueur, derniereAffiliationArchivee, messageFinSaison, estReconduction, NOTIF_RECONDUCTION } from '../src/lib/finSaisonJoueur.js'

const a = (statut, extra = {}) => ({ statut, educateur_id: 'c1', ...extra })

test('état : en cours, terminée, aucune', () => {
  assert.equal(etatSaisonJoueur([a('accepte')]), 'en_cours')
  assert.equal(etatSaisonJoueur([a('archive'), a('accepte', { educateur_id: 'c2' })]), 'en_cours')
  assert.equal(etatSaisonJoueur([a('archive')]), 'terminee')
  assert.equal(etatSaisonJoueur([a('archive'), a('en_attente', { educateur_id: 'c2' })]), 'terminee')
  assert.equal(etatSaisonJoueur([a('en_attente'), a('refuse')]), 'aucune')
  assert.equal(etatSaisonJoueur([]), 'aucune')
  assert.equal(etatSaisonJoueur(undefined), 'aucune')
})

test('dernière affiliation archivée : la plus récente', () => {
  const liste = [
    a('archive', { id: 1, date_fin: '2027-06-10', saison: '2026-2027' }),
    a('archive', { id: 2, date_fin: '2028-06-12', saison: '2027-2028' }),
    a('accepte', { id: 3 }),
  ]
  assert.equal(derniereAffiliationArchivee(liste).id, 2)
  assert.equal(derniereAffiliationArchivee([a('accepte')]), null)
})

test('message exact de fin de saison', () => {
  assert.equal(
    messageFinSaison({ coach: 'Marc Dupont', saison: '2026-2027' }),
    "Tu as terminé ta saison avec Marc Dupont. Dans l'attente de ton nouvel éducateur, tu peux renouveler ta licence avant le 15 juillet et retrouver ta saison 2026 - 2027 dans « Mes saisons ».")
  assert.match(messageFinSaison({}), /avec ton éducateur\..*ta saison dans/)
})

test('reconduction : seulement avec un autre coach et une affiliation archivée', () => {
  assert.equal(estReconduction([a('archive')], 'c2'), true)
  assert.equal(estReconduction([a('archive')], 'c1'), false)
  assert.equal(estReconduction([a('en_attente')], 'c2'), false)
  assert.equal(estReconduction([], 'c2'), false)
  assert.match(NOTIF_RECONDUCTION.texte('Marc Dupont'), /^Marc Dupont t'a ajouté/)
})
