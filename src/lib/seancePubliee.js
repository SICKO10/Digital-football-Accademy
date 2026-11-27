// « Séance du jour » publiée aux joueurs : la règle qui fait foi est en base
// (seance_publiee_ouverte, Europe/Paris). Ces deux aides servent seulement à
// l'affichage, avec le même fuseau, quel que soit celui du navigateur.

// Date du jour à Paris, au format YYYY-MM-DD (comparable à date_seance).
export const dateParisAujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })

// Heure actuelle à Paris (0 à 23).
export const heureParis = () => Number(new Date().toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }))

// Clochette « nouvelle séance » (aucun email : on n'utilise pas notifierJoueur,
// comme pour la reconduction). Une ligne par joueur qui reçoit la séance.
export const NOTIF_SEANCE_PUBLIEE = {
  type: 'seance_publiee',
  titre: 'Nouvelle séance disponible',
  texte: (dateSeance, heure) => {
    const quand = dateSeance === dateParisAujourdhui()
      ? 'd\'aujourd\'hui'
      : 'du ' + new Date(dateSeance + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return `Ton éducateur a publié la séance ${quand}${heure ? ' à ' + String(heure).slice(0, 5) : ''}. Retrouve-la dans Entraînement.`
  },
}

// Copie figée de ce que le joueur a besoin de voir. Gabarit BEF/BMF : ses
// blocs écrivent but_bef/consignes_bef, d'où les replis.
export const copieProcede = p => ({
  numero: p.numero,
  titre: p.titre || '',
  duree: p.duree || '',
  nb_joueurs: p.nb_joueurs || '',
  but: p.but || p.but_bef || '',
  organisation: p.organisation || p.surface || '',
  consignes: p.consignes || p.consignes_bef || '',
  criteres_realisation: p.criteres_realisation || '',
  variables: p.variables || p.variantes_bef || '',
  criteres_reussite: p.criteres_reussite || '',
  schema_png: p.schema_png || '',
  schema_data: p.schema_data || null,
})

// Vrai si un procédé publié ne correspond plus à la fiche actuelle (modifié ou supprimé).
export const ficheModifieeDepuisPublication = (publication, fiche) => {
  if (!publication || !fiche) return false
  const actuels = fiche.fiche_seance?.procedes || []
  return (publication.procedes || []).some(pub => {
    const act = actuels.find(a => a.numero === pub.numero && (a.titre || '').trim() === (pub.titre || '').trim())
    return !act || JSON.stringify(copieProcede(act)) !== JSON.stringify(pub)
  })
}

export const NOTIF_SEANCE_MODIFIEE = {
  type: 'seance_modifiee',
  titre: 'Séance modifiée',
  texte: (dateSeance, heure) => `Ton éducateur a modifié la séance du ${new Date(dateSeance + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${heure ? ' à ' + String(heure).slice(0, 5) : ''}. Retrouve-la dans Entraînement.`,
}
