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
    Promise.all([supabase.rpc('outils_actifs', { p_compte: userId }), essais]).then(([actifs, utilises]) => {
      if (annule) return
      if (actifs.error) console.error('outils_actifs', actifs.error.message)
      if (utilises.error) console.error('outils_essais_utilises', utilises.error.message)
      setLignes(actifs.data || [])
      setEssaisUtilises((utilises.data || []).map(e => e.outil))
      setPret(true)
    })
    return () => { annule = true }
  }, [actif, userId, role, version])

  const compte = useMemo(() => compteDepuisLignes(role, actif, lignes), [role, actif, lignes])

  const etats = useMemo(
    () => (actif ? etatsOutils({ role, lignes, essaisUtilises }) : []),
    [actif, role, lignes, essaisUtilises],
  )

  return useMemo(() => ({
    actif,
    pret,
    lignes,
    etats,
    recharger,
    verrouillee: (cle) => actif && pret && sectionVerrouillee(compte, cle),
    menuVisible: (cle) => menuVisible(compte, cle),
    outilActif: (outilId) => outilActif(compte, outilId),
    ongletsStats: () => ongletsStatsPermis(compte),
  }), [actif, pret, lignes, etats, recharger, compte])
}
