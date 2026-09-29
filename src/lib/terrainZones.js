// Extrait de PlanningTerrains.jsx — TerrainsLiberesWidget (petit widget affiché
// dès l'Accueil éducateur/club) n'a besoin que de ces constantes, pas du
// composant complet. Les garder dans PlanningTerrains.jsx obligeait Rollup à
// embarquer tout le fichier (1150+ lignes) partout où le widget est rendu,
// rendant inefficace le lazy() posé sur <PlanningTerrains> dans
// DashboardEducateur.jsx (cf. avertissement build INEFFECTIVE_DYNAMIC_IMPORT).

// Zone occupée sur le terrain pour ce créneau — permet à plusieurs équipes de
// se partager un même terrain au même horaire : foot à 11 (U13+) sur un
// demi-terrain chacune (2 zones max), foot à 5/futsal/U6-U11 jusqu'à 5 zones.
// 'plein' (défaut) = le créneau occupe tout le terrain, comme avant.
export const ZONES = [
  { val: 'plein', label: 'Terrain plein' },
  { val: 'demi-A', label: 'Demi-terrain A' },
  { val: 'demi-B', label: 'Demi-terrain B' },
  { val: 'zone-1', label: 'Zone 1' },
  { val: 'zone-2', label: 'Zone 2' },
  { val: 'zone-3', label: 'Zone 3' },
  { val: 'zone-4', label: 'Zone 4' },
  { val: 'zone-5', label: 'Zone 5' },
]
// 'plein' reprend la couleur de marque du club (accentColor, déjà utilisée
// partout ailleurs) ; les sous-zones ont chacune une couleur fixe distincte
// pour rester lisibles quand plusieurs sont empilées sur la même case.
// Exportées pour que les widgets d'alertes (TerrainsLiberesWidget) affichent
// la même couleur de zone que le planning terrain, plutôt qu'une palette
// dupliquée qui aurait divergé avec le temps.
export const ZONE_COLORS_FIXES = { 'demi-A': '#60a5fa', 'demi-B': '#818cf8', 'zone-1': '#fbbf24', 'zone-2': '#f97316', 'zone-3': '#f43f5e', 'zone-4': '#c084fc', 'zone-5': '#22d3ee' }
export const couleurZone = (zone, accentColor) => ZONE_COLORS_FIXES[zone] || accentColor
