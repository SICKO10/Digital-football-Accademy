import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phraseJournal, planRetablir, planRetablirServeur, etatRetablir } from '../src/lib/journalMonClub.js'

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

const ligne = (extra) => ({ id: 'j9', outil: null, educateur_ids: [], tous: false, etat_avant: null, retablit_id: null, ...extra })

test('phrases : outils fournis et places', () => {
  assert.equal(phraseJournal(ligne({ action: 'fourni', outil: 'seances', tous: true, educateur_ids: ['a', 'b'] }), noms), 'Outil Séances : fourni à tous les éducateurs.')
  assert.equal(phraseJournal(ligne({ action: 'plus_fourni', outil: 'seances', educateur_ids: ['a'] }), noms), 'Outil Séances : n\'est plus fourni à Paul Martin.')
  assert.equal(phraseJournal(ligne({ action: 'place_donnee', educateur_ids: ['b'] }), noms), 'Place donnée à Léa Roy.')
  assert.equal(phraseJournal(ligne({ action: 'place_retiree', educateur_ids: ['a'] }), noms), 'Place retirée à Paul Martin.')
  assert.equal(phraseJournal(ligne({ action: 'place_auto', educateur_ids: ['a'] }), noms), 'Place de Paul Martin remise en automatique.')
  assert.equal(phraseJournal(ligne({ action: 'place_retiree', educateur_ids: ['x'] }), noms), 'Place retirée à un éducateur.')
})

test('rétablir un outil fourni ou plus fourni : l\'action serveur dans le sens opposé', () => {
  assert.deepEqual(planRetablirServeur(ligne({ action: 'fourni', outil: 'seances', tous: true, educateur_ids: ['a'] }), [A, B]).appels,
    [{ action: 'ouvrir_club', params: { outil: 'seances', ouvert: false } }])
  assert.deepEqual(planRetablirServeur(ligne({ action: 'plus_fourni', outil: 'seances', educateur_ids: ['a', 'b'] }), [A, B]).appels,
    [{ action: 'fournir_educateur', params: { outil: 'seances', educateur: 'a', ouvert: true } }, { action: 'fournir_educateur', params: { outil: 'seances', educateur: 'b', ouvert: true } }])
  // un éducateur parti du club est ignoré, les autres sont rétablis
  assert.equal(planRetablirServeur(ligne({ action: 'plus_fourni', outil: 'seances', educateur_ids: ['a', 'z'] }), [A]).appels.length, 1)
})

test('rétablir une place : on remet l\'état d\'avant, refus si l\'éducateur est parti ou l\'état inconnu', () => {
  assert.deepEqual(planRetablirServeur(ligne({ action: 'place_retiree', educateur_ids: ['a'], etat_avant: 'choisi' }), [A]).appels,
    [{ action: 'choisir_place', params: { educateur: 'a', etat: 'choisi' } }])
  assert.deepEqual(planRetablirServeur(ligne({ action: 'place_donnee', educateur_ids: ['a'], etat_avant: 'auto' }), [A]).appels,
    [{ action: 'choisir_place', params: { educateur: 'a', etat: 'auto' } }])
  assert.match(planRetablirServeur(ligne({ action: 'place_donnee', educateur_ids: ['z'], etat_avant: 'auto' }), [A]).erreur, /plus affiliés/)
  assert.match(planRetablirServeur(ligne({ action: 'place_donnee', educateur_ids: ['a'] }), [A]).erreur, /état d'avant/)
})

test('état du bouton : une place rétablie n\'est plus proposée', () => {
  const origine = ligne({ id: 'p1', action: 'place_retiree', educateur_ids: ['a'], etat_avant: 'auto' })
  const retour = ligne({ id: 'p2', action: 'place_auto', educateur_ids: ['a'], retablit_id: 'p1' })
  assert.equal(etatRetablir(origine, [retour, origine]), 'retablie')
  assert.equal(etatRetablir(retour, [retour, origine]), 'retablissement')
})
