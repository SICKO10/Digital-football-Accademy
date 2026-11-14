import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  regrouperJoueurs, proposerEquipe, equipeAutorisee, texteRaison, ficheRetenue, joueursSansEquipe,
  construireRepartition, resumeRepartition, resumeFusion, texteLienReste,
} from '../src/lib/categoriesMode.js'

const equipes = [{ id: 'B', nom: 'U15', equipe: 'B', educateur_id: 'eB' }, { id: 'A', nom: 'U15', equipe: 'A', educateur_id: 'eA' }, { id: 'C', nom: 'U15', equipe: 'C', educateur_id: 'eC' }]
const fiche = (o) => ({ convocations: {}, presences: {}, created_at: '2026-09-01', ...o })

test('regroupe les fiches par compte, une fiche sans compte = un joueur', () => {
  const j = regrouperJoueurs([
    fiche({ fiche_id: '1', joueur_id: 'p1', prenom: 'Lucas', nom: 'Moreau', equipe_id: 'A', created_at: '2026-10-01' }),
    fiche({ fiche_id: '2', joueur_id: 'p1', prenom: 'Lucas', nom: 'Moreau', equipe_id: 'B', created_at: '2026-09-01' }),
    fiche({ fiche_id: '3', joueur_id: null, prenom: 'Hugo', nom: 'Petit', equipe_id: 'A' }),
    fiche({ fiche_id: '4', joueur_id: null, prenom: 'Hugo', nom: 'Petit', equipe_id: 'B' }),
  ])
  assert.equal(j.length, 3)
  const lucas = j.find(x => x.cle === 'compte:p1')
  assert.equal(lucas.fiches.length, 2)
  assert.equal(lucas.principale.fiche_id, '2')
})

test('propose l\'équipe la plus convoquée, puis la plus fréquentée, puis l\'actuelle', () => {
  const [conv] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: 'p1', equipe_id: 'A', convocations: { A: 1, B: 3 }, presences: { A: 9 } })])
  assert.deepEqual(proposerEquipe(conv, equipes), { equipe_id: 'B', raison: { type: 'convocations', n: 3 } })

  const [pres] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: null, equipe_id: 'A', presences: { C: 4, A: 2 } })])
  assert.deepEqual(proposerEquipe(pres, equipes), { equipe_id: 'C', raison: { type: 'presences', n: 4 } })

  const [rien] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: null, equipe_id: 'C' })])
  assert.deepEqual(proposerEquipe(rien, equipes), { equipe_id: 'C', raison: { type: 'actuelle' } })
})

test('égalité de convocations : les présences départagent, puis l\'équipe de sa fiche', () => {
  const [a] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: 'p', equipe_id: 'C', convocations: { A: 2, B: 2 }, presences: { B: 1 } })])
  assert.equal(proposerEquipe(a, equipes).equipe_id, 'B')
  const [b] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: 'p', equipe_id: 'B', convocations: { A: 2, B: 2 } })])
  assert.equal(proposerEquipe(b, equipes).equipe_id, 'B')
})

test('équipe inconnue et aucune donnée : pas de proposition', () => {
  const [j] = regrouperJoueurs([fiche({ fiche_id: '1', joueur_id: null, equipe_id: 'Z' })])
  assert.deepEqual(proposerEquipe(j, equipes), { equipe_id: null, raison: null })
  assert.deepEqual(proposerEquipe(j, []), { equipe_id: null, raison: null })
})

test('texte de la proposition', () => {
  assert.equal(texteRaison({ type: 'convocations', n: 3 }, equipes[0]), 'Proposé : 3 convocations en U15 B cette saison')
  assert.equal(texteRaison({ type: 'presences', n: 1 }, equipes[1]), 'Proposé : 1 entraînement en U15 A cette saison')
  assert.equal(texteRaison({ type: 'actuelle' }, equipes[2]), 'Proposé : équipe de sa fiche (U15 C)')
  assert.equal(texteRaison(null, equipes[0]), '')
})

test('fiche envoyée : celle déjà dans l\'équipe choisie, sinon la plus ancienne', () => {
  const [j] = regrouperJoueurs([
    fiche({ fiche_id: '1', joueur_id: 'p', equipe_id: 'A', created_at: '2026-09-01' }),
    fiche({ fiche_id: '2', joueur_id: 'p', equipe_id: 'B', created_at: '2026-10-01' }),
  ])
  assert.equal(ficheRetenue(j, 'B').fiche_id, '2')
  assert.equal(ficheRetenue(j, 'C').fiche_id, '1')
})

test('bloque tant qu\'un joueur n\'a pas d\'équipe valable, puis construit la répartition', () => {
  const joueurs = regrouperJoueurs([
    fiche({ fiche_id: '1', joueur_id: 'p1', prenom: 'Ana', equipe_id: 'A' }),
    fiche({ fiche_id: '2', joueur_id: null, prenom: 'Bob', equipe_id: 'B' }),
  ])
  assert.equal(joueursSansEquipe(joueurs, { 'compte:p1': 'A' }, equipes).length, 1)
  assert.equal(joueursSansEquipe(joueurs, { 'compte:p1': 'A', 'fiche:2': 'Z' }, equipes).length, 1)
  const choix = { 'compte:p1': 'A', 'fiche:2': 'C' }
  assert.equal(joueursSansEquipe(joueurs, choix, equipes).length, 0)
  assert.deepEqual(construireRepartition(joueurs, choix), [{ fiche_id: '1', equipe_id: 'A' }, { fiche_id: '2', equipe_id: 'C' }])
})

test('résumé : effectif par équipe, changements d\'équipe et fiches gardées', () => {
  const joueurs = regrouperJoueurs([
    fiche({ fiche_id: '1', joueur_id: 'p1', prenom: 'Ana', equipe_id: 'A' }),
    fiche({ fiche_id: '2', joueur_id: null, prenom: 'Bob', equipe_id: 'B' }),
    fiche({ fiche_id: '3', joueur_id: 'p3', prenom: 'Cleo', equipe_id: 'A', created_at: '2026-08-01' }),
    fiche({ fiche_id: '4', joueur_id: 'p3', prenom: 'Cleo', equipe_id: 'B' }),
  ])
  const r = resumeRepartition(joueurs, { 'compte:p1': 'A', 'fiche:2': 'C', 'compte:p3': 'B' }, equipes)
  assert.deepEqual(r.parEquipe.map(x => [x.equipe.id, x.nb]), [['B', 1], ['A', 1], ['C', 1]])
  assert.deepEqual(r.changements.map(c => [c.nom, c.avant.id, c.apres.id]), [['Bob', 'B', 'C']])
  assert.equal(r.fichesGardees, 1)
})

test('fusion : un compte présent dans deux équipes compte une fois', () => {
  const r = resumeFusion([
    fiche({ fiche_id: '1', joueur_id: 'p1', equipe_id: 'A' }),
    fiche({ fiche_id: '2', joueur_id: 'p1', equipe_id: 'B' }),
    fiche({ fiche_id: '3', joueur_id: null, prenom: 'Hugo', nom: 'Petit', equipe_id: 'B' }),
    fiche({ fiche_id: '5', joueur_id: null, prenom: 'Hugo', nom: 'Petit', equipe_id: 'A' }),
  ], equipes)
  assert.deepEqual(r.parEquipe.map(x => [x.equipe.id, x.nb]), [['B', 2], ['A', 2], ['C', 0]])
  assert.equal(r.total, 3)
  assert.deepEqual(r.doublons, [{ nom: 'Hugo Petit', nb: 2 }])
})

test('texte des liens qui n\'ont pas suivi', () => {
  assert.equal(texteLienReste({ prenom: 'Lucas', nom: 'Moreau', equipe: 'U15 B', raison: 'equipe_sans_coach' }),
    'Lucas Moreau : U15 B n\'a pas d\'éducateur : il reste rattaché à son ancien éducateur.')
  assert.match(texteLienReste({ prenom: 'Zoe', nom: 'Bleu', raison: 'deja_lie' }), /^Zoe Bleu : il a déjà un lien/)
  assert.match(texteLienReste({ prenom: 'Tom', raison: 'inconnue' }), /^Tom : son lien/)
})

test('équipe sans éducateur : seulement pour les joueurs qui y sont déjà', () => {
  const sansCoach = { id: 'D', nom: 'U15', equipe: 'D', educateur_id: null }
  const [dedans, dehors] = regrouperJoueurs([
    fiche({ fiche_id: '1', joueur_id: null, prenom: 'Ana', equipe_id: 'D' }),
    fiche({ fiche_id: '2', joueur_id: null, prenom: 'Bob', equipe_id: 'A' }),
  ])
  assert.equal(equipeAutorisee(dedans, sansCoach), true)
  assert.equal(equipeAutorisee(dehors, sansCoach), false)
  assert.equal(equipeAutorisee(dehors, equipes[0]), true)
  assert.equal(joueursSansEquipe([dedans, dehors], { 'fiche:1': 'D', 'fiche:2': 'D' }, [...equipes, sansCoach]).length, 1)
})
