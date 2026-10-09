// Tests de api/upload-image.js — sans réseau ni secret réel : vérificateur
// de jeton, configuration Cloudinary et accès aux données sont injectés.
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { v2 as cloudinary } from 'cloudinary'
import { creerHandler, USAGES } from '../api/upload-image.js'

const SECRET = 'secret-de-test-ne-doit-jamais-sortir'
const config = { cloud_name: 'cloud-test', api_key: 'cle-publique-test', api_secret: SECRET }

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const U = {
  joueur: id(1), autre: id(2), club: id(10), autreClub: id(11), clubOuvert: id(12),
  secretaire: id(20), directeurSportif: id(21), staffSansRole: id(22), marketing: id(23),
  eduAutorise: id(30), eduParDefaut: id(31), eduClubOuvert: id(32),
  parent: id(40), enfant: id(41), parentEnAttente: id(42),
}
const JETONS = Object.fromEntries(Object.entries(U).map(([nom, uid]) => [`jeton-${nom}`, { id: uid }]))

function donneesTest({ erreur = false } = {}) {
  const profils = {
    [U.club]: { plan: 'club', educateurs_editent_projet_sportif: false },
    [U.autreClub]: { plan: 'club', educateurs_editent_projet_sportif: false },
    [U.clubOuvert]: { plan: 'club', educateurs_editent_projet_sportif: true },
    [U.joueur]: { plan: 'joueur_starter' },
  }
  const staff = {
    [`${U.secretaire}|${U.club}`]: { role: 'secretaire' },
    [`${U.directeurSportif}|${U.club}`]: { role: 'directeur_sportif' },
    [`${U.staffSansRole}|${U.club}`]: { role: null },
    [`${U.marketing}|${U.club}`]: { role: 'marketing' },
  }
  // Le président a explicitement retiré l'édition du profil au marketing.
  const permissions = { [`${U.club}|marketing|profil`]: { can_view: true, can_edit: false } }
  const affiliations = {
    [`${U.eduAutorise}|${U.club}`]: { peut_editer_projet_sportif: true },
    [`${U.eduParDefaut}|${U.club}`]: { peut_editer_projet_sportif: null },
    [`${U.eduClubOuvert}|${U.clubOuvert}`]: { peut_editer_projet_sportif: null },
  }
  const parents = { [`${U.parent}|${U.enfant}`]: true }
  const garde = (f) => async (...a) => { if (erreur) throw new Error('panne base'); return f(...a) }
  return {
    profil: garde((cid) => profils[cid] || null),
    staffClub: garde((uid, cid) => staff[`${uid}|${cid}`] || null),
    permissionRole: garde((cid, role, section) => permissions[`${cid}|${role}|${section}`] || null),
    affiliationEducateur: garde((uid, cid) => affiliations[`${uid}|${cid}`] || null),
    parentAccepte: garde((p, j) => !!parents[`${p}|${j}`]),
  }
}

const reponse = () => {
  const r = { statut: null, corps: null }
  r.status = (s) => { r.statut = s; return r }
  r.json = (c) => { r.corps = c; return r }
  return r
}

async function appeler({ qui, corps = {}, methode = 'POST', donnees = donneesTest(), lireConfig = () => config, auth } = {}) {
  const handler = creerHandler({
    verifierJeton: async (j) => JETONS[j] || null, lireConfig, donnees, maintenant: () => 1_760_000_000_000,
  })
  const res = reponse()
  const entete = auth !== undefined ? auth : (qui ? `Bearer jeton-${qui}` : undefined)
  await handler({ method: methode, headers: entete ? { authorization: entete } : {}, body: corps }, res)
  return res
}

const refuse = (res, statut) => {
  assert.equal(res.statut, statut)
  assert.equal(res.corps.params, undefined, 'aucune signature ne doit être renvoyée')
}

// ── Accès anonymes et jetons ───────────────────────────────────────────────
test('anonyme : 401 sans signature', async () => {
  refuse(await appeler({ corps: { userId: U.joueur } }), 401)
})
test('jeton invalide ou en-tête mal formé : 401', async () => {
  refuse(await appeler({ auth: 'Bearer jeton-inconnu' }), 401)
  refuse(await appeler({ auth: `Token jeton-joueur` }), 401)
})
test('méthode autre que POST : 405', async () => {
  assert.equal((await appeler({ qui: 'joueur', methode: 'GET' })).statut, 405)
})

// ── Usurpation d'identité / paramètres manipulés ───────────────────────────
test('userId du corps ignoré : le dossier est celui du jeton', async () => {
  const res = await appeler({ qui: 'joueur', corps: { userId: U.autre, folder: `digital-football/${U.autre}` } })
  assert.equal(res.statut, 200)
  assert.equal(res.corps.params.folder, `digital-football/${U.joueur}/certifications`)
  assert.ok(!JSON.stringify(res.corps).includes(U.autre))
})
test("joueurId d'un autre joueur sans lien parent : 403", async () => {
  refuse(await appeler({ qui: 'joueur', corps: { usage: 'certifications', joueurId: U.autre } }), 403)
})
test('clubId ignoré pour un usage personnel (avatar) : dossier = soi', async () => {
  const res = await appeler({ qui: 'joueur', corps: { usage: 'avatar', clubId: U.club } })
  assert.equal(res.corps.params.folder, `digital-football/${U.joueur}/avatar`)
})
test('usage inconnu ou piégé : 400', async () => {
  for (const usage of ['raw', 'video', '__proto__', 'constructor', 'toString', '../club']) {
    refuse(await appeler({ qui: 'joueur', corps: { usage } }), 400)
  }
})
test('usage club sans clubId ou clubId mal formé : 400', async () => {
  refuse(await appeler({ qui: 'joueur', corps: { usage: 'theme' } }), 400)
  refuse(await appeler({ qui: 'joueur', corps: { usage: 'theme', clubId: '../../autre' } }), 400)
  refuse(await appeler({ qui: 'joueur', corps: { type: 'theme' } }), 400) // alias historique « type »
})

// ── Formats ────────────────────────────────────────────────────────────────
test('formats : documents (pdf) seulement là où prévu, jamais de SVG', async () => {
  for (const [usage, regle] of Object.entries(USAGES)) {
    assert.ok(!regle.formats.includes('svg'), usage)
    assert.equal(regle.formats.includes('pdf'), ['certifications', 'licence', 'feuille', 'seance'].includes(usage), usage)
  }
  const res = await appeler({ qui: 'club', corps: { usage: 'theme', clubId: U.club } })
  assert.equal(res.corps.params.allowed_formats, USAGES.theme.formats)
})
test('signature valide ; modifier allowed_formats ou le dossier la casse ; secret absent', async () => {
  const res = await appeler({ qui: 'joueur', corps: { usage: 'licence' } })
  const { signature, api_key, ...signes } = res.corps.params
  assert.equal(api_key, config.api_key)
  assert.equal(signature, cloudinary.utils.api_sign_request(signes, SECRET))
  assert.notEqual(signature, cloudinary.utils.api_sign_request({ ...signes, allowed_formats: 'svg,html' }, SECRET))
  assert.notEqual(signature, cloudinary.utils.api_sign_request({ ...signes, folder: `digital-football/${U.autre}/licence` }, SECRET))
  assert.ok(!JSON.stringify(res.corps).includes(SECRET))
})

// ── Parcours autorisés : soi-même ──────────────────────────────────────────
test('usages personnels (joueur, recruteur, éducateur) autorisés pour soi', async () => {
  for (const usage of ['certifications', 'avatar', 'licence', 'feuille', 'seance']) {
    const res = await appeler({ qui: 'joueur', corps: { usage } })
    assert.equal(res.statut, 200, usage)
    assert.equal(res.corps.params.folder, `digital-football/${U.joueur}/${usage}`)
  }
  const res = await appeler({ qui: 'joueur', corps: { usage: 'certifications', joueurId: U.joueur } })
  assert.equal(res.statut, 200)
})

// ── Club ───────────────────────────────────────────────────────────────────
test('le club lui-même : thème, avatar et projet sportif autorisés', async () => {
  for (const usage of ['theme', 'avatar_club', 'principe_photo', 'terrain_fond', 'terrain_galerie']) {
    const res = await appeler({ qui: 'club', corps: { usage, clubId: U.club } })
    assert.equal(res.statut, 200, usage)
    assert.equal(res.corps.params.folder, `digital-football/${U.club}/${usage}`)
  }
})
test("un utilisateur sans lien, ou un AUTRE club, ne peut pas écrire dans le dossier d'un club : 403", async () => {
  refuse(await appeler({ qui: 'joueur', corps: { usage: 'theme', clubId: U.club } }), 403)
  refuse(await appeler({ qui: 'autreClub', corps: { usage: 'theme', clubId: U.club } }), 403)
  refuse(await appeler({ qui: 'autreClub', corps: { usage: 'principe_photo', clubId: U.club } }), 403)
})
test('staff : mêmes droits que canEditSection (matrice par défaut + surcharges)', async () => {
  assert.equal((await appeler({ qui: 'secretaire', corps: { usage: 'theme', clubId: U.club } })).statut, 200) // profil : secretaire par défaut
  refuse(await appeler({ qui: 'secretaire', corps: { usage: 'principe_photo', clubId: U.club } }), 403) // sportif : non
  assert.equal((await appeler({ qui: 'directeurSportif', corps: { usage: 'terrain_galerie', clubId: U.club } })).statut, 200)
  refuse(await appeler({ qui: 'directeurSportif', corps: { usage: 'avatar_club', clubId: U.club } }), 403)
  assert.equal((await appeler({ qui: 'staffSansRole', corps: { usage: 'theme', clubId: U.club } })).statut, 200) // rôle absent => président
  refuse(await appeler({ qui: 'marketing', corps: { usage: 'theme', clubId: U.club } }), 403) // retiré explicitement
})
test('éducateur affilié : projet sportif seulement si le club (ou son override) l’autorise', async () => {
  assert.equal((await appeler({ qui: 'eduAutorise', corps: { usage: 'principe_photo', clubId: U.club } })).statut, 200)
  refuse(await appeler({ qui: 'eduAutorise', corps: { usage: 'theme', clubId: U.club } }), 403) // pas le profil club
  refuse(await appeler({ qui: 'eduParDefaut', corps: { usage: 'terrain_fond', clubId: U.club } }), 403) // club fermé
  assert.equal((await appeler({ qui: 'eduClubOuvert', corps: { usage: 'terrain_fond', clubId: U.clubOuvert } })).statut, 200)
  refuse(await appeler({ qui: 'eduClubOuvert', corps: { usage: 'terrain_fond', clubId: U.club } }), 403) // pas son club
})

// ── Parent ─────────────────────────────────────────────────────────────────
test('parent accepté : pièces de certification de son enfant uniquement', async () => {
  const res = await appeler({ qui: 'parent', corps: { usage: 'certifications', joueurId: U.enfant } })
  assert.equal(res.statut, 200)
  assert.equal(res.corps.params.folder, `digital-football/${U.enfant}/certifications`)
  refuse(await appeler({ qui: 'parent', corps: { usage: 'avatar', joueurId: U.enfant } }), 403)
  refuse(await appeler({ qui: 'parentEnAttente', corps: { usage: 'certifications', joueurId: U.enfant } }), 403)
  refuse(await appeler({ qui: 'parent', corps: { usage: 'certifications', joueurId: U.autre } }), 403)
})

// ── Pannes : jamais d'accès par défaut ─────────────────────────────────────
test('erreur de lecture des droits : 500 sans signature', async () => {
  refuse(await appeler({ qui: 'secretaire', corps: { usage: 'theme', clubId: U.club }, donnees: donneesTest({ erreur: true }) }), 500)
})
test('configuration Cloudinary absente : 500 sans signature', async () => {
  refuse(await appeler({ qui: 'joueur', lireConfig: () => null }), 500)
})
