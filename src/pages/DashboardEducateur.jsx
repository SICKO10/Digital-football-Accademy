import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ── Grille d'évaluation éducateur ────────────────────────────────────────────
export const CRITERES_EDU = [
  { key: 'leadership', label: '👥 Leadership & Management', color: '#f59e0b', criteres: [
    { key: 'gestion_groupe', label: 'Gestion du groupe' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'cohesion', label: 'Création de cohésion' },
    { key: 'gestion_conflits', label: 'Gestion des conflits' },
  ]},
  { key: 'pedagogie', label: '🎓 Pédagogie', color: '#a78bfa', criteres: [
    { key: 'qualite_explications', label: 'Qualité des explications' },
    { key: 'capacite_corriger', label: 'Capacité à corriger' },
    { key: 'individualisation', label: 'Individualisation' },
    { key: 'adaptation_age', label: 'Adaptation à l\'âge' },
  ]},
  { key: 'football', label: '⚽ Compétences football', color: '#4ade80', criteres: [
    { key: 'animation_seances', label: 'Animation des séances' },
    { key: 'competence_tactique', label: 'Compétence tactique' },
    { key: 'coaching_match', label: 'Coaching en match' },
    { key: 'planification', label: 'Planification' },
  ]},
  { key: 'developpement', label: '📈 Développement joueurs', color: '#34d399', criteres: [
    { key: 'progression_technique', label: 'Progression technique' },
    { key: 'progression_tactique', label: 'Progression tactique' },
    { key: 'progression_physique', label: 'Progression physique' },
    { key: 'progression_mentale', label: 'Progression mentale' },
  ]},
  { key: 'professionnalisme', label: '🤝 Professionnalisme', color: '#60a5fa', criteres: [
    { key: 'ponctualite', label: 'Ponctualité' },
    { key: 'organisation', label: 'Organisation' },
    { key: 'communication_club', label: 'Communication avec le club' },
    { key: 'investissement', label: 'Investissement' },
  ]},
  { key: 'performance', label: '🏅 Performance', color: '#f87171', criteres: [
    { key: 'resultats', label: 'Résultats' },
    { key: 'respect_projet_jeu', label: 'Respect du projet de jeu' },
    { key: 'valorisation_joueurs', label: 'Valorisation des joueurs' },
    { key: 'objectifs_atteints', label: 'Objectifs atteints' },
  ]},
]

// ── Charge SheetJS depuis CDN (xlsx) ─────────────────────────────────────────
function loadSheetJS() {
  return new Promise((resolve) => {
    if (window.XLSX) { resolve(window.XLSX); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => resolve(window.XLSX)
    document.head.appendChild(s)
  })
}

// ── Normalise les en-têtes Excel vers nos champs ──────────────────────────────
const HEADER_MAP = {
  prenom: 'prenom', prénom: 'prenom', firstname: 'prenom', 'first name': 'prenom',
  nom: 'nom', lastname: 'nom', 'last name': 'nom',
  poste: 'poste', position: 'poste',
  categorie: 'categorie', catégorie: 'categorie', category: 'categorie',
  'numero maillot': 'numero_maillot', 'numéro maillot': 'numero_maillot', maillot: 'numero_maillot', numero: 'numero_maillot', '#': 'numero_maillot',
  'date naissance': 'date_naissance', 'date de naissance': 'date_naissance', ddn: 'date_naissance', birthdate: 'date_naissance',
  'numero licence': 'numero_licence', 'numéro licence': 'numero_licence', licence: 'numero_licence',
}

function parseRows(raw) {
  return raw
    .map(row => {
      const j = {}
      for (const [k, v] of Object.entries(row)) {
        const key = HEADER_MAP[k.toLowerCase().trim()]
        if (key && v !== undefined && v !== null && String(v).trim() !== '') {
          j[key] = String(v).trim()
        }
      }
      return j
    })
    .filter(j => j.prenom)
}

// ── Bar chart horizontal SVG ──────────────────────────────────────────────────
function BarChart({ data, color = '#4ade80', unit = '', max: forceMax }) {
  if (!data.length) return null
  const max = forceMax ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '110px', fontSize: '12px', color: '#aaa', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '4px', height: '22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${max > 0 ? (d.value / max) * 100 : 0}%`, background: color + '99', borderRadius: '4px', transition: 'width 0.4s ease', minWidth: d.value > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ width: '40px', fontSize: '12px', fontWeight: 700, color, textAlign: 'right', flexShrink: 0 }}>{d.value}{unit}</div>
        </div>
      ))}
    </div>
  )
}

// ── Radial progress skill (anneau rempli pour une compétence /5) ─────────────
function RadialSkill({ value, max = 5, color, label, size = 80 }) {
  const r = size * 0.36, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const fill = (value / max) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={size * 0.09} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.22} fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">{value || 0}</text>
        <text x={cx} y={cy + size * 0.2} textAnchor="middle"
          fontSize={size * 0.11} fill="#555" fontFamily="Inter,sans-serif">/{max}</text>
      </svg>
      <span style={{ fontSize: '11px', color: '#555', fontFamily: 'Inter,sans-serif', textAlign: 'center', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// ── Mini donut présence (anneau simple) ──────────────────────────────────────
function DonutPresence({ taux }) {
  const r = 16, circ = 2 * Math.PI * r
  const dash = (taux / 100) * circ
  const color = taux >= 80 ? '#4ade80' : taux >= 50 ? '#f59e0b' : '#f87171'
  return (
    <svg width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="none" stroke="#1a1a1a" strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 21 21)" />
      <text x="21" y="25" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="Inter,sans-serif">{taux}%</text>
    </svg>
  )
}

// ── Camembert multi-segment (présence / absence / blessure / maladie / convoc) ─
function DonutMulti({ presents, absents, blesses, malade, convoque, size = 72 }) {
  const total = (presents || 0) + (absents || 0) + (blesses || 0) + (malade || 0) + (convoque || 0)
  const taux = total ? Math.round(((presents || 0) + (convoque || 0)) / total * 100) : 0
  const color = taux >= 80 ? '#4ade80' : taux >= 50 ? '#f59e0b' : '#f87171'
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#333', fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>—</span>
    </div>
  )
  const p = (presents || 0) / total * 100
  const c = (convoque || 0) / total * 100
  const a = (absents || 0) / total * 100
  const b = (blesses || 0) / total * 100
  // m takes the rest
  const pEnd = p + c
  const aEnd = pEnd + a
  const bEnd = aEnd + b
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(#4ade80 0% ${p}%, #60a5fa ${p}% ${pEnd}%, #ef4444 ${pEnd}% ${aEnd}%, #f97316 ${aEnd}% ${bEnd}%, #a855f7 ${bEnd}% 100%)`
      }} />
      <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: size * 0.19, fontWeight: 800, color, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{taux}%</span>
      </div>
    </div>
  )
}

export default function DashboardEducateur() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [profil, setProfil] = useState(null)
  const [activeSection, setActiveSection] = useState('equipe')
  const [loading, setLoading] = useState(true)
  const [statsSubTab, setStatsSubTab] = useState('tableau')
  const [statsTri, setStatsTri] = useState('buts') // pour classement

  // Équipe
  const [joueurs, setJoueurs] = useState([])
  const [showAddJoueur, setShowAddJoueur] = useState(false)
  const [newJoueur, setNewJoueur] = useState({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
  const importRef = useRef(null)
  const [importPreview, setImportPreview] = useState(null) // { rows: [], importing: false, done: 0 }
  const [importError, setImportError] = useState('')
  const [savingJoueur, setSavingJoueur] = useState(false)
  const [joueurActif, setJoueurActif] = useState(null)
  const [vueEquipe, setVueEquipe] = useState('poste') // 'poste' | 'liste'
  const [joueurEnEdition, setJoueurEnEdition] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [joueurProfil, setJoueurProfil] = useState(null)
  const [joueurMoisDetail, setJoueurMoisDetail] = useState(null)

  // Compétition
  const [competitionSubTab, setCompetitionSubTab] = useState('resultats')
  const [ligueUrl, setLigueUrl] = useState('')
  const [ligueUrlSaved, setLigueUrlSaved] = useState(localStorage.getItem('ligueUrl') || '')
  // Calendrier scanner
  const [calendarImages, setCalendarImages] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState(null)
  const [calendarMatchs, setCalendarMatchs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('calendarMatchs') || '[]') } catch { return [] }
  })

  // Matchs
  const [matchs, setMatchs] = useState([])
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
  const [savingMatch, setSavingMatch] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerImageBase64, setScannerImageBase64] = useState(null)
  const [scannerImagePreview, setScannerImagePreview] = useState(null)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerResult, setScannerResult] = useState(null)
  const [scannerMatchData, setScannerMatchData] = useState({ date: '', adversaire: '', competition: '', score_nous: '', score_eux: '', domicile: true })
  const [scannerStats, setScannerStats] = useState({})
  const [scannerSaving, setScannerSaving] = useState(false)
  const [scannerError, setScannerError] = useState(null)
  const [matchActif, setMatchActif] = useState(null)
  const [statsMatch, setStatsMatch] = useState({})

  // Entraînements
  const [entrainements, setEntrainements] = useState([])
  const [showAddEntrainement, setShowAddEntrainement] = useState(false)
  const [newEntrainement, setNewEntrainement] = useState({ date: '', description: '' })
  const [presences, setPresences] = useState({})
  const [entrainementActif, setEntrainementActif] = useState(null)
  const [showPlanificateur, setShowPlanificateur] = useState(false)
  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  // Notes / Évaluations
  const [notes, setNotes] = useState({})
  const [localNotes, setLocalNotes] = useState({}) // édition en cours par joueur_id
  const [savingNote, setSavingNote] = useState(false)

  // Mon Profil éducateur
  const [profilEdu, setProfilEdu] = useState(null)
  const [profilEduEdit, setProfilEduEdit] = useState(null)
  const [parcoursEdu, setParcoursEdu] = useState([])
  const [savingProfil, setSavingProfil] = useState(false)
  const [uploadingDiplome, setUploadingDiplome] = useState(false)
  const [showAddParcours, setShowAddParcours] = useState(false)
  const [newParcours, setNewParcours] = useState({ type: 'coach', club: '', poste: '', saison_debut: '', saison_fin: '', niveau: '' })

  // Recrutement
  const [recrutJoueurs, setRecrutJoueurs] = useState([])
  const [recrutLoaded, setRecrutLoaded] = useState(false)
  const [recrutSearch, setRecrutSearch] = useState('')
  const [recrutPoste, setRecrutPoste] = useState('Tous')
  const [recrutCategorie, setRecrutCategorie] = useState('Toutes')
  const [recrutRegion, setRecrutRegion] = useState('Toutes')
  const [recrutSelectedJoueur, setRecrutSelectedJoueur] = useState(null)
  const [recrutParcours, setRecrutParcours] = useState([])
  const [recrutStyleDeJeu, setRecrutStyleDeJeu] = useState('Tous')

  const CARACTERISTIQUES_PAR_POSTE = {
    Gardien:   ['Détente', 'Relance longue', 'Relance courte', 'Placement', 'Jeu aérien', 'Un contre un', 'Communication', 'Leadership', 'Reflexes', 'Prise de balle', 'Agilité', 'Lecture du jeu'],
    Défenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1', 'Pressing', 'Marquage', 'Placement', 'Récupération de balle', 'Jeu propre', 'Combativité'],
    Milieu:    ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre', 'Passes courtes', 'Transition rapide', 'Jeu entre les lignes', 'Leadership'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin', 'Décalage', 'Combinaison', 'Mouvement sans ballon', 'Leadership offensif'],
  }

  useEffect(() => { init() }, [])
  useEffect(() => { if (activeSection === 'recrutement') chargerRecrutJoueurs() }, [activeSection])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.plan !== 'educateur') { navigate('/'); return }
    setUserId(user.id)
    setProfil(p)
    await Promise.all([chargerJoueurs(user.id), chargerMatchs(user.id), chargerEntrainements(user.id), chargerNotes(user.id), chargerProfilEdu(user.id), chargerClubAffiliation(user.id), chargerClubCategories(user.id), chargerMesSeances(user.id), chargerMesSeancesOuvertes(user.id)])
    setLoading(false)
  }

  const chargerClubAffiliation = async (uid) => {
    const { data } = await supabase
      .from('club_educateurs')
      .select('*, club:club_id(club, prenom, nom, avatar_url)')
      .eq('educateur_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setClubAffiliation(data || null)
  }

  const chargerMesSeances = async (uid) => {
    const { data } = await supabase.from('seances_uploadees').select('*').eq('educateur_id', uid).order('created_at', { ascending: false })
    setMesSeances(data || [])
  }

  const chargerMesSeancesOuvertes = async (uid) => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, evaluation:evaluations_seance(*)')
      .eq('educateur_id', uid)
      .eq('origine', 'ouvert')
      .order('date_seance', { ascending: false })
    setMesSeancesOuvertes(data || [])
  }

  const chargerClubCategories = async (uid) => {
    const { data: aff } = await supabase.from('club_educateurs').select('club_id').eq('educateur_id', uid).eq('statut', 'accepte').maybeSingle()
    if (!aff) { setClubCategories([]); return }
    const { data } = await supabase.from('club_categories').select('*').eq('club_id', aff.club_id).order('nom')
    setClubCategories(data || [])
  }

  const chargerJoueurs = async (uid) => {
    const { data } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', uid).order('nom')
    setJoueurs(data || [])
  }

  const chargerMatchs = async (uid) => {
    const { data } = await supabase.from('matchs_equipe').select('*, stats_match(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setMatchs(data || [])
  }

  const chargerEntrainements = async (uid) => {
    const { data } = await supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setEntrainements(data || [])
  }

  const chargerNotes = async (uid) => {
    const { data } = await supabase.from('notes_joueurs').select('*').eq('educateur_id', uid)
    if (data) {
      const map = {}
      const localMap = {}
      data.forEach(n => {
        map[n.joueur_id] = n
        localMap[n.joueur_id] = { technique: n.technique || 0, physique: n.physique || 0, mental: n.mental || 0, tactique: n.tactique || 0, commentaire: n.commentaire || '', visible_joueur: n.visible_joueur || false }
      })
      setNotes(map)
      setLocalNotes(localMap)
    }
  }

  const getLocalNote = (joueurId) => localNotes[joueurId] || { technique: 0, physique: 0, mental: 0, tactique: 0, commentaire: '', visible_joueur: false }

  const setLocalNote = (joueurId, update) => {
    setLocalNotes(prev => ({ ...prev, [joueurId]: { ...getLocalNote(joueurId), ...update } }))
  }

  const [notesEdu, setNotesEdu] = useState([])
  const [affiliations, setAffiliations] = useState([])

  const [clubAffiliation, setClubAffiliation] = useState(null) // liaison actuelle avec un club
  const [clubCategories, setClubCategories] = useState([])

  const [mesSeances, setMesSeances] = useState([])
  const [showUploadSeance, setShowUploadSeance] = useState(false)
  const [seanceSaison, setSeanceSaison] = useState('2025-2026')
  const [seanceTheme, setSeanceTheme] = useState('')
  const [seanceDate, setSeanceDate] = useState('')
  const [seanceVideoFile, setSeanceVideoFile] = useState(null)
  const [uploadingSeance, setUploadingSeance] = useState(false)
  const [seanceVideoMode, setSeanceVideoMode] = useState('upload') // 'upload' | 'veo'
  const [seanceVeoUrl, setSeanceVeoUrl] = useState('')
  const [codeClubInput, setCodeClubInput] = useState('')
  const [sendingCodeClub, setSendingCodeClub] = useState(false)
  const [codeClubError, setCodeClubError] = useState(null)
  const [codeClubSuccess, setCodeClubSuccess] = useState(false)

  // Onglet "Mes séances" (séances ouvertes, hors flux club)
  const [mesSeancesOuvertes, setMesSeancesOuvertes] = useState([])
  const [uploadSeanceOuverteForm, setUploadSeanceOuverteForm] = useState({ theme: '', date_seance: '', categorie_tactique: '', video_url: '' })
  const [uploadingSeanceOuverte, setUploadingSeanceOuverte] = useState(false)

  const chargerProfilEdu = async (uid) => {
    const { data: pe } = await supabase.from('profil_educateur').select('*').eq('user_id', uid).single()
    if (pe) { setProfilEdu(pe); setProfilEduEdit({ ...pe }) }
    else { setProfilEduEdit({ prenom: '', nom: '', diplome: '', categorie: '', club: '', niveau_championnat: '' }) }
    const { data: pa } = await supabase.from('parcours_educateur').select('*').eq('user_id', uid).order('ordre')
    setParcoursEdu(pa || [])
    const { data: ne } = await supabase.from('notes_educateur').select('*, profiles:auteur_id(prenom, nom, plan)').eq('educateur_id', uid)
    setNotesEdu(ne || [])
    const { data: af } = await supabase.from('affiliations').select('*, joueur:equipe_joueur_id(prenom, nom)').eq('educateur_id', uid).order('created_at', { ascending: false })
    setAffiliations(af || [])
  }

  const rejoindreClub = async () => {
    if (!codeClubInput.trim()) return
    setSendingCodeClub(true)
    setCodeClubError(null)
    setCodeClubSuccess(false)
    const { data: clubProfile } = await supabase
      .from('profiles')
      .select('id, club, prenom, nom')
      .ilike('code_club', codeClubInput.trim())
      .eq('plan', 'club')
      .single()
    if (!clubProfile) {
      setCodeClubError('Code invalide — vérifie auprès du club.')
      setSendingCodeClub(false)
      return
    }
    const { data: exist } = await supabase.from('club_educateurs').select('id, statut').eq('club_id', clubProfile.id).eq('educateur_id', userId).single()
    if (exist) {
      setCodeClubError(exist.statut === 'accepte' ? 'Tu es déjà affilié à ce club.' : 'Une demande est déjà en cours avec ce club.')
      setSendingCodeClub(false)
      return
    }
    await supabase.from('club_educateurs').insert({ club_id: clubProfile.id, educateur_id: userId, statut: 'en_attente', methode: 'code' })
    setCodeClubSuccess(true)
    setCodeClubInput('')
    await chargerClubAffiliation(userId)
    setSendingCodeClub(false)
  }

  const uploaderSeance = async () => {
    if (!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte') return
    if (seanceVideoMode === 'upload' && !seanceVideoFile) return
    if (seanceVideoMode === 'veo' && !seanceVeoUrl.trim()) return
    const dejaCetteSaison = mesSeances.filter(s => s.saison === seanceSaison).length
    if (dejaCetteSaison >= 2) { alert('Tu as déjà uploadé 2 séances pour cette saison.'); return }
    setUploadingSeance(true)
    try {
      let videoUrl = null
      if (seanceVideoMode === 'veo') {
        videoUrl = seanceVeoUrl.trim()
      } else {
        const sigRes = await fetch('/api/upload-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
        const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
        const formData = new FormData()
        formData.append('file', seanceVideoFile)
        formData.append('signature', signature)
        formData.append('timestamp', timestamp)
        formData.append('folder', folder)
        formData.append('public_id', public_id)
        formData.append('api_key', api_key)
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        videoUrl = uploadData.secure_url || null
      }
      if (videoUrl) {
        await supabase.from('seances_uploadees').insert({
          educateur_id: userId,
          club_id: clubAffiliation.club_id,
          saison: seanceSaison,
          theme: seanceTheme || null,
          date_seance: seanceDate || null,
          video_url: videoUrl,
        })
        await chargerMesSeances(userId)
        setShowUploadSeance(false)
        setSeanceTheme(''); setSeanceDate(''); setSeanceVideoFile(null); setSeanceVeoUrl(''); setSeanceVideoMode('upload')
      }
    } catch (e) { console.error(e) }
    setUploadingSeance(false)
  }

  const CATEGORIES_TACTIQUES = [
    { value: 'proteger_axe_but', label: 'Protéger l\'axe du but' },
    { value: 'reformuler_bloc_equipe', label: 'Reformuler le bloc équipe' },
    { value: 'conserver', label: 'Conserver' },
    { value: 'progresser', label: 'Progresser' },
    { value: 'desequilibrer', label: 'Déséquilibrer' },
    { value: 'finir', label: 'Finir' },
  ]

  const uploaderMaSeance = async () => {
    if (!uploadSeanceOuverteForm.theme || !uploadSeanceOuverteForm.date_seance || !uploadSeanceOuverteForm.categorie_tactique || !uploadSeanceOuverteForm.video_url) {
      return alert('Remplis tous les champs')
    }
    setUploadingSeanceOuverte(true)
    await supabase.from('seances_uploadees').insert({
      educateur_id: userId,
      theme: uploadSeanceOuverteForm.theme,
      date_seance: uploadSeanceOuverteForm.date_seance,
      categorie_tactique: uploadSeanceOuverteForm.categorie_tactique,
      video_url: uploadSeanceOuverteForm.video_url,
      origine: 'ouvert',
      statut: 'en_attente',
    })
    setUploadSeanceOuverteForm({ theme: '', date_seance: '', categorie_tactique: '', video_url: '' })
    setUploadingSeanceOuverte(false)
    await chargerMesSeancesOuvertes(userId)
  }

  const [affiliationEnCours, setAffiliationEnCours] = useState(null) // {id, profiles} — modal de liaison
  const [joueurLieId, setJoueurLieId] = useState('')

  const gererAffiliation = async (id, statut, equipeJoueurId = null) => {
    const update = { statut }
    if (equipeJoueurId) update.equipe_joueur_id = equipeJoueurId
    await supabase.from('affiliations').update(update).eq('id', id)
    setAffiliationEnCours(null)
    setJoueurLieId('')
    await chargerProfilEdu(userId)
  }

  const sauvegarderProfilEdu = async () => {
    if (!profilEduEdit) return
    setSavingProfil(true)
    const payload = { ...profilEduEdit, user_id: userId, updated_at: new Date().toISOString() }
    const { data } = await supabase.from('profil_educateur').upsert(payload, { onConflict: 'user_id' }).select().single()
    if (data) { setProfilEdu(data); setProfilEduEdit({ ...data }) }
    setSavingProfil(false)
  }

  const uploadDiplome = async (file) => {
    if (!file) return
    setUploadingDiplome(true)
    const ext = file.name.split('.').pop()
    const path = `diplomes/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const updated = { ...profilEduEdit, diplome_url: publicUrl, diplome_verifie: false }
      setProfilEduEdit(updated)
      await supabase.from('profil_educateur').upsert({ ...updated, user_id: userId }, { onConflict: 'user_id' })
      await chargerProfilEdu(userId)
    }
    setUploadingDiplome(false)
  }

  const ajouterParcours = async () => {
    if (!newParcours.club) return
    const ordre = parcoursEdu.length
    await supabase.from('parcours_educateur').insert({ ...newParcours, user_id: userId, ordre })
    await chargerProfilEdu(userId)
    setNewParcours({ type: 'coach', club: '', poste: '', saison_debut: '', saison_fin: '', niveau: '' })
    setShowAddParcours(false)
  }

  const supprimerParcours = async (id) => {
    await supabase.from('parcours_educateur').delete().eq('id', id)
    await chargerProfilEdu(userId)
  }

  const ajouterJoueur = async () => {
    if (!newJoueur.prenom || !newJoueur.nom) return
    setSavingJoueur(true)
    await supabase.from('equipe_joueurs').insert({ ...newJoueur, educateur_id: userId })
    await chargerJoueurs(userId)
    setNewJoueur({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
    setShowAddJoueur(false)
    setSavingJoueur(false)
  }

  const supprimerJoueur = async (id) => {
    if (!confirm('Supprimer ce joueur ?')) return
    await supabase.from('equipe_joueurs').delete().eq('id', id)
    setJoueurs(prev => prev.filter(j => j.id !== id))
    if (joueurActif?.id === id) setJoueurActif(null)
  }

  const sauvegarderJoueur = async () => {
    if (!joueurEnEdition) return
    setSavingEdit(true)
    const { id, ...fields } = joueurEnEdition
    await supabase.from('equipe_joueurs').update(fields).eq('id', id)
    await chargerJoueurs(userId)
    setJoueurEnEdition(null)
    setSavingEdit(false)
  }

  const assignerCategorieClub = async (joueurId, categorieId) => {
    await supabase.from('equipe_joueurs').update({ club_categorie_id: categorieId || null }).eq('id', joueurId)
    await chargerJoueurs(userId)
  }

  const telechargerTemplate = () => {
    const csv = 'Prenom,Nom,Poste,Categorie,Numero Maillot,Date Naissance,Numero Licence\nJean,Dupont,Attaquant,U17,9,2007-03-15,123456\nMarie,Martin,Gardien,U15,1,2009-06-20,'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'template_effectif.csv'
    a.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError('')
    try {
      const XLSX = await loadSheetJS()
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const rows = parseRows(raw)
      if (rows.length === 0) { setImportError('Aucun joueur trouvé. Vérifie que ton fichier a les colonnes Prenom et Nom.'); return }
      setImportPreview({ rows, importing: false, done: 0 })
    } catch (err) {
      setImportError('Erreur lecture fichier : ' + err.message)
    }
    e.target.value = ''
  }

  const confirmerImport = async () => {
    if (!importPreview) return
    setImportPreview(prev => ({ ...prev, importing: true, done: 0 }))
    let done = 0
    for (const row of importPreview.rows) {
      await supabase.from('equipe_joueurs').insert({ ...row, educateur_id: userId })
      done++
      setImportPreview(prev => ({ ...prev, done }))
    }
    await chargerJoueurs(userId)
    setImportPreview(null)
  }

  const ajouterMatch = async () => {
    if (!newMatch.adversaire || !newMatch.date) return
    setSavingMatch(true)
    await supabase.from('matchs_equipe').insert({ ...newMatch, educateur_id: userId, domicile: newMatch.domicile })
    await chargerMatchs(userId)
    setNewMatch({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
    setShowAddMatch(false)
    setSavingMatch(false)
  }

  const sauvegarderStatsMatch = async (matchId) => {
    const entries = Object.entries(statsMatch[matchId] || {})
    for (const [joueurId, s] of entries) {
      await supabase.from('stats_match').upsert({
        match_id: matchId, joueur_id: joueurId, educateur_id: userId,
        minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
        clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
      }, { onConflict: 'match_id,joueur_id' })
    }
    await chargerMatchs(userId)
    setMatchActif(null)
    setStatsMatch({})
  }

  const scannerCalendrier = async () => {
    if (!calendarImages.length) return
    setCalendarLoading(true)
    setCalendarError(null)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GEMINI_API_KEY manquante dans .env')
      const prompt = `Tu analyses une ou plusieurs photos d'un calendrier de football.
Extrait TOUS les matchs visibles sur les photos.
Réponds UNIQUEMENT avec du JSON valide, sans texte autour:
{
  "matchs": [
    {
      "journee": "J1" ou null,
      "date": "YYYY-MM-DD" ou null,
      "heure": "HH:MM" ou null,
      "equipe_domicile": "Nom complet de l'équipe",
      "equipe_exterieur": "Nom complet de l'équipe",
      "competition": "Nom de la compétition" ou null
    }
  ]
}`
      const parts = [
        { text: prompt },
        ...calendarImages.map(img => ({ inline_data: { mime_type: 'image/jpeg', data: img.base64 } }))
      ]
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }) }
      )
      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse invalide de l\'IA')
      const result = JSON.parse(jsonMatch[0])
      const newMatchs = (result.matchs || []).filter(m => m.equipe_domicile && m.equipe_exterieur)
      const merged = [
        ...calendarMatchs.filter(m => !newMatchs.find(nm => nm.date === m.date && nm.equipe_domicile === m.equipe_domicile && nm.equipe_exterieur === m.equipe_exterieur)),
        ...newMatchs
      ].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
      setCalendarMatchs(merged)
      localStorage.setItem('calendarMatchs', JSON.stringify(merged))
      setCalendarImages([])
    } catch (e) { setCalendarError(e.message) }
    finally { setCalendarLoading(false) }
  }

  const scannerMatch = async () => {
    if (!scannerImageBase64) return
    setScannerLoading(true)
    setScannerError(null)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GEMINI_API_KEY manquante dans .env')
      const prompt = `Tu es un assistant qui analyse des feuilles de match de football. Extrais toutes les informations de cette image.

Voici les joueurs de notre équipe (utilise leurs IDs exacts dans la réponse):
${joueurs.map(j => `- "${j.prenom} ${j.nom}" (joueur_id: "${j.id}")`).join('\n')}

Identifie quelle équipe sur la feuille correspond à "notre équipe" en faisant correspondre les noms.

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après:
{
  "equipe_nous": "nom de notre équipe",
  "equipe_adversaire": "nom adversaire",
  "score_nous": 0,
  "score_adversaire": 0,
  "date": "YYYY-MM-DD ou null",
  "competition": "nom ou null",
  "domicile": true,
  "joueurs_identifies": [
    {
      "joueur_id": "uuid exact de notre liste ci-dessus",
      "nom_sur_feuille": "comme sur la feuille",
      "titulaire": true,
      "buts": 0,
      "carton_jaune": false,
      "carton_rouge": false
    }
  ]
}`
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: scannerImageBase64 } }] }],
            generationConfig: { temperature: 0.1 }
          })
        }
      )
      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse invalide de l\'IA')
      const result = JSON.parse(jsonMatch[0])
      setScannerResult(result)
      setScannerMatchData({
        date: result.date || '',
        adversaire: result.equipe_adversaire || '',
        competition: result.competition || '',
        score_nous: result.score_nous !== undefined ? String(result.score_nous) : '',
        score_eux: result.score_adversaire !== undefined ? String(result.score_adversaire) : '',
        domicile: result.domicile !== false
      })
      const stats = {}
      ;(result.joueurs_identifies || []).forEach(j => {
        if (j.joueur_id && joueurs.find(jj => jj.id === j.joueur_id)) {
          stats[j.joueur_id] = {
            minutes: j.titulaire ? 90 : 20,
            buts: j.buts || 0,
            passes_dec: 0,
            clean_sheet: false,
            carton_jaune: j.carton_jaune || false,
            carton_rouge: j.carton_rouge || false
          }
        }
      })
      setScannerStats(stats)
    } catch (e) {
      setScannerError(e.message)
    } finally {
      setScannerLoading(false)
    }
  }

  const sauvegarderMatchScanne = async () => {
    if (!scannerMatchData.adversaire) return
    setScannerSaving(true)
    const { data: matchInserted } = await supabase.from('matchs_equipe').insert({
      ...scannerMatchData,
      educateur_id: userId,
      score_nous: parseInt(scannerMatchData.score_nous) || 0,
      score_eux: parseInt(scannerMatchData.score_eux) || 0,
    }).select().single()
    if (matchInserted) {
      for (const [joueurId, s] of Object.entries(scannerStats)) {
        await supabase.from('stats_match').upsert({
          match_id: matchInserted.id, joueur_id: joueurId, educateur_id: userId,
          minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
          clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
        }, { onConflict: 'match_id,joueur_id' })
      }
    }
    await chargerMatchs(userId)
    setShowScanner(false)
    setScannerResult(null)
    setScannerImageBase64(null)
    setScannerImagePreview(null)
    setScannerStats({})
    setScannerSaving(false)
  }

  const ajouterEntrainement = async () => {
    if (!newEntrainement.date) return
    await supabase.from('entrainements').insert({ ...newEntrainement, educateur_id: userId })
    await chargerEntrainements(userId)
    setNewEntrainement({ date: '', description: '' })
    setShowAddEntrainement(false)
  }

  const supprimerEntrainement = async (id) => {
    if (!confirm('Supprimer cette séance et toutes ses présences ?')) return
    await supabase.from('presences_entrainement').delete().eq('entrainement_id', id)
    await supabase.from('entrainements').delete().eq('id', id)
    setEntrainements(prev => prev.filter(e => e.id !== id))
  }

  const genererSaison = async () => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) return
    setGeneratingPlan(true)
    // Construire la liste de toutes les dates correspondantes
    const dates = []
    const cur = new Date(planSaison.dateDebut)
    const end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay())) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }
    // Ne créer que les dates qui n'existent pas déjà
    const existingDates = new Set(entrainements.map(e => e.date?.substring(0, 10)))
    const newDates = dates.filter(d => !existingDates.has(d))
    setPlanProgress({ done: 0, total: newDates.length })
    for (let i = 0; i < newDates.length; i++) {
      const { data } = await supabase.from('entrainements').insert({
        date: newDates[i],
        description: planSaison.theme || '',
        educateur_id: userId
      }).select().single()
      // Pas de lignes pré-créées : la présence est saisie au clic (evite les faux "absents")
      setPlanProgress({ done: i + 1, total: newDates.length })
    }
    await chargerEntrainements(userId)
    setGeneratingPlan(false)
    setShowPlanificateur(false)
    setPlanSaison({ joursActifs: [], dateDebut: '', dateFin: '', theme: '' })
  }

  const toggleJourPlan = (jour) => {
    setPlanSaison(prev => ({
      ...prev,
      joursActifs: prev.joursActifs.includes(jour)
        ? prev.joursActifs.filter(j => j !== jour)
        : [...prev.joursActifs, jour]
    }))
  }

  // Statuts disponibles (cycle au clic)
  const STATUTS = ['absent', 'present', 'blesse', 'malade', 'convoque']
  const STATUT_CONFIG = {
    present:  { label: 'Présent',   emoji: '✅', bg: '#4ade8015', border: '#4ade8040', color: '#4ade80' },
    absent:   { label: 'Absent',    emoji: '❌', bg: '#ef444415', border: '#ef444440', color: '#ef4444' },
    blesse:   { label: 'Blessé',    emoji: '🤕', bg: '#f9731615', border: '#f9731640', color: '#f97316' },
    malade:   { label: 'Malade',    emoji: '🤒', bg: '#a855f715', border: '#a855f740', color: '#a855f7' },
    convoque: { label: 'Convoqué',  emoji: '🏆', bg: '#60a5fa15', border: '#60a5fa40', color: '#60a5fa' },
  }

  const cyclerPresence = async (entrainementId, joueurId, statutActuel) => {
    if (statutActuel === 'convoque') {
      // Dernier statut → retour à "non saisi" : on supprime la ligne
      await supabase.from('presences_entrainement')
        .delete()
        .eq('entrainement_id', entrainementId)
        .eq('joueur_id', joueurId)
    } else {
      const idx = statutActuel === 'non_saisi' ? -1 : STATUTS.indexOf(statutActuel)
      const prochain = STATUTS[(idx + 1) % STATUTS.length]
      await supabase.from('presences_entrainement').upsert(
        { entrainement_id: entrainementId, joueur_id: joueurId, educateur_id: userId, statut: prochain, present: prochain === 'present' || prochain === 'convoque' },
        { onConflict: 'entrainement_id,joueur_id' }
      )
    }
    await chargerEntrainements(userId)
  }

  const togglePointSeance = async (entrainementId, joueurId, current) => {
    await supabase.from('presences_entrainement').upsert(
      { entrainement_id: entrainementId, joueur_id: joueurId, educateur_id: userId, point_seance: !current },
      { onConflict: 'entrainement_id,joueur_id' }
    )
    await chargerEntrainements(userId)
  }

  const sauvegarderNote = async (joueurId, noteData) => {
    setSavingNote(true)
    await supabase.from('notes_joueurs').upsert(
      { joueur_id: joueurId, educateur_id: userId, ...noteData },
      { onConflict: 'joueur_id,educateur_id' }
    )
    await chargerNotes(userId)
    setSavingNote(false)
  }

  // Classement calculé
  const classement = () => {
    const equipes = {}
    matchs.filter(m => m.score_nous !== '' && m.score_eux !== '').forEach(m => {
      const nous = parseInt(m.score_nous)
      const eux = parseInt(m.score_eux)
      const nomNous = profil?.club || 'Mon équipe'
      if (!equipes[nomNous]) equipes[nomNous] = { nom: nomNous, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: true }
      if (!equipes[m.adversaire]) equipes[m.adversaire] = { nom: m.adversaire, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: false }
      equipes[nomNous].j++; equipes[m.adversaire].j++
      equipes[nomNous].bp += nous; equipes[nomNous].bc += eux
      equipes[m.adversaire].bp += eux; equipes[m.adversaire].bc += nous
      if (nous > eux) { equipes[nomNous].v++; equipes[nomNous].pts += 3; equipes[m.adversaire].d++ }
      else if (nous < eux) { equipes[m.adversaire].v++; equipes[m.adversaire].pts += 3; equipes[nomNous].d++ }
      else { equipes[nomNous].n++; equipes[nomNous].pts++; equipes[m.adversaire].n++; equipes[m.adversaire].pts++ }
    })
    return Object.values(equipes).sort((a, b) => b.pts - a.pts || (b.bp - b.bc) - (a.bp - a.bc))
  }

  // Stats globales joueur
  const statsGlobalesJoueur = (joueurId) => {
    const allStats = matchs.flatMap(m => {
      const ps = (m.stats_match || []).filter(s => s.joueur_id === joueurId)
      return ps.map(s => ({ ...s, _match: m }))
    })
    const joues = allStats.filter(s => s.minutes > 0)
    return {
      matchs: joues.length,
      minutes: allStats.reduce((s, r) => s + (r.minutes || 0), 0),
      buts: allStats.reduce((s, r) => s + (r.buts || 0), 0),
      passes_dec: allStats.reduce((s, r) => s + (r.passes_dec || 0), 0),
      clean_sheets: allStats.filter(s => s.clean_sheet).length,
      cartons_j: allStats.filter(s => s.carton_jaune).length,
      cartons_r: allStats.filter(s => s.carton_rouge).length,
      victoires: joues.filter(s => {
        const m = s._match
        return m && parseInt(m.score_nous) > parseInt(m.score_eux)
      }).length,
    }
  }

  const tauxPresence = (joueurId) => {
    // Seulement les séances où la présence a été effectivement saisie
    // (row existe ET a un statut intentionnel, pas juste la valeur par défaut vide)
    const saisies = entrainements.filter(e =>
      (e.presences_entrainement || []).some(p => p.joueur_id === joueurId && (p.statut || p.present))
    )
    if (!saisies.length) return null
    const getStatut = (e) => {
      const p = (e.presences_entrainement || []).find(p => p.joueur_id === joueurId)
      return p?.statut || (p?.present ? 'present' : 'absent')
    }
    const presents  = saisies.filter(e => getStatut(e) === 'present').length
    const convoque  = saisies.filter(e => getStatut(e) === 'convoque').length
    const absents   = saisies.filter(e => getStatut(e) === 'absent').length
    const blesses   = saisies.filter(e => getStatut(e) === 'blesse').length
    const malade    = saisies.filter(e => getStatut(e) === 'malade').length
    const total     = saisies.length
    return { taux: Math.round(((presents + convoque) / total) * 100), presents, convoque, absents, blesses, malade, total }
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  const st = {
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
    btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  const tabs = [
    { key: 'equipe', label: '👥 Mon équipe' },
    { key: 'stats', label: '📊 Stats joueurs' },
    { key: 'matchs', label: '🏟️ Compétition' },
    { key: 'entrainements', label: '🏃 Entraînements' },
    { key: 'mes_seances', label: '🎥 Séances' },
    { key: 'notes', label: '📝 Évaluations' },
    { key: 'recrutement', label: '🔍 Recrutement' },
    { key: 'profil', label: '👤 Mon profil' },
  ]

  const chargerRecrutJoueurs = async () => {
    if (recrutLoaded) return
    const { data } = await supabase.from('profiles').select('id, prenom, nom, poste, categorie, region, club, niveau_equipe, pied, buts_total, passes_decisives, matchs_officiel, cleansheets, minutes_jouees, points_forts, a_ameliorer, avatar_url, clip_url, created_at').eq('plan', 'pro').eq('abonnement_actif', true)
    setRecrutJoueurs(data || [])
    setRecrutLoaded(true)
  }

  return (
    <>
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></span>
          <span style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>Éducateur</span>
          {profil?.club && <span style={{ fontSize: '13px', color: '#555' }}>· {profil.club}</span>}
        </div>
        <button onClick={() => { supabase.auth.signOut(); navigate('/') }}
          style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </nav>

      {/* TABS */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 2rem', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            style={{ background: 'transparent', border: 'none', borderBottom: activeSection === tab.key ? '2px solid #4ade80' : '2px solid transparent', color: activeSection === tab.key ? '#4ade80' : '#555', padding: '14px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>

        {/* ===== MON ÉQUIPE ===== */}
        {activeSection === 'equipe' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Mon équipe</h1>
                <p style={{ color: '#555', fontSize: '13px', margin: '4px 0 0' }}>{joueurs.length} joueur{joueurs.length > 1 ? 's' : ''} dans l'effectif</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Toggle vue */}
                <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                  {[['poste','⊞ Postes'],['liste','☰ Liste']].map(([v, label]) => (
                    <button key={v} onClick={() => setVueEquipe(v)}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: vueEquipe === v ? '#4ade80' : 'transparent', color: vueEquipe === v ? '#000' : '#555', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={telechargerTemplate} style={st.btn('#60a5fa')} title="Télécharger un modèle Excel/CSV">📥 Template</button>
                <button onClick={() => importRef.current?.click()} style={st.btn('#a78bfa')}>📂 Importer Excel/CSV</button>
                <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportFile} />
                <button onClick={() => setShowAddJoueur(true)} style={st.btnSolid}>+ Ajouter un joueur</button>
              </div>
            </div>

            {/* ── Modal profil joueur ── */}
            {joueurProfil && (() => {
              const j = joueurProfil
              const tx = tauxPresence(j.id)
              const s = statsGlobalesJoueur(j.id)
              const ln = getLocalNote(j.id)
              const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
              const noteGlobale = (ln.technique || ln.physique || ln.mental || ln.tactique)
                ? ((ln.technique + ln.physique + ln.mental + ln.tactique) / 4).toFixed(1) : null
              const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? '#60a5fa' : j.poste?.toLowerCase().includes('milieu') ? '#a78bfa' : '#4ade80'
              return (
                <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setJoueurProfil(null)}>
                  <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ background: `linear-gradient(135deg, ${posColor}15, transparent)`, borderBottom: '1px solid #1a1a1a', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: posColor + '25', border: `2px solid ${posColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: posColor, fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                        {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                        <p style={{ margin: '4px 0 0', color: posColor, fontSize: '13px', fontWeight: 600 }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}{j.categorie ? ` · ${j.categorie}` : ''}</p>
                        {j.numero_licence && <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa15', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>🪪 Licencié {j.numero_licence}</span>}
                      </div>
                      {noteGlobale && <div style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{noteGlobale}</p><p style={{ margin: 0, fontSize: '10px', color: '#555' }}>NOTE ÉDU.</p></div>}
                      <button onClick={() => setJoueurProfil(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '22px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>✕</button>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* Présence - Donut multi + stats */}
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                        <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🏃 Présence aux entraînements</p>
                        {tx ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <DonutMulti presents={tx.presents} absents={tx.absents} blesses={tx.blesses} malade={tx.malade} convoque={tx.convoque} size={110} />
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                { emoji: '✅', label: 'Présent', val: tx.presents, color: '#4ade80' },
                                { emoji: '🏆', label: 'Convoqué', val: tx.convoque, color: '#60a5fa' },
                                { emoji: '❌', label: 'Absent', val: tx.absents, color: '#ef4444' },
                                { emoji: '🤕', label: 'Blessé', val: tx.blesses, color: '#f97316' },
                                { emoji: '🤒', label: 'Malade', val: tx.malade, color: '#a855f7' },
                                { emoji: '📅', label: 'Séances', val: tx.total, color: '#fff' },
                              ].map(s => (
                                <div key={s.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#555' }}>{s.emoji} {s.label}</span>
                                  <span style={{ fontWeight: 700, color: s.color, fontSize: '14px' }}>{s.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Aucune présence saisie pour ce joueur.</p>}
                      </div>

                      {/* Évaluations - Radial skills */}
                      {(ln.technique || ln.physique || ln.mental || ln.tactique) ? (
                        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ Évaluation éducateur</p>
                          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
                            <RadialSkill value={ln.technique} color="#4ade80" label="Technique" size={90} />
                            <RadialSkill value={ln.physique} color="#60a5fa" label="Physique" size={90} />
                            <RadialSkill value={ln.mental} color="#a78bfa" label="Mental" size={90} />
                            <RadialSkill value={ln.tactique} color="#fbbf24" label="Tactique" size={90} />
                          </div>
                          {ln.commentaire && <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#aaa', background: '#0a0a0a', borderRadius: '8px', padding: '10px 14px', fontStyle: 'italic' }}>"{ln.commentaire}"</p>}
                        </div>
                      ) : null}

                      {/* Stats matchs */}
                      {s.matchs > 0 && (() => {
                        const rang = (getVal) => {
                          const myVal = getVal(j.id)
                          if (!myVal) return null
                          const vals = joueurs.map(jj => getVal(jj.id))
                          const better = vals.filter(v => v > myVal).length
                          const rank = better + 1
                          const isTie = vals.filter(v => v === myVal).length > 1
                          const label = rank === 1 ? '1er' : `${rank}ème`
                          return `${label}${isTie ? ' ex æquo' : ''}`
                        }
                        const rangStats = [
                          { emoji: '🏆', label: 'Victoires', val: s.victoires, rang: rang(id => statsGlobalesJoueur(id).victoires), color: '#fbbf24' },
                          { emoji: '⚽', label: 'Buteur', val: s.buts, rang: rang(id => statsGlobalesJoueur(id).buts), color: '#4ade80' },
                          { emoji: '🎯', label: 'Passeur', val: s.passes_dec, rang: rang(id => statsGlobalesJoueur(id).passes_dec), color: '#60a5fa' },
                          { emoji: '🧤', label: 'Clean Sheet', val: s.clean_sheets, rang: rang(id => statsGlobalesJoueur(id).clean_sheets), color: '#a78bfa' },
                          { emoji: '⏱️', label: 'Temps de jeu', val: `${s.minutes}'`, rang: rang(id => statsGlobalesJoueur(id).minutes), color: '#f59e0b' },
                          { emoji: '🏃', label: 'Présence entr.', val: tx ? `${tx.taux}%` : '—', rang: rang(id => tauxPresence(id)?.taux || 0), color: '#4ade80' },
                        ]
                        return (
                          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>⚽ Stats matchs</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                              {[
                                { label: 'Matchs', val: s.matchs, color: '#fff' },
                                { label: 'Victoires', val: s.victoires, color: '#fbbf24' },
                                { label: 'Minutes', val: `${s.minutes}'`, color: '#fff' },
                                { label: 'Buts', val: s.buts, color: '#4ade80' },
                                { label: 'Passes D.', val: s.passes_dec, color: '#60a5fa' },
                                { label: 'Clean S.', val: s.clean_sheets, color: '#a78bfa' },
                                { label: '🟨', val: s.cartons_j, color: '#f59e0b' },
                                { label: '🟥', val: s.cartons_r, color: '#ef4444' },
                              ].map(c => (
                                <div key={c.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: c.color }}>{c.val}</p>
                                  <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>{c.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Classements dans l'équipe */}
                            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏅 Classements dans l'équipe</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {rangStats.filter(r => r.rang).map(r => (
                                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: '#0a0a0a', borderRadius: '8px' }}>
                                  <span style={{ fontSize: '14px', width: '22px' }}>{r.emoji}</span>
                                  <span style={{ fontSize: '12px', color: '#777', flex: 1 }}>{r.label}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#aaa' }}>{r.val}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: r.rang.startsWith('1er') ? '#fbbf24' : r.rang.startsWith('2') ? '#9ca3af' : r.rang.startsWith('3') ? '#d97706' : '#555', background: '#111', padding: '2px 8px', borderRadius: '10px' }}>{r.rang}</span>
                                </div>
                              ))}
                            </div>

                            {/* Joueur du mois */}
                            {(() => {
                              const palmares = []
                              const totalPts = {}
                              entrainements.forEach(e => {
                                const dateStr = e.date || e.created_at
                                if (!dateStr) return
                                const d = new Date(dateStr)
                                const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                ;(e.presences_entrainement || []).forEach(p => {
                                  if (!p.point_seance) return
                                  if (!totalPts[moisKey]) totalPts[moisKey] = {}
                                  totalPts[moisKey][p.joueur_id] = (totalPts[moisKey][p.joueur_id] || 0) + 1
                                })
                              })
                              Object.entries(totalPts).sort().reverse().forEach(([moisKey, pts]) => {
                                const maxPts = Math.max(...Object.values(pts))
                                const winners = Object.entries(pts).filter(([, v]) => v === maxPts).map(([jid]) => jid)
                                if (winners.includes(j.id)) {
                                  const [y, m] = moisKey.split('-')
                                  palmares.push({ label: new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), pts: maxPts, tie: winners.length > 1 })
                                }
                              })
                              if (!palmares.length) return null
                              return (
                                <div style={{ marginTop: '12px' }}>
                                  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🌟 Joueur du mois</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {palmares.map((p, i) => (
                                      <span key={i} style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                                        🥇 {p.label}{p.tie ? ' (ex æquo)' : ''} · {p.pts}⭐
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })()}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setJoueurEnEdition({ ...j }); setJoueurProfil(null) }} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>✏️ Modifier les infos</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modal édition joueur ── */}
            {joueurEnEdition && (
              <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>✏️ Modifier {joueurEnEdition.prenom} {joueurEnEdition.nom}</p>
                    <button onClick={() => setJoueurEnEdition(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div><label style={st.label}>Prénom</label><input style={st.input} value={joueurEnEdition.prenom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, prenom: e.target.value }))} /></div>
                    <div><label style={st.label}>Nom</label><input style={st.input} value={joueurEnEdition.nom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, nom: e.target.value }))} /></div>
                    <div>
                      <label style={st.label}>Poste</label>
                      <select style={st.input} value={joueurEnEdition.poste || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, poste: e.target.value }))}>
                        <option value="">— Choisir —</option>
                        {postes.map(po => <option key={po}>{po}</option>)}
                      </select>
                    </div>
                    <div><label style={st.label}>N° maillot</label><input style={st.input} type="number" value={joueurEnEdition.numero_maillot || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_maillot: e.target.value }))} /></div>
                    <div><label style={st.label}>Date de naissance</label><input style={st.input} type="date" value={joueurEnEdition.date_naissance || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, date_naissance: e.target.value }))} /></div>
                    <div><label style={st.label}>Catégorie</label><input style={st.input} placeholder="U17, U18..." value={joueurEnEdition.categorie || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, categorie: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>N° licence FFF</label><input style={st.input} placeholder="Numéro de licence" value={joueurEnEdition.numero_licence || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_licence: e.target.value }))} /></div>
                    {clubCategories.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={st.label}>Catégorie club (pour les classements)</label>
                        <select style={st.input} value={joueurEnEdition.club_categorie_id || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, club_categorie_id: e.target.value }))}>
                          <option value="">— Non assigné —</option>
                          {clubCategories.map(c => <option key={c.id} value={c.id}>{c.nom} — Équipe {c.equipe}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderJoueur} disabled={savingEdit} style={st.btnSolid}>{savingEdit ? 'Sauvegarde...' : '💾 Sauvegarder'}</button>
                    <button onClick={() => setJoueurEnEdition(null)} style={st.btn('#666')}>Annuler</button>
                  </div>
                </div>
              </div>
            )}

            {importError && (
              <div style={{ background: '#f8717115', border: '1px solid #f8717140', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', color: '#f87171', fontSize: '13px' }}>
                ⚠️ {importError}
              </div>
            )}

            {/* ── Modal prévisualisation import ── */}
            {importPreview && (
              <div style={{ ...st.card, border: '1px solid #a78bfa40', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#a78bfa', fontSize: '15px' }}>📂 {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''} détecté{importPreview.rows.length > 1 ? 's' : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>Vérifie les données avant d'importer</p>
                  </div>
                  {!importPreview.importing && (
                    <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  )}
                </div>

                {/* Table de prévisualisation */}
                <div style={{ overflow: 'auto', marginBottom: '1rem', maxHeight: '260px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['Prénom', 'Nom', 'Poste', 'Catégorie', 'Maillot', 'Naissance', 'Licence'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a', background: i < importPreview.done ? '#4ade8008' : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: i < importPreview.done ? '#4ade80' : '#fff' }}>{r.prenom}</td>
                          <td style={{ padding: '7px 10px', color: i < importPreview.done ? '#4ade80' : '#fff' }}>{r.nom}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.poste || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.categorie || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.numero_maillot || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.date_naissance || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.numero_licence || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.importing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#4ade80', width: `${(importPreview.done / importPreview.rows.length) * 100}%`, transition: 'width 0.3s', borderRadius: '6px' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>{importPreview.done}/{importPreview.rows.length}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={confirmerImport} style={st.btnSolid}>✅ Importer {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''}</button>
                    <button onClick={() => setImportPreview(null)} style={st.btn('#666')}>Annuler</button>
                  </div>
                )}
              </div>
            )}

            {showAddJoueur && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#4ade80' }}>Nouveau joueur</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Prénom *</label><input style={st.input} value={newJoueur.prenom} onChange={e => setNewJoueur({ ...newJoueur, prenom: e.target.value })} /></div>
                  <div><label style={st.label}>Nom *</label><input style={st.input} value={newJoueur.nom} onChange={e => setNewJoueur({ ...newJoueur, nom: e.target.value })} /></div>
                  <div><label style={st.label}>N° maillot</label><input style={st.input} type="number" value={newJoueur.numero_maillot} onChange={e => setNewJoueur({ ...newJoueur, numero_maillot: e.target.value })} /></div>
                  <div>
                    <label style={st.label}>Poste</label>
                    <select style={st.input} value={newJoueur.poste} onChange={e => setNewJoueur({ ...newJoueur, poste: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {postes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={st.label}>Date de naissance</label><input style={st.input} type="date" value={newJoueur.date_naissance} onChange={e => setNewJoueur({ ...newJoueur, date_naissance: e.target.value })} /></div>
                  <div><label style={st.label}>Licence FFF</label><input style={st.input} placeholder="N° de licence" value={newJoueur.numero_licence} onChange={e => setNewJoueur({ ...newJoueur, numero_licence: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={ajouterJoueur} disabled={savingJoueur || !newJoueur.prenom || !newJoueur.nom} style={st.btnSolid}>{savingJoueur ? 'Ajout...' : 'Ajouter'}</button>
                  <button onClick={() => setShowAddJoueur(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '4rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
                <p style={{ color: '#555' }}>Aucun joueur dans l'effectif. Commence par en ajouter un !</p>
              </div>
            ) : vueEquipe === 'liste' ? (
              <div style={{ ...st.card, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      {['#', 'Joueur', 'Poste', 'Âge', 'Licence', ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...joueurs]
                      .sort((a, b) => {
                        const ordre = ['Gardien','Défenseur central','Latéral droit','Latéral gauche','Milieu défensif','Milieu central','Milieu offensif','Ailier droit','Ailier gauche','Attaquant']
                        return (ordre.indexOf(a.poste) === -1 ? 99 : ordre.indexOf(a.poste)) - (ordre.indexOf(b.poste) === -1 ? 99 : ordre.indexOf(b.poste))
                      })
                      .map((j, i) => {
                        const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                        const tx = tauxPresence(j.id)
                        const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? '#60a5fa' : j.poste?.toLowerCase().includes('milieu') ? '#a78bfa' : j.poste && ['attaquant','ailier'].some(k => j.poste.toLowerCase().includes(k)) ? '#4ade80' : '#555'
                        return (
                          <tr key={j.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                            <td style={{ padding: '10px 12px', color: '#555', fontWeight: 700, width: '36px' }}>{j.numero_maillot || '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                            <td style={{ padding: '10px 12px' }}><span style={{ color: posColor, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                            <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{age ? `${age} ans` : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{j.numero_licence ? <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700 }}>🪪</span> : <span style={{ color: '#333', fontSize: '11px' }}>—</span>}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setJoueurProfil(j)} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 Profil</button>
                                <button onClick={() => setJoueurEnEdition({ ...j })} style={{ background: '#ffffff08', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                <button onClick={() => supprimerJoueur(j.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {[
                  { label: '🧤 Gardiens', color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
                  { label: '🛡️ Défenseurs', color: '#60a5fa', match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                  { label: '⚙️ Milieux', color: '#a78bfa', match: p => p?.toLowerCase().includes('milieu') },
                  { label: '⚡ Attaquants', color: '#4ade80', match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                  { label: '❓ Sans poste', color: '#555', match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                ].map(groupe => {
                  const groupJoueurs = joueurs.filter(j => groupe.match(j.poste))
                  if (!groupJoueurs.length) return null
                  return (
                    <div key={groupe.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: groupe.color }}>{groupe.label}</h2>
                        <span style={{ fontSize: '12px', color: '#444', background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px' }}>{groupJoueurs.length} joueur{groupJoueurs.length > 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, height: '1px', background: groupe.color + '20' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                        {groupJoueurs.map(j => {
                          const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                          const tx = tauxPresence(j.id)
                          return (
                            <div key={j.id} style={{ ...st.card, cursor: 'pointer', borderLeft: `3px solid ${groupe.color}30`, transition: 'border-color 0.2s', borderColor: joueurActif?.id === j.id ? groupe.color + '60' : undefined }} onClick={() => setJoueurActif(joueurActif?.id === j.id ? null : j)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                                  {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button onClick={e => { e.stopPropagation(); setJoueurEnEdition({ ...j }) }} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                                  <button onClick={e => { e.stopPropagation(); supprimerJoueur(j.id) }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>✕</button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {j.numero_licence && <span style={{ background: '#1a2e4a', border: '1px solid #3b82f630', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>🪪</span>}
                                {j.club_categorie_id && (() => {
                                  const cat = clubCategories.find(c => c.id === j.club_categorie_id)
                                  return cat ? <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{cat.nom}-{cat.equipe}</span> : null
                                })()}
                                <button onClick={e => { e.stopPropagation(); setJoueurProfil(j) }} style={{ background: groupe.color + '15', border: `1px solid ${groupe.color}30`, color: groupe.color, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 Profil</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== STATS JOUEURS ===== */}
        {activeSection === 'stats' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Stats joueurs</h1>
            </div>

            {/* Sous-onglets */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0' }}>
              {[['tableau','📋 Tableau'],['classement','🏆 Classement'],['graphiques','📈 Graphiques'],['presence','🏃 Présences'],['mois','🌟 Mois']].map(([k, label]) => (
                <button key={k} onClick={() => setStatsSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: statsSubTab === k ? '2px solid #4ade80' : '2px solid transparent', color: statsSubTab === k ? '#4ade80' : '#555', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{label}</button>
              ))}
            </div>

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p>
              </div>
            ) : (
              <>
                {/* ─ Tableau ─ */}
                {statsSubTab === 'tableau' && (
                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['Joueur', 'Poste', 'MJ', 'Min', 'Buts', 'Passes D.', 'CS', '🟨', '🟥', 'Présence'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueurs.map(j => {
                          const s = statsGlobalesJoueur(j.id)
                          const tx = tauxPresence(j.id)
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', color: s.matchs > 0 ? '#fff' : '#333' }}>{s.matchs}</td>
                              <td style={{ padding: '10px 12px', color: s.minutes > 0 ? '#fff' : '#333' }}>{s.minutes}'</td>
                              <td style={{ padding: '10px 12px', color: s.buts > 0 ? '#4ade80' : '#333', fontWeight: s.buts > 0 ? 700 : 400 }}>{s.buts}</td>
                              <td style={{ padding: '10px 12px', color: s.passes_dec > 0 ? '#60a5fa' : '#333', fontWeight: s.passes_dec > 0 ? 700 : 400 }}>{s.passes_dec}</td>
                              <td style={{ padding: '10px 12px', color: s.clean_sheets > 0 ? '#4ade80' : '#333' }}>{s.clean_sheets}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_j > 0 ? '#f59e0b' : '#333' }}>{s.cartons_j}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_r > 0 ? '#f87171' : '#333' }}>{s.cartons_r}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {tx !== null
                                  ? <span style={{ color: tx.taux >= 80 ? '#4ade80' : tx.taux >= 50 ? '#f59e0b' : '#f87171', fontWeight: 700 }}>{tx.taux}%</span>
                                  : <span style={{ color: '#333' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─ Classement ─ */}
                {statsSubTab === 'classement' && (() => {
                  const withStats = joueurs.map(j => ({ ...j, s: statsGlobalesJoueur(j.id), tx: tauxPresence(j.id), note: notes[j.id] }))
                  const TRIS = [
                    { key: 'buts', label: '⚽ Buteurs', get: j => j.s.buts, color: '#4ade80', unit: 'but' },
                    { key: 'passes_dec', label: '🎯 Passeurs', get: j => j.s.passes_dec, color: '#60a5fa', unit: 'passe' },
                    { key: 'victoires', label: '🏆 Victoires', get: j => j.s.victoires, color: '#fbbf24', unit: 'V' },
                    { key: 'matchs', label: '📅 Temps de jeu', get: j => j.s.matchs, color: '#a78bfa', unit: 'match' },
                    { key: 'presence', label: '🏃 Présence', get: j => j.tx?.taux ?? 0, color: '#34d399', unit: '%' },
                    { key: 'note', label: '⭐ Note éducateur', get: j => j.note ? ((j.note.technique+j.note.physique+j.note.mental+j.note.tactique)/4) : 0, color: '#fbbf24', unit: '/5' },
                  ]
                  const triActif = TRIS.find(t => t.key === statsTri) || TRIS[0]
                  const sorted = [...withStats].sort((a, b) => triActif.get(b) - triActif.get(a))
                  return (
                    <div>
                      {/* Sélecteur de critère */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                        {TRIS.map(t => (
                          <button key={t.key} onClick={() => setStatsTri(t.key)} style={{ background: statsTri === t.key ? t.color + '20' : '#111', border: `1px solid ${statsTri === t.key ? t.color + '60' : '#222'}`, color: statsTri === t.key ? t.color : '#555', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t.label}</button>
                        ))}
                      </div>
                      {/* Podium top 3 */}
                      {sorted.length >= 3 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }}>
                          {[0, 1, 2].map(rank => {
                            const j = sorted[rank]
                            if (!j) return null
                            const heights = [130, 100, 80]
                            const medals = ['🥇','🥈','🥉']
                            const val = triActif.get(j)
                            return (
                              <div key={j.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{medals[rank]}</div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: triActif.color + '20', border: `2px solid ${triActif.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: triActif.color, fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>{j?.prenom?.[0] || ""}{j?.nom?.[0] || ""}</div>
                                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700 }}>{j.prenom}</p>
                                <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#555' }}>{j.nom}</p>
                                <div style={{ background: triActif.color + '20', border: `1px solid ${triActif.color}40`, borderRadius: '8px', width: '70px', height: `${heights[rank]}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                  <span style={{ color: triActif.color, fontWeight: 800, fontSize: '18px' }}>{typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}</span>
                                  <span style={{ color: triActif.color + 'aa', fontSize: '9px' }}>{triActif.unit}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Liste complète */}
                      <div style={{ ...st.card, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', width: '40px' }}>#</th>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>Joueur</th>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>Poste</th>
                              <th style={{ padding: '8px 12px', color: triActif.color, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>{triActif.label}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((j, i) => {
                              const val = triActif.get(j)
                              return (
                                <tr key={j.id} style={{ borderBottom: '1px solid #141414', background: i === 0 ? triActif.color + '08' : 'transparent' }}>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : '#444', fontSize: i === 0 ? '15px' : '13px' }}>{i + 1}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                                  <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{j.poste || '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: triActif.color, fontSize: '15px' }}>
                                    {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}{triActif.unit === '%' ? '%' : ''}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* ─ Graphiques ─ */}
                {statsSubTab === 'graphiques' && (() => {
                  const withStats = joueurs.map(j => ({ label: `${j.prenom} ${j.nom?.[0] || ""}.`, ...statsGlobalesJoueur(j.id) }))
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {[
                        { title: '⚽ Buteurs', key: 'buts', color: '#4ade80' },
                        { title: '🎯 Passes décisives', key: 'passes_dec', color: '#60a5fa' },
                        { title: '⏱️ Minutes jouées', key: 'minutes', color: '#a78bfa', unit: "'" },
                        { title: '📅 Matchs joués', key: 'matchs', color: '#f59e0b' },
                        { title: '🟨 Cartons jaunes', key: 'cartons_j', color: '#fbbf24' },
                        { title: '🟥 Cartons rouges', key: 'cartons_r', color: '#f87171' },
                      ].map(({ title, key, color, unit = '' }) => {
                        const data = [...withStats].sort((a, b) => b[key] - a[key]).filter(d => d[key] > 0)
                        return (
                          <div key={key} style={st.card}>
                            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>{title}</p>
                            {data.length === 0
                              ? <p style={{ color: '#333', fontSize: '13px' }}>Aucune donnée</p>
                              : <BarChart data={data.map(d => ({ label: d.label, value: d[key] }))} color={color} unit={unit} />
                            }
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* ─ Présences ─ */}
                {statsSubTab === 'presence' && (() => {
                  const allTx = joueurs.map(j => tauxPresence(j.id)).filter(Boolean)
                  const totalPresents  = allTx.reduce((s, t) => s + t.presents, 0)
                  const totalConvoques = allTx.reduce((s, t) => s + t.convoque, 0)
                  const totalAbsents   = allTx.reduce((s, t) => s + t.absents, 0)
                  const totalBlesses   = allTx.reduce((s, t) => s + t.blesses, 0)
                  const totalMalades   = allTx.reduce((s, t) => s + t.malade, 0)
                  const tauxMoyen      = allTx.length ? Math.round(allTx.reduce((s, t) => s + t.taux, 0) / allTx.length) : 0
                  const seancesSaisies = allTx.length ? allTx[0].total : 0
                  const presenceParMois = (joueurId) => {
                    const mois = {}
                    entrainements.forEach(e => {
                      const p = (e.presences_entrainement || []).find(pr => pr.joueur_id === joueurId)
                      if (!p || (!p.statut && !p.present)) return
                      const d = new Date(e.date)
                      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                      if (!mois[key]) mois[key] = { presents:0, convoque:0, absents:0, blesses:0, malade:0, total:0 }
                      mois[key].total++
                      const st = p.statut || (p.present ? 'present' : 'absent')
                      if (st==='present') mois[key].presents++
                      else if (st==='convoque') mois[key].convoque++
                      else if (st==='absent') mois[key].absents++
                      else if (st==='blesse') mois[key].blesses++
                      else if (st==='malade') mois[key].malade++
                    })
                    return Object.entries(mois).sort(([a],[b])=>a.localeCompare(b)).map(([key,s])=>({
                      key, label: new Date(key+'-02').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),
                      ...s, taux: Math.round((s.presents+s.convoque)/s.total*100)
                    }))
                  }
                  return (
                    <div>
                      {/* ── % par catégorie en haut ── */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                        {(() => {
                          const tot = totalPresents + totalConvoques + totalAbsents + totalBlesses + totalMalades || 1
                          return [
                            { label: '✅ Présence', val: Math.round((totalPresents + totalConvoques) / tot * 100), color: '#4ade80' },
                            { label: '❌ Absents',  val: Math.round(totalAbsents / tot * 100),  color: '#ef4444' },
                            { label: '🤕 Blessés',  val: Math.round(totalBlesses / tot * 100),  color: '#f97316' },
                            { label: '🤒 Malades',  val: Math.round(totalMalades / tot * 100),  color: '#a855f7' },
                            { label: '🏆 Convoqués',val: Math.round(totalConvoques / tot * 100), color: '#60a5fa' },
                          ]
                        })().map(c => (
                          <div key={c.label} style={{ background: '#111', border: `1px solid ${c.color}20`, borderRadius: '12px', padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                            <span style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{c.val}%</span>
                            <span style={{ fontSize: '11px', color: '#555', marginTop: '2px', textAlign: 'center' }}>{c.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* ── Cards joueurs par poste ── */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {[
                          { label: '🧤 Gardiens', color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
                          { label: '🛡️ Défenseurs', color: '#60a5fa', match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                          { label: '⚙️ Milieux', color: '#a78bfa', match: p => p?.toLowerCase().includes('milieu') },
                          { label: '⚡ Attaquants', color: '#4ade80', match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                          { label: '❓ Autres', color: '#555', match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                        ].map(groupe => {
                          const gJoueurs = joueurs.filter(j => groupe.match(j.poste))
                          if (!gJoueurs.length) return null
                          return (
                            <div key={groupe.label}>
                              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: groupe.color }}>{groupe.label}</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                                {gJoueurs.map(j => {
                                  const tx = tauxPresence(j.id)
                                  return (
                                    <div key={j.id} style={st.card}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <DonutMulti
                                          presents={tx?.presents || 0}
                                          absents={tx?.absents || 0}
                                          blesses={tx?.blesses || 0}
                                          malade={tx?.malade || 0}
                                          convoque={tx?.convoque || 0}
                                          size={72}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                          <p style={{ margin: '2px 0 8px', fontSize: '11px', color: '#555' }}>{j.poste || '—'}{tx ? ` · ${tx.total} séance${tx.total > 1 ? 's' : ''}` : ''}</p>
                                          {tx ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                                              {[
                                                { emoji: '✅', label: 'Présent', val: tx.presents, color: '#4ade80' },
                                                { emoji: '🏆', label: 'Convoqué', val: tx.convoque, color: '#60a5fa' },
                                                { emoji: '❌', label: 'Absent', val: tx.absents, color: '#ef4444' },
                                                { emoji: '🤕', label: 'Blessé', val: tx.blesses, color: '#f97316' },
                                                { emoji: '🤒', label: 'Malade', val: tx.malade, color: '#a855f7' },
                                              ].filter(s => s.val > 0).map(s => (
                                                <span key={s.label} style={{ fontSize: '11px', color: s.color }}>
                                                  {s.emoji} {s.val} {s.label}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#333' }}>Aucune présence saisie</span>
                                          )}
                                        </div>
                                        {tx && (
                                          <button
                                            onClick={() => setJoueurMoisDetail(joueurMoisDetail === j.id ? null : j.id)}
                                            style={{ background: joueurMoisDetail === j.id ? '#1a2e1a' : '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#aaa', fontSize: '11px', padding: '5px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                          >
                                            📅 {joueurMoisDetail === j.id ? '▲' : '▼'}
                                          </button>
                                        )}
                                      </div>
                                      {/* Détail par mois */}
                                      {joueurMoisDetail === j.id && (() => {
                                        const moisData = presenceParMois(j.id)
                                        if (!moisData.length) return null
                                        return (
                                          <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Présence par mois</p>
                                            {moisData.map(m => {
                                              const color = m.taux >= 80 ? '#4ade80' : m.taux >= 50 ? '#f59e0b' : '#ef4444'
                                              return (
                                                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                  <span style={{ fontSize: '11px', color: '#777', minWidth: '110px', textTransform: 'capitalize' }}>{m.label}</span>
                                                  <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${m.taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                                                  </div>
                                                  <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>{m.taux}%</span>
                                                  <span style={{ fontSize: '10px', color: '#444' }}>{m.presents+m.convoque}/{m.total}</span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* ── Bar chart classement présence ── */}
                      <div style={st.card}>
                        <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>🏃 Classement par taux de présence</p>
                        <BarChart
                          data={[...joueurs]
                            .map(j => ({ label: `${j.prenom} ${j.nom?.[0] || ""}.`, value: tauxPresence(j.id)?.taux ?? 0 }))
                            .filter(d => d.value > 0)
                            .sort((a, b) => b.value - a.value)}
                          color="#4ade80"
                          unit="%"
                          max={100}
                        />
                        {joueurs.every(j => !tauxPresence(j.id)) && (
                          <p style={{ color: '#333', fontSize: '13px', margin: 0, textAlign: 'center', padding: '1rem' }}>Commence à saisir les présences dans l'onglet Entraînements</p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}

            {/* ─ Joueur du mois ─ */}
            {statsSubTab === 'mois' && (() => {
              // Group point_seance entries by month per player
              const pointsParJoueurMois = {}
              entrainements.forEach(e => {
                const dateStr = e.date || e.created_at
                if (!dateStr) return
                const d = new Date(dateStr)
                const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                ;(e.presences_entrainement || []).forEach(p => {
                  if (!p.point_seance) return
                  const jid = p.joueur_id
                  if (!pointsParJoueurMois[moisKey]) pointsParJoueurMois[moisKey] = {}
                  pointsParJoueurMois[moisKey][jid] = (pointsParJoueurMois[moisKey][jid] || 0) + 1
                })
              })

              const moisKeys = Object.keys(pointsParJoueurMois).sort().reverse()
              const now = new Date()
              const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

              const moisLabel = (k) => {
                const [y, m] = k.split('-')
                return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              }

              const getPodium = (moisKey) => {
                const pts = pointsParJoueurMois[moisKey] || {}
                return Object.entries(pts)
                  .map(([jid, count]) => ({ joueur: joueurs.find(j => j.id === jid), count }))
                  .filter(x => x.joueur)
                  .sort((a, b) => b.count - a.count)
              }

              const totalPoints = () => {
                const total = {}
                Object.values(pointsParJoueurMois).forEach(mois => {
                  Object.entries(mois).forEach(([jid, pts]) => {
                    total[jid] = (total[jid] || 0) + pts
                  })
                })
                return Object.entries(total)
                  .map(([jid, pts]) => ({ joueur: joueurs.find(j => j.id === jid), pts }))
                  .filter(x => x.joueur)
                  .sort((a, b) => b.pts - a.pts)
              }

              const podiumActuel = getPodium(moisCourant)
              const topAll = totalPoints()
              const medals = ['🥇', '🥈', '🥉']

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Mois en cours */}
                  <div style={st.card}>
                    <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '16px' }}>🌟 Joueur du mois — {moisLabel(moisCourant)}</p>
                    {podiumActuel.length === 0 ? (
                      <p style={{ color: '#333', fontSize: '13px', margin: 0, textAlign: 'center', padding: '1rem' }}>Aucun point ⭐ attribué ce mois-ci. Attribue des étoiles dans les séances d'entraînement !</p>
                    ) : (
                      <>
                        {/* Podium top 3 */}
                        {podiumActuel.length >= 2 && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '16px', marginBottom: '2rem' }}>
                            {[0, 1, 2].filter(i => podiumActuel[i]).map((i) => {
                              const item = podiumActuel[i]
                              const heights = [130, 100, 80]
                              const colors = ['#fbbf24', '#9ca3af', '#cd7f32']
                              return (
                                <div key={item.joueur.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '20px' }}>{medals[i]}</span>
                                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: `${colors[i]}20`, border: `2px solid ${colors[i]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                    {item.joueur.prenom?.[0]}{item.joueur.nom?.[0]}
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.joueur.prenom}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{item.joueur.nom}</p>
                                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: colors[i] }}>{item.count}⭐</p>
                                  </div>
                                  <div style={{ width: '80px', height: `${heights[i]}px`, background: `${colors[i]}30`, border: `1px solid ${colors[i]}50`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, color: colors[i], fontSize: '18px' }}>{i === 0 ? '1er' : i === 1 ? '2ème' : '3ème'}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Liste complète */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {podiumActuel.map((item, idx) => (
                            <div key={item.joueur.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#111', borderRadius: '10px', border: idx === 0 ? '1px solid #fbbf2440' : '1px solid #1a1a1a' }}>
                              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{medals[idx] || `${idx + 1}.`}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.joueur.prenom} {item.joueur.nom}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{item.joueur.poste || 'Joueur'}</p>
                              </div>
                              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>{item.count} ⭐</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Classement historique total */}
                  {topAll.length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🏅 Classement général (toutes saisons)</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {topAll.map((item, idx) => (
                          <div key={item.joueur.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#111', borderRadius: '8px' }}>
                            <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{medals[idx] || `${idx + 1}.`}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{item.joueur.prenom} {item.joueur.nom}</p>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24' }}>{item.pts} ⭐</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historique par mois */}
                  {moisKeys.filter(k => k !== moisCourant).length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>📅 Historique des joueurs du mois</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {moisKeys.filter(k => k !== moisCourant).map(k => {
                          const podium = getPodium(k)
                          if (!podium.length) return null
                          const winner = podium[0]
                          return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#111', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
                              <span style={{ fontSize: '20px' }}>🥇</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{winner.joueur.prenom} {winner.joueur.nom}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#555', textTransform: 'capitalize' }}>{moisLabel(k)}</p>
                              </div>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>{winner.count} ⭐</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

        {/* ===== COMPÉTITION ===== */}
        {activeSection === 'matchs' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🏟️ Compétition</h1>
            </div>

            {/* Sous-onglets */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a' }}>
              {[['resultats','⚽ Résultats'],['calendrier','🗓️ Calendrier'],['classement','🏆 Classement']].map(([k, label]) => (
                <button key={k} onClick={() => setCompetitionSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: competitionSubTab === k ? '2px solid #4ade80' : '2px solid transparent', color: competitionSubTab === k ? '#4ade80' : '#555', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{label}</button>
              ))}
            </div>

            {/* ── Résultats ── */}
            {competitionSubTab === 'resultats' && (
              <div style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>⚽ Résultats</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowScanner(true)} style={{ ...st.btn(), background: '#1a1a2e', border: '1px solid #4ade8040', color: '#4ade80' }}>📸 Scanner</button>
                    <button onClick={() => setShowAddMatch(true)} style={st.btn()}>+ Match</button>
                  </div>
                </div>

                {showAddMatch && (
                  <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} /></div>
                      <div><label style={st.label}>Adversaire</label><input style={st.input} placeholder="Nom de l'équipe" value={newMatch.adversaire} onChange={e => setNewMatch({ ...newMatch, adversaire: e.target.value })} /></div>
                      <div><label style={st.label}>Compétition</label><input style={st.input} placeholder="Championnat, Coupe..." value={newMatch.competition} onChange={e => setNewMatch({ ...newMatch, competition: e.target.value })} /></div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" min="0" value={newMatch.score_nous} onChange={e => setNewMatch({ ...newMatch, score_nous: e.target.value })} /></div>
                        <span style={{ color: '#555', paddingBottom: '10px', fontWeight: 700 }}>-</span>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" min="0" value={newMatch.score_eux} onChange={e => setNewMatch({ ...newMatch, score_eux: e.target.value })} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#aaa' }}>
                        <input type="checkbox" checked={newMatch.domicile} onChange={e => setNewMatch({ ...newMatch, domicile: e.target.checked })} />
                        Domicile
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={ajouterMatch} disabled={savingMatch} style={st.btnSolid}>{savingMatch ? 'Ajout...' : 'Ajouter'}</button>
                      <button onClick={() => setShowAddMatch(false)} style={st.btn('#666')}>Annuler</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {matchs.map(m => {
                    const aScore = m.score_nous !== '' && m.score_nous !== null
                    const nous = parseInt(m.score_nous)
                    const eux = parseInt(m.score_eux)
                    const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                    const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#f87171' : '#f59e0b'
                    return (
                      <div key={m.id} style={{ ...st.card, cursor: 'pointer' }} onClick={() => setMatchActif(matchActif?.id === m.id ? null : m)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '12px', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>}
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                              {m.domicile ? 'vs' : '@'} {m.adversaire}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                              {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {m.competition ? ` · ${m.competition}` : ''}
                              {m.domicile ? ' · Domicile' : ' · Extérieur'}
                            </p>
                          </div>
                          {aScore && <span style={{ fontWeight: 800, fontSize: '16px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                        </div>

                        {/* Feuille de match */}
                        {matchActif?.id === m.id && (
                          <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Feuille de match</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {joueurs.map(j => {
                                const key = m.id
                                const s = (statsMatch[key] || {})[j.id] || {}
                                const existingStat = (m.stats_match || []).find(st => st.joueur_id === j.id) || {}
                                const val = (field) => s[field] !== undefined ? s[field] : (existingStat[field] ?? '')
                                return (
                                  <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '120px 50px 50px 50px 50px 30px 30px', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom?.[0] || ""}.</span>
                                    <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), minutes: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="Buts" min="0" value={val('buts')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), buts: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), passes_dec: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), clean_sheet: e.target.value === '1' } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <span title="Carton jaune" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_jaune') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_jaune: !val('carton_jaune') } } })) }}>🟨</span>
                                    <span title="Carton rouge" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_rouge') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_rouge: !val('carton_rouge') } } })) }}>🟥</span>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                              <p style={{ fontSize: '10px', color: '#444', margin: '0', alignSelf: 'center' }}>Min · Buts · PD · CS</p>
                              <button onClick={e => { e.stopPropagation(); sauvegarderStatsMatch(m.id) }} style={{ ...st.btnSolid, marginLeft: 'auto', padding: '7px 16px', fontSize: '12px' }}>💾 Sauvegarder</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {matchs.length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Aucun match enregistré</p></div>}
                </div>
              </div>
            )}

            {/* ── Calendrier ── */}
            {competitionSubTab === 'calendrier' && (
              <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Upload zone */}
                <div style={st.card}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>📸 Scanner le calendrier</p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#555' }}>Uploade une ou plusieurs photos de ton calendrier — l'IA extrait automatiquement tous les matchs.</p>

                  <label style={{ display: 'block', border: '2px dashed #2a2a2a', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files)
                        files.forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const base64 = ev.target.result.split(',')[1]
                            setCalendarImages(prev => [...prev, { base64, preview: ev.target.result, name: file.name }])
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ''
                      }} />
                    <p style={{ margin: 0, color: '#555', fontSize: '13px' }}>📁 Cliquer pour ajouter des photos<br/><span style={{ fontSize: '11px', color: '#333' }}>JPG, PNG — plusieurs fichiers acceptés</span></p>
                  </label>

                  {/* Thumbnails */}
                  {calendarImages.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {calendarImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img.preview} alt={img.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2a2a2a' }} />
                          <button onClick={() => setCalendarImages(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {calendarError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 10px' }}>⚠️ {calendarError}</p>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={scannerCalendrier} disabled={calendarLoading || !calendarImages.length}
                      style={{ ...st.btnSolid, opacity: calendarImages.length ? 1 : 0.4 }}>
                      {calendarLoading ? '⏳ Analyse en cours...' : `🤖 Extraire les matchs${calendarImages.length ? ` (${calendarImages.length} photo${calendarImages.length > 1 ? 's' : ''})` : ''}`}
                    </button>
                    {calendarMatchs.length > 0 && (
                      <button onClick={() => { setCalendarMatchs([]); localStorage.removeItem('calendarMatchs') }}
                        style={st.btn('#ef4444')}>🗑️ Réinitialiser</button>
                    )}
                  </div>
                </div>

                {/* Calendrier extrait */}
                {calendarMatchs.length > 0 && (
                  <div style={st.card}>
                    <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🗓️ Calendrier — {calendarMatchs.length} match{calendarMatchs.length > 1 ? 's' : ''}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {calendarMatchs.map((m, i) => {
                        const isPast = m.date && new Date(m.date) < new Date()
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#111', borderRadius: '10px', border: `1px solid ${isPast ? '#1a1a1a' : '#2a2a2a'}`, opacity: isPast ? 0.5 : 1 }}>
                            <div style={{ minWidth: '90px', textAlign: 'center' }}>
                              {m.date ? (
                                <>
                                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: isPast ? '#555' : '#fff' }}>
                                    {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </p>
                                  {m.heure && <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>{m.heure}</p>}
                                </>
                              ) : (
                                <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>Date TBD</p>
                              )}
                              {m.journee && <p style={{ margin: 0, fontSize: '10px', color: '#4ade80', fontWeight: 700 }}>{m.journee}</p>}
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                                {m.equipe_domicile} <span style={{ color: '#555', fontWeight: 400 }}>vs</span> {m.equipe_exterieur}
                              </p>
                              {m.competition && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#555' }}>{m.competition}</p>}
                            </div>
                            <button onClick={() => { const updated = calendarMatchs.filter((_, idx) => idx !== i); setCalendarMatchs(updated); localStorage.setItem('calendarMatchs', JSON.stringify(updated)) }}
                              style={{ background: 'none', border: 'none', color: '#333', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {calendarMatchs.length === 0 && !calendarLoading && (
                  <div style={{ ...st.card, textAlign: 'center', padding: '2rem', border: '1px dashed #1a1a1a' }}>
                    <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Aucun match dans le calendrier. Uploade des photos pour commencer.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Classement ── */}
            {competitionSubTab === 'classement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

                {/* Lien vers le classement officiel */}
                <div style={st.card}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>🔗 Classement officiel de la ligue</p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#555' }}>Colle le lien du classement sur le site de ta ligue (FFF, Footeo, etc.) pour y accéder en un clic.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      style={{ ...st.input, flex: 1 }}
                      placeholder="https://fff.fr/... ou https://footeo.com/..."
                      value={ligueUrl || ligueUrlSaved}
                      onChange={e => setLigueUrl(e.target.value)}
                    />
                    <button
                      onClick={() => { const url = ligueUrl || ligueUrlSaved; localStorage.setItem('ligueUrl', url); setLigueUrlSaved(url); setLigueUrl('') }}
                      style={st.btnSolid}>
                      💾 Sauvegarder
                    </button>
                  </div>
                  {ligueUrlSaved && (
                    <a href={ligueUrlSaved} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '14px', background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      🏆 Voir le classement officiel ↗
                    </a>
                  )}
                </div>

              </div>
            )}
          </>
        )}

        {/* ===== ENTRAÎNEMENTS ===== */}
        {activeSection === 'entrainements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Entraînements</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{entrainements.length} séance{entrainements.length !== 1 ? 's' : ''} · Clique sur une séance pour saisir les présences</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowPlanificateur(true); setShowAddEntrainement(false) }} style={st.btn('#60a5fa')}>📅 Planifier la saison</button>
                <button onClick={() => { setShowAddEntrainement(true); setShowPlanificateur(false) }} style={st.btnSolid}>+ Séance</button>
              </div>
            </div>

            {/* ── Ajout séance unique ── */}
            {showAddEntrainement && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>➕ Nouvelle séance</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newEntrainement.date} onChange={e => setNewEntrainement({ ...newEntrainement, date: e.target.value })} /></div>
                  <div><label style={st.label}>Thème (optionnel)</label><input style={st.input} placeholder="Ex: Travail défensif, Jeu de transition..." value={newEntrainement.description} onChange={e => setNewEntrainement({ ...newEntrainement, description: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={ajouterEntrainement} style={st.btnSolid}>Créer la séance</button>
                  <button onClick={() => setShowAddEntrainement(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {/* ── Planificateur récurrent ── */}
            {showPlanificateur && (
              <div style={{ ...st.card, border: '1px solid #60a5fa30', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px', color: '#60a5fa' }}>📅 Planifier la saison</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#555' }}>Choisis les jours récurrents et la période — toutes les séances seront créées automatiquement.</p>

                {/* Jours de la semaine */}
                <label style={st.label}>Jours d'entraînement</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[['Lun',1],['Mar',2],['Mer',3],['Jeu',4],['Ven',5],['Sam',6],['Dim',0]].map(([label, num]) => {
                    const actif = planSaison.joursActifs.includes(num)
                    return (
                      <button key={num} onClick={() => toggleJourPlan(num)}
                        style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${actif ? '#60a5fa' : '#2a2a2a'}`, background: actif ? '#60a5fa20' : '#1a1a1a', color: actif ? '#60a5fa' : '#666', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Dates + thème */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '16px' }}>
                  <div><label style={st.label}>Début de saison</label><input style={st.input} type="date" value={planSaison.dateDebut} onChange={e => setPlanSaison(p => ({ ...p, dateDebut: e.target.value }))} /></div>
                  <div><label style={st.label}>Fin de saison</label><input style={st.input} type="date" value={planSaison.dateFin} onChange={e => setPlanSaison(p => ({ ...p, dateFin: e.target.value }))} /></div>
                  <div><label style={st.label}>Thème par défaut (optionnel)</label><input style={st.input} placeholder="Ex: Entraînement, Préparation physique..." value={planSaison.theme} onChange={e => setPlanSaison(p => ({ ...p, theme: e.target.value }))} /></div>
                </div>

                {/* Aperçu du nombre de séances */}
                {planSaison.dateDebut && planSaison.dateFin && planSaison.joursActifs.length > 0 && (() => {
                  let count = 0
                  const cur = new Date(planSaison.dateDebut)
                  const end = new Date(planSaison.dateFin)
                  while (cur <= end) { if (planSaison.joursActifs.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1) }
                  const existingDates = new Set(entrainements.map(e => e.date?.substring(0, 10)))
                  let newCount = 0
                  const cur2 = new Date(planSaison.dateDebut)
                  while (cur2 <= end) { if (planSaison.joursActifs.includes(cur2.getDay()) && !existingDates.has(cur2.toISOString().split('T')[0])) newCount++; cur2.setDate(cur2.getDate() + 1) }
                  return (
                    <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa20', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#60a5fa' }}>
                      📊 <strong>{count}</strong> séances au total · <strong>{newCount}</strong> nouvelles à créer ({count - newCount} déjà existantes)
                    </div>
                  )
                })()}

                {/* Progression */}
                {generatingPlan && (
                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#60a5fa' }}>Création en cours... {planProgress.done}/{planProgress.total}</p>
                    <div style={{ background: '#222', borderRadius: '4px', height: '6px' }}>
                      <div style={{ background: '#60a5fa', borderRadius: '4px', height: '6px', width: `${planProgress.total > 0 ? (planProgress.done / planProgress.total) * 100 : 0}%`, transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={genererSaison} disabled={generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length}
                    style={{ ...st.btnSolid, background: '#60a5fa', opacity: (generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) ? 0.5 : 1 }}>
                    {generatingPlan ? 'Génération...' : '🚀 Générer les séances'}
                  </button>
                  <button onClick={() => setShowPlanificateur(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {/* ── Liste des séances ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...entrainements].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                const ouvert = entrainementActif === e.id
                const nbPresents = (e.presences_entrainement || []).filter(p => p.statut === 'present' || p.statut === 'convoque' || (!p.statut && p.present)).length
                const nbBlesses = (e.presences_entrainement || []).filter(p => p.statut === 'blesse').length
                const nbMalades = (e.presences_entrainement || []).filter(p => p.statut === 'malade').length
                const nbConvoques = (e.presences_entrainement || []).filter(p => p.statut === 'convoque').length
                const total = joueurs.length
                const dateObj = new Date(e.date + 'T12:00:00')
                const estFuture = dateObj > new Date()
                return (
                  <div key={e.id} style={{ ...st.card, borderLeft: `3px solid ${estFuture ? '#60a5fa40' : '#4ade8030'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Indicateur passé/futur */}
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: estFuture ? '#60a5fa15' : '#4ade8015', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {estFuture ? '📅' : '✅'}
                      </div>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {e.description && <span style={{ fontSize: '12px', color: '#555' }}>{e.description}</span>}
                          {!estFuture && total > 0 && (
                            <>
                              <span style={{ fontSize: '11px', color: '#4ade80', background: '#4ade8010', padding: '1px 7px', borderRadius: '10px' }}>✅ {nbPresents}</span>
                              {nbConvoques > 0 && <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa10', padding: '1px 7px', borderRadius: '10px' }}>🏆 {nbConvoques}</span>}
                              {nbBlesses > 0 && <span style={{ fontSize: '11px', color: '#f97316', background: '#f9731610', padding: '1px 7px', borderRadius: '10px' }}>🤕 {nbBlesses}</span>}
                              {nbMalades > 0 && <span style={{ fontSize: '11px', color: '#a855f7', background: '#a855f710', padding: '1px 7px', borderRadius: '10px' }}>🤒 {nbMalades}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!estFuture && total > 0 && (
                          <span style={{ background: nbPresents >= total * 0.8 ? '#4ade8015' : '#f59e0b15', border: `1px solid ${nbPresents >= total * 0.8 ? '#4ade8030' : '#f59e0b30'}`, color: nbPresents >= total * 0.8 ? '#4ade80' : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                            {nbPresents}/{total}
                          </span>
                        )}
                        <button onClick={() => supprimerEntrainement(e.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#444', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="Supprimer la séance">🗑️</button>
                        <span style={{ color: '#444', cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>{ouvert ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {ouvert && (
                      <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                        {joueurs.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Ajoute des joueurs dans "Mon équipe" pour saisir les présences.</p>
                        ) : (
                          <>
                            {/* Légende */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                              {Object.entries(STATUT_CONFIG).map(([key, s]) => (
                                <span key={key} style={{ fontSize: '11px', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: '10px' }}>
                                  {s.emoji} {s.label}
                                </span>
                              ))}
                              <span style={{ fontSize: '11px', color: '#333' }}>· Clique pour changer le statut</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '7px' }}>
                              {joueurs.map(j => {
                                const p = (e.presences_entrainement || []).find(p => p.joueur_id === j.id)
                                const nonSaisi = !p || (!p.statut && !p.present)
                                const statut = p?.statut || (p?.present ? 'present' : 'absent')
                                const cfg = nonSaisi
                                  ? { emoji: '⬜', label: 'Non saisi', bg: '#ffffff05', border: '#2a2a2a', color: '#444' }
                                  : (STATUT_CONFIG[statut] || STATUT_CONFIG.absent)
                                const hasPoint = !!p?.point_seance
                                return (
                                  <div key={j.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: cfg.bg, border: `1px solid ${hasPoint ? '#fbbf2460' : cfg.border}`, borderRadius: '8px', transition: 'all 0.15s', position: 'relative' }}>
                                    <span onClick={() => cyclerPresence(e.id, j.id, nonSaisi ? 'non_saisi' : statut)} style={{ fontSize: '15px', flexShrink: 0, cursor: 'pointer' }}>{cfg.emoji}</span>
                                    <div onClick={() => cyclerPresence(e.id, j.id, nonSaisi ? 'non_saisi' : statut)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j?.nom || ''}</p>
                                      <p style={{ margin: 0, fontSize: '10px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</p>
                                    </div>
                                    <span
                                      title={hasPoint ? 'Retirer le point séance' : 'Attribuer un point séance'}
                                      onClick={ev => { ev.stopPropagation(); togglePointSeance(e.id, j.id, hasPoint) }}
                                      style={{ fontSize: '14px', cursor: 'pointer', opacity: hasPoint ? 1 : 0.2, flexShrink: 0, transition: 'opacity 0.15s' }}>
                                      ⭐
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {entrainements.length === 0 && (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#555', margin: '0 0 8px' }}>Aucune séance enregistrée</p>
                  <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Utilise "📅 Planifier la saison" pour générer toute l'année en un clic</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ÉVALUATIONS ===== */}
        {activeSection === 'notes' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>📝 Évaluations joueurs</h1>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>Note chaque joueur sur 4 critères. Active le toggle pour partager ta note avec le joueur dans son propre dashboard.</p>
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {joueurs.map(j => {
                  const ln = getLocalNote(j.id)
                  const noteGlobale = ln.technique || ln.physique || ln.mental || ln.tactique
                    ? ((ln.technique + ln.physique + ln.mental + ln.tactique) / 4).toFixed(1)
                    : null
                  return (
                    <div key={j.id} style={st.card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '13px' }}>
                          {j?.prenom?.[0] || ""}{j?.nom?.[0] || ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{j.poste || '—'}</p>
                        </div>
                        {noteGlobale && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontWeight: 800, fontSize: '16px', padding: '4px 14px', borderRadius: '20px' }}>⭐ {noteGlobale}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        {[['technique', '🎯 Technique'], ['physique', '💪 Physique'], ['mental', '🧠 Mental'], ['tactique', '♟️ Tactique']].map(([key, label]) => (
                          <div key={key}>
                            <label style={st.label}>{label}</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} onClick={() => setLocalNote(j.id, { [key]: n })}
                                  style={{ cursor: 'pointer', fontSize: '20px', opacity: ln[key] >= n ? 1 : 0.2 }}>⭐</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Toggle visible par le joueur */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: ln.visible_joueur ? '#4ade8010' : '#1a1a1a', border: `1px solid ${ln.visible_joueur ? '#4ade8030' : '#2a2a2a'}`, borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }}
                        onClick={() => setLocalNote(j.id, { visible_joueur: !ln.visible_joueur })}>
                        <div style={{ width: '36px', height: '20px', background: ln.visible_joueur ? '#4ade80' : '#333', borderRadius: '10px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: '3px', left: ln.visible_joueur ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: ln.visible_joueur ? '#4ade80' : '#aaa' }}>
                            {ln.visible_joueur ? '👁️ Visible par le joueur' : '🔒 Privé (non visible)'}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                            {ln.visible_joueur ? 'Le joueur verra cette note dans son dashboard' : 'Seul vous voyez cette évaluation'}
                          </p>
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={st.label}>{ln.visible_joueur ? '💬 Commentaire (visible par le joueur)' : '💬 Commentaire (privé)'}</label>
                        <textarea value={ln.commentaire} onChange={e => setLocalNote(j.id, { commentaire: e.target.value })}
                          placeholder="Points forts, axes de progression, comportement..."
                          style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      <button onClick={() => sauvegarderNote(j.id, ln)} disabled={savingNote} style={st.btnSolid}>
                        {savingNote ? 'Sauvegarde...' : '💾 Sauvegarder'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== MON PROFIL ÉDUCATEUR ===== */}
        {activeSection === 'recrutement' && (() => {
          const postes = ['Tous', 'Gardien', 'Défenseur', 'Milieu', 'Attaquant']
          const categories = ['Toutes', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Seniors']
          const regions = ['Toutes', ...Array.from(new Set(recrutJoueurs.map(j => j.region).filter(Boolean))).sort()]
          const stylesDisponibles = recrutPoste !== 'Tous' && CARACTERISTIQUES_PAR_POSTE[recrutPoste]
            ? ['Tous', ...CARACTERISTIQUES_PAR_POSTE[recrutPoste]]
            : ['Tous']
          const filtered = recrutJoueurs.filter(j => {
            if (recrutPoste !== 'Tous' && j.poste !== recrutPoste) return false
            if (recrutCategorie !== 'Toutes' && j.categorie !== recrutCategorie) return false
            if (recrutRegion !== 'Toutes' && j.region !== recrutRegion) return false
            if (recrutStyleDeJeu !== 'Tous' && !(j.points_forts || '').toLowerCase().includes(recrutStyleDeJeu.toLowerCase())) return false
            if (recrutSearch) {
              const s = recrutSearch.toLowerCase()
              return `${j.prenom} ${j.nom}`.toLowerCase().includes(s) || (j.club || '').toLowerCase().includes(s) || (j.poste || '').toLowerCase().includes(s) || (j.region || '').toLowerCase().includes(s)
            }
            return true
          })
          const posteColor = (p) => {
            const map = { Gardien: { bg: '#f59e0b20', text: '#f59e0b' }, Défenseur: { bg: '#60a5fa20', text: '#60a5fa' }, Milieu: { bg: '#4ade8020', text: '#4ade80' }, Attaquant: { bg: '#f9731620', text: '#f97316' } }
            return map[p] || { bg: '#ffffff10', text: '#aaa' }
          }
          if (recrutSelectedJoueur) {
            const j = recrutSelectedJoueur
            return (
              <div>
                <button onClick={() => setRecrutSelectedJoueur(null)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '13px' }}>← Retour au feed</button>
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#4ade8020', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                    <div>
                      <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {j.poste && <span style={{ background: posteColor(j.poste).bg, color: posteColor(j.poste).text, fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>{j.poste}</span>}
                        {j.categorie && <span style={{ background: '#ffffff10', color: '#aaa', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{j.categorie}</span>}
                        {j.region && <span style={{ background: '#ffffff10', color: '#aaa', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{j.region}</span>}
                        {j.pied && <span style={{ background: '#ffffff10', color: '#aaa', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>Pied {j.pied}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                    {[{ label: 'Matchs officiels', val: j.matchs_officiel || 0 }, { label: 'Buts', val: j.buts_total || 0 }, { label: 'Passes déc.', val: j.passes_decisives || 0 }, { label: 'Clean sheets', val: j.cleansheets || 0 }, { label: 'Minutes jouées', val: j.minutes_jouees || 0 }, { label: 'Club', val: j.club || '—' }].map(s => (
                      <div key={s.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>{s.val}</div>
                        <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {j.points_forts && <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points forts</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{j.points_forts.split(', ').filter(Boolean).map(t => <span key={t} style={{ background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8040', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>{t}</span>)}</div>
                  </div>}
                  {j.a_ameliorer && <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Axes de progression</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{j.a_ameliorer.split(', ').filter(Boolean).map(t => <span key={t} style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>{t}</span>)}</div>
                  </div>}
                  {recrutParcours.length > 0 && <div>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parcours</p>
                    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recrutParcours.map(p => <div key={p.id} style={{ fontSize: '13px' }}><span style={{ fontWeight: 700 }}>{p.club}</span> <span style={{ color: '#555' }}>· {[p.saison, p.niveau_championnat, p.poste].filter(Boolean).join(' · ')}</span></div>)}
                    </div>
                  </div>}
                  {j.clip_url && <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vidéo</p>
                    <video src={j.clip_url} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '360px', background: '#000' }} />
                  </div>}
                </div>
              </div>
            )
          }
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🔍 Recrutement</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate('/feed')} style={{ background: '#ffffff10', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>📋 Feed</button>
                  <a href="/jogabonito" target="_blank" style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>🎬 Jogabonito →</a>
                </div>
              </div>
              {/* Filtres */}
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recherche</p>
                  <input value={recrutSearch} onChange={e => setRecrutSearch(e.target.value)} placeholder="Nom, club, région..." style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Poste</p>
                  <select value={recrutPoste} onChange={e => { setRecrutPoste(e.target.value); setRecrutStyleDeJeu('Tous') }} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {postes.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                {recrutPoste !== 'Tous' && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Style de jeu</p>
                    <select value={recrutStyleDeJeu} onChange={e => setRecrutStyleDeJeu(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #60a5fa40', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                      {stylesDisponibles.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Catégorie</p>
                  <select value={recrutCategorie} onChange={e => setRecrutCategorie(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Région</p>
                  <select value={recrutRegion} onChange={e => setRecrutRegion(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {regions.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '12px', color: '#555' }}>{filtered.length} joueur{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</p>
              {/* Grid joueurs */}
              {!recrutLoaded ? (
                <p style={{ color: '#4ade80', textAlign: 'center', padding: '3rem' }}>Chargement...</p>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#444' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                  <p>Aucun joueur trouvé avec ces filtres.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {filtered.map(j => (
                    <div key={j.id} onClick={async () => { setRecrutSelectedJoueur(j); const { data } = await supabase.from('parcours').select('*').eq('joueur_id', j.id).order('saison', { ascending: false }); setRecrutParcours(data || []) }}
                      style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#4ade8040'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#4ade8015', border: '1px solid #4ade8030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.club || '—'} {j.niveau_equipe ? `· ${j.niveau_equipe}` : ''}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {j.poste && <span style={{ background: posteColor(j.poste).bg, color: posteColor(j.poste).text, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{j.poste}</span>}
                        {j.categorie && <span style={{ background: '#ffffff08', color: '#666', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{j.categorie}</span>}
                        {j.region && <span style={{ background: '#ffffff08', color: '#666', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{j.region}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', borderTop: '1px solid #1a1a1a', paddingTop: '10px' }}>
                        {[{ label: 'Matchs', val: j.matchs_officiel || 0 }, { label: 'Buts', val: j.buts_total || 0 }, { label: 'Passes', val: j.passes_decisives || 0 }].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#4ade80' }}>{s.val}</div>
                            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ===== MES SÉANCES ===== */}
        {activeSection === 'mes_seances' && (
          <div>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>💾 Enregistrer une séance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder="Thème de la séance (ex: Jeu de position 6v4)"
                  value={uploadSeanceOuverteForm.theme}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, theme: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                />
                <input
                  type="date"
                  value={uploadSeanceOuverteForm.date_seance}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, date_seance: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                />
                <select
                  value={uploadSeanceOuverteForm.categorie_tactique}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, categorie_tactique: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="">Choisis une catégorie tactique</option>
                  {CATEGORIES_TACTIQUES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <input
                  placeholder="Lien vidéo (Veo, YouTube...)"
                  value={uploadSeanceOuverteForm.video_url}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, video_url: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px' }}
                />
                <button
                  onClick={uploaderMaSeance}
                  disabled={uploadingSeanceOuverte}
                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: uploadingSeanceOuverte ? 0.6 : 1 }}
                >
                  {uploadingSeanceOuverte ? 'Envoi...' : 'Enregistrer ma séance'}
                </button>
              </div>
            </div>

            <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>📋 Mes séances ({mesSeancesOuvertes.length})</p>
            {mesSeancesOuvertes.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Aucune séance envoyée pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mesSeancesOuvertes.map(s => {
                  const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                  const cat = CATEGORIES_TACTIQUES.find(c => c.value === s.categorie_tactique)
                  return (
                    <div key={s.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{s.theme}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                          {cat?.label || s.categorie_tactique} · {new Date(s.date_seance).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {eval_ ? (
                          <>
                            <span style={{ background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8040', fontSize: '13px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px' }}>
                              ✅ {eval_.note_totale?.toFixed?.(1) ?? eval_.note_totale}/100
                            </span>
                          </>
                        ) : (
                          <span style={{ background: '#ffffff08', color: '#888', border: '1px solid #333', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px' }}>
                            📁 Archivée
                          </span>
                        )}
                        <a href={s.video_url} target="_blank" rel="noreferrer" style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🎬 Voir</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeSection === 'profil' && profilEduEdit && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>👤 Mon profil</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '900px' }}>

              {/* Infos principales */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={st.card}>
                  <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>📋 Informations</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={st.label}>Prénom</label>
                        <input style={st.input} value={profilEduEdit.prenom || ''} onChange={e => setProfilEduEdit(p => ({ ...p, prenom: e.target.value }))} placeholder="Ton prénom" />
                      </div>
                      <div>
                        <label style={st.label}>Nom</label>
                        <input style={st.input} value={profilEduEdit.nom || ''} onChange={e => setProfilEduEdit(p => ({ ...p, nom: e.target.value }))} placeholder="Ton nom" />
                      </div>
                    </div>
                    <div>
                      <label style={st.label}>Club</label>
                      <input style={st.input} value={profilEduEdit.club || ''} onChange={e => setProfilEduEdit(p => ({ ...p, club: e.target.value }))} placeholder="Nom du club" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={st.label}>Catégorie entraînée</label>
                        <select style={st.input} value={profilEduEdit.categorie || ''} onChange={e => setProfilEduEdit(p => ({ ...p, categorie: e.target.value }))}>
                          <option value="">— Choisir —</option>
                          {['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','U19','U20','Seniors','Vétérans'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>Niveau de championnat</label>
                        <select style={st.input} value={profilEduEdit.niveau_championnat || ''} onChange={e => setProfilEduEdit(p => ({ ...p, niveau_championnat: e.target.value }))}>
                          <option value="">— Choisir —</option>
                          {['National 3','Régional 1','Régional 2','Régional 3','Départemental 1','Départemental 2','Départemental 3','District','Loisir'].map(n => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>🏆 Lien classement ligue (URL)</label>
                        <input style={st.input} type="url" placeholder="https://fff.fr/..." value={profilEduEdit.ligue_url || ''} onChange={e => setProfilEduEdit(p => ({ ...p, ligue_url: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diplôme */}
                <div style={st.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>🎓 Diplôme</p>
                    {profilEdu?.diplome_verifie && (
                      <span style={{ background: '#4ade8020', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>✅ Certifié</span>
                    )}
                    {profilEdu?.diplome_url && !profilEdu?.diplome_verifie && (
                      <span style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>⏳ En attente de vérification</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={st.label}>Diplôme obtenu</label>
                      <select style={st.input} value={profilEduEdit.diplome || ''} onChange={e => setProfilEduEdit(p => ({ ...p, diplome: e.target.value }))}>
                        <option value="">— Choisir —</option>
                        {['UEFA A','UEFA B','UEFA C','BEF (Brevet d\'État)','BMF','CFF1','CFF2','Animateur','Initiateur','Éducateur Sportif','Aucun diplôme'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>Preuve du diplôme (PDF ou image)</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0a0a0a', border: '1px dashed #2a2a2a', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => uploadDiplome(e.target.files[0])} />
                        <span style={{ fontSize: '13px', color: '#555' }}>{uploadingDiplome ? '⏳ Upload...' : profilEdu?.diplome_url ? '✅ Preuve uploadée — Changer' : '📎 Uploader la preuve'}</span>
                      </label>
                      {profilEdu?.diplome_url && (
                        <a href={profilEdu.diplome_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px', display: 'block' }}>Voir le document uploadé ↗</a>
                      )}
                    </div>
                  </div>
                </div>

                <button onClick={sauvegarderProfilEdu} disabled={savingProfil} style={st.btnSolid}>
                  {savingProfil ? '⏳ Sauvegarde...' : '💾 Sauvegarder le profil'}
                </button>
              </div>

              {/* Parcours football */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>⚽ Parcours football</p>
                    <button onClick={() => setShowAddParcours(true)} style={st.btn()}>+ Ajouter</button>
                  </div>

                  {showAddParcours && (
                    <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={st.label}>Type</label>
                          <select style={st.input} value={newParcours.type} onChange={e => setNewParcours(p => ({ ...p, type: e.target.value }))}>
                            <option value="coach">🎙️ Coach</option>
                            <option value="joueur">⚽ Joueur</option>
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>Club *</label>
                          <input style={st.input} placeholder="Nom du club" value={newParcours.club} onChange={e => setNewParcours(p => ({ ...p, club: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Poste / Rôle</label>
                          <input style={st.input} placeholder="Attaquant, Entraîneur principal..." value={newParcours.poste} onChange={e => setNewParcours(p => ({ ...p, poste: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Niveau</label>
                          <input style={st.input} placeholder="National, Régional..." value={newParcours.niveau} onChange={e => setNewParcours(p => ({ ...p, niveau: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Saison début</label>
                          <input style={st.input} placeholder="2018" value={newParcours.saison_debut} onChange={e => setNewParcours(p => ({ ...p, saison_debut: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Saison fin</label>
                          <input style={st.input} placeholder="2022 ou En cours" value={newParcours.saison_fin} onChange={e => setNewParcours(p => ({ ...p, saison_fin: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={ajouterParcours} style={st.btnSolid}>Ajouter</button>
                        <button onClick={() => setShowAddParcours(false)} style={st.btn('#666')}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {parcoursEdu.length === 0 && !showAddParcours && (
                    <p style={{ color: '#333', fontSize: '13px', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Aucun parcours ajouté</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {parcoursEdu.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0a0a0a', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
                        <span style={{ fontSize: '18px' }}>{p.type === 'coach' ? '🎙️' : '⚽'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.club}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                            {p.poste && `${p.poste} · `}{p.niveau && `${p.niveau} · `}
                            {p.saison_debut && p.saison_fin ? `${p.saison_debut} → ${p.saison_fin}` : p.saison_debut || ''}
                          </p>
                        </div>
                        <button onClick={() => supprimerParcours(p.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aperçu profil public */}
                {profilEdu && (
                  <div style={{ ...st.card, border: '1px solid #4ade8020' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>👁️ Aperçu public</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#4ade8020', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
                        {profilEdu.prenom?.[0]}{profilEdu.nom?.[0]}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{profilEdu.prenom} {profilEdu.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{profilEdu.club || 'Club non renseigné'} · {profilEdu.categorie || '—'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {profilEdu.diplome && (
                        <span style={{ background: profilEdu.diplome_verifie ? '#4ade8015' : '#1a1a1a', border: `1px solid ${profilEdu.diplome_verifie ? '#4ade8040' : '#2a2a2a'}`, color: profilEdu.diplome_verifie ? '#4ade80' : '#666', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                          {profilEdu.diplome_verifie ? '✅' : '🎓'} {profilEdu.diplome}
                        </span>
                      )}
                      {profilEdu.niveau_championnat && (
                        <span style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                          🏆 {profilEdu.niveau_championnat}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Joueurs affiliés ── */}
            <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
              <div style={st.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>👥 Joueurs affiliés</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Seuls les joueurs affiliés peuvent te noter. Partage ton code d'équipe pour qu'ils puissent rejoindre.</p>
                  </div>
                  {profilEdu?.code_equipe && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#555' }}>Ton code d'équipe</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontWeight: 800, fontSize: '16px', padding: '6px 14px', borderRadius: '8px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                          {profilEdu.code_equipe.toUpperCase()}
                        </span>
                        <button onClick={() => navigator.clipboard.writeText(profilEdu.code_equipe.toUpperCase())}
                          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                          📋
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Demandes en attente */}
                {affiliations.filter(a => a.statut === 'en_attente').length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>⏳ Demandes en attente ({affiliations.filter(a => a.statut === 'en_attente').length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {affiliations.filter(a => a.statut === 'en_attente').map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f59e0b08', border: '1px solid #f59e0b20', borderRadius: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#f59e0b20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#f59e0b', flexShrink: 0 }}>
                            {a.joueur?.prenom?.[0] || '?'}{a.joueur?.nom?.[0] || ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{a.joueur ? `${a.joueur.prenom} ${a.joueur.nom}` : 'Compte joueur'}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{a.joueur ? 'Lié à l\'effectif' : `ID: ${a.joueur_id?.slice(0, 8)}…`}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setAffiliationEnCours(a); setJoueurLieId('') }}
                              style={{ background: '#4ade8020', border: '1px solid #4ade8040', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                              ✅ Accepter
                            </button>
                            <button onClick={() => gererAffiliation(a.id, 'refuse')}
                              style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                              ✕ Refuser
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Joueurs acceptés */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>
                    ✅ Joueurs affiliés ({affiliations.filter(a => a.statut === 'accepte').length})
                  </p>
                  {affiliations.filter(a => a.statut === 'accepte').length === 0 ? (
                    <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>Aucun joueur affilié pour le moment.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {affiliations.filter(a => a.statut === 'accepte').map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#4ade8010', border: '1px solid #4ade8025', borderRadius: '20px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4ade8020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#4ade80' }}>
                            {a.joueur?.prenom?.[0] || '?'}{a.joueur?.nom?.[0] || ''}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{a.joueur ? `${a.joueur.prenom} ${a.joueur.nom}` : 'Compte joueur'}</span>
                          <button onClick={() => gererAffiliation(a.id, 'refuse')}
                            style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mon club ── */}
            <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
              <div style={st.card}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🏟️ Mon club</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#555' }}>Rejoins ton club avec le code qu'il t'a communiqué.</p>

                {clubAffiliation ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: clubAffiliation.statut === 'accepte' ? '#4ade8010' : '#f59e0b10', border: `1px solid ${clubAffiliation.statut === 'accepte' ? '#4ade8030' : '#f59e0b30'}`, borderRadius: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#4ade80' }}>
                      {(clubAffiliation.club?.club || clubAffiliation.club?.prenom || '?')[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{clubAffiliation.club?.club || `${clubAffiliation.club?.prenom} ${clubAffiliation.club?.nom}`}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: clubAffiliation.statut === 'accepte' ? '#4ade80' : '#f59e0b' }}>
                        {clubAffiliation.statut === 'accepte' ? '✅ Affilié' : clubAffiliation.statut === 'en_attente' ? '⏳ En attente de validation par le club' : '✕ Refusé'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      style={{ ...st.input, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
                      placeholder="CODE CLUB"
                      value={codeClubInput}
                      onChange={e => { setCodeClubInput(e.target.value.toUpperCase()); setCodeClubError(null) }}
                      onKeyDown={e => e.key === 'Enter' && rejoindreClub()}
                    />
                    <button onClick={rejoindreClub} disabled={sendingCodeClub || !codeClubInput.trim()} style={st.btnSolid}>
                      {sendingCodeClub ? '...' : 'Rejoindre'}
                    </button>
                  </div>
                )}
                {codeClubError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>⚠️ {codeClubError}</p>}
                {codeClubSuccess && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '8px' }}>✅ Demande envoyée ! Le club doit valider ton affiliation.</p>}
              </div>
            </div>

            {clubAffiliation?.statut === 'accepte' && (
              <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🎥 Séances pour évaluation club</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Uploade jusqu'à 2 séances par saison pour être évalué par ton club.</p>
                    </div>
                    <button onClick={() => setShowUploadSeance(true)} style={st.btnSolid}>+ Uploader une séance</button>
                  </div>

                  {showUploadSeance && (
                    <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={st.label}>Saison</label>
                          <select style={st.input} value={seanceSaison} onChange={e => setSeanceSaison(e.target.value)}>
                            {['2025-2026', '2024-2025', '2026-2027'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>Date de la séance</label>
                          <input style={st.input} type="date" value={seanceDate} onChange={e => setSeanceDate(e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={st.label}>Thème de la séance</label>
                          <input style={st.input} placeholder="Ex: Travail défensif, transition rapide..." value={seanceTheme} onChange={e => setSeanceTheme(e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={st.label}>Vidéo de la séance</label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            {[{ val: 'upload', label: '📁 Uploader un fichier' }, { val: 'veo', label: '🎥 Lien Veo' }].map(opt => (
                              <button key={opt.val} onClick={() => setSeanceVideoMode(opt.val)}
                                style={{ flex: 1, background: seanceVideoMode === opt.val ? '#4ade8015' : '#1a1a1a', border: `1px solid ${seanceVideoMode === opt.val ? '#4ade80' : '#333'}`, color: seanceVideoMode === opt.val ? '#4ade80' : '#aaa', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {seanceVideoMode === 'upload' ? (
                            <input type="file" accept="video/*" onChange={e => setSeanceVideoFile(e.target.files[0])} style={{ color: '#aaa', fontSize: '13px' }} />
                          ) : (
                            <input style={st.input} type="url" placeholder="https://app.veo.co/matches/..." value={seanceVeoUrl} onChange={e => setSeanceVeoUrl(e.target.value)} />
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={uploaderSeance} disabled={uploadingSeance || (seanceVideoMode === 'upload' ? !seanceVideoFile : !seanceVeoUrl.trim())} style={st.btnSolid}>{uploadingSeance ? 'Upload...' : 'Envoyer au club'}</button>
                        <button onClick={() => setShowUploadSeance(false)} style={st.btn('#666')}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {mesSeances.length === 0 ? (
                    <p style={{ color: '#333', fontSize: '13px' }}>Aucune séance uploadée pour l'instant.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mesSeances.map(s => (
                        <div key={s.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.theme || 'Séance'} — {s.saison}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString('fr-FR') : ''}</p>
                          </div>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: s.statut === 'analyse' ? '#4ade8015' : s.statut === 'transfere_coach' ? '#60a5fa15' : '#f59e0b15',
                            color: s.statut === 'analyse' ? '#4ade80' : s.statut === 'transfere_coach' ? '#60a5fa' : '#f59e0b',
                          }}>
                            {s.statut === 'analyse' ? '✅ Analysée' : s.statut === 'transfere_coach' ? '🎙️ Chez le coach' : '⏳ En attente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Section avis & notations ── */}
            {(() => {
              // Calcul des moyennes par critère agrégé sur tous les avis
              const allCriteres = {}
              notesEdu.forEach(n => {
                if (!n.criteres) return
                Object.entries(n.criteres).forEach(([k, v]) => {
                  if (!allCriteres[k]) allCriteres[k] = []
                  allCriteres[k].push(v)
                })
              })
              const moyC = (key) => {
                const vals = allCriteres[key] || []
                return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
              }
              const moyCategorie = (cat) => {
                const vals = cat.criteres.map(c => moyC(c.key)).filter(v => v !== null)
                return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
              }
              const allMoys = CRITERES_EDU.map(c => moyCategorie(c)).filter(v => v !== null)
              const moyGlobale = allMoys.length ? allMoys.reduce((s, v) => s + v, 0) / allMoys.length : null

              return (
                <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
                  {/* En-tête score global */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>⭐ Évaluations reçues</h2>
                    {moyGlobale !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fbbf2415', border: '1px solid #fbbf2430', borderRadius: '12px', padding: '6px 16px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#fbbf24' }}>{moyGlobale.toFixed(1)}</span>
                        <div>
                          <div style={{ color: '#fbbf24', fontSize: '14px', lineHeight: 1 }}>{'★'.repeat(Math.round(moyGlobale))}{'☆'.repeat(5 - Math.round(moyGlobale))}</div>
                          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{notesEdu.length} évaluation{notesEdu.length > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#333' }}>Aucune évaluation reçue — les joueurs et responsables de club pourront te noter depuis leur dashboard</span>
                    )}
                  </div>

                  {/* Grille 6 catégories */}
                  {moyGlobale !== null && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      {CRITERES_EDU.map(cat => {
                        const mCat = moyCategorie(cat)
                        return (
                          <div key={cat.key} style={{ ...st.card, border: `1px solid ${cat.color}20` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                              {mCat !== null && (
                                <span style={{ fontSize: '16px', fontWeight: 800, color: cat.color }}>{mCat.toFixed(1)}<span style={{ fontSize: '10px', color: '#444' }}>/5</span></span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                              {cat.criteres.map(c => {
                                const val = moyC(c.key)
                                return (
                                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#666', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                                    {val !== null ? (
                                      <>
                                        <div style={{ width: '80px', height: '5px', background: '#1a1a1a', borderRadius: '3px', flexShrink: 0 }}>
                                          <div style={{ width: `${(val / 5) * 100}%`, height: '100%', background: cat.color, borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: cat.color, width: '24px', textAlign: 'right', flexShrink: 0 }}>{val.toFixed(1)}</span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: '#333' }}>—</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Commentaires par saison */}
                  {notesEdu.filter(n => n.commentaire).length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px' }}>💬 Commentaires</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notesEdu.filter(n => n.commentaire).map(n => (
                          <div key={n.id} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: '#0a0a0a', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>{n.auteur_type === 'club' ? '🏟️' : '⚽'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{n.profiles?.prenom} {n.profiles?.nom}</span>
                                <span style={{ fontSize: '10px', color: n.auteur_type === 'club' ? '#60a5fa' : '#4ade80' }}>{n.auteur_type === 'club' ? 'Club' : 'Joueur'}</span>
                                {n.saison && <span style={{ fontSize: '10px', color: '#444' }}>{n.saison}</span>}
                                {!n.visible_public && <span style={{ fontSize: '10px', color: '#444', background: '#111', padding: '1px 6px', borderRadius: '6px', marginLeft: 'auto' }}>🔒 Privé</span>}
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: '#888', fontStyle: 'italic' }}>"{n.commentaire}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

      </div>
    </div>

    {/* ===== MODALE SCANNER FEUILLE DE MATCH ===== */}
    {showScanner && (
      <div style={{ position: 'fixed', inset: 0, background: '#000000ee', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '900px', padding: '24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📸 Scanner une feuille de match</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>L'IA extrait automatiquement score, joueurs, buts et cartons</p>
            </div>
            <button onClick={() => { setShowScanner(false); setScannerResult(null); setScannerImageBase64(null); setScannerImagePreview(null); setScannerError(null) }}
              style={{ background: 'none', border: 'none', color: '#555', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>

          {!scannerResult ? (
            <div>
              <div
                onClick={() => document.getElementById('scanner-input').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => { setScannerImageBase64(ev.target.result.split(',')[1]); setScannerImagePreview(ev.target.result) }
                  reader.readAsDataURL(file)
                }}
                style={{ border: '2px dashed #2a2a2a', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: '#050505' }}>
                {scannerImagePreview
                  ? <img src={scannerImagePreview} alt="Feuille" style={{ maxHeight: '400px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                  : <div>
                      <p style={{ fontSize: '40px', margin: '0 0 10px' }}>📄</p>
                      <p style={{ margin: 0, fontWeight: 600, color: '#aaa' }}>Clique ou glisse une photo de la feuille de match</p>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#444' }}>JPG, PNG — photo de téléphone acceptée</p>
                    </div>
                }
              </div>
              <input id="scanner-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => { setScannerImageBase64(ev.target.result.split(',')[1]); setScannerImagePreview(ev.target.result) }
                  reader.readAsDataURL(file)
                }} />
              {scannerError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>⚠️ {scannerError}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={scannerMatch} disabled={!scannerImageBase64 || scannerLoading} style={{ ...st.btnSolid, flex: 1, opacity: !scannerImageBase64 ? 0.4 : 1 }}>
                  {scannerLoading ? '🔍 Analyse en cours...' : '✨ Analyser avec l\'IA'}
                </button>
                <button onClick={() => { setShowScanner(false); setScannerError(null) }} style={st.btn('#666')}>Annuler</button>
              </div>
              {scannerLoading && (
                <div style={{ marginTop: '16px', background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#4ade80' }}>
                  🤖 L'IA lit la feuille et identifie tes joueurs... (5-10 secondes)
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'flex-start' }}>
                <div>
                  <img src={scannerImagePreview} alt="Feuille" style={{ width: '100%', borderRadius: '8px', objectFit: 'contain', maxHeight: '300px', background: '#050505' }} />
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><label style={st.label}>Date</label><input style={st.input} type="date" value={scannerMatchData.date} onChange={e => setScannerMatchData(d => ({ ...d, date: e.target.value }))} /></div>
                    <div><label style={st.label}>Adversaire</label><input style={st.input} value={scannerMatchData.adversaire} onChange={e => setScannerMatchData(d => ({ ...d, adversaire: e.target.value }))} /></div>
                    <div><label style={st.label}>Compétition</label><input style={st.input} value={scannerMatchData.competition || ''} onChange={e => setScannerMatchData(d => ({ ...d, competition: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" value={scannerMatchData.score_nous} onChange={e => setScannerMatchData(d => ({ ...d, score_nous: e.target.value }))} /></div>
                      <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" value={scannerMatchData.score_eux} onChange={e => setScannerMatchData(d => ({ ...d, score_eux: e.target.value }))} /></div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>
                      <input type="checkbox" checked={scannerMatchData.domicile} onChange={e => setScannerMatchData(d => ({ ...d, domicile: e.target.checked }))} />
                      Match à domicile
                    </label>
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>
                    ✅ {Object.keys(scannerStats).length} joueur{Object.keys(scannerStats).length > 1 ? 's' : ''} détecté{Object.keys(scannerStats).length > 1 ? 's' : ''} automatiquement
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px 55px 32px 32px', gap: '4px', marginBottom: '6px' }}>
                    {['Joueur', 'Min', 'Buts', 'PD ✏️', 'CS', '🟨', '🟥'].map(h => (
                      <span key={h} style={{ fontSize: '10px', color: '#444', textAlign: h === 'Joueur' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '460px', overflowY: 'auto' }}>
                    {joueurs.map(j => {
                      const s = scannerStats[j.id] || {}
                      const detected = !!scannerStats[j.id]
                      const setS = (field, val) => setScannerStats(prev => ({
                        ...prev,
                        [j.id]: { minutes: 0, buts: 0, passes_dec: 0, clean_sheet: false, carton_jaune: false, carton_rouge: false, ...(prev[j.id] || {}), [field]: val }
                      }))
                      return (
                        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px 55px 32px 32px', gap: '4px', alignItems: 'center', padding: '6px 8px', background: detected ? '#0d1a0d' : '#0a0a0a', borderRadius: '6px', border: `1px solid ${detected ? '#1a3a1a' : '#111'}` }}>
                          <span style={{ fontSize: '12px', fontWeight: detected ? 700 : 500, color: detected ? '#fff' : '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detected ? '✓ ' : ''}{j.prenom} {j.nom?.[0] || ''}.
                          </span>
                          <input type="number" min="0" max="120" value={s.minutes ?? ''} placeholder="—"
                            onChange={e => setS('minutes', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? '#111' : '#080808' }} />
                          <input type="number" min="0" value={s.buts ?? ''} placeholder="—"
                            onChange={e => setS('buts', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? '#111' : '#080808' }} />
                          <input type="number" min="0" value={s.passes_dec ?? ''} placeholder="—"
                            onChange={e => setS('passes_dec', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center' }} />
                          <input type="number" min="0" max="1" value={s.clean_sheet ? 1 : ''} placeholder="—"
                            onChange={e => setS('clean_sheet', e.target.value === '1')}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? '#111' : '#080808' }} />
                          <span onClick={() => setS('carton_jaune', !s.carton_jaune)} style={{ textAlign: 'center', cursor: 'pointer', fontSize: '16px', opacity: s.carton_jaune ? 1 : 0.2 }}>🟨</span>
                          <span onClick={() => setS('carton_rouge', !s.carton_rouge)} style={{ textAlign: 'center', cursor: 'pointer', fontSize: '16px', opacity: s.carton_rouge ? 1 : 0.2 }}>🟥</span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#333' }}>✏️ PD (passes décisives) et CS (clean sheet) sont à compléter manuellement</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}>
                <button onClick={sauvegarderMatchScanne} disabled={scannerSaving || !scannerMatchData.adversaire} style={{ ...st.btnSolid, flex: 1 }}>
                  {scannerSaving ? 'Enregistrement...' : '💾 Enregistrer le match et toutes les stats'}
                </button>
                <button onClick={() => { setScannerResult(null); setScannerError(null) }} style={st.btn('#666')}>← Rescanner</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    {/* ===== MODAL LIAISON JOUEUR AFFILIÉ ===== */}
    {affiliationEnCours && (
      <div style={{ position: 'fixed', inset: 0, background: '#000000ee', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '16px' }}>✅ Accepter la demande</p>
          <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#666' }}>
            Lier ce joueur <strong style={{ color: '#aaa' }}>({affiliationEnCours.joueur_id?.slice(0, 8)}…)</strong> à un joueur de votre effectif pour accéder à ses statistiques.
          </p>

          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Joueur correspondant dans votre effectif</label>
          <select
            value={joueurLieId}
            onChange={e => setJoueurLieId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #222', background: '#111', color: '#fff', fontSize: '13px', marginBottom: '20px' }}
          >
            <option value="">— Sélectionner un joueur —</option>
            {joueurs.map(j => (
              <option key={j.id} value={j.id}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => gererAffiliation(affiliationEnCours.id, 'accepte', joueurLieId || null)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #4ade8040', background: '#4ade8020', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              ✅ Confirmer l'affiliation
            </button>
            <button
              onClick={() => { setAffiliationEnCours(null); setJoueurLieId('') }}
              style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#666', fontSize: '13px', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#444', textAlign: 'center' }}>
            La liaison est optionnelle — vous pouvez accepter sans sélectionner de joueur.
          </p>
        </div>
      </div>
    )}

    </>
  )
}
