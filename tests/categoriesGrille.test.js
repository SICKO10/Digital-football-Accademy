import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fusionnerSondageDate, colonnesGrille, cochesInitiales, colonneModifiee, filtrerJoueurs, paginer, heureCourte } from '../src/lib/categoriesGrille.js'
import { calculerExpirationConvocation } from '../src/lib/convocations.js'

const matchs = [
  { match_id: 'm1', equipe_nom: 'U15', equipe_lettre: 'A', educateur_id: 'edu-a' },
  { match_id: 'm2', equipe_nom: 'U15F', equipe_lettre: 'B', educateur_id: 'edu-b' },
]

test('un éducateur envoie pour son équipe seulement, le club pour toutes', () => {
  const edu = colonnesGrille(matchs, { userId: 'edu-a', estClub: false })
  assert.deepEqual(edu.map(c => c.peutEnvoyer), [true, false])
  assert.deepEqual(edu.map(c => c.libelle), ['U15 A', 'U15 Féminin B'])
  const club = colonnesGrille(matchs, { userId: 'club', estClub: true })
  assert.deepEqual(club.map(c => c.peutEnvoyer), [true, true])
  assert.equal(colonnesGrille(matchs, { userId: null, estClub: false }).some(c => c.peutEnvoyer), false)
})

test('les cases de départ sont les joueurs déjà convoqués, une entrée par colonne', () => {
  const cols = colonnesGrille(matchs, { userId: 'edu-a' })
  const coches = cochesInitiales(cols, [{ match_id: 'm1', joueur_id: 'p1' }, { match_id: 'm1', joueur_id: 'p2' }, { match_id: 'm9', joueur_id: 'p3' }])
  assert.deepEqual([...coches.m1], ['p1', 'p2'])
  assert.equal(coches.m2.size, 0)
  assert.equal('m9' in coches, false)
})

test('détecte une colonne modifiée', () => {
  assert.equal(colonneModifiee(new Set(['a', 'b']), new Set(['b', 'a'])), false)
  assert.equal(colonneModifiee(new Set(['a']), new Set(['a', 'b'])), true)
  assert.equal(colonneModifiee(new Set(['a', 'c']), new Set(['a', 'b'])), true)
  assert.equal(colonneModifiee(undefined, new Set()), false)
})

test('recherche sans accent ni majuscule, dans les deux sens', () => {
  const j = [{ prenom: 'Élise', nom: 'Moreau' }, { prenom: 'Lucas', nom: 'Martin' }]
  assert.equal(filtrerJoueurs(j, 'elise').length, 1)
  assert.equal(filtrerJoueurs(j, 'MOREAU élise').length, 1)
  assert.equal(filtrerJoueurs(j, 'élise lucas').length, 0)
  assert.equal(filtrerJoueurs(j, 'moreau').length, 1)
  assert.equal(filtrerJoueurs(j, '  ').length, 2)
})

test('pagination 1–10 sur N, bornée', () => {
  const l = Array.from({ length: 23 }, (_, i) => i)
  assert.deepEqual([paginer(l, 1).debut, paginer(l, 1).fin, paginer(l, 1).total], [1, 10, 23])
  assert.deepEqual([paginer(l, 3).debut, paginer(l, 3).fin, paginer(l, 3).items.length], [21, 23, 3])
  assert.equal(paginer(l, 99).page, 3)
  assert.equal(paginer(l, 0).page, 1)
  const vide = paginer([], 1)
  assert.deepEqual([vide.debut, vide.fin, vide.total, vide.pages], [0, 0, 0, 1])
})

test('heure courte', () => {
  assert.equal(heureCourte('14:30:00'), '14:30')
  assert.equal(heureCourte(null), '')
})

test('la convocation expire le dimanche suivant à 20h (comportement inchangé)', () => {
  const d = new Date(calculerExpirationConvocation('2026-11-21')) // samedi
  assert.equal(d.getDay(), 0)
  assert.equal(d.getHours(), 20)
  assert.equal(d.getDate(), 22)
  const dim = new Date(calculerExpirationConvocation('2026-11-22')) // dimanche : le suivant
  assert.equal(dim.getDate(), 29)
})

import { conflitsJoueur, texteConflit, indexerSondage, statutSondage, absentDuMatch } from '../src/lib/categoriesGrille.js'

test('conflit : joueur coché dans une autre colonne du même jour', () => {
  const cols = [
    { match_id: 'm1', libelle: 'U15 A', heure: '14:00:00' },
    { match_id: 'm2', libelle: 'U15 B', heure: '16:30' },
  ]
  const coches = { m1: new Set(['p1']), m2: new Set(['p1', 'p2']) }
  assert.deepEqual(conflitsJoueur('p1', 'm2', cols, coches).map(c => c.libelle), ['U15 A'])
  assert.deepEqual(conflitsJoueur('p2', 'm2', cols, coches), [])
  assert.deepEqual(conflitsJoueur(null, 'm2', cols, coches), [])
  assert.equal(texteConflit([cols[0]]), 'Déjà convoqué en U15 A à 14:00')
  assert.equal(texteConflit([]), '')
})

test('sondage : absent, pas répondu, présent', () => {
  const cols = [{ match_id: 'm1' }, { match_id: 'm2' }]
  const s = indexerSondage([
    { match_id: 'm1', joueur_id: 'p1', statut: 'absent' },
    { match_id: 'm2', joueur_id: 'p1', statut: 'absent' },
    { match_id: 'm1', joueur_id: 'p2', statut: 'present' },
    { match_id: 'm1', joueur_id: 'p3', statut: 'blesse' },
    { match_id: 'm2', joueur_id: 'p3', statut: 'present' },
  ])
  assert.equal(statutSondage('p1', cols, s).texte, 'Absent')
  assert.equal(statutSondage('p2', cols, s).texte, '')
  assert.equal(statutSondage('p3', cols, s).texte, '')
  assert.equal(statutSondage('p4', cols, s).texte, 'Pas répondu')
  assert.equal(statutSondage(null, cols, s).texte, '')
  assert.equal(absentDuMatch('p3', 'm1', s), true)
  assert.equal(absentDuMatch('p3', 'm2', s), false)
})

test('la réponse à la date vaut pour tous les matchs, la réponse au match l\'emporte', () => {
  const cols = [{ match_id: 'm1' }, { match_id: 'm2' }]
  const parMatch = { m2: { p1: 'present' } }
  const f = fusionnerSondageDate(parMatch, cols, [{ joueur_id: 'p1', statut: 'absent' }, { joueur_id: 'p2', statut: 'absent' }])
  assert.equal(f.m1.p1, 'absent')
  assert.equal(f.m2.p1, 'present')
  assert.equal(f.m2.p2, 'absent')
  assert.equal(statutSondage('p2', cols, f).texte, 'Absent')
  assert.deepEqual(fusionnerSondageDate(null, cols, null), { m1: {}, m2: {} })
})
