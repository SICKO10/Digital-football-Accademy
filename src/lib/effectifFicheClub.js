// Range l'effectif d'une équipe dans les 4 colonnes de la Fiche club (GB / DEF / MIL / ATT).
// Un joueur sans poste renseigné n'est rangé dans aucune colonne : il est listé à part
// (getPosteFamille le classerait Milieu, ce qui serait faux sur la feuille).
import { getPosteFamille } from './postes'

const COLONNE_PAR_FAMILLE = { Gardien: 'GB', Défenseur: 'DEF', Milieu: 'MIL', Attaquant: 'ATT' }

const nomAffiche = (j) => (j.prenom || '').trim() || (j.nom || '').trim()

export function rangerEffectif(joueurs) {
  const joueursParPoste = { GB: [], DEF: [], MIL: [], ATT: [] }
  const nonRenseignes = []
  const tries = [...(joueurs || [])].sort((a, b) => nomAffiche(a).localeCompare(nomAffiche(b), 'fr'))
  for (const j of tries) {
    const nom = nomAffiche(j)
    if (!nom) continue
    if (!j.poste || !String(j.poste).trim()) { nonRenseignes.push(nom); continue }
    joueursParPoste[COLONNE_PAR_FAMILLE[getPosteFamille(j.poste)] || 'MIL'].push(nom)
  }
  const nbGB = joueursParPoste.GB.length
  const nbChamp = joueursParPoste.DEF.length + joueursParPoste.MIL.length + joueursParPoste.ATT.length + nonRenseignes.length
  return { joueursParPoste, nonRenseignes, texteAuto: `${nbChamp} + ${nbGB} GB` }
}
