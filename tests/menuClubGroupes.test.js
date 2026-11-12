import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GROUPES_CLUB, groupeDeLOnglet, sousOngletsAccessibles, cibleDuGroupe, entreeDeLOnglet, etapeMonClubDeLOnglet,
  etapesMonClubVisibles, monClubVisible,
} from '../src/lib/menuClubGroupes.js'

const groupe = (id) => GROUPES_CLUB.find(g => g.id === id)
const seulement = (...ids) => (id) => ids.includes(id)

test('groupes : Finance, Organisation et Événements sportifs, sans identifiant en double', () => {
  assert.deepEqual(groupe('finance').sousOnglets, ['budget', 'sponsors'])
  assert.deepEqual(groupe('organisation').sousOnglets, ['deplacements', 'seances', 'terrains', 'inventaire'])
  assert.deepEqual(groupe('evenements_sportifs').sousOnglets, ['stages', 'tournoi'])
  const tous = GROUPES_CLUB.flatMap(g => g.sousOnglets)
  assert.equal(new Set(tous).size, tous.length)
})

test('un ancien identifiant d\'écran retrouve son groupe parent', () => {
  assert.equal(groupeDeLOnglet('terrains').id, 'organisation')
  assert.equal(groupeDeLOnglet('sponsors').id, 'finance')
  assert.equal(groupeDeLOnglet('tournoi').id, 'evenements_sportifs')
  assert.equal(groupeDeLOnglet('planning'), null)
  assert.equal(entreeDeLOnglet('budget'), 'finance')
  assert.equal(entreeDeLOnglet('planning'), 'planning')
})

test('l\'entrée apparaît dès qu\'un sous-onglet est accessible et s\'ouvre sur le premier', () => {
  const org = groupe('organisation')
  assert.equal(cibleDuGroupe(org, seulement('terrains', 'inventaire')), 'terrains')
  assert.equal(cibleDuGroupe(org, seulement('inventaire')), 'inventaire')
  assert.deepEqual(sousOngletsAccessibles(org, seulement('inventaire', 'deplacements')), ['deplacements', 'inventaire'])
})

test('aucun sous-onglet accessible : pas d\'entrée (trésorier sans Organisation)', () => {
  const accesTresorier = seulement('budget', 'sponsors')
  assert.equal(cibleDuGroupe(groupe('finance'), accesTresorier), 'budget')
  assert.equal(cibleDuGroupe(groupe('organisation'), accesTresorier), null)
  assert.equal(cibleDuGroupe(groupe('evenements_sportifs'), accesTresorier), null)
})

test('Staff et Organigramme ouvrent Mon club sur leur étape', () => {
  assert.equal(entreeDeLOnglet('staff'), 'mon_club')
  assert.equal(entreeDeLOnglet('organigramme'), 'mon_club')
  assert.equal(etapeMonClubDeLOnglet('staff'), 'staff')
  assert.equal(etapeMonClubDeLOnglet('budget'), null)
})

test('Mon club : le président voit les sept étapes dans l\'ordre prévu', () => {
  const ids = etapesMonClubVisibles({ peutReglages: true, estPresident: true, peutStaff: true, peutOrganigramme: true })
  assert.deepEqual(ids, ['identite', 'staff', 'organigramme', 'bureau', 'outils', 'educateurs', 'journal'])
})

test('Mon club : un rôle avec le droit Mon club mais pas président n\'a pas l\'Accès du bureau', () => {
  const ids = etapesMonClubVisibles({ peutReglages: true, estPresident: false, peutStaff: true, peutOrganigramme: false })
  assert.deepEqual(ids, ['identite', 'staff', 'outils', 'educateurs', 'journal'])
})

test('Mon club : Staff et Organigramme sans le droit Mon club donnent ces deux étapes seulement', () => {
  const droits = { peutReglages: false, estPresident: false, peutStaff: true, peutOrganigramme: true }
  assert.deepEqual(etapesMonClubVisibles(droits), ['staff', 'organigramme'])
  assert.equal(monClubVisible(droits), true)
})

test('Mon club : aucun droit, pas d\'entrée', () => {
  assert.equal(monClubVisible({ peutReglages: false, estPresident: false, peutStaff: false, peutOrganigramme: false }), false)
  assert.equal(monClubVisible({}), false)
})
