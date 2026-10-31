// État d'un joueur par rapport à sa saison, déduit de ses affiliations (fonctions
// pures, testées dans tests/finSaisonJoueur.test.js). Le message de fin de saison
// s'appuie sur l'affiliation archivée, jamais sur la date du jour.
import { libelleSaison } from './saison.js'

export const DATE_LIMITE_LICENCE = '15 juillet'

// 'en_cours' : au moins une affiliation acceptée.
// 'terminee' : aucune acceptée, au moins une archivée (le coach a clôturé).
// 'aucune'   : ni l'un ni l'autre (jamais affilié, ou seulement des demandes).
export const etatSaisonJoueur = (affiliations) => {
  const liste = affiliations || []
  if (liste.some(a => a.statut === 'accepte')) return 'en_cours'
  if (liste.some(a => a.statut === 'archive')) return 'terminee'
  return 'aucune'
}

// Dernière affiliation archivée (date de fin la plus récente, puis saison).
export const derniereAffiliationArchivee = (affiliations) => {
  const archivees = (affiliations || []).filter(a => a.statut === 'archive')
  if (archivees.length === 0) return null
  return [...archivees].sort((a, b) =>
    String(b.date_fin || '').localeCompare(String(a.date_fin || '')) ||
    String(b.saison || '').localeCompare(String(a.saison || '')))[0]
}

const saisonLisible = (saison) => (/^\d{4}-\d{4}$/.test(saison || '') ? libelleSaison(saison) : saison || null)

// Message exact validé par Kevin. Sans nom de coach ni saison connus, la phrase
// reste correcte (« ton éducateur », « ta saison »).
export const messageFinSaison = ({ coach, saison }) => {
  const nom = (coach || '').trim()
  const s = saisonLisible(saison)
  return `Tu as terminé ta saison avec ${nom || 'ton éducateur'}. Dans l'attente de ton nouvel éducateur, `
    + `tu peux renouveler ta licence avant le ${DATE_LIMITE_LICENCE} et retrouver ${s ? `ta saison ${s}` : 'ta saison'} dans « Mes saisons ».`
}

// Un joueur est « reconduit » quand il rejoint un nouveau coach alors qu'il avait
// déjà une affiliation archivée avec quelqu'un d'autre.
export const estReconduction = (affiliationsAvant, educateurId) =>
  (affiliationsAvant || []).some(a => a.statut === 'archive' && a.educateur_id !== educateurId)

export const NOTIF_RECONDUCTION = {
  type: 'reconduction',
  titre: 'Nouvelle saison, nouvelle équipe',
  texte: (coach) => `${coach ? coach : 'Ton nouvel éducateur'} t'a ajouté à son effectif. Ta nouvelle saison commence, ta saison précédente reste dans « Mes saisons ».`,
}
