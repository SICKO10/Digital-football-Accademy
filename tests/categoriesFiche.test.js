import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { presencesParEquipe, matchsParEquipe, dernieresActivites, pastilleEquipe } from '../src/lib/categoriesFiche.js'

const ent = [
  { id: 'e1', date: '2026-09-01', club_categorie_id: 'A' },
  { id: 'e2', date: '2026-09-03', club_categorie_id: 'B' },
  { id: 'e3', date: '2026-09-05', club_categorie_id: 'B' },
  { id: 'e4', date: '2027-01-01', club_categorie_id: 'A' },
]
const pres = [
  { joueur_id: 'f1', entrainement_id: 'e1', statut: 'present' },
  { joueur_id: 'f1', entrainement_id: 'e1', statut: 'present' },
  { joueur_id: 'f2', entrainement_id: 'e2', statut: 'absent' },
  { joueur_id: 'f2', entrainement_id: 'e3', present: true },
  { joueur_id: 'f1', entrainement_id: 'e4', statut: 'present' },
  { joueur_id: 'f1', entrainement_id: 'e9', statut: 'present' },
]
const auj = '2026-10-01'

describe('presencesParEquipe', () => {
   it('compte par équipe de la séance, une fois, séances passées seulement', () => {
    const r = presencesParEquipe(pres, ent, auj)
    assert.partialDeepStrictEqual(r.equipes.find(l => l.equipe_id === 'A'), { seances: 1, presents: 1 })
    assert.partialDeepStrictEqual(r.equipes.find(l => l.equipe_id === 'B'), { seances: 2, presents: 1 })
    assert.deepEqual(r.total, { seances: 3, presents: 2 })
  })
   it('le total est la somme des équipes', () => {
    const r = presencesParEquipe(pres, ent, auj)
    assert.equal(r.total.seances, r.equipes.reduce((s, l) => s + l.seances, 0))
  })
})

const matchs = [
  { id: 'm1', date: '2026-09-10', club_categorie_id: 'A', adversaire: 'X' },
  { id: 'm2', date: '2026-09-17', club_categorie_id: 'B', adversaire: 'Y' },
]
const stats = [
  { joueur_id: 'f1', match_id: 'm1', minutes: 90, buts: 2, passes_dec: 1 },
  { joueur_id: 'f1', match_id: 'm1', minutes: 90, buts: 2, passes_dec: 1 },
  { joueur_id: 'f2', match_id: 'm2', minutes: 45, buts: 1, passes_dec: 0 },
  { joueur_id: 'f2', match_id: 'm9', minutes: 45, buts: 5 },
  { joueur_id: 'f1', match_id: 'm2', minutes: 0, buts: 0 },
]

describe('matchsParEquipe', () => {
   it('regroupe par équipe du match, sans doublon ni match sans minutes', () => {
    const r = matchsParEquipe(stats, matchs)
    assert.partialDeepStrictEqual(r.equipes.find(l => l.equipe_id === 'A'), { matchs: 1, minutes: 90, buts: 2, passes: 1 })
    assert.partialDeepStrictEqual(r.equipes.find(l => l.equipe_id === 'B'), { matchs: 1, minutes: 45, buts: 1 })
    assert.deepEqual(r.total, { matchs: 2, minutes: 135, buts: 3, passes: 1 })
  })
})

describe('dernieresActivites', () => {
   it('trie du plus récent au plus ancien avec l\'équipe', () => {
    const r = dernieresActivites(stats, matchs, pres, ent, auj, 10)
    assert.deepEqual(r.map(a => a.date), ['2026-09-17', '2026-09-10', '2026-09-05', '2026-09-03', '2026-09-01'])
    assert.equal(r[0].equipe_id, 'B')
  })
})

describe('pastilleEquipe', () => {
   it('catégorie en commun, équipe principale en par équipe', () => {
    assert.equal(pastilleEquipe({ mode: 'commun', nom: 'U15' }, { nom: 'U15', equipe: 'A' }), 'U15')
    assert.equal(pastilleEquipe({ mode: 'par_equipe', nom: 'U15' }, { nom: 'U15', equipe: 'A' }), 'U15 A')
  })
})
