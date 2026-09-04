import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase, signOutSafe } from '../supabase'
import { ModalNotation } from '../components/Notation'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { notifierJoueur } from '../lib/notifications'
import AnalyseurIA from '../components/AnalyseurIA'
import { COACH_ADMIN_EMAILS } from '../lib/coachAdmin'

import { CoachThemeProvider } from './coach/ThemeContext'
import { useCoachTheme } from './coach/useCoachTheme'
import { SIDEBAR } from './coach/theme'
import { IcoGrid, IcoUsers, IcoCard, IcoDollar, IcoShare, IcoPlay, IcoShield, IcoBook, IcoHome, IcoMessage, IcoLink, IcoBriefcase, IcoMic, IcoMail, IcoMegaphone, IcoLibrary } from './coach/NavIcons'
import ToastStack from '../components/coachAdmin/Toast'
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
import Communication from './coach/Communication'
import Bibliotheque from './coach/Bibliotheque'

function DashboardCoachInner() {
  const navigate = useNavigate()
  const { c, fonts, mode, toggle, rgba } = useCoachTheme()
  const [activeSection, setActiveSection] = useState('overview')
  const [usersInitialType, setUsersInitialType] = useState('tous')
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loomUrls, setLoomUrls] = useState({})
  const [rapportPdfFiles, setRapportPdfFiles] = useState({})
  const [sending, setSending] = useState({})
  const [coachId, setCoachId] = useState(null)
  const [coachEmail, setCoachEmail] = useState(null)

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
  const [savingTicket, setSavingTicket] = useState(null)
  const [ticketsError, setTicketsError] = useState(null)

  // Toasts de confirmation discrets après une action réussie (remplace les
  // alert() bloquants pour les succès — les erreurs restent en alert()).
  const [toasts, setToasts] = useState([])
  const pushToast = (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000)
  }

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
    if (COACH_ADMIN_EMAILS.includes(user?.email)) taches.push(getDemandesClub())
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
    } else {
      pushToast('Ticket marqué comme résolu')
    }
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
    } else {
      pushToast('Demande marquée comme traitée')
    }
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
    // Fetch aussi les séances déjà analysées (statut='analyse') pour permettre
    // le filtre "Complétées" côté page — pas seulement les séances en attente.
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, educateur:educateur_id(prenom, nom), club:club_id(club, prenom, nom), evaluation:evaluations_seance(*), coach:pris_en_charge_par(prenom, nom)')
      .in('statut', ['transfere_coach', 'analyse'])
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
    } else {
      pushToast('Évaluation enregistrée')
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
    setCertifs(prev => prev.map(cf => cf.id === certif.id ? { ...cf, statut: 'validé' } : cf))
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
      setCertifs(prev => prev.map(cf => cf.id === certif.id ? { ...cf, statut: avant } : cf))
    } else {
      pushToast('Badge validé')
    }
  }

  const rejeterCertification = async (certif) => {
    const motif = commentaires[certif.id]?.trim()
    if (!motif) { alert('Indique un motif de rejet avant de rejeter.'); return }
    const avant = certif.statut
    setCertifs(prev => prev.map(cf => cf.id === certif.id ? { ...cf, statut: 'rejeté', commentaire_admin: motif } : cf))
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
      setCertifs(prev => prev.map(cf => cf.id === certif.id ? { ...cf, statut: avant } : cf))
    } else {
      pushToast('Certification rejetée')
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
    pushToast(`Analyse envoyée à ${joueurPrenom} !`)

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

  // Rafraîchissement périodique des tickets support quand la page est
  // ouverte — pas de WebSocket, juste un polling léger toutes les 5s pour
  // voir arriver les nouveaux tickets sans recharger la page.
  useEffect(() => {
    if (activeSection !== 'support') return
    const id = setInterval(() => { getTickets() }, 5000)
    return () => clearInterval(id)
  }, [activeSection])

  const certifsEnAttente = certifs.filter(cf => cf.statut === 'en_attente')
  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const seancesEnAttente = seancesTransferees.filter(s => s.statut === 'transfere_coach')

  if (loading && certifLoading) return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: c.accent, fontFamily: fonts.body }}>Chargement...</p>
    </div>
  )

  const isAdminClubs = COACH_ADMIN_EMAILS.includes(coachEmail)

  // 4 groupes logiques (au lieu de 2 fourre-tout Plateforme/Activité) :
  // TABLEAU DE BORD = vue d'ensemble + pages chiffres, ACTIVITÉ = travail
  // quotidien à traiter (analyses/demandes), CONTENU = alimentation
  // plateforme (bibliothèque, IA, communication, parrainage), OUTILS =
  // support/annuaire/liens. Le gating isAdminClubs par item est inchangé
  // (mêmes items réservés aux 2 comptes admin qu'avant ce regroupement).
  const NAV_TABLEAU_DE_BORD = [
    { id: 'overview', label: "Vue d'ensemble", Icon: IcoGrid, badge: 0 },
    ...(isAdminClubs ? [
      { id: 'users', label: 'Utilisateurs', Icon: IcoUsers, badge: 0 },
      { id: 'subscriptions', label: 'Abonnements', Icon: IcoCard, badge: 0 },
      { id: 'revenue', label: "Chiffre d'affaires", Icon: IcoDollar, badge: 0 },
    ] : []),
  ]
  const NAV_ACTIVITE = [
    { id: 'analyses', label: 'Analyse Joueur', Icon: IcoPlay, badge: enAttente.length },
    { id: 'seances_club', label: 'Analyse Séance', Icon: IcoBook, badge: seancesEnAttente.length },
    { id: 'certifications', label: 'Badge Certifié', Icon: IcoShield, badge: certifsEnAttente.length },
    ...(isAdminClubs ? [{ id: 'demandes_club', label: 'Demande Club', Icon: IcoHome, badge: demandesClub.filter(d => d.statut === 'nouveau').length }] : []),
  ]
  const NAV_CONTENU = [
    ...(isAdminClubs ? [{ id: 'bibliotheque', label: 'Bibliothèque', Icon: IcoLibrary, badge: 0 }] : []),
    { id: 'analyseur_ia', label: 'Analyseur IA', Icon: IcoMic, badge: 0 },
    ...(isAdminClubs ? [
      { id: 'communication', label: 'Communication', Icon: IcoMegaphone, badge: 0 },
      { id: 'referrals', label: 'Parrainage FreePlay', Icon: IcoShare, badge: 0 },
    ] : []),
  ]
  const NAV_OUTILS = [
    { id: 'support', label: 'Support Chat', Icon: IcoMessage, badge: tickets.filter(t => t.statut === 'ouvert').length },
    { id: 'recruteurs', label: 'Clubs / Agents', Icon: IcoBriefcase, badge: 0 },
    ...(isAdminClubs ? [{ id: 'clubs_admin', label: 'Stripe Club', Icon: IcoLink, badge: 0 }] : []),
  ]

  const TITRES_SECTION = Object.fromEntries(
    [...NAV_TABLEAU_DE_BORD, ...NAV_ACTIVITE, ...NAV_CONTENU, ...NAV_OUTILS].map(item => [item.id, item.label])
  )

  const renderNavItem = (item) => {
    const actif = activeSection === item.id
    const { Icon } = item
    return (
      <button key={item.id}
        onClick={() => { setActiveSection(item.id); if (isMobile) setSidebarOpen(false) }}
        onMouseEnter={e => { if (!actif) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'transparent' }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 18px', background: actif ? SIDEBAR.active : 'transparent',
          border: 'none', borderLeft: `2px solid ${actif ? SIDEBAR.accent : 'transparent'}`,
          color: actif ? '#fff' : SIDEBAR.text, cursor: 'pointer',
          fontFamily: fonts.body, fontSize: 13, fontWeight: 500,
          textAlign: 'left', transition: 'color 0.15s ease, background 0.15s ease',
        }}>
        <span style={{ display: 'flex', opacity: actif ? 1 : 0.65, flexShrink: 0 }}><Icon /></span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge > 0 && (
          <span style={{ background: c.danger, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  const renderNavSection = (label, items) => items.length > 0 && (
    <div key={label}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '14px 18px 5px', margin: 0 }}>
        {label}
      </p>
      {items.map(renderNavItem)}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, color: c.text, fontFamily: fonts.body, fontSize: 14 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
      )}

      {/* ── SIDEBAR (toujours sombre, quel que soit le thème) ──────────── */}
      <div style={{
        width: 224, background: SIDEBAR.bg, borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100vh',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: sidebarOpen ? 0 : -244,
          height: '100%', zIndex: 50,
          transition: 'left 0.25s ease', overflowY: 'auto',
        } : {
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        })
      }}>

        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${SIDEBAR.accent}, ${c.success})`, flexShrink: 0 }} />
            <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '0.03em' }}>
              Digital<span style={{ color: SIDEBAR.accent }}>Football</span>
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
            Dashboard Coach
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {renderNavSection('Tableau de bord', NAV_TABLEAU_DE_BORD)}
          {renderNavSection('Activité', NAV_ACTIVITE)}
          {renderNavSection('Contenu', NAV_CONTENU)}
          {renderNavSection('Outils', NAV_OUTILS)}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Admin · Digital Football</span>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, padding: '0 26px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: c.text, fontSize: 20, cursor: 'pointer', padding: '4px 8px 4px 0', flexShrink: 0 }}>
                ☰
              </button>
            )}
            <span style={{ fontFamily: fonts.display, fontSize: isMobile ? 15 : 17, fontWeight: 600, color: c.text, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {TITRES_SECTION[activeSection]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={toggle}
              style={{ background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: c.textMuted, fontSize: 12, fontWeight: 500, fontFamily: fonts.body, transition: 'background 0.15s ease, color 0.15s ease' }}>
              {mode === 'dark' ? '◐ Clair' : '◑ Sombre'}
            </button>
            {isAdminClubs && (
              <span style={{ background: rgba(c.accent, 0.12), border: `1px solid ${c.accent}`, color: c.accent, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.07em' }}>
                ADMIN
              </span>
            )}
            <button onClick={() => { signOutSafe(); navigate('/') }}
              style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: fonts.body, transition: 'background 0.15s ease, color 0.15s ease' }}>
              Déconnexion
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 14px' : '24px 26px' }}>

          {activeSection === 'overview' && (
            <Overview
              isAdminClubs={isAdminClubs}
              goTo={setActiveSection}
              goToUsers={(familyKey) => { setUsersInitialType(familyKey); setActiveSection('users') }}
              pending={{
                analyses: enAttente.length,
                certifications: certifsEnAttente.length,
                seancesClub: seancesEnAttente.length,
                demandesClub: demandesClub.filter(d => d.statut === 'nouveau').length,
                support: tickets.filter(t => t.statut === 'ouvert').length,
              }}
            />
          )}

          {activeSection === 'users' && isAdminClubs && <Users initialType={usersInitialType} />}
          {activeSection === 'subscriptions' && isAdminClubs && <Subscriptions />}
          {activeSection === 'revenue' && isAdminClubs && <Revenue />}
          {activeSection === 'referrals' && isAdminClubs && <Referrals coachId={coachId} />}
          {activeSection === 'communication' && isAdminClubs && <Communication adminId={coachId} />}

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
              coachId={coachId}
            />
          )}

          {activeSection === 'clubs_admin' && isAdminClubs && <StripeLinks />}

          {activeSection === 'demandes_club' && isAdminClubs && (
            <ClubRequests
              demandesClub={demandesClub}
              traitantDemande={traitantDemande}
              marquerDemandeTraitee={marquerDemandeTraitee}
              setDemandesClub={setDemandesClub}
            />
          )}

          {activeSection === 'bibliotheque' && isAdminClubs && <Bibliotheque coachId={coachId} />}

        </div>
      </div>

      {/* MODAL PROFIL RECRUTEUR */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
              {recruteurModal.avatar_url ? (
                <img src={recruteurModal.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: rgba(c.accent, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.accent, fontWeight: 800, fontSize: '20px' }}>
                  {`${(recruteurModal.prenom || '?')[0]}${(recruteurModal.nom || '?')[0]}`}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontFamily: fonts.display, fontSize: '20px', fontWeight: 700, color: c.text }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.accent, fontWeight: 600 }}>{recruteurModal.type_recruteur || 'Recruteur'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
              {recruteurModal.club && (
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: 0 }}>Club / Structure</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0', color: c.text }}>{recruteurModal.club}</p>
                </div>
              )}
              {recruteurModal.region && (
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: 0 }}>Région</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0', color: c.text }}>{recruteurModal.region}</p>
                </div>
              )}
            </div>

            {recruteurModal.description && (
              <div style={{ background: c.surface2, borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: c.textMuted, margin: '0 0 6px' }}>À propos</p>
                <p style={{ fontSize: '14px', color: c.text, margin: 0, lineHeight: 1.5 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: rgba(c.accent, 0.08), border: `1px solid ${rgba(c.accent, 0.3)}`, borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: c.accent, margin: '0 0 6px', fontWeight: 600 }}>Profil recherché</p>
                <p style={{ fontSize: '14px', color: c.text, margin: 0, lineHeight: 1.5 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: c.textMuted, margin: 0 }}><IcoMail size={13} /> {recruteurModal.email}</p>
            </div>

            <button onClick={() => setRecruteurModal(null)}
              style={{ width: '100%', marginTop: '1.5rem', background: c.surface2, color: c.textMuted, border: `1px solid ${c.border}`, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
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

      <ToastStack toasts={toasts} />
    </div>
  )
}

function DashboardCoach() {
  return (
    <CoachThemeProvider>
      <DashboardCoachInner />
    </CoachThemeProvider>
  )
}

export default DashboardCoach
