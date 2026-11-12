import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phraseJournal, planRetablir, etatRetablir } from '../src/lib/journalMonClub.js'

const A = { id: 'a', nom: 'Paul Martin' }
const B = { id: 'b', nom: 'Léa Roy' }
const C = { id: 'c', nom: 'Sam Dupont' }
const noms = { a: A.nom, b: B.nom, c: C.nom }
const retire = (extra = {}) => ({ id: 'j1', action: 'retire', outil: 'seances', educateur_ids: ['a', 'b'], tous: false, retablit_id: null, ...extra })
const commun = (outil, visible) => ({ cible: 'educateurs', educateur_id: null, outil, visible })
const indiv = (id, outil, visible) => ({ cible: 'educateur', educateur_id: id, outil, visible })

test('phrase : tous les éducateurs, noms connus, noms inconnus', () => {
  assert.equal(phraseJournal(retire({ tous: true }), noms), 'Séances : retiré du menu de tous les éducateurs.')
  assert.equal(phraseJournal(retire({ action: 'reaffiche', educateur_ids: ['c'] }), noms), 'Séances : réaffiché dans le menu de Sam Dupont.')
  assert.equal(phraseJournal(retire(), noms), 'Séances : retiré du menu de Paul Martin et Léa Roy.')
  assert.equal(phraseJournal(retire({ educateur_ids: ['a', 'b', 'c'] }), noms), 'Séances : retiré du menu de Paul Martin, Léa Roy et Sam Dupont.')
  assert.equal(phraseJournal(retire(), { a: A.nom }), 'Séances : retiré du menu de 2 éducateurs.')
  assert.equal(phraseJournal(retire({ outil: 'inconnu', educateur_ids: ['a'] }), {}), 'inconnu : retiré du menu de 1 éducateur.')
})

test('rétablir en mode commun : un seul réglage commun, seulement si personne d\'autre n\'est touché', () => {
  const plan = planRetablir(retire({ tous: true, educateur_ids: ['a', 'b'] }), 'commun', [commun('seances', false)], [A, B])
  assert.deepEqual(plan.ecritures, [{ cible: 'educateurs', educateurId: null, valeur: undefined }])
  // un troisième éducateur affilié depuis, qui n'était pas concerné et voit déjà l'outil : rien d'autre n'est touché
  assert.ok(planRetablir(retire(), 'commun', [commun('seances', false)], [A, B]).ecritures)
  // un troisième éducateur qui ne le voit pas non plus (changement ancien) : refus clair
  const refus = planRetablir(retire({ educateur_ids: ['a'] }), 'commun', [commun('seances', false)], [A, B])
  assert.match(refus.erreur, /pas tous vos éducateurs/)
})

test('rétablir un réaffichage : on retire de nouveau', () => {
  const plan = planRetablir(retire({ action: 'reaffiche', tous: true }), 'commun', [], [A, B])
  assert.deepEqual(plan.ecritures, [{ cible: 'educateurs', educateurId: null, valeur: false }])
})

test('rétablir en mode individualisé : une ligne par éducateur concerné, sans toucher aux autres', () => {
  const lignes = [indiv('a', 'seances', false), indiv('b', 'seances', false), indiv('c', 'seances', false)]
  const plan = planRetablir(retire(), 'individualise', lignes, [A, B, C])
  assert.deepEqual(plan.ecritures, [
    { cible: 'educateur', educateurId: 'a', valeur: undefined },
    { cible: 'educateur', educateurId: 'b', valeur: undefined },
  ])
})

test('rétablir en mode individualisé : le réglage commun retiré garde une ligne explicite', () => {
  const plan = planRetablir(retire({ educateur_ids: ['a'] }), 'individualise', [commun('seances', false), indiv('a', 'seances', false)], [A, B])
  // commun = retiré : réafficher pour a demande une ligne « visible vrai »
  assert.deepEqual(plan.ecritures, [{ cible: 'educateur', educateurId: 'a', valeur: true }])
})

test('rétablir : déjà revenu, éducateurs partis', () => {
  assert.deepEqual(planRetablir(retire(), 'commun', [], [A, B]), { deja: true })
  assert.match(planRetablir(retire(), 'commun', [commun('seances', false)], [C]).erreur, /plus affiliés/)
})

test('état du bouton : possible, déjà rétablie, rétablissement', () => {
  const o = retire({ id: 'j1' })
  const r = retire({ id: 'j2', action: 'reaffiche', retablit_id: 'j1' })
  assert.equal(etatRetablir(o, [o]), 'possible')
  assert.equal(etatRetablir(o, [r, o]), 'retablie')
  assert.equal(etatRetablir(r, [r, o]), 'retablissement')
})
