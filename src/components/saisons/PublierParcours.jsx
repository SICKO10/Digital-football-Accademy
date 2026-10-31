import { useEffect } from 'react'
import { chargerDonneesParcours, construireSaisons, publierParcours } from '../../lib/parcoursCoach'

// Invisible : met à jour en arrière-plan le parcours publié du coach (Explorer),
// une fois par jour et par navigateur, sans qu'il ait à ouvrir Mon profil.
const cleJour = (id) => `parcours-publie:${id}`

export default function PublierParcours({ educateurId }) {
  useEffect(() => {
    if (!educateurId) return
    const aujourdhui = new Date().toISOString().slice(0, 10)
    try { if (localStorage.getItem(cleJour(educateurId)) === aujourdhui) return } catch { /* stockage indisponible : on publie quand même */ }
    // Petit délai : le tableau de bord charge d'abord ce que le coach voit.
    const t = setTimeout(async () => {
      try {
        const donnees = await chargerDonneesParcours(educateurId)
        if (!donnees) return
        const erreur = await publierParcours(educateurId, construireSaisons(donnees))
        if (erreur) return
        try { localStorage.setItem(cleJour(educateurId), aujourdhui) } catch { /* ignoré */ }
      } catch { /* la publication est facultative, jamais bloquante */ }
    }, 4000)
    return () => clearTimeout(t)
  }, [educateurId])
  return null
}
