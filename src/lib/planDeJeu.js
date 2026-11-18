// Lien entre les principes de jeu et les zones du terrain (onglet « Plan de
// jeu »). Fonctions pures, partagées par l'écran d'édition du club, la vue en
// lecture seule, le dashboard joueur et la fiche A4 : un principe peut pointer
// vers une zone (principes_jeu.zone_id) ; sa pastille porte son numéro dans la
// liste des principes de la phase, et la même pastille s'affiche sur la zone.

// Principes d'une phase dans l'ordre d'affichage (colonne « ordre », puis date
// de création pour départager). C'est ce classement qui donne les numéros.
export function principesDeLaPhase(principes, phase) {
  return (principes || [])
    .filter(p => p.phase === phase)
    .slice()
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')))
}

// { [zoneId]: [numéros] } : pour chaque zone, les numéros des principes qui y
// sont rattachés. Un principe sans zone, ou relié à une zone absente de la
// liste donnée, est ignoré.
export function numerosParZone(principesPhase, zones) {
  const idsZones = zones ? new Set(zones.map(z => z.id)) : null
  const res = {}
  ;(principesPhase || []).forEach((p, i) => {
    if (!p.zone_id) return
    if (idsZones && !idsZones.has(p.zone_id)) return
    if (!res[p.zone_id]) res[p.zone_id] = []
    res[p.zone_id].push(i + 1)
  })
  return res
}

// Sélection courante : null, { type: 'zone', id } ou { type: 'principe', id }.
// Toucher deux fois le même élément annule la sélection.
export function basculerSelection(selection, type, id) {
  if (selection && selection.type === type && selection.id === id) return null
  return { type, id }
}

// Ce qui doit être mis en évidence pour une sélection donnée : la zone active
// sur le terrain et les principes actifs dans la liste. Toucher une zone allume
// ses principes ; toucher un principe allume sa zone.
export function selectionDerivee(selection, principesPhase) {
  const vide = { zoneActiveId: null, principesActifs: new Set() }
  if (!selection) return vide
  const liste = principesPhase || []
  if (selection.type === 'zone') {
    return {
      zoneActiveId: selection.id,
      principesActifs: new Set(liste.filter(p => p.zone_id === selection.id).map(p => p.id)),
    }
  }
  const p = liste.find(x => x.id === selection.id)
  if (!p) return vide
  return { zoneActiveId: p.zone_id || null, principesActifs: new Set([p.id]) }
}
