// Migration des schémas tactiques — ÉTAPE 2 : SAUVEGARDE (lecture seule).
//
// N'écrit RIEN en base. Exporte, pour tous les comptes, les valeurs que la
// migration (étape 3) pourrait modifier, dans un dossier HORS du dépôt Git :
//   ~/digital-football-sauvegardes/schemas-<date>/
//     bibliotheque_exercices.jsonl  (id, updated_at, schema_png)
//     seances_uploadees.jsonl       (id, fiche_seance complète)
//     resume.json                   (volumes, empreintes SHA-256 des fichiers)
// Le résumé indique aussi combien de schémas sont stockés en image dans la
// base (PNG/JPEG) et leur poids : c'est ce qui partira sur Cloudinary.
//
// Usage (la clé reste dans ton terminal, elle n'est jamais écrite ni affichée) :
//   export SUPABASE_SERVICE_ROLE_KEY='...'
//   node scripts/migration-schemas/sauvegarde.mjs

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const lireEnvLocal = () => {
  try {
    return Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
      .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]))
  } catch { return {} }
}

const env = lireEnvLocal()
const URL_SUPABASE = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SUPABASE) { console.error('URL Supabase introuvable (.env.local VITE_SUPABASE_URL).'); process.exit(1) }
if (!CLE) { console.error('SUPABASE_SERVICE_ROLE_KEY absente : fais `export SUPABASE_SERVICE_ROLE_KEY=...` dans ce terminal.'); process.exit(1) }

// Type de la clé (jamais la clé elle-même) : la sauvegarde doit lire les
// données de TOUS les comptes, seule la clé secrète le permet. Avec la clé
// publique, les règles d'accès s'appliquent (erreur « permission denied for
// table profiles », ou lecture partielle sans erreur).
const typeCle = (() => {
  if (CLE.startsWith('sb_')) return CLE.split('_').slice(0, 2).join('_') // sb_secret / sb_publishable
  try { return JSON.parse(Buffer.from(CLE.split('.')[1], 'base64url').toString()).role || 'inconnu' } catch { return 'illisible' }
})()
console.log(`Type de clé détecté : ${typeCle}`)
if (!['service_role', 'sb_secret'].includes(typeCle)) {
  console.error(`\nCe n'est pas la clé secrète (type « ${typeCle} »). Dans Supabase → Project Settings → API Keys, copie la clé « service_role » (ou « secret », sb_secret_…), pas la clé « anon »/« publishable », puis refais l'export.`)
  process.exit(1)
}

const db = createClient(URL_SUPABASE, CLE, { auth: { persistSession: false, autoRefreshToken: false } })
const IMAGE_EN_BASE = /^data:image\/(png|jpe?g|webp);base64,/i
const PAGE = 100 // petites pages : une fiche peut peser plusieurs Mo

const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dossier = join(homedir(), 'digital-football-sauvegardes', `schemas-${horodatage}`)
mkdirSync(dossier, { recursive: true })

async function exporter(table, colonnes, fichier, compter) {
  const chemin = join(dossier, fichier)
  writeFileSync(chemin, '')
  let lignes = 0
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await db.from(table).select(colonnes).order('id').range(debut, debut + PAGE - 1)
    if (error) throw new Error(`${table} : ${error.message}`)
    if (!data.length) break
    appendFileSync(chemin, data.map(r => JSON.stringify(r)).join('\n') + '\n')
    data.forEach(compter)
    lignes += data.length
    process.stdout.write(`\r${table} : ${lignes} lignes`)
    if (data.length < PAGE) break
  }
  process.stdout.write('\n')
  return { chemin, lignes, sha256: createHash('sha256').update(readFileSync(chemin)).digest('hex') }
}

const stats = { biblio: { images: 0, octets: 0 }, fiches: { fichesConcernees: 0, images: 0, octets: 0 } }
const poids = (v) => Math.round((v.length - v.indexOf(',') - 1) * 3 / 4)

const biblio = await exporter('bibliotheque_exercices', 'id, updated_at, schema_png', 'bibliotheque_exercices.jsonl', (r) => {
  if (typeof r.schema_png === 'string' && IMAGE_EN_BASE.test(r.schema_png)) { stats.biblio.images++; stats.biblio.octets += poids(r.schema_png) }
})
const fiches = await exporter('seances_uploadees', 'id, fiche_seance', 'seances_uploadees.jsonl', (r) => {
  const procedes = r.fiche_seance?.procedes || []
  let n = 0
  for (const p of procedes) {
    if (typeof p?.schema_png === 'string' && IMAGE_EN_BASE.test(p.schema_png)) { n++; stats.fiches.octets += poids(p.schema_png) }
  }
  if (n) { stats.fiches.fichesConcernees++; stats.fiches.images += n }
})

const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`
const resume = {
  date: new Date().toISOString(),
  bibliotheque_exercices: { lignes: biblio.lignes, sha256: biblio.sha256, schemas_en_image: stats.biblio.images, poids: mo(stats.biblio.octets) },
  seances_uploadees: { lignes: fiches.lignes, sha256: fiches.sha256, fiches_avec_schemas_en_image: stats.fiches.fichesConcernees, schemas_en_image: stats.fiches.images, poids: mo(stats.fiches.octets) },
}
writeFileSync(join(dossier, 'resume.json'), JSON.stringify(resume, null, 2))

console.log('\nSauvegarde terminée (aucune écriture en base).')
console.log(`Dossier : ${dossier}`)
console.log(JSON.stringify(resume, null, 2))
