import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase, signOutSafe } from '../supabase'
import { ModalNotation } from '../components/Notation'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { notifierJoueur } from '../lib/notifications'
import AnalyseurIA from '../components/AnalyseurIA'
import { STRIPE_LINKS_CLUB, stripeUrl } from '../lib/stripeLinks'
import { COACH_ADMIN_EMAILS } from '../lib/coachAdmin'
import { colors, alpha } from '../tokens'

import Overview from './coach/Overview'
import Users from './coach/Users'
import Subscriptions from './coach/Subscriptions'
import Revenue from './coach/Revenue'
import Referrals from './coach/Referrals'
import PlayerAnalysis from './coach/PlayerAnalysis'
import Badges from './coach/Badges'
import CoachSessions from './coach/CoachSessions'
import ClubRequests from './coach/ClubRequests'
import Support from './coach/Support'
import StripeLinks from './coach/StripeLinks'
import ClubsAgents from './coach/ClubsAgents'

function DashboardCoach() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loomUrls, setLoomUrls] = useState({})
  const [rapportPdfFiles, setRapportPdfFiles] = useState({})
  const [sending, setSending] = useState({})
  const [coachId, setCoachId] = useState(null)
  const [coachEmail, setCoachEmail] = useState(null)

  // Clubs en attente d'activation (accès restreint, cf. COACH_ADMIN_EMAILS)
  const [clubsEnAttente, setClubsEnAttente] = useState([])
  const [palierChoisi, setPalierChoisi] = useState({}) // { [clubId]: 'c0' | 'c100' | ... }
  const [activatingClub, setActivatingClub] = useState(null)

  // Demandes de contact club envoyées depuis /offres (accès restreint, cf. COACH_ADMIN_EMAILS)
  const [demandesClub, setDemandesClub] = useState([])
  const [traitantDemande, setTraitantDemande] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Certifications
  const [certifs, setCertifs] = useState([])
  const [certifLoading, setCertifLoading] = useState(true)
  const [commentaires, setCommentaires] = useState({})
  const [validating, setValidating] = useState({})

  // Clubs / Agents
  const [recruteurs, setRecruteurs] = useState([])
  const [recruteurModal, setRecruteurModal] = useState(null)

  // Notation
  const [notationCible, setNotationCible] = useState(null)

  // Séances transférées par les clubs
  const [seancesTransferees, setSeancesTransferees] = useState([])
  const [seanceEvalModal, setSeanceEvalModal] = useState(null)

  // Support (tickets envoyés depuis le widget "💬 Support" — cf. FloatingHelper.jsx)
  const [tickets, setTickets] = useState([])
  const [reponseDrafts, setReponseDrafts] = useState({})
  const [savingTicket, setSavingTicket] = useState(null)
  const [ticketsError, setTicketsError] = useState(null)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCoachId(user.id)
      setCoachEmail(user.email)
    }
    const taches = [getDemandes(), getCertifications(), getRecruteurs(), chargerSeancesTransferees(), getTickets()]
    if (COACH_ADMIN_EMAILS.includes(user?.email)) taches.push(getClubsEnAttente(), getDemandesClub())
    await Promise.all(taches)
  }

  const getTickets = async () => {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
    if (error) {
      // 42P01 = la table n'existe pas encore (supabase_support_tickets.sql pas exécuté) —
      // dans les deux cas on préfère un message clair à une liste vide silencieuse.
      console.error('❌ Chargement des tickets support échoué :', error.code, error.message)
      setTicketsError(error.code === '42P01'
        ? "La table support_tickets n'existe pas encore en base — exécute supabase_support_tickets.sql dans l'éditeur SQL Supabase."
        : `Erreur de chargement : ${error.message}`)
      return
    }
    setTicketsError(null)
    const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))]
    let profilsParId = {}
    if (userIds.length > 0) {
      const { data: profils } = await supabase.from('profiles').select('id, prenom, nom, email').in('id', userIds)
      profilsParId = Object.fromEntries((profils || []).map(p => [p.id, p]))
    }
    setTickets((data || []).map(t => ({ ...t, expediteur: profilsParId[t.user_id] })))
  }

  const marquerTicketResolu = async (id) => {
    const avant = tickets.find(t => t.id === id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, statut: 'resolu' } : t))
    setSavingTicket(id)
    const { error } = await supabase.from('support_tickets').update({ statut: 'resolu' }).eq('id', id)
    setSavingTicket(null)
    if (error) {
      alert('Erreur : ' + error.message)
      if (avant) setTickets(prev => prev.map(t => t.id === id ? avant : t))
    }
  }

  const envoyerReponseTicket = async (id) => {
    const reponse = (reponseDrafts[id] || '').trim()
    if (!reponse) return
    setSavingTicket(id)
    const { error } = await supabase.from('support_tickets').update({ reponse, coach_id: coachId, statut: 'resolu' }).eq('id', id)
    setSavingTicket(null)
    if (error) { alert('Erreur : ' + error.message); return }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, reponse, coach_id: coachId, statut: 'resolu' } : t))
    setReponseDrafts(prev => ({ ...prev, [id]: '' }))
  }

  const getDemandesClub = async () => {
    const { data, error } = await supabase
      .from('demandes_club')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('❌ Chargement des demandes club échoué :', error.code, error.message)
    setDemandesClub(data || [])
  }

  const marquerDemandeTraitee = async (id) => {
    // Optimistic : la demande sort de la liste tout de suite, sans attendre
    // la réponse Supabase ni un rechargement complet.
    const avant = demandesClub.find(d => d.id === id)
    setDemandesClub(prev => prev.filter(d => d.id !== id))
    setTraitantDemande(id)
    const { error } = await supabase.from('demandes_club').update({ statut: 'traite' }).eq('id', id)
    setTraitantDemande(null)
    if (error) {
      alert('Erreur : ' + error.message)
      if (avant) setDemandesClub(prev => [avant, ...prev])
    }
  }

  const getClubsEnAttente = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, created_at')
      .eq('plan', 'club')
      .eq('abonnement_actif', false)
      .order('created_at', { ascending: false })
    setClubsEnAttente(data || [])
  }

  const activerClub = async (clubId) => {
    // Optimistic : le club sort de la liste "en attente" tout de suite, sans
    // attendre la réponse Supabase ni un rechargement complet.
    const avant = clubsEnAttente.find(c => c.id === clubId)
    setClubsEnAttente(prev => prev.filter(c => c.id !== clubId))
    setActivatingClub(clubId)
    const { error } = await supabase.from('profiles').update({ abonnement_actif: true }).eq('id', clubId)
    setActivatingClub(null)
    if (error) {
      alert('Erreur : ' + error.message)
      if (avant) setClubsEnAttente(prev => [avant, ...prev])
    }
  }

  const copierLienClub = (clubId, palier, cycle) => {
    const lien = stripeUrl(STRIPE_LINKS_CLUB[palier][cycle], clubId)
    navigator.clipboard.writeText(lien)
  }

  const prendreEnCharge = async (table, id, dejaPris) => {
    if (dejaPris) {
      await supabase.from(table).update({ pris_en_charge_par: null, pris_en_charge_at: null }).eq('id', id)
    } else {
      await supabase.from(table).update({ pris_en_charge_par: coachId, pris_en_charge_at: new Date().toISOString() }).eq('id', id)
    }
    if (table === 'demandes') await getDemandes()
    else await chargerSeancesTransferees()
  }

  const getDemandes = async () => {
    const { data, error } = await supabase
      .from('demandes')
      .select('*, profiles!demandes_joueur_id_fkey(id, prenom, nom, email, plan), coach:profiles!demandes_pris_en_charge_par_fkey(prenom, nom)')
      .order('created_at', { ascending: false })
    if (error) console.error('Erreur getDemandes:', error)
    if (!error) setDemandes(data)
    setLoading(false)
  }

  const getRecruteurs = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, region, type_recruteur, description, recherche_profil, avatar_url, plan')
      .eq('plan', 'scout')
      .order('created_at', { ascending: false })
    if (data) setRecruteurs(data)
  }

  const chargerSeancesTransferees = async () => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, educateur:educateur_id(prenom, nom), club:club_id(club, prenom, nom), evaluation:evaluations_seance(*), coach:pris_en_charge_par(prenom, nom)')
      .eq('statut', 'transfere_coach')
      .order('created_at', { ascending: false })
    setSeancesTransferees(data || [])
  }

  const soumettreGrilleCoach = async (payload) => {
    const seance = seanceEvalModal
    if (!seance) return
    // Optimistic : la modale se ferme tout de suite. Les 3 opérations
    // (évaluation, statut de la séance, notification) sont indépendantes —
    // aucune ne dépend du résultat d'une autre — donc en parallèle.
    setSeanceEvalModal(null)
    const [{ error }] = await Promise.all([
      supabase.from('evaluations_seance').upsert({
        seance_id: seance.id,
        evaluateur_id: coachId,
        evaluateur_type: 'coach',
        criteres: payload.criteres,
        note_preparation: payload.note_preparation,
        note_animation: payload.note_animation,
        note_pedagogie: payload.note_pedagogie,
        note_management: payload.note_management,
        note_football: payload.note_football,
        note_totale: payload.note_totale,
        points_forts: payload.points_forts,
        axes_amelioration: payload.axes_amelioration,
        actions: payload.actions,
      }, { onConflict: 'seance_id' }),
      supabase.from('seances_uploadees').update({ statut: 'analyse' }).eq('id', seance.id),
      (async () => {
        try {
          const destinataireId = seance.origine === 'ouvert' ? seance.educateur_id : seance.club_id
          if (destinataireId) {
            await notifierJoueur({
              type: 'analyse_seance',
              userId: destinataireId,
              titre: 'Analyse de séance disponible',
              contenu: { texte: `La séance "${seance.theme || 'sans thème'}" a été analysée par un coach.` },
              lien: seance.origine === 'ouvert' ? '/educateur' : '/club',
            })
          }
        } catch (e) {
          console.error('Erreur notification analyse séance:', e)
        }
      })(),
    ])
    if (error) {
      alert("Erreur lors de l'enregistrement de l'évaluation : " + error.message + '\n\nMerci de recommencer l\'évaluation.')
    }
    await chargerSeancesTransferees()
  }

  const getCertifications = async () => {
    const { data, error } = await supabase
      .from('certifications')
      .select('*, profiles(id, prenom, nom, email)')
      .order('created_at', { ascending: false })
    if (!error) setCertifs(data || [])
    setCertifLoading(false)
  }

  const validerCertification = async (certif) => {
    const avant = certif.statut
    setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: 'validé' } : c))
    setValidating(prev => ({ ...prev, [certif.id]: 'validating' }))
    const [{ error }] = await Promise.all([
      supabase.from('certifications')
        .update({ statut: 'validé', validated_at: new Date().toISOString(), commentaire_admin: commentaires[certif.id] || null })
        .eq('id', certif.id),
      coachId && certif.profiles?.id
        ? supabase.from('messages').insert({
            sender_id: coachId,
            receiver_id: certif.profiles.id,
            content: `⭐ Félicitations ! Ta certification "${certif.niveau}" pour la saison ${certif.saison} a été validée. Le badge apparaît maintenant sur ton profil.`,
            created_at: new Date().toISOString()
          })
        : Promise.resolve({ error: null }),
    ])
    setValidating(prev => ({ ...prev, [certif.id]: null }))
    if (error) {
      alert('Erreur : ' + error.message)
      setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: avant } : c))
    }
  }

  const rejeterCertification = async (certif) => {
    const motif = commentaires[certif.id]?.trim()
    if (!motif) { alert('Indique un motif de rejet avant de rejeter.'); return }
    const avant = certif.statut
    setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: 'rejeté', commentaire_admin: motif } : c))
    setValidating(prev => ({ ...prev, [certif.id]: 'rejecting' }))
    const [{ error }] = await Promise.all([
      supabase.from('certifications')
        .update({ statut: 'rejeté', commentaire_admin: motif })
        .eq('id', certif.id),
      coachId && certif.profiles?.id
        ? supabase.from('messages').insert({
            sender_id: coachId,
            receiver_id: certif.profiles.id,
            content: `❌ Ta demande de certification "${certif.niveau}" (${certif.saison}) a été rejetée. Motif : ${motif}`,
            created_at: new Date().toISOString()
          })
        : Promise.resolve({ error: null }),
    ])
    setValidating(prev => ({ ...prev, [certif.id]: null }))
    if (error) {
      alert('Erreur : ' + error.message)
      setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: avant } : c))
    }
  }

  const envoyerAnalyse = async (demandeId, joueurId) => {
    const loomUrl = loomUrls[demandeId]
    if (!loomUrl) return alert('Colle le lien vidéo avant de valider')

    setSending(prev => ({ ...prev, [demandeId]: true }))

    let rapportPdfUrl = null
    const pdfFile = rapportPdfFiles[demandeId]
    if (pdfFile) {
      const nomFichier = `rapport_${demandeId}_${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('rapports')
        .upload(nomFichier, pdfFile, { contentType: 'application/pdf', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('rapports').getPublicUrl(nomFichier)
        rapportPdfUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('demandes')
      .update({ statut: 'analyse', loom_url: loomUrl, ...(rapportPdfUrl ? { rapport_pdf_url: rapportPdfUrl } : {}) })
      .eq('id', demandeId)
    if (error) {
      setSending(prev => ({ ...prev, [demandeId]: false }))
      alert('Erreur : ' + error.message)
      return
    }

    const demande = demandes.find(d => d.id === demandeId)
    const titreDemande = demande?.titre || 'ta vidéo'
    const joueurPrenom = demande?.profiles?.prenom || 'le joueur'

    setDemandes(prev => prev.map(d =>
      d.id === demandeId ? { ...d, statut: 'analyse', loom_url: loomUrl, ...(rapportPdfUrl ? { rapport_pdf_url: rapportPdfUrl } : {}) } : d
    ))
    setSending(prev => ({ ...prev, [demandeId]: false }))
    setLoomUrls(prev => ({ ...prev, [demandeId]: '' }))
    setRapportPdfFiles(prev => ({ ...prev, [demandeId]: null }))
    alert(`✅ Analyse envoyée à ${joueurPrenom} !`)

    await Promise.all([
      coachId && joueurId
        ? supabase.from('messages').insert({
            sender_id: coachId,
            receiver_id: joueurId,
            content: `🎬 Ton analyse vidéo est prête ! J'ai analysé "${titreDemande}". Regarde ici : ${loomUrl}`,
            created_at: new Date().toISOString()
          })
        : Promise.resolve(),
      joueurId
        ? notifierJoueur({
            type: 'analyse',
            userId: joueurId,
            titre: `Analyse de "${titreDemande}" prête`,
            contenu: { texte: `Regarde ici : ${loomUrl}` },
            lien: '/dashboard',
          })
        : Promise.resolve(),
    ])
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const certifsEnAttente = certifs.filter(c => c.statut === 'en_attente')
  const enAttente = demandes.filter(d => d.statut === 'en_attente')

  if (loading && certifLoading) return (
    <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green, fontFamily: 'sans-serif' }}>Chargement...</p>
    </div>
  )

  const isAdminClubs = COACH_ADMIN_EMAILS.includes(coachEmail)

  const NAV_ITEMS = [
    { id: 'overview', label: "Vue d'ensemble", icon: '🏠', badge: 0 },
    ...(isAdminClubs ? [
      { id: 'users', label: 'Utilisateurs', icon: '👥', badge: 0 },
      { id: 'subscriptions', label: 'Abonnements', icon: '💳', badge: 0 },
      { id: 'revenue', label: "Chiffre d'affaires", icon: '💶', badge: 0 },
      { id: 'referrals', label: 'Parrainage FreePlay', icon: '🎁', badge: 0 },
    ] : []),
    { id: 'analyses', label: 'Analyse Joueur', icon: '📋', badge: enAttente.length },
    { id: 'certifications', label: 'Badges', icon: '⭐', badge: certifsEnAttente.length },
    { id: 'seances_club', label: 'Séances Club', icon: '🎥', badge: seancesTransferees.length },
    ...(isAdminClubs ? [{ id: 'demandes_club', label: 'Demande Club', icon: '📨', badge: demandesClub.filter(d => d.statut === 'nouveau').length }] : []),
    { id: 'support', label: 'Support', icon: '💬', badge: tickets.filter(t => t.statut === 'ouvert').length },
    ...(isAdminClubs ? [{ id: 'clubs_admin', label: 'Lien Stripe Club', icon: '💠', badge: clubsEnAttente.length }] : []),
    { id: 'recruteurs', label: 'Clubs / Agents', icon: '🏢', badge: 0 },
    { id: 'analyseur_ia', label: 'Analyseur IA', icon: '🎙️', badge: 0 },
  ]

  const TITRES_SECTION = {
    overview: "🏠 Vue d'ensemble",
    users: '👥 Utilisateurs',
    subscriptions: '💳 Abonnements',
    revenue: "💶 Chiffre d'affaires",
    referrals: '🎁 Parrainage FreePlay',
    analyses: '📋 Analyse Joueur',
    certifications: '⭐ Badges',
    seances_club: '🎥 Séances Club',
    demandes_club: '📨 Demande Club',
    support: '💬 Support',
    clubs_admin: '💠 Lien Stripe Club',
    recruteurs: '🏢 Clubs / Agents',
    analyseur_ia: '🎙️ Analyseur IA',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif' }}>

      {/* ── Header fin ─────────────────────────────────────────────────── */}
      <div style={{ height: 52, background: colors.background.surface, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0, zIndex: 30, position: 'sticky', top: 0 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: colors.text.primary, fontSize: 20, cursor: 'pointer', padding: '4px 8px 4px 0' }}>
            ☰
          </button>
        )}
        <span style={{ fontWeight: 900, fontSize: 15, color: colors.text.primary, letterSpacing: -0.5 }}>
          Digital<span style={{ color: colors.accent.green }}>Football</span>
        </span>
        <span style={{ background: colors.accent.green + alpha.soft, color: colors.accent.green, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, border: '1px solid #4ade8040' }}>
          COACH
        </span>
        <button onClick={() => { signOutSafe(); navigate('/') }}
          style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.faint, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Déconnexion
        </button>
      </div>

      {/* ── Corps : sidebar + contenu ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
        )}

        {/* ── SIDEBAR (toujours sombre, comme tout le reste de l'app) ────── */}
        <div style={{
          width: 220, background: colors.background.surface, borderRight: '1px solid #1a1a1a',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          ...(isMobile ? {
            position: 'fixed', top: 52, left: sidebarOpen ? 0 : -240,
            height: 'calc(100% - 52px)', zIndex: 50,
            transition: 'left 0.25s ease', overflowY: 'auto',
          } : {
            overflowY: 'auto', height: 'calc(100vh - 52px)',
            position: 'sticky', top: 52,
          })
        }}>

          <div style={{ padding: '20px 16px 0' }}>
            <p style={{ fontSize: 10, color: colors.text.disabled, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
              VUE D'ENSEMBLE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Total demandes', val: demandes.length, color: colors.text.primary },
                { label: 'En attente', val: enAttente.length, color: '#f59e0b' },
                { label: 'Certifs à valider', val: certifsEnAttente.length, color: certifsEnAttente.length > 0 ? '#f59e0b' : colors.accent.green },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: colors.background.sunken, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: colors.text.faint }}>{s.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: colors.background.raised, margin: '0 0 16px' }} />
            <p style={{ fontSize: 10, color: colors.text.disabled, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
              NAVIGATION
            </p>
          </div>

          {NAV_ITEMS.map(item => {
            const actif = activeSection === item.id
            return (
              <button key={item.id}
                onClick={() => { setActiveSection(item.id); if (isMobile) setSidebarOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 16px', background: actif ? colors.accent.green + alpha.subtle : 'transparent',
                  border: 'none', borderLeft: `3px solid ${actif ? colors.accent.green : 'transparent'}`,
                  color: actif ? colors.accent.green : colors.text.dim, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: actif ? 700 : 400,
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{ background: '#f59e0b', color: colors.black, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          <div style={{ marginTop: 'auto', padding: 16 }}>
            <div style={{ background: colors.background.sunken, borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, color: colors.accent.green, fontWeight: 700 }}>🎙️ Analyseur IA</p>
              <p style={{ margin: '3px 0 0', fontSize: 10, color: colors.text.disabled, lineHeight: 1.4 }}>Transcription + rapport PDF gratuit</p>
            </div>
          </div>
        </div>

        {/* ── CONTENU PRINCIPAL ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 14px' : '32px 40px' }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900 }}>
              {TITRES_SECTION[activeSection]}
            </h1>
          </div>

          {activeSection === 'overview' && (
            <Overview
              isAdminClubs={isAdminClubs}
              goTo={setActiveSection}
              pending={{
                analyses: enAttente.length,
                certifications: certifsEnAttente.length,
                seancesClub: seancesTransferees.length,
                demandesClub: demandesClub.filter(d => d.statut === 'nouveau').length,
                support: tickets.filter(t => t.statut === 'ouvert').length,
              }}
            />
          )}

          {activeSection === 'users' && isAdminClubs && <Users />}
          {activeSection === 'subscriptions' && isAdminClubs && <Subscriptions />}
          {activeSection === 'revenue' && isAdminClubs && <Revenue />}
          {activeSection === 'referrals' && isAdminClubs && <Referrals />}

          {activeSection === 'analyses' && (
            <PlayerAnalysis
              demandes={demandes}
              coachId={coachId}
              loomUrls={loomUrls}
              setLoomUrls={setLoomUrls}
              rapportPdfFiles={rapportPdfFiles}
              setRapportPdfFiles={setRapportPdfFiles}
              sending={sending}
              envoyerAnalyse={envoyerAnalyse}
              prendreEnCharge={prendreEnCharge}
              setNotationCible={setNotationCible}
            />
          )}

          {activeSection === 'certifications' && (
            <Badges
              certifs={certifs}
              certifLoading={certifLoading}
              commentaires={commentaires}
              setCommentaires={setCommentaires}
              validating={validating}
              validerCertification={validerCertification}
              rejeterCertification={rejeterCertification}
            />
          )}

          {activeSection === 'recruteurs' && (
            <ClubsAgents recruteurs={recruteurs} setRecruteurModal={setRecruteurModal} />
          )}

          {activeSection === 'seances_club' && (
            <CoachSessions
              seancesTransferees={seancesTransferees}
              coachId={coachId}
              prendreEnCharge={prendreEnCharge}
              setSeanceEvalModal={setSeanceEvalModal}
            />
          )}

          {activeSection === 'analyseur_ia' && <AnalyseurIA />}

          {activeSection === 'support' && (
            <Support
              tickets={tickets}
              ticketsError={ticketsError}
              savingTicket={savingTicket}
              marquerTicketResolu={marquerTicketResolu}
              reponseDrafts={reponseDrafts}
              setReponseDrafts={setReponseDrafts}
              envoyerReponseTicket={envoyerReponseTicket}
            />
          )}

          {activeSection === 'clubs_admin' && isAdminClubs && (
            <StripeLinks
              clubsEnAttente={clubsEnAttente}
              palierChoisi={palierChoisi}
              setPalierChoisi={setPalierChoisi}
              activatingClub={activatingClub}
              activerClub={activerClub}
              copierLienClub={copierLienClub}
            />
          )}

          {activeSection === 'demandes_club' && isAdminClubs && (
            <ClubRequests
              demandesClub={demandesClub}
              traitantDemande={traitantDemande}
              marquerDemandeTraitee={marquerDemandeTraitee}
              setDemandesClub={setDemandesClub}
            />
          )}

        </div>
      </div>

      {/* MODAL PROFIL RECRUTEUR */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
              {recruteurModal.avatar_url ? (
                <img src={recruteurModal.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.blue, fontWeight: 800, fontSize: '20px' }}>
                  {`${(recruteurModal.prenom || '?')[0]}${(recruteurModal.nom || '?')[0]}`}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.accent.blue, fontWeight: 600 }}>{recruteurModal.type_recruteur || 'Recruteur'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
              {recruteurModal.club && (
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Club / Structure</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0' }}>{recruteurModal.club}</p>
                </div>
              )}
              {recruteurModal.region && (
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Région</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0' }}>{recruteurModal.region}</p>
                </div>
              )}
            </div>

            {recruteurModal.description && (
              <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 6px' }}>À propos</p>
                <p style={{ fontSize: '14px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa30', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: colors.accent.blue, margin: '0 0 6px', fontWeight: 600 }}>🔍 Profil recherché</p>
                <p style={{ fontSize: '14px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              <p style={{ fontSize: '13px', color: colors.text.faint, margin: 0 }}>📧 {recruteurModal.email}</p>
            </div>

            <button onClick={() => setRecruteurModal(null)}
              style={{ width: '100%', marginTop: '1.5rem', background: colors.background.raised, color: colors.text.secondary, border: '1px solid #333', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {notationCible && (
        <ModalNotation
          auteurId={coachId}
          cible={notationCible}
          onClose={() => setNotationCible(null)}
          onDone={() => setNotationCible(null)}
        />
      )}

      {seanceEvalModal && (
        <ModalGrilleSeance
          seance={seanceEvalModal}
          onClose={() => setSeanceEvalModal(null)}
          onSubmit={soumettreGrilleCoach}
          evaluateurType="coach"
        />
      )}
    </div>
  )
}

export default DashboardCoach
