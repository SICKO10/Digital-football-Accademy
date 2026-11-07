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
