// Tests de src/lib/statsSaison.js : données fictives en mémoire, aucun accès à la base.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  statsJoueur, tauxPresenceJoueur, noteMoyenneJoueur, noteEquipe,
  lignesJoueurs, classement, minutesSaisies, presenceMoyenneEquipe, resumeSante,
  pourcentageVictoires, afficherCleanSheets,
} from '../src/lib/statsSaison.js'

const matchs = [
  { id: 'm1', score_nous: 2, score_eux: 0, stats_match: [
    { joueur_id: 'a', minutes: 90, buts: 2, passes_dec: 0, clean_sheet: false, carton_jaune: true },
    { joueur_id: 'g', minutes: 90, clean_sheet: true },
  ] },
  { id: 'm2', score_nous: 1, score_eux: 3, stats_match: [
    { joueur_id: 'a', minutes: 60, buts: 1, passes_dec: 1, carton_rouge: true },
    { joueur_id: 'b', minutes: 0 },
  ] },
]

test('totaux joueur : minutes, buts, cartons, victoires', () => {
  assert.deepEqual(statsJoueur('a', matchs), {
    matchs: 2, minutes: 150, buts: 3, passes_dec: 1, clean_sheets: 0, cartons_j: 1, cartons_r: 1, victoires: 1,
  })
  assert.equal(statsJoueur('g', matchs).clean_sheets, 1)
  assert.equal(statsJoueur('b', matchs).matchs, 0)
})

test('présence : saisie du coach, repli sur le sondage, séances à venir exclues', () => {
  const seances = [
    { id: 's1', date: '2026-09-01', presences_entrainement: [{ joueur_id: 'a', statut: 'present' }] },
    { id: 's2', date: '2026-09-08', presences_entrainement: [{ joueur_id: 'a', statut: 'absent' }] },
    { id: 's3', date: '2026-09-15', presences_entrainement: [] },
    { id: 's4', date: '2099-01-01', presences_entrainement: [{ joueur_id: 'a', statut: 'present' }] },
  ]
  const joueur = { id: 'a', joueur_id: 'p1' }
  const dispos = { s3: { p1: 'present' } }
  assert.deepEqual(tauxPresenceJoueur(joueur, seances, dispos, '2026-10-01'), { taux: 67, total: 3 })
  assert.equal(tauxPresenceJoueur({ id: 'z' }, seances, {}, '2026-10-01'), null)
})

test('notes : joueur et équipe séparés', () => {
  const notations = [
    { joueur_id: 'a', note: 7 }, { joueur_id: 'a', note: 8 },
    { joueur_id: null, note: 6, est_note_equipe: true },
  ]
  assert.deepEqual(noteMoyenneJoueur('a', notations), { moyenne: 7.5, nb: 2 })
  assert.equal(noteMoyenneJoueur('b', notations), null)
  assert.deepEqual(noteEquipe(notations), { moyenne: '6.0', nb: 1 })
})

test('classement : tri décroissant, zéros écartés', () => {
  const lignes = lignesJoueurs({ joueurs: [{ id: 'a' }, { id: 'b' }, { id: 'g' }], matchs, entrainements: [], dispos: {}, notations: [] })
  assert.deepEqual(classement(lignes, 'buts').map(x => [x.ligne.id, x.valeur]), [['a', 3]])
  assert.deepEqual(classement(lignes, 'minutes').map(x => x.ligne.id), ['a', 'g'])
  assert.equal(classement(lignes, 'presence').length, 0)
})

test('minutes non saisies et présence moyenne', () => {
  assert.equal(minutesSaisies([{ s: { minutes: 0 } }]), false)
  assert.equal(minutesSaisies([{ s: { minutes: 0 } }, { s: { minutes: 12 } }]), true)
  assert.equal(presenceMoyenneEquipe([{ tx: { taux: 100 } }, { tx: { taux: 50 } }, { tx: null }]), 75)
  assert.equal(presenceMoyenneEquipe([{ tx: null }]), null)
})

test('résumé santé', () => {
  const r = resumeSante([
    { equipe_joueur_id: 'a', statut: 'gueri' }, { equipe_joueur_id: 'a', statut: 'en_cours' }, { equipe_joueur_id: 'b', statut: 'en_cours' },
  ])
  assert.deepEqual(r, { total: 3, gueries: 1, enCours: 2, joueursTouches: 2 })
})

test('pourcentage de victoires et ligne clean sheets', () => {
  assert.equal(pourcentageVictoires({ matchs: 4, victoires: 3 }), 75)
  assert.equal(pourcentageVictoires({ matchs: 0, victoires: 0 }), null)
  assert.equal(afficherCleanSheets({ s: { clean_sheets: 2 }, poste: 'Milieu' }), true)
  assert.equal(afficherCleanSheets({ s: { clean_sheets: 0 }, poste: 'Gardien de but' }), true)
  assert.equal(afficherCleanSheets({ s: { clean_sheets: 0 }, poste: 'Attaquant' }), false)
  assert.equal(afficherCleanSheets({ s: { clean_sheets: 0 } }), false)
})

import { bilanSaisonEquipe } from '../src/lib/statsSaison.js'

test('bilan de saison d\'une équipe : pourcentages, buts par match, natures, présence, RPE', () => {
  const b = bilanSaisonEquipe({
    matchs: [
      { score_nous: 3, score_eux: 1, competition: 'Championnat', buts_detail: [{ equipe: 'nous', nature: 'cpa' }, { equipe: 'nous', nature: 'attaque_rapide' }, { equipe: 'eux', nature: 'cpa' }] },
      { score_nous: 1, score_eux: 1, competition: 'Championnat', buts_detail: [{ equipe: 'nous', nature: 'cpa' }] },
      { score_nous: 0, score_eux: 2, competition: 'Coupe' },
      { score_nous: null, score_eux: null },
    ],
    entrainements: [
      { date: '2026-09-01', presences_entrainement: [{ statut: 'present' }, { statut: 'absent' }, { statut: 'convoque' }, { statut: 'present' }] },
      { date: '2999-01-01', presences_entrainement: [{ statut: 'absent' }] },
    ],
    blessures: [{ equipe_joueur_id: 'a', statut: 'gueri' }, { equipe_joueur_id: 'b', statut: 'en_cours' }],
    rpes: [6, 7, 8],
    aujourdHui: '2026-10-01',
  })
  assert.equal(b.matchs, 3)
  assert.deepEqual([b.victoires, b.nuls, b.defaites], [33, 33, 33])
  assert.equal(b.butsMarquesParMatch, 1.33)
  assert.equal(b.butsEncaissesParMatch, 1.33)
  assert.deepEqual(b.natures.map(x => [x.cle, x.pct]), [['cpa', 67], ['attaque_rapide', 33]])
  assert.deepEqual(b.parCompetition.map(c => [c.nom, c.matchs, c.v, c.n, c.d]), [['Championnat', 2, 1, 1, 0], ['Coupe', 1, 0, 0, 1]])
  assert.equal(b.presence, 75)
  assert.equal(b.sante.total, 2)
  assert.equal(b.rpeMoyen, 7)
})

test('bilan de saison sans aucune donnée : valeurs nulles, pas de division par zéro', () => {
  const b = bilanSaisonEquipe({ matchs: [], entrainements: [], blessures: [], rpes: [] })
  assert.equal(b.matchs, 0)
  assert.equal(b.victoires, null)
  assert.equal(b.presence, null)
  assert.equal(b.rpeMoyen, null)
})

test('filtre compétition : championnat, coupe, amical, casse et espaces ignorés', async () => {
  const { filtrerParCompetition } = await import('../src/lib/statsSaison.js')
  const liste = [
    { id: 1, competition: 'Championnat' }, { id: 2, competition: ' coupe ' },
    { id: 3, competition: 'Amical' }, { id: 4, competition: null },
  ]
  assert.deepEqual(filtrerParCompetition(liste, 'toutes').map(m => m.id), [1, 2, 3, 4])
  assert.deepEqual(filtrerParCompetition(liste, 'championnat').map(m => m.id), [1])
  assert.deepEqual(filtrerParCompetition(liste, 'coupe').map(m => m.id), [2])
  assert.deepEqual(filtrerParCompetition(liste, 'amical').map(m => m.id), [3])
})

test('vue d\'ensemble : on additionne les effectifs, pas les pourcentages', async () => {
  const { cumulerBilans } = await import('../src/lib/statsSaison.js')
  const c = cumulerBilans([
    { matchs: 10, nbV: 5, nbN: 3, nbD: 2, butsMarques: 20, butsEncaisses: 10, presents: 8, nbPresences: 10 },
    { matchs: 2, nbV: 2, nbN: 0, nbD: 0, butsMarques: 6, butsEncaisses: 0, presents: 1, nbPresences: 10 },
  ])
  assert.equal(c.matchs, 12)
  assert.deepEqual([c.victoires, c.nuls, c.defaites], [58, 25, 17])
  assert.equal(c.butsMarquesParMatch, 2.17)
  assert.equal(c.butsEncaissesParMatch, 0.83)
  assert.equal(c.presence, 45)
  assert.equal(cumulerBilans([]).victoires, null)
})
