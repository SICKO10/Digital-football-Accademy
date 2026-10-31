// Tests de src/lib/cloturesClub.js (bilan de clôture côté club, données fictives en mémoire).
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatClotureEquipe, bilanCloturesClub } from '../src/lib/cloturesClub.js'

const saison = '2026-2027'
const equipeJoueurs = [
  { id: 'ej1', club_categorie_id: 'u17' }, { id: 'ej2', club_categorie_id: 'u17' },
  { id: 'ej3', club_categorie_id: 'u15' }, { id: 'ej4', club_categorie_id: 'u13' },
]
const aff = (equipe_joueur_id, statut, s = saison) => ({ equipe_joueur_id, statut, saison: s })

test('équipe avec des joueurs encore affiliés : à clôturer', () => {
  const e = { id: 'u17', educateur_id: 'c1' }
  const affiliations = [aff('ej1', 'archive'), aff('ej2', 'accepte')]
  assert.equal(etatClotureEquipe({ equipe: e, equipeJoueurs, affiliations, saison }), 'a_cloturer')
})

test('équipe dont les affiliations sont archivées cette saison : clôturée', () => {
  const e = { id: 'u17', educateur_id: null }
  const affiliations = [aff('ej1', 'archive'), aff('ej2', 'archive')]
  assert.equal(etatClotureEquipe({ equipe: e, equipeJoueurs, affiliations, saison }), 'cloturee')
})

test('une archive d\'une autre saison ne compte pas', () => {
  const e = { id: 'u15', educateur_id: 'c2' }
  const affiliations = [aff('ej3', 'archive', '2025-2026')]
  assert.equal(etatClotureEquipe({ equipe: e, equipeJoueurs, affiliations, saison }), 'sans_joueur')
})

test('équipe sans coach ni joueur', () => {
  const e = { id: 'u13', educateur_id: null }
  assert.equal(etatClotureEquipe({ equipe: e, equipeJoueurs, affiliations: [], saison }), 'sans_coach')
})

test('les affiliations d\'une autre équipe ne comptent pas', () => {
  const e = { id: 'u15', educateur_id: 'c2' }
  const affiliations = [aff('ej1', 'accepte')]
  assert.equal(etatClotureEquipe({ equipe: e, equipeJoueurs, affiliations, saison }), 'sans_joueur')
})

test('bilan : compte des équipes clôturées et à clôturer', () => {
  const equipes = [
    { id: 'u17', educateur_id: null }, { id: 'u15', educateur_id: 'c2' }, { id: 'u13', educateur_id: 'c3' },
  ]
  const affiliations = [aff('ej1', 'archive'), aff('ej2', 'archive'), aff('ej3', 'accepte')]
  const b = bilanCloturesClub({ equipes, equipeJoueurs, affiliations, saison })
  assert.equal(b.nbCloturees, 1)
  assert.equal(b.nbACloturer, 1)
  assert.deepEqual(b.lignes.map(l => l.etat), ['cloturee', 'a_cloturer', 'sans_joueur'])
})
