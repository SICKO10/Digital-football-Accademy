import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODELES, planModele, planVide } from '../src/lib/modelesDepart.js'
import { OUTILS } from '../src/lib/catalogueOutils.js'

const clubIds = OUTILS.filter(o => o.role === 'club').map(o => o.id)
// Même liste que OUTILS_EDUCATEUR (Mon club) : Analyse vidéo n'y est pas réglable.
const educIds = OUTILS.filter(o => o.role === 'educateur' && o.menus.length > 0 && o.id !== 'evaluations_video').map(o => o.id)
const modele = (id) => MODELES.find(m => m.id === id)
const tout = { clubIds, educIds, clubAffiche: () => true, educAffiche: () => true }

test('les modèles ne citent que des outils du catalogue', () => {
  for (const m of MODELES) {
    for (const id of m.club) assert.ok(clubIds.includes(id), `${m.nom} : outil club inconnu ${id}`)
    for (const id of m.educateurs) assert.ok(educIds.includes(id), `${m.nom} : outil éducateur inconnu ${id}`)
  }
})

test('Club compétition et Tout afficher sur un club sans réglage : rien ne change', () => {
  assert.ok(planVide(planModele(modele('competition'), tout)))
  assert.ok(planVide(planModele(modele('tout'), tout)))
})

test('Minimal retire 5 outils club et 6 outils éducateur, garde le reste', () => {
  const p = planModele(modele('minimal'), tout)
  assert.equal(p.club.retires.length, 5)
  assert.ok(!p.club.retires.includes('vie_club'))
  assert.equal(p.educateurs.retires.length, 6)
  assert.ok(!p.educateurs.retires.includes('seances') && !p.educateurs.retires.includes('suivi_joueurs'))
  assert.equal(p.club.affiches.length + p.educateurs.affiches.length, 0)
})

test('École de foot retire Compétition et Finances du club, Préparation physique, projets et Stages des éducateurs', () => {
  const p = planModele(modele('ecole'), tout)
  assert.deepEqual(p.club.retires.sort(), ['competition', 'finances'])
  assert.deepEqual(p.educateurs.retires.sort(), ['cff4', 'prep_physique', 'projet_sportif', 'stages'])
})

test('Tout afficher réaffiche ce qui était retiré, et seulement cela', () => {
  const p = planModele(modele('tout'), { ...tout, clubAffiche: id => id !== 'finances', educAffiche: id => id !== 'tactique' })
  assert.deepEqual(p.club, { retires: [], affiches: ['finances'] })
  assert.deepEqual(p.educateurs, { retires: [], affiches: ['tactique'] })
})

test('un modèle appliqué deux fois ne change plus rien', () => {
  const m = modele('minimal')
  const apres = { ...tout, clubAffiche: id => m.club.includes(id), educAffiche: id => m.educateurs.includes(id) }
  assert.ok(planVide(planModele(m, apres)))
})
