// Calcule si le sondage de présence d'une séance (entrainement) est clos —
// soit manuellement (sondage_clos en base), soit automatiquement si le délai
// de clôture configuré par l'éducateur (cloture_sondage_avant, en heures
// avant la séance) est dépassé. Calcul fait en direct à partir de l'heure
// courante plutôt que de dépendre d'une valeur stockée qu'il faudrait
// rafraîchir : évite tout besoin de cron/Edge Function pour la clôture
// automatique, et reste correct même si personne n'a rouvert le dashboard
// éducateur depuis l'échéance.
//
// Partagé entre DashboardEducateur.jsx (où la clôture est configurée et
// affichée) et DashboardJoueur.jsx (où elle doit bloquer la réponse au
// sondage) — avant ce partage, seul le côté éducateur faisait ce calcul en
// direct ; le côté joueur ne lisait que le champ sondage_clos brut, qui n'est
// mis à jour qu'en cliquant "Clôturer maintenant", donc les joueurs
// pouvaient continuer à répondre après le délai configuré.
export function sondageEstClos(seance) {
  if (!seance) return false
  if (seance.sondage_clos) return true
  if (!seance.cloture_sondage_avant || !seance.heure) return false
  const [h, m] = seance.heure.split(':').map(Number)
  const dateSeance = new Date(seance.date + 'T12:00:00')
  dateSeance.setHours(h, m, 0, 0)
  const clotureTime = new Date(dateSeance.getTime() - seance.cloture_sondage_avant * 60 * 60 * 1000)
  return new Date() >= clotureTime
}
