// Réduit un poste précis (profiles.poste — 10 valeurs, cf. DashboardJoueur.jsx
// `postes`) à l'une des 4 familles utilisées pour les jeux de stats et le
// profil caractéristique (caracteristiquesParPoste).
export const getPosteFamille = (poste) => {
  if (!poste) return 'Milieu'
  const p = poste.toLowerCase()
  if (p.includes('gardien')) return 'Gardien'
  if (p.includes('défenseur') || p.includes('latéral')) return 'Défenseur'
  if (p.includes('attaquant') || p.includes('ailier')) return 'Attaquant'
  return 'Milieu'
}
