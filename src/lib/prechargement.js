// Précharge la page d'un dashboard pour qu'elle soit déjà là quand on y arrive :
// les dashboards sont de gros morceaux de code chargés à la demande (App.jsx).
// Même chemin d'import que App.jsx : le navigateur ne télécharge qu'une fois.
// La dernière vue ouverte est mémorisée pour lancer ce téléchargement dès la
// connexion, pendant que l'appli cherche encore où envoyer la personne.
const PAGES = {
  '/club': () => import('../pages/DashboardClub'),
  '/educateur': () => import('../pages/DashboardEducateur'),
  '/dashboard-joueur': () => import('../pages/DashboardJoueur'),
}
const CLE = 'df_derniere_vue'

export function precharger(chemin) {
  try {
    const charger = PAGES[chemin]
    if (charger) charger().catch(() => {})
  } catch { /* le chargement normal prendra le relais */ }
}

export function memoriserVue(chemin) {
  try { if (PAGES[chemin]) localStorage.setItem(CLE, chemin) } catch { /* stockage indisponible */ }
}

export function derniereVue() {
  try {
    const v = localStorage.getItem(CLE)
    return v && PAGES[v] ? v : null
  } catch { return null }
}
