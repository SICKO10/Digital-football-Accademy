// Tests de src/lib/demandesSaison.js (circuit de demandes coach → club, données
// fictives en mémoire, aucun accès à la base). Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  saisonSuivante, saisonCibleDemande, estApresCloture, etapeDemandes, preparerDemandeCategorie,
} from '../src/lib/demandesSaison.js'

const octobre2026 = new Date(2026, 9, 31)
const aout2027 = new Date(2027, 7, 15)
const dem = (o) => ({ saison: '2027-2028', statut: 'en_attente', created_at: '2027-06-01', ...o })

test('saison visée par les demandes', () => {
  assert.equal(saisonSuivante('2026-2027'), '2027-2028')
  assert.equal(saisonCibleDemande(null, octobre2026), '2026-2027')
  // clôture faite en octobre 2026 : on vise déjà la saison suivante
  assert.equal(saisonCibleDemande('2026-2027', octobre2026), '2027-2028')
  // clôture faite en août 2027 (bascule déjà passée) : même saison visée
  assert.equal(saisonCibleDemande('2026-2027', aout2027), '2027-2028')
  assert.equal(saisonCibleDemande('2027-2028', aout2027), '2028-2029')
})

test('après clôture : seulement si la dernière clôture est récente', () => {
  assert.equal(estApresCloture(null, octobre2026), false)
  assert.equal(estApresCloture('2026-2027', octobre2026), true)
  assert.equal(estApresCloture('2026-2027', aout2027), true)
  assert.equal(estApresCloture('2026-2027', new Date(2028, 9, 1)), false)
})

test('coach qui arrive sans équipe : question 2 directement', () => {
  const r = etapeDemandes({ nbEquipes: 0, demandes: [], derniereClose: null, maintenant: octobre2026 })
  assert.equal(r.etape, 'categorie')
})

test('après clôture sans réponse : question 1 puis question 2', () => {
  const base = { nbEquipes: 0, derniereClose: '2026-2027', maintenant: octobre2026 }
  assert.equal(etapeDemandes({ ...base, demandes: [] }).etape, 'affiliation')
  const rester = dem({ type: 'affiliation', souhaite_rester: true })
  assert.equal(etapeDemandes({ ...base, demandes: [rester] }).etape, 'categorie')
  const cat = dem({ type: 'categorie', categorie_nom: 'U17', categorie_equipe: 'A' })
  const r = etapeDemandes({ ...base, demandes: [rester, cat] })
  assert.equal(r.etape, 'attente')
  assert.equal(r.enAttente.length, 2)
})

test('départ demandé : on attend, pas de question 2', () => {
  const depart = dem({ type: 'affiliation', souhaite_rester: false })
  const r = etapeDemandes({ nbEquipes: 0, demandes: [depart], derniereClose: '2026-2027', maintenant: octobre2026 })
  assert.equal(r.etape, 'attente')
})

test('demande de catégorie refusée : la question revient avec le refus', () => {
  const rester = dem({ type: 'affiliation', souhaite_rester: true, statut: 'validee' })
  const refus = dem({ type: 'categorie', categorie_nom: 'U17', categorie_equipe: 'A', statut: 'refusee', commentaire: 'Déjà pourvu' })
  const r = etapeDemandes({ nbEquipes: 0, demandes: [rester, refus], derniereClose: '2026-2027', maintenant: octobre2026 })
  assert.equal(r.etape, 'categorie')
  assert.equal(r.refusee.commentaire, 'Déjà pourvu')
})

test('demandes annulées ou d\'une autre saison ignorées', () => {
  const vieille = dem({ type: 'categorie', categorie_nom: 'U17', categorie_equipe: 'A', saison: '2026-2027' })
  const annulee = dem({ type: 'affiliation', souhaite_rester: true, statut: 'annulee' })
  const r = etapeDemandes({ nbEquipes: 0, demandes: [vieille, annulee], derniereClose: '2026-2027', maintenant: octobre2026 })
  assert.equal(r.etape, 'affiliation')
})

test('coach avec équipe : rien, sauf demande en attente ou ajout d\'équipe', () => {
  const cat = dem({ type: 'categorie', categorie_nom: 'U15', categorie_equipe: 'B', saison: '2026-2027' })
  assert.equal(etapeDemandes({ nbEquipes: 1, demandes: [], derniereClose: null, maintenant: octobre2026 }).etape, 'aucune')
  assert.equal(etapeDemandes({ nbEquipes: 1, demandes: [cat], derniereClose: null, maintenant: octobre2026 }).etape, 'attente')
  assert.equal(etapeDemandes({ nbEquipes: 1, ajoutOuvert: true, demandes: [], derniereClose: null, maintenant: octobre2026 }).etape, 'categorie')
})

test('préparer la demande de catégorie', () => {
  const cats = [
    { id: 'a', nom: 'U17', equipe: 'A', educateur_id: null },
    { id: 'b', nom: 'U15', equipe: 'A', educateur_id: 'autre' },
    { id: 'c', nom: 'U13', equipe: 'A', educateur_id: 'moi' },
  ]
  const p = (nom, equipe) => preparerDemandeCategorie({ clubCategories: cats, userId: 'moi', nom, equipe })
  assert.deepEqual(p('U17', 'A'), { club_categorie_id: 'a' })
  assert.deepEqual(p('u17', 'a'), { club_categorie_id: 'a' })
  assert.ok(p('U15', 'A').erreur)
  assert.ok(p('U13', 'A').erreur)
  assert.deepEqual(p('U12', 'B'), { club_categorie_id: null })
})

// ── Côté club (bloc 7) ──
import { roleCouvreCategorie, libelleValideurs, actionsDemandeClub, notificationCoach, categoriePourDroit } from '../src/lib/demandesSaison.js'

test('roleCouvreCategorie : mêmes règles que la base', () => {
  assert.equal(roleCouvreCategorie('directeur_sportif', 'U17'), true)
  assert.equal(roleCouvreCategorie('president', 'Vétérans'), true)
  assert.equal(roleCouvreCategorie('responsable_preformation', 'U17'), false)
  assert.equal(roleCouvreCategorie('responsable_preformation', 'U13'), true)
  assert.equal(roleCouvreCategorie('responsable_preformation', 'U13F'), true)
  assert.equal(roleCouvreCategorie('responsable_formation', 'Seniors'), true)
  assert.equal(roleCouvreCategorie('responsable_formation', 'U14'), false)
  assert.equal(roleCouvreCategorie('responsable_ecole_foot', 'U10'), true)
  assert.equal(roleCouvreCategorie('responsable_ecole_foot', 'U11'), false)
  assert.equal(roleCouvreCategorie('secretaire', 'U9'), false)
  assert.equal(roleCouvreCategorie('responsable_formation', 'Vétérans'), false)
})

test('roleCouvreCategorie : une affiliation (sans catégorie) ne passe que par les rôles larges', () => {
  assert.equal(roleCouvreCategorie('responsable_formation', null), true)
  assert.equal(roleCouvreCategorie('directeur_sportif', null), true)
  assert.equal(roleCouvreCategorie('responsable_preformation', null), false)
  assert.equal(roleCouvreCategorie('secretaire', null), false)
})

test('libelleValideurs : compte principal d\'abord, puis les rôles concernés', () => {
  const libelleRole = (r) => ({ directeur_sportif: 'Directeur sportif', responsable_preformation: 'Responsable Préformation', secretaire: 'Secrétaire' })[r] || r
  const staff = [
    { role: 'directeur_sportif', membre: { prenom: 'Marie', nom: 'Dupont' } },
    { role: 'responsable_preformation', membre: { prenom: 'Paul', nom: 'Roux' } },
    { role: 'secretaire', membre: { prenom: 'Léa', nom: 'Petit' } },
  ]
  assert.equal(
    libelleValideurs({ staff, categorie: 'U17', libelleRole }),
    'le compte principal du club, Marie Dupont (Directeur sportif)'
  )
  assert.equal(
    libelleValideurs({ staff, categorie: 'U12', libelleRole }),
    'le compte principal du club, Marie Dupont (Directeur sportif), Paul Roux (Responsable Préformation)'
  )
  assert.equal(libelleValideurs({ staff: [], categorie: 'U12', libelleRole }), 'le compte principal du club')
})

test('actionsDemandeClub : valider, départ, propre demande, rôle non autorisé', () => {
  const cat = { type: 'categorie', educateur_id: 'coach', categorie_nom: 'U17' }
  const rester = { type: 'affiliation', educateur_id: 'coach', souhaite_rester: true }
  const partir = { type: 'affiliation', educateur_id: 'coach', souhaite_rester: false }
  assert.equal(actionsDemandeClub({ demande: cat, peutValider: true, userId: 'club' }), 'valider')
  assert.equal(actionsDemandeClub({ demande: rester, peutValider: true, userId: 'club' }), 'valider')
  assert.equal(actionsDemandeClub({ demande: partir, peutValider: true, userId: 'club' }), 'confirmer_depart')
  assert.equal(actionsDemandeClub({ demande: cat, peutValider: false, userId: 'club' }), 'refuse')
  assert.equal(actionsDemandeClub({ demande: cat, peutValider: true, userId: 'coach' }), 'propre')
})

test('categoriePourDroit : vide pour une affiliation', () => {
  assert.equal(categoriePourDroit({ type: 'affiliation' }), null)
  assert.equal(categoriePourDroit({ type: 'categorie', categorie_nom: 'U15' }), 'U15')
})

test('notificationCoach : messages de validation, de refus et de départ', () => {
  const cat = { type: 'categorie', categorie_nom: 'U15', categorie_equipe: 'A' }
  assert.deepEqual(notificationCoach({ demande: cat, decision: 'validee' }), { titre: 'Demande acceptée', contenu: 'Le club a accepté ta demande pour U15 équipe A.' })
  assert.equal(notificationCoach({ demande: cat, decision: 'refusee' }).titre, 'Demande refusée')
  assert.equal(notificationCoach({ demande: { type: 'affiliation', souhaite_rester: false }, decision: 'validee' }).titre, 'Départ confirmé')
})
