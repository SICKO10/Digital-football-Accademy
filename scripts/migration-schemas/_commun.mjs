// Briques communes aux scripts de migration des schémas (migrer, restaurer).
// La clé secrète Supabase est lue dans l'environnement du terminal, jamais
// écrite ni affichée ; les identifiants Cloudinary viennent de .env.local.

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const IMAGE_EN_BASE = /^data:image\/(png|jpe?g|webp);base64,/i
export const DOSSIER_SAUVEGARDES = join(homedir(), 'digital-football-sauvegardes')

const lireEnvLocal = () => {
  try {
    return Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
      .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]))
  } catch { return {} }
}

const arreter = (message) => { console.error(`\n${message}`); process.exit(1) }

export function clientSupabaseService() {
  const env = lireEnvLocal()
  const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) arreter('URL Supabase introuvable (.env.local VITE_SUPABASE_URL). Lance le script depuis ~/digital-football.')
  if (!cle) arreter('SUPABASE_SERVICE_ROLE_KEY absente : fais `export SUPABASE_SERVICE_ROLE_KEY=...` dans ce terminal.')
  const type = cle.startsWith('sb_') ? cle.split('_').slice(0, 2).join('_')
    : (() => { try { return JSON.parse(Buffer.from(cle.split('.')[1], 'base64url').toString()).role || 'inconnu' } catch { return 'illisible' } })()
  console.log(`Type de clé détecté : ${type}`)
  if (!['service_role', 'sb_secret'].includes(type)) arreter(`Ce n'est pas la clé secrète (type « ${type} »).`)
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function configurerCloudinary() {
  const env = lireEnvLocal()
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME
  const api_key = process.env.CLOUDINARY_API_KEY || env.VITE_CLOUDINARY_API_KEY
  const api_secret = process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET
  if (!cloud_name || !api_key || !api_secret) arreter('Identifiants Cloudinary incomplets dans .env.local (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).')
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
  return cloudinary
}

// Lecture paginée (petites pages : une fiche peut peser plusieurs Mo).
export async function toutesLesLignes(db, table, colonnes, filtre = q => q, page = 100) {
  const lignes = []
  for (let debut = 0; ; debut += page) {
    const { data, error } = await filtre(db.from(table).select(colonnes)).order('id').range(debut, debut + page - 1)
    if (error) throw new Error(`${table} : ${error.message}`)
    lignes.push(...data)
    if (data.length < page) return lignes
  }
}

export const ko = (dataUrl) => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4 / 1024)
export const horodatage = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
