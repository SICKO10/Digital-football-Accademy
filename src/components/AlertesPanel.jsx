import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'

// Icônes locales (pas d'emoji, cf. mémoire "no emojis in new UI") — même style
// que les Ico* déjà présents dans DashboardEducateur.jsx, dupliquées ici plutôt
// qu'importées : ce fichier ne les exporte pas et ce composant doit rester
// autonome (aucune dépendance vers le fichier page qui le consomme).
const IcoAlertTriangle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoShirt2       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l5 4-3 3-2-2v12a1 1 0 01-1 1H9a1 1 0 01-1-1V8l-2 2-3-3 5-4a4 4 0 008 0z"/></svg>
const IcoBus2         = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="10" rx="2"/><path d="M3 11h18"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/></svg>
const IcoCalendarEvt  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoBell         = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>

// Panneau d'alertes de l'accueil éducateur, remplace l'ancien "Dernières
// réponses aux sondages" (peu actionnable — juste un historique). Regroupe des
// signaux qui appellent réellement une action :
// - Cartons jaunes (2+ = risque de suspension) : dérivé de `matchs` (déjà
//   chargé par le parent avec stats_match imbriqué), aucune requête ici.
// - Équipement prêt à récupérer, filtré à ce seul éducateur (equipement_commandes
//   est scopé au club entier, qui peut avoir plusieurs éducateurs).
// - Déplacements dont la capacité des véhicules assignés est insuffisante par
//   rapport à nb_personnes — même calcul que Deplacements.jsx (capaciteVehicule).
// - Événements du club marqués visibles aux éducateurs (evenements_club).
//
// Volontairement absent : les créneaux de terrain libérés ont déjà leur propre
// widget dédié et éprouvé (TerrainsLiberesWidget, avec abonnement realtime) —
// dupliquer cette requête ici aurait fait cohabiter deux implémentations du
// même signal, à faire diverger avec le temps.
export default function AlertesPanel({ educateurId, clubId, joueurs = [], matchs = [], setActiveSection }) {
  const [commandesPretes, setCommandesPretes] = useState([])
  const [deplacementsRisque, setDeplacementsRisque] = useState([])
  const [evenements, setEvenements] = useState([])
  const [evenementOuvert, setEvenementOuvert] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const charger = async () => {
      if (!educateurId) { setLoading(false); return }
      const idsRoster = new Set(joueurs.map(j => j.joueur_id).filter(Boolean))
      const aujourdhui = new Date().toISOString().slice(0, 10)

      const [{ data: commandes }, { data: deps }, { data: vehicules }, { data: evts }] = await Promise.all([
        clubId
          ? supabase.from('equipement_commandes').select('id, destinataire_id, destinataire_nom, statut').eq('club_id', clubId).eq('statut', 'pret')
          : Promise.resolve({ data: [] }),
        supabase.from('deplacements').select('id, lieu_destination, date_depart, nb_personnes, vehicule').eq('educateur_id', educateurId).gte('date_depart', aujourdhui),
        clubId
          ? supabase.from('vehicules').select('plaque, capacite').eq('club_id', clubId)
          : Promise.resolve({ data: [] }),
        clubId
          ? supabase.from('evenements_club').select('id, titre, description, date, heure, lieu').eq('club_id', clubId).eq('visible_educateurs', true).gte('date', aujourdhui).order('date').limit(3)
          : Promise.resolve({ data: [] }),
      ])

      setCommandesPretes((commandes || []).filter(c => idsRoster.has(c.destinataire_id)))

      // Même règle que capaciteVehicule dans Deplacements.jsx : d.vehicule peut
      // combiner plusieurs plaques ("PLAQUE1 + PLAQUE2"), null si aucun véhicule
      // assigné ou si une plaque ne correspond à aucun véhicule du parc.
      const capaciteVehicule = (d) => {
        if (!d.vehicule) return null
        const plaques = d.vehicule.split('+').map(p => p.trim()).filter(Boolean)
        const capacites = plaques.map(p => vehicules?.find(v => v.plaque === p)?.capacite)
        if (capacites.some(c => c == null)) return null
        return capacites.reduce((sum, c) => sum + c, 0)
      }
      setDeplacementsRisque(
        (deps || [])
          .map(d => ({ ...d, cap: capaciteVehicule(d) }))
          .filter(d => d.cap !== null && d.nb_personnes > d.cap)
      )

      setEvenements(evts || [])
      setLoading(false)
    }
    charger()
  }, [educateurId, clubId, joueurs, matchs])

  const cartonsParJoueur = {}
  matchs.forEach(m => (m.stats_match || []).forEach(s => {
    if (s.carton_jaune) cartonsParJoueur[s.joueur_id] = (cartonsParJoueur[s.joueur_id] || 0) + 1
  }))
  const cartonsAlerte = Object.entries(cartonsParJoueur)
    .filter(([, n]) => n >= 2)
    .map(([joueurId, n]) => {
      const j = joueurs.find(j => j.id === joueurId)
      return { id: joueurId, nom: j ? `${j.prenom} ${j.nom}` : 'Joueur', n }
    })

  const alertes = [
    ...cartonsAlerte.map(c => ({
      id: `carton_${c.id}`, Icon: IcoAlertTriangle, couleur: colors.accent.amber,
      titre: `${c.nom} — ${c.n} carton${c.n > 1 ? 's' : ''} jaune${c.n > 1 ? 's' : ''}`,
      sousTitre: c.n === 2 ? 'Prochain jaune = suspension' : 'Suspendu au prochain match',
      onClick: () => setActiveSection?.('stats'),
    })),
    ...commandesPretes.map(c => ({
      id: `materiel_${c.id}`, Icon: IcoShirt2, couleur: colors.accent.green,
      titre: `Pack prêt — ${c.destinataire_nom || 'joueur'}`,
      sousTitre: 'En attente de récupération',
      onClick: () => setActiveSection?.('materiel'),
    })),
    ...deplacementsRisque.map(d => ({
      id: `deplacement_${d.id}`, Icon: IcoBus2, couleur: colors.accent.red,
      titre: `Déplacement — ${d.lieu_destination || 'destination à préciser'}`,
      sousTitre: `${d.nb_personnes} personnes pour ${d.cap} place${d.cap > 1 ? 's' : ''}`,
      onClick: () => setActiveSection?.('deplacements'),
    })),
    ...evenements.map(e => ({
      id: `evenement_${e.id}`, Icon: IcoCalendarEvt, couleur: colors.accent.purpleLight,
      titre: e.titre,
      sousTitre: new Date(`${e.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
      onClick: () => setEvenementOuvert(e),
    })),
  ]

  if (loading) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><IcoBell /> Alertes & infos</p>
        {alertes.length > 0 && (
          <span style={{ background: colors.accent.red, color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>{alertes.length}</span>
        )}
      </div>

      {alertes.length === 0 ? (
        <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Aucune alerte pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alertes.map(a => (
            <div key={a.id} onClick={a.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: colors.background.raised, border: `1px solid ${a.couleur}30`, borderLeft: `3px solid ${a.couleur}`, borderRadius: '10px', cursor: 'pointer' }}>
              <span style={{ color: a.couleur, flexShrink: 0, display: 'flex' }}><a.Icon /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{a.sousTitre}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {evenementOuvert && (
        <div onClick={() => setEvenementOuvert(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>{evenementOuvert.titre}</p>
              <button onClick={() => setEvenementOuvert(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: colors.accent.purpleLight, fontSize: '13px', margin: '0 0 12px' }}>
              {new Date(`${evenementOuvert.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {evenementOuvert.heure ? ` · ${evenementOuvert.heure.slice(0, 5)}` : ''}
              {evenementOuvert.lieu ? ` · ${evenementOuvert.lieu}` : ''}
            </p>
            {evenementOuvert.description && <p style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{evenementOuvert.description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
