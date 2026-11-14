import { test } from 'node:test'
import assert from 'node:assert/strict'
import { libelleEquipe, grouperAgendaParDate, indexerReponses, cleReponse, equipeConvocation } from '../src/lib/categoriesJoueur.js'

test('le libellé d\'équipe n\'affiche rien sans lettre', () => {
  assert.equal(libelleEquipe('U15', 'B'), 'U15 B')
  assert.equal(libelleEquipe('U15', null), '')
  assert.equal(libelleEquipe(null, 'A'), '')
  assert.equal(equipeConvocation({ equipe_nom: 'U15', equipe_lettre: 'B' }), 'U15 B')
  assert.equal(equipeConvocation(undefined), '')
})

test('l\'agenda est regroupé par date et trié par heure', () => {
  const lignes = [
    { type: 'match', id: 'm1', categorie_id: 'c1', categorie_nom: 'U15', date: '2026-11-21', heure: '15:00', equipe_nom: 'U15', equipe_lettre: 'B' },
    { type: 'entrainement', id: 'e2', categorie_id: 'c1', categorie_nom: 'U15', date: '2026-11-18', heure: '19:00', equipe_nom: 'U15', equipe_lettre: 'B' },
    { type: 'entrainement', id: 'e1', categorie_id: 'c1', categorie_nom: 'U15', date: '2026-11-18', heure: '18:00', equipe_nom: 'U15', equipe_lettre: 'A' },
  ]
  const g = grouperAgendaParDate(lignes)
  assert.deepEqual(g.map(x => x.date), ['2026-11-18', '2026-11-21'])
  assert.deepEqual(g[0].evenements.map(e => e.equipe), ['U15 A', 'U15 B'])
  assert.equal(g[1].evenements.length, 1)
  assert.deepEqual(grouperAgendaParDate(null), [])
})

test('deux catégories le même jour restent deux groupes', () => {
  const g = grouperAgendaParDate([
    { categorie_id: 'c1', categorie_nom: 'U15', date: '2026-11-18', heure: '18:00' },
    { categorie_id: 'c2', categorie_nom: 'U17', date: '2026-11-18', heure: '18:00' },
  ])
  assert.equal(g.length, 2)
})

test('les réponses sont indexées par catégorie et date', () => {
  const idx = indexerReponses([{ categorie_id: 'c1', date: '2026-11-18', statut: 'absent' }])
  assert.equal(idx[cleReponse('c1', '2026-11-18')], 'absent')
  assert.equal(idx[cleReponse('c1', '2026-11-19')], undefined)
})
