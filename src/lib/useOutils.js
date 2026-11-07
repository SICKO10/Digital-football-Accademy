import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import {
  compteDepuisLignes, sectionVerrouillee, menuVisible, outilActif, ongletsStatsPermis,
} from './outilsAcces'

// Lit les outils actifs d'un compte (fonction base `outils_actifs`) et rend les
// réponses prêtes à l'emploi pour un dashboard.
// `modeleOutils` faux (ou `desactive`, ex. un dirigeant qui consulte le
// dashboard d'un éducateur) : rien n'est lu, rien n'est filtré.
export function useOutils({ role, userId, modeleOutils, desactive = false }) {
  const actif = !!modeleOutils && !desactive
  const [lignes, setLignes] = useState([])
  const [pret, setPret] = useState(false)

  const [version, setVersion] = useState(0)
  const recharger = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    if (!actif || !userId) return undefined
    let annule = false
    supabase.rpc('outils_actifs', { p_compte: userId }).then(({ data, error }) => {
      if (annule) return
      if (error) console.error('outils_actifs', error.message)
      setLignes(data || [])
      setPret(true)
    })
    return () => { annule = true }
  }, [actif, userId, version])

  const compte = useMemo(() => compteDepuisLignes(role, actif, lignes), [role, actif, lignes])

  return useMemo(() => ({
    actif,
    pret,
    lignes,
    recharger,
    verrouillee: (cle) => actif && pret && sectionVerrouillee(compte, cle),
    menuVisible: (cle) => menuVisible(compte, cle),
    outilActif: (outilId) => outilActif(compte, outilId),
    ongletsStats: () => ongletsStatsPermis(compte),
  }), [actif, pret, lignes, recharger, compte])
}
