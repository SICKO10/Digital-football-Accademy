import { affichageDepuisLignes, menuVisible } from './outilsAcces.js'
import { outilsDuRole, cleFournitureClub } from './catalogueOutils.js'

// Menu d'un éducateur affilié, tel que le club le voit dans « Voir comme un
// éducateur ». Mêmes sections, entrées et sous-onglets que le menu de
// DashboardEducateur.jsx (à garder alignés si ce menu change).
const SECTIONS = [
  { titre: 'MON ÉQUIPE', items: [
    { key: 'equipe', label: 'Mon équipe', subKeys: ['equipe', 'stats', 'sante', 'historique'] },
    { key: 'matchs', label: 'Compétition' },
    { key: 'organisation', label: 'Organisation', subKeys: ['materiel', 'terrains', 'deplacements'] },
    { key: 'mes_outils', label: 'Mes outils' },
    { key: 'stages', label: 'Stages' },
  ] },
  { titre: 'ENTRAÎNEMENT', items: [
    { key: 'entrainements', label: 'Création entraînement', subKeys: ['entrainements', 'mes_seances'] },
    { key: 'prep_physique', label: 'Préparation physique' },
    { key: 'tactipad', label: 'Tacticboard' },
    { key: 'bibliotheque', label: 'Bibliothèque' },
  ] },
  { titre: 'THÈME PROJET', items: [
    { key: 'projets', label: 'Projets', subKeys: ['projet_sportif', 'projet_club_cff4'] },
  ] },
  { titre: 'SUIVI & RÉSEAU', items: [
    { key: 'suivi', label: 'Rapports & Évaluations', subKeys: ['analyse_video', 'notes', 'clotures_saison'] },
  ] },
]

// Aperçu calculé, en lecture seule : le menu d'un éducateur sans aucun réglage
// du club (`avant`) et avec les réglages en cours (`visible`), par la même règle
// que l'appli de l'éducateur (menuVisible). Ne lit aucune donnée de l'éducateur :
// seuls le mode et les lignes du club servent. `educateurId` null = éducateur
// type (réglage commun seulement). Un outil que l'éducateur paie lui-même reste
// affiché chez lui : l'aperçu ne peut pas le savoir.
// `fournis` (club du nouveau modèle) : ids des outils que le club fournit à cet
// éducateur ([] = socle seulement, éducateur sans place). Une entrée visible si
// tout était fourni mais pas maintenant porte `nonFourni`. Null = ancien modèle.
export function apercuMenuEducateur(mode, lignes, educateurId = null, fournis = null) {
  const affichageClub = affichageDepuisLignes(mode, lignes, educateurId)
  const toutFourni = outilsDuRole('educateur').map(cleFournitureClub)
  const compte = (clubOutils, affichage) => (fournis === null
    ? { role: 'educateur', modeleOutils: false, droits: [], affichageClub: affichage }
    : { role: 'educateur', modeleOutils: true, droits: [], clubOutils, affichageClub: affichage })
  const compteAvec = compte(fournis || [], affichageClub)
  const sans = compte(toutFourni, null)
  const fourniSeul = compte(toutFourni, affichageClub)
  const voit = (c, item) => (item.subKeys || [item.key]).some(k => menuVisible(c, k))
  return SECTIONS
    .map(s => ({
      titre: s.titre,
      items: s.items.map(i => {
        const visible = voit(compteAvec, i)
        const nonFourni = fournis !== null && !visible && voit(fourniSeul, i)
        return { key: i.key, label: i.label, visible, nonFourni, retire: !visible && !nonFourni && voit(sans, i) }
      }),
    }))
    .filter(s => s.items.length > 0)
}
