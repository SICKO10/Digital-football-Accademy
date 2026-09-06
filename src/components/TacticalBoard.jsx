import { useState, useRef, useCallback, useEffect } from 'react'
import { useColors } from '../lib/theme'
import { supabase } from '../supabase'

const W = 520
// H doublé (340 → 680) pour afficher le terrain COMPLET (les 2 moitiés) au
// lieu d'une seule moitié — nécessaire pour des schémas tactiques qui ne se
// limitent pas à une zone but (cf. FIELD_BOTTOM ci-dessous, gardé en valeur
// figée pour que les schémas déjà enregistrés ne bougent pas visuellement).
const H = 680
const GRID_SIZE = 40 // espacement du quadrillage repère, en unités SVG

// Géométrie du terrain — dérivée de FIELD_BOTTOM (vraie limite de jeu, pas H)
// pour que la grande/petite surface ne dépasse jamais la ligne de but : avant
// ce correctif, leur hauteur était calculée depuis H directement, ce qui les
// faisait déborder de 10 unités sous la ligne de touche du bas.
// FIELD_BOTTOM reste figé à l'ancienne valeur (H valait 340 avant le
// doublement) plutôt que recalculé depuis le nouveau H : la moitié basse
// existante (et les positions déjà enregistrées dedans) ne bouge pas d'un
// pixel, seule une moitié haute symétrique est ajoutée au-dessus.
const FIELD_MARGIN = 10
const FIELD_BOTTOM = 340 - FIELD_MARGIN
const BOX_W = 280 // grande surface élargie (était 250) : plus d'espace pour placer les joueurs
const BOX_H = 116 // idem (était 108)
const BOX_X = (W - BOX_W) / 2
const BOX_Y = FIELD_BOTTOM - BOX_H
const SIX_W = 140 // petite surface élargie (était 116)
const SIX_H = 54 // idem (était 48)
const SIX_X = (W - SIX_W) / 2
const SIX_Y = FIELD_BOTTOM - SIX_H
const GOAL_W = 90
const GOAL_X = (W - GOAL_W) / 2
const PENALTY_R = 92
const PENALTY_Y = FIELD_BOTTOM - 77
const PENALTY_ARC_DX = Math.sqrt(Math.max(0, PENALTY_R ** 2 - (PENALTY_Y - BOX_Y) ** 2))

// Moitié haute — miroir exact de la moitié basse ci-dessus par rapport au
// nouveau bord supérieur (y=0), avec le même FIELD_MARGIN.
const TOP_BOX_Y = FIELD_MARGIN
const TOP_SIX_Y = FIELD_MARGIN
const TOP_GOAL_Y = 0
const TOP_PENALTY_Y = FIELD_MARGIN + 77

const CENTER_R = 45 // rayon du rond central

const RAYON_JOUEUR = 11 // était 15 — jetons plus petits, moins de chevauchement

const emptyEtape = () => ({ joueurs: [], ballon: null, zones: [] })
const EMPTY_DATA = { etapes: [emptyEtape()] }

const maxId = (etapes) => {
  let m = 0
  etapes.forEach(e => (e.joueurs || []).forEach(j => { if (j.id > m) m = j.id }))
  return m
}

const maxZoneId = (etapes) => {
  let m = 0
  etapes.forEach(e => (e.zones || []).forEach(z => { if (z.id > m) m = z.id }))
  return m
}

// Palette cyclée au double-clic sur une zone (cf. cyclerCouleurZone) — pas de
// color picker positionné en overlay, plus simple et fiable au toucher.
const PALETTE_ZONES = ['#4ade80', '#f87171', '#facc15', '#60a5fa', '#a78bfa']

// Board tactique multi-étapes : chaque étape est un instantané (joueurs +
// ballon). "+ Étape" clone l'étape courante (mêmes ids, donc même joueurs)
// pour que l'utilisateur les fasse glisser vers leurs nouvelles positions —
// "Animer" rejoue ensuite les étapes dans l'ordre en faisant réellement
// bouger les jetons d'une position à l'autre (transition CSS sur leur
// position), plutôt que de simples flèches statiques.
export default function TacticalBoard({ data, onChange, readOnly = false, userId, typeSchema }) {
  const colors = useColors()
  const svgRef = useRef(null)
  const d = data && Array.isArray(data.etapes) && data.etapes.length ? data : EMPTY_DATA
  const etapes = d.etapes

  const [etapeIdx, setEtapeIdx] = useState(0)
  const idx = Math.min(etapeIdx, etapes.length - 1)
  const etape = etapes[idx] || emptyEtape()
  const joueurs = Array.isArray(etape.joueurs) ? etape.joueurs : []
  const ballon = etape.ballon || null
  const zones = Array.isArray(etape.zones) ? etape.zones : []

  const [mode, setMode] = useState('select')
  const [showGrid, setShowGrid] = useState(false)
  const [zonesH, setZonesH] = useState(0) // 0 = désactivé, sinon nb de bandes horizontales
  const [zonesV, setZonesV] = useState(0) // 0 = désactivé, sinon nb de colonnes verticales
  const [drag, setDrag] = useState(null) // { type:'joueur'|'ballon', id }
  // Sélection tactile : le clic droit ("supprimer") n'existe pas sur tablette,
  // là où ce board est réellement utilisé (causerie d'avant-match) — un
  // bouton "Supprimer" explicite apparaît dans la barre d'outils dès qu'un
  // jeton est sélectionné, en plus du clic droit qui reste dispo sur desktop.
  const [selection, setSelection] = useState(null) // { type:'joueur'|'ballon'|'zone', id }
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [serieN, setSerieN] = useState(5)
  const [playIdx, setPlayIdx] = useState(null) // étape affichée pendant la lecture, null = édition
  const playTimer = useRef(null)
  const nextId = useRef(maxId(etapes) + 1)

  // Zones colorées (rect/cercle/flèche) — dessinées au clic-glisser plutôt
  // qu'au clic simple (mode !== 'select' : mousedown sur le SVG mémorise le
  // point de départ, mousemove affiche un aperçu, mouseup fige la zone dans
  // l'étape courante). zoneColor/zoneOpacity s'appliquent à la PROCHAINE zone
  // dessinée, pas rétroactivement aux zones déjà posées.
  const [zoneColor, setZoneColor] = useState('#4ade80')
  const [zoneOpacity, setZoneOpacity] = useState(30) // %
  const [drawStart, setDrawStart] = useState(null) // { x, y } point de départ du tracé en cours
  const [drawPreview, setDrawPreview] = useState(null) // zone temporaire affichée pendant le drag
  const nextZoneId = useRef(maxZoneId(etapes) + 1)

  // Bibliothèque personnelle de schémas CPA (table schemas_cpa) — n'a de sens
  // qu'en édition (readOnly=false) et si l'appelant fournit userId/typeSchema
  // ('offensif'|'defensif') ; sans ça les boutons Enregistrer/Charger restent
  // cachés (cf. les deux slides en lecture seule de la causerie, qui ne
  // passent ni l'un ni l'autre).
  const bibliothequeActive = !readOnly && userId && typeSchema
  const [bibliotheque, setBibliotheque] = useState([])
  const [bibliothequeChargee, setBibliothequeChargee] = useState(false)
  const [showCharger, setShowCharger] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)

  const chargerBibliotheque = useCallback(async () => {
    if (!bibliothequeActive) return
    const { data: rows, error } = await supabase.from('schemas_cpa').select('id, nom, data, created_at')
      .eq('educateur_id', userId).eq('type', typeSchema).order('created_at', { ascending: false })
    if (error) { console.error('chargerBibliotheque (TacticalBoard) error:', error); return }
    setBibliotheque(rows || [])
    setBibliothequeChargee(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibliothequeActive, userId, typeSchema])

  useEffect(() => { chargerBibliotheque() }, [chargerBibliotheque])

  const enregistrerDansBibliotheque = async () => {
    if (!bibliothequeActive) return
    const nom = prompt('Nom de ce schéma :')
    if (!nom || !nom.trim()) return
    setEnregistrement(true)
    const { error } = await supabase.from('schemas_cpa').insert({ educateur_id: userId, type: typeSchema, nom: nom.trim(), data: d })
    setEnregistrement(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    chargerBibliotheque()
  }

  const chargerDepuisBibliotheque = (s) => {
    onChange(s.data)
    setEtapeIdx(0)
    setSelection(null)
    setShowCharger(false)
  }

  const supprimerDeBibliotheque = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce schéma enregistré ?')) return
    await supabase.from('schemas_cpa').delete().eq('id', id)
    setBibliotheque(prev => prev.filter(s => s.id !== id))
  }

  const displayIdx = playIdx !== null ? playIdx : idx
  const displayEtape = etapes[displayIdx] || emptyEtape()
  const displayJoueurs = Array.isArray(displayEtape.joueurs) ? displayEtape.joueurs : []
  const displayBallon = displayEtape.ballon || null
  const displayZones = Array.isArray(displayEtape.zones) ? displayEtape.zones : []

  const majEtape = (patch) => {
    const next = etapes.map((e, i) => i === idx ? { ...emptyEtape(), ...e, ...patch } : e)
    onChange({ etapes: next })
  }

  const ajouterEtape = () => {
    if (readOnly || playIdx !== null) return
    const clone = { joueurs: joueurs.map(j => ({ ...j })), ballon: ballon ? { ...ballon } : null }
    const next = [...etapes, clone]
    onChange({ etapes: next })
    setPlayIdx(null)
    setEtapeIdx(next.length - 1)
    setSelection(null)
  }

  const supprimerEtape = (i) => {
    if (readOnly || playIdx !== null || etapes.length <= 1) return
    const next = etapes.filter((_, ix) => ix !== i)
    onChange({ etapes: next })
    setEtapeIdx(p => Math.min(p, next.length - 1))
    setSelection(null)
  }

  // Marge = rayon du jeton (RAYON_JOUEUR) + un peu de jeu, pas 5 : sinon un
  // jeton dragué près du bord a son cercle à moitié hors du viewBox (donc
  // rogné/invisible côté SVG).
  const MARGIN = RAYON_JOUEUR + 3
  const svgPos = (e) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return { x: W / 2, y: H / 2 }
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(MARGIN, Math.min(W - MARGIN, ((cx - r.left) / r.width) * W)),
      y: Math.max(MARGIN, Math.min(H - MARGIN, ((cy - r.top) / r.height) * H)),
    }
  }
  // Même clamp appliqué à l'affichage (pas seulement au drag) : couvre aussi
  // les positions déjà enregistrées hors limites avant ce correctif, et le
  // mode lecture seule (readOnly) où startDrag/svgPos ne sont jamais appelés.
  const clampPos = (p) => ({ x: Math.max(MARGIN, Math.min(W - MARGIN, p.x)), y: Math.max(MARGIN, Math.min(H - MARGIN, p.y)) })

  const clickSVG = (e) => {
    if (readOnly || drag || playIdx !== null) return
    if (e.target.closest('.dot')) return
    setSelection(null)
    const p = svgPos(e)
    if (mode === 'add_nous' || mode === 'add_adv') {
      const equipe = mode === 'add_nous' ? 'nous' : 'adverse'
      const num = joueurs.filter(j => j.equipe === equipe).length + 1
      majEtape({ joueurs: [...joueurs, { id: nextId.current++, x: p.x, y: p.y, equipe, nom: String(num) }] })
      setMode('select')
    } else if (mode === 'add_ball') {
      majEtape({ ballon: { x: p.x, y: p.y } })
      setMode('select')
    }
  }

  const ajouterSerie = (equipe) => {
    if (readOnly || playIdx !== null) return
    const n = Math.max(1, Math.min(15, parseInt(serieN, 10) || 1))
    const deja = joueurs.filter(j => j.equipe === equipe).length
    const baseY = equipe === 'nous' ? H - 55 : 55
    const margin = 55
    const usable = W - margin * 2
    const nouveaux = Array.from({ length: n }, (_, k) => ({
      id: nextId.current++,
      x: n === 1 ? W / 2 : margin + (usable * k) / (n - 1),
      y: baseY,
      equipe,
      nom: String(deja + k + 1),
    }))
    majEtape({ joueurs: [...joueurs, ...nouveaux] })
  }

  const onMove = useCallback((e) => {
    if (playIdx !== null) return
    if (drawStart) {
      const p = svgPos(e)
      setDrawPreview(prev => prev ? { ...prev, x2: p.x, y2: p.y } : prev)
      return
    }
    if (!drag) return
    const p = svgPos(e)
    const next = etapes.map((et, i) => {
      if (i !== idx) return et
      if (drag.type === 'joueur') {
        return { ...et, joueurs: (et.joueurs || []).map(j => j.id === drag.id ? { ...j, x: p.x, y: p.y } : j) }
      }
      return { ...et, ballon: { x: p.x, y: p.y } }
    })
    onChange({ etapes: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, idx, etapes, playIdx, drawStart])

  const startDrag = (e, type, id) => {
    if (readOnly || mode !== 'select' || playIdx !== null) return
    e.stopPropagation()
    setDrag({ type, id })
    setSelection({ type, id })
  }

  // Zones (rect/cercle/flèche) — mousedown sur le SVG lui-même (pas sur un
  // jeton) démarre le tracé quand un outil de zone est actif ; mousemove met
  // à jour l'aperçu (cf. onMove) ; mouseup (stopDrag) fige la zone. Un simple
  // clic sans glisser (w/h quasi nuls) n'ajoute rien, pour éviter les zones
  // fantômes créées par un tap accidentel sur tablette.
  const ZONE_MODES = ['zone_rect', 'zone_circle', 'zone_arrow']
  const startDrawZone = (e) => {
    if (readOnly || playIdx !== null || !ZONE_MODES.includes(mode)) return
    const p = svgPos(e)
    setDrawStart(p)
    setDrawPreview({ shape: mode.replace('zone_', ''), x1: p.x, y1: p.y, x2: p.x, y2: p.y })
  }

  const stopDrag = () => {
    if (drawStart && drawPreview) {
      const x1 = Math.min(drawPreview.x1, drawPreview.x2)
      const y1 = Math.min(drawPreview.y1, drawPreview.y2)
      const w = Math.abs(drawPreview.x2 - drawPreview.x1)
      const h = Math.abs(drawPreview.y2 - drawPreview.y1)
      if (w > 4 || h > 4) {
        const base = { id: nextZoneId.current++, color: zoneColor, opacity: Number(zoneOpacity) }
        const nouvelleZone = drawPreview.shape === 'rect'
          ? { ...base, type: 'rect', x: x1, y: y1, w, h }
          : drawPreview.shape === 'circle'
            ? { ...base, type: 'circle', cx: (drawPreview.x1 + drawPreview.x2) / 2, cy: (drawPreview.y1 + drawPreview.y2) / 2, rx: w / 2, ry: h / 2 }
            : { ...base, type: 'arrow', x1: drawPreview.x1, y1: drawPreview.y1, x2: drawPreview.x2, y2: drawPreview.y2 }
        majEtape({ zones: [...zones, nouvelleZone] })
      }
      setDrawStart(null)
      setDrawPreview(null)
      setMode('select')
      return
    }
    setDrag(null)
  }

  const delJoueur = (id) => {
    if (readOnly || playIdx !== null) return
    majEtape({ joueurs: joueurs.filter(j => j.id !== id) })
  }

  const selectZone = (e, id) => {
    if (readOnly || playIdx !== null) return
    e.stopPropagation()
    setSelection({ type: 'zone', id })
  }

  const delZone = (id) => {
    if (readOnly || playIdx !== null) return
    majEtape({ zones: zones.filter(z => z.id !== id) })
  }

  // Double-clic sur une zone : cycle sa couleur dans une petite palette fixe
  // — plus simple/fiable qu'un color picker positionné en overlay au-dessus
  // du SVG (surtout au toucher).
  const cyclerCouleurZone = (e, id) => {
    e.stopPropagation()
    if (readOnly || playIdx !== null) return
    const z = zones.find(zz => zz.id === id)
    if (!z) return
    const i = PALETTE_ZONES.indexOf(z.color)
    const suivante = PALETTE_ZONES[(i + 1) % PALETTE_ZONES.length]
    majEtape({ zones: zones.map(zz => zz.id === id ? { ...zz, color: suivante } : zz) })
  }

  // Bouton "Supprimer" de la barre d'outils — équivalent tactile du clic
  // droit (indisponible sur tablette).
  const supprimerSelection = () => {
    if (!selection || readOnly || playIdx !== null) return
    if (selection.type === 'joueur') delJoueur(selection.id)
    else if (selection.type === 'zone') delZone(selection.id)
    else majEtape({ ballon: null })
    setSelection(null)
  }

  const beginEdit = (e, j) => {
    if (readOnly || mode !== 'select' || playIdx !== null) return
    e.stopPropagation()
    setEditId(j.id); setEditVal(j.nom)
  }

  const saveEdit = () => {
    majEtape({ joueurs: joueurs.map(j => j.id === editId ? { ...j, nom: editVal || j.nom } : j) })
    setEditId(null)
  }

  const playAnim = () => {
    if (playIdx !== null) { clearTimeout(playTimer.current); setPlayIdx(null); return }
    if (etapes.length < 2) return
    let i = 0
    setPlayIdx(0)
    const step = () => {
      i++
      if (i < etapes.length) { setPlayIdx(i); playTimer.current = setTimeout(step, 1400) }
      else { playTimer.current = setTimeout(() => setPlayIdx(null), 1200) }
    }
    playTimer.current = setTimeout(step, 1400)
  }

  useEffect(() => () => clearTimeout(playTimer.current), [])

  const tb = (active, c = colors.text.faint) => ({
    background: active ? `${c}22` : colors.background.raised,
    border: `1px solid ${active ? c : colors.border.subtle}`,
    borderRadius: '7px', color: active ? c : colors.text.dim,
    fontSize: '11px', fontWeight: 700, padding: '5px 9px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  })

  const showEtapesRow = !readOnly || etapes.length > 1

  return (
    <div>
      {showEtapesRow && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
          <span style={{ color: colors.text.dim, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginRight: '2px' }}>Étapes</span>
          {etapes.map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => { setPlayIdx(null); setEtapeIdx(i); setSelection(null) }}
                disabled={playIdx !== null}
                style={{
                  background: displayIdx === i ? 'rgba(167,139,250,0.18)' : colors.background.raised,
                  border: `1px solid ${displayIdx === i ? '#a78bfa' : colors.border.subtle}`,
                  borderRadius: !readOnly && etapes.length > 1 ? '6px 0 0 6px' : '6px',
                  color: displayIdx === i ? '#a78bfa' : colors.text.faint,
                  fontSize: '11px', fontWeight: 700, padding: '5px 9px',
                  cursor: playIdx !== null ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >{i + 1}</button>
              {!readOnly && etapes.length > 1 && (
                <button onClick={() => supprimerEtape(i)} disabled={playIdx !== null}
                  style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderLeft: 'none', borderRadius: '0 6px 6px 0', color: colors.text.dim, fontSize: '10px', padding: '5px 6px', cursor: playIdx !== null ? 'default' : 'pointer' }}>×</button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button onClick={ajouterEtape} disabled={playIdx !== null}
              style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, borderRadius: '6px', color: '#a78bfa', fontSize: '11px', fontWeight: 700, padding: '5px 9px', cursor: playIdx !== null ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Étape</button>
          )}
          {etapes.length > 1 && (
            <button onClick={playAnim} style={{ ...tb(playIdx !== null, '#a78bfa'), marginLeft: 'auto' }}>
              {playIdx !== null ? '⏹ Stop' : '▶ Animer le jeu'}
            </button>
          )}
        </div>
      )}

      {!readOnly && (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', background: colors.background.raised, borderRadius: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>

            {/* Groupe 1 — outil de base */}
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: colors.background.sunken, borderRadius: '7px' }}>
              <button style={tb(mode === 'select')} onClick={() => setMode('select')}>↖ Sélect</button>
            </div>

            <div style={{ width: 1, height: 28, background: colors.border.subtle }} />

            {/* Groupe 2 — ajouter des éléments */}
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: colors.background.sunken, borderRadius: '7px' }}>
              <button style={tb(mode === 'add_nous', '#4ade80')} onClick={() => setMode('add_nous')}>🟢 +Nous</button>
              <button style={tb(mode === 'add_adv', '#f87171')} onClick={() => setMode('add_adv')}>🔴 +Adv</button>
              <button style={tb(mode === 'add_ball', '#fde68a')} onClick={() => setMode('add_ball')}>⚽ Ballon</button>
            </div>

            <div style={{ width: 1, height: 28, background: colors.border.subtle }} />

            {/* Groupe 3 — zones (nouveau) */}
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: colors.background.sunken, borderRadius: '7px', alignItems: 'center' }}>
              <button style={tb(mode === 'zone_rect', zoneColor)} onClick={() => setMode('zone_rect')} title="Zone rectangulaire">⬜</button>
              <button style={tb(mode === 'zone_circle', zoneColor)} onClick={() => setMode('zone_circle')} title="Zone circulaire">⭕</button>
              <button style={tb(mode === 'zone_arrow', zoneColor)} onClick={() => setMode('zone_arrow')} title="Flèche">→</button>
              <input type="color" value={zoneColor} onChange={e => setZoneColor(e.target.value)}
                style={{ width: 26, height: 26, borderRadius: '6px', border: `1px solid ${colors.border.subtle}`, background: 'transparent', cursor: 'pointer', padding: '2px' }}
                title="Couleur de la zone" />
              <input type="range" min={10} max={80} value={zoneOpacity} onChange={e => setZoneOpacity(e.target.value)}
                style={{ width: 50 }} title={`Opacité (${zoneOpacity}%)`} />
            </div>

            <div style={{ width: 1, height: 28, background: colors.border.subtle }} />

            {/* Groupe 4 — affichage (quadrillage, zones H/V repères) */}
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: colors.background.sunken, borderRadius: '7px' }}>
              <button style={tb(showGrid)} onClick={() => setShowGrid(v => !v)} title="Quadrillage">⊞</button>
              <select value={zonesH} onChange={e => setZonesH(Number(e.target.value))} title="Zones horizontales"
                style={{ background: zonesH > 0 ? '#4ade8020' : colors.background.raised, border: `1px solid ${zonesH > 0 ? '#4ade80' : colors.border.subtle}`, color: zonesH > 0 ? '#4ade80' : colors.text.faint, borderRadius: '6px', fontSize: '11px', padding: '5px 6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <option value={0}>⬛ Zones H</option>
                <option value={2}>2 zones</option>
                <option value={3}>3 zones</option>
                <option value={4}>4 zones</option>
                <option value={5}>5 zones</option>
              </select>
              <select value={zonesV} onChange={e => setZonesV(Number(e.target.value))} title="Colonnes verticales"
                style={{ background: zonesV > 0 ? '#4ade8020' : colors.background.raised, border: `1px solid ${zonesV > 0 ? '#4ade80' : colors.border.subtle}`, color: zonesV > 0 ? '#4ade80' : colors.text.faint, borderRadius: '6px', fontSize: '11px', padding: '5px 6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <option value={0}>⬛ Colonnes V</option>
                <option value={2}>2 colonnes</option>
                <option value={3}>3 colonnes</option>
                <option value={4}>4 colonnes</option>
              </select>
            </div>

            <div style={{ width: 1, height: 28, background: colors.border.subtle }} />

            {/* Groupe 5 — séries + actions */}
            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: colors.background.sunken, borderRadius: '7px', alignItems: 'center' }}>
              <input type="number" min={1} max={15} value={serieN} onChange={e => setSerieN(e.target.value)}
                style={{ width: '36px', background: colors.background.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: '6px', color: colors.text.primary, fontSize: '11px', padding: '5px 4px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }} />
              <button style={tb(false, '#4ade80')} onClick={() => ajouterSerie('nous')}>+ Série 🟢</button>
              <button style={tb(false, '#f87171')} onClick={() => ajouterSerie('adverse')}>+ Série 🔴</button>
            </div>

            {selection && (
              <button onClick={supprimerSelection} style={tb(true, '#f87171')}>Supprimer</button>
            )}
            {(joueurs.length || ballon || zones.length) ? (
              <button onClick={() => majEtape({ joueurs: [], ballon: null, zones: [] })}
                style={{ ...tb(false), marginLeft: bibliothequeActive ? '0' : 'auto', color: colors.text.dim }}>↺ Vider l'étape</button>
            ) : null}
            {bibliothequeActive && (
              <div style={{ display: 'flex', gap: '6px', marginLeft: (joueurs.length || ballon || zones.length) ? '0' : 'auto' }}>
                <button onClick={enregistrerDansBibliotheque} disabled={enregistrement} style={tb(false, '#facc15')}>💾 Enregistrer</button>
                <button onClick={() => setShowCharger(v => !v)} style={tb(showCharger, '#facc15')}>📂 Charger</button>
              </div>
            )}
          </div>

          {bibliothequeActive && showCharger && (
            <div style={{ background: colors.background.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', padding: '6px', marginBottom: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {!bibliothequeChargee ? (
                <p style={{ color: colors.text.dim, fontSize: '11px', margin: '4px 6px' }}>Chargement…</p>
              ) : bibliotheque.length === 0 ? (
                <p style={{ color: colors.text.dim, fontSize: '11px', margin: '4px 6px', fontStyle: 'italic' }}>Aucun schéma enregistré pour l'instant.</p>
              ) : (
                bibliotheque.map(s => (
                  <div key={s.id} onClick={() => chargerDepuisBibliotheque(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.background.sunken}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ flex: 1, color: colors.text.primary, fontSize: '12px', fontWeight: 600 }}>{s.nom}</span>
                    <button onClick={e => supprimerDeBibliotheque(e, s.id)} title="Supprimer" style={{ background: 'none', border: 'none', color: colors.text.ghost, fontSize: '12px', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          <p style={{ color: colors.text.ghost, fontSize: '10px', margin: '0 0 6px' }}>
            {mode === 'select' && 'Glisse les joueurs/ballon · Double-clic → renommer · Clic droit ou bouton "Supprimer" → supprimer'}
            {mode === 'add_nous' && 'Clique sur le terrain pour placer un joueur (notre équipe)'}
            {mode === 'add_adv' && 'Clique sur le terrain pour placer un joueur (adversaire)'}
            {mode === 'add_ball' && 'Clique sur le terrain pour placer le ballon'}
            {(mode === 'zone_rect' || mode === 'zone_circle') && 'Clique-glisse sur le terrain pour dessiner la zone'}
            {mode === 'zone_arrow' && 'Clique-glisse sur le terrain pour tracer la flèche'}
          </p>
        </>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        overflow="hidden"
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, borderRadius: '10px', userSelect: 'none', touchAction: 'none', cursor: !readOnly && mode !== 'select' && playIdx === null ? 'crosshair' : 'default' }}
        onClick={clickSVG}
        onMouseDown={startDrawZone}
        onMouseMove={onMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={startDrawZone}
        onTouchMove={onMove}
        onTouchEnd={stopDrag}
      >
        {/* Pelouse */}
        <rect width={W} height={H} fill="#1a3a1a" rx="8" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={i * 74} y={0} width={74} height={H} fill={i % 2 === 0 ? '#1d3d1d' : '#1a3a1a'} />
        ))}

        {/* Lignes — terrain complet (les 2 moitiés) : la moitié basse garde
            exactement sa géométrie d'origine (FIELD_BOTTOM figé, cf. plus
            haut) pour ne pas décaler les schémas déjà enregistrés ; la
            moitié haute est son miroir exact par rapport à la ligne médiane. */}
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} rx={3} />
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <circle cx={W / 2} cy={H / 2} r={CENTER_R} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <circle cx={W / 2} cy={H / 2} r={2} fill="#fff" fillOpacity={0.5} />

        {/* Moitié basse */}
        <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <rect x={SIX_X} y={SIX_Y} width={SIX_W} height={SIX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.3} />
        <rect x={GOAL_X} y={FIELD_BOTTOM} width={GOAL_W} height={FIELD_MARGIN} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeWidth={2} strokeOpacity={0.65} />
        <circle cx={W / 2} cy={PENALTY_Y} r={3} fill="#fff" fillOpacity={0.5} />
        <path d={`M ${W / 2 - PENALTY_ARC_DX} ${BOX_Y} A ${PENALTY_R} ${PENALTY_R} 0 0 0 ${W / 2 + PENALTY_ARC_DX} ${BOX_Y}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.38} strokeDasharray="5 4" />

        {/* Moitié haute (miroir) */}
        <rect x={BOX_X} y={TOP_BOX_Y} width={BOX_W} height={BOX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <rect x={SIX_X} y={TOP_SIX_Y} width={SIX_W} height={SIX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.3} />
        <rect x={GOAL_X} y={TOP_GOAL_Y} width={GOAL_W} height={FIELD_MARGIN} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeWidth={2} strokeOpacity={0.65} />
        <circle cx={W / 2} cy={TOP_PENALTY_Y} r={3} fill="#fff" fillOpacity={0.5} />
        <path d={`M ${W / 2 - PENALTY_ARC_DX} ${TOP_BOX_Y + BOX_H} A ${PENALTY_R} ${PENALTY_R} 0 0 1 ${W / 2 + PENALTY_ARC_DX} ${TOP_BOX_Y + BOX_H}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.38} strokeDasharray="5 4" />

        {/* Quadrillage repère */}
        {showGrid && (
          <g pointerEvents="none">
            {Array.from({ length: Math.floor(W / GRID_SIZE) }, (_, i) => (i + 1) * GRID_SIZE).map(x => (
              <line key={`gv-${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} strokeDasharray="4 4" />
            ))}
            {Array.from({ length: Math.floor(H / GRID_SIZE) }, (_, i) => (i + 1) * GRID_SIZE).map(y => (
              <line key={`gh-${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} strokeDasharray="4 4" />
            ))}
          </g>
        )}

        {/* Zones horizontales */}
        {zonesH > 0 && (
          <g pointerEvents="none">
            {Array.from({ length: zonesH - 1 }, (_, i) => {
              const y = H * ((i + 1) / zonesH)
              return <line key={`zh-${i}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.55)" strokeWidth={2} strokeDasharray="8 5" />
            })}
            {zonesH === 3 && ['Zone défensive', 'Zone médiane', 'Zone offensive'].map((label, i) => (
              <text key={`zlh-${i}`} x={W - 8} y={H * ((i + 0.5) / zonesH)} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize={11} fontStyle="italic">{label}</text>
            ))}
          </g>
        )}

        {/* Colonnes verticales */}
        {zonesV > 0 && (
          <g pointerEvents="none">
            {Array.from({ length: zonesV - 1 }, (_, i) => {
              const x = W * ((i + 1) / zonesV)
              return <line key={`zv-${i}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.55)" strokeWidth={2} strokeDasharray="8 5" />
            })}
            {zonesV === 3 && ['Couloir G', 'Axe', 'Couloir D'].map((label, i) => (
              <text key={`zlv-${i}`} x={W * ((i + 0.5) / zonesV)} y={12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10} fontStyle="italic">{label}</text>
            ))}
          </g>
        )}

        {/* Zones colorées (rect/cercle/flèche) — sous les jetons, au-dessus des
            lignes du terrain. */}
        <defs>
          <marker id="tb-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
          </marker>
        </defs>
        <g>
          {displayZones.map(z => {
            const selectionne = selection?.type === 'zone' && selection.id === z.id
            const fill = z.color + Math.round((z.opacity ?? 30) * 2.55).toString(16).padStart(2, '0')
            const props = !readOnly && playIdx === null ? {
              onClick: e => selectZone(e, z.id),
              onDoubleClick: e => cyclerCouleurZone(e, z.id),
              onContextMenu: e => { e.preventDefault(); e.stopPropagation(); delZone(z.id) },
              style: { cursor: 'pointer' },
            } : {}
            if (z.type === 'rect') return (
              <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h}
                fill={fill} stroke={z.color} strokeWidth={selectionne ? 3 : 1.5} strokeDasharray="5 3" {...props} />
            )
            if (z.type === 'circle') return (
              <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                fill={fill} stroke={z.color} strokeWidth={selectionne ? 3 : 1.5} strokeDasharray="5 3" {...props} />
            )
            return (
              <line key={z.id} x1={z.x1} y1={z.y1} x2={z.x2} y2={z.y2}
                stroke={z.color} strokeWidth={selectionne ? 4 : 2.5} markerEnd="url(#tb-arrowhead)" {...props} />
            )
          })}
          {drawPreview && (() => {
            const x1 = Math.min(drawPreview.x1, drawPreview.x2)
            const y1 = Math.min(drawPreview.y1, drawPreview.y2)
            const w = Math.abs(drawPreview.x2 - drawPreview.x1)
            const h = Math.abs(drawPreview.y2 - drawPreview.y1)
            if (drawPreview.shape === 'rect') return <rect x={x1} y={y1} width={w} height={h} fill={zoneColor + '33'} stroke={zoneColor} strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
            if (drawPreview.shape === 'circle') return <ellipse cx={(drawPreview.x1 + drawPreview.x2) / 2} cy={(drawPreview.y1 + drawPreview.y2) / 2} rx={w / 2} ry={h / 2} fill={zoneColor + '33'} stroke={zoneColor} strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
            return <line x1={drawPreview.x1} y1={drawPreview.y1} x2={drawPreview.x2} y2={drawPreview.y2} stroke={zoneColor} strokeWidth={2.5} strokeDasharray="4 3" pointerEvents="none" />
          })()}
        </g>

        {/* Ballon */}
        {displayBallon && (() => { const bp = clampPos(displayBallon); const selectionne = selection?.type === 'ballon'; return (
          <g className="dot"
            style={{ transform: `translate(${bp.x}px, ${bp.y}px)`, transition: playIdx !== null ? 'transform 1.1s ease' : 'none', cursor: !readOnly && mode === 'select' && playIdx === null ? 'grab' : 'default' }}
            onMouseDown={e => startDrag(e, 'ballon', null)}
            onTouchStart={e => startDrag(e, 'ballon', null)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!readOnly && playIdx === null) majEtape({ ballon: null }) }}
          >
            {selectionne && <circle r={13} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 2" />}
            <circle r={10} fill="#fff" fillOpacity={0.12} stroke="#fff" strokeWidth={1} />
            <text textAnchor="middle" y={5} fontSize={14}>⚽</text>
          </g>
        )})()}

        {/* Joueurs */}
        {displayJoueurs.map(j => {
          const isN = j.equipe === 'nous'
          const c = isN ? '#4ade80' : '#f87171'
          const initiales = (j.nom || '').slice(0, 3)
          const jp = clampPos(j)
          const selectionne = selection?.type === 'joueur' && selection.id === j.id
          return (
            <g key={j.id} className="dot"
              style={{ transform: `translate(${jp.x}px, ${jp.y}px)`, transition: playIdx !== null ? 'transform 1.1s ease' : 'none', cursor: !readOnly && mode === 'select' && playIdx === null ? 'grab' : 'default' }}
              onMouseDown={e => startDrag(e, 'joueur', j.id)}
              onTouchStart={e => startDrag(e, 'joueur', j.id)}
              onDoubleClick={e => beginEdit(e, j)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); delJoueur(j.id) }}
            >
              {selectionne && <circle r={RAYON_JOUEUR + 4} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 2" />}
              <circle cx={1} cy={1} r={RAYON_JOUEUR} fill="rgba(0,0,0,0.45)" />
              <circle r={RAYON_JOUEUR} fill={isN ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'} stroke={c} strokeWidth={2} />
              <text textAnchor="middle" y={3} fill={c} fontSize={initiales.length > 2 ? 8 : 10} fontWeight="bold" fontFamily="sans-serif">{initiales}</text>
              {j.nom && (
                <text textAnchor="middle" y={RAYON_JOUEUR + 10} fill={c} fontSize={8} fontWeight="700" fontFamily="sans-serif" style={{ paintOrder: 'stroke' }} stroke="#080808" strokeWidth={3}>{j.nom}</text>
              )}
            </g>
          )
        })}
      </svg>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '14px', padding: '8px 12px', color: colors.text.ghost, fontSize: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>↖ Sélectionner</span>
          <span>⬜ Dessiner zone rect</span>
          <span>⭕ Dessiner zone cercle</span>
          <span>→ Tracer une flèche</span>
          <span>Double-clic sur une zone → change sa couleur</span>
          <span>Clic droit sur une zone → supprimer</span>
        </div>
      )}

      {/* Édition nom */}
      {editId !== null && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>Prénom :</span>
          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveEdit()}
            style={{ background: '#111', border: '1px solid #4ade80', borderRadius: '6px', color: '#fff', padding: '4px 8px', fontSize: '13px', width: '110px' }}
          />
          <button onClick={saveEdit} style={{ background: '#4ade80', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}>OK</button>
          <button onClick={() => setEditId(null)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: '6px', color: '#6b7280', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  )
}
