import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ScoutCenter from '../components/ScoutCenter'
import { CRITERES_EDU } from './DashboardEducateur'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { CATEGORIES as CATEGORIES_STANDARD } from '../lib/categories'
import GestionSponsors from '../components/sponsors/GestionSponsors'
const EQUIPES = ['A', 'B']

const STAT_CARD_COLORS = { green: '#4ade80', orange: '#f59e0b', red: '#ef4444' }
function StatCard({ label, valeur, couleur }) {
  const color = STAT_CARD_COLORS[couleur] || '#fff'
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color }}>{valeur}</p>
    </div>
  )
}

export default function DashboardClub() {
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('categories')
  const [activeCategorie, setActiveCategorie] = useState('sportif')
  const [saisonActuelle] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    return now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}` // saison sportive : 1er juillet → 30 juin
  })

  // Catégories & équipes
  const [categories, setCategories] = useState([])
  const [showAddCategorie, setShowAddCategorie] = useState(false)
  const [newCategorie, setNewCategorie] = useState({ nom: 'U13', equipe: 'A', educateur_id: '' })
  const [savingCategorie, setSavingCategorie] = useState(false)

  // Éducateurs affiliés
  const [educateursAffilies, setEducateursAffilies] = useState([])
  const [searchEducateur, setSearchEducateur] = useState('')
  const [resultatsEducateurs, setResultatsEducateurs] = useState([])
  const [invitingId, setInvitingId] = useState(null)
  const [codeClub, setCodeClub] = useState('')

  // Profil club
  const [profilClubEdit, setProfilClubEdit] = useState({ club: '', region: '', description: '' })
  const [savingProfilClub, setSavingProfilClub] = useState(false)
  const [avatarClubUploading, setAvatarClubUploading] = useState(false)
  const [avisRecus, setAvisRecus] = useState([])

  // Notation générale éducateur
  const [eduNoteModal, setEduNoteModal] = useState(null) // affiliation en cours de notation
  const [eduNoteCriteres, setEduNoteCriteres] = useState({})
  const [eduNoteCommentaire, setEduNoteCommentaire] = useState('')
  const [eduNoteSaison, setEduNoteSaison] = useState('2025-2026')
  const [savingEduNote, setSavingEduNote] = useState(false)

  // Séances reçues
  const [seancesRecues, setSeancesRecues] = useState([])
  const [seanceEvalModal, setSeanceEvalModal] = useState(null) // séance en cours d'évaluation

  // Classements
  const [statsParCategorie, setStatsParCategorie] = useState({})
  const [loadingClassements, setLoadingClassements] = useState(false)
  const [categorieActive, setCategorieActive] = useState(null)
  const [triClassement, setTriClassement] = useState('buts')
  const [effectifModal, setEffectifModal] = useState(null) // categorieId en cours d'affichage
  const [effectifVue, setEffectifVue] = useState('poste') // 'poste' | 'liste'
  const [joueurDetail, setJoueurDetail] = useState(null) // id du joueur affiché en fiche individuelle
  const [clubMatchs, setClubMatchs] = useState({}) // { categorieId: [matchs] }
  const [loadingMatchs, setLoadingMatchs] = useState(false)
  const [ligueUrls, setLigueUrls] = useState({}) // { categorieId: url }

  const chargerLigueUrl = async (categorieId) => {
    const cat = categories.find(c => c.id === categorieId)
    if (!cat || !cat.educateur_id || ligueUrls[categorieId] !== undefined) return
    const { data } = await supabase.from('profil_educateur').select('ligue_url').eq('user_id', cat.educateur_id).maybeSingle()
    setLigueUrls(prev => ({ ...prev, [categorieId]: data?.ligue_url || null }))
  }

  const st = {
    page: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    navbar: { background: '#111', borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px' },
    content: { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' },
    tab: (active) => ({ padding: '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
    label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  }

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (activeTab === 'classements' && Object.keys(statsParCategorie).length === 0) {
      chargerClassements()
    }
  }, [activeTab, categories])

  useEffect(() => {
    if (activeTab === 'classements' && categorieActive) {
      chargerMatchsCategorie(categorieActive)
      chargerLigueUrl(categorieActive)
    }
  }, [activeTab, categorieActive])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.plan !== 'club') { navigate('/'); return }
    setClubId(user.id)
    setClub(profile)
    setProfilClubEdit({ club: profile.club || '', region: profile.region || '', description: profile.description || '' })

    // Génère un code club s'il n'existe pas encore
    if (!profile.code_club) {
      const code = generateCode()
      await supabase.from('profiles').update({ code_club: code }).eq('id', user.id)
      setCodeClub(code)
    } else {
      setCodeClub(profile.code_club)
    }

    await Promise.all([chargerCategories(user.id), chargerEducateurs(user.id), chargerAvisClub(user.id), chargerSeancesRecues(user.id)])
    setLoading(false)
  }

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const chargerCategories = async (uid) => {
    const { data } = await supabase
      .from('club_categories')
      .select('*, educateur:educateur_id(prenom, nom)')
      .eq('club_id', uid)
      .order('nom')
    setCategories(data || [])
  }

  const chargerAvisClub = async (uid) => {
    const { data } = await supabase
      .from('avis')
      .select('*, auteur:auteur_id(prenom, nom, plan)')
      .eq('cible_id', uid)
      .order('created_at', { ascending: false })
    setAvisRecus(data || [])
  }

  const chargerEducateurs = async (uid) => {
    const { data } = await supabase
      .from('club_educateurs')
      .select('*, educateur:educateur_id(prenom, nom, email, avatar_url)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setEducateursAffilies(data || [])
  }

  const chargerSeancesRecues = async (uid) => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, educateur:educateur_id(prenom, nom), evaluation:evaluations_seance(*)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setSeancesRecues(data || [])
  }

  const chargerClassements = async () => {
    if (categories.length === 0) return
    setLoadingClassements(true)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setLoadingClassements(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, prenom, nom, poste, educateur_id, club_categorie_id, numero_maillot')
      .in('educateur_id', educateurIds)

    if (!joueurs || joueurs.length === 0) { setStatsParCategorie({}); setLoadingClassements(false); return }

    const joueurIds = joueurs.map(j => j.id)

    const [{ data: statsMatch }, { data: presences }, { data: notes }] = await Promise.all([
      supabase.from('stats_match').select('joueur_id, buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge, matchs_equipe(score_nous, score_eux)').in('joueur_id', joueurIds),
      supabase.from('presences_entrainement').select('joueur_id, statut, point_seance, entrainements(date)').in('joueur_id', joueurIds),
      supabase.from('notes_joueurs').select('joueur_id, technique, physique, mental, tactique').in('joueur_id', joueurIds),
    ])

    const buildStats = (joueurId) => {
      const sm = (statsMatch || []).filter(s => s.joueur_id === joueurId)
      const pr = (presences || []).filter(p => p.joueur_id === joueurId)
      const note = (notes || []).find(n => n.joueur_id === joueurId)
      const totalPresences = pr.filter(p => p.statut && p.statut !== 'non_saisi').length
      const presents = pr.filter(p => p.statut === 'present' || p.statut === 'convoque').length
      const points = pr.filter(p => p.point_seance).length
      const noteGlobale = note ? ((note.technique + note.physique + note.mental + note.tactique) / 4) : null

      // Matchs réellement joués (minutes > 0) — le résultat V/N/D vient du match lié, pas d'une
      // colonne stats_match.victoire (existe en base mais jamais renseignée par l'app).
      const smJoues = sm.filter(r => (r.minutes || 0) > 0)
      const victoires = smJoues.filter(r => {
        const me = r.matchs_equipe
        return me && me.score_nous !== '' && me.score_nous !== null && parseInt(me.score_nous) > parseInt(me.score_eux)
      }).length

      // Présence par mois (pour les barres horizontales de la fiche individuelle)
      const moisMap = {}
      pr.forEach(p => {
        const date = p.entrainements?.date
        if (!date) return
        const key = date.slice(0, 7)
        if (!moisMap[key]) moisMap[key] = { present: 0, total: 0, points: 0 }
        if (p.statut && p.statut !== 'non_saisi') {
          moisMap[key].total++
          if (p.statut === 'present' || p.statut === 'convoque') moisMap[key].present++
        }
        if (p.point_seance) moisMap[key].points++
      })
      const presenceMensuelle = Object.entries(moisMap).sort(([a], [b]) => a.localeCompare(b))
        .map(([month, s]) => ({ month, taux: s.total ? Math.round((s.present / s.total) * 100) : 0, present: s.present, total: s.total, points: s.points }))

      return {
        buts: sm.reduce((s, r) => s + (r.buts || 0), 0),
        passes: sm.reduce((s, r) => s + (r.passes_dec || 0), 0),
        matchsJoues: smJoues.length,
        cleanSheets: sm.filter(r => r.clean_sheet).length,
        cartonsJaunes: sm.filter(r => r.carton_jaune).length,
        cartonsRouges: sm.filter(r => r.carton_rouge).length,
        tauxVictoire: smJoues.length ? Math.round((victoires / smJoues.length) * 100) : null,
        tauxPresence: totalPresences ? Math.round((presents / totalPresences) * 100) : null,
        // Compteurs bruts (présent stricto sensu, sans convoqué) pour le taux de présence
        // effectif agrégé au niveau équipe, dans l'onglet Classements.
        presenceEffectifTotal: totalPresences,
        presenceEffectifPresents: pr.filter(p => p.statut === 'present').length,
        pointsSeance: points,
        noteGlobale,
        presenceMensuelle,
      }
    }

    const grouped = {}
    categories.forEach(cat => {
      const joueursCat = joueurs.filter(j => j.club_categorie_id === cat.id)
      grouped[cat.id] = { categorie: cat, joueurs: joueursCat.map(j => ({ ...j, stats: buildStats(j.id) })) }
    })

    setStatsParCategorie(grouped)
    if (!categorieActive && categories.length > 0) setCategorieActive(categories[0].id)
    setLoadingClassements(false)
  }

  const GROUPES_POSTE = [
    { label: '🧤 Gardiens', color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
    { label: '🛡️ Défenseurs', color: '#60a5fa', match: p => p && ['défenseur', 'defenseur', 'latéral', 'lateral'].some(k => p.toLowerCase().includes(k)) },
    { label: '⚙️ Milieux', color: '#a78bfa', match: p => p?.toLowerCase().includes('milieu') },
    { label: '⚡ Attaquants', color: '#4ade80', match: p => p && ['attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
    { label: '❓ Autres', color: '#555', match: p => !p || !['gardien', 'défenseur', 'defenseur', 'latéral', 'lateral', 'milieu', 'attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
  ]

  const chargerMatchsCategorie = async (categorieId) => {
    const cat = categories.find(c => c.id === categorieId)
    if (!cat || !cat.educateur_id || clubMatchs[categorieId]) return
    setLoadingMatchs(true)
    const { data } = await supabase
      .from('matchs_equipe')
      .select('*')
      .eq('educateur_id', cat.educateur_id)
      .order('date', { ascending: false })
    setClubMatchs(prev => ({ ...prev, [categorieId]: data || [] }))
    setLoadingMatchs(false)
  }

  const [autoAssignLoading, setAutoAssignLoading] = useState(false)
  const [autoAssignResult, setAutoAssignResult] = useState(null)

  const autoAssignerJoueurs = async () => {
    setAutoAssignLoading(true)
    setAutoAssignResult(null)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setAutoAssignLoading(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, categorie, club_categorie_id')
      .in('educateur_id', educateurIds)
      .is('club_categorie_id', null)

    if (!joueurs || joueurs.length === 0) {
      setAutoAssignResult({ count: 0 })
      setAutoAssignLoading(false)
      return
    }

    let count = 0
    for (const j of joueurs) {
      if (!j.categorie) continue
      const match = categories.find(c => c.nom.toLowerCase() === j.categorie.toLowerCase().trim() && c.equipe === 'A')
      if (match) {
        await supabase.from('equipe_joueurs').update({ club_categorie_id: match.id }).eq('id', j.id)
        count++
      }
    }
    setAutoAssignResult({ count })
    setAutoAssignLoading(false)
    setStatsParCategorie({}) // force le rechargement des classements
  }

  // ── Gestion catégories ──
  const ajouterCategorie = async () => {
    if (!newCategorie.nom) return
    setSavingCategorie(true)
    await supabase.from('club_categories').insert({
      club_id: clubId,
      nom: newCategorie.nom,
      equipe: newCategorie.equipe,
      educateur_id: newCategorie.educateur_id || null,
    })
    await chargerCategories(clubId)
    setNewCategorie({ nom: 'U13', equipe: 'A', educateur_id: '' })
    setShowAddCategorie(false)
    setSavingCategorie(false)
  }

  const supprimerCategorie = async (id) => {
    if (!confirm('Supprimer cette catégorie/équipe ?')) return
    await supabase.from('club_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // ── Gestion éducateurs (méthode 1 : recherche + invitation) ──
  const rechercherEducateurs = async (query) => {
    setSearchEducateur(query)
    if (query.length < 2) { setResultatsEducateurs([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, avatar_url')
      .eq('plan', 'educateur')
      .or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,club.ilike.%${query}%`)
      .limit(8)
    setResultatsEducateurs(data || [])
  }

  const inviterEducateur = async (educateurId) => {
    setInvitingId(educateurId)
    const existing = educateursAffilies.find(e => e.educateur_id === educateurId)
    if (existing) { setInvitingId(null); return }
    await supabase.from('club_educateurs').insert({
      club_id: clubId, educateur_id: educateurId, statut: 'en_attente', methode: 'invite',
    })
    await chargerEducateurs(clubId)
    setSearchEducateur('')
    setResultatsEducateurs([])
    setInvitingId(null)
  }

  const retirerEducateur = async (id) => {
    if (!confirm('Retirer cet éducateur du club ?')) return
    await supabase.from('club_educateurs').delete().eq('id', id)
    setEducateursAffilies(prev => prev.filter(e => e.id !== id))
  }

  const accepterEducateur = async (id) => {
    const affiliation = educateursAffilies.find(e => e.id === id)
    await supabase.from('club_educateurs').update({ statut: 'accepte' }).eq('id', id)
    await chargerEducateurs(clubId)

    if (!affiliation?.educateur_id) return

    // Récupère tous les joueurs de cet éducateur
    const { data: joueursEducateur } = await supabase
      .from('equipe_joueurs')
      .select('id, categorie, club_categorie_id')
      .eq('educateur_id', affiliation.educateur_id)

    if (!joueursEducateur || joueursEducateur.length === 0) return

    // Recharge les catégories actuelles du club (au cas où elles auraient changé)
    const { data: categoriesActuelles } = await supabase
      .from('club_categories')
      .select('*')
      .eq('club_id', clubId)

    let categoriesMap = categoriesActuelles || []

    // Catégories texte distinctes utilisées par les joueurs de l'éducateur (non vides)
    const categoriesTexte = [...new Set(joueursEducateur.map(j => j.categorie).filter(Boolean).map(c => c.trim()))]

    // Pour chaque catégorie texte, vérifie si elle existe côté club (équipe A) — sinon la crée
    for (const catTexte of categoriesTexte) {
      const existe = categoriesMap.find(c => c.nom.toLowerCase() === catTexte.toLowerCase() && c.equipe === 'A')
      if (!existe) {
        const { data: nouvelleCat } = await supabase.from('club_categories').insert({
          club_id: clubId,
          nom: catTexte,
          equipe: 'A',
          educateur_id: affiliation.educateur_id,
        }).select().single()
        if (nouvelleCat) categoriesMap = [...categoriesMap, nouvelleCat]
      }
    }

    // Assigne chaque joueur non encore assigné à sa catégorie correspondante
    for (const j of joueursEducateur) {
      if (j.club_categorie_id || !j.categorie) continue
      const match = categoriesMap.find(c => c.nom.toLowerCase() === j.categorie.trim().toLowerCase() && c.equipe === 'A')
      if (match) {
        await supabase.from('equipe_joueurs').update({ club_categorie_id: match.id }).eq('id', j.id)
      }
    }

    await chargerCategories(clubId)
  }

  const copierCode = () => {
    navigator.clipboard.writeText(codeClub)
  }

  const sauvegarderProfilClub = async () => {
    setSavingProfilClub(true)
    await supabase.from('profiles').update({
      club: profilClubEdit.club,
      region: profilClubEdit.region,
      description: profilClubEdit.description,
    }).eq('id', clubId)
    setClub(prev => ({ ...prev, ...profilClubEdit }))
    setSavingProfilClub(false)
  }

  const handleAvatarClubUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setAvatarClubUploading(true)
    const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId }) })
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
      await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', clubId)
      setClub(prev => ({ ...prev, avatar_url: uploadData.secure_url }))
    }
    setAvatarClubUploading(false)
  }

  const ouvrirNotationEducateur = (affiliation) => {
    setEduNoteModal(affiliation)
    setEduNoteCriteres({})
    setEduNoteCommentaire('')
  }

  const soumettreNotationEducateur = async () => {
    if (!eduNoteModal) return
    const allKeys = CRITERES_EDU.flatMap(c => c.criteres.map(cr => cr.key))
    const allFilled = allKeys.every(k => eduNoteCriteres[k])
    if (!allFilled) return
    setSavingEduNote(true)
    const moyGlobale = allKeys.reduce((s, k) => s + (eduNoteCriteres[k] || 0), 0) / allKeys.length
    await supabase.from('notes_educateur').upsert({
      educateur_id: eduNoteModal.educateur_id,
      auteur_id: clubId,
      auteur_type: 'club',
      saison: eduNoteSaison,
      note: Math.round(moyGlobale * 10) / 10,
      criteres: eduNoteCriteres,
      commentaire: eduNoteCommentaire,
      visible_public: true,
    }, { onConflict: 'educateur_id,auteur_id,saison' })
    setSavingEduNote(false)
    setEduNoteModal(null)
  }

  const notifierCoachs = async (payload) => {
    const { data: coachs } = await supabase.from('profiles').select('email').eq('plan', 'coach')
    const coachEmails = coachs?.map(c => c.email).filter(Boolean) || []
    if (coachEmails.length === 0) return
    await fetch('/api/send-coach-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachEmails, ...payload }),
    })
  }

  const transfererAuCoach = async (seanceId) => {
    const seance = seancesRecues.find(s => s.id === seanceId)
    await supabase.from('seances_uploadees').update({ statut: 'transfere_coach' }).eq('id', seanceId)
    await chargerSeancesRecues(clubId)
    await notifierCoachs({ type: 'seance', clubNom: club?.club, theme: seance?.theme })
  }

  const ouvrirGrilleEvaluation = (seance) => {
    setSeanceEvalModal(seance)
  }

  const soumettreGrilleEvaluation = async (payload) => {
    if (!seanceEvalModal) return
    await supabase.from('evaluations_seance').upsert({
      seance_id: seanceEvalModal.id,
      evaluateur_id: clubId,
      evaluateur_type: payload.evaluateurType || 'club',
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
    }, { onConflict: 'seance_id' })
    await supabase.from('seances_uploadees').update({ statut: 'analyse' }).eq('id', seanceEvalModal.id)
    await chargerSeancesRecues(clubId)
    setSeanceEvalModal(null)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>

  const educateursAcceptes = educateursAffilies.filter(e => e.statut === 'accepte')
  const educateursEnAttente = educateursAffilies.filter(e => e.statut === 'en_attente')

  return (
    <div style={st.page}>
      <nav style={st.navbar}>
        <span style={st.logo}>⬡ DIGITAL FOOTBALL — Club</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>{club?.club || club?.prenom}</span>
          <button style={st.btnSecondary} onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      <div style={st.content}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>{club?.club || 'Mon club'}</h1>
          <p style={{ margin: 0, color: '#555', fontSize: '13px' }}>{categories.length} catégorie{categories.length !== 1 ? 's' : ''} · {educateursAcceptes.length} éducateur{educateursAcceptes.length !== 1 ? 's' : ''} affilié{educateursAcceptes.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Niveau 1 — SPORTIF / ADMINISTRATIF */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { id: 'sportif', label: '⚽ SPORTIF', defaultTab: 'categories' },
            { id: 'administratif', label: '🏢 ADMINISTRATIF', defaultTab: 'sponsors' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategorie(cat.id); setActiveTab(cat.defaultTab) }}
              style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: activeCategorie === cat.id ? '#4ade80' : '#1a1a1a',
                color: activeCategorie === cat.id ? '#000' : '#666',
                fontWeight: 800, fontSize: '13px', cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Niveau 2 — sous-onglets */}
        <div style={st.tabs}>
          {(activeCategorie === 'sportif' ? [
            { id: 'categories', label: '📋 Catégories & Équipes' },
            { id: 'classements', label: '🏆 Classements' },
            { id: 'recrutement', label: '🔍 Recrutement' },
            { id: 'educateurs', label: `👥 Éducateurs${educateursEnAttente.length ? ` (${educateursEnAttente.length})` : ''}` },
          ] : [
            { id: 'sponsors', label: '🤝 Sponsors' },
            { id: 'profil', label: '⭐ Profil club' },
          ]).map(t => (
            <button key={t.id} style={st.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CATÉGORIES ── */}
        {activeTab === 'categories' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem' }}>
              <button style={st.btnSecondary} onClick={autoAssignerJoueurs} disabled={autoAssignLoading}>
                {autoAssignLoading ? '⏳ Assignation...' : '⚡ Auto-assigner les joueurs (équipe A)'}
              </button>
              <button style={st.btnSolid} onClick={() => setShowAddCategorie(true)}>+ Ajouter une catégorie</button>
            </div>

            {autoAssignResult && (
              <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', color: '#4ade80', fontSize: '13px' }}>
                ✅ {autoAssignResult.count} joueur{autoAssignResult.count !== 1 ? 's' : ''} assigné{autoAssignResult.count !== 1 ? 's' : ''} automatiquement (équipe A par défaut — ajuste manuellement si besoin pour l'équipe B)
              </div>
            )}

            {showAddCategorie && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={st.label}>Catégorie</label>
                    <select style={st.input} value={newCategorie.nom} onChange={e => setNewCategorie(p => ({ ...p, nom: e.target.value }))}>
                      {CATEGORIES_STANDARD.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Équipe</label>
                    <select style={st.input} value={newCategorie.equipe} onChange={e => setNewCategorie(p => ({ ...p, equipe: e.target.value }))}>
                      {EQUIPES.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Éducateur responsable</label>
                    <select style={st.input} value={newCategorie.educateur_id} onChange={e => setNewCategorie(p => ({ ...p, educateur_id: e.target.value }))}>
                      <option value="">— Aucun pour l'instant —</option>
                      {educateursAcceptes.map(e => (
                        <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={st.btnSolid} onClick={ajouterCategorie} disabled={savingCategorie}>{savingCategorie ? 'Ajout...' : 'Ajouter'}</button>
                  <button style={st.btnSecondary} onClick={() => setShowAddCategorie(false)}>Annuler</button>
                </div>
              </div>
            )}

            {categories.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                Aucune catégorie créée. Commence par ajouter U13, U15... avec les équipes A/B.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {CATEGORIES_STANDARD.map(nom => {
                  const cats = categories.filter(c => c.nom === nom)
                  if (!cats.length) return null
                  return (
                    <div key={nom} style={st.card}>
                      <p style={{ margin: '0 0 10px', fontWeight: 800, color: '#4ade80', fontSize: '14px' }}>{nom}</p>
                      {cats.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Équipe {c.equipe}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
                              {c.educateur ? `${c.educateur.prenom} ${c.educateur.nom}` : 'Pas d\'éducateur assigné'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEffectifModal(c.id); chargerClassements() }} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>👥 Effectif</button>
                            <button onClick={() => supprimerCategorie(c.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── ÉDUCATEURS ── */}
        {activeTab === 'educateurs' && (
          <>
            {/* Code club */}
            <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔑 Ton code club</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Partage ce code à tes éducateurs — ils peuvent rejoindre depuis leur dashboard.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontWeight: 800, fontSize: '18px', padding: '8px 18px', borderRadius: '10px', letterSpacing: '3px', fontFamily: 'monospace' }}>{codeClub}</span>
                <button onClick={copierCode} style={st.btnSecondary}>📋 Copier</button>
              </div>
            </div>

            {/* Recherche & invitation */}
            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px' }}>🔍 Inviter un éducateur</p>
              <input
                style={st.input}
                placeholder="Rechercher par nom, prénom, club..."
                value={searchEducateur}
                onChange={e => rechercherEducateurs(e.target.value)}
              />
              {resultatsEducateurs.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultatsEducateurs.map(e => {
                    const dejaInvite = educateursAffilies.some(a => a.educateur_id === e.id)
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.prenom} {e.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{e.club || e.email}</p>
                        </div>
                        <button
                          onClick={() => inviterEducateur(e.id)}
                          disabled={dejaInvite || invitingId === e.id}
                          style={{ ...st.btnSolid, opacity: dejaInvite ? 0.4 : 1, fontSize: '12px', padding: '6px 14px' }}>
                          {dejaInvite ? 'Déjà invité' : invitingId === e.id ? '...' : 'Inviter'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* En attente */}
            {educateursEnAttente.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>⏳ En attente de validation ({educateursEnAttente.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {educateursEnAttente.map(e => (
                    <div key={e.id} style={{ ...st.card, borderColor: '#f59e0b30', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>Méthode : {e.methode === 'code' ? 'a rejoint via code' : 'invité par le club'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => accepterEducateur(e.id)} style={st.btnSolid}>✅ Accepter</button>
                        <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440' }}>Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliés */}
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>✅ Éducateurs affiliés ({educateursAcceptes.length})</p>
            {educateursAcceptes.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Aucun éducateur affilié pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {educateursAcceptes.map(e => (
                  <div key={e.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: '12px' }}>
                        {e.educateur?.prenom?.[0]}{e.educateur?.nom?.[0]}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => ouvrirNotationEducateur(e)} style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>⭐ Noter</button>
                      <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440' }}>Retirer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Séances reçues pour évaluation ── */}
            <div style={{ marginTop: '2rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#60a5fa' }}>🎥 Séances reçues ({seancesRecues.length})</p>
              {seancesRecues.length === 0 ? (
                <p style={{ color: '#444', fontSize: '13px' }}>Aucune séance uploadée par tes éducateurs pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {seancesRecues.map(s => {
                    const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                    return (
                      <div key={s.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || 'Séance'}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{s.saison}{s.date_seance ? ` · ${new Date(s.date_seance).toLocaleDateString('fr-FR')}` : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <a href={s.video_url} target="_blank" rel="noreferrer" style={{ ...st.btnSecondary, textDecoration: 'none' }}>🎬 Voir</a>
                          {s.statut === 'a_analyser' && (
                            <>
                              <button onClick={() => ouvrirGrilleEvaluation(s)} style={st.btnSolid}>📋 Analyser</button>
                              <button onClick={() => transfererAuCoach(s.id)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>🎙️ Transférer au coach</button>
                            </>
                          )}
                          {s.statut === 'transfere_coach' && <span style={{ background: '#60a5fa15', color: '#60a5fa', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>🎙️ Chez le coach</span>}
                          {s.statut === 'analyse' && eval_ && (
                            <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'classements' && (() => {
          const TRIS = [
            { key: 'buts', label: '⚽ Buteurs', color: '#4ade80' },
            { key: 'passes', label: '🎯 Passeurs', color: '#60a5fa' },
            { key: 'matchsJoues', label: '📅 Matchs joués', color: '#a78bfa' },
            { key: 'tauxPresence', label: '🏃 Présence', color: '#34d399', unit: '%' },
            { key: 'pointsSeance', label: '⭐ Points séance', color: '#fbbf24' },
            { key: 'noteGlobale', label: '📝 Note éducateur', color: '#f59e0b', unit: '/5' },
          ]
          const catData = categorieActive ? statsParCategorie[categorieActive] : null
          const triActif = TRIS.find(t => t.key === triClassement) || TRIS[0]
          const sorted = catData ? [...catData.joueurs].sort((a, b) => (b.stats[triClassement] || 0) - (a.stats[triClassement] || 0)) : []

          if (categories.length === 0) {
            return <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>Crée d'abord des catégories dans l'onglet précédent.</div>
          }
          if (loadingClassements) {
            return <p style={{ color: '#4ade80', textAlign: 'center', padding: '2rem' }}>Chargement des classements...</p>
          }

          return (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategorieActive(c.id)} style={st.tab(categorieActive === c.id)}>
                    {c.nom} — {c.equipe}
                  </button>
                ))}
              </div>

              {/* ── Résultats & classement officiel ── */}
              {(() => {
                const matchsCat = clubMatchs[categorieActive] || []
                const derniersMatchs = matchsCat.slice(0, 5)
                const matchsAvecScore = matchsCat.filter(m => m.score_nous !== '' && m.score_nous !== null && m.score_eux !== '' && m.score_eux !== null)
                const nbMatchsJoues = matchsAvecScore.length
                let victoires = 0, nuls = 0, defaites = 0, cleanSheets = 0
                matchsAvecScore.forEach(m => {
                  const nous = parseInt(m.score_nous) || 0
                  const eux = parseInt(m.score_eux) || 0
                  if (nous > eux) victoires++
                  else if (nous < eux) defaites++
                  else nuls++
                  if (eux === 0) cleanSheets++
                })
                const tauxV = nbMatchsJoues ? Math.round(victoires / nbMatchsJoues * 100) : 0
                const tauxN = nbMatchsJoues ? Math.round(nuls / nbMatchsJoues * 100) : 0
                const tauxD = nbMatchsJoues ? Math.round(defaites / nbMatchsJoues * 100) : 0
                const tauxCS = nbMatchsJoues ? Math.round(cleanSheets / nbMatchsJoues * 100) : 0

                const joueursCat = catData?.joueurs || []
                const totalPresencesEffectif = joueursCat.reduce((s, j) => s + j.stats.presenceEffectifTotal, 0)
                const presentsEffectif = joueursCat.reduce((s, j) => s + j.stats.presenceEffectifPresents, 0)
                const tauxPresenceEffectif = totalPresencesEffectif ? Math.round(presentsEffectif / totalPresencesEffectif * 100) : 0
                const tauxAbsenceEffectif = totalPresencesEffectif ? 100 - tauxPresenceEffectif : 0

                return (
                  <div style={{ marginBottom: '2rem' }}>
                    {nbMatchsJoues > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                          <StatCard label="Matchs joués" valeur={nbMatchsJoues} />
                          <StatCard label="Taux victoire" valeur={`${tauxV}%`} couleur="green" />
                          <StatCard label="Taux nul" valeur={`${tauxN}%`} couleur="orange" />
                          <StatCard label="Taux défaite" valeur={`${tauxD}%`} couleur="red" />
                        </div>
                        <StatCard label="Clean sheets" valeur={`${tauxCS}%`} />
                      </div>
                    )}
                    {totalPresencesEffectif > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                        <StatCard label="Taux présence effectif" valeur={`${tauxPresenceEffectif}%`} couleur="green" />
                        <StatCard label="Taux absence effectif" valeur={`${tauxAbsenceEffectif}%`} couleur="red" />
                      </div>
                    )}
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '10px' }}>🏆 Classement officiel</p>
                    {ligueUrls[categorieActive] ? (
                      <a href={ligueUrls[categorieActive]} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', marginBottom: '1.5rem' }}>
                        🏆 Voir le classement sur le site de la ligue ↗
                      </a>
                    ) : (
                      <p style={{ color: '#444', fontSize: '13px', marginBottom: '1.5rem' }}>L'éducateur n'a pas encore renseigné le lien du classement officiel (dans son propre dashboard, onglet Compétition).</p>
                    )}

                    {derniersMatchs.length > 0 && (
                      <>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '10px' }}>⚽ Derniers résultats</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                          {derniersMatchs.map(m => {
                            const aScore = m.score_nous !== '' && m.score_nous !== null
                            const nous = parseInt(m.score_nous)
                            const eux = parseInt(m.score_eux)
                            const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                            const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#ef4444' : '#f59e0b'
                            return (
                              <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{resultat}</span>}
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{m.competition ? ` · ${m.competition}` : ''}</p>
                                </div>
                                {aScore && <span style={{ fontWeight: 800, fontSize: '14px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {!catData || catData.joueurs.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                  Aucun joueur rattaché à cette catégorie pour l'instant.<br />
                  <span style={{ fontSize: '12px', color: '#444' }}>L'éducateur doit lier ses joueurs à cette catégorie club.</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {TRIS.map(t => (
                      <button key={t.key} onClick={() => setTriClassement(t.key)}
                        style={{ background: triClassement === t.key ? t.color + '20' : '#111', border: `1px solid ${triClassement === t.key ? t.color + '60' : '#222'}`, color: triClassement === t.key ? t.color : '#555', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: '#444', fontSize: '11px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>Joueur</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>Poste</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: triActif.color, fontSize: '11px' }}>{triActif.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((j, i) => {
                          const val = j.stats[triClassement]
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : '#444' }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: '#666' }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: triActif.color }}>
                                {val !== null && val !== undefined ? (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val) : '—'}{triActif.unit === '%' ? '%' : ''}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        })()}
        {activeTab === 'sponsors' && (
          <GestionSponsors clubId={clubId} saison={saisonActuelle} />
        )}
        {activeTab === 'recrutement' && (
          <ScoutCenter userId={clubId} profil={club} embedded={true} />
        )}
        {activeTab === 'profil' && (() => {
          const moyenne = avisRecus.length ? avisRecus.reduce((s, a) => s + (a.note || 0), 0) / avisRecus.length : null
          return (
            <div style={{ maxWidth: '700px' }}>
              {/* Avatar + infos */}
              <div style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {club?.avatar_url
                    ? <img src={club.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
                    : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#4ade80' }}>
                        {(profilClubEdit.club || club?.club || '?')[0]}
                      </div>
                  }
                  <label style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarClubUploading ? 'wait' : 'pointer', border: '2px solid #0a0a0a', fontSize: '11px' }}>
                    {avatarClubUploading ? '…' : '✎'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarClubUpload} disabled={avatarClubUploading} />
                  </label>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 4px' }}>{profilClubEdit.club || 'Nom du club'}</p>
                  {moyenne !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fbbf24', fontSize: '16px' }}>{'★'.repeat(Math.round(moyenne))}{'☆'.repeat(5 - Math.round(moyenne))}</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>{moyenne.toFixed(1)} ({avisRecus.length} avis)</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>Aucun avis reçu pour l'instant</p>
                  )}
                </div>
              </div>

              {/* Formulaire */}
              <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>📋 Informations du club</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={st.label}>Nom du club</label>
                    <input style={st.input} value={profilClubEdit.club} onChange={e => setProfilClubEdit(p => ({ ...p, club: e.target.value }))} placeholder="Ex: AS Cannes" />
                  </div>
                  <div>
                    <label style={st.label}>Région</label>
                    <input style={st.input} value={profilClubEdit.region} onChange={e => setProfilClubEdit(p => ({ ...p, region: e.target.value }))} placeholder="Ex: Provence-Alpes-Côte d'Azur" />
                  </div>
                  <div>
                    <label style={st.label}>Description</label>
                    <textarea
                      style={{ ...st.input, minHeight: '100px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                      value={profilClubEdit.description}
                      onChange={e => setProfilClubEdit(p => ({ ...p, description: e.target.value }))}
                      placeholder="Présente ton club, son histoire, ses valeurs..."
                    />
                  </div>
                </div>
                <button onClick={sauvegarderProfilClub} disabled={savingProfilClub} style={{ ...st.btnSolid, marginTop: '16px' }}>
                  {savingProfilClub ? 'Enregistrement...' : '✓ Sauvegarder'}
                </button>
              </div>

              {/* Avis reçus */}
              <div style={st.card}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ Avis reçus ({avisRecus.length})</p>
                {avisRecus.length === 0 ? (
                  <p style={{ color: '#444', fontSize: '13px' }}>Aucun avis pour l'instant. Les joueurs et éducateurs affiliés pourront noter le club.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {avisRecus.map(a => (
                      <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{a.auteur?.prenom} {a.auteur?.nom}</span>
                          <span style={{ color: '#fbbf24', fontSize: '13px' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                        </div>
                        {a.commentaire && <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>"{a.commentaire}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Modal notation éducateur */}
      {eduNoteModal && (
        <div onClick={() => setEduNoteModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>⭐ Évaluer {eduNoteModal.educateur?.prenom} {eduNoteModal.educateur?.nom}</p>
              </div>
              <button onClick={() => setEduNoteModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#555' }}>Saison évaluée :</label>
              <select value={eduNoteSaison} onChange={e => setEduNoteSaison(e.target.value)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}>
                {['2025-2026', '2024-2025', '2023-2024'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {CRITERES_EDU.map(cat => (
                <div key={cat.key} style={{ background: '#111', borderRadius: '12px', padding: '14px', border: `1px solid ${cat.color}20` }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cat.criteres.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{c.label}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setEduNoteCriteres(prev => ({ ...prev, [c.key]: n }))}
                              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: (eduNoteCriteres[c.key] || 0) >= n ? cat.color : '#2a2a2a', padding: '2px', lineHeight: 1 }}>★</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <textarea value={eduNoteCommentaire} onChange={e => setEduNoteCommentaire(e.target.value)}
              placeholder="Commentaire (optionnel)..."
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', marginBottom: '16px' }} />

            <button onClick={soumettreNotationEducateur} disabled={savingEduNote || CRITERES_EDU.flatMap(c => c.criteres).some(c => !eduNoteCriteres[c.key])}
              style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', opacity: CRITERES_EDU.flatMap(c => c.criteres).every(c => eduNoteCriteres[c.key]) ? 1 : 0.4 }}>
              {savingEduNote ? '⏳ Envoi...' : '✅ Soumettre l\'évaluation'}
            </button>
          </div>
        </div>
      )}

      {/* Modal grille évaluation séance */}
      {seanceEvalModal && (
        <ModalGrilleSeance
          seance={seanceEvalModal}
          onClose={() => setSeanceEvalModal(null)}
          onSubmit={soumettreGrilleEvaluation}
          evaluateurType="club"
        />
      )}

      {/* Modal effectif par poste */}
      {effectifModal && (() => {
        const catData = statsParCategorie[effectifModal]
        const cat = categories.find(c => c.id === effectifModal)
        return (
          <div onClick={() => { setEffectifModal(null); setJoueurDetail(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '900px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>👥 Effectif — {cat?.nom} {cat?.equipe}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
                    {[['poste', '⊞ Postes'], ['liste', '☰ Liste']].map(([v, label]) => (
                      <button key={v} onClick={() => setEffectifVue(v)}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: effectifVue === v ? '#4ade80' : 'transparent', color: effectifVue === v ? '#000' : '#555', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setEffectifModal(null); setJoueurDetail(null) }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              {!catData ? (
                <p style={{ color: '#4ade80', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
              ) : catData.joueurs.length === 0 ? (
                <p style={{ color: '#444', textAlign: 'center', padding: '2rem' }}>Aucun joueur dans cette catégorie.</p>
              ) : effectifVue === 'liste' ? (() => {
                const getGroupeIndex = (poste) => {
                  const idx = GROUPES_POSTE.findIndex(g => g.match(poste))
                  return idx === -1 ? GROUPES_POSTE.length : idx
                }
                const joueursTries = [...catData.joueurs].sort((a, b) => getGroupeIndex(a.poste) - getGroupeIndex(b.poste))

                return (
                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['#', 'Joueur', 'Poste', 'Buts', 'Passes', 'Matchs', 'Présence', 'Note'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Joueur' || h === 'Poste' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueursTries.map(j => {
                          const groupe = GROUPES_POSTE.find(g => g.match(j.poste)) || GROUPES_POSTE[GROUPES_POSTE.length - 1]
                          return (
                            <tr key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ borderBottom: '1px solid #141414', cursor: 'pointer' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#555', fontWeight: 700 }}>{j.numero_maillot || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px' }}><span style={{ color: groupe.color, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>{j.stats.buts}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#60a5fa', fontWeight: 700 }}>{j.stats.passes}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#a78bfa', fontWeight: 700 }}>{j.stats.matchsJoues}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.tauxPresence !== null ? <span style={{ color: j.stats.tauxPresence >= 80 ? '#4ade80' : '#f59e0b', fontSize: '12px' }}>{j.stats.tauxPresence}%</span> : <span style={{ color: '#333' }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.noteGlobale !== null ? <span style={{ color: '#f59e0b', fontSize: '12px' }}>{j.stats.noteGlobale.toFixed(1)}/5</span> : <span style={{ color: '#333' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })() : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {GROUPES_POSTE.map(groupe => {
                    const joueursGroupe = catData.joueurs.filter(j => groupe.match(j.poste))
                    if (joueursGroupe.length === 0) return null
                    return (
                      <div key={groupe.label}>
                        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: groupe.color }}>{groupe.label} ({joueursGroupe.length})</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                          {joueursGroupe.map(j => (
                            <div key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ background: '#111', border: `1px solid ${groupe.color}20`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                                  {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{j.poste || '—'}</p>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {[
                                  { label: 'Buts', val: j.stats.buts, color: '#4ade80' },
                                  { label: 'Passes', val: j.stats.passes, color: '#60a5fa' },
                                  { label: 'Matchs', val: j.stats.matchsJoues, color: '#a78bfa' },
                                ].map(s => (
                                  <div key={s.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: s.color }}>{s.val}</p>
                                    <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>{s.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {j.stats.tauxPresence !== null && (
                                  <span style={{ fontSize: '11px', color: j.stats.tauxPresence >= 80 ? '#4ade80' : '#f59e0b' }}>🏃 {j.stats.tauxPresence}%</span>
                                )}
                                {j.stats.pointsSeance > 0 && <span style={{ fontSize: '11px', color: '#fbbf24' }}>⭐ {j.stats.pointsSeance}</span>}
                                {j.stats.noteGlobale !== null && <span style={{ fontSize: '11px', color: '#f59e0b' }}>📝 {j.stats.noteGlobale.toFixed(1)}/5</span>}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setJoueurDetail(j.id)
                                }}
                                style={{
                                  marginTop: '8px',
                                  background: '#166534',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  width: '100%',
                                }}
                              >
                                📊 Data
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal fiche individuelle joueur */}
      {joueurDetail && effectifModal && (() => {
        const catData = statsParCategorie[effectifModal]
        const j = catData?.joueurs.find(x => x.id === joueurDetail)
        if (!j) return null
        const s = j.stats

        const moisSet = new Set()
        catData.joueurs.forEach(jj => jj.stats.presenceMensuelle.forEach(m => moisSet.add(m.month)))
        const positionParMois = [...moisSet].sort().map(month => {
          const classement = catData.joueurs
            .map(jj => ({ id: jj.id, points: jj.stats.presenceMensuelle.find(m => m.month === month)?.points || 0 }))
            .sort((a, b) => b.points - a.points)
          const label = new Date(month + '-02').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
          return {
            month, label,
            rank: classement.findIndex(c => c.id === j.id) + 1,
            total: classement.length,
            points: classement.find(c => c.id === j.id)?.points || 0,
          }
        })

        return (
          <div onClick={() => setJoueurDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>{j.prenom} {j.nom}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>{j.poste || '—'}{j.numero_maillot ? ` · #${j.numero_maillot}` : ''}</p>
                </div>
                <button onClick={() => setJoueurDetail(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
                <StatCard label="⚽ Buts" valeur={s.buts} />
                <StatCard label="🎯 Passes déc." valeur={s.passes} />
                <StatCard label="🏃 Matchs joués" valeur={s.matchsJoues} />
                <StatCard label="✅ % Victoires" valeur={s.tauxVictoire !== null ? `${s.tauxVictoire}%` : '—'} />
                <StatCard label="🧤 Clean sheets" valeur={s.cleanSheets} />
                <StatCard label="🟨 Cartons J." valeur={s.cartonsJaunes} />
                <StatCard label="🟥 Cartons R." valeur={s.cartonsRouges} />
                <StatCard label="📋 Présence globale" valeur={s.tauxPresence !== null ? `${s.tauxPresence}%` : '—'} />
              </div>

              {/* Présence par mois */}
              {s.presenceMensuelle.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#a78bfa' }}>📅 Présence par mois</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                      const label = new Date(month + '-02').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                      const color = taux >= 80 ? '#4ade80' : taux >= 60 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#555', width: '44px', flexShrink: 0 }}>{label}</span>
                          <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px' }}>
                            <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color, width: '36px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                          <span style={{ fontSize: '10px', color: '#444', flexShrink: 0 }}>{present}/{total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Position points séance par mois */}
              {positionParMois.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#fbbf24' }}>⭐ Position points séance par mois</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {positionParMois.map(({ month, label, rank, total, points }) => (
                      <div key={month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', borderRadius: '8px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: '#555' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: rank === 1 ? '#fbbf24' : '#888' }}>#{rank}/{total} {rank === 1 ? '🏆' : ''}</span>
                        <span style={{ fontSize: '11px', color: '#fbbf24' }}>{points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
