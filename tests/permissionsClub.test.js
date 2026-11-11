import test from 'node:test'
import assert from 'node:assert/strict'
import { PERMISSION_DEFAULTS, peutEditerSection } from '../src/lib/permissionsClub.js'
import { PERMISSION_SECTIONS, ROLES_STAFF } from '../src/lib/rolesClub.js'

test('Mon club : section pilotable par la matrice', () => {
  assert.ok(PERMISSION_SECTIONS.some(s => s.id === 'mon_club' && s.label === 'Mon club'))
})

test('Mon club : par défaut, personne d\'autre que le président', () => {
  assert.deepEqual(PERMISSION_DEFAULTS.mon_club, [])
  for (const { val } of ROLES_STAFF) {
    assert.equal(peutEditerSection({ role: val, section: 'mon_club', ligne: null }), val === 'president', val)
  }
})

test('Mon club : une ligne explicite donne l\'accès au rôle choisi seulement', () => {
  const ligne = { can_view: true, can_edit: true }
  assert.equal(peutEditerSection({ role: 'tresorier', section: 'mon_club', ligne }), true)
  assert.equal(peutEditerSection({ role: 'secretaire', section: 'mon_club', ligne: null }), false)
})

test('Mon club : voir sans modifier ne donne pas accès à la page', () => {
  assert.equal(peutEditerSection({ role: 'tresorier', section: 'mon_club', ligne: { can_view: true, can_edit: false } }), false)
})

test('chaque section de la matrice a une règle par défaut', () => {
  for (const s of PERMISSION_SECTIONS) assert.ok(s.id in PERMISSION_DEFAULTS, s.id)
})

test('le président reste toujours accepté, même avec une ligne qui le refuse', () => {
  assert.equal(peutEditerSection({ role: 'president', section: 'mon_club', ligne: { can_view: false, can_edit: false } }), true)
})
