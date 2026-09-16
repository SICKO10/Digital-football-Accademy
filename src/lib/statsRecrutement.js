// Moyennes/pourcentages calculés à partir de tous les matchs saisis d'un joueur
// (stats_match_joueur) — mêmes noms de champs que profil_recrutement (upsert
// direct du résultat). Partagé entre MesStats.jsx (saisie/import joueur) et
// DashboardEducateur.jsx (remontée auto depuis la feuille de match), pour ne
// jamais avoir deux formules qui divergent.
export function calculerMoyennes(matchs) {
  if (!matchs.length) return {}
  const n = matchs.length
  const sum = (key) => matchs.reduce((s, m) => s + (Number(m[key]) || 0), 0)
  const avg = (key) => Math.round((sum(key) / n) * 100) / 100
  const pct = (num, den) => {
    const t = sum(den)
    return t > 0 ? Math.round((sum(num) / t) * 100) : null
  }
  const totalArrets = sum('arrets')
  const totalEncaisses = sum('buts_encaisses')
  return {
    nb_matchs: n,
    moy_minutes: avg('minutes'),
    moy_buts: avg('buts'),
    moy_pd: avg('passes_decisives'),
    moy_km: avg('km_parcourus'),
    moy_recuperations: avg('recuperations'),
    pct_passes: pct('passes_reussies', 'passes_tentees'),
    pct_duels: pct('duels_gagnes', 'duels_total'),
    // Arrêts / (arrêts + buts encaissés) — pas arrêts / frappes tentées (le
    // gardien n'a pas cette stat), sinon ce pourcentage n'a pas de sens.
    pct_arrets: (totalArrets + totalEncaisses) > 0 ? Math.round((totalArrets / (totalArrets + totalEncaisses)) * 100) : null,
    moy_arrets: avg('arrets'),
    pct_frappes: pct('frappes_cadrees', 'frappes_tentees'),
    pct_dribbles: pct('dribbles_reussis', 'dribbles_tentes'),
    moy_interceptions: avg('interceptions'),
    moy_tacles: avg('tacles_reussis'),
  }
}
