import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OUTILS, SOCLE, outilsVisibles, menuFiltre, totalComposition,
  joursRestantsEssai, outilsPrecoches, outilsSansPrix, trouverOutil,
} from '../src/lib/catalogueOutils.js'

const NOW = new Date('2026-11-10T12:00:00Z')
const futur = '2026-11-20T12:00:00Z'
const passe = '2026-11-01T12:00:00Z'

test('catalogue : ids uniques par rôle et menus jamais dans le socle', () => {
  const vus = new Set()
  for (const o of OUTILS) {
    const cle = `${o.role}/${o.id}`
    assert.ok(!vus.has(cle), cle)
    vus.add(cle)
    for (const m of o.menus) assert.ok(!SOCLE[o.role].menus.includes(m), `${cle} : ${m} est dans le socle`)
  }
})

test('compte hors nouveau modèle : aucun filtrage', () => {
  assert.equal(outilsVisibles({ role: 'educateur', modeleOutils: false }, NOW), null)
  const menus = ['accueil', 'stats', 'explorer']
  assert.deepEqual(menuFiltre({ role: 'educateur', modeleOutils: false }, menus, NOW), menus)
})

test('éducateur seul sans outil : socle uniquement, Explorer et CFF4 retirés', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [] }
  assert.deepEqual(outilsVisibles(c, NOW), [])
  const menus = ['accueil', 'profil', 'equipe', 'matchs', 'stats', 'tactipad', 'explorer', 'projet_club_cff4']
  assert.deepEqual(menuFiltre(c, menus, NOW), ['accueil', 'profil', 'equipe', 'matchs'])
})

test('éducateur avec outil actif ou essai en cours', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [
    { outil: 'tactique', statut: 'actif' },
    { outil: 'seances', statut: 'essai', essaiFin: futur },
  ] }
  assert.deepEqual(outilsVisibles(c, NOW).sort(), ['seances', 'tactique'])
  assert.deepEqual(menuFiltre(c, ['accueil', 'tactipad', 'entrainements', 'stats'], NOW), ['accueil', 'tactipad', 'entrainements'])
})

test('essai expiré : outil masqué', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [{ outil: 'seances', statut: 'essai', essaiFin: passe }] }
  assert.deepEqual(outilsVisibles(c, NOW), [])
})

test('outil retiré mais encore payé : visible jusqu\'à la fin de période', () => {
  const droit = (periodeFin) => ({ role: 'club', modeleOutils: true, droits: [{ outil: 'finances', statut: 'retire', periodeFin }] })
  assert.deepEqual(outilsVisibles(droit(futur), NOW), ['finances'])
  assert.deepEqual(outilsVisibles(droit(passe), NOW), [])
})

test('éducateur affilié : reçoit Stages et CFF4 seulement si le club les détient', () => {
  const avec = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['stages', 'cff4'] }
  assert.deepEqual(outilsVisibles(avec, NOW).sort(), ['cff4', 'stages'])
  const sans = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['finances'] }
  assert.deepEqual(outilsVisibles(sans, NOW), [])
})

test('outil retiré du club : l\'éducateur le perd', () => {
  const avant = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['stages'] }
  const apres = { ...avant, clubOutils: [] }
  assert.deepEqual(outilsVisibles(avant, NOW), ['stages'])
  assert.deepEqual(outilsVisibles(apres, NOW), [])
})

test('club : socle complet, outils par menu', () => {
  const c = { role: 'club', modeleOutils: true, droits: [{ outil: 'stages', statut: 'actif' }] }
  const menus = ['accueil', 'planning', 'seances', 'terrains', 'inventaire', 'budget', 'stages', 'projet_club_cff4']
  assert.deepEqual(menuFiltre(c, menus, NOW), ['accueil', 'planning', 'seances', 'terrains', 'inventaire', 'stages'])
})

test('Stages éducateur non achetable seul', () => {
  assert.equal(trouverOutil('educateur', 'stages').achetable, false)
})

test('total : null tant qu\'un prix manque, somme sinon', () => {
  assert.equal(totalComposition('educateur', ['seances'], 'mensuel'), null)
  const o = trouverOutil('educateur', 'seances')
  const ancien = o.prixMensuel
  o.prixMensuel = 3
  trouverOutil('educateur', 'tactique').prixMensuel = 4
  assert.equal(totalComposition('educateur', ['seances', 'tactique'], 'mensuel'), 7)
  assert.equal(totalComposition('educateur', ['stages'], 'mensuel'), null)
  o.prixMensuel = ancien
  trouverOutil('educateur', 'tactique').prixMensuel = null
})

test('jours restants d\'essai', () => {
  assert.equal(joursRestantsEssai('2026-11-24T12:00:00Z', NOW), 14)
  assert.equal(joursRestantsEssai('2026-11-10T13:00:00Z', NOW), 1)
  assert.equal(joursRestantsEssai(passe, NOW), 0)
  assert.equal(joursRestantsEssai(null, NOW), 0)
})

test('pré-cochage : réponses, club et exclusion des outils fournis', () => {
  assert.deepEqual(outilsPrecoches('educateur', { q2: 'u13_u15', q3: 'seances' }).sort(), ['prep_physique', 'seances', 'tactique'])
  assert.deepEqual(outilsPrecoches('club', { q2: 'ecole', q3: 'organiser' }).sort(), ['projet_sportif', 'vie_club'])
  assert.deepEqual(outilsPrecoches('educateur', { q2: 'ecole', q3: 'seances' }, ['projet_sportif']).sort(), ['seances', 'tactique'])
})

// Garde-fou de la bascule live (bloc 16) : lancer avec BASCULE_LIVE=1.
test('bascule : tous les outils achetables ont un prix', { skip: !process.env.BASCULE_LIVE }, () => {
  assert.deepEqual(outilsSansPrix(), [])
})
