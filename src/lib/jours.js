// Jours de la semaine (clés stables, lundi→dimanche) — partagé entre le
// filtrage du planning agrégé multi-équipe (affiliations.jours_actifs,
// DashboardJoueur.jsx/SondageSemaine.jsx) et le sélecteur côté éducateur
// (DashboardEducateur.jsx, fiche joueur).
export const JOURS_SEMAINE = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

// 'YYYY-MM-DD' -> clé du jour ('lundi'..'dimanche'). new Date('YYYY-MM-DD')
// est interprété en UTC minuit par le moteur JS ; ajouter T12:00:00 évite
// qu'un fuseau négatif (Amériques) fasse basculer sur la veille.
export const jourKeyDeDate = (dateStr) => JOURS_SEMAINE[(new Date(`${dateStr}T12:00:00`).getDay() + 6) % 7].key
