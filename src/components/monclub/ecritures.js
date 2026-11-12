import { supabase } from '../../supabase'
import { OUTILS } from '../../lib/catalogueOutils'
import { affichageDepuisLignes } from '../../lib/outilsAcces'
import { appelerOutils } from '../../lib/outilsApi'
import { planRetablir } from '../../lib/journalMonClub'

// Lectures et écritures de Mon club partagées par les étapes Outils du club et
// Dashboard de mes éducateurs, et par les modèles de départ. Elles ne touchent
// jamais aux pages ni aux données : seulement à ce qui s'affiche dans les menus.

// Outils éducateur qui ont une entrée de menu à régler (Stats collectives n'en
// a pas : ce sont des parties de pages).
export const OUTILS_EDUCATEUR = OUTILS.filter(o => o.role === 'educateur' && o.menus.length > 0)

// Écrit le choix d'affichage du menu du club (cible « club ») pour un club de
// l'ancien modèle : une ligne seulement quand l'outil est masqué, aucune quand
// il est affiché (c'est le défaut).
export async function ecrireAffichageClub(clubId, outilId, visible) {
  const { error: errSuppression } = await supabase.from('mon_club_affichage')
    .delete().eq('club_id', clubId).eq('cible', 'club').eq('outil', outilId)
  if (errSuppression) throw new Error(errSuppression.message)
  if (visible) return
  const { error } = await supabase.from('mon_club_affichage').insert({ club_id: clubId, cible: 'club', outil: outilId, visible: false })
  if (error) throw new Error(error.message)
}

// Écrit une ligne d'affichage éducateur : `valeur` undefined = aucune ligne (défaut,
// ou valeur du réglage commun), sinon une ligne visible vrai ou faux.
export async function ecrireLigne(clubId, cible, educateurId, outilId, valeur) {
  let suppression = supabase.from('mon_club_affichage').delete().eq('club_id', clubId).eq('cible', cible).eq('outil', outilId)
  suppression = educateurId ? suppression.eq('educateur_id', educateurId) : suppression.is('educateur_id', null)
  const { error: errSuppression } = await suppression
  if (errSuppression) throw new Error(errSuppression.message)
  if (valeur === undefined) return
  const { error } = await supabase.from('mon_club_affichage')
    .insert({ club_id: clubId, cible, educateur_id: educateurId || null, outil: outilId, visible: valeur })
  if (error) throw new Error(error.message)
}

export async function ecrireMode(clubId, mode) {
  const { error } = await supabase.from('mon_club_reglages').upsert({ club_id: clubId, mode_educateurs: mode }, { onConflict: 'club_id' })
  if (error) throw new Error(error.message)
}

// Mode et lignes d'affichage éducateur du club, tels qu'ils sont en base.
export async function lireReglages(clubId) {
  const [reglages, lus] = await Promise.all([
    supabase.from('mon_club_reglages').select('mode_educateurs').eq('club_id', clubId).maybeSingle(),
    supabase.from('mon_club_affichage').select('cible, educateur_id, outil, visible').eq('club_id', clubId).in('cible', ['educateurs', 'educateur']),
  ])
  return { reglages, lus }
}

export const modeDepuis = (reglages) => (reglages?.data?.mode_educateurs === 'individualise' ? 'individualise' : 'commun')

// Entrée de menu vue par un éducateur : même règle que l'appli de l'éducateur.
export function visiblePour(mode, lignes, educateurId, outilId) {
  const a = affichageDepuisLignes(mode, lignes, educateurId)
  if (!a) return true
  return outilId in a.individuel ? a.individuel[outilId] : a.commun[outilId] !== false
}

// Les éducateurs sont prévenus après ce délai sans nouveau changement, un peu
// plus long que le bandeau « Annuler » : un changement annulé n'envoie rien.
export const DELAI_PREVENIR = 9000

// Envoie aux éducateurs ce qui a vraiment changé dans leur menu depuis `avant`
// ({ mode, lignes }), relu en base : un changement annulé, ou remis comme avant,
// n'envoie rien. `liste` : [{ id, nom }]. `retablitId` : ligne du journal que ce
// changement rétablit (le serveur la relie à la nouvelle ligne).
export async function prevenirEducateurs(clubId, avant, liste, retablitId) {
  const { reglages, lus } = await lireReglages(clubId)
  const echec = reglages.error || lus.error
  if (echec) throw new Error(echec.message)
  const mode = modeDepuis(reglages)
  const changements = []
  for (const educ of liste) {
    const retires = []
    const reaffiches = []
    for (const o of OUTILS_EDUCATEUR) {
      const avantVisible = visiblePour(avant.mode, avant.lignes, educ.id, o.id)
      const apresVisible = visiblePour(mode, lus.data || [], educ.id, o.id)
      if (avantVisible && !apresVisible) retires.push(o.id)
      if (!avantVisible && apresVisible) reaffiches.push(o.id)
    }
    if (retires.length || reaffiches.length) changements.push({ educateur_id: educ.id, retires, reaffiches })
  }
  if (changements.length) await appelerOutils('prevenir_menu', { changements, ...(retablitId ? { retablit_id: retablitId } : {}) })
}

// « Rétablir » une ligne du journal : remet le menu comme avant ce changement,
// prévient les éducateurs tout de suite et journalise le rétablissement. Rend
// 'deja' si le menu était déjà revenu, 'ok' sinon ; une erreur dit pourquoi
// c'est impossible tel quel.
export async function retablirEntree(clubId, entree, liste) {
  const { reglages, lus } = await lireReglages(clubId)
  const echec = reglages.error || lus.error
  if (echec) throw new Error(echec.message)
  const mode = modeDepuis(reglages)
  const lignes = lus.data || []
  const plan = planRetablir(entree, mode, lignes, liste)
  if (plan.erreur) throw new Error(plan.erreur)
  if (plan.deja) return 'deja'
  for (const e of plan.ecritures) await ecrireLigne(clubId, e.cible, e.educateurId, entree.outil, e.valeur)
  try {
    await prevenirEducateurs(clubId, { mode, lignes }, liste, entree.id)
  } catch (e) {
    console.error('Mon club : rétablissement non annoncé', e.message)
    throw new Error('Le menu est rétabli, mais vos éducateurs n\'ont pas pu être prévenus.', { cause: e })
  }
  return 'ok'
}
