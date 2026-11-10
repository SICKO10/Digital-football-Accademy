import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compteDepuisLignes, outilPourMenu, sectionVerrouillee, ongletsStatsPermis,
  menuVisible, outilActif, ONGLETS_STATS, etatsOutils,
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
  for (const cle of ['accueil', 'profil', 'equipe', 'matchs', 'entrainements', 'materiel', 'terrains', 'deplacements', 'clotures_saison']) {
    assert.equal(sectionVerrouillee(compte, cle, NOW), false, cle)
  }
})

test('éducateur sans outil : les pages d\'outils sont verrouillées', () => {
  const compte = edu()
  for (const cle of ['mes_seances', 'tactipad', 'bibliotheque', 'prep_physique', 'analyse_video', 'notes', 'sante', 'historique', 'projet_sportif', 'projet_club_cff4', 'stages']) {
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

// ── Club ──
const club = (lignes = []) => compteDepuisLignes('club', true, lignes)
const MENUS_CLUB_SOCLE = [
  'accueil', 'profil', 'categories', 'educateurs', 'staff', 'organigramme',
  'inventaire', 'planning', 'seances', 'terrains', 'deplacements',
]

test('club sans le nouveau modèle : rien n\'est filtré', () => {
  const compte = compteDepuisLignes('club', false, [])
  for (const cle of ['budget', 'sponsors', 'stages', 'recrutement', 'classements']) {
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
    assert.equal(sectionVerrouillee(compte, cle, NOW), false, cle)
  }
})

test('club sans outil : le socle reste ouvert et visible', () => {
  const compte = club()
  for (const cle of MENUS_CLUB_SOCLE) {
    assert.equal(sectionVerrouillee(compte, cle, NOW), false, cle)
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
  }
})

test('club sans outil : les pages d\'outils sont verrouillées et cachées du menu', () => {
  const compte = club()
  for (const cle of ['classements', 'tournoi', 'projet_sportif', 'budget', 'sponsors', 'evenements', 'taches', 'newsletter', 'stages', 'projet_club_cff4']) {
    assert.equal(sectionVerrouillee(compte, cle, NOW), true, cle)
    assert.equal(menuVisible(compte, cle, NOW), false, cle)
  }
})

test('club : Recrutement est retiré du menu', () => {
  assert.equal(menuVisible(club(), 'recrutement', NOW), false)
  assert.equal(menuVisible(club([{ outil: 'finances', fin_le: null }]), 'recrutement', NOW), false)
})

test('club : un outil actif ouvre toutes ses pages, pas celles des autres', () => {
  const compte = club([{ outil: 'finances', fin_le: null }])
  assert.equal(sectionVerrouillee(compte, 'budget', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'sponsors', NOW), false)
  assert.equal(menuVisible(compte, 'sponsors', NOW), true)
  assert.equal(sectionVerrouillee(compte, 'evenements', NOW), true)
})

test('club : un outil retiré reste ouvert jusqu\'à la fin de la période payée', () => {
  const encore = club([{ outil: 'vie_club', fin_le: futur }])
  const fini = club([{ outil: 'vie_club', fin_le: passe }])
  assert.equal(sectionVerrouillee(encore, 'newsletter', NOW), false)
  assert.equal(sectionVerrouillee(fini, 'newsletter', NOW), true)
})

test('un essai en cours donne accès à l\'outil, un essai fini non', () => {
  const ok = compteDepuisLignes('educateur', true, [{ outil: 'bibliotheque', source: 'essai', fin_le: futur }])
  assert.equal(outilActif(ok, 'bibliotheque', NOW), true)
  const fini = compteDepuisLignes('educateur', true, [{ outil: 'bibliotheque', source: 'essai', fin_le: passe }])
  assert.equal(outilActif(fini, 'bibliotheque', NOW), false)
})

test('Mes outils : états d\'un éducateur', () => {
  const etats = etatsOutils({
    role: 'educateur',
    lignes: [
      { outil: 'seances', source: 'achat', fin_le: null },
      { outil: 'tactique', source: 'essai', fin_le: '2026-11-17T12:00:00Z' },
      { outil: 'prep_physique', source: 'achat', fin_le: futur },
      { outil: 'cff4', source: 'club', fin_le: null },
    ],
    essaisUtilises: ['tactique', 'bibliotheque'],
    maintenant: NOW,
  })
  const de = (id) => etats.find(e => e.outil.id === id)
  assert.equal(de('seances').etat, 'actif')
  assert.equal(de('tactique').etat, 'essai')
  assert.equal(de('tactique').joursRestants, 10)
  assert.equal(de('prep_physique').etat, 'retire')
  assert.equal(de('cff4').etat, 'club')
  assert.equal(de('bibliotheque').etat, 'essai_termine')
  assert.equal(de('suivi_joueurs').etat, 'disponible')
  assert.equal(de('stages'), undefined)
})

test('Mes outils : un éducateur qui a payé un outil aussi fourni par son club le garde', () => {
  const etats = etatsOutils({
    role: 'educateur',
    lignes: [{ outil: 'cff4', source: 'achat', fin_le: null }, { outil: 'cff4', source: 'club', fin_le: null }, { outil: 'stages', source: 'club', fin_le: null }],
    maintenant: NOW,
  })
  const cff4 = etats.find(e => e.outil.id === 'cff4')
  assert.equal(cff4.etat, 'actif')
  assert.equal(cff4.fourniParLeClub, true)
  assert.equal(etats.find(e => e.outil.id === 'stages').etat, 'club')
})

test('Mes outils : un club choisit ses outils, tous inclus', () => {
  const etats = etatsOutils({ role: 'club', lignes: [{ outil: 'finances', source: 'forfait', fin_le: null }], maintenant: NOW })
  assert.equal(etats.length, 6)
  assert.equal(etats.find(e => e.outil.id === 'finances').etat, 'actif')
  assert.equal(etats.find(e => e.outil.id === 'vie_club').etat, 'disponible')
})

test('la fiche d\'évaluation (notes) vient avec le suivi des joueurs, pas avec l\'analyse vidéo', () => {
  const suivi = edu([{ outil: 'suivi_joueurs', source: 'achat', fin_le: null }])
  assert.equal(sectionVerrouillee(suivi, 'notes', NOW), false)
  assert.equal(sectionVerrouillee(suivi, 'analyse_video', NOW), true)
  const video = edu([{ outil: 'evaluations_video', source: 'achat', fin_le: null }])
  assert.equal(sectionVerrouillee(video, 'notes', NOW), true)
  assert.equal(sectionVerrouillee(video, 'analyse_video', NOW), false)
})
