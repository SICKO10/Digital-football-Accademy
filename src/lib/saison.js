// Saison française de football (juillet → juin) : en juillet/août on est déjà
// sur la saison qui commence, sinon sur celle en cours depuis l'automne précédent.
export const saisonActuelle = () => {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

// Bornes usuelles d'une saison (1er août → 31 mai), à partir de son libellé
// 'YYYY-YYYY' — sert de valeur par défaut dans les formulaires de création.
export const bornesSaison = (saison = saisonActuelle()) => {
  const [debut, fin] = saison.split('-').map(Number)
  return { date_debut: `${debut}-08-01`, date_fin: `${fin}-05-31` }
}

export const dateFr = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts)
