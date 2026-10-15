// Migration des schémas tactiques — ÉTAPE 3.
// Remplace les schémas stockés en image dans la base (data URL PNG/JPEG,
// plusieurs centaines de Ko chacun) par un lien Cloudinary :
//   - bibliotheque_exercices.schema_png
//   - seances_uploadees.fiche_seance.procedes[].schema_png
// Les schémas SVG générés par l'IA et les liens déjà hébergés ne sont pas
// touchés. schema_data (édition Tactipad) ne change pas.
//
// Modes :
//   node scripts/migration-schemas/migrer.mjs              → SIMULATION (rien n'est envoyé ni écrit)
//   node scripts/migration-schemas/migrer.mjs --essai      → 3 procédés + 1 fiche
//   node scripts/migration-schemas/migrer.mjs --complet    → tout le reste
//
// Garde-fous :
//   - nom fixe sur Cloudinary (migr_biblio_<id>, migr_fiche_<id>_<n>) : relancer
//     ne crée pas de doublon, une ligne déjà migrée est ignorée ;
//   - une ligne n'est modifiée que si elle n'a pas changé depuis sa lecture ;
//   - chaque modification est journalisée (journal-migration-<date>.jsonl dans
//     ~/digital-football-sauvegardes) ; restauration : restaurer.mjs.

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { clientSupabaseService, configurerCloudinary, toutesLesLignes, IMAGE_EN_BASE, DOSSIER_SAUVEGARDES, ko, horodatage } from './_commun.mjs'

const mode = process.argv.includes('--complet') ? 'complet' : process.argv.includes('--essai') ? 'essai' : 'simulation'
console.log(`Mode : ${mode.toUpperCase()}${mode === 'simulation' ? ' (aucun envoi, aucune écriture)' : ''}`)

const db = clientSupabaseService()
const cloudinary = mode === 'simulation' ? null : configurerCloudinary()

mkdirSync(DOSSIER_SAUVEGARDES, { recursive: true })
const journal = join(DOSSIER_SAUVEGARDES, `journal-migration-${mode}-${horodatage()}.jsonl`)
const noter = (entree) => { if (mode !== 'simulation') appendFileSync(journal, JSON.stringify({ date: new Date().toISOString(), ...entree }) + '\n') }

const envoyer = async (dataUrl, proprietaire, publicId) => {
  const r = await cloudinary.uploader.upload(dataUrl, {
    folder: `digital-football/${proprietaire}/schema`, public_id: publicId,
    overwrite: true, resource_type: 'image',
  })
  return r.secure_url
}

// ── Lecture de ce qui reste à migrer ─────────────────────────────────────────
const procedes = (await toutesLesLignes(db, 'bibliotheque_exercices', 'id, nom, educateur_id, updated_at, schema_png',
  q => q.like('schema_png', 'data:image/%'))).filter(p => IMAGE_EN_BASE.test(p.schema_png || ''))
const fiches = (await toutesLesLignes(db, 'seances_uploadees', 'id, theme, date_seance, educateur_id, fiche_seance'))
  .map(f => ({ ...f, indexes: (f.fiche_seance?.procedes || []).map((p, i) => (IMAGE_EN_BASE.test(p?.schema_png || '') ? i : -1)).filter(i => i >= 0) }))
  .filter(f => f.indexes.length)

const nbSchemasFiches = fiches.reduce((s, f) => s + f.indexes.length, 0)
const poidsBiblio = procedes.reduce((s, p) => s + ko(p.schema_png), 0)
const poidsFiches = fiches.reduce((s, f) => s + f.indexes.reduce((t, i) => t + ko(f.fiche_seance.procedes[i].schema_png), 0), 0)
console.log(`\nReste à migrer : ${procedes.length} procédés (${(poidsBiblio / 1024).toFixed(1)} Mo) + ${nbSchemasFiches} schémas dans ${fiches.length} fiches (${(poidsFiches / 1024).toFixed(1)} Mo)`)

const selProcedes = mode === 'essai' ? procedes.slice(0, 3) : procedes
const selFiches = mode === 'essai' ? fiches.slice(0, 1) : fiches

if (mode === 'simulation') {
  console.log('\nExemples de ce qui serait migré :')
  selProcedes.slice(0, 5).forEach(p => console.log(`  Bibliothèque  ${p.id}  « ${p.nom || 'sans nom'} »  ${ko(p.schema_png)} Ko`))
  selFiches.slice(0, 5).forEach(f => console.log(`  Fiche         ${f.id}  « ${f.theme || 'sans thème'} » ${f.date_seance || ''}  ${f.indexes.length} schéma(s)`))
  console.log('\nSimulation terminée : rien n\'a été envoyé ni modifié.')
  console.log('Essai : node scripts/migration-schemas/migrer.mjs --essai')
  process.exit(0)
}

let ok = 0, ignores = 0, erreurs = 0

// ── Bibliothèque ─────────────────────────────────────────────────────────────
for (const p of selProcedes) {
  try {
    const lien = await envoyer(p.schema_png, p.educateur_id, `migr_biblio_${p.id}`)
    let q = db.from('bibliotheque_exercices').update({ schema_png: lien }).eq('id', p.id)
    q = p.updated_at == null ? q.is('updated_at', null) : q.eq('updated_at', p.updated_at)
    const { data, error } = await q.select('id')
    if (error) throw error
    if (!data?.length) { ignores++; console.log(`  ignoré (modifié entre-temps)  Bibliothèque ${p.id}`); continue }
    noter({ table: 'bibliotheque_exercices', id: p.id, lien, ko: ko(p.schema_png) })
    ok++; console.log(`  OK  Bibliothèque ${p.id}  « ${p.nom || 'sans nom'} »  → ${lien}`)
  } catch (e) { erreurs++; console.log(`  ERREUR  Bibliothèque ${p.id} : ${e.message}`) }
}

// ── Fiches de séance ─────────────────────────────────────────────────────────
for (const f of selFiches) {
  try {
    const procedesFiche = [...f.fiche_seance.procedes]
    const liens = {}
    for (const i of f.indexes) {
      liens[i] = await envoyer(procedesFiche[i].schema_png, f.educateur_id, `migr_fiche_${f.id}_${i}`)
      procedesFiche[i] = { ...procedesFiche[i], schema_png: liens[i] }
    }
    // Relecture juste avant l'écriture : on n'écrase jamais une fiche modifiée
    // depuis sa lecture par ce script.
    const { data: actuelle, error: e1 } = await db.from('seances_uploadees').select('fiche_seance').eq('id', f.id).maybeSingle()
    if (e1) throw e1
    if (JSON.stringify(actuelle?.fiche_seance) !== JSON.stringify(f.fiche_seance)) { ignores++; console.log(`  ignorée (modifiée entre-temps)  Fiche ${f.id}`); continue }
    const { error: e2 } = await db.from('seances_uploadees').update({ fiche_seance: { ...f.fiche_seance, procedes: procedesFiche } }).eq('id', f.id)
    if (e2) throw e2
    noter({ table: 'seances_uploadees', id: f.id, liens })
    ok++; console.log(`  OK  Fiche ${f.id}  « ${f.theme || 'sans thème'} » ${f.date_seance || ''}  ${f.indexes.length} schéma(s)`)
  } catch (e) { erreurs++; console.log(`  ERREUR  Fiche ${f.id} : ${e.message}`) }
}

console.log(`\nTerminé : ${ok} ligne(s) migrée(s), ${ignores} ignorée(s), ${erreurs} erreur(s).`)
console.log(`Journal : ${journal}`)
if (mode === 'essai') console.log('\nVérifie ces éléments dans l\'application avant de lancer --complet.')
