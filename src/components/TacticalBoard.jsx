import { useState, useRef, useCallback, useEffect } from 'react'

const W = 520
const H = 340

const COLORS = ['#fbbf24', '#4ade80', '#60a5fa', '#f87171', '#c084fc', '#fb923c', '#fff']
const ARROW_MARKERS = {
  '#fbbf24': 'yw', '#4ade80': 'gn', '#60a5fa': 'bl',
  '#f87171': 'rd', '#c084fc': 'pp', '#fb923c': 'og', '#fff': 'wh'
}

const EMPTY_DATA = { joueurs: [], ballon: null, fleches: [] }

export default function TacticalBoard({ data, onChange, readOnly = false }) {
  const svgRef = useRef(null)
  const d = data && typeof data === 'object' ? data : EMPTY_DATA
  const joueurs = Array.isArray(d.joueurs) ? d.joueurs : []
  const ballon = d.ballon || null
  const fleches = Array.isArray(d.fleches) ? d.fleches : []

  const [mode, setMode] = useState('select')
  // modes: select | add_nous | add_adv | add_ball | arrow
  const [drag, setDrag] = useState(null) // { type:'joueur'|'ballon', id }
  const [arrowFrom, setArrowFrom] = useState(null)
  const [mouse, setMouse] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [selArrow, setSelArrow] = useState(null)
  const [arrowColor, setArrowColor] = useState('#fbbf24')
  const [animating, setAnimating] = useState(false)
  const [animIdx, setAnimIdx] = useState(-1)
  const animTimer = useRef(null)
  const nextId = useRef(1)

  const up = (patch) => onChange({ ...EMPTY_DATA, joueurs, ballon, fleches, ...patch })

  const svgPos = (e) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return { x: W / 2, y: H / 2 }
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(5, Math.min(W - 5, ((cx - r.left) / r.width) * W)),
      y: Math.max(5, Math.min(H - 5, ((cy - r.top) / r.height) * H)),
    }
  }

  const clickSVG = (e) => {
    if (readOnly || drag) return
    if (e.target.closest('.dot')) return
    const p = svgPos(e)
    if (mode === 'add_nous' || mode === 'add_adv') {
      const equipe = mode === 'add_nous' ? 'nous' : 'adverse'
      const num = joueurs.filter(j => j.equipe === equipe).length + 1
      up({ joueurs: [...joueurs, { id: nextId.current++, x: p.x, y: p.y, equipe, nom: String(num) }] })
    } else if (mode === 'add_ball') {
      up({ ballon: { x: p.x, y: p.y } })
      setMode('select')
    } else if (mode === 'arrow') {
      if (!arrowFrom) {
        setArrowFrom(p)
      } else {
        const maxSeq = fleches.length ? Math.max(...fleches.map(f => f.seq || 0)) : 0
        up({ fleches: [...fleches, { id: nextId.current++, x1: arrowFrom.x, y1: arrowFrom.y, x2: p.x, y2: p.y, c: arrowColor, seq: maxSeq + 1 }] })
        setArrowFrom(null)
      }
    }
  }

  const onMove = useCallback((e) => {
    const p = svgPos(e)
    setMouse(p)
    if (!drag) return
    if (drag.type === 'joueur') {
      up({ joueurs: joueurs.map(j => j.id === drag.id ? { ...j, x: p.x, y: p.y } : j) })
    } else {
      up({ ballon: { x: p.x, y: p.y } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, joueurs, ballon, fleches])

  const startDrag = (e, type, id) => {
    if (readOnly || mode !== 'select') return
    e.stopPropagation()
    setDrag({ type, id })
  }

  const stopDrag = () => setDrag(null)

  const delJoueur = (e, id) => {
    e.preventDefault(); e.stopPropagation()
    up({ joueurs: joueurs.filter(j => j.id !== id) })
  }

  const delFleche = (id) => {
    up({ fleches: fleches.filter(f => f.id !== id) })
    setSelArrow(null)
  }

  const beginEdit = (e, j) => {
    if (readOnly || mode !== 'select') return
    e.stopPropagation()
    setEditId(j.id); setEditVal(j.nom)
  }

  const saveEdit = () => {
    up({ joueurs: joueurs.map(j => j.id === editId ? { ...j, nom: editVal || j.nom } : j) })
    setEditId(null)
  }

  const sorted = [...fleches].sort((a, b) => (a.seq || 0) - (b.seq || 0))

  const playAnim = () => {
    if (animating) { clearTimeout(animTimer.current); setAnimating(false); setAnimIdx(-1); return }
    if (!sorted.length) return
    setAnimating(true); setAnimIdx(0)
    let i = 0
    const next = () => {
      i++
      if (i < sorted.length) { setAnimIdx(i); animTimer.current = setTimeout(next, 1100) }
      else { animTimer.current = setTimeout(() => { setAnimating(false); setAnimIdx(-1) }, 900) }
    }
    animTimer.current = setTimeout(next, 1100)
  }

  useEffect(() => () => clearTimeout(animTimer.current), [])

  const tb = (active, c = '#9ca3af') => ({
    background: active ? `${c}22` : '#0d0d0d',
    border: `1px solid ${active ? c : '#1f2937'}`,
    borderRadius: '7px', color: active ? c : '#6b7280',
    fontSize: '11px', fontWeight: 700, padding: '5px 9px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  })

  const mid = (f) => ({ x: (f.x1 + f.x2) / 2, y: (f.y1 + f.y2) / 2 })
  const flen = (f) => Math.hypot(f.x2 - f.x1, f.y2 - f.y1)

  return (
    <div>
      {!readOnly && (
        <>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
            <button style={tb(mode === 'select')} onClick={() => { setMode('select'); setArrowFrom(null) }}>↖ Sélect</button>
            <div style={{ width: 1, height: 16, background: '#1f2937', margin: '0 2px' }} />
            <button style={tb(mode === 'add_nous', '#4ade80')} onClick={() => { setMode('add_nous'); setArrowFrom(null) }}>🟢 +Nous</button>
            <button style={tb(mode === 'add_adv', '#f87171')} onClick={() => { setMode('add_adv'); setArrowFrom(null) }}>🔴 +Adv</button>
            <button style={tb(mode === 'add_ball', '#fde68a')} onClick={() => { setMode('add_ball'); setArrowFrom(null) }}>⚽ Ballon</button>
            <div style={{ width: 1, height: 16, background: '#1f2937', margin: '0 2px' }} />
            <button style={tb(mode === 'arrow', '#60a5fa')} onClick={() => { setMode('arrow'); setArrowFrom(null) }}>
              {mode === 'arrow' && arrowFrom ? '▶ clic arrivée…' : '→ Flèche'}
            </button>
            {mode === 'arrow' && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setArrowColor(c)} style={{ width: 16, height: 16, background: c, border: arrowColor === c ? '2px solid #fff' : '1px solid #111', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            )}
            <div style={{ width: 1, height: 16, background: '#1f2937', margin: '0 2px' }} />
            <button
              onClick={playAnim}
              disabled={!fleches.length}
              style={{ ...tb(animating, '#a78bfa'), opacity: fleches.length ? 1 : 0.4 }}
            >
              {animating ? '⏹ Stop' : '▶ Animer'}
            </button>
            {(joueurs.length || ballon || fleches.length) ? (
              <button onClick={() => { up({ joueurs: [], ballon: null, fleches: [] }); setArrowFrom(null) }}
                style={{ ...tb(false), marginLeft: 'auto', color: '#6b7280' }}>↺ Reset</button>
            ) : null}
          </div>
          <p style={{ color: '#374151', fontSize: '10px', margin: '0 0 6px' }}>
            {mode === 'select' && 'Glisse les éléments · Double-clic → renommer · Clic droit → supprimer'}
            {mode === 'add_nous' && 'Clique sur le terrain pour placer un joueur (notre équipe)'}
            {mode === 'add_adv' && 'Clique sur le terrain pour placer un joueur (adversaire)'}
            {mode === 'add_ball' && 'Clique sur le terrain pour placer le ballon'}
            {mode === 'arrow' && !arrowFrom && 'Clique pour définir le départ de la flèche'}
            {mode === 'arrow' && arrowFrom && "Clique pour définir l'arrivée · Échap pour annuler"}
          </p>
        </>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', borderRadius: '10px', userSelect: 'none', touchAction: 'none', cursor: mode === 'select' ? 'default' : 'crosshair' }}
        onClick={clickSVG}
        onMouseMove={onMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchMove={onMove}
        onTouchEnd={stopDrag}
        onKeyDown={e => e.key === 'Escape' && setArrowFrom(null)}
        tabIndex={0}
      >
        <defs>
          {COLORS.map(c => (
            <marker key={c} id={`arr-${ARROW_MARKERS[c]}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill={c} />
            </marker>
          ))}
        </defs>

        {/* Pelouse */}
        <rect width={W} height={H} fill="#1a3a1a" rx="8" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={i * 74} y={0} width={74} height={H} fill={i % 2 === 0 ? '#1d3d1d' : '#1a3a1a'} />
        ))}

        {/* Lignes */}
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} rx={3} />
        <text x={W / 2} y={23} textAnchor="middle" fill="#ffffff1a" fontSize={9} fontFamily="sans-serif">— CÔTÉ ADVERSE —</text>
        {/* Grande surface */}
        <rect x={135} y={H - 108} width={W - 270} height={108} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        {/* Petite surface */}
        <rect x={202} y={H - 48} width={W - 404} height={48} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.3} />
        {/* But */}
        <rect x={218} y={H - 10} width={W - 436} height={10} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeWidth={2} strokeOpacity={0.65} />
        {/* Penalty */}
        <circle cx={W / 2} cy={H - 74} r={3} fill="#fff" fillOpacity={0.5} />
        {/* Arc */}
        <path d={`M 158 ${H - 108} A 88 88 0 0 0 ${W - 158} ${H - 108}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.38} strokeDasharray="5 4" />

        {/* Flèches */}
        {sorted.map((f, idx) => {
          const visible = !animating || idx <= animIdx
          if (!visible) return null
          const animatingCur = animating && idx === animIdx
          const len = flen(f)
          const mk = `url(#arr-${ARROW_MARKERS[f.c] || 'yw'})`
          const m = mid(f)
          return (
            <g key={f.id}>
              {/* Zone de clic */}
              <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke="transparent" strokeWidth={14}
                onClick={e => { e.stopPropagation(); setSelArrow(selArrow === f.id ? null : f.id) }}
                style={{ cursor: 'pointer' }}
              />
              {/* Trait */}
              <line
                x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2}
                stroke={f.c || '#fbbf24'} strokeWidth={selArrow === f.id ? 3 : 2}
                strokeOpacity={animating && idx < animIdx ? 0.45 : 1}
                markerEnd={mk}
                strokeDasharray={animatingCur ? `${len} ${len}` : undefined}
                strokeDashoffset={animatingCur ? len : undefined}
                style={animatingCur ? { animation: 'drawArr 1s ease forwards' } : undefined}
              />
              {/* Badge séquence */}
              {!animating && (
                <>
                  <circle cx={m.x} cy={m.y} r={9} fill={f.c || '#fbbf24'} fillOpacity={0.25} />
                  <text x={m.x} y={m.y + 4} textAnchor="middle" fill={f.c || '#fbbf24'} fontSize={9} fontWeight="bold" fontFamily="sans-serif">{f.seq || idx + 1}</text>
                </>
              )}
            </g>
          )
        })}

        {/* Aperçu flèche */}
        {arrowFrom && mouse && mode === 'arrow' && (
          <line x1={arrowFrom.x} y1={arrowFrom.y} x2={mouse.x} y2={mouse.y}
            stroke={arrowColor} strokeWidth={2} strokeOpacity={0.55} strokeDasharray="7 5"
            markerEnd={`url(#arr-${ARROW_MARKERS[arrowColor] || 'yw'})`}
          />
        )}

        {/* Ballon */}
        {ballon && (
          <g className="dot" onMouseDown={e => startDrag(e, 'ballon', null)}
            onTouchStart={e => startDrag(e, 'ballon', null)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); up({ ballon: null }) }}
            style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
          >
            <circle cx={ballon.x} cy={ballon.y} r={13} fill="#fff" fillOpacity={0.12} stroke="#fff" strokeWidth={1} />
            <text x={ballon.x} y={ballon.y + 6} textAnchor="middle" fontSize={17}>⚽</text>
          </g>
        )}

        {/* Joueurs */}
        {joueurs.map(j => {
          const isN = j.equipe === 'nous'
          const c = isN ? '#4ade80' : '#f87171'
          const short = (j.nom || '').slice(0, 5)
          return (
            <g key={j.id} className="dot"
              onMouseDown={e => startDrag(e, 'joueur', j.id)}
              onTouchStart={e => startDrag(e, 'joueur', j.id)}
              onDoubleClick={e => beginEdit(e, j)}
              onContextMenu={e => delJoueur(e, j.id)}
              style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
            >
              <circle cx={j.x + 1} cy={j.y + 1} r={16} fill="rgba(0,0,0,0.45)" />
              <circle cx={j.x} cy={j.y} r={16} fill={isN ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'} stroke={c} strokeWidth={2} />
              <text x={j.x} y={j.y + 5} textAnchor="middle" fill={c}
                fontSize={short.length > 3 ? 9 : 12} fontWeight="bold" fontFamily="sans-serif">{short}</text>
            </g>
          )
        })}

        <style>{'@keyframes drawArr{to{stroke-dashoffset:0}}'}</style>
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

      {/* Contrôle flèche sélectionnée */}
      {selArrow && !readOnly && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#9ca3af', fontSize: '11px' }}>Couleur :</span>
          {COLORS.map(c => (
            <button key={c} onClick={() => up({ fleches: fleches.map(f => f.id === selArrow ? { ...f, c } : f) })}
              style={{ width: 18, height: 18, background: c, border: '1px solid #111', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
          ))}
          <button onClick={() => delFleche(selArrow)}
            style={{ marginLeft: '6px', background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', borderRadius: '6px', color: '#f87171', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>
            ✕ Supprimer
          </button>
        </div>
      )}
    </div>
  )
}
