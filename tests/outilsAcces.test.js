import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compteDepuisLignes, outilPourMenu, sectionVerrouillee, ongletsStatsPermis,
  menuVisible, outilActif, ONGLETS_STATS, etatsOutils, doublonsClub, outilsPourEducateurs, affichageDepuisLignes,
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

// Bloc 10 : outils du club pour les éducateurs affiliés.
const duClub = [{ outil: 'projet_sportif', source: 'club', fin_le: null }]

test('éducateur affilié : un outil du club masqué disparaît du menu, la page reste ouverte', () => {
  const compte = compteDepuisLignes('educateur', true, duClub, ['projet_sportif'])
  assert.equal(menuVisible(compte, 'projet_sportif', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'projet_sportif', NOW), false)
  assert.equal(outilActif(compte, 'projet_sportif', NOW), true)
})

test('éducateur affilié : un outil du club non masqué reste dans le menu', () => {
  assert.equal(menuVisible(compteDepuisLignes('educateur', true, duClub, []), 'projet_sportif', NOW), true)
  assert.equal(menuVisible(compteDepuisLignes('educateur', true, duClub, ['cff4']), 'projet_sportif', NOW), true)
})

test('éducateur affilié : masquer ne cache pas un outil qu\'il paie lui-même', () => {
  const compte = compteDepuisLignes('educateur', true, [...duClub, { outil: 'projet_sportif', source: 'achat', fin_le: null }], ['projet_sportif'])
  assert.equal(menuVisible(compte, 'projet_sportif', NOW), true)
})

test('masquer ne touche pas un outil qui ne vient pas du club', () => {
  const compte = compteDepuisLignes('educateur', true, [{ outil: 'seances', source: 'achat', fin_le: null }], ['seances'])
  assert.equal(menuVisible(compte, 'mes_seances', NOW), true)
})

test('masque : repéré dans les états seulement pour un outil fourni par le club', () => {
  const etats = etatsOutils({ role: 'educateur', lignes: duClub, masques: ['projet_sportif', 'seances'], maintenant: NOW })
  assert.equal(etats.find(e => e.outil.id === 'projet_sportif').masque, true)
  assert.equal(etats.find(e => e.outil.id === 'seances').masque, false)
  assert.equal(etats.find(e => e.outil.id === 'cff4').masque, false)
})

test('doublon : outil payé et fourni par le club ; pas de doublon si l\'outil est déjà retiré', () => {
  const lignes = [
    { outil: 'projet_sportif', source: 'achat', fin_le: null }, { outil: 'projet_sportif', source: 'club', fin_le: null },
    { outil: 'cff4', source: 'achat', fin_le: futur }, { outil: 'cff4', source: 'club', fin_le: null },
    { outil: 'seances', source: 'achat', fin_le: null },
  ]
  const doublons = doublonsClub(etatsOutils({ role: 'educateur', lignes, maintenant: NOW }))
  assert.deepEqual(doublons.map(d => d.outil.id), ['projet_sportif'])
  assert.deepEqual(doublonsClub(etatsOutils({ role: 'educateur', lignes: duClub, maintenant: NOW })), [])
})

test('club : outils ouvrables aux éducateurs, possédés et ouverts', () => {
  const etats = etatsOutils({ role: 'club', lignes: [{ outil: 'cff4', source: 'forfait', fin_le: null }, { outil: 'finances', source: 'forfait', fin_le: null }], maintenant: NOW })
  const liste = outilsPourEducateurs({ etats, ouverts: ['cff4'] })
  assert.deepEqual(liste.map(l => l.outil.id), ['projet_sportif', 'stages', 'cff4'])
  assert.deepEqual(liste.map(l => [l.possede, l.ouvert]), [[false, false], [false, false], [true, true]])
})

test('club ancien modèle : sans réglage, tous les menus restent affichés', () => {
  const compte = compteDepuisLignes('club', false, [], [], [])
  for (const cle of ['budget', 'sponsors', 'evenements', 'newsletter', 'stages', 'classements', 'projet_club_cff4']) {
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
  }
})

test('club ancien modèle : masquer un outil retire ses menus, pas les autres', () => {
  const compte = compteDepuisLignes('club', false, [], [], ['finances', 'vie_club'])
  for (const cle of ['budget', 'sponsors', 'evenements', 'taches', 'newsletter']) {
    assert.equal(menuVisible(compte, cle, NOW), false, cle)
  }
  for (const cle of ['stages', 'classements', 'tournoi', 'projet_sportif', 'projet_club_cff4']) {
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
  }
  // la page reste ouverte : seul le menu change
  assert.equal(sectionVerrouillee(compte, 'budget', NOW), false)
})

test('club : le socle et Mon club ne se masquent jamais', () => {
  const compte = compteDepuisLignes('club', false, [], [], ['finances', 'competition', 'vie_club', 'stages', 'cff4', 'projet_sportif'])
  for (const cle of ['accueil', 'profil', 'categories', 'staff', 'planning', 'mon_club', 'mes_outils']) {
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
  }
})

test('masquage du club : ne touche pas un éducateur', () => {
  const compte = compteDepuisLignes('educateur', false, [], [], ['finances'])
  assert.equal(menuVisible(compte, 'budget', NOW), true)
})

test('club nouveau modèle : le masquage s\'ajoute au verrouillage', () => {
  const lignes = [{ outil: 'finances', source: 'forfait', fin_le: null }, { outil: 'stages', source: 'forfait', fin_le: null }]
  const compte = compteDepuisLignes('club', true, lignes, [], ['finances'])
  assert.equal(menuVisible(compte, 'budget', NOW), false)
  assert.equal(menuVisible(compte, 'stages', NOW), true)
  assert.equal(menuVisible(compte, 'newsletter', NOW), false)
})

test('chaque outil du club a un thème connu et une explication', async () => {
  const { OUTILS, THEMES_CLUB } = await import('../src/lib/catalogueOutils.js')
  const themes = THEMES_CLUB.map(t => t.id)
  for (const o of OUTILS.filter(x => x.role === 'club')) {
    assert.ok(themes.includes(o.theme), `${o.id} : thème`)
    assert.ok(o.explication && !/[—–]/.test(o.explication), `${o.id} : explication`)
  }
})

// ── Mon club : menu de l'éducateur réglé par son club (bloc 5) ──────────────

const MOI = 'edu-1'
const commun = (outil, visible) => ({ cible: 'educateurs', educateur_id: null, outil, visible })
const perso = (outil, visible, educateur_id = MOI) => ({ cible: 'educateur', educateur_id, outil, visible })
const MENUS_EDUCATEUR = [
  'accueil', 'profil', 'mes_outils', 'equipe', 'stats', 'sante', 'historique', 'matchs', 'entrainements',
  'mes_seances', 'materiel', 'terrains', 'deplacements', 'clotures_saison', 'prep_physique', 'tactipad',
  'bibliotheque', 'projet_sportif', 'projet_club_cff4', 'stages', 'analyse_video', 'notes', 'explorer', 'recrutement',
]
const eduClub = ({ modele = false, lignes = [], masques = [], mode = 'commun', reglages = [] } = {}) =>
  compteDepuisLignes('educateur', modele, lignes, masques, [], affichageDepuisLignes(mode, reglages, MOI))
const fourniParClub = [{ outil: 'projet_sportif', source: 'club', fin_le: null }]

test('Mon club : sans aucun réglage, aucun menu éducateur ne change (ancien et nouveau modèle)', () => {
  assert.equal(affichageDepuisLignes(undefined, [], MOI), null)
  assert.equal(affichageDepuisLignes('individualise', [], MOI), null)
  for (const modele of [false, true]) {
    for (const lignes of [[], fourniParClub, [{ outil: 'tactique', source: 'achat', fin_le: null }]]) {
      const avant = compteDepuisLignes('educateur', modele, lignes)
      const apres = eduClub({ modele, lignes })
      for (const cle of MENUS_EDUCATEUR) assert.equal(menuVisible(apres, cle, NOW), menuVisible(avant, cle, NOW), `${modele} ${cle}`)
    }
  }
})

test('Mon club, ancien modèle : le réglage commun masque l\'entrée, la page reste ouverte', () => {
  const compte = eduClub({ reglages: [commun('seances', false), commun('tactique', true)] })
  assert.equal(menuVisible(compte, 'mes_seances', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'mes_seances', NOW), false)
  assert.equal(menuVisible(compte, 'tactipad', NOW), true)
  assert.equal(menuVisible(compte, 'bibliotheque', NOW), true)
})

test('Mon club, nouveau modèle : le club masque un outil qu\'il fournit', () => {
  const compte = eduClub({ modele: true, lignes: fourniParClub, reglages: [commun('projet_sportif', false)] })
  assert.equal(menuVisible(compte, 'projet_sportif', NOW), false)
  assert.equal(sectionVerrouillee(compte, 'projet_sportif', NOW), false)
})

test('Mon club : un outil payé par l\'éducateur reste affiché, essai en cours compris', () => {
  const reglages = [commun('tactique', false), commun('seances', false)]
  const lignes = [{ outil: 'tactique', source: 'achat', fin_le: null }, { outil: 'seances', source: 'essai', fin_le: futur }]
  const compte = eduClub({ modele: true, lignes, reglages, mode: 'individualise' })
  assert.equal(menuVisible(compte, 'tactipad', NOW), true)
  assert.equal(menuVisible(compte, 'mes_seances', NOW), true)
  const finie = eduClub({ modele: true, lignes: [{ outil: 'tactique', source: 'achat', fin_le: passe }], reglages })
  assert.equal(menuVisible(finie, 'tactipad', NOW), false)
})

test('Mon club, individualisé : le réglage individuel passe avant le commun', () => {
  const reglages = [commun('seances', false), perso('seances', true), perso('tactique', false)]
  const compte = eduClub({ mode: 'individualise', reglages })
  assert.equal(menuVisible(compte, 'mes_seances', NOW), true)
  assert.equal(menuVisible(compte, 'tactipad', NOW), false)
  assert.equal(menuVisible(compte, 'bibliotheque', NOW), true)
})

test('Mon club, même pour tous : les réglages individuels sont mis de côté', () => {
  const reglages = [commun('seances', false), perso('seances', true), perso('tactique', false)]
  const compte = eduClub({ mode: 'commun', reglages })
  assert.equal(menuVisible(compte, 'mes_seances', NOW), false)
  assert.equal(menuVisible(compte, 'tactipad', NOW), true)
  assert.equal(affichageDepuisLignes('commun', [perso('tactique', false)], MOI), null)
})

test('Mon club : un nouvel éducateur reçoit le réglage commun, jamais celui d\'un autre', () => {
  const reglages = [commun('prep_physique', false), perso('prep_physique', true, 'edu-2'), perso('tactique', false, 'edu-2')]
  const compte = eduClub({ mode: 'individualise', reglages })
  assert.equal(menuVisible(compte, 'prep_physique', NOW), false)
  assert.equal(menuVisible(compte, 'tactipad', NOW), true)
})

test('Mon club : l\'éducateur peut masquer en plus ce que le club affiche, pas l\'inverse', () => {
  const affiche = eduClub({ modele: true, lignes: fourniParClub, masques: ['projet_sportif'], reglages: [commun('projet_sportif', true)] })
  assert.equal(menuVisible(affiche, 'projet_sportif', NOW), false)
  const masque = eduClub({ modele: true, lignes: fourniParClub, reglages: [commun('projet_sportif', false)] })
  assert.equal(menuVisible(masque, 'projet_sportif', NOW), false)
})

test('Mon club : le socle et Statistiques (présence gratuite) ne se masquent jamais', () => {
  const reglages = ['suivi_joueurs', 'stats_collectives', 'seances', 'tactique', 'projet_sportif'].map(o => commun(o, false))
  const compte = eduClub({ reglages })
  for (const cle of ['accueil', 'profil', 'equipe', 'stats', 'matchs', 'entrainements', 'materiel', 'terrains', 'deplacements', 'clotures_saison']) {
    assert.equal(menuVisible(compte, cle, NOW), true, cle)
  }
  assert.equal(menuVisible(compte, 'sante', NOW), false)
  assert.equal(menuVisible(compte, 'notes', NOW), false)
})

test('Mon club : le réglage des éducateurs ne touche pas le menu du club', () => {
  const compte = compteDepuisLignes('club', false, [], [], [], affichageDepuisLignes('commun', [commun('projet_sportif', false)], MOI))
  assert.equal(menuVisible(compte, 'projet_sportif', NOW), true)
})
