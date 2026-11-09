import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { saisonActuelle, bornesSaison } from '../lib/saison'
import { getPosteFamille } from '../lib/postes'
import CarteJoueurPremium from './carte-premium/CarteJoueurPremium'
import ExportCarte from './carte-premium/ExportCarte'
import { useCadrageVisage } from '../lib/cadrageVisage'
import { nomDeFichier } from '../lib/exportCarte'
import { statutPresenceEffectif, estStatutPresent, seanceComptable } from '../lib/presence'

// ─── OVR CALCULATION ───
function calculerOVR({ buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct }) {
  const score =
    (buts * 3) +
    (passesD * 2) +
    (cleanSheets * 4) +
    (matchs * 0.8) +
    (tournoisGagnes * 8) +
    (presencePct * 0.3)
  return Math.min(99, Math.round(40 + score * 0.6))
}

export default function CarteJoueur({ userId, saison = saisonActuelle(), stats, logoClub, largeur = 280, profilJoueur }) {
  // `profilJoueur` (facultatif) : profil déjà chargé par le dashboard (prenom, nom, poste, avatar_url) ;
  // il prime sur la lecture faite ici, qui peut échouer (droits d'accès, réseau).
  // `stats` (facultatif) : buts, passesD, cleanSheets, matchs (et presencePct) déjà fusionnés (éducateur + joueur)
  // par la page Mes statistiques ; sinon la carte lit seulement les saisies du joueur.
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  async function charger() {
    if (!userId) { setLoading(false); return }
    const { date_debut, date_fin } = bornesSaison(saison)
    const aujourdHui = new Date().toISOString().split('T')[0]
    const finPeriode = aujourdHui < date_fin ? aujourdHui : date_fin

    const [{ data: profil, error: errProfil }, { data: statsRows }, { data: badges }, { data: affiliation }] = await Promise.all([
      supabase.from('profiles').select('prenom, nom, poste, categorie, club, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('stats_match_joueur').select('buts, passes_decisives, buts_encaisses').eq('joueur_id', userId).gte('date', date_debut).lte('date', date_fin),
      supabase.from('joueur_badges').select('*').eq('joueur_id', userId).eq('saison', saison),
      supabase.from('affiliations').select('educateur_id, equipe_joueur_id').eq('joueur_id', userId).eq('statut', 'accepte').maybeSingle(),
    ])

    // Taux de présence aux entraînements — même source et même logique que
    // chargerTauxPresence (DashboardJoueur.jsx). Deux bugs corrigés par
    // rapport à la version précédente :
    // - le dénominateur ne filtrait pas par club_categorie_id : un éducateur
    //   gérant plusieurs équipes voyait TOUTES ses séances comptées, y
    //   compris celles d'équipes auxquelles le joueur n'a jamais appartenu.
    //   club_categorie_id n'est pas une colonne de affiliations (contrairement
    //   à ce que le select ci-dessous supposait initialement) : c'est une
    //   colonne de equipe_joueurs, retrouvée via equipe_joueur_id — même
    //   enrichissement que chargerAffiliations (DashboardJoueur.jsx).
    // - le dénominateur comptait TOUTES les séances de la période, y compris
    //   celles jamais pointées par l'éducateur (aucune ligne dans
    //   presences_entrainement) — ces séances non saisies tombaient de facto
    //   en "absence" côté taux. Seules les séances où un statut existe
    //   réellement (pointage manuel ou réponse au sondage de présence)
    //   comptent, comme côté DashboardJoueur.jsx.
    if (errProfil) console.warn('Carte joueur : lecture du profil impossible', errProfil.message)
    let presencePct = 0
    if (affiliation?.educateur_id && affiliation?.equipe_joueur_id) {
      const { data: equipeJoueur } = await supabase.from('equipe_joueurs').select('club_categorie_id').eq('id', affiliation.equipe_joueur_id).maybeSingle()
      let qEntrainements = supabase.from('entrainements').select('id, date')
        .eq('educateur_id', affiliation.educateur_id).gte('date', date_debut).lte('date', finPeriode)
      if (equipeJoueur?.club_categorie_id) qEntrainements = qEntrainements.eq('club_categorie_id', equipeJoueur.club_categorie_id)
      const [{ data: entrainementsSaison }, { data: presences }, { data: dispos }] = await Promise.all([
        qEntrainements,
        supabase.from('presences_entrainement').select('statut, present, entrainement_id').eq('joueur_id', affiliation.equipe_joueur_id),
        supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', userId),
      ])
      const presenceMap = {}
      presences?.forEach(p => { presenceMap[p.entrainement_id] = p })
      const dispoMap = {}
      dispos?.forEach(d => { if (d.seance_id) dispoMap[d.seance_id] = d.statut })
      // Règles communes aux dashboards (lib/presence).
      const statutEffectif = (entId) => statutPresenceEffectif(presenceMap[entId], dispoMap[entId])

      const saisies = (entrainementsSaison || []).filter(e => seanceComptable(e.date) && statutEffectif(e.id) !== null)
      if (saisies.length > 0) {
        const present = saisies.filter(e => estStatutPresent(statutEffectif(e.id))).length
        presencePct = Math.round((present / saisies.length) * 100)
      }
    }

    const buts = (statsRows || []).reduce((s, r) => s + (r.buts || 0), 0)
    const passesD = (statsRows || []).reduce((s, r) => s + (r.passes_decisives || 0), 0)
    const matchs = (statsRows || []).length
    // Pas de colonne "clean sheet" — dérivé des lignes gardien (buts_encaisses
    // renseigné) à 0 encaissé.
    const cleanSheets = (statsRows || []).filter(r => r.buts_encaisses === 0).length
    const tournoisGagnes = (badges || []).filter(b => b.type === 'tournoi_victoire').length

    setData({
      profil: profil || {}, buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct,
    })
    setLoading(false)
  }

  useEffect(() => { charger() }, [userId, saison])

  const profilEff = profilJoueur?.prenom || profilJoueur?.nom ? profilJoueur : data?.profil
  // cadrage du visage calculé une fois, partagé par la carte affichée et l'image exportée
  const cadre = useCadrageVisage(profilEff?.avatar_url)

  if (loading || !data) return null

  const { tournoisGagnes } = data
  const profil = profilJoueur?.prenom || profilJoueur?.nom ? profilJoueur : data.profil
  const presencePct = stats?.presencePct ?? data.presencePct
  const { buts, passesD, cleanSheets, matchs } = stats || data
  const ovr = calculerOVR({ buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct })
  const famille = getPosteFamille(profil.poste)
  const abrev = { Gardien: 'GB', Défenseur: 'DEF', Milieu: 'MIL', Attaquant: 'ATT' }[famille]

  // Six chiffres réels : le gardien remplace les buts par ses clean sheets.
  const chiffres = [
    famille === 'Gardien' ? { cle: 'CLEAN', icone: 'DEF', valeur: cleanSheets } : { cle: 'BUTS', icone: 'TIR', valeur: buts },
    { cle: 'PASSES', icone: 'PAS', valeur: passesD },
    { cle: 'MATCHS', icone: 'MAT', valeur: matchs },
    { cle: 'MIN.', icone: 'MIN', valeur: stats?.minutes != null ? stats.minutes : '—' },
    { cle: 'PRÉS.', icone: 'PRE', valeur: `${presencePct}%` },
    { cle: 'NOTE', icone: 'NOT', valeur: stats?.noteMoyenne != null ? stats.noteMoyenne.toFixed(1).replace('.', ',') : '—' },
  ]

  const carte = {
    note: ovr, poste: abrev, nom: `${profil.prenom || ''} ${profil.nom || ''}`.trim(),
    stats: chiffres, photo: profil.avatar_url, drapeau: false,
    ecusson: logoClub ? <img src={logoClub} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }} /> : undefined,
  }

  return (
    <div style={{ width: largeur, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CarteJoueurPremium {...carte} cadre={cadre} largeur={largeur} />
      <ExportCarte carte={{ ...carte, largeur }} cadre={cadre} nomFichier={nomDeFichier(carte.nom)} />
    </div>
  )
}
