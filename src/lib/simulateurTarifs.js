// Simulateur de la page publique des tarifs (bloc 13). Fonction pure : le total
// vient toujours de compositionPaiement, donc de la même grille que Mes outils et
// que le paiement. Aucun prix n'est écrit ici.
import {
  PALIERS_EDUCATEUR, FORFAITS_CLUB, PERIODICITES, compositionPaiement, forfaitPourEquipes, outilsDuPack,
} from './catalogueOutils.js'

export const MAX_EQUIPES = FORFAITS_CLUB[FORFAITS_CLUB.length - 1].equipes

// Rend { total, libelle, economie, horsGamme, aide, outils }.
// Éducateur : `outils` = ids cochés. Club : `nbEquipes`, les outils sont inclus.
// total = null tant qu'il n'y a rien à payer ou que l'offre sort de la grille.
export function simulerOffre(role, { outils = [], nbEquipes = 1, periodicite = 'mensuel' } = {}) {
  const per = PERIODICITES.includes(periodicite) ? periodicite : 'mensuel'
  const annuel = per === 'annuel'

  if (role === 'club') {
    const f = forfaitPourEquipes(nbEquipes)
    if (!f) return { total: null, libelle: '', economie: 0, horsGamme: true, aide: '', outils: [] }
    const c = compositionPaiement('club', { palier: f.palier, periodicite: per }, nbEquipes)
    return {
      total: c.total,
      libelle: f.nom,
      economie: annuel ? f.prixMensuel * 12 - f.prixAnnuel : 0,
      horsGamme: false,
      aide: '',
      outils: [],
    }
  }

  const n = outils.length
  if (n === 0) return { total: 0, libelle: 'Aucun outil choisi : le socle gratuit', economie: 0, horsGamme: false, aide: '', outils: [] }
  const c = compositionPaiement('educateur', { outils, periodicite: per })
  if (c.erreur) return { total: null, libelle: '', economie: 0, horsGamme: false, aide: c.erreur, outils: [] }
  const p = PALIERS_EDUCATEUR.find(x => x.id === c.paliersOutils)
  const libre = p.max - n
  const tous = outilsDuPack().length
  let aide = ''
  if (p.max === tous) aide = `Ce palier donne les ${tous} outils, même si tu en as coché moins.`
  else if (libre > 0) aide = `Tu peux ajouter ${libre} ${libre > 1 ? 'outils' : 'outil'} sans supplément.`
  return {
    total: c.total,
    libelle: `${n} ${n > 1 ? 'outils choisis' : 'outil choisi'} : palier jusqu'à ${p.max} outils`,
    economie: annuel ? p.prixMensuel * 12 - p.prixAnnuel : 0,
    horsGamme: false,
    aide,
    outils: c.outils,
  }
}
