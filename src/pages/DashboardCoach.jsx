import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase, signOutSafe } from '../supabase'
import { ModalNotation, BadgeNote } from '../components/Notation'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { notifierJoueur } from '../lib/notifications'
import AnalyseurIA from '../components/AnalyseurIA'
import { STRIPE_LINKS_CLUB, stripeUrl } from '../lib/stripeLinks'
import { COACH_ADMIN_EMAILS } from '../lib/coachAdmin'
import { colors, alpha } from '../tokens'

function DashboardCoach() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('analyses')
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
  const [lienCopieDemande, setLienCopieDemande] = useState(null)
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
    init()
  }, [])

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const init = async () => {
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
    const { data } = await supabase
      .from('demandes_club')
      .select('*')
      .order('created_at', { ascending: false })
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

  // Copie le lien Stripe du palier demandé — pas de client_reference_id ici,
  // contrairement à copierLienClub (clubs déjà inscrits, cf. section
  // clubs_admin) : à ce stade la demande n'a pas encore de compte, donc pas
  // d'id de profil à y accrocher. Le webhook Stripe identifie le paiement par
  // montant + email (cf. supabase/functions/stripe-webhook), et crée le
  // compte via invitation s'il n'existe pas encore.
  const copierLienDemandeClub = async (demande, cycle) => {
    const lien = STRIPE_LINKS_CLUB[demande.nb_licencies]?.[cycle]
    if (!lien) { alert('Palier inconnu pour cette demande.'); return }
    await navigator.clipboard.writeText(lien)
    setLienCopieDemande(`${demande.id}-${cycle}`)
    setTimeout(() => setLienCopieDemande(null), 2000)
    await supabase.from('demandes_club')
      .update({ lien_paiement_envoye: true, lien_paiement_envoye_le: new Date().toISOString() })
      .eq('id', demande.id)
    setDemandesClub(prev => prev.map(d => d.id === demande.id ? { ...d, lien_paiement_envoye: true, lien_paiement_envoye_le: new Date().toISOString() } : d))
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
      // Libérer la prise en charge
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
    // ModalGrilleSeance garde son propre état interne (notes, commentaires) —
    // le rouvrir en cas d'erreur ne restaurerait pas la saisie (remount avec
    // un état vide), donc on ne tente pas ça : juste une alerte claire pour
    // que l'utilisateur sache qu'il doit recommencer l'évaluation.
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
      // Un seul destinataire : l'éducateur pour une séance "ouverte" (sans club), le club sinon.
      // educateur_id/club_id sont tous deux des profiles.id — notifierJoueur fonctionne pour n'importe quel profil.
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
    // Optimistic : la certification passe "validé" tout de suite dans la
    // liste locale. La mise à jour de la certification et le message de
    // notification sont indépendants (le message ne dépend pas du résultat
    // de l'update) — en parallèle.
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
    // Optimistic : idem validerCertification.
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

    // Optimistic à partir d'ici : l'écriture principale (demandes) est
    // confirmée, donc on déclare terminé côté UI tout de suite. Le message et
    // la notification au joueur sont indépendants l'un de l'autre — en
    // parallèle, en arrière-plan.
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

  const getVideoUrl = (demande) => demande.video_url || demande.lien_video || demande.clip_url || null
  const isVeo = (url) => url && url.includes('veo.co')
  const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))

  const getStatutColor = (statut) => {
    if (statut === 'en_attente') return '#f59e0b'
    if (statut === 'validé') return colors.accent.green
    if (statut === 'rejeté') return '#f87171'
    if (statut === 'analyse') return colors.accent.green
    return colors.text.dim
  }

  const getStatutLabel = (statut) => {
    if (statut === 'en_attente') return 'En attente'
    if (statut === 'analyse') return 'Analyse envoyée'
    if (statut === 'validé') return '✅ Validé'
    if (statut === 'rejeté') return '❌ Rejeté'
    return statut
  }

  const certifsEnAttente = certifs.filter(c => c.statut === 'en_attente')
  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const analysees = demandes.filter(d => d.statut === 'analyse')

  // Grouper les demandes par joueur
  const demandesParJoueur = demandes.reduce((acc, d) => {
    const id = d.profiles?.id || 'inconnu'
    if (!acc[id]) acc[id] = { profil: d.profiles, demandes: [] }
    acc[id].demandes.push(d)
    return acc
  }, {})
  const joueursAvecDemandes = Object.values(demandesParJoueur)
    .sort((a, b) => {
      const aEnAttente = a.demandes.filter(d => d.statut === 'en_attente').length
      const bEnAttente = b.demandes.filter(d => d.statut === 'en_attente').length
      return bEnAttente - aEnAttente // Priorité aux joueurs avec des demandes en attente
    })

  const [joueursOuverts, setJoueursOuverts] = useState({})
  const toggleJoueur = (id) => setJoueursOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading && certifLoading) return (
    <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green, fontFamily: 'sans-serif' }}>Chargement...</p>
    </div>
  )

  const isAdminClubs = COACH_ADMIN_EMAILS.includes(coachEmail)

  const NAV_ITEMS = [
    { id: 'analyses', label: 'Demandes', icon: '📋', badge: enAttente.length },
    { id: 'certifications', label: 'Certifications', icon: '⭐', badge: 0 },
    { id: 'recruteurs', label: 'Clubs / Agents', icon: '🏢', badge: 0 },
    { id: 'seances_club', label: 'Séances club', icon: '🎥', badge: seancesTransferees.length },
    { id: 'analyseur_ia', label: 'Analyseur IA', icon: '🎙️', badge: 0 },
    { id: 'support', label: 'Support', icon: '💬', badge: tickets.filter(t => t.statut === 'ouvert').length },
    ...(isAdminClubs ? [
      { id: 'clubs_admin', label: 'Clubs en attente', icon: '🏟️', badge: clubsEnAttente.length },
      { id: 'demandes_club', label: 'Demandes Club', icon: '📨', badge: demandesClub.filter(d => d.statut === 'nouveau').length },
    ] : []),
  ]

  const TITRES_SECTION = {
    analyses: "📋 Demandes d'analyse",
    certifications: '⭐ Certifications',
    recruteurs: '🏢 Clubs / Agents',
    seances_club: '🎥 Séances club',
    analyseur_ia: '🎙️ Analyseur IA',
    support: '💬 Support',
    clubs_admin: '🏟️ Clubs en attente d\'activation',
    demandes_club: '📨 Demandes Club',
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

        {/* Overlay mobile */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
        )}

        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
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

          {/* Stats résumé dans la sidebar */}
          <div style={{ padding: '20px 16px 0' }}>
            <p style={{ fontSize: 10, color: colors.text.disabled, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
              VUE D'ENSEMBLE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Total demandes', val: demandes.length, color: colors.text.primary },
                { label: 'En attente', val: enAttente.length, color: '#f59e0b' },
                { label: 'Analyses envoyées', val: analysees.length, color: colors.accent.green },
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

          {/* Items de navigation */}
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

          {/* Titre section */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900 }}>
              {TITRES_SECTION[activeSection]}
            </h1>
          </div>

          {/* BANNERS */}
          {enAttente.length > 0 && activeSection === 'analyses' && (
            <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
                {enAttente.length} demande{enAttente.length > 1 ? 's' : ''} en attente d'analyse
              </p>
            </div>
          )}
          {certifsEnAttente.length > 0 && activeSection === 'certifications' && (
            <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>⭐</span>
              <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
                {certifsEnAttente.length} certification{certifsEnAttente.length > 1 ? 's' : ''} en attente de validation
              </p>
            </div>
          )}

          {/* ===== SECTION ANALYSES ===== */}
          {activeSection === 'analyses' && (
            <>
              {demandes.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</p>
                  <p style={{ color: colors.text.dim }}>Aucune demande pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {joueursAvecDemandes.map(({ profil, demandes: demandesJoueur }) => {
                    const joueurId = profil?.id || 'inconnu'
                    const ouvert = joueursOuverts[joueurId]
                    const nbAttente = demandesJoueur.filter(d => d.statut === 'en_attente').length
                    const nbAnalysees = demandesJoueur.filter(d => d.statut === 'analyse').length
                    const initiales = `${(profil?.prenom || '?')[0]}${(profil?.nom || '?')[0]}`
                    return (
                      <div key={joueurId} style={{ background: colors.background.surface, border: `1px solid ${nbAttente > 0 ? '#f59e0b30' : '#222'}`, borderRadius: '14px', overflow: 'hidden' }}>
                        {/* En-tête joueur (toujours visible) */}
                        <div onClick={() => toggleJoueur(joueurId)}
                          style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                            {initiales}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{profil?.prenom} {profil?.nom}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{profil?.email}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {nbAttente > 0 && <span style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>⏳ {nbAttente} en attente</span>}
                            {nbAnalysees > 0 && <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>✅ {nbAnalysees} envoyée{nbAnalysees > 1 ? 's' : ''}</span>}
                            <span style={{ color: colors.text.disabled, fontSize: '18px', marginLeft: '4px' }}>{ouvert ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Demandes du joueur (dépliable) */}
                        {ouvert && (
                          <div style={{ borderTop: '1px solid #1a1a1a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {demandesJoueur.map(demande => {
                              const videoUrl = getVideoUrl(demande)
                              const isSending = sending[demande.id]
                              return (
                                <div key={demande.id} style={{ background: colors.background.sunken, border: `1px solid ${demande.statut === 'en_attente' ? '#f59e0b20' : colors.background.raised}`, borderRadius: '10px', padding: '1.25rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{demande.titre}</h3>
                                    <span style={{ background: getStatutColor(demande.statut) + '20', color: getStatutColor(demande.statut), fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                      {getStatutLabel(demande.statut)}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                    {demande.pris_en_charge_par ? (
                                      <>
                                        <span style={{ background: demande.pris_en_charge_par === coachId ? colors.accent.green + alpha.subtle : '#f59e0b15', border: `1px solid ${demande.pris_en_charge_par === coachId ? colors.accent.green + alpha.medium : '#f59e0b40'}`, color: demande.pris_en_charge_par === coachId ? colors.accent.green : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
                                          {demande.pris_en_charge_par === coachId ? '✅ Pris en charge par toi' : `🔒 Pris en charge par ${demande.coach?.prenom || 'un autre coach'}`}
                                        </span>
                                        {demande.pris_en_charge_par === coachId && (
                                          <button onClick={() => prendreEnCharge('demandes', demande.id, true)} style={{ background: 'none', border: '1px solid #333', color: colors.text.dim, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                                        )}
                                      </>
                                    ) : (
                                      <button onClick={() => prendreEnCharge('demandes', demande.id, false)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
                                    )}
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Poste</p>
                                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{demande.poste}</p>
                                    </div>
                                    <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Plan</p>
                                      <p style={{ fontSize: '13px', fontWeight: '600', color: colors.accent.green, textTransform: 'capitalize', margin: '4px 0 0' }}>{profil?.plan}</p>
                                    </div>
                                    <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Date</p>
                                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                  </div>

                                  {demande.description && (
                                    <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Ce que le joueur veut analyser</p>
                                      <p style={{ fontSize: '13px', color: colors.text.secondary, margin: '4px 0 0' }}>{demande.description}</p>
                                    </div>
                                  )}

                                  {videoUrl ? (
                                    <div style={{ marginBottom: '1rem' }}>
                                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 8px' }}>Vidéo</p>
                                      {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                                        <a href={videoUrl} target="_blank" rel="noreferrer"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                                          🎬 {isVeo(videoUrl) ? 'Ouvrir sur Veo' : 'Ouvrir sur YouTube'}
                                        </a>
                                      ) : (
                                        <video src={videoUrl.includes('cloudinary.com') ? videoUrl.replace('/upload/', '/upload/q_auto,f_mp4/') : videoUrl} controls style={{ width: '100%', maxHeight: '280px', borderRadius: '8px', background: colors.black }} />
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                                      <p style={{ fontSize: '13px', color: colors.text.faint, margin: 0 }}>⚠️ Aucune vidéo fournie</p>
                                    </div>
                                  )}

                                  {demande.statut === 'en_attente' && (
                                    <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '1rem' }}>
                                      <p style={{ fontSize: '12px', color: colors.text.dim, margin: '0 0 10px' }}>
                                        📨 Le joueur recevra une notification automatique dans son dashboard dès l'envoi
                                      </p>
                                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <input
                                          placeholder="Colle ton lien vidéo (YouTube, Veo...) ici..."
                                          value={loomUrls[demande.id] || ''}
                                          onChange={e => setLoomUrls(prev => ({ ...prev, [demande.id]: e.target.value }))}
                                          style={{ flex: 1, background: colors.background.surface, border: '1px solid #333', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none' }}
                                        />
                                        <button
                                          onClick={() => envoyerAnalyse(demande.id, demande.profiles?.id)}
                                          disabled={isSending || !loomUrls[demande.id]?.trim()}
                                          style={{ background: isSending ? colors.border.strong : colors.accent.green, color: isSending ? colors.text.dim : colors.background.base, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: (!loomUrls[demande.id]?.trim() && !isSending) ? 0.5 : 1 }}>
                                          {isSending ? 'Envoi...' : '🚀 Envoyer l\'analyse'}
                                        </button>
                                      </div>
                                      <div style={{ marginTop: '10px' }}>
                                        <label style={{ fontSize: '11px', color: colors.text.faint, fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                          📄 Joindre un rapport PDF (optionnel)
                                        </label>
                                        <input type="file" accept=".pdf"
                                          onChange={e => setRapportPdfFiles(prev => ({ ...prev, [demande.id]: e.target.files[0] || null }))}
                                          style={{ fontSize: '12px', color: colors.text.muted, width: '100%' }} />
                                        {rapportPdfFiles[demande.id] && (
                                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.accent.green }}>✓ {rapportPdfFiles[demande.id].name}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {demande.statut === 'analyse' && demande.loom_url && (
                                    <div style={{ background: '#4ade8010', border: '1px solid #4ade8033', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                                      <p style={{ fontSize: '12px', color: colors.accent.green, marginBottom: '6px', fontWeight: 600, margin: '0 0 6px' }}>✅ Analyse envoyée — notification joueur envoyée</p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <a href={demande.loom_url} target="_blank" rel="noreferrer"
                                          style={{ fontSize: '13px', color: colors.text.secondary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {isYoutube(demande.loom_url) ? '▶️' : '🎥'} <span style={{ textDecoration: 'underline' }}>{demande.loom_url}</span>
                                        </a>
                                        {demande.rapport_pdf_url && (
                                          <a href={demande.rapport_pdf_url} target="_blank" rel="noreferrer"
                                            style={{ fontSize: '13px', color: colors.accent.green, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            📄 <span style={{ textDecoration: 'underline' }}>Rapport PDF</span>
                                          </a>
                                        )}
                                        <button onClick={() => setNotationCible({ id: profil?.id, prenom: profil?.prenom, nom: profil?.nom, plan: profil?.plan })}
                                          style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2440', color: colors.accent.amber, padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                          ⭐ Noter {profil?.prenom || 'le joueur'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== SECTION CERTIFICATIONS ===== */}
          {activeSection === 'certifications' && (
            <>
              {certifLoading ? (
                <p style={{ color: colors.text.dim, textAlign: 'center', padding: '2rem' }}>Chargement...</p>
              ) : certifs.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</p>
                  <p style={{ color: colors.text.dim }}>Aucune demande de certification pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {certifs.map(certif => {
                    const isProcessing = validating[certif.id]
                    const isPending = certif.statut === 'en_attente'
                    return (
                      <div key={certif.id} style={{
                        background: colors.background.surface,
                        border: `1px solid ${isPending ? '#f59e0b30' : certif.statut === 'validé' ? colors.accent.green + alpha.light : '#f8717130'}`,
                        borderRadius: '12px', padding: '1.5rem'
                      }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                              {certif.profiles?.prenom} {certif.profiles?.nom}
                            </h3>
                            <p style={{ fontSize: '13px', color: colors.text.dim, margin: 0 }}>{certif.profiles?.email}</p>
                          </div>
                          <span style={{
                            background: getStatutColor(certif.statut) + '20',
                            color: getStatutColor(certif.statut),
                            fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap'
                          }}>
                            {getStatutLabel(certif.statut)}
                          </span>
                        </div>

                        {/* Infos */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Niveau</p>
                            <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: colors.accent.amber }}>{certif.niveau}</p>
                          </div>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Saison</p>
                            <p style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>{certif.saison}</p>
                          </div>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Soumis le</p>
                            <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{new Date(certif.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>

                        {/* Documents (feuilles de match) */}
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 8px' }}>
                            📄 Feuilles de match ({certif.documents?.length || 0} document{certif.documents?.length > 1 ? 's' : ''})
                          </p>
                          {certif.documents?.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {certif.documents.map((url, i) => {
                                const isPdf = url.includes('.pdf') || url.includes('/raw/') || url.includes('application')
                                return (
                                  <a key={i} href={url} target="_blank" rel="noreferrer"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                                      background: colors.background.raised, border: '1px solid #333', borderRadius: '8px',
                                      padding: '8px 12px', color: colors.accent.green, fontSize: '13px',
                                      textDecoration: 'none', fontWeight: '500'
                                    }}>
                                    {isPdf ? '📄' : '🖼️'} Feuille {i + 1}
                                  </a>
                                )
                              })}
                            </div>
                          ) : (
                            <p style={{ fontSize: '13px', color: colors.text.faint, margin: 0 }}>⚠️ Aucun document joint</p>
                          )}
                        </div>

                        {/* Commentaire admin (déjà rejeté ou validé) */}
                        {certif.commentaire_admin && !isPending && (
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Commentaire admin</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary, margin: 0 }}>{certif.commentaire_admin}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '1rem' }}>
                            <p style={{ fontSize: '12px', color: colors.text.dim, margin: '0 0 10px' }}>
                              💬 Commentaire (obligatoire en cas de rejet)
                            </p>
                            <textarea
                              placeholder="Ex : Documents illisibles, mauvais niveau, etc."
                              value={commentaires[certif.id] || ''}
                              onChange={e => setCommentaires(prev => ({ ...prev, [certif.id]: e.target.value }))}
                              rows={2}
                              style={{
                                width: '100%', background: colors.background.surface, border: '1px solid #333', borderRadius: '8px',
                                padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none',
                                resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px', fontFamily: 'sans-serif'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => validerCertification(certif)}
                                disabled={!!isProcessing}
                                style={{
                                  flex: 1, background: isProcessing === 'validating' ? colors.border.strong : colors.accent.green,
                                  color: isProcessing === 'validating' ? colors.text.dim : colors.background.base,
                                  border: 'none', padding: '10px 0', borderRadius: '8px',
                                  fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                                }}>
                                {isProcessing === 'validating' ? 'Validation...' : '✅ Valider le badge'}
                              </button>
                              <button
                                onClick={() => rejeterCertification(certif)}
                                disabled={!!isProcessing}
                                style={{
                                  flex: 1, background: isProcessing === 'rejecting' ? colors.border.strong : '#f8717120',
                                  color: isProcessing === 'rejecting' ? colors.text.dim : '#f87171',
                                  border: '1px solid #f8717140', padding: '10px 0', borderRadius: '8px',
                                  fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                                }}>
                                {isProcessing === 'rejecting' ? 'Rejet...' : '❌ Rejeter'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Validé */}
                        {certif.statut === 'validé' && certif.validated_at && (
                          <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '13px', color: colors.accent.green, margin: 0, fontWeight: 600 }}>
                              ⭐ Badge validé le {new Date(certif.validated_at).toLocaleDateString('fr-FR')} — notification envoyée au joueur
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== SECTION CLUBS / AGENTS ===== */}
          {activeSection === 'recruteurs' && (
            <>
              {recruteurs.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏢</p>
                  <p style={{ color: colors.text.dim }}>Aucun recruteur inscrit pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recruteurs.map(r => {
                    const initiales = `${(r.prenom || '?')[0]}${(r.nom || '?')[0]}`
                    return (
                      <div key={r.id} style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Avatar */}
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.blue, fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                            {initiales}
                          </div>
                        )}
                        {/* Infos */}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{r.prenom} {r.nom}</p>
                          <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text.dim }}>
                            {r.type_recruteur || 'Recruteur'}{r.club ? ` — ${r.club}` : ''}{r.region ? ` · ${r.region}` : ''}
                          </p>
                        </div>
                        {/* Bouton profil */}
                        <button onClick={() => setRecruteurModal(r)}
                          style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          👤 Voir le profil
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== SECTION SÉANCES CLUB ===== */}
          {activeSection === 'seances_club' && (
            <>
              {seancesTransferees.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎥</p>
                  <p style={{ color: colors.text.dim }}>Aucune séance transférée par un club pour l'instant</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {seancesTransferees.map(s => {
                    const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                    return (
                      <div key={s.id} style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || 'Séance'}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.dim }}>
                            Club : {s.club?.club || `${s.club?.prenom} ${s.club?.nom}`} · {s.saison}
                            {s.date_seance ? ` · ${new Date(s.date_seance).toLocaleDateString('fr-FR')}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {s.pris_en_charge_par ? (
                            <>
                              <span style={{ background: s.pris_en_charge_par === coachId ? colors.accent.green + alpha.subtle : '#f59e0b15', border: `1px solid ${s.pris_en_charge_par === coachId ? colors.accent.green + alpha.medium : '#f59e0b40'}`, color: s.pris_en_charge_par === coachId ? colors.accent.green : '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                                {s.pris_en_charge_par === coachId ? '✅ Toi' : `🔒 ${s.coach?.prenom || 'Autre coach'}`}
                              </span>
                              {s.pris_en_charge_par === coachId && (
                                <button onClick={() => prendreEnCharge('seances_uploadees', s.id, true)} style={{ background: 'none', border: '1px solid #333', color: colors.text.dim, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => prendreEnCharge('seances_uploadees', s.id, false)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
                          )}
                          <a href={s.video_url} target="_blank" rel="noreferrer" style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🎬 Voir</a>
                          {s.statut === 'transfere_coach' && (
                            <button onClick={() => setSeanceEvalModal(s)} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>📋 Analyser</button>
                          )}
                          {eval_ && (
                            <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeSection === 'analyseur_ia' && <AnalyseurIA />}

          {/* ===== SECTION SUPPORT ===== */}
          {activeSection === 'support' && (
            <>
              {ticketsError && (
                <div style={{ background: '#f9731610', border: '1px solid #f9731640', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', color: colors.accent.orange, fontSize: '13px' }}>
                  ⚠️ {ticketsError}
                </div>
              )}
              {tickets.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>💬</p>
                  <p style={{ color: colors.text.dim }}>Aucun ticket pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tickets.map(t => (
                    <div key={t.id} style={{ background: colors.background.surface, border: `1px solid ${t.statut === 'ouvert' ? colors.accent.orange + alpha.medium : '#222'}`, borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{t.sujet}</p>
                            {t.statut === 'ouvert' ? (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent.orange, background: colors.accent.orange + alpha.subtle, border: '1px solid #f9731630', padding: '2px 8px', borderRadius: '20px' }}>OUVERT</span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent.green, background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', padding: '2px 8px', borderRadius: '20px' }}>✓ RÉSOLU</span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text.dim }}>
                            {t.expediteur ? `${t.expediteur.prenom || ''} ${t.expediteur.nom || ''}`.trim() || t.expediteur.email : 'Utilisateur inconnu'}
                            {t.expediteur?.email ? ` · ${t.expediteur.email}` : ''}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: '11px', color: colors.text.disabled }}>{new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {t.statut === 'ouvert' && (
                          <button onClick={() => marquerTicketResolu(t.id)} disabled={savingTicket === t.id}
                            style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {savingTicket === t.id ? 'Mise à jour...' : '✓ Marquer comme résolu'}
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, lineHeight: 1.6, borderTop: '1px solid #1f1f1f', paddingTop: '10px' }}>{t.message}</p>

                      {t.reponse && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1f1f1f' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ta réponse</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#ddd', lineHeight: 1.6 }}>{t.reponse}</p>
                        </div>
                      )}

                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1f1f1f', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <textarea
                          value={reponseDrafts[t.id] ?? ''}
                          onChange={e => setReponseDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder={t.reponse ? 'Modifier la réponse...' : 'Écrire une réponse...'}
                          rows={2}
                          style={{ flex: '1 1 200px', background: colors.background.sunken, border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 10px', color: '#e4e4e7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <button
                          onClick={() => envoyerReponseTicket(t.id)}
                          disabled={savingTicket === t.id || !(reponseDrafts[t.id] ?? '').trim()}
                          style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: !(reponseDrafts[t.id] ?? '').trim() ? 0.5 : 1, alignSelf: 'flex-start' }}
                        >
                          ✉️ Envoyer la réponse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== SECTION CLUBS EN ATTENTE (accès restreint) ===== */}
          {activeSection === 'clubs_admin' && isAdminClubs && (
            <>
              <p style={{ color: colors.text.dim, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Comptes club (créés manuellement après un premier contact — voir aussi l'onglet
                "Demandes Club") en attente d'activation. Vérifie le nombre de licenciés avec le club,
                choisis le palier correspondant, copie le lien de paiement adapté et envoie-le par email.
                « Activer manuellement » sert uniquement si le paiement se fait hors Stripe (virement...).
              </p>
              {clubsEnAttente.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏟️</p>
                  <p style={{ color: colors.text.dim }}>Aucun club en attente d'activation</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clubsEnAttente.map(c => {
                    const palier = palierChoisi[c.id] || 'c0'
                    return (
                      <div key={c.id} style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '14px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{c.club || '(nom du club non renseigné)'}</p>
                            <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text.dim }}>{c.prenom} {c.nom} · {c.email}</p>
                            <p style={{ margin: '3px 0 0', fontSize: '11px', color: colors.text.disabled }}>Inscrit le {new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <button onClick={() => activerClub(c.id)} disabled={activatingClub === c.id}
                            style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {activatingClub === c.id ? 'Activation...' : '✓ Activer manuellement'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select value={palier} onChange={e => setPalierChoisi(prev => ({ ...prev, [c.id]: e.target.value }))}
                            style={{ background: colors.background.base, border: '1px solid #333', color: 'white', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                            {Object.entries(STRIPE_LINKS_CLUB).map(([key, p]) => (
                              <option key={key} value={key}>{p.label} — {p.mensuelPrix} / {p.annuelPrix}</option>
                            ))}
                          </select>
                          <button onClick={() => copierLienClub(c.id, palier, 'mensuel')}
                            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            📋 Copier lien mensuel
                          </button>
                          <button onClick={() => copierLienClub(c.id, palier, 'annuel')}
                            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            📋 Copier lien annuel
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== SECTION DEMANDES CLUB (accès restreint) ===== */}
          {activeSection === 'demandes_club' && isAdminClubs && (
            <>
              <p style={{ color: colors.text.dim, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Demandes de contact envoyées depuis la page /offres (formulaire club — pas de paiement en
                libre-service). Recontacte sous 24-48h, puis marque comme traité une fois le club activé
                ou la demande close.
              </p>
              {demandesClub.length === 0 ? (
                <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📨</p>
                  <p style={{ color: colors.text.dim }}>Aucune demande pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {demandesClub.map(d => (
                    <div key={d.id} style={{ background: colors.background.surface, border: `1px solid ${d.statut === 'nouveau' ? colors.accent.orange + alpha.medium : '#222'}`, borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{d.prenom} {d.nom}</p>
                            {/* d.type existe seulement pour les demandes envoyées depuis le nouveau
                                formulaire (Offres.jsx) — anciennes demandes : fallback sur d.role. */}
                            {d.type ? (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: d.type === 'abonnement' ? colors.accent.green : colors.accent.blue, background: (d.type === 'abonnement' ? colors.accent.green : colors.accent.blue) + alpha.subtle, border: `1px solid ${d.type === 'abonnement' ? '#4ade8040' : '#60a5fa30'}`, padding: '2px 8px', borderRadius: '20px' }}>
                                {d.type === 'abonnement' ? '💳 Abonnement' : '💬 Question'}
                              </span>
                            ) : d.role ? (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', padding: '2px 8px', borderRadius: '20px' }}>{d.role}</span>
                            ) : null}
                            {d.statut === 'nouveau' && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent.orange, background: colors.accent.orange + alpha.subtle, border: '1px solid #f9731630', padding: '2px 8px', borderRadius: '20px' }}>NOUVEAU</span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text.dim }}>{d.email}{d.telephone ? ` · ${d.telephone}` : ''}</p>
                          {d.nom_club && (
                            <p style={{ margin: '3px 0 0', fontSize: '12px', color: colors.text.dim }}>
                              🏟️ {d.nom_club}{d.nb_licencies && STRIPE_LINKS_CLUB[d.nb_licencies] ? ` · ${STRIPE_LINKS_CLUB[d.nb_licencies].label}` : ''}
                            </p>
                          )}
                          <p style={{ margin: '3px 0 0', fontSize: '11px', color: colors.text.disabled }}>{new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          {d.lien_paiement_envoye && (
                            <p style={{ margin: '3px 0 0', fontSize: '11px', color: colors.accent.green }}>
                              ✓ Lien copié le {new Date(d.lien_paiement_envoye_le).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                          {d.type === 'abonnement' && d.nb_licencies && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => copierLienDemandeClub(d, 'mensuel')}
                                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {lienCopieDemande === `${d.id}-mensuel` ? '✓ Copié' : '📋 Lien mensuel'}
                              </button>
                              <button onClick={() => copierLienDemandeClub(d, 'annuel')}
                                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {lienCopieDemande === `${d.id}-annuel` ? '✓ Copié' : '📋 Lien annuel'}
                              </button>
                            </div>
                          )}
                          {d.statut === 'nouveau' ? (
                            <button onClick={() => marquerDemandeTraitee(d.id)} disabled={traitantDemande === d.id}
                              style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {traitantDemande === d.id ? 'Mise à jour...' : '✓ Marquer comme traité'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: colors.accent.green, fontWeight: 600 }}>✓ Traité</span>
                          )}
                        </div>
                      </div>
                      {d.message && (
                        <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, lineHeight: 1.6, borderTop: '1px solid #1f1f1f', paddingTop: '10px' }}>{d.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* MODAL PROFIL RECRUTEUR */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
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

            {/* Infos */}
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
