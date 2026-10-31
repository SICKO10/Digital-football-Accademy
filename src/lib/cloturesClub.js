// Bilan de clôture de saison côté club (bloc 10 du chantier saisons).
// Fonctions pures, testées dans tests/cloturesClub.test.js, sans accès à la base.
// Rien n'est archivé ici : chaque coach clôture sa propre équipe (GestionCloturesSaison).

// État de clôture d'une équipe pour une saison, d'après les affiliations de ses joueurs :
//  - 'a_cloturer'  : des joueurs sont encore affiliés (accepté) ;
//  - 'cloturee'    : plus aucun joueur affilié et au moins une affiliation archivée cette saison ;
//  - 'sans_joueur' : un coach en place mais aucun joueur à archiver ;
//  - 'sans_coach'  : ni coach ni joueur.
export const etatClotureEquipe = ({ equipe, equipeJoueurs, affiliations, saison }) => {
  const ids = new Set(equipeJoueurs.filter(ej => ej.club_categorie_id === equipe.id).map(ej => ej.id))
  const siennes = affiliations.filter(a => ids.has(a.equipe_joueur_id))
  if (siennes.some(a => a.statut === 'accepte')) return 'a_cloturer'
  if (siennes.some(a => a.statut === 'archive' && a.saison === saison)) return 'cloturee'
  return equipe.educateur_id ? 'sans_joueur' : 'sans_coach'
}

export const bilanCloturesClub = ({ equipes, equipeJoueurs, affiliations, saison }) => {
  const lignes = equipes.map(equipe => ({
    equipe, etat: etatClotureEquipe({ equipe, equipeJoueurs, affiliations, saison }),
  }))
  const compte = (e) => lignes.filter(l => l.etat === e).length
  return { lignes, nbCloturees: compte('cloturee'), nbACloturer: compte('a_cloturer') }
}

export const LIBELLE_ETAT_CLOTURE = {
  cloturee: 'Clôturée',
  a_cloturer: 'Pas encore clôturée',
  sans_joueur: 'Aucun joueur à archiver',
  sans_coach: 'Sans éducateur',
}
