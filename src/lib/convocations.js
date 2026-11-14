// Dimanche suivant le match, 20h — le widget joueur (lecture filtrée sur
// expire_at > now()) disparaît tout seul à ce moment-là, pas de tâche
// planifiée nécessaire. Partagé par la modale de convocation de
// DashboardEducateur et par la grille de convocation des catégories.
export const calculerExpirationConvocation = (dateMatch) => {
  const d = new Date(`${dateMatch}T00:00:00`)
  const jourSemaine = d.getDay() // 0=dimanche..6=samedi
  const joursVersDimanche = (7 - jourSemaine) % 7 || 7
  const dimanche = new Date(d)
  dimanche.setDate(d.getDate() + joursVersDimanche)
  dimanche.setHours(20, 0, 0, 0)
  return dimanche.toISOString()
}
