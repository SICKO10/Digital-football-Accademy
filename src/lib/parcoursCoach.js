import { supabase } from '../supabase'
import { fetchToutesLignes, fetchToutesLignesIn } from './supabasePagination'
import { rpeDeReponse } from './rpe'
import { saisonActuelle, saisonDeDate } from './saison'
import { bilanSaisonEquipe } from './statsSaison'

// Parcours d'un coach : lecture de ses données datées, calcul par saison et par
// équipe, puis publication des totaux dans coach_bilans_publics (Explorer).
// Utilisé par Mon profil (MesSaisonsCoach) et par la publication automatique.

// Lit les données du coach. Renvoie null si une lecture échoue.
export const chargerDonneesParcours = async (educateurId) => {
  const [m, e, ej, dem] = await Promise.all([
    fetchToutesLignes(() => supabase.from('matchs_equipe').select('id, date, club_categorie_id, score_nous, score_eux, competition, buts_detail').eq('educateur_id', educateurId).order('id')),
    fetchToutesLignes(() => supabase.from('entrainements').select('id, date, club_categorie_id, presences_entrainement(statut, present)').eq('educateur_id', educateurId).order('id')),
    fetchToutesLignes(() => supabase.from('equipe_joueurs').select('id, club_categorie_id').eq('educateur_id', educateurId).order('id')),
    fetchToutesLignes(() => supabase.from('seances_notes_demandes').select('id, date_seance, club_categorie_id').eq('educateur_id', educateurId).order('id')),
  ])
  if (m.error || e.error || ej.error || dem.error) return null
  const demandeIds = dem.data.map(d => d.id)
  const joueurIds = ej.data.map(j => j.id)
  const [rep, bl] = await Promise.all([
    demandeIds.length ? fetchToutesLignesIn(demandeIds, ids => supabase.from('seances_notes_joueurs').select('id, demande_id, rpe, charge_travail').in('demande_id', ids).order('id')) : { data: [] },
    joueurIds.length ? fetchToutesLignesIn(joueurIds, ids => supabase.from('blessures').select('id, equipe_joueur_id, statut, saison, date_debut').in('equipe_joueur_id', ids).order('id')) : { data: [] },
  ])
  const catIds = [...new Set([...m.data, ...e.data].map(x => x.club_categorie_id).filter(Boolean))]
  const { data: cats } = catIds.length
    ? await supabase.from('club_categories').select('id, nom, equipe, club_id').in('id', catIds)
    : { data: [] }
  const clubIds = [...new Set((cats || []).map(c => c.club_id).filter(Boolean))]
  const { data: clubs } = clubIds.length
    ? await supabase.from('profiles_public').select('id, club').in('id', clubIds)
    : { data: [] }
  return { matchs: m.data, entrainements: e.data, joueursEq: ej.data, demandes: dem.data, reponses: rep.data || [], blessures: bl.data || [], cats: cats || [], clubs: clubs || [] }
}

// Une carte par saison (la plus récente d'abord), une ligne de bilan par équipe.
export const construireSaisons = (etat) => {
  if (!etat?.matchs) return []
  const { matchs, entrainements, joueursEq, demandes, reponses, blessures, cats, clubs } = etat
    const catParId = Object.fromEntries(cats.map(c => [c.id, c]))
    const clubParId = Object.fromEntries(clubs.map(c => [c.id, c.club]))
    const equipeDeJoueur = Object.fromEntries(joueursEq.map(j => [j.id, j.club_categorie_id]))
    const demandeParId = Object.fromEntries(demandes.map(d => [d.id, d]))

    // saison -> équipe -> morceaux de données
    const arbre = {}
    const poche = (saison, eq) => {
      arbre[saison] ||= {}
      return (arbre[saison][eq] ||= { matchs: [], entrainements: [], blessures: [], rpes: [] })
    }
    matchs.forEach(x => { const s = saisonDeDate(x.date); if (s && x.club_categorie_id) poche(s, x.club_categorie_id).matchs.push(x) })
    entrainements.forEach(x => { const s = saisonDeDate(x.date); if (s && x.club_categorie_id) poche(s, x.club_categorie_id).entrainements.push(x) })
    reponses.forEach(r => {
      const d = demandeParId[r.demande_id]
      const v = rpeDeReponse(r)
      const s = d && saisonDeDate(d.date_seance)
      if (s && v && d.club_categorie_id) poche(s, d.club_categorie_id).rpes.push(v.valeur)
    })
    // Une blessure n'est comptée que pour une équipe déjà présente cette saison-là.
    blessures.forEach(b => {
      const s = b.saison || saisonDeDate(b.date_debut)
      const eq = equipeDeJoueur[b.equipe_joueur_id]
      if (s && arbre[s]?.[eq]) arbre[s][eq].blessures.push(b)
    })

    return Object.keys(arbre).sort().reverse().map(saison => ({
      saison,
      enCours: saison === saisonActuelle(),
      equipes: Object.entries(arbre[saison]).map(([eq, donnees]) => {
        const cat = catParId[eq]
        return {
          id: eq,
          connue: !!cat,
          club: cat ? clubParId[cat.club_id] || null : null,
          nom: cat ? [cat.nom, cat.equipe].filter(Boolean).join(' ') : 'Équipe',
          bilan: bilanSaisonEquipe(donnees),
        }
      }).sort((a, b) => a.nom.localeCompare(b.nom)),
    }))
}

// Publie les totaux de chaque équipe connue. Aucun nom de joueur ni d'adversaire n'est envoyé.
export const publierParcours = async (educateurId, saisons) => {
  const lignes = saisons.flatMap(sa => sa.equipes.filter(eq => eq.connue).map(eq => ({
    educateur_id: educateurId, saison: sa.saison, club_categorie_id: eq.id,
    club_nom: eq.club, categorie_nom: eq.nom, maj: new Date().toISOString(),
    matchs: eq.bilan.matchs, nb_v: eq.bilan.nbV, nb_n: eq.bilan.nbN, nb_d: eq.bilan.nbD,
    buts_marques: eq.bilan.butsMarques, buts_encaisses: eq.bilan.butsEncaisses,
    presents: eq.bilan.presents, nb_presences: eq.bilan.nbPresences,
  })))
  if (lignes.length) await supabase.from('coach_bilans_publics').upsert(lignes, { onConflict: 'educateur_id,saison,club_categorie_id' })
  if (!lignes.length) return null
  const { error } = await supabase.from('coach_bilans_publics').upsert(lignes, { onConflict: 'educateur_id,saison,club_categorie_id' })
  return error || null
}
