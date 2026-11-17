import { useEffect, useMemo, useRef, useState } from 'react'
import FicheClubContenu from './FicheClubContenu'
import { rangerEffectif } from '../../lib/effectifFicheClub'

// Fiche club + effectif de l'équipe choisie dans la fiche (fiche.equipe_id).
// Équipe active : on réutilise les joueurs déjà chargés. Autre équipe : une lecture à la demande.
export default function FicheClubEquipe({ fiche, logo, couleur, joueursActifs, equipeActiveId, lireEffectif }) {
  const equipeId = fiche?.equipe_id || null
  const estActive = !!equipeId && equipeId === equipeActiveId
  const lireRef = useRef(lireEffectif)
  useEffect(() => { lireRef.current = lireEffectif })
  const [autre, setAutre] = useState({ id: null, joueurs: [] })

  useEffect(() => {
    if (!equipeId || estActive || !lireRef.current) return undefined
    let annule = false
    lireRef.current(equipeId).then(joueurs => { if (!annule) setAutre({ id: equipeId, joueurs: joueurs || [] }) }).catch(() => {})
    return () => { annule = true }
  }, [equipeId, estActive])

  const roster = useMemo(
    () => (!equipeId ? [] : estActive ? (joueursActifs || []) : (autre.id === equipeId ? autre.joueurs : [])),
    [equipeId, estActive, joueursActifs, autre]
  )
  const { joueursParPoste, nonRenseignes, texteAuto } = useMemo(() => rangerEffectif(roster), [roster])
  const aEffectif = roster.length > 0
  const ficheAffichee = aEffectif && !fiche.effectif_texte ? { ...fiche, effectif_texte: texteAuto } : fiche
  return <FicheClubContenu fiche={ficheAffichee} logo={logo} couleur={couleur} joueursParPoste={joueursParPoste} nonRenseignes={nonRenseignes} />
}
