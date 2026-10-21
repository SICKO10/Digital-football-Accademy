import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Tutoriels guidés (cf. components/tutoriels, OnboardingGuide, tour du
// Tacticboard) : ne s'ouvrent seuls qu'une fois par compte, puis restent en
// retrait — seuls les boutons « Tutoriel » les relancent.
//
// « Déjà vu » est enregistré sur le compte (auth user_metadata.tutoriels_vus,
// pas de migration nécessaire), pour ne pas les rouvrir sur un autre appareil
// ou navigateur ; localStorage sert de cache immédiat et garde les tutoriels
// déjà vus avant ce changement.
const cle = (id, userId) => `df_tuto_${id}_${userId || 'anon'}`

let vusCompte = null // Set des ids vus sur le compte — null tant que pas chargé
let chargement = null
const abonnes = new Set()

// Changement de compte dans le même onglet : on recharge ceux du nouveau compte.
supabase.auth.onAuthStateChange((evenement) => {
  if (evenement === 'SIGNED_IN' || evenement === 'SIGNED_OUT') { vusCompte = null; chargement = null }
})

function chargerTutorielsVus() {
  if (!chargement) {
    // getUser (et non getSession) : la session en cache garde les
    // métadonnées de sa dernière actualisation, pas celles d'un autre appareil.
    chargement = supabase.auth.getUser()
      .then(({ data }) => { vusCompte = new Set(data?.user?.user_metadata?.tutoriels_vus || []) })
      .catch(() => { vusCompte = new Set() })
      .finally(() => abonnes.forEach(f => f()))
  }
  return chargement
}

// Re-rend le composant une fois les tutoriels vus du compte chargés ; renvoie
// un numéro qui change à ce moment-là (utilisable en dépendance d'un effet).
export function useTutorielsVus() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const maj = () => setVersion(v => v + 1)
    abonnes.add(maj)
    chargerTutorielsVus()
    return () => { abonnes.delete(maj) }
  }, [])
  return version
}

// true tant que le compte n'est pas chargé : mieux vaut ne rien ouvrir que
// rouvrir un tutoriel déjà vu sur un autre appareil.
// Un tutoriel vu avant l'enregistrement sur le compte (localStorage seul) y
// est reporté au passage.
export function tutorielDejaVu(id, userId) {
  let vuIci
  try { vuIci = localStorage.getItem(cle(id, userId)) === '1' } catch { return true }
  if (vuIci) { if (vusCompte && !vusCompte.has(id)) marquerTutorielVu(id, userId); return true }
  return vusCompte ? vusCompte.has(id) : true
}

export function marquerTutorielVu(id, userId) {
  try { localStorage.setItem(cle(id, userId), '1') } catch { /* navigation privée */ }
  if (!vusCompte || vusCompte.has(id)) return
  vusCompte.add(id)
  supabase.auth.updateUser({ data: { tutoriels_vus: [...vusCompte] } }).catch(() => { /* reste vu en local */ })
}
