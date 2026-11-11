import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import {
  compteDepuisLignes, sectionVerrouillee, menuVisible, outilActif, ongletsStatsPermis, etatsOutils,
} from './outilsAcces'

// Lit les outils actifs d'un compte (fonction base `outils_actifs`) et rend les
// réponses prêtes à l'emploi pour un dashboard.
// `modeleOutils` faux (ou `desactive`, ex. un dirigeant qui consulte le
// dashboard d'un éducateur) : rien n'est lu, rien n'est filtré.
export function useOutils({ role, userId, modeleOutils, desactive = false }) {
  const actif = !!modeleOutils && !desactive
  const [lignes, setLignes] = useState([])
  const [essaisUtilises, setEssaisUtilises] = useState([])
  const [masques, setMasques] = useState([])
  const [ouverts, setOuverts] = useState([])
  const [masquesClub, setMasquesClub] = useState([])
  const [masquesClubLus, setMasquesClubLus] = useState(false)
  const [pret, setPret] = useState(false)

  const [version, setVersion] = useState(0)
  const recharger = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    if (!actif || !userId) return undefined
    let annule = false
    // Essais déjà utilisés : seul l'éducateur a des essais (encart de fin d'essai).
    const essais = role === 'educateur'
      ? supabase.from('outils_essais_utilises').select('outil').eq('compte_id', userId)
      : Promise.resolve({ data: [] })
    // Éducateur : outils du club qu'il a masqués de son menu. Club : outils
    // qu'il ouvre à ses éducateurs affiliés.
    const choix = role === 'educateur'
      ? supabase.from('outils_affichage_educateur').select('outil').eq('educateur_id', userId).eq('visible', false)
      : supabase.from('outils_club_ouverts').select('outil').eq('club_id', userId)
    Promise.all([supabase.rpc('outils_actifs', { p_compte: userId }), essais, choix]).then(([actifs, utilises, lus]) => {
      if (annule) return
      if (actifs.error) console.error('outils_actifs', actifs.error.message)
      if (utilises.error) console.error('outils_essais_utilises', utilises.error.message)
      if (lus.error) console.error('outils choix', lus.error.message)
      const ids = (lus.data || []).map(c => c.outil)
      setLignes(actifs.data || [])
      setEssaisUtilises((utilises.data || []).map(e => e.outil))
      setMasques(role === 'educateur' ? ids : [])
      setOuverts(role === 'club' ? ids : [])
      setPret(true)
    })
    return () => { annule = true }
  }, [actif, userId, role, version])

  // Club : outils retirés de son propre menu depuis Mon club. Lus pour tous les
  // clubs (ancien modèle compris) ; sans ligne, tout reste affiché.
  const lireMasquesClub = role === 'club' && !desactive && !!userId
  useEffect(() => {
    if (!lireMasquesClub) return undefined
    let annule = false
    supabase.from('mon_club_affichage').select('outil').eq('club_id', userId).eq('cible', 'club').eq('visible', false)
      .then(({ data, error }) => {
        if (annule) return
        if (error) console.error('mon_club_affichage', error.message)
        setMasquesClub((data || []).map(l => l.outil))
        setMasquesClubLus(true)
      })
    return () => { annule = true }
  }, [lireMasquesClub, userId, version])

  const compte = useMemo(
    () => compteDepuisLignes(role, actif, lignes, masques, lireMasquesClub ? masquesClub : []),
    [role, actif, lignes, masques, masquesClub, lireMasquesClub],
  )

  const etats = useMemo(
    () => (actif ? etatsOutils({ role, lignes, essaisUtilises, masques }) : []),
    [actif, role, lignes, essaisUtilises, masques],
  )

  return useMemo(() => ({
    actif,
    pret,
    lignes,
    etats,
    ouverts,
    masquesClub,
    masquesClubLus,
    recharger,
    verrouillee: (cle) => actif && pret && sectionVerrouillee(compte, cle),
    menuVisible: (cle) => menuVisible(compte, cle),
    outilActif: (outilId) => outilActif(compte, outilId),
    ongletsStats: () => ongletsStatsPermis(compte),
  }), [actif, pret, lignes, etats, ouverts, masquesClub, masquesClubLus, recharger, compte])
}
