// Recharge en repartant d'une version fraîche : désinscrit le service worker
// et vide ses caches avant de recharger — sans ça, un PWA resté sur un ancien
// déploiement peut resservir le même index.html périmé au rechargement (écran
// noir persistant, constaté le 2026-10-19 : bundle d'avant le dernier
// déploiement encore servi). Utilisé par ErrorBoundary et main.jsx (vite:preloadError).
export async function rechargerVersionFraiche() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || []
    await Promise.all(regs.map(r => r.unregister()))
  } catch { /* pas de service worker */ }
  try {
    const cles = await window.caches?.keys?.() || []
    await Promise.all(cles.map(k => window.caches.delete(k)))
  } catch { /* Cache API indisponible */ }
  window.location.reload()
}
