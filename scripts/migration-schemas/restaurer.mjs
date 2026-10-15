// Migration des schémas tactiques — RETOUR ARRIÈRE.
// Remet, depuis une sauvegarde (étape 2), la valeur d'origine de chaque
// schéma migré — et UNIQUEMENT de ceux-là : seuls les liens créés par la
// migration (…/schema/migr_…) sont remplacés ; tout le reste des fiches et
// procédés (modifié ou non depuis) est laissé tel quel.
//
//   node scripts/migration-schemas/restaurer.mjs <dossier-de-sauvegarde>              → SIMULATION
//   node scripts/migration-schemas/restaurer.mjs <dossier-de-sauvegarde> --appliquer  → restaure

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clientSupabaseService, toutesLesLignes } from './_commun.mjs'

const dossier = process.argv.slice(2).find(a => !a.startsWith('--'))
const appliquer = process.argv.includes('--appliquer')
if (!dossier || !existsSync(join(dossier, 'resume.json'))) {
  console.error('Indique le dossier de sauvegarde, ex. : node scripts/migration-schemas/restaurer.mjs ~/digital-football-sauvegardes/schemas-2026-10-15T23-25-45')
  process.exit(1)
}

// Intégrité de la sauvegarde avant toute utilisation.
const resume = JSON.parse(readFileSync(join(dossier, 'resume.json'), 'utf8'))
const lire = (table) => {
  const brut = readFileSync(join(dossier, `${table}.jsonl`))
  if (createHash('sha256').update(brut).digest('hex') !== resume[table].sha256) { console.error(`Sauvegarde altérée : ${table}.jsonl ne correspond pas à son empreinte.`); process.exit(1) }
  return new Map(brut.toString().split('\n').filter(Boolean).map(l => JSON.parse(l)).map(r => [r.id, r]))
}
const sauvBiblio = lire('bibliotheque_exercices')
const sauvFiches = lire('seances_uploadees')
console.log(`Sauvegarde vérifiée (${sauvBiblio.size} procédés, ${sauvFiches.size} fiches). Mode : ${appliquer ? 'RESTAURATION' : 'SIMULATION (aucune écriture)'}`)

const db = clientSupabaseService()
const estMigre = (v) => typeof v === 'string' && /\/schema\/migr_/.test(v)
let aRestaurer = 0, faits = 0, erreurs = 0

for (const p of await toutesLesLignes(db, 'bibliotheque_exercices', 'id, schema_png', q => q.like('schema_png', '%/schema/migr_%'))) {
  const origine = sauvBiblio.get(p.id)?.schema_png
  if (!estMigre(p.schema_png) || !origine) continue
  aRestaurer++
  if (!appliquer) { console.log(`  à restaurer  Bibliothèque ${p.id}`); continue }
  const { error } = await db.from('bibliotheque_exercices').update({ schema_png: origine }).eq('id', p.id).eq('schema_png', p.schema_png)
  if (error) { erreurs++; console.log(`  ERREUR  Bibliothèque ${p.id} : ${error.message}`) } else { faits++; console.log(`  restauré  Bibliothèque ${p.id}`) }
}

for (const f of await toutesLesLignes(db, 'seances_uploadees', 'id, fiche_seance')) {
  const origine = sauvFiches.get(f.id)?.fiche_seance?.procedes || []
  const procedes = f.fiche_seance?.procedes || []
  const indexes = procedes.map((p, i) => (estMigre(p?.schema_png) && origine[i]?.schema_png ? i : -1)).filter(i => i >= 0)
  if (!indexes.length) continue
  aRestaurer++
  if (!appliquer) { console.log(`  à restaurer  Fiche ${f.id} (${indexes.length} schéma(s))`); continue }
  const nouveaux = procedes.map((p, i) => (indexes.includes(i) ? { ...p, schema_png: origine[i].schema_png } : p))
  const { error } = await db.from('seances_uploadees').update({ fiche_seance: { ...f.fiche_seance, procedes: nouveaux } }).eq('id', f.id)
  if (error) { erreurs++; console.log(`  ERREUR  Fiche ${f.id} : ${error.message}`) } else { faits++; console.log(`  restaurée  Fiche ${f.id}`) }
}

console.log(appliquer ? `\nTerminé : ${faits} ligne(s) restaurée(s), ${erreurs} erreur(s).` : `\n${aRestaurer} ligne(s) à restaurer. Pour appliquer : ajoute --appliquer`)
