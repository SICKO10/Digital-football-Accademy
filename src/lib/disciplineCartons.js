// Cumul de cartons jaunes : règle des barèmes disciplinaires FFF (à vérifier
// auprès de la ligue / du district de chaque compétition) : 3 avertissements
// reçus en 3 matchs différents dans une période inférieure ou égale à 3 mois
// exposent à un match de suspension, décidé par la commission de discipline.
//
// Fonctions pures, sans accès à la base. Les cartons ne sont jamais supprimés de
// l'historique : seul ce calcul écarte ceux dont la période est écoulée. Un
// joueur n'est jamais déclaré « suspendu » ici : sans décision officielle,
// le plus loin que va l'état est 'trois' (suspension potentielle).
import { saisonActuelle } from './saison.js'

const SEUIL_MENACE = 2
const SEUIL_TROIS = 3
const JOURS_INFO_FIN_MENACE = 14

const enDate = (iso) => new Date(`${iso}T12:00:00`)
const enIso = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Même jour 3 mois plus tard ; un mois plus court donne son dernier jour
// (30 novembre + 3 mois = 28 ou 29 février).
export const ajouterMois = (iso, n = 3) => {
  const d = enDate(iso)
  const jour = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(jour, dernier))
  return enIso(d)
}

const ajouterJours = (iso, n) => {
  const d = enDate(iso)
  d.setDate(d.getDate() + n)
  return enIso(d)
}

// Les avertissements sont supprimés en fin de saison (1er juillet).
const debutSaison = (iso) => `${saisonActuelle(enDate(iso)).slice(0, 4)}-07-01`

// Cartons encore pris en compte à la date `iso` : reçus un jour ≤ iso, dans la
// saison, et dont la période de 3 mois n'est pas écoulée (échéance incluse).
const pertinents = (dates, iso) => {
  const debut = debutSaison(iso)
  return dates
    .filter(d => d && d >= debut && d <= iso && ajouterMois(d, 3) >= iso)
    .sort()
}

// dates : dates ISO (AAAA-MM-JJ) des matchs où le joueur a reçu un jaune.
// aujourdHui : ISO du jour. Retourne :
//   etat : 'aucun' | 'menace' | 'trois' | 'fin_menace'
//   actifs : nombre de cartons pris en compte
//   detail : ces cartons, [{ date, jusqua }] (jusqua = dernier jour où il compte)
//   echeance : (menace / trois) date où le plus ancien carton sort de la période
//   finLe : (fin_menace) date à laquelle la menace a pris fin
export const etatCartons = (dates, aujourdHui) => {
  const liste = (dates || []).filter(Boolean)
  const actifs = pertinents(liste, aujourdHui)
  const detail = actifs.map(d => ({ date: d, jusqua: ajouterMois(d, 3) }))
  if (actifs.length >= SEUIL_TROIS) {
    return { etat: 'trois', actifs: actifs.length, detail, echeance: ajouterMois(actifs[0], 3) }
  }
  if (actifs.length === SEUIL_MENACE) {
    return { etat: 'menace', actifs: actifs.length, detail, echeance: ajouterMois(actifs[0], 3) }
  }
  // Menace tombée récemment : le joueur était à 2 avertissements il y a moins de
  // 14 jours et n'y est plus (le plus ancien est sorti de la période).
  for (let j = 1; j <= JOURS_INFO_FIN_MENACE; j++) {
    const avant = pertinents(liste, ajouterJours(aujourdHui, -j))
    if (avant.length === SEUIL_MENACE) {
      const finLe = ajouterJours(ajouterMois(avant[0], 3), 1)
      if (finLe <= aujourdHui) return { etat: 'fin_menace', actifs: actifs.length, detail, finLe }
    }
  }
  return { etat: 'aucun', actifs: actifs.length, detail }
}
