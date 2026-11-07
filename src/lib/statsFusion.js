// Fusionne les matchs saisis par l'éducateur (feuille de match, table stats_match)
// et ceux que le joueur saisit lui-même (stats_match_joueur) : les deux peuvent
// exister en même temps. Un match déjà saisi par l'éducateur n'est pas compté deux
// fois : si le joueur l'a aussi saisi (même match, ou même date), la version de
// l'éducateur fait foi. Fichier pur, testé par tests/statsFusion.test.js.

export function fusionnerMatchs(manuels = [], officiels = []) {
  const idsOfficiels = new Set(officiels.map(o => o.id).filter(Boolean))
  const datesOfficiels = new Set(officiels.map(o => o.date).filter(Boolean))
  const manuelsGardes = manuels.filter(m => !(m.match_id && idsOfficiels.has(m.match_id)) && !datesOfficiels.has(m.date))
  return [
    ...officiels.map(o => ({ ...o, origine: 'educateur' })),
    ...manuelsGardes.map(m => ({ ...m, origine: 'joueur', clean_sheet: m.buts_encaisses === 0 })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

// Un joueur peut avoir plusieurs affiliations acceptées (plusieurs éducateurs ou
// équipes). « Mes statistiques » s'appuie sur l'équipe où il a le plus de séances
// enregistrées (puis le plus de matchs) : c'est son équipe principale. Les autres
// restent consultables dans « Mon équipe ». `items` : [{ affiliation, stats }].
export function choisirEquipePrincipale(items = []) {
  const avecStats = items.filter(i => i && i.stats)
  if (avecStats.length === 0) return null
  return avecStats.reduce((meilleur, i) => {
    const cle = (x) => [(x.stats.total || 0), (x.stats.matchsJoues || 0)]
    const [ta, ma] = cle(i)
    const [tb, mb] = cle(meilleur)
    return ta > tb || (ta === tb && ma > mb) ? i : meilleur
  })
}
