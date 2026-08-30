import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import TacticalBoard from './TacticalBoard'
import TactipadViewer from './TactipadViewer'
import CompositionTerrain, { ModalSelectionJoueur } from './CompositionTerrain'
import { useColors } from '../lib/theme'

const METEO_OPTIONS = [
  { val: 'soleil', icon: '☀️', label: 'Soleil' },
  { val: 'nuageux', icon: '⛅', label: 'Nuageux' },
  { val: 'pluie', icon: '🌧️', label: 'Pluie' },
  { val: 'vent', icon: '💨', label: 'Vent' },
  { val: 'froid', icon: '🥶', label: 'Froid' },
  { val: 'chaud', icon: '🥵', label: 'Chaud' },
]

const TYPE_MATCH = [
  { val: 'championnat', label: 'Championnat' },
  { val: 'coupe', label: 'Coupe' },
  { val: 'amical', label: 'Amical' },
  { val: 'tournoi', label: 'Tournoi' },
]

const formVide = () => ({
  adversaire: '', date_match: '', heure_match: '', domicile_exterieur: 'domicile',
  type_match: 'championnat', objectifs: '', match_aller_resultat: '',
  notre_classement: '', notre_points: '', notre_buts_pour: '', notre_buts_contre: '',
  adversaire_classement: '', adversaire_points: '', adversaire_buts_pour: '', adversaire_buts_contre: '',
  meteo: 'soleil', temperature: '',
  animation_avec_ballon: [''],
  animation_sans_ballon: [''],
  cpa_offensifs: [''],
  cpa_defensifs: [''],
  tireurs: [''],
  transitions: [''],
  cles_du_match: [''],
  premieres_minutes: [''],
  message_coach: '',
  schema_cpa_offensif: { etapes: [{ joueurs: [], ballon: null }] },
  schema_cpa_defensif: { etapes: [{ joueurs: [], ballon: null }] },
  tactipad_ids: [],
})

// Liste de points éditable (animation avec/sans ballon, CPA, tireurs) — au
// niveau module plutôt que défini dans le rendu du composant parent : un
// composant recréé à chaque rendu perd son identité pour React (remonté au
// lieu de mis à jour), ce qui fait perdre le focus de l'input en cours de
// frappe à chaque frappe.
function ListeChamp({ valeurs, onChange, onAjouter, onSupprimer, placeholder, inputStyle }) {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {valeurs.map((val, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '14px', minWidth: '16px' }}>•</span>
          <input style={{ ...inputStyle, flex: 1 }} placeholder={placeholder} value={val} onChange={e => onChange(i, e.target.value)} />
          {valeurs.length > 1 && (
            <button onClick={() => onSupprimer(i)} style={{ background: 'none', border: 'none', color: colors.text.dim, fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          )}
        </div>
      ))}
      <button onClick={onAjouter} style={{ background: 'none', border: `1px dashed ${colors.border.faint}`, borderRadius: '8px', color: colors.text.dim, fontSize: '12px', padding: '6px', cursor: 'pointer', marginTop: '2px', fontFamily: 'Inter, sans-serif' }}>
        + Ajouter
      </button>
    </div>
  )
}

// Un board TacticalBoard (format multi-étapes) est "rempli" dès qu'une de
// ses étapes contient au moins un joueur ou le ballon.
function boardEstRempli(board) {
  return (board?.etapes || []).some(e => (e.joueurs || []).length > 0 || e.ballon)
}

// Filet de sécurité : les colonnes jsonb (animation_avec_ballon, cpa_*,
// tireurs) doivent revenir de Supabase comme de vrais tableaux JS, mais si
// une ligne a été insérée autrement (import manuel, ancien format...) la
// valeur peut arriver en string JSON — un .filter() dessus plante sinon.
const parseListe = (val) => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

// Normalise les champs liste d'une fiche brute renvoyée par Supabase —
// appliqué une seule fois à la source (charger/sauvegarder) pour que tout
// le reste du composant (editer, contenuFiche...) puisse faire confiance
// à ces champs sans reparser à chaque lecture.
function normaliserFiche(f) {
  return {
    ...f,
    animation_avec_ballon: parseListe(f.animation_avec_ballon),
    animation_sans_ballon: parseListe(f.animation_sans_ballon),
    cpa_offensifs: parseListe(f.cpa_offensifs),
    cpa_defensifs: parseListe(f.cpa_defensifs),
    tireurs: parseListe(f.tireurs),
    transitions: parseListe(f.transitions),
    cles_du_match: parseListe(f.cles_du_match),
    premieres_minutes: parseListe(f.premieres_minutes),
  }
}

// Portail vers document.body (même mécanisme que FicheSeancePrint plus haut
// dans DashboardEducateur.jsx) : #fiche-print est déjà utilisé et stylé pour
// l'impression des fiches de séance (index.css, fond blanc/texte noir,
// incompatible avec le rendu sombre voulu ici) — id dédié pour ne jamais
// entrer en collision, avec sa propre règle @media print scoped au composant.
function FicheCauseriePrint({ children }) {
  return createPortal(<div id="fiche-causerie-print">{children}</div>, document.body)
}

// Mode présentation plein écran ("Présenter la causerie") — pensé pour
// vidéoprojecteur/TV (AirPlay, Chromecast ou HDMI se branchent sur la
// fenêtre du navigateur, rien à gérer côté app au-delà du plein écran natif
// via requestFullscreen). Une slide par section non vide, navigation
// clavier ← → (+ Échap pour quitter), grand texte lisible de loin.
// Palettes de la présentation plein écran — sombre (défaut, historique) et
// claire. slide.accent (couleur par type de slide, vert/bleu/rouge...) reste
// identique dans les deux cas, seuls le fond et les textes neutres changent.
const PALETTES_PRESENTATION = {
  sombre: {
    fond: '#050505', bordure: '#333',
    texteFort: '#fff', texteDoux: '#d1d5db', texteFaint: '#9ca3af', texteGhost: '#374151',
    dotInactif: '#333',
  },
  claire: {
    fond: '#f8fafc', bordure: '#cbd5e1',
    texteFort: '#0f172a', texteDoux: '#334155', texteFaint: '#64748b', texteGhost: '#cbd5e1',
    dotInactif: '#cbd5e1',
  },
}

function PresentationCauserie({ f, equipeNom, tactipadsDispo, onFermer }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('causerie_presentation_theme') || 'sombre')
  const pal = PALETTES_PRESENTATION[theme]
  const changerTheme = () => {
    const suivant = theme === 'sombre' ? 'claire' : 'sombre'
    setTheme(suivant)
    localStorage.setItem('causerie_presentation_theme', suivant)
  }

  const slides = [{ titre: 'NOTRE OBJECTIF', accent: '#4ade80', type: 'intro' }]
  // Juste après l'intro (2e slide) si une composition a été renseignée —
  // absente si rien n'a encore été assigné, comme les autres slides
  // conditionnelles de cette présentation.
  if ((f.titulaires || []).some(Boolean)) {
    slides.push({ titre: 'COMPOSITION', accent: '#4ade80', type: 'composition' })
  }
  const ajouterListe = (titre, accent, icone, valeurs) => {
    const items = (valeurs || []).filter(Boolean)
    if (items.length) slides.push({ titre, accent, icone, type: 'liste', items })
  }
  // boardEstRempli() est déjà défini plus haut dans ce fichier (format
  // multi-étapes {etapes:[{joueurs,ballon}]}, pas {joueurs,ball,arrows}).
  const ajouterSchema = (titre, accent, icone, board) => {
    if (boardEstRempli(board)) slides.push({ titre, accent, icone, type: 'board', board })
  }
  ajouterListe('AVEC LE BALLON', '#818cf8', '⚽', f.animation_avec_ballon)
  ajouterListe('SANS LE BALLON', '#f97316', '🛡️', f.animation_sans_ballon)
  ajouterListe('TRANSITIONS', '#2dd4bf', '🔄', f.transitions)
  // Une slide par mouvement tactique sélectionné (chacun peut être lu
  // indépendamment, pas de rythme imposé au coach pendant la causerie).
  ;(f.tactipad_ids || []).forEach(id => {
    const tp = tactipadsDispo?.find(t => t.id === id)
    if (tp) slides.push({ titre: tp.nom || 'MOUVEMENT TACTIQUE', accent: '#38bdf8', icone: '🎯', type: 'mouvement', schema: tp.schema })
  })
  ajouterListe('CPA OFFENSIFS', '#4ade80', '⚽', f.cpa_offensifs)
  ajouterSchema('SCHÉMA CPA OFFENSIF', '#4ade80', '🟢', f.schema_cpa_offensif)
  ajouterListe('TIREURS', '#facc15', '🎯', f.tireurs)
  ajouterListe('CPA DÉFENSIFS', '#f87171', '🛡️', f.cpa_defensifs)
  ajouterSchema('SCHÉMA CPA DÉFENSIF', '#f87171', '🔴', f.schema_cpa_defensif)
  if (f.notre_classement || f.adversaire_classement) {
    slides.push({ titre: 'ADVERSAIRE', accent: '#f87171', type: 'adversaire' })
  }
  ajouterListe('NOS CLÉS DU MATCH', '#fbbf24', '🔑', f.cles_du_match)
  ajouterListe('PREMIÈRES MINUTES', '#60a5fa', '⏱️', f.premieres_minutes)
  if (f.message_coach) slides.push({ titre: 'MESSAGE DU COACH', accent: '#a78bfa', type: 'message' })

  const [slideIdx, setSlideIdx] = useState(0)
  const total = slides.length
  const idx = Math.min(slideIdx, total - 1)
  const slide = slides[idx]

  // Téléphone en paysage : très large mais peu haut (souvent <500px de
  // hauteur) — le padding et les marges pensés pour un écran de PC/tablette
  // (large ET haut) laissent alors trop peu de place au contenu, qui se
  // retrouve coupé/nécessite de scroller pendant la présentation.
  const [isLandscapeCourt, setIsLandscapeCourt] = useState(() => window.innerHeight < 520 && window.innerWidth > window.innerHeight)
  useEffect(() => {
    const onResize = () => setIsLandscapeCourt(window.innerHeight < 520 && window.innerWidth > window.innerHeight)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize) }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setSlideIdx(i => Math.min(i + 1, total - 1)) }
      else if (e.key === 'ArrowLeft') setSlideIdx(i => Math.max(i - 1, 0))
      else if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [total, onFermer])

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])

  if (!slide) return null

  const navBtnSize = isLandscapeCourt ? '32px' : '44px'
  const navBtn = { background: 'none', border: `1px solid ${pal.bordure}`, color: pal.texteFort, borderRadius: '50%', width: navBtnSize, height: navBtnSize, fontSize: isLandscapeCourt ? '14px' : '18px', cursor: 'pointer', flexShrink: 0 }
  // Les schémas (composition/CPA/mouvement) ont un ratio largeur/hauteur fixe
  // — en paysage court, on les limite par la hauteur dispo plutôt que par une
  // largeur fixe pensée pour desktop, sinon ils débordent verticalement.
  const maxWidthSchema = (ratio, defaut) => isLandscapeCourt ? `min(90vw, calc((100dvh - 150px) * ${ratio}))` : defaut

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', background: pal.fond, zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isLandscapeCourt ? '10px 20px' : '24px 40px', flexShrink: 0 }}>
        <p style={{ margin: 0, color: pal.texteFaint, fontSize: isLandscapeCourt ? '12px' : '14px', fontWeight: 700 }}>{equipeNom || 'Nous'} vs {f.adversaire}</p>
        <div style={{ display: 'flex', gap: isLandscapeCourt ? '6px' : '10px' }}>
          <button onClick={changerTheme} title="Changer le thème" style={{ background: 'none', border: `1px solid ${pal.bordure}`, color: pal.texteDoux, borderRadius: '8px', padding: isLandscapeCourt ? '5px 10px' : '8px 14px', fontSize: isLandscapeCourt ? '11px' : '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {theme === 'sombre' ? 'Claire' : 'Sombre'}
          </button>
          <button onClick={onFermer} style={{ background: 'none', border: `1px solid ${pal.bordure}`, color: pal.texteDoux, borderRadius: '8px', padding: isLandscapeCourt ? '5px 10px' : '8px 14px', fontSize: isLandscapeCourt ? '11px' : '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>✕ {isLandscapeCourt ? '' : 'Quitter [Échap]'}</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isLandscapeCourt ? '6px 24px' : '20px 60px', textAlign: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <p style={{ margin: isLandscapeCourt ? '0 0 10px' : '0 0 32px', color: slide.accent, fontSize: isLandscapeCourt ? '13px' : '18px', fontWeight: 800, letterSpacing: '4px' }}>{slide.icone ? `${slide.icone} ` : ''}{slide.titre}</p>

        {slide.type === 'intro' && (
          <>
            <h1 style={{ margin: isLandscapeCourt ? '0 0 10px' : '0 0 24px', color: pal.texteFort, fontSize: isLandscapeCourt ? 'clamp(20px, 4.5vh, 40px)' : 'clamp(32px, 5vw, 64px)', fontWeight: 900 }}>{equipeNom || 'Nous'} <span style={{ color: slide.accent }}>vs</span> {f.adversaire}</h1>
            {f.objectifs ? <p style={{ color: pal.texteDoux, fontSize: isLandscapeCourt ? 'clamp(13px, 2.6vh, 22px)' : 'clamp(18px, 2.4vw, 28px)', lineHeight: 1.5, maxWidth: '900px' }}>{f.objectifs}</p> : <p style={{ color: pal.texteGhost }}>—</p>}
          </>
        )}

        {slide.type === 'liste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isLandscapeCourt ? '10px' : '22px', alignItems: 'flex-start' }}>
            {slide.items.map((it, i) => (
              <p key={i} style={{ margin: 0, color: pal.texteFort, fontSize: isLandscapeCourt ? 'clamp(14px, 3.2vh, 26px)' : 'clamp(20px, 3vw, 34px)', fontWeight: 600, lineHeight: 1.3, display: 'flex', gap: '16px', textAlign: 'left' }}>
                <span style={{ color: slide.accent }}>›</span>{it}
              </p>
            ))}
          </div>
        )}

        {slide.type === 'composition' && (
          <div style={{ width: '100%', maxWidth: maxWidthSchema(1.55, '760px') }}>
            <CompositionTerrain formation={f.formation || '4-4-2'} titulaires={f.titulaires || []} remplacants={f.remplacants || []} modeEdit={false} affichageNom={f.composition_affichage_nom || 'nom'} />
          </div>
        )}

        {slide.type === 'board' && (
          <div style={{ width: '100%', maxWidth: maxWidthSchema(1.53, '780px') }}>
            <TacticalBoard data={slide.board} onChange={() => {}} readOnly />
          </div>
        )}

        {slide.type === 'mouvement' && (
          <div style={{ width: '100%', maxWidth: maxWidthSchema(1.6, '900px'), display: 'flex', justifyContent: 'center' }}>
            <TactipadViewer schema={slide.schema} width={isLandscapeCourt ? Math.min(window.innerWidth - 48, (window.innerHeight - 150) * 1.6) : Math.min(window.innerWidth - 120, 900)} />
          </div>
        )}

        {slide.type === 'adversaire' && (
          <div style={{ display: 'flex', gap: isLandscapeCourt ? '28px' : '64px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { nom: equipeNom || 'Nous', rang: f.notre_classement, pts: f.notre_points, color: '#4ade80' },
              { nom: f.adversaire, rang: f.adversaire_classement, pts: f.adversaire_points, color: slide.accent },
            ].map((e, i) => (
              <div key={i}>
                <p style={{ margin: 0, color: e.color, fontWeight: 900, fontSize: isLandscapeCourt ? 'clamp(24px, 7vh, 60px)' : 'clamp(48px, 8vw, 96px)', lineHeight: 1 }}>{e.rang ? `${e.rang}e` : '—'}</p>
                <p style={{ margin: '8px 0 0', color: pal.texteFaint, fontSize: isLandscapeCourt ? '12px' : '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>{e.nom}</p>
                {e.pts != null && <p style={{ margin: '4px 0 0', color: pal.texteFort, fontSize: isLandscapeCourt ? '13px' : '18px' }}>{e.pts} pts</p>}
              </div>
            ))}
          </div>
        )}

        {slide.type === 'message' && (
          <p style={{ margin: 0, color: pal.texteFort, fontSize: isLandscapeCourt ? 'clamp(16px, 4vh, 30px)' : 'clamp(24px, 3.5vw, 40px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.4, maxWidth: '1000px' }}>« {f.message_coach} »</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isLandscapeCourt ? '10px' : '16px', padding: isLandscapeCourt ? '8px 20px' : '24px 40px', flexShrink: 0 }}>
        <button onClick={() => setSlideIdx(i => Math.max(i - 1, 0))} disabled={idx === 0} style={{ ...navBtn, opacity: idx === 0 ? 0.3 : 1 }}>‹</button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {slides.map((s, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} title={s.titre}
              style={{ width: i === idx ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === idx ? s.accent : pal.dotInactif, border: 'none', cursor: 'pointer', transition: 'width 0.2s' }} />
          ))}
        </div>
        <button onClick={() => setSlideIdx(i => Math.min(i + 1, total - 1))} disabled={idx === total - 1} style={{ ...navBtn, opacity: idx === total - 1 ? 0.3 : 1 }}>›</button>
      </div>
    </div>,
    document.body
  )
}

export default function CauserieAvantMatch({ userId, equipeNom, equipeActiveId, equipeUnique = true, clubId, joueurs = [] }) {
  const colors = useColors()
  const [vue, setVue] = useState('liste') // 'liste' | 'form' | 'fiche'
  const [fiches, setFiches] = useState([])
  const [ficheCourante, setFicheCourante] = useState(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [presentationOuverte, setPresentationOuverte] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(null) // id de la fiche dont le menu "…" est ouvert, vue liste
  const [tactipadsDispo, setTactipadsDispo] = useState([]) // schémas Tactipad de l'éducateur, pour le sélecteur "Mouvement tactique"
  const [tactipadsLoaded, setTactipadsLoaded] = useState(false) // évite d'ouvrir la présentation avant la fin du chargement — sinon les slides "Mouvement tactique" liées à f.tactipad_ids sont silencieusement absentes de la première ouverture (tactipadsDispo encore vide)
  const [avatarsParJoueurId, setAvatarsParJoueurId] = useState({}) // profiles.avatar_url — equipe_joueurs n'a pas cette colonne
  const [compoModal, setCompoModal] = useState(null) // { type: 'titulaire', slotIndex } | { type: 'remplacant' }
  const [savingCompo, setSavingCompo] = useState(false)

  const [form, setForm] = useState(formVide)
  const [saving, setSaving] = useState(false)

  const charger = async () => {
    // equipeActiveId : un coach peut gérer plusieurs équipes (switcher) — sans
    // ce filtre, les fiches causerie des deux équipes se mélangeraient. Les
    // fiches pas encore rattachées (club_categorie_id null, créées avant ce
    // filtre) restent visibles uniquement si ce coach n'a qu'UNE équipe —
    // sinon impossible de savoir laquelle sans deviner, cf. auto-guérison à
    // la sauvegarde (sauvegarder() republie club_categorie_id à chaque modif).
    const { data, error } = await supabase.from('causeries').select('*').eq('educateur_id', userId).order('date_match', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      return
    }
    setTableMissing(false)
    const filtrees = equipeActiveId
      ? (data || []).filter(f => f.club_categorie_id === equipeActiveId || (f.club_categorie_id == null && equipeUnique))
      : (data || [])
    setFiches(filtrees.map(normaliserFiche))
  }

  // tactipads volontairement PAS filtré par équipe : un schéma tactique n'est
  // pas spécifique à un groupe d'âge, reste partagé entre les équipes du coach.
  const chargerTactipads = async () => {
    const { data, error } = await supabase.from('tactipads').select('id, nom, schema').eq('educateur_id', userId).order('created_at', { ascending: false })
    if (error) console.error('chargerTactipads (Causerie) error:', error)
    setTactipadsDispo(data || [])
    setTactipadsLoaded(true)
  }

  useEffect(() => { if (userId) { charger(); chargerTactipads() } }, [userId, equipeActiveId])

  // equipe_joueurs n'a pas de colonne avatar — snapshot resolu ici puis
  // stocké tel quel dans titulaires/remplacants au moment de la sélection
  // (comme educateur_nom ailleurs dans l'app), pas rejoint en live à chaque
  // affichage.
  useEffect(() => {
    const ids = [...new Set(joueurs.map(j => j.joueur_id).filter(Boolean))]
    if (ids.length === 0) { setAvatarsParJoueurId({}); return }
    supabase.from('profiles').select('id, avatar_url').in('id', ids).then(({ data }) => {
      const map = {}
      ;(data || []).forEach(p => { map[p.id] = p.avatar_url })
      setAvatarsParJoueurId(map)
    })
  }, [joueurs])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Gestion des listes dynamiques (animation, CPA, tireurs)
  const setLigne = (champ, i, val) => {
    setForm(p => {
      const arr = [...p[champ]]
      arr[i] = val
      return { ...p, [champ]: arr }
    })
  }
  const ajouterLigne = (champ) => setForm(p => ({ ...p, [champ]: [...p[champ], ''] }))
  const toggleTactipad = (id) => setForm(p => ({
    ...p,
    tactipad_ids: p.tactipad_ids.includes(id) ? p.tactipad_ids.filter(i => i !== id) : [...p.tactipad_ids, id],
  }))
  const supprimerLigne = (champ, i) => setForm(p => {
    const arr = p[champ].filter((_, idx) => idx !== i)
    return { ...p, [champ]: arr.length ? arr : [''] }
  })

  const sauvegarder = async () => {
    if (!form.adversaire.trim()) { alert("Renseigne le nom de l'adversaire.") ; return }
    setSaving(true)
    const numOuNull = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10))
    const payload = {
      educateur_id: userId,
      club_id: clubId || null,
      club_categorie_id: equipeActiveId || null,
      equipe: equipeNom || null,
      adversaire: form.adversaire.trim(),
      date_match: form.date_match || null,
      heure_match: form.heure_match || null,
      domicile_exterieur: form.domicile_exterieur,
      type_match: form.type_match,
      objectifs: form.objectifs || null,
      match_aller_resultat: form.match_aller_resultat || null,
      notre_classement: numOuNull(form.notre_classement),
      notre_points: numOuNull(form.notre_points),
      notre_buts_pour: numOuNull(form.notre_buts_pour),
      notre_buts_contre: numOuNull(form.notre_buts_contre),
      adversaire_classement: numOuNull(form.adversaire_classement),
      adversaire_points: numOuNull(form.adversaire_points),
      adversaire_buts_pour: numOuNull(form.adversaire_buts_pour),
      adversaire_buts_contre: numOuNull(form.adversaire_buts_contre),
      meteo: form.meteo,
      temperature: numOuNull(form.temperature),
      animation_avec_ballon: form.animation_avec_ballon.filter(Boolean),
      animation_sans_ballon: form.animation_sans_ballon.filter(Boolean),
      cpa_offensifs: form.cpa_offensifs.filter(Boolean),
      cpa_defensifs: form.cpa_defensifs.filter(Boolean),
      tireurs: form.tireurs.filter(Boolean),
      transitions: form.transitions.filter(Boolean),
      cles_du_match: form.cles_du_match.filter(Boolean),
      premieres_minutes: form.premieres_minutes.filter(Boolean),
      message_coach: form.message_coach.trim() || null,
      schema_cpa_offensif: form.schema_cpa_offensif || { etapes: [{ joueurs: [], ballon: null }] },
      schema_cpa_defensif: form.schema_cpa_defensif || { etapes: [{ joueurs: [], ballon: null }] },
      tactipad_ids: form.tactipad_ids || [],
    }
    const res = ficheCourante?.id
      ? await supabase.from('causeries').update(payload).eq('id', ficheCourante.id).select().single()
      : await supabase.from('causeries').insert(payload).select().single()
    setSaving(false)
    if (res.error) { alert('Erreur : ' + res.error.message); return }
    setFicheCourante(normaliserFiche(res.data))
    await charger()
    setVue('fiche')
  }

  const ouvrirFiche = (f) => {
    setFicheCourante(f)
    setVue('fiche')
  }

  const editer = (f) => {
    setFicheCourante(f)
    setForm({
      adversaire: f.adversaire || '',
      date_match: f.date_match || '',
      heure_match: f.heure_match ? f.heure_match.slice(0, 5) : '',
      domicile_exterieur: f.domicile_exterieur || 'domicile',
      type_match: f.type_match || 'championnat',
      objectifs: f.objectifs || '',
      match_aller_resultat: f.match_aller_resultat || '',
      notre_classement: f.notre_classement ?? '',
      notre_points: f.notre_points ?? '',
      notre_buts_pour: f.notre_buts_pour ?? '',
      notre_buts_contre: f.notre_buts_contre ?? '',
      adversaire_classement: f.adversaire_classement ?? '',
      adversaire_points: f.adversaire_points ?? '',
      adversaire_buts_pour: f.adversaire_buts_pour ?? '',
      adversaire_buts_contre: f.adversaire_buts_contre ?? '',
      meteo: f.meteo || 'soleil',
      temperature: f.temperature ?? '',
      animation_avec_ballon: f.animation_avec_ballon?.length ? f.animation_avec_ballon : [''],
      animation_sans_ballon: f.animation_sans_ballon?.length ? f.animation_sans_ballon : [''],
      cpa_offensifs: f.cpa_offensifs?.length ? f.cpa_offensifs : [''],
      cpa_defensifs: f.cpa_defensifs?.length ? f.cpa_defensifs : [''],
      tireurs: f.tireurs?.length ? f.tireurs : [''],
      transitions: f.transitions?.length ? f.transitions : [''],
      cles_du_match: f.cles_du_match?.length ? f.cles_du_match : [''],
      premieres_minutes: f.premieres_minutes?.length ? f.premieres_minutes : [''],
      message_coach: f.message_coach || '',
      schema_cpa_offensif: f.schema_cpa_offensif || { etapes: [{ joueurs: [], ballon: null }] },
      schema_cpa_defensif: f.schema_cpa_defensif || { etapes: [{ joueurs: [], ballon: null }] },
      tactipad_ids: f.tactipad_ids || [],
    })
    setVue('form')
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette fiche ?')) return
    await supabase.from('causeries').delete().eq('id', id)
    await charger()
    setVue('liste')
  }

  const dupliquer = async (f) => {
    const rest = { ...f }
    delete rest.id
    delete rest.created_at
    delete rest.updated_at
    const { error } = await supabase.from('causeries').insert({ ...rest, educateur_id: userId, club_id: clubId || null })
    if (error) { alert('Erreur lors de la duplication : ' + error.message); return }
    await charger()
  }

  // ─── Composition (terrain, titulaires/remplaçants/formation) ───────────
  // Sauvegardé à chaque changement (pas de bouton "Enregistrer" dédié) —
  // met à jour ficheCourante ET la liste fiches en local pour rester
  // cohérent si l'éducateur retourne à la vue liste puis rouvre la fiche.
  const patchComposition = async (champs) => {
    if (!ficheCourante?.id) return
    setFicheCourante(f => ({ ...f, ...champs }))
    setFiches(fs => fs.map(f => f.id === ficheCourante.id ? { ...f, ...champs } : f))
    setSavingCompo(true)
    await supabase.from('causeries').update(champs).eq('id', ficheCourante.id)
    setSavingCompo(false)
  }

  const changerFormationCompo = (formation) => patchComposition({ formation })

  const changerAffichageNomCompo = (composition_affichage_nom) => patchComposition({ composition_affichage_nom })

  const toggleCompositionPubliee = () => patchComposition({ composition_publiee: !ficheCourante?.composition_publiee })

  // exclureId : le joueur actuellement dans le slot en cours d'édition ne
  // doit pas apparaître "indisponible" — sinon impossible de le resélectionner
  // pour juste changer son numéro.
  const dejaUtilisesCompo = (exclureId) => {
    const t = (ficheCourante?.titulaires || []).filter(Boolean).map(j => j.joueur_id)
    const r = (ficheCourante?.remplacants || []).map(j => j.joueur_id)
    return new Set([...t, ...r].filter(id => id !== exclureId))
  }

  const confirmerSelectionCompo = (joueur) => {
    if (!compoModal) return
    const avecAvatar = { ...joueur, avatar_url: joueur.avatar_url || avatarsParJoueurId[joueur.joueur_id] || null }
    if (compoModal.type === 'titulaire') {
      const titulaires = [...(ficheCourante.titulaires || [])]
      titulaires[compoModal.slotIndex] = avecAvatar
      patchComposition({ titulaires })
    } else {
      const remplacants = [...(ficheCourante.remplacants || []), avecAvatar]
      patchComposition({ remplacants })
    }
    setCompoModal(null)
  }

  const confirmerSelectionMultipleCompo = (joueursChoisis) => {
    const avecAvatars = joueursChoisis.map(j => ({ ...j, avatar_url: j.avatar_url || avatarsParJoueurId[j.joueur_id] || null }))
    patchComposition({ remplacants: [...(ficheCourante.remplacants || []), ...avecAvatars] })
    setCompoModal(null)
  }

  const retirerTitulaireCompo = (slotIndex) => {
    const titulaires = [...(ficheCourante.titulaires || [])]
    titulaires[slotIndex] = null
    patchComposition({ titulaires })
  }

  const retirerRemplacantCompo = (idx) => {
    patchComposition({ remplacants: (ficheCourante.remplacants || []).filter((_, i) => i !== idx) })
  }

  // ─── Styles ────────────────────────────────────────────────────────────
  const card = { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '20px' }
  const label = { display: 'block', color: colors.text.dim, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }
  const inp = { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '8px', color: colors.text.primary, fontSize: '14px', padding: '9px 12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const txa = { ...inp, minHeight: '75px', resize: 'vertical', lineHeight: 1.6 }
  const btnG = { background: '#4ade80', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, fontSize: '14px', padding: '10px 22px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const btnO = { background: 'none', border: `1px solid ${colors.border.faint}`, borderRadius: '10px', color: colors.text.faint, fontSize: '13px', padding: '9px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const numInp = { ...inp, width: '70px' }
  const sectionTitle = (num, color, txt) => (
    <p style={{ margin: '0 0 14px', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', color: colors.text.primary, borderLeft: `3px solid ${color}`, paddingLeft: '10px' }}>
      <span style={{ color, marginRight: '6px' }}>{num}</span>{txt}
    </p>
  )

  if (tableMissing) {
    return (
      <div style={{ background: '#1a1a00', border: '1px solid #f59e0b40', borderRadius: '12px', padding: 24 }}>
        <div style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ La table <code>causeries</code> n'existe pas encore en base (ou vient d'être recréée avec un nouveau format).</div>
        <div style={{ color: colors.text.faint, fontSize: 14, marginTop: 4 }}>Exécute supabase_causeries.sql dans l'éditeur SQL Supabase.</div>
      </div>
    )
  }

  // ─── VUE LISTE ─────────────────────────────────────────────────────────
  if (vue === 'liste') return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: colors.text.primary, fontSize: '22px', fontWeight: 800 }}>Causerie avant match</h2>
          <p style={{ margin: '4px 0 0', color: colors.text.dim, fontSize: '13px' }}>Fiches de préparation visuelles à afficher dans le vestiaire</p>
        </div>
        <button onClick={() => { setForm(formVide()); setFicheCourante(null); setVue('form') }} style={btnG}>+ Nouvelle fiche</button>
      </div>

      {fiches.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📋</p>
          <p style={{ color: colors.text.faint, fontSize: '14px', margin: 0 }}>Aucune fiche pour l'instant.<br />Crée ta première préparation de match.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {fiches.map(f => {
            const meteoIco = METEO_OPTIONS.find(m => m.val === f.meteo)?.icon || ''
            const typeLabel = TYPE_MATCH.find(t => t.val === f.type_match)?.label || ''
            return (
              <div key={f.id} onClick={() => ouvrirFiche(f)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '44px', height: '44px', background: colors.background.base, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚽</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: colors.text.primary, fontWeight: 700, fontSize: '15px' }}>
                    {f.domicile_exterieur === 'domicile' ? '🏠' : '✈️'} vs {f.adversaire}
                  </p>
                  <p style={{ margin: '3px 0 0', color: colors.text.dim, fontSize: '12px' }}>
                    {f.date_match ? new Date(f.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) : '—'}
                    {' · '}{typeLabel}
                    {f.temperature != null ? ` · ${meteoIco} ${f.temperature}°C` : f.meteo ? ` · ${meteoIco}` : ''}
                  </p>
                </div>
                {f.notre_classement && f.adversaire_classement && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: '#4ade80', fontWeight: 800, fontSize: '18px' }}>
                      {f.notre_classement}<span style={{ color: colors.text.ghost, fontSize: '12px' }}> vs </span>{f.adversaire_classement}
                    </p>
                    <p style={{ margin: 0, color: colors.text.dim, fontSize: '10px' }}>Classement</p>
                  </div>
                )}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOuvert(menuOuvert === f.id ? null : f.id) }}
                    style={{ background: 'none', border: `1px solid ${colors.border.faint}`, borderRadius: '8px', color: colors.text.dim, fontSize: '16px', width: '32px', height: '32px', cursor: 'pointer', lineHeight: 1 }}
                  >⋯</button>
                  {menuOuvert === f.id && (
                    <>
                      <div onClick={e => { e.stopPropagation(); setMenuOuvert(null) }} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '38px', right: 0, background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', overflow: 'hidden', zIndex: 11, minWidth: '150px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        <button onClick={() => { setMenuOuvert(null); editer(f) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Modifier</button>
                        <button onClick={() => { setMenuOuvert(null); dupliquer(f) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: `1px solid ${colors.border.faint}` }}>Dupliquer</button>
                        <button onClick={() => { setMenuOuvert(null); supprimer(f.id) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#f87171', fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: `1px solid ${colors.border.faint}` }}>Supprimer</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── VUE FORMULAIRE ────────────────────────────────────────────────────
  if (vue === 'form') return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setVue('liste')} style={btnO}>← Retour</button>
        <h2 style={{ margin: 0, color: colors.text.primary, fontSize: '20px', fontWeight: 800 }}>{ficheCourante ? 'Modifier la fiche' : 'Nouvelle fiche de match'}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div style={card}>
          {sectionTitle('01', '#4ade80', 'Contexte du match')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={label}>Adversaire *</label>
              <input style={inp} placeholder="AS Monaco U17…" value={form.adversaire} onChange={e => set('adversaire', e.target.value)} />
            </div>
            <div>
              <label style={label}>Type de match</label>
              <select style={inp} value={form.type_match} onChange={e => set('type_match', e.target.value)}>
                {TYPE_MATCH.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Date du match</label>
              <input type="date" style={inp} value={form.date_match} onChange={e => set('date_match', e.target.value)} />
            </div>
            <div>
              <label style={label}>Heure</label>
              <input type="time" style={inp} value={form.heure_match} onChange={e => set('heure_match', e.target.value)} />
            </div>
            <div>
              <label style={label}>Lieu</label>
              <select style={inp} value={form.domicile_exterieur} onChange={e => set('domicile_exterieur', e.target.value)}>
                <option value="domicile">🏠 Domicile</option>
                <option value="exterieur">✈️ Extérieur</option>
              </select>
            </div>
            <div>
              <label style={label}>Match aller — résultat</label>
              <input style={inp} placeholder="Victoire 2-1, Défaite 0-3…" value={form.match_aller_resultat} onChange={e => set('match_aller_resultat', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>Objectifs du match</label>
            <textarea style={txa} placeholder="Gagner pour rester dans le top 5, tester le nouveau système…" value={form.objectifs} onChange={e => set('objectifs', e.target.value)} />
          </div>
        </div>

        <div style={card}>
          {sectionTitle('02', '#60a5fa', 'Classements & statistiques')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ ...label, color: '#4ade80', marginBottom: '10px' }}>🟢 {equipeNom || 'Notre équipe'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={label}>Place</label><input type="number" style={numInp} placeholder="3" value={form.notre_classement} onChange={e => set('notre_classement', e.target.value)} /></div>
                <div><label style={label}>Points</label><input type="number" style={numInp} placeholder="21" value={form.notre_points} onChange={e => set('notre_points', e.target.value)} /></div>
                <div><label style={label}>Buts marqués</label><input type="number" style={numInp} placeholder="18" value={form.notre_buts_pour} onChange={e => set('notre_buts_pour', e.target.value)} /></div>
                <div><label style={label}>Buts encaissés</label><input type="number" style={numInp} placeholder="9" value={form.notre_buts_contre} onChange={e => set('notre_buts_contre', e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p style={{ ...label, color: '#f87171', marginBottom: '10px' }}>🔴 {form.adversaire || 'Adversaire'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={label}>Place</label><input type="number" style={numInp} placeholder="1" value={form.adversaire_classement} onChange={e => set('adversaire_classement', e.target.value)} /></div>
                <div><label style={label}>Points</label><input type="number" style={numInp} placeholder="28" value={form.adversaire_points} onChange={e => set('adversaire_points', e.target.value)} /></div>
                <div><label style={label}>Buts marqués</label><input type="number" style={numInp} placeholder="24" value={form.adversaire_buts_pour} onChange={e => set('adversaire_buts_pour', e.target.value)} /></div>
                <div><label style={label}>Buts encaissés</label><input type="number" style={numInp} placeholder="7" value={form.adversaire_buts_contre} onChange={e => set('adversaire_buts_contre', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          {sectionTitle('03', '#fbbf24', 'Conditions & météo')}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {METEO_OPTIONS.map(m => (
              <button key={m.val} onClick={() => set('meteo', m.val)}
                style={{
                  background: form.meteo === m.val ? 'rgba(251,191,36,0.15)' : colors.background.base,
                  border: `1px solid ${form.meteo === m.val ? '#fbbf24' : colors.border.faint}`,
                  borderRadius: '8px', color: form.meteo === m.val ? '#fbbf24' : colors.text.faint,
                  fontSize: '13px', fontWeight: 600, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div style={{ maxWidth: '160px' }}>
            <label style={label}>Température (°C)</label>
            <input type="number" style={inp} placeholder="18" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
          </div>
        </div>

        <div style={card}>
          {sectionTitle('04', '#818cf8', 'Animation avec ballon')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Consignes offensives, organisation avec ballon</p>
          <ListeChamp valeurs={form.animation_avec_ballon} onChange={(i, v) => setLigne('animation_avec_ballon', i, v)} onAjouter={() => ajouterLigne('animation_avec_ballon')} onSupprimer={i => supprimerLigne('animation_avec_ballon', i)} inputStyle={inp} placeholder="Ex: Jouer derrière leur ligne défensive, exploiter les espaces…" />
        </div>

        <div style={card}>
          {sectionTitle('05', '#f97316', 'Animation sans ballon')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Consignes défensives, organisation sans ballon</p>
          <ListeChamp valeurs={form.animation_sans_ballon} onChange={(i, v) => setLigne('animation_sans_ballon', i, v)} onAjouter={() => ajouterLigne('animation_sans_ballon')} onSupprimer={i => supprimerLigne('animation_sans_ballon', i)} inputStyle={inp} placeholder="Ex: Rester compact, presser haut sur leur relance…" />
        </div>

        <div style={card}>
          {sectionTitle('06', '#2dd4bf', 'Transitions')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Ce qu'on fait dès la perte ou la récupération du ballon</p>
          <ListeChamp valeurs={form.transitions} onChange={(i, v) => setLigne('transitions', i, v)} onAjouter={() => ajouterLigne('transitions')} onSupprimer={i => supprimerLigne('transitions', i)} inputStyle={inp} placeholder="Ex: Contre-presser 5 secondes après la perte…" />
        </div>

        <div style={card}>
          {sectionTitle('07', '#22d3ee', 'Coups de pied arrêtés')}

          <div style={{ marginBottom: '24px' }}>
            <p style={{ ...label, color: '#4ade80', marginBottom: '10px' }}>⚽ Offensifs — Corners, CFL, Penalties</p>
            <div style={{ marginBottom: '12px' }}>
              <ListeChamp valeurs={form.cpa_offensifs} onChange={(i, v) => setLigne('cpa_offensifs', i, v)} onAjouter={() => ajouterLigne('cpa_offensifs')} onSupprimer={i => supprimerLigne('cpa_offensifs', i)} inputStyle={inp} placeholder="Ex: Corner entrant côté droit, n°9 au 1er poteau…" />
            </div>
            <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 10px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Schéma CPA Offensif</p>
              <TacticalBoard data={form.schema_cpa_offensif} onChange={val => set('schema_cpa_offensif', val)} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ ...label, color: '#f87171', marginBottom: '10px' }}>🛡️ Défensifs</p>
            <div style={{ marginBottom: '12px' }}>
              <ListeChamp valeurs={form.cpa_defensifs} onChange={(i, v) => setLigne('cpa_defensifs', i, v)} onAjouter={() => ajouterLigne('cpa_defensifs')} onSupprimer={i => supprimerLigne('cpa_defensifs', i)} inputStyle={inp} placeholder="Ex: Zone sur corner, le n°5 sur le 2ème poteau…" />
            </div>
            <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 10px', color: '#f87171', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Schéma CPA Défensif</p>
              <TacticalBoard data={form.schema_cpa_defensif} onChange={val => set('schema_cpa_defensif', val)} />
            </div>
          </div>

          <div>
            <p style={{ ...label, color: '#fbbf24', marginBottom: '10px' }}>🎯 Tireurs</p>
            <ListeChamp valeurs={form.tireurs} onChange={(i, v) => setLigne('tireurs', i, v)} onAjouter={() => ajouterLigne('tireurs')} onSupprimer={i => supprimerLigne('tireurs', i)} inputStyle={inp} placeholder="Ex: Kevin (penaltys), Mehdi (CFL directs)…" />
          </div>
        </div>

        <div style={card}>
          {sectionTitle('08', '#fbbf24', 'Nos clés du match')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Les points à ne pas oublier — l'essentiel à retenir</p>
          <ListeChamp valeurs={form.cles_du_match} onChange={(i, v) => setLigne('cles_du_match', i, v)} onAjouter={() => ajouterLigne('cles_du_match')} onSupprimer={i => supprimerLigne('cles_du_match', i)} inputStyle={inp} placeholder="Ex: Gagner les duels aériens sur coup de pied arrêté…" />
        </div>

        <div style={card}>
          {sectionTitle('09', '#60a5fa', 'Premières minutes')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Comment on démarre le match</p>
          <ListeChamp valeurs={form.premieres_minutes} onChange={(i, v) => setLigne('premieres_minutes', i, v)} onAjouter={() => ajouterLigne('premieres_minutes')} onSupprimer={i => supprimerLigne('premieres_minutes', i)} inputStyle={inp} placeholder="Ex: Presser haut d'entrée, montrer qu'on est prêts…" />
        </div>

        <div style={card}>
          {sectionTitle('10', '#a78bfa', 'Message du coach')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>Le mot de la fin, celui qu'on garde en tête en rentrant sur le terrain</p>
          <textarea style={txa} placeholder="Ex: On a tout ce qu'il faut pour gagner ce match, on y croit du premier au dernier ballon…" value={form.message_coach} onChange={e => set('message_coach', e.target.value)} />
        </div>

        <div style={card}>
          {sectionTitle('11', '#38bdf8', 'Mouvement tactique')}
          <p style={{ margin: '0 0 12px', color: colors.text.dim, fontSize: '12px' }}>
            Mouvements enregistrés dans le Tactipad à montrer à l'équipe pendant la causerie (schémas animés)
          </p>
          {tactipadsDispo.length === 0 ? (
            <p style={{ color: colors.text.dim, fontSize: '13px', fontStyle: 'italic' }}>
              Aucun schéma enregistré pour l'instant — crée-en un dans l'onglet Tactipad.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tactipadsDispo.map(tp => {
                const selectionne = form.tactipad_ids.includes(tp.id)
                const nbEtapes = tp.schema?.sequences?.length || 1
                return (
                  <label key={tp.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    background: selectionne ? '#0d1f2a' : colors.background.base, border: `1px solid ${selectionne ? '#38bdf866' : colors.border.faint}`,
                    borderRadius: '8px', cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={selectionne} onChange={() => toggleTactipad(tp.id)} style={{ accentColor: '#38bdf8' }} />
                    <span style={{ color: colors.text.primary, fontSize: '13px', flex: 1 }}>{tp.nom || 'Sans titre'}</span>
                    <span style={{ color: nbEtapes > 1 ? '#38bdf8' : colors.text.dim, fontSize: '11px', fontWeight: 600 }}>
                      {nbEtapes > 1 ? `Animation · ${nbEtapes} étapes` : 'Schéma statique'}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '32px' }}>
          <button onClick={() => setVue('liste')} style={btnO}>Annuler</button>
          <button onClick={sauvegarder} disabled={saving} style={{ ...btnG, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Sauvegarde…' : '✅ Enregistrer la fiche'}
          </button>
        </div>
      </div>
    </div>
  )

  // ─── VUE FICHE (affichage vestiaire) ───────────────────────────────────
  const f = ficheCourante || {}
  const meteoObj = METEO_OPTIONS.find(m => m.val === f.meteo)
  const typeLabel = TYPE_MATCH.find(t => t.val === f.type_match)?.label || ''
  const dateLabel = f.date_match ? new Date(f.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const contenuFiche = (
    <div style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '20px', overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: colors.text.primary }}>
      <div style={{ background: 'linear-gradient(135deg, #0f2010 0%, #080808 60%)', borderBottom: `1px solid ${colors.border.faint}`, padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{typeLabel.toUpperCase()}</span>
              <span style={{ background: 'rgba(255,255,255,0.06)', color: colors.text.faint, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 }}>
                {f.domicile_exterieur === 'domicile' ? '🏠 Domicile' : '✈️ Extérieur'}
              </span>
              {f.match_aller_resultat && (
                <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 }}>Aller : {f.match_aller_resultat}</span>
              )}
            </div>
            <h1 style={{ margin: 0, color: colors.text.primary, fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {equipeNom || 'Nous'} <span style={{ color: '#4ade80' }}>vs</span> {f.adversaire}
            </h1>
            <p style={{ margin: '8px 0 0', color: colors.text.faint, fontSize: '14px' }}>
              {dateLabel}{f.heure_match ? ` à ${f.heure_match.slice(0, 5)}` : ''}
              {meteoObj ? `  ·  ${meteoObj.icon} ${meteoObj.label}` : ''}
              {f.temperature != null ? ` ${f.temperature}°C` : ''}
            </p>
          </div>
          {(f.notre_classement || f.adversaire_classement) && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { nom: equipeNom || 'Nous', rang: f.notre_classement, pts: f.notre_points, bp: f.notre_buts_pour, bc: f.notre_buts_contre, color: '#4ade80' },
                { nom: f.adversaire, rang: f.adversaire_classement, pts: f.adversaire_points, bp: f.adversaire_buts_pour, bc: f.adversaire_buts_contre, color: '#f87171' },
              ].map((e, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${e.color}22`, borderRadius: '12px', padding: '14px 18px', textAlign: 'center', minWidth: '110px' }}>
                  <p style={{ margin: 0, color: e.color, fontWeight: 900, fontSize: '28px', lineHeight: 1 }}>{e.rang ? `${e.rang}e` : '—'}</p>
                  <p style={{ margin: '4px 0 2px', color: colors.text.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{e.nom}</p>
                  <p style={{ margin: 0, color: colors.text.primary, fontSize: '12px', fontWeight: 600 }}>{e.pts != null ? `${e.pts} pts` : ''}</p>
                  {(e.bp != null || e.bc != null) && <p style={{ margin: '2px 0 0', color: colors.text.dim, fontSize: '11px' }}>{e.bp ?? '?'} / {e.bc ?? '?'}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {f.objectifs && (
          <div style={{ marginTop: '16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
            <p style={{ margin: '0 0 4px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Objectifs</p>
            <p style={{ margin: 0, color: colors.text.secondary, fontSize: '14px', lineHeight: 1.6 }}>{f.objectifs}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${colors.border.faint}` }}>
        <div style={{ padding: '24px', borderRight: `1px solid ${colors.border.faint}` }}>
          <p style={{ margin: '0 0 14px', color: '#818cf8', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>⚽ Avec ballon</p>
          {(f.animation_avec_ballon || []).filter(Boolean).map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ color: '#818cf8', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
            </div>
          ))}
          {!(f.animation_avec_ballon || []).filter(Boolean).length && <p style={{ color: colors.text.ghost, fontSize: '13px', fontStyle: 'italic' }}>—</p>}
        </div>

        <div style={{ padding: '24px', borderRight: `1px solid ${colors.border.faint}` }}>
          <p style={{ margin: '0 0 14px', color: '#f97316', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🛡️ Sans ballon</p>
          {(f.animation_sans_ballon || []).filter(Boolean).map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ color: '#f97316', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
              <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
            </div>
          ))}
          {!(f.animation_sans_ballon || []).filter(Boolean).length && <p style={{ color: colors.text.ghost, fontSize: '13px', fontStyle: 'italic' }}>—</p>}
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 14px', color: '#22d3ee', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎯 Coups de pied arrêtés</p>
          {(f.cpa_offensifs || []).filter(Boolean).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#4ade80', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offensifs</p>
              {(f.cpa_offensifs || []).filter(Boolean).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{pt}</p>
                </div>
              ))}
            </div>
          )}
          {boardEstRempli(f.schema_cpa_offensif) && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#4ade80', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schéma offensif</p>
              <TacticalBoard data={f.schema_cpa_offensif} onChange={() => {}} readOnly />
            </div>
          )}
          {(f.cpa_defensifs || []).filter(Boolean).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#f87171', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Défensifs</p>
              {(f.cpa_defensifs || []).filter(Boolean).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#f87171', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{pt}</p>
                </div>
              ))}
            </div>
          )}
          {boardEstRempli(f.schema_cpa_defensif) && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#f87171', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schéma défensif</p>
              <TacticalBoard data={f.schema_cpa_defensif} onChange={() => {}} readOnly />
            </div>
          )}
          {(f.tireurs || []).filter(Boolean).length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', color: '#fbbf24', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tireurs</p>
              {(f.tireurs || []).filter(Boolean).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {((f.transitions || []).filter(Boolean).length > 0 || (f.cles_du_match || []).filter(Boolean).length > 0 || (f.premieres_minutes || []).filter(Boolean).length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${colors.border.faint}` }}>
          <div style={{ padding: '24px', borderRight: `1px solid ${colors.border.faint}` }}>
            <p style={{ margin: '0 0 14px', color: '#2dd4bf', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🔄 Transitions</p>
            {(f.transitions || []).filter(Boolean).map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#2dd4bf', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
                <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
              </div>
            ))}
            {!(f.transitions || []).filter(Boolean).length && <p style={{ color: colors.text.ghost, fontSize: '13px', fontStyle: 'italic' }}>—</p>}
          </div>
          <div style={{ padding: '24px', borderRight: `1px solid ${colors.border.faint}` }}>
            <p style={{ margin: '0 0 14px', color: '#fbbf24', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🔑 Nos clés du match</p>
            {(f.cles_du_match || []).filter(Boolean).map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
                <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
              </div>
            ))}
            {!(f.cles_du_match || []).filter(Boolean).length && <p style={{ color: colors.text.ghost, fontSize: '13px', fontStyle: 'italic' }}>—</p>}
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: '0 0 14px', color: '#60a5fa', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>⏱️ Premières minutes</p>
            {(f.premieres_minutes || []).filter(Boolean).map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#60a5fa', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
                <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
              </div>
            ))}
            {!(f.premieres_minutes || []).filter(Boolean).length && <p style={{ color: colors.text.ghost, fontSize: '13px', fontStyle: 'italic' }}>—</p>}
          </div>
        </div>
      )}

      {f.message_coach && (
        <div style={{ padding: '28px 32px', borderBottom: `1px solid ${colors.border.faint}`, background: 'rgba(167,139,250,0.04)' }}>
          <p style={{ margin: '0 0 10px', color: '#a78bfa', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎤 Message du coach</p>
          <p style={{ margin: 0, color: colors.text.secondary, fontSize: '16px', lineHeight: 1.7, fontStyle: 'italic' }}>« {f.message_coach} »</p>
        </div>
      )}

      {(f.tactipad_ids || []).length > 0 && (
        <div style={{ padding: '28px 32px', borderBottom: `1px solid ${colors.border.faint}` }}>
          <p style={{ margin: '0 0 16px', color: '#38bdf8', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎯 Mouvement tactique</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {f.tactipad_ids.map(id => {
              const tp = tactipadsDispo.find(t => t.id === id)
              if (!tp) return null
              return (
                <div key={id}>
                  <p style={{ margin: '0 0 8px', color: colors.text.faint, fontSize: '13px', fontWeight: 600 }}>{tp.nom || 'Sans titre'}</p>
                  <TactipadViewer schema={tp.schema} width={Math.min(680, window.innerWidth - 96)} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: colors.text.ghost, fontSize: '12px' }}>Digital Football — Fiche préparée par {equipeNom || "l'équipe"}</p>
        <p style={{ margin: 0, color: colors.text.ghost, fontSize: '12px' }}>{dateLabel}</p>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setVue('liste')} style={btnO}>← Fiches</button>
        <button onClick={() => editer(f)} style={btnO}>Modifier</button>
        <button onClick={async () => { await dupliquer(f); setVue('liste') }} style={btnO}>Dupliquer</button>
        <button onClick={() => setPresentationOuverte(true)} disabled={!tactipadsLoaded} style={{ ...btnO, color: '#a78bfa', borderColor: '#a78bfa44', opacity: tactipadsLoaded ? 1 : 0.5, cursor: tactipadsLoaded ? 'pointer' : 'default' }}>
          {tactipadsLoaded ? '📺 Présenter la causerie' : 'Chargement…'}
        </button>
        <button onClick={() => window.print()} style={{ ...btnO, color: '#4ade80', borderColor: '#4ade8044' }}>🖨️ Imprimer</button>
        <button onClick={() => supprimer(f.id)} style={{ ...btnO, color: '#f87171', borderColor: '#f8717133' }}>Supprimer</button>
      </div>

      {/* Aperçu à l'écran */}
      {contenuFiche}

      {/* Composition — terrain visuel, propre à cette fiche. Visible par les
          joueurs du groupe (lecture seule) une fois publiée, via
          mes_compositions_publiees() côté DashboardJoueur.jsx. */}
      <div style={{ ...card, marginTop: '20px', padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', color: colors.text.primary }}>Composition</p>
          <button onClick={toggleCompositionPubliee} disabled={savingCompo} style={{
            background: f.composition_publiee ? '#4ade8022' : colors.background.raised,
            border: `1px solid ${f.composition_publiee ? '#4ade80' : colors.border.default}`,
            color: f.composition_publiee ? '#4ade80' : colors.text.faint,
            borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            {f.composition_publiee ? 'Visible par les joueurs' : 'Masquée aux joueurs'}
          </button>
        </div>

        <CompositionTerrain
          formation={f.formation || '4-4-2'}
          titulaires={f.titulaires || []}
          remplacants={f.remplacants || []}
          modeEdit={true}
          titre={f.adversaire ? `${equipeNom || 'Nous'} · vs ${f.adversaire}` : undefined}
          affichageNom={f.composition_affichage_nom || 'nom'}
          onChangerAffichageNom={changerAffichageNomCompo}
          onChangerFormation={changerFormationCompo}
          onAssignerTitulaire={slotIndex => setCompoModal({ type: 'titulaire', slotIndex })}
          onRetirerTitulaire={retirerTitulaireCompo}
          onAjouterRemplacant={() => setCompoModal({ type: 'remplacant' })}
          onRetirerRemplacant={retirerRemplacantCompo}
        />
      </div>

      {compoModal && (
        <ModalSelectionJoueur
          joueursDispo={joueurs.filter(j => j.joueur_id)}
          dejaUtilises={dejaUtilisesCompo(compoModal.type === 'titulaire' ? f.titulaires?.[compoModal.slotIndex]?.joueur_id : undefined)}
          multiSelect={compoModal.type === 'remplacant'}
          onConfirmer={confirmerSelectionCompo}
          onConfirmerMultiple={confirmerSelectionMultipleCompo}
          onRetirer={compoModal.type === 'titulaire' && f.titulaires?.[compoModal.slotIndex] ? () => { retirerTitulaireCompo(compoModal.slotIndex); setCompoModal(null) } : null}
          onFermer={() => setCompoModal(null)}
        />
      )}

      {/* Copie hors-écran, portée sur document.body, seule visible à l'impression */}
      <FicheCauseriePrint>{contenuFiche}</FicheCauseriePrint>
      <style>{`
        #fiche-causerie-print { display: none; }
        @media print {
          body > *:not(#fiche-causerie-print) { display: none !important; }
          #fiche-causerie-print { display: block !important; }
        }
      `}</style>

      {presentationOuverte && <PresentationCauserie f={f} equipeNom={equipeNom} tactipadsDispo={tactipadsDispo} onFermer={() => setPresentationOuverte(false)} />}
    </div>
  )
}
