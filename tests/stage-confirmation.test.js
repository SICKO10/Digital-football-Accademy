// Tests de api/stage-confirmation.js — sans réseau ni secret : seules la
// validation des entrées (rejet avant tout accès à la base) et la
// construction de l'e-mail (échappement HTML) sont testées.
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler, { construireEmail } from '../api/stage-confirmation.js'

function reponse() {
  const r = { statut: null, corps: null }
  r.status = (s) => { r.statut = s; return r }
  r.json = (c) => { r.corps = c; return r }
  return r
}

test('refuse tout sauf POST', async () => {
  const r = reponse()
  await handler({ method: 'GET', body: {} }, r)
  assert.equal(r.statut, 405)
})

test('refuse un destinataire ou un contenu fournis par le navigateur (seuls lien + référence sont lus)', async () => {
  for (const body of [
    {},
    { lien: 'abc', reference: 'ABCDEF12' },                                   // lien trop court
    { lien: 'e80bc2f7-ac8a-411e-bd69-a329986c8322', reference: 'abc' },     // référence invalide
    { lien: "x' or 1=1 --", reference: 'ABCDEF12' },                         // injection
    { lien: ['e80bc2f7ac8a411ebd69a329986c8322'], reference: 'ABCDEF12' },  // mauvais type
    { to: 'victime@example.com', html: '<b>spam</b>' },                       // tentative de relais
  ]) {
    const r = reponse()
    await handler({ method: 'POST', body }, r)
    assert.equal(r.statut, 400, JSON.stringify(body))
  }
})

test("l'e-mail échappe tout le texte saisi par la famille ou le club", () => {
  const { html, sujet } = construireEmail({
    stage: { nom: 'Stage <script>alert(1)</script>', lieu: 'Stade "A"', modes_paiement: ['virement'], instructions_paiement: '<img src=x onerror=alert(1)>' },
    club: { club: 'AS <b>Test</b>' },
    inscription: { prenom: '<i>Jim</i>', nom: 'Jo', reference: 'ABCDEF12', jours: ['2026-10-19', '2026-10-20'], montant_du: 72 },
    offre: { nom: 'À la journée' },
    formule: { nom: 'Réfectoire' },
    urlStage: 'https://digitalfootball.academy/stage/abc',
  })
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<i>Jim</i>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('72,00 €'))
  assert.ok(html.includes('ABCDEF12'))
  assert.ok(sujet.includes('Jim'))
})

test("pas de section paiement quand l'inscription est gratuite", () => {
  const { html } = construireEmail({
    stage: { nom: 'Stage', modes_paiement: ['especes'] }, club: null,
    inscription: { prenom: 'A', nom: 'B', reference: 'ABCDEF12', jours: ['2026-10-19'], montant_du: 0 },
    offre: null, formule: null, urlStage: 'https://digitalfootball.academy/stage/abc',
  })
  assert.ok(!html.includes('Paiement'))
})
