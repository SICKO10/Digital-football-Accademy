// Calculs purs du renfort (bloc 7 du chantier catégories) : un joueur d'une
// autre équipe de la catégorie, convoqué ponctuellement pour un match.
import { libelleEquipe } from './categoriesJoueur.js'

// « renfort U15 B » ; sans équipe lisible, juste « renfort ».
export function libelleRenfort(r) {
  const equipe = libelleEquipe(r?.equipe_nom, r?.equipe_lettre)
  return equipe ? `renfort ${equipe}` : 'renfort'
}

const nettoyer = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Joueurs proposables : on retire ceux déjà ajoutés ou déjà dans la liste de
// l'équipe du match, puis on filtre sur prénom, nom, poste, numéro ou équipe
// (sans tenir compte des accents ni des majuscules).
export function candidatsRenfort(possibles, renforts, joueursEquipe, recherche) {
  const deja = new Set([...(renforts || []), ...(joueursEquipe || [])].map(j => j.fiche_id || j.id))
  const mots = nettoyer(recherche).split(/\s+/).filter(Boolean)
  return (possibles || [])
    .filter(p => !deja.has(p.fiche_id))
    .filter(p => {
      const texte = nettoyer([p.prenom, p.nom, p.poste, p.numero_maillot, p.equipe_nom, p.equipe_lettre].join(' '))
      return mots.every(m => texte.includes(m))
    })
}

export function ajouterRenfort(renforts, joueur) {
  const liste = renforts || []
  return liste.some(r => r.fiche_id === joueur.fiche_id) ? liste : [...liste, joueur]
}

export function retirerRenfort(renforts, ficheId) {
  return (renforts || []).filter(r => r.fiche_id !== ficheId)
}

// Comptes à convoquer pour les renforts (un renfort sans compte ne peut pas
// être convoqué : il n'a pas d'écran où voir la convocation).
export function comptesRenforts(renforts) {
  return [...new Set((renforts || []).map(r => r.joueur_id).filter(Boolean))]
}

// Feuille de match : la liste de l'équipe, puis les renforts du match. Même
// forme que les fiches de l'équipe (id = fiche), avec la mention « renfort ».
export function lignesFeuilleMatch(joueursEquipe, renforts) {
  const ids = new Set((joueursEquipe || []).map(j => j.id))
  const extra = (renforts || [])
    .filter(r => !ids.has(r.fiche_id))
    .map(r => ({
      id: r.fiche_id, prenom: r.prenom, nom: r.nom, poste: r.poste,
      numero_maillot: r.numero_maillot, joueur_id: r.joueur_id, mentionRenfort: libelleRenfort(r),
    }))
  return [...(joueursEquipe || []), ...extra]
}
