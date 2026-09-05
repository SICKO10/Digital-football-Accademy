import { useState, useRef, useCallback, useEffect } from 'react'
import { useColors } from '../lib/theme'

const W = 520
const H = 340
const GRID_SIZE = 40 // espacement du quadrillage repère, en unités SVG

// Géométrie du terrain — dérivée de FIELD_BOTTOM (vraie limite de jeu, pas H)
// pour que la grande/petite surface ne dépasse jamais la ligne de but : avant
// ce correctif, leur hauteur était calculée depuis H directement, ce qui les
// faisait déborder de 10 unités sous la ligne de touche du bas.
const FIELD_MARGIN = 10
const FIELD_BOTTOM = H - FIELD_MARGIN
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

const RAYON_JOUEUR = 11 // était 15 — jetons plus petits, moins de chevauchement

const emptyEtape = () => ({ joueurs: [], ballon: null })
const EMPTY_DATA = { etapes: [emptyEtape()] }

const maxId = (etapes) => {
  let m = 0
  etapes.forEach(e => (e.joueurs || []).forEach(j => { if (j.id > m) m = j.id }))
  return m
}

// Board tactique multi-étapes : chaque étape est un instantané (joueurs +
// ballon). "+ Étape" clone l'étape courante (mêmes ids, donc même joueurs)
// pour que l'utilisateur les fasse glisser vers leurs nouvelles positions —
// "Animer" rejoue ensuite les étapes dans l'ordre en faisant réellement
// bouger les jetons d'une position à l'autre (transition CSS sur leur
// position), plutôt que de simples flèches statiques.
export default function TacticalBoard({ data, onChange, readOnly = false }) {
  const colors = useColors()
  const svgRef = useRef(null)
  const d = data && Array.isArray(data.etapes) && data.etapes.length ? data : EMPTY_DATA
  const etapes = d.etapes

  const [etapeIdx, setEtapeIdx] = useState(0)
  const idx = Math.min(etapeIdx, etapes.length - 1)
  const etape = etapes[idx] || emptyEtape()
  const joueurs = Array.isArray(etape.joueurs) ? etape.joueurs : []
  const ballon = etape.ballon || null

  const [mode, setMode] = useState('select')
  const [showGrid, setShowGrid] = useState(false)
  const [zonesH, setZonesH] = useState(0) // 0 = désactivé, sinon nb de bandes horizontales
  const [zonesV, setZonesV] = useState(0) // 0 = désactivé, sinon nb de colonnes verticales
  const [drag, setDrag] = useState(null) // { type:'joueur'|'ballon', id }
  // Sélection tactile : le clic droit ("supprimer") n'existe pas sur tablette,
  // là où ce board est réellement utilisé (causerie d'avant-match) — un
  // bouton "Supprimer" explicite apparaît dans la barre d'outils dès qu'un
  // jeton est sélectionné, en plus du clic droit qui reste dispo sur desktop.
  const [selection, setSelection] = useState(null) // { type:'joueur'|'ballon', id }
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [serieN, setSerieN] = useState(5)
  const [playIdx, setPlayIdx] = useState(null) // étape affichée pendant la lecture, null = édition
  const playTimer = useRef(null)
  const nextId = useRef(maxId(etapes) + 1)

  const displayIdx = playIdx !== null ? playIdx : idx
  const displayEtape = etapes[displayIdx] || emptyEtape()
  const displayJoueurs = Array.isArray(displayEtape.joueurs) ? displayEtape.joueurs : []
  const displayBallon = displayEtape.ballon || null

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
    if (playIdx !== null || !drag) return
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
  }, [drag, idx, etapes, playIdx])

  const startDrag = (e, type, id) => {
    if (readOnly || mode !== 'select' || playIdx !== null) return
    e.stopPropagation()
    setDrag({ type, id })
    setSelection({ type, id })
  }

  const stopDrag = () => setDrag(null)

  const delJoueur = (id) => {
    if (readOnly || playIdx !== null) return
    majEtape({ joueurs: joueurs.filter(j => j.id !== id) })
  }

  // Bouton "Supprimer" de la barre d'outils — équivalent tactile du clic
  // droit (indisponible sur tablette).
  const supprimerSelection = () => {
    if (!selection || readOnly || playIdx !== null) return
    if (selection.type === 'joueur') delJoueur(selection.id)
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
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
            <button style={tb(mode === 'select')} onClick={() => setMode('select')}>↖ Sélect</button>
            <button style={tb(mode === 'add_nous', '#4ade80')} onClick={() => setMode('add_nous')}>🟢 +Nous</button>
            <button style={tb(mode === 'add_adv', '#f87171')} onClick={() => setMode('add_adv')}>🔴 +Adv</button>
            <button style={tb(mode === 'add_ball', '#fde68a')} onClick={() => setMode('add_ball')}>⚽ Ballon</button>
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
            <div style={{ width: 1, height: 16, background: colors.border.subtle, margin: '0 2px' }} />
            <input type="number" min={1} max={15} value={serieN} onChange={e => setSerieN(e.target.value)}
              style={{ width: '36px', background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: '6px', color: colors.text.primary, fontSize: '11px', padding: '5px 4px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }} />
            <button style={tb(false, '#4ade80')} onClick={() => ajouterSerie('nous')}>+ Série 🟢</button>
            <button style={tb(false, '#f87171')} onClick={() => ajouterSerie('adverse')}>+ Série 🔴</button>
            {selection && (
              <button onClick={supprimerSelection} style={tb(true, '#f87171')}>Supprimer</button>
            )}
            {(joueurs.length || ballon) ? (
              <button onClick={() => majEtape({ joueurs: [], ballon: null })}
                style={{ ...tb(false), marginLeft: 'auto', color: colors.text.dim }}>↺ Vider l'étape</button>
            ) : null}
          </div>
          <p style={{ color: colors.text.ghost, fontSize: '10px', margin: '0 0 6px' }}>
            {mode === 'select' && 'Glisse les joueurs/ballon · Double-clic → renommer · Clic droit ou bouton "Supprimer" → supprimer'}
            {mode === 'add_nous' && 'Clique sur le terrain pour placer un joueur (notre équipe)'}
            {mode === 'add_adv' && 'Clique sur le terrain pour placer un joueur (adversaire)'}
            {mode === 'add_ball' && 'Clique sur le terrain pour placer le ballon'}
          </p>
        </>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        overflow="hidden"
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, borderRadius: '10px', userSelect: 'none', touchAction: 'none', cursor: !readOnly && mode !== 'select' && playIdx === null ? 'crosshair' : 'default' }}
        onClick={clickSVG}
        onMouseMove={onMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchMove={onMove}
        onTouchEnd={stopDrag}
      >
        {/* Pelouse */}
        <rect width={W} height={H} fill="#1a3a1a" rx="8" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={i * 74} y={0} width={74} height={H} fill={i % 2 === 0 ? '#1d3d1d' : '#1a3a1a'} />
        ))}

        {/* Lignes */}
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} rx={3} />
        <text x={W / 2} y={23} textAnchor="middle" fill="#ffffff1a" fontSize={9} fontFamily="sans-serif">— CÔTÉ ADVERSE —</text>
        <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <rect x={SIX_X} y={SIX_Y} width={SIX_W} height={SIX_H} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.3} />
        <rect x={GOAL_X} y={FIELD_BOTTOM} width={GOAL_W} height={FIELD_MARGIN} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeWidth={2} strokeOpacity={0.65} />
        <circle cx={W / 2} cy={PENALTY_Y} r={3} fill="#fff" fillOpacity={0.5} />
        <path d={`M ${W / 2 - PENALTY_ARC_DX} ${BOX_Y} A ${PENALTY_R} ${PENALTY_R} 0 0 0 ${W / 2 + PENALTY_ARC_DX} ${BOX_Y}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.38} strokeDasharray="5 4" />

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
