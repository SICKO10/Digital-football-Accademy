import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compteDepuisLignes, outilPourMenu, sectionVerrouillee, ongletsStatsPermis,
  menuVisible, outilActif, ONGLETS_STATS,
} from '../src/lib/outilsAcces.js'

const NOW = new Date('2026-11-07T12:00:00Z')
const futur = '2026-11-08T12:00:00Z'
const passe = '2026-11-06T12:00:00Z'

const edu = (lignes = []) => compteDepuisLignes('educateur', true, lignes)

test('compte sans le nouveau modèle : rien n\'est filtré', () => {
  const compte = compteDepuisLignes('educateur', false, [])
  assert.equal(sectionVerrouillee(compte, 'mes_seances', NOW), false)
  assert.equal(menuVisible(compte, 'explorer', NOW), true)
  assert.equal(menuVisible(compte, 'recrutement', NOW), true)
  assert.deepEqual(ongletsStatsPermis(compte, NOW), ONGLETS_STATS)
  assert.equal(outilActif(compte, 'seances', NOW), true)
})

test('éducateur sans outil : le socle reste ouvert', () => {
  const compte = edu()
  for (const cle of ['accueil', 'profil', 'equipe', 'matchs', 'entrainements', 'materiel', 'terrains', 'deplacements']) {
    assert.equal(sectionVerrouillee(compte, cle, NOW), false, cle)
  }
})

test('éducateur sans outil : les pages d\'outils sont verrouillées', () => {
  const compte = edu()
  for (const cle of ['mes_seances', 'tactipad', 'bibliotheque', 'prep_physique', 'analyse_video', 'notes', 'clotures_saison', 'sante', 'historique', 'projet_sportif', 'projet_club_cff4', 'stages']) {
    assert.equal(sectionVerrouillee(compte, cle, NOW), true, cle)
  }
})

test('clés inconnues du catalogue : jamais verrouillées', () => {
  const compte = edu()
  assert.equal(sectionVerrouillee(compte, 'annonces', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'messagerie', NOW), false)
})

test('Statistiques reste ouverte avec la présence seulement', () => {
  const compte = edu()
  assert.equal(sectionVerrouillee(compte, 'stats', NOW), false)
  assert.deepEqual(ongletsStatsPermis(compte, NOW), ['presence'])
})

test('Explorer et Recrutement retirés du menu au nouveau modèle', () => {
  const compte = edu()
  assert.equal(menuVisible(compte, 'explorer', NOW), false)
  assert.equal(menuVisible(compte, 'recrutement', NOW), false)
})

test('une ligne sans fin ouvre l\'outil, pas les autres', () => {
  const compte = edu([{ outil: 'seances', source: 'achat', fin_le: null }])
  assert.equal(sectionVerrouillee(compte, 'mes_seances', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'tactipad', NOW), true)
})

test('essai non expiré ouvert, essai expiré refermé', () => {
  assert.equal(sectionVerrouillee(edu([{ outil: 'tactique', source: 'essai', fin_le: futur }]), 'tactipad', NOW), false)
  assert.equal(sectionVerrouillee(edu([{ outil: 'tactique', source: 'essai', fin_le: passe }]), 'tactipad', NOW), true)
})

test('Suivi des joueurs ouvre ses onglets (sans Graphiques), la santé et l\'historique', () => {
  const compte = edu([{ outil: 'suivi_joueurs', source: 'achat', fin_le: null }])
  assert.deepEqual(ongletsStatsPermis(compte, NOW), ONGLETS_STATS.filter(o => o !== 'graphiques'))
  assert.equal(sectionVerrouillee(compte, 'sante', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'historique', NOW), false)
})

test('un outil du club ouvre l\'outil éducateur lié', () => {
  const compte = edu([{ outil: 'projet_sportif', source: 'club', fin_le: futur }])
  assert.equal(sectionVerrouillee(compte, 'projet_sportif', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'stages', NOW), true)
  const stages = edu([{ outil: 'stages', source: 'club', fin_le: null }])
  assert.equal(sectionVerrouillee(stages, 'stages', NOW), false)
})

test('outilPourMenu : l\'outil, ou rien pour le socle', () => {
  assert.equal(outilPourMenu('educateur', 'tactipad').id, 'tactique')
  assert.equal(outilPourMenu('educateur', 'equipe'), null)
  assert.equal(outilPourMenu('club', 'budget').id, 'finances')
})

test('Stats collectives ouvre Graphiques en plus de la présence, sans les onglets de Suivi des joueurs', () => {
  const compte = edu([{ outil: 'stats_collectives', source: 'achat', fin_le: null }])
  assert.deepEqual(ongletsStatsPermis(compte, NOW), ['graphiques', 'presence'])
  assert.equal(outilActif(compte, 'stats_collectives', NOW), true)
  assert.equal(outilActif(compte, 'suivi_joueurs', NOW), false)
})

test('les deux outils ensemble ouvrent tous les onglets', () => {
  const compte = edu([
    { outil: 'suivi_joueurs', source: 'achat', fin_le: null },
    { outil: 'stats_collectives', source: 'achat', fin_le: null },
  ])
  assert.deepEqual(ongletsStatsPermis(compte, NOW), ONGLETS_STATS)
})

test('sans outil, Stats collectives est inactive', () => {
  assert.equal(outilActif(edu(), 'stats_collectives', NOW), false)
  assert.equal(outilActif(compteDepuisLignes('educateur', false, []), 'stats_collectives', NOW), true)
})
