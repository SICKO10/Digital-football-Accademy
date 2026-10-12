// Règles de calcul des présences entraînement, partagées entre
// DashboardEducateur.jsx, DashboardClub.jsx et DashboardJoueur.jsx — avant ce
// partage, chaque dashboard avait sa propre variante (le club ignorait les
// réponses au sondage, l'éducateur comptait les sondages des séances à venir
// dans le taux mais pas dans le détail par mois…), d'où des chiffres
// différents pour une même équipe selon l'écran.

// Statut effectif d'un joueur pour une séance : la saisie de l'éducateur
// (presences_entrainement) prime ; sinon on retombe sur la réponse du joueur
// au sondage (disponibilites). null = aucune donnée, séance non comptée.
export function statutPresenceEffectif(presence, statutSondage) {
  const nonSaisi = !presence || presence.statut === 'non_saisi' || (!presence.statut && !presence.present)
  if (!nonSaisi) return presence.statut || (presence.present ? 'present' : 'absent')
  return statutSondage || null
}

// Un joueur convoqué en équipe supérieure n'est pas un absent.
export const estStatutPresent = (s) => s === 'present' || s === 'convoque'

// Séance comptable dans un taux de présence : jusqu'à aujourd'hui inclus — une
// réponse au sondage d'une séance à venir n'est pas une présence constatée.
export const seanceComptable = (date, aujourdHui = new Date().toISOString().split('T')[0]) => !!date && date <= aujourdHui
