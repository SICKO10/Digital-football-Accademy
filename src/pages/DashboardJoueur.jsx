import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Loader from '../components/Loader'
import Avatar from '../components/Avatar'
import { FifaCardGenerator } from '../components/FifaCard'
import { ModalNotation, BadgeNote } from '../components/Notation'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
}

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconPlay = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
)
const IconGlobe = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)
const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IconVideoOff = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)
const IconLock = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconSearch = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M7 15h4M15 15h2M7 11h2"/>
  </svg>
)
const IconBadge = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
)
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1"/>
  </svg>
)

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [savingStats, setSavingStats] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [reelJogabonito, setReelJogabonito] = useState(null)
  const [deletingReel, setDeletingReel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [fanOnglet, setFanOnglet] = useState('accueil')
  const [fanFavoris, setFanFavoris] = useState([])
  const [loadingFanFavoris, setLoadingFanFavoris] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState([])

  const [pointsForts, setPointsForts] = useState([])
  const [aAmeliorer, setAAmeliorer] = useState([])
  const [styleDeJeu, setStyleDeJeu] = useState('')

  // Certification
  const [certifications, setCertifications] = useState([])
  const [nouvelleCertif, setNouvelleCertif] = useState({ niveau: '', saison: '' })
  const [certifDocs, setCertifDocs] = useState([])
  const [uploadingCertif, setUploadingCertif] = useState(false)
  const [submittingCertif, setSubmittingCertif] = useState(false)
  const [certifSent, setCertifSent] = useState(false)

  const [parcours, setParcours] = useState([])
  const [nouveauClub, setNouveauClub] = useState({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' })
  const [savingParcours, setSavingParcours] = useState(false)
  const [editingParcoursId, setEditingParcoursId] = useState(null)
  const [clubSuggestions, setClubSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [coaches, setCoaches] = useState([])
  const [coachSelectionne, setCoachSelectionne] = useState(null)
  const [messageCoach, setMessageCoach] = useState('')
  const [sendingCoach, setSendingCoach] = useState(false)
  const [coachSent, setCoachSent] = useState(false)
  const [convCoach, setConvCoach] = useState([])
  const [coachUnread, setCoachUnread] = useState(0)
  const [recruteurModal, setRecruteurModal] = useState(null)
  const [notationCible, setNotationCible] = useState(null)

  // Explorer (clubs + recruteurs)
  const [clubsListe, setClubsListe] = useState([])
  const [recruteursList, setRecruteursList] = useState([])
  const [clubsLoading, setClubsLoading] = useState(false)
  const [explorerFiltre, setExplorerFiltre] = useState('tous') // 'tous' | 'clubs' | 'recruteurs'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => { getProfil() }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (onglet === 'coach' && userId) {
      localStorage.setItem(`coach_read_${userId}`, new Date().toISOString())
      setCoachUnread(0)
    }
    if (onglet === 'clubs' && clubsListe.length === 0 && recruteursList.length === 0) {
      setClubsLoading(true)
      Promise.all([
        supabase.from('profiles').select('id, prenom, nom, club, region, niveau_equipe, avatar_url, description').eq('plan', 'educateur'),
        supabase.from('profiles').select('id, prenom, nom, club, region, type_recruteur, avatar_url, description').eq('plan', 'recruteur'),
      ]).then(([{ data: edu }, { data: rec }]) => {
        setClubsListe(edu || [])
        setRecruteursList(rec || [])
        setClubsLoading(false)
      })
    }
  }, [onglet, userId])

  const getProfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    setUserId(user.id)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: demandesData } = await supabase.from('demandes').select('*').eq('joueur_id', user.id).order('created_at', { ascending: false })
    const { data: coachData } = await supabase.from('profiles').select('*').eq('plan', 'coach')
    setProfil(data)
    setStats({
      club: data?.club || '', niveau_equipe: data?.niveau_equipe || '', categorie: data?.categorie || '',
      region: data?.region || '', numero_licence: data?.numero_licence || '', pied: data?.pied || 'droit', matchs_officiel: data?.matchs_officiel || 0,
      matchs_amical: data?.matchs_amical || 0, minutes_jouees: data?.minutes_jouees || 0,
      buts_pied_droit: data?.buts_pied_droit || 0, buts_pied_gauche: data?.buts_pied_gauche || 0,
      buts_tete: data?.buts_tete || 0, buts_total: data?.buts_total || 0,
      passes_decisives: data?.passes_decisives || 0, cleansheets: data?.cleansheets || 0,
    })
    setPointsForts(data?.points_forts ? data.points_forts.split(', ').filter(Boolean) : [])
    setAAmeliorer(data?.a_ameliorer ? data.a_ameliorer.split(', ').filter(Boolean) : [])
    setStyleDeJeu(data?.style_de_jeu || '')
    const { data: parcoursData } = await supabase.from('parcours').select('*').eq('joueur_id', user.id).order('saison', { ascending: false })
    setParcours(parcoursData || [])
    const { data: certifData } = await supabase.from('certifications').select('*').eq('joueur_id', user.id).order('created_at', { ascending: false })
    setCertifications(certifData || [])
    setDemandes(demandesData || [])
    setCoaches(coachData || [])
    if (coachData && coachData.length > 0) setCoachSelectionne(coachData[0])
    const { data: reelRows, error: reelErr } = await supabase.from('reels').select('id, video_url').eq('joueur_id', user.id).order('created_at', { ascending: false }).limit(1)
    console.log('[DashboardJoueur] reelRows:', reelRows, 'error:', reelErr)
    setReelJogabonito(reelRows?.[0] || null)
    await chargerConversations(user.id)
    setLoading(false)
  }

  const chargerConversations = async (uid) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    if (!data) return
    setMessages(data)
    const map = {}
    data.forEach(msg => {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
      const other = msg.sender_id === uid ? msg.receiver : msg.sender
      if (!map[otherId]) map[otherId] = { otherId, other, msgs: [] }
      map[otherId].msgs.push(msg)
    })
    const allConvs = Object.values(map)
    setConversations(allConvs.filter(c => c.other?.plan !== 'coach'))
    setConvCoach(allConvs.filter(c => c.other?.plan === 'coach'))
    // Compter messages coach non lus (reçus après la dernière visite de l'onglet)
    const lastRead = localStorage.getItem(`coach_read_${uid}`) || '1970-01-01'
    const nonLus = data.filter(msg =>
      msg.sender?.plan === 'coach' &&
      msg.receiver_id === uid &&
      new Date(msg.created_at) > new Date(lastRead)
    )
    setCoachUnread(nonLus.length)
  }

  const envoyerMessage = async () => {
    if (!newMessage.trim() || !messageActif || !userId) return
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: messageActif.otherId, content: newMessage.trim(), created_at: new Date().toISOString() })
    setNewMessage('')
    await chargerConversations(userId)
  }

  const envoyerMessageCoach = async () => {
    if (!messageCoach.trim() || !coachSelectionne || !userId) return
    setSendingCoach(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: coachSelectionne.id, content: messageCoach.trim(), created_at: new Date().toISOString() })
    setSendingCoach(false)
    setCoachSent(true)
    setMessageCoach('')
    await chargerConversations(userId)
    setTimeout(() => setCoachSent(false), 3000)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  const handleCertifDocUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !userId) return
    setUploadingCertif(true)
    const uploaded = []
    for (const file of files) {
      try {
        const sigRes = await fetch('/api/upload-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
        const formData = new FormData()
        formData.append('file', file)
        formData.append('signature', signature)
        formData.append('timestamp', timestamp)
        formData.append('folder', folder)
        formData.append('public_id', public_id)
        formData.append('api_key', api_key)
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadData.secure_url) {
          uploaded.push(uploadData.secure_url)
        } else {
          console.error('Cloudinary upload failed:', uploadData)
        }
      } catch (err) { console.error('Upload certif error:', err) }
    }
    setCertifDocs(prev => [...prev, ...uploaded])
    setUploadingCertif(false)
  }

  const soumettreDemandesCertification = async () => {
    if (!nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5 || !userId) return
    setSubmittingCertif(true)
    const { error } = await supabase.from('certifications').insert({
      joueur_id: userId,
      niveau: nouvelleCertif.niveau,
      saison: nouvelleCertif.saison,
      documents: certifDocs,
      statut: 'en_attente',
    })
    if (!error) {
      const { data } = await supabase.from('certifications').select('*').eq('joueur_id', userId).order('created_at', { ascending: false })
      setCertifications(data || [])
      setNouvelleCertif({ niveau: '', saison: '' })
      setCertifDocs([])
      setCertifSent(true)
      setTimeout(() => setCertifSent(false), 4000)
    }
    setSubmittingCertif(false)
  }

  const handleFifaCardSave = async (blob) => {
    if (!userId) return
    try {
      const file = new File([blob], 'carte-fifa.png', { type: 'image/png' })
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id + '_carte_fifa')
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (uploadData.secure_url) {
        await supabase.from('profiles').update({ carte_fifa_url: uploadData.secure_url }).eq('id', userId)
        setProfil(prev => ({ ...prev, carte_fifa_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Carte FIFA upload error:', err)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)
    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (uploadData.secure_url) {
        await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', userId)
        setProfil(prev => ({ ...prev, avatar_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setAvatarUploading(false)
  }

  const handleSaveStats = async () => {
    setSavingStats(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ ...stats, points_forts: pointsForts.join(', '), a_ameliorer: aAmeliorer.join(', '), style_de_jeu: styleDeJeu }).eq('id', user.id)
    setSavingStats(false)
    setStatsSaved(true)
    setTimeout(() => setStatsSaved(false), 3000)
  }

  const caracteristiquesParPoste = {
    Gardien: ['Jeu au pied', 'Sortie aérienne', 'Sur sa ligne', 'Penalties', 'Leadership', '1 contre 1', 'Lecture du jeu', 'Anticipation', 'Relance longue', 'Commandement défensif', 'Détente', 'Sang-froid'],
    Defenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1', 'Pressing', 'Marquage', 'Placement', 'Récupération de balle', 'Jeu propre', 'Combativité'],
    Milieu: ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre', 'Passes courtes', 'Transition rapide', 'Jeu entre les lignes', 'Leadership'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin', 'Décalage', 'Combinaison', 'Mouvement sans ballon', 'Leadership offensif'],
  }

  const toggleCaracteristique = (liste, setListe, valeur) => {
    if (liste.includes(valeur)) {
      setListe(liste.filter(v => v !== valeur))
    } else if (liste.length < 4) {
      setListe([...liste, valeur])
    }
  }

  const getClubInitials = (name) => {
    const words = name.trim().split(/\s+/).filter(w => !['AS', 'FC', 'OC', 'US', 'SC', 'AC', 'RC', 'ES', 'OGC', 'SM', 'EA', 'En'].includes(w))
    if (words.length === 0) return name.slice(0, 2).toUpperCase()
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase()
  }

  const getClubColor = (name) => {
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#06b6d4', '#ec4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const searchClubDebounceRef = useRef(null)

  const searchClubs = useCallback((query) => {
    if (searchClubDebounceRef.current) clearTimeout(searchClubDebounceRef.current)
    if (!query || query.length < 2) { setClubSuggestions([]); setShowSuggestions(false); return }
    searchClubDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/1/searchteams.php?t=${encodeURIComponent(query)}`)
        const json = await res.json()
        const teams = (json.teams || []).filter(t => t.strSport === 'Soccer' && t.strTeamBadge)
        setClubSuggestions(teams.slice(0, 6))
        setShowSuggestions(teams.length > 0)
      } catch {
        setClubSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 350)
  }, [])

  const selectClubSuggestion = (team) => {
    setNouveauClub(prev => ({ ...prev, club: team.strTeam, logo_url: team.strTeamBadge || '' }))
    setClubSuggestions([])
    setShowSuggestions(false)
  }

  const ajouterClub = async () => {
    if (!nouveauClub.club.trim() || !userId) return
    setSavingParcours(true)
    if (editingParcoursId) {
      const { error } = await supabase.from('parcours').update({ ...nouveauClub }).eq('id', editingParcoursId)
      if (error) { alert('Erreur modification : ' + error.message); setSavingParcours(false); return }
      setEditingParcoursId(null)
    } else {
      const { error: insertError } = await supabase.from('parcours').insert({ ...nouveauClub, joueur_id: userId })
      if (insertError) { alert('Erreur ajout parcours : ' + insertError.message); setSavingParcours(false); return }
    }
    const { data, error: fetchError } = await supabase.from('parcours').select('*').eq('joueur_id', userId).order('saison', { ascending: false })
    if (fetchError) console.error('Erreur chargement parcours :', fetchError.message)
    setParcours(data || [])
    setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setSavingParcours(false)
  }

  const modifierClub = (p) => {
    setEditingParcoursId(p.id)
    setNouveauClub({ club: p.club || '', saison: p.saison || '', categorie: p.categorie || '', poste: p.poste || '', logo_url: p.logo_url || '', niveau_championnat: p.niveau_championnat || '', matchs_joues: p.matchs_joues || '', buts: p.buts || '', passes_decisives: p.passes_decisives || '', cleansheets: p.cleansheets || '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setTimeout(() => document.getElementById('parcours-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const supprimerClub = async (id) => {
    if (!window.confirm('Supprimer cette entrée du parcours ?')) return
    const { error } = await supabase.from('parcours').delete().eq('id', id)
    if (error) { alert('Erreur suppression : ' + error.message); return }
    if (editingParcoursId === id) { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }
    setParcours(prev => prev.filter(p => p.id !== id))
  }

  const handleDeleteVideo = async () => {
    if (!window.confirm('Supprimer ta vidéo ? Elle sera retirée du feed et de Jogabonito.')) return
    setDeletingVideo(true)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    setDeletingVideo(false)
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const handleDeleteReel = async () => {
    if (!window.confirm('Supprimer ta vidéo Jogabonito ? Elle ne sera plus visible dans le feed.')) return
    setDeletingReel(true)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    setDeletingReel(false)
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    setReelJogabonito(null)
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const chargerFanFavoris = async () => {
    if (!userId) return
    setLoadingFanFavoris(true)
    const { data: favData } = await supabase.from('video_favoris').select('joueur_id').eq('user_id', userId)
    const joueurIds = favData?.map(f => f.joueur_id) || []
    if (joueurIds.length > 0) {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*, profiles(prenom, nom, poste, categorie, club, avatar_url)')
        .in('joueur_id', joueurIds)
        .order('created_at', { ascending: false })
      setFanFavoris(reelsData || [])
    } else {
      setFanFavoris([])
    }
    setLoadingFanFavoris(false)
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Résilier ton abonnement ? Tu garderas l\'accès jusqu\'à la fin de la période en cours, puis ton compte passera en Starter.')) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur résiliation')
      setCancelDone(true)
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
    setCancelling(false)
  }

  const inputStyle = {
    width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '11px 14px', color: 'white', fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const labelStyle = {
    fontSize: '11px', color: '#555', display: 'block', marginBottom: '7px',
    fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
  }
  const msgBubble = (mine) => ({
    maxWidth: '70%', padding: '10px 14px',
    borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: mine ? '#4ade80' : '#1a1a1a', color: mine ? '#000' : '#fff',
    fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px',
  })

  if (loading) return <Loader />

  // ── BANNI ──
  if (profil?.banni) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#111', border: '1px solid #ef444430', borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginBottom: '0.75rem' }}>Compte suspendu</h1>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '1rem', lineHeight: 1.6 }}>
            Ton compte a été suspendu pour violation des CGU et du règlement de la plateforme.
          </p>
          {profil?.banni_motif && (
            <div style={{ background: '#1a1a1a', border: '1px solid #ef444420', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                <strong style={{ color: '#ef4444' }}>Motif :</strong> {profil.banni_motif}
              </p>
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#444', marginBottom: '1.5rem' }}>
            Conformément aux CGU acceptées lors de ton inscription, aucun remboursement ne sera effectué.
          </p>
          <span onClick={handleLogout} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  // ── FAN ──
  if (profil?.plan === 'fan') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #141414' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>Bonjour {profil?.prenom}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Déconnexion</button>
          </div>
        </nav>

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #141414', marginBottom: '2rem', paddingBottom: '0' }}>
            {[['accueil', 'Accueil'], ['favoris', 'Mes Favoris'], ['messages', 'Messages']].map(([id, label]) => (
              <button key={id} onClick={() => { setFanOnglet(id); if (id === 'favoris') chargerFanFavoris() }}
                style={{ background: 'transparent', border: 'none', color: fanOnglet === id ? '#4ade80' : '#555', fontSize: '13px', fontWeight: fanOnglet === id ? 700 : 400, cursor: 'pointer', padding: '10px 16px', borderBottom: fanOnglet === id ? '2px solid #4ade80' : '2px solid transparent', fontFamily: 'Inter, sans-serif', marginBottom: '-1px' }}>
                {label}
              </button>
            ))}
          </div>

          {fanOnglet === 'accueil' && (
            <>
              <div style={{ background: '#111', border: '1px solid #4ade8020', borderRadius: '20px', padding: '2.5rem', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#4ade8010', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#4ade80' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Compte Fan</h1>
                <p style={{ color: '#555', fontSize: '14px', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Like, commente et sauvegarde les meilleurs reels Jogabonito.</p>
                <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Voir Jogabonito
                </button>
              </div>
              <div style={{ background: '#111', border: '1px solid #4ade8030', borderRadius: '20px', padding: '2rem' }}>
                <div style={{ display: 'inline-block', background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', marginBottom: '14px', letterSpacing: '1px' }}>PASSE JOUEUR</div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Expose ton talent aux recruteurs</h2>
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem', lineHeight: 1.6 }}>Publie tes vidéos, reçois des analyses d'expert et sois visible des clubs et agents.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {[{ plan: 'Starter', prix: '49,99€/mois', desc: '2 analyses / mois · Reels Jogabonito' }, { plan: 'Pro', prix: '79,99€/mois', desc: '3 analyses / mois · Feed · Visible recruteurs' }].map(p => (
                    <div key={p.plan} style={{ background: '#141414', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{p.plan}</p><p style={{ margin: '2px 0 0', fontSize: '11px', color: '#444' }}>{p.desc}</p></div>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '14px' }}>{p.prix}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Devenir joueur</button>
              </div>
            </>
          )}

          {fanOnglet === 'favoris' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.3px' }}>Reels sauvegardés</h2>
              {loadingFanFavoris ? (
                <p style={{ color: '#4ade80', textAlign: 'center', fontSize: '14px' }}>Chargement...</p>
              ) : fanFavoris.length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: '#333', margin: '0 0 12px', display: 'flex', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </p>
                  <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.6 }}>Aucun reel sauvegardé.<br />Swipe sur Jogabonito et tape Save pour les retrouver ici.</p>
                  <button onClick={() => navigate('/jogabonito')} style={{ marginTop: '1rem', background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Aller sur Jogabonito</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fanFavoris.map(reel => (
                    <div key={reel.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Avatar person={reel.profiles} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{reel.profiles?.prenom} {reel.profiles?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4ade80' }}>{reel.profiles?.poste}{reel.profiles?.categorie ? ` · ${reel.profiles.categorie}` : ''}</p>
                        {reel.titre && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#444', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{reel.titre}</p>}
                      </div>
                      <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade8010', border: '1px solid #4ade8030', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>Voir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {fanOnglet === 'messages' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ color: '#2a2a2a', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconLock /></div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Plan Pro requis</h2>
              <p style={{ fontSize: '13px', color: '#555', maxWidth: '340px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>Passe au Plan Pro pour recevoir des messages de recruteurs et clubs.</p>
              <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Plan Pro — 79,99€/mois</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── PAS ABONNÉ ──
  if (!profil?.abonnement_actif) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
        <div style={{ maxWidth: '400px', width: '100%', background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.3px' }}>Abonnement non actif</h1>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '1.5rem' }}>Ton paiement n'a pas encore été confirmé.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
            <button onClick={() => window.location.href = STRIPE_LINKS.starter} style={{ background: 'transparent', color: 'white', border: '1px solid #2a2a2a', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer Starter — 49,99€/mois</button>
            <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer Pro — 79,99€/mois</button>
          </div>
          <span onClick={handleLogout} style={{ color: '#444', fontSize: '12px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  // ── DASHBOARD PRINCIPAL ──
  const maxAnalyses = profil?.plan === 'pro' ? 3 : 2
  const isPro = profil?.plan === 'pro'

  const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: <IconHome /> },
    { id: 'profil', label: 'Mon Profil', icon: <IconUser /> },
    { id: 'carte', label: 'Carte FIFA', icon: <IconCard /> },
    { id: 'certif', label: 'Certification', icon: <IconBadge /> },
    { id: 'analyses', label: 'Analyses', icon: <IconChart />, badge: demandes.filter(d => d.statut === 'analyse').length },
    { id: 'messages', label: 'Recruteurs', icon: <IconMessage />, badge: conversations.length },
    { id: 'coach', label: 'Coach Analyseur', icon: <IconMic />, badge: coachUnread },
    { id: 'clubs', label: 'Explorer', icon: <IconBuilding /> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        input:focus, select:focus, textarea:focus { border-color: #4ade8060 !important; box-shadow: 0 0 0 3px #4ade8008; }
        .dj-nav-btn:hover { background: #141414 !important; color: #ccc !important; }
        .dj-action-card:hover { transform: translateY(-2px); border-color: #2a2a2a !important; }
        .dj-btn-green:hover { background: #22c55e !important; }
        .dj-bottom-nav-btn:hover { color: #ccc !important; }
      `}</style>

      {/* ── SIDEBAR (desktop only) ── */}
      {!isMobile && <aside style={{ width: '220px', minHeight: '100vh', background: '#0d0d0d', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #141414' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Digital<span style={{ color: '#4ade80' }}>Football</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(item => (
            <button key={item.id} className="dj-nav-btn" onClick={() => setOnglet(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: onglet === item.id ? '#4ade8012' : 'transparent', color: onglet === item.id ? '#4ade80' : '#555', fontSize: '13px', fontWeight: onglet === item.id ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: '#4ade80', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.3px' }}>
                  {item.badge}
                </span>
              )}
              {onglet === item.id && (
                <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: '#4ade80', borderRadius: '0 3px 3px 0' }} />
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 10px 20px', borderTop: '1px solid #141414' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '8px' }}>
            <Avatar person={profil} size={32} border="1.5px solid #4ade8040" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profil?.prenom} {profil?.nom}</p>
              <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{profil?.plan}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', color: '#444', padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Déconnexion
          </button>
        </div>
      </aside>}

      {/* ── BOTTOM NAV (mobile only) ── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '1px solid #222', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.map(item => (
            <button key={item.id} className="dj-bottom-nav-btn" onClick={() => setOnglet(item.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px 4px 8px', background: 'transparent', border: 'none', color: onglet === item.id ? '#4ade80' : '#555', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s', position: 'relative' }}>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: '6px', right: 'calc(50% - 18px)', background: '#4ade80', color: '#000', fontSize: '9px', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.badge}
                </span>
              )}
              {item.icon}
              <span style={{ fontSize: '10px', fontWeight: onglet === item.id ? 700 : 400, letterSpacing: '0.2px' }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh', paddingBottom: isMobile ? '80px' : 0 }}>

        {/* ── ACCUEIL ── */}
        {onglet === 'dashboard' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>

            {/* HERO CARD */}
            <div style={{ background: 'linear-gradient(135deg, #111 0%, #141414 100%)', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '32px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar person={profil} size={80} border="2.5px solid #4ade80" />
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'wait' : 'pointer', border: '2.5px solid #0a0a0a' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>{profil?.prenom} {profil?.nom}</h1>
                  <span style={{ background: isPro ? '#4ade80' : '#3b82f6', color: '#000', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>
                    {profil?.plan}
                  </span>
                  {profil?.numero_licence && (
                    <span style={{ background: '#1a2e4a', border: '1px solid #3b82f640', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', flexShrink: 0 }}>
                      🪪 Licencié FFF
                    </span>
                  )}
                </div>
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>
                  {profil?.poste || '—'}{profil?.club ? ` · ${profil.club}` : ''}{profil?.region ? ` · ${profil.region}` : ''}
                </p>
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                  {[
                    { val: profil?.analyses_restantes ?? '—', label: 'Analyses' },
                    { val: demandes.length, label: 'Demandes' },
                    { val: profil?.categorie || '—', label: 'Catégorie' },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                      <div>
                        <p style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1, color: '#fff' }}>{s.val}</p>
                        <p style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginTop: '3px' }}>{s.label}</p>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: '1px', height: '32px', background: '#1f1f1f' }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* QUOTA ANALYSES */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '3px' }}>Quota analyses</p>
                  <p style={{ fontSize: '11px', color: '#444' }}>Réinitialisé automatiquement chaque mois</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: (profil?.analyses_restantes || 0) > 0 ? '#4ade80' : '#ef4444', lineHeight: 1 }}>
                    {profil?.analyses_restantes ?? 0}
                  </span>
                  <span style={{ fontSize: '14px', color: '#333', fontWeight: 400 }}>/{maxAnalyses}</span>
                </div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: '99px', height: '5px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ height: '100%', width: `${((profil?.analyses_restantes || 0) / maxAnalyses) * 100}%`, background: (profil?.analyses_restantes || 0) > 0 ? '#4ade80' : '#ef4444', borderRadius: '99px', transition: 'width 0.6s ease' }} />
              </div>
              {(profil?.analyses_restantes || 0) > 0 ? (
                <button className="dj-btn-green" onClick={() => navigate('/upload')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}>
                  Envoyer une vidéo pour analyse
                </button>
              ) : (
                <p style={{ fontSize: '12px', color: '#444' }}>Quota épuisé ce mois — renouvellement automatique.</p>
              )}
            </div>

            {/* ACTION CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: isPro ? 'repeat(3, 1fr)' : '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <button className="dj-action-card" onClick={() => navigate('/jogabonito')}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f9731612', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#f97316' }}>
                  <IconPlay />
                </div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Jogabonito</p>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>Feed vertical · Reels des talents</p>
              </button>

              {isPro && (
                <button className="dj-action-card" onClick={() => navigate('/feed')}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#4ade8012', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#4ade80' }}>
                    <IconGlobe />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Feed</p>
                  <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>Talents · Visible recruteurs</p>
                </button>
              )}

              <button className="dj-action-card" onClick={() => navigate(isPro ? '/upload-clip' : '/upload-reel')}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#60a5fa12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#60a5fa' }}>
                  <IconUpload />
                </div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Publier</p>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>{isPro ? 'Clip Feed · Visible agents & clubs' : 'Reel Jogabonito · MP4 · TikTok'}</p>
              </button>
            </div>

            {/* VIDÉO */}
            {profil?.clip_url ? (
              <div style={{ background: '#111', border: '1px solid #4ade8020', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>Vidéo partagée</p>
                    <p style={{ fontSize: '11px', color: '#444' }}>{isPro ? 'Scout Center · Jogabonito · Feed' : 'Jogabonito uniquement'}</p>
                  </div>
                  <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={profil.clip_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#4ade80', color: '#000', padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                    Voir ma vidéo
                  </a>
                  <button onClick={() => navigate('/upload-clip')} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Changer</button>
                  <button onClick={handleDeleteVideo} disabled={deletingVideo} style={{ background: 'transparent', color: deletingVideo ? '#444' : '#ef4444', border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingVideo ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {deletingVideo ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ) : reelJogabonito ? (
              <div style={{ background: '#111', border: '1px solid #f9731620', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>Vidéo Jogabonito</p>
                    <p style={{ fontSize: '11px', color: '#444' }}>Visible dans Jogabonito</p>
                  </div>
                  <span style={{ background: '#f9731615', color: '#f97316', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={reelJogabonito.video_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f97316', color: '#fff', padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                    Voir ma vidéo
                  </a>
                  <button onClick={() => navigate('/upload-reel')} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Changer</button>
                  <button onClick={handleDeleteReel} disabled={deletingReel} style={{ background: 'transparent', color: deletingReel ? '#444' : '#ef4444', border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingReel ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {deletingReel ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '36px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ color: '#2a2a2a', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><IconVideoOff /></div>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#444', marginBottom: '6px' }}>Aucune vidéo publiée</p>
                <p style={{ fontSize: '12px', color: '#333', marginBottom: '20px', lineHeight: 1.6 }}>
                  {isPro ? 'Publie un clip pour apparaître dans le Feed et Jogabonito' : 'Publie un reel pour apparaître dans Jogabonito'}
                </p>
                <button onClick={() => navigate(isPro ? '/upload-clip' : '/upload-reel')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {isPro ? 'Publier un clip' : 'Publier un reel'}
                </button>
              </div>
            )}

            {/* MESSAGES PREVIEW */}
            {conversations.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #4ade8018', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>Messages recruteurs</p>
                  <button onClick={() => setOnglet('messages')} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Voir tout →</button>
                </div>
                {conversations.slice(0, 2).map(conv => (
                  <div key={conv.otherId} onClick={() => { setMessageActif(conv); setOnglet('messages') }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#141414', borderRadius: '10px', cursor: 'pointer', marginBottom: '6px' }}>
                    <Avatar person={conv.other} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ fontSize: '11px', color: '#4ade80' }}>Recruteur</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#333', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #f9731618', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#f97316' }}>Réponses coach</p>
                  <button onClick={() => setOnglet('coach')} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Voir tout →</button>
                </div>
                {convCoach.slice(0, 1).map(conv => (
                  <div key={conv.otherId} onClick={() => setOnglet('coach')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#141414', borderRadius: '10px', cursor: 'pointer' }}>
                    <Avatar person={conv.other} size={32} bg="#f9731612" border="1.5px solid #f9731630" textColor="#f97316" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ fontSize: '11px', color: '#f97316' }}>Coach Analyseur</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#333', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* UPSELL PRO */}
            {!isPro && (
              <div style={{ background: 'linear-gradient(135deg, #0d1a0d 0%, #111 100%)', border: '1px solid #4ade8025', borderRadius: '16px', padding: '22px 24px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>Feed & visibilité recruteurs</p>
                  <p style={{ fontSize: '12px', color: '#555' }}>Passe au Plan Pro pour être visible des clubs et agents.</p>
                </div>
                <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  Plan Pro — 79,99€/mois
                </button>
              </div>
            )}

            {/* ABONNEMENT */}
            <div style={{ background: '#111', border: '1px solid #141414', borderRadius: '14px', padding: '18px 20px' }}>
              {cancelDone ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#f97316', fontWeight: 700, marginBottom: '4px' }}>Résiliation programmée</p>
                  <p style={{ fontSize: '12px', color: '#444' }}>Accès conservé jusqu'à la fin de la période en cours.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#444' }}>
                    Plan actif : <span style={{ color: '#4ade80', fontWeight: 700, textTransform: 'capitalize' }}>{profil?.plan}</span>
                  </p>
                  <button onClick={handleCancelSubscription} disabled={cancelling} style={{ background: 'transparent', border: '1px solid #ef444425', color: cancelling ? '#444' : '#ef4444', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: cancelling ? 'wait' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                    {cancelling ? 'En cours...' : 'Résilier'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MON PROFIL ── */}
        {onglet === 'profil' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '28px' }}>Mon profil</h1>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <p style={labelStyle}>Photo de profil</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
                <Avatar person={profil} size={80} border="2px solid #4ade8050" />
                <div>
                  <label style={{ display: 'inline-block', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 20px', cursor: avatarUploading ? 'not-allowed' : 'pointer', fontSize: '13px', color: avatarUploading ? '#444' : '#aaa', fontFamily: 'Inter, sans-serif' }}>
                    {avatarUploading ? 'Upload en cours...' : 'Choisir une photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  <p style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>JPG, PNG, WEBP · Max 5 MB</p>
                </div>
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>Informations club</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={labelStyle}>Club actuel</label><input value={stats.club} onChange={e => setStats({ ...stats, club: e.target.value })} placeholder="AS Saint-Etienne" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Niveau de l'équipe</label>
                  <select value={stats.niveau_equipe} onChange={e => setStats({ ...stats, niveau_equipe: e.target.value })} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {['Ligue 1', 'Ligue 2', 'National', 'Regional 1', 'Regional 2', 'Regional 3', 'Departemental', 'Amateur'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={stats.categorie} onChange={e => setStats({ ...stats, categorie: e.target.value })} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Senior', 'Veteran'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Région</label><input value={stats.region} onChange={e => setStats({ ...stats, region: e.target.value })} placeholder="Ile-de-France" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Numéro de licence FFF</label>
                  <input value={stats.numero_licence || ''} onChange={e => setStats({ ...stats, numero_licence: e.target.value })} placeholder="Ex: 123456789" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Pied fort</label>
                  <select value={stats.pied} onChange={e => setStats({ ...stats, pied: e.target.value })} style={inputStyle}>
                    <option value="droit">Droit</option>
                    <option value="gauche">Gauche</option>
                    <option value="ambidextre">Ambidextre</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>Statistiques</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[['matchs_officiel', 'Matchs officiels'], ['matchs_amical', 'Matchs amicaux'], ['minutes_jouees', 'Minutes jouées'], ['buts_pied_droit', 'Buts pied droit'], ['buts_pied_gauche', 'Buts pied gauche'], ['buts_tete', 'Buts de la tête'], ['buts_total', 'Buts total'], ['passes_decisives', 'Passes décisives'], ['cleansheets', 'Cleansheets']].map(([key, label]) => (
                  <div key={key}><label style={labelStyle}>{label}</label><input type="number" min="0" value={stats[key]} onChange={e => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
                ))}
              </div>
            </div>

            {caracteristiquesParPoste[profil?.poste] && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
                <p style={{ ...labelStyle, marginBottom: '20px' }}>Style de jeu</p>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Mon style de jeu</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {['Dos au jeu', 'Technique / Dribbleur', 'Physique / Aérien', 'Vitesse / Percussion', 'Créateur / Vision', 'Box-to-box', 'Renard des surfaces', 'Défensif / Récupérateur', 'Meneur / Leadership', 'Centreur', 'Buteur / Finisseur', 'Pressing intense', 'Ailier percutant', 'Polyvalent'].map(s => (
                      <div key={s} onClick={() => setStyleDeJeu(styleDeJeu === s ? '' : s)}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                          background: styleDeJeu === s ? '#60a5fa20' : '#1a1a1a',
                          border: styleDeJeu === s ? '1px solid #60a5fa' : '1px solid #333',
                          color: styleDeJeu === s ? '#60a5fa' : '#aaa',
                          fontWeight: styleDeJeu === s ? 700 : 400,
                        }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Mes points forts (max 4)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {caracteristiquesParPoste[profil.poste].map(c => {
                      const selected = pointsForts.includes(c)
                      const disabled = !selected && pointsForts.length >= 4
                      return (
                        <div
                          key={c}
                          onClick={() => !disabled && toggleCaracteristique(pointsForts, setPointsForts, c)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                            background: selected ? '#4ade8020' : '#1a1a1a',
                            border: selected ? '1px solid #4ade80' : '1px solid #333',
                            color: selected ? '#4ade80' : disabled ? '#444' : 'white',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {c}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Ce que je veux améliorer (max 4)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {caracteristiquesParPoste[profil.poste].map(c => {
                      const selected = aAmeliorer.includes(c)
                      const disabled = !selected && aAmeliorer.length >= 4
                      return (
                        <div
                          key={c}
                          onClick={() => !disabled && toggleCaracteristique(aAmeliorer, setAAmeliorer, c)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                            background: selected ? '#4ade8020' : '#1a1a1a',
                            border: selected ? '1px solid #4ade80' : '1px solid #333',
                            color: selected ? '#4ade80' : disabled ? '#444' : 'white',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {c}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>Parcours footballistique</p>

              {parcours.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  {parcours.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', marginTop: '4px', flexShrink: 0 }} />
                        {i < parcours.length - 1 && <div style={{ width: '1px', flex: 1, background: '#1f1f1f', marginTop: '2px' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i < parcours.length - 1 ? '20px' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p.logo_url
                            ? <img src={p.logo_url} alt={p.club} style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getClubColor(p.club || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{getClubInitials(p.club || '?')}</div>
                          }
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{p.club}</p>
                            <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
                              {[p.saison, p.niveau_championnat, p.categorie, p.poste].filter(Boolean).join(' · ')}
                            </p>
                            {(p.matchs_joues > 0 || p.buts > 0 || p.passes_decisives > 0 || p.cleansheets > 0) && (
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {p.matchs_joues > 0 && <span style={{ fontSize: '11px', color: '#4ade80' }}>⚽ {p.matchs_joues} matchs</span>}
                                {p.buts > 0 && <span style={{ fontSize: '11px', color: '#f97316' }}>🥅 {p.buts} buts</span>}
                                {p.passes_decisives > 0 && <span style={{ fontSize: '11px', color: '#60a5fa' }}>🎯 {p.passes_decisives} passes</span>}
                                {p.cleansheets > 0 && <span style={{ fontSize: '11px', color: '#a855f7' }}>🧤 {p.cleansheets} CS</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => modifierClub(p)} title="Modifier" style={{ background: 'transparent', border: 'none', color: '#4ade8080', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => supprimerClub(p.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: '#ef444480', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div id="parcours-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Club</label>
                  <div style={{ position: 'relative' }}>
                    {nouveauClub.club.trim() && (
                      nouveauClub.logo_url
                        ? <img src={nouveauClub.logo_url} alt="" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', objectFit: 'contain', zIndex: 1 }} />
                        : <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: getClubColor(nouveauClub.club), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff', zIndex: 1 }}>{getClubInitials(nouveauClub.club)}</div>
                    )}
                    <input
                      value={nouveauClub.club}
                      onChange={e => {
                        const val = e.target.value
                        setNouveauClub(prev => ({ ...prev, club: val, logo_url: '' }))
                        searchClubs(val)
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => clubSuggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="AS Saint-Etienne"
                      style={{ ...inputStyle, paddingLeft: nouveauClub.club.trim() ? '36px' : '14px' }}
                    />
                    {loadingSuggestions && (
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#555' }}>…</span>
                    )}
                  </div>
                  {showSuggestions && clubSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', zIndex: 100, overflow: 'hidden', marginTop: '4px' }}>
                      {clubSuggestions.map(team => (
                        <div
                          key={team.idTeam}
                          onMouseDown={() => selectClubSuggestion(team)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #222' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#222'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {team.strTeamBadge && <img src={team.strTeamBadge} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{team.strTeam}</p>
                            {team.strCountry && <p style={{ fontSize: '10px', color: '#555', margin: 0 }}>{team.strCountry}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Saison</label>
                  <input value={nouveauClub.saison} onChange={e => setNouveauClub({ ...nouveauClub, saison: e.target.value })} placeholder="2023-2024" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={nouveauClub.categorie} onChange={e => setNouveauClub({ ...nouveauClub, categorie: e.target.value })} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Senior'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Poste</label>
                  <select value={nouveauClub.poste} onChange={e => setNouveauClub({ ...nouveauClub, poste: e.target.value })} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    <option>Gardien</option>
                    <option>Defenseur</option>
                    <option>Milieu</option>
                    <option>Attaquant</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Niveau championnat</label>
                  <select value={nouveauClub.niveau_championnat} onChange={e => setNouveauClub({ ...nouveauClub, niveau_championnat: e.target.value })} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {['Ligue 1','Ligue 2','National 1','National 2','National 3','R1','R2','R3','D1','D2','Futsal'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Matchs joués</label>
                  <input type="number" min="0" value={nouveauClub.matchs_joues} onChange={e => setNouveauClub({ ...nouveauClub, matchs_joues: e.target.value })} placeholder="0" style={inputStyle} />
                </div>
                {nouveauClub.poste === 'Gardien' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Clean sheets</label>
                    <input type="number" min="0" value={nouveauClub.cleansheets} onChange={e => setNouveauClub({ ...nouveauClub, cleansheets: e.target.value })} placeholder="0" style={inputStyle} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle}>Buts</label>
                      <input type="number" min="0" value={nouveauClub.buts} onChange={e => setNouveauClub({ ...nouveauClub, buts: e.target.value })} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Passes décisives</label>
                      <input type="number" min="0" value={nouveauClub.passes_decisives} onChange={e => setNouveauClub({ ...nouveauClub, passes_decisives: e.target.value })} placeholder="0" style={inputStyle} />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="dj-btn-green" onClick={ajouterClub} disabled={savingParcours || !nouveauClub.club.trim()}
                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s', opacity: (savingParcours || !nouveauClub.club.trim()) ? 0.5 : 1 }}>
                  {savingParcours ? (editingParcoursId ? 'Modification...' : 'Ajout...') : (editingParcoursId ? '✓ Enregistrer la modification' : 'Ajouter ce club')}
                </button>
                {editingParcoursId && (
                  <button onClick={() => { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }}
                    style={{ background: 'transparent', border: '1px solid #333', color: '#555', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Annuler
                  </button>
                )}
              </div>
            </div>

            <button className="dj-btn-green" onClick={handleSaveStats} disabled={savingStats}
              style={{ width: '100%', background: statsSaved ? '#22c55e' : '#4ade80', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s', letterSpacing: '-0.2px' }}>
              {savingStats ? 'Sauvegarde...' : statsSaved ? 'Profil sauvegardé' : 'Sauvegarder le profil'}
            </button>
          </div>
        )}

        {/* ── ANALYSES ── */}
        {onglet === 'analyses' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>Mes analyses</h1>
              {(profil?.analyses_restantes || 0) > 0 && (
                <button onClick={() => navigate('/upload')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Nouvelle analyse
                </button>
              )}
            </div>
            {demandes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ color: '#222', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconSearch /></div>
                <p style={{ color: '#444', fontSize: '14px' }}>Aucune analyse pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demandes.map(demande => (
                  <div key={demande.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>{demande.titre}</h3>
                      <span style={{ background: demande.statut === 'analyse' ? '#4ade8012' : '#f59e0b12', color: demande.statut === 'analyse' ? '#4ade80' : '#f59e0b', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                        {demande.statut === 'analyse' ? 'Reçue' : 'En attente'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#444', marginBottom: '12px' }}>{demande.poste} · {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {demande.loom_url && (
                        <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#4ade80', color: '#000', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                          Voir l'analyse
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {onglet === 'messages' && (profil?.plan === 'starter' || profil?.plan === 'fan') && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '72px 32px', textAlign: 'center' }}>
              <div style={{ color: '#222', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><IconLock /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Messages recruteurs — Plan Pro</h2>
              <p style={{ fontSize: '13px', color: '#555', maxWidth: '340px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                Passe au Plan Pro pour recevoir des messages de recruteurs et clubs, et apparaître dans le Scout Center.
              </p>
              <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '13px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Plan Pro — 79,99€/mois
              </button>
            </div>
          </div>
        )}

        {onglet === 'messages' && profil?.plan !== 'starter' && profil?.plan !== 'fan' && (
          <div style={{ padding: isMobile ? '12px' : '24px', height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '16px', padding: '0 8px' }}>Recruteurs</h1>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', gap: '14px', minHeight: 0 }}>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414' }}>
                  <p style={{ fontWeight: 700, color: '#4ade80', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Conversations</p>
                </div>
                {conversations.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>Aucun message.</p>
                    <p style={{ fontSize: '11px', color: '#333', lineHeight: 1.5 }}>Les recruteurs peuvent te contacter depuis le Scout Center.</p>
                  </div>
                ) : conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #141414', cursor: 'pointer', background: messageActif?.otherId === conv.otherId ? '#4ade8008' : 'transparent', borderLeft: messageActif?.otherId === conv.otherId ? '2px solid #4ade80' : '2px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <Avatar person={conv.other} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                        <p style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>Recruteur</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '11px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {messageActif ? (
                  <>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar person={messageActif.other} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '1px' }}>{messageActif.other?.prenom} {messageActif.other?.nom}</p>
                        <p style={{ fontSize: '11px', color: '#4ade80' }}>Recruteur</p>
                      </div>
                      <button onClick={async () => {
                        const { data } = await supabase.from('profiles').select('*').eq('id', messageActif.otherId).single()
                        if (data) setRecruteurModal(data)
                      }} style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        👤 Voir le profil
                      </button>
                    </div>
                    <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {messages.filter(m => m.sender_id === messageActif.otherId || m.receiver_id === messageActif.otherId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                        <div key={i} style={msgBubble(m.sender_id === userId)}>
                          <p style={{ margin: 0 }}>{m.content}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.5 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px 16px', borderTop: '1px solid #141414', display: 'flex', gap: '10px' }}>
                      <input style={{ flex: 1, background: '#141414', border: '1px solid #222', borderRadius: '10px', color: '#fff', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} placeholder="Répondre..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && envoyerMessage()} />
                      <button onClick={envoyerMessage} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Envoyer</button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: '#2a2a2a' }}>
                    <IconMessage />
                    <p style={{ fontSize: '13px', color: '#333' }}>Sélectionnez une conversation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── COACH ── */}
        {onglet === 'carte' && (
          <div style={{ maxWidth: '520px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                Ma Carte FIFA
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  background: profil?.plan === 'pro' ? '#f0c03020' : '#c8c8c820',
                  color: profil?.plan === 'pro' ? '#f0c030' : '#c8c8c8',
                  border: `1px solid ${profil?.plan === 'pro' ? '#f0c03040' : '#c8c8c840'}`,
                  verticalAlign: 'middle',
                }}>
                  {profil?.plan === 'pro' ? '⭐ PRO' : 'STARTER'}
                </span>
              </h2>
              <p style={{ fontSize: '13px', color: '#555' }}>
                Personnalise ta carte et utilise-la comme photo de profil.
              </p>
            </div>

            {(!profil?.plan || profil.plan === 'fan') ? (
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
                <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>Fonctionnalité Starter / Pro</p>
                <p style={{ fontSize: '13px', color: '#555' }}>Abonne-toi pour générer ta carte FIFA personnalisée.</p>
              </div>
            ) : (
              <>
                {profil?.carte_fifa_url && (
                  <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img src={profil.carte_fifa_url} alt="Ma carte FIFA" style={{ width: '72px', height: '100px', objectFit: 'contain', borderRadius: '6px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', marginBottom: '4px' }}>✓ Carte sauvegardée</p>
                      <p style={{ fontSize: '12px', color: '#555' }}>Visible dans ton profil recruteur.</p>
                    </div>
                  </div>
                )}
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
                  <FifaCardGenerator
                    plan={profil.plan === 'pro' ? 'pro' : 'starter'}
                    profil={profil}
                    onSave={handleFifaCardSave}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {onglet === 'certif' && (
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                Badge Certifié
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#f0c03020', color: '#f0c030', border: '1px solid #f0c03040', verticalAlign: 'middle' }}>⭐ Officiel</span>
              </h2>
              <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.6 }}>
                Envoie 5 feuilles de match minimum pour valider ton niveau. Notre équipe vérifie les documents et active ton badge certifié sous 48h. Le badge doit être renouvelé chaque saison.
              </p>
            </div>

            {/* Certifications existantes */}
            {certifications.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Mes demandes</p>
                {certifications.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{c.niveau} — {c.saison}</p>
                      <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>{c.documents?.length || 0} feuille{(c.documents?.length || 0) > 1 ? 's' : ''} envoyée{(c.documents?.length || 0) > 1 ? 's' : ''}</p>
                      {c.commentaire_admin && <p style={{ fontSize: '12px', color: '#f97316', margin: '4px 0 0' }}>💬 {c.commentaire_admin}</p>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                      background: c.statut === 'validé' ? '#4ade8020' : c.statut === 'rejeté' ? '#ef444420' : '#f0c03020',
                      color: c.statut === 'validé' ? '#4ade80' : c.statut === 'rejeté' ? '#ef4444' : '#f0c030',
                      border: `1px solid ${c.statut === 'validé' ? '#4ade8040' : c.statut === 'rejeté' ? '#ef444440' : '#f0c03040'}`,
                    }}>
                      {c.statut === 'validé' ? '✓ Validé' : c.statut === 'rejeté' ? '✕ Rejeté' : '⏳ En attente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Nouvelle demande */}
            {certifSent ? (
              <div style={{ background: '#111', border: '1px solid #4ade8030', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
                <p style={{ fontWeight: 800, fontSize: '16px', color: '#4ade80', marginBottom: '6px' }}>Demande envoyée !</p>
                <p style={{ fontSize: '13px', color: '#555' }}>Notre équipe vérifie tes documents sous 48h.</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Nouvelle demande</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Niveau à certifier</label>
                    <select value={nouvelleCertif.niveau} onChange={e => setNouvelleCertif({ ...nouvelleCertif, niveau: e.target.value })} style={inputStyle}>
                      <option value="">— Choisir —</option>
                      {['Ligue 1', 'Ligue 2', 'National 1', 'National 2', 'National 3', 'R1', 'R2', 'R3', 'D1', 'D2', 'Futsal'].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Saison</label>
                    <select value={nouvelleCertif.saison} onChange={e => setNouvelleCertif({ ...nouvelleCertif, saison: e.target.value })} style={inputStyle}>
                      <option value="">— Choisir —</option>
                      {['2024/2025', '2025/2026', '2026/2027'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Feuilles de match ({certifDocs.length}/5 minimum)</label>
                  <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>PDF ou image (JPG, PNG). Au moins 5 feuilles requises.</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#141414', border: '1px dashed #333', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: '#aaa' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                    {uploadingCertif ? 'Upload en cours...' : 'Sélectionner des fichiers'}
                    <input type="file" accept="image/*,.pdf" multiple onChange={handleCertifDocUpload} style={{ display: 'none' }} disabled={uploadingCertif} />
                  </label>
                  {certifDocs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {certifDocs.map((url, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#4ade8015', border: '1px solid #4ade8030', borderRadius: '8px', padding: '4px 10px' }}>
                          <span style={{ fontSize: '11px', color: '#4ade80' }}>✓ Feuille {i + 1}</span>
                          <button onClick={() => setCertifDocs(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: '#4ade8080', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={soumettreDemandesCertification}
                  disabled={submittingCertif || !nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5}
                  style={{ width: '100%', background: '#f0c030', color: '#1a0800', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (submittingCertif || !nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                  {submittingCertif ? 'Envoi...' : `⭐ Soumettre la demande (${certifDocs.length}/5 feuilles)`}
                </button>
              </div>
            )}
          </div>
        )}

        {onglet === 'coach' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>Analyse Vidéo</h2>
              <p style={{ fontSize: '13px', color: '#555' }}>Envoie ta vidéo et reçois une analyse détaillée de notre coach analyseur.</p>
            </div>
            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
                  <p style={{ fontWeight: 700, color: '#f97316', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Historique</p>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '380px', overflowY: 'auto' }}>
                  {(() => {
                    const coachIds = coaches.map(c => c.id)
                    return messages.filter(m => coachIds.includes(m.sender_id) || coachIds.includes(m.receiver_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                      <div key={i} style={msgBubble(m.sender_id === userId)}>
                        <p style={{ margin: 0 }}>{m.content}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.5 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {m.sender_id === userId ? 'Toi' : 'Coach Analyseur'}</p>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            {coaches.length === 0 ? (
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center', color: '#2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><IconMic /></div>
                <p style={{ fontSize: '13px', color: '#444' }}>Aucun coach disponible pour le moment.</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
                {coaches.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Coach</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {coaches.map(c => (
                        <button key={c.id} onClick={() => setCoachSelectionne(c)}
                          style={{ background: coachSelectionne?.id === c.id ? '#f97316' : 'transparent', color: coachSelectionne?.id === c.id ? '#000' : '#555', border: `1px solid ${coachSelectionne?.id === c.id ? '#f97316' : '#2a2a2a'}`, padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: coachSelectionne?.id === c.id ? 700 : 400, fontFamily: 'Inter, sans-serif' }}>
                          {c.prenom} {c.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>
                  {convCoach.length > 0 ? 'Nouveau message' : `Écrire à ${coachSelectionne?.prenom || 'votre coach analyseur'}`}
                </label>
                {coachSent ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#f97316' }}>
                    <p style={{ fontSize: '28px', marginBottom: '8px' }}>✓</p>
                    <p style={{ fontWeight: 700, fontSize: '14px' }}>Message envoyé au coach</p>
                  </div>
                ) : (
                  <>
                    <textarea value={messageCoach} onChange={e => setMessageCoach(e.target.value)}
                      placeholder={`Bonjour ${coachSelectionne?.prenom || ''}, j'aurais une question sur...`}
                      style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', color: '#fff', padding: '14px', fontSize: '13px', resize: 'vertical', minHeight: '140px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                    <button onClick={envoyerMessageCoach} disabled={sendingCoach || !messageCoach.trim()}
                      style={{ marginTop: '12px', width: '100%', background: '#f97316', color: '#000', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (sendingCoach || !messageCoach.trim()) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                      {sendingCoach ? 'Envoi...' : 'Envoyer au coach analyseur'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* ── EXPLORER ── */}
        {onglet === 'clubs' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>🌐 Explorer</h1>
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>Découvre les clubs, éducateurs et recruteurs. Note ceux avec qui tu as travaillé.</p>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { id: 'tous', label: `Tous (${clubsListe.length + recruteursList.length})` },
                { id: 'clubs', label: `🏟️ Clubs / Éducateurs (${clubsListe.length})` },
                { id: 'recruteurs', label: `🔍 Recruteurs (${recruteursList.length})` },
              ].map(f => (
                <button key={f.id} onClick={() => setExplorerFiltre(f.id)}
                  style={{ padding: '7px 16px', borderRadius: '20px', border: `1px solid ${explorerFiltre === f.id ? '#4ade80' : '#2a2a2a'}`, background: explorerFiltre === f.id ? '#4ade8015' : 'transparent', color: explorerFiltre === f.id ? '#4ade80' : '#555', fontSize: '12px', fontWeight: explorerFiltre === f.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {clubsLoading && <p style={{ color: '#444', textAlign: 'center' }}>Chargement...</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Clubs / Éducateurs */}
              {(explorerFiltre === 'tous' || explorerFiltre === 'clubs') && clubsListe.map(edu => (
                <div key={`edu-${edu.id}`}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onClick={() => navigate(`/clubs/${edu.id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#4ade8040'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                  {edu.avatar_url
                    ? <img src={edu.avatar_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8030', flexShrink: 0 }} />
                    : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0d1a0d', border: '2px solid #4ade8020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
                        {(edu.club || edu.prenom || '?')[0].toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{edu.club || `${edu.prenom} ${edu.nom}`}</p>
                      <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8030' }}>🏟️ Club</span>
                      <BadgeNote cibleId={edu.id} />
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#555' }}>
                      {[edu.niveau_equipe, edu.region].filter(Boolean).join(' · ')}
                    </p>
                    {edu.description && <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edu.description}</p>}
                  </div>
                  <span style={{ color: '#4ade80', fontSize: '16px', flexShrink: 0 }}>→</span>
                </div>
              ))}

              {/* Recruteurs */}
              {(explorerFiltre === 'tous' || explorerFiltre === 'recruteurs') && recruteursList.map(rec => (
                <div key={`rec-${rec.id}`}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onClick={() => setRecruteurModal(rec)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa40'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                  {rec.avatar_url
                    ? <img src={rec.avatar_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #60a5fa30', flexShrink: 0 }} />
                    : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0d0d1a', border: '2px solid #60a5fa20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#60a5fa', flexShrink: 0 }}>
                        {(rec.prenom || '?')[0]}{(rec.nom || '')[0]}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{rec.prenom} {rec.nom}</p>
                      <span style={{ background: '#60a5fa15', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: '1px solid #60a5fa30' }}>🔍 Recruteur</span>
                      <BadgeNote cibleId={rec.id} />
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#555' }}>
                      {[rec.type_recruteur, rec.club, rec.region].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span style={{ color: '#60a5fa', fontSize: '16px', flexShrink: 0 }}>⭐</span>
                </div>
              ))}

              {!clubsLoading && (explorerFiltre === 'tous' ? clubsListe.length + recruteursList.length : explorerFiltre === 'clubs' ? clubsListe.length : recruteursList.length) === 0 && (
                <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                  <p style={{ fontSize: '14px', color: '#444' }}>Aucun profil trouvé.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Modal profil recruteur */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: '20px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {recruteurModal.avatar_url
                  ? <img src={recruteurModal.avatar_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
                  : <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>
                      {(recruteurModal.prenom || '?')[0]}{(recruteurModal.nom || '?')[0]}
                    </div>
                }
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {recruteurModal.type_recruteur && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>{recruteurModal.type_recruteur}</span>}
                    <BadgeNote cibleId={recruteurModal.id} />
                  </div>
                </div>
              </div>
              <button onClick={() => setRecruteurModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {recruteurModal.club && <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: '#555' }}>🏟️ Club / Agence</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.club}</p></div>}
              {recruteurModal.region && <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: '#555' }}>📍 Région</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.region}</p></div>}
            </div>

            {recruteurModal.description && (
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Présentation</p>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, margin: 0 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>🔍 Ce qu'il recherche</p>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, margin: 0 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            {!recruteurModal.description && !recruteurModal.recherche_profil && (
              <p style={{ fontSize: '13px', color: '#444', textAlign: 'center', padding: '1rem 0' }}>Ce recruteur n'a pas encore complété son profil.</p>
            )}

            <button
              onClick={() => { setNotationCible(recruteurModal); setRecruteurModal(null) }}
              style={{ width: '100%', marginTop: '1rem', background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              ⭐ {(() => {
                const t = (recruteurModal?.type_recruteur || '').toLowerCase()
                if (t.includes('club') || t.includes('directeur')) return 'Noter ce club'
                if (t.includes('éducateur') || t.includes('educateur') || t.includes('coach') || t.includes('entraîneur')) return 'Noter cet éducateur'
                if (t.includes('agent')) return 'Noter cet agent'
                return 'Noter ce recruteur'
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Modal notation */}
      {notationCible && (
        <ModalNotation
          auteurId={userId}
          cible={notationCible}
          onClose={() => setNotationCible(null)}
          onDone={() => setNotationCible(null)}
        />
      )}
    </div>
  )
}

export default DashboardJoueur
