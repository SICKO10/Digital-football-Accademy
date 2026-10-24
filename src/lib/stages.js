// Outils partagés du module Stages (dashboard club/éducateur + pages publiques).

// Les dates sont stockées en 'YYYY-MM-DD' : on les lit en date locale (jamais
// via new Date('YYYY-MM-DD'), interprété en UTC, qui décale d'un jour).
export const dateLocale = (s) => { const [a, m, j] = s.split('-').map(Number); return new Date(a, m - 1, j) }
export const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const formatDate = (s, options = { weekday: 'long', day: 'numeric', month: 'long' }) => s ? dateLocale(s).toLocaleDateString('fr-FR', options) : ''
export const formatJourCourt = (s) => formatDate(s, { weekday: 'short', day: 'numeric', month: 'short' })
export const formatPeriode = (debut, fin) => debut === fin
  ? formatDate(debut, { day: 'numeric', month: 'long', year: 'numeric' })
  : `du ${formatDate(debut, { day: 'numeric', month: 'long' })} au ${formatDate(fin, { day: 'numeric', month: 'long', year: 'numeric' })}`
export const heure = (t) => (t || '').slice(0, 5)
export const euros = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')} €`

// Tous les jours entre deux dates incluses.
export const joursEntre = (debut, fin) => {
  const jours = []
  if (!debut || !fin) return jours
  for (let d = dateLocale(debut); d <= dateLocale(fin); d.setDate(d.getDate() + 1)) jours.push(dateStr(d))
  return jours
}
// Jours effectifs : même règle que stage_jours() côté base (liste explicite
// filtrée sur la période, sinon tous les jours de la période).
export const joursDuStage = (stage) => {
  const tous = joursEntre(stage.date_debut, stage.date_fin)
  if (!stage.jours || stage.jours.length === 0) return tous
  return tous.filter(j => stage.jours.includes(j))
}

export const MODES_PAIEMENT = { virement: 'Virement', cheque: 'Chèque', especes: 'Espèces' }

// Libellé d'une offre pour les familles.
export const detailOffre = (o, nbJoursStage) => {
  if (o.type === 'journee') return `${euros(o.prix)} par jour, jours au choix`
  if (!o.nb_jours) return `${euros(o.prix)} · ${nbJoursStage} jour${nbJoursStage > 1 ? 's' : ''} (tout le stage)`
  return `${euros(o.prix)} · ${o.nb_jours} jour${o.nb_jours > 1 ? 's' : ''} au choix`
}

// Montant affiché pendant l'inscription — indicatif : le montant officiel
// est recalculé par la base (inscrire_stage), même formule.
export const montantEstime = (offre, formule, nbJours) => {
  if (!offre || !nbJours) return 0
  const base = offre.type === 'journee' ? Number(offre.prix) * nbJours : Number(offre.prix)
  return base + (formule ? Number(formule.prix_jour) * nbJours : 0)
}
