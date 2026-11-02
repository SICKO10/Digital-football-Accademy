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
    return `Ton éducateur a publié la séance ${quand}${heure ? ' à ' + String(heure).slice(0, 5) : ''}. Retrouve-la dans Préparation > Entraînement.`
  },
}
