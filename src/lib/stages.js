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

// ── Organisation : tâches et planning individuel des encadrants ─────
export const CATEGORIES_TACHE = { general: 'Général', transport: 'Transport', surveillance: 'Surveillance', animation: 'Animation', logistique: 'Logistique', cuisine: 'Repas' }
export const STATUTS_TACHE = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' }

const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

export const nomsEncadrantsTache = (t, encadrants) => t.tous_encadrants
  ? 'Tous les encadrants'
  : (t.encadrant_ids || []).map(id => encadrants.find(e => e.id === id)?.nom).filter(Boolean).join(', ')

// Planning d'un encadrant : ses tâches (attribuées nommément ou à tous) et
// les créneaux du programme dont il est indiqué responsable (nom complet ou
// prénom présent dans le champ « Responsable »). Trié par jour puis heure.
// Une tâche sans date est une tâche « tous les jours » : elle est répétée
// dans chacun des jours du stage (paramètre jours).
export function elementsPlanningEncadrant(encadrant, taches, creneaux, jours = []) {
  const cles = [normaliser(encadrant.nom), normaliser(encadrant.nom.split(' ')[0])].filter(k => k.length >= 2)
  const sesCreneaux = creneaux.filter(c => cles.some(k => normaliser(c.responsable).includes(k)))
  const sesTaches = taches.filter(t => t.tous_encadrants || (t.encadrant_ids || []).includes(encadrant.id))
  return [
    ...sesCreneaux.map(c => ({ cle: `c${c.id}`, date: c.date, debut: c.heure_debut, fin: c.heure_fin, titre: c.activite, detail: [c.groupe, c.lieu].filter(Boolean).join(' · '), type: 'Programme' })),
    ...sesTaches.flatMap(t => (!t.date && jours.length ? jours : [t.date]).map(date => ({
      cle: `t${t.id}-${date || 'tout'}`, date, debut: t.heure_debut, fin: t.heure_fin, titre: t.tache, type: 'Tâche',
      detail: [CATEGORIES_TACHE[t.categorie], !t.date ? 'chaque jour' : null, t.tous_encadrants ? 'tous les encadrants' : (t.encadrant_ids || []).length > 1 ? `avec ${(t.encadrant_ids || []).length - 1} autre(s)` : null, t.notes].filter(Boolean).join(' · '),
    }))),
  ].sort((a, b) => `${a.date || '0'}${a.debut || ''}`.localeCompare(`${b.date || '0'}${b.debut || ''}`))
}
