// Estimation automatique des horaires de déplacement (bus) pour un match
// Extérieur, à partir de la ville du club et de la ville du match : géocodage
// + calcul d'itinéraire routier via l'API Mapbox, puis application des marges
// demandées par le club (1h30 avant le coup d'envoi + temps de trajet à
// l'aller, 2h30 après + le même temps de trajet au retour).
//
// Nécessite VITE_MAPBOX_TOKEN dans .env (token public "Default public token"
// depuis account.mapbox.com/access-tokens). Sans token, toutes les fonctions
// renvoient null — le reste de l'appli continue de fonctionner en mode
// manuel (saisie de l'heure de départ à la main).

import { supabase } from '../supabase'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export const mapboxConfigured = () => !!TOKEN

const MARGE_AVANT_MIN = 90
const MARGE_APRES_MIN = 150

async function geocoderVille(ville) {
  if (!TOKEN || !ville?.trim()) return null
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(ville.trim())}.json?access_token=${TOKEN}&country=fr&types=place&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return data.features?.[0]?.center || null // [lon, lat]
}

// Distance + durée de trajet routier (aller simple) entre deux villes.
// Mise en cache dans distances_cache (ville_depart, ville_arrivee) : beaucoup
// de trajets reviennent d'un match à l'autre ou d'une saison à l'autre (mêmes
// adversaires), donc on évite de rappeler Mapbox (géocodage + directions, 2
// requêtes) pour un couple de villes déjà résolu. Clé normalisée en
// trim+lowercase pour que "Lyon" et "lyon " partagent la même entrée.
export async function calculerTrajet(villeDepart, villeArrivee) {
  if (!TOKEN || !villeDepart?.trim() || !villeArrivee?.trim()) return null
  const dep = villeDepart.trim().toLowerCase()
  const arr = villeArrivee.trim().toLowerCase()

  const { data: cache } = await supabase
    .from('distances_cache')
    .select('distance_km, duree_trajet_min')
    .eq('ville_depart', dep)
    .eq('ville_arrivee', arr)
    .maybeSingle()
  if (cache) return cache

  const [depart, arrivee] = await Promise.all([geocoderVille(dep), geocoderVille(arr)])
  if (!depart || !arrivee) return null
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${depart[0]},${depart[1]};${arrivee[0]},${arrivee[1]}?access_token=${TOKEN}&overview=false`
  const res = await fetch(url)
  if (!res.ok) return null
  const route = (await res.json()).routes?.[0]
  if (!route) return null

  const trajet = { distance_km: Math.round(route.distance / 100) / 10, duree_trajet_min: Math.round(route.duration / 60) }
  await supabase.from('distances_cache').upsert(
    { ville_depart: dep, ville_arrivee: arr, ...trajet },
    { onConflict: 'ville_depart,ville_arrivee' }
  )
  return trajet
}

const minutesVersHeure = (min) => {
  const mm = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}

// heure_depart = coup d'envoi - 1h30 - temps de trajet aller
// heure_retour_estimee = coup d'envoi + 2h30 + temps de trajet retour (identique à l'aller)
export const calculerHoraires = (heureCoupEnvoi, dureeTrajetMin) => {
  if (!heureCoupEnvoi || dureeTrajetMin == null) return null
  const [h, m] = heureCoupEnvoi.split(':').map(Number)
  if (Number.isNaN(h)) return null
  const coupEnvoi = h * 60 + (m || 0)
  return {
    heure_depart: minutesVersHeure(coupEnvoi - MARGE_AVANT_MIN - dureeTrajetMin),
    heure_retour_estimee: minutesVersHeure(coupEnvoi + MARGE_APRES_MIN + dureeTrajetMin),
  }
}

// Estimation complète : trajet (distance + durée) + horaires de départ/retour
// suggérés. Renvoie null si le token Mapbox n'est pas configuré ou si une
// des deux villes est manquante/introuvable.
export async function estimerDeplacement(villeClub, villeMatch, heureCoupEnvoi) {
  const trajet = await calculerTrajet(villeClub, villeMatch)
  if (!trajet) return null
  const horaires = calculerHoraires(heureCoupEnvoi, trajet.duree_trajet_min)
  return { ...trajet, ...(horaires || {}) }
}

// Diagnostic (lecture seule, ne modifie jamais le cache) : à appeler quand
// calculerTrajet/estimerDeplacement a renvoyé null, pour savoir PRÉCISÉMENT
// où ça a échoué — token absent/invalide, ville du club introuvable, ville
// du match introuvable, ou erreur du service d'itinéraire — plutôt que de
// deviner. Refait les mêmes appels étape par étape en inspectant chaque
// réponse HTTP.
export async function diagnostiquerEchecTrajet(villeDepart, villeArrivee) {
  if (!TOKEN) return "Token Mapbox non configuré (VITE_MAPBOX_TOKEN absent de cet environnement) — vérifie la configuration de déploiement."
  if (!villeDepart?.trim()) return "Ville du club non renseignée."
  if (!villeArrivee?.trim()) return "Ville de destination non renseignée."
  try {
    const geocode = async (ville) => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(ville.trim())}.json?access_token=${TOKEN}&country=fr&types=place&limit=1`
      const res = await fetch(url)
      return { res, data: res.ok ? await res.json() : null }
    }
    const { res: resDepart, data: dataDepart } = await geocode(villeDepart)
    if (!resDepart.ok) return `Le service de géolocalisation a renvoyé une erreur (HTTP ${resDepart.status}) — token Mapbox probablement invalide ou expiré.`
    if (!dataDepart.features?.[0]) return `Ville du club "${villeDepart.trim()}" non reconnue par le service de géolocalisation.`
    const { res: resArrivee, data: dataArrivee } = await geocode(villeArrivee)
    if (!resArrivee.ok) return `Le service de géolocalisation a renvoyé une erreur (HTTP ${resArrivee.status}) — token Mapbox probablement invalide ou expiré.`
    if (!dataArrivee.features?.[0]) return `Ville "${villeArrivee.trim()}" non reconnue par le service de géolocalisation.`
    const [depart, arrivee] = [dataDepart.features[0].center, dataArrivee.features[0].center]
    const resDirections = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${depart[0]},${depart[1]};${arrivee[0]},${arrivee[1]}?access_token=${TOKEN}&overview=false`)
    if (!resDirections.ok) return `Le service de calcul d'itinéraire a renvoyé une erreur (HTTP ${resDirections.status}).`
    const routeData = await resDirections.json()
    if (!routeData.routes?.[0]) return "Aucun itinéraire routier trouvé entre ces deux villes."
    return "Échec inattendu (les deux villes sont pourtant reconnues et un itinéraire existe) — réessaie."
  } catch (e) {
    return `Erreur réseau lors de l'appel au service Mapbox : ${e.message}`
  }
}
