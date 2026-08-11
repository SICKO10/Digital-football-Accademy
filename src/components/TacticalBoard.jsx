import { useState, useRef, useCallback, useEffect } from 'react'

const W = 520
const H = 340

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
  const svgRef = useRef(null)
  const d = data && Array.isArray(data.etapes) && data.etapes.length ? data : EMPTY_DATA
  const etapes = d.etapes

  const [etapeIdx, setEtapeIdx] = useState(0)
  const idx = Math.min(etapeIdx, etapes.length - 1)
  const etape = etapes[idx] || emptyEtape()
  const joueurs = Array.isArray(etape.joueurs) ? etape.joueurs : []
  const ballon = etape.ballon || null

  const [mode, setMode] = useState('select')
  const [drag, setDrag] = useState(null) // { type:'joueur'|'ballon', id }
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
  }

  const supprimerEtape = (i) => {
    if (readOnly || playIdx !== null || etapes.length <= 1) return
    const next = etapes.filter((_, ix) => ix !== i)
    onChange({ etapes: next })
    setEtapeIdx(p => Math.min(p, next.length - 1))
  }

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
    if (readOnly || drag || playIdx !== null) return
    if (e.target.closest('.dot')) return
    const p = svgPos(e)
    if (mode === 'add_nous' || mode === 'add_adv') {
      const equipe = mode === 'add_nous' ? 'nous' : 'adverse'
      const num = joueurs.filter(j => j.equipe === equipe).length + 1
      majEtape({ joueurs: [...joueurs, { id: nextId.current++, x: p.x, y: p.y, equipe, nom: String(num) }] })
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
  }

  const stopDrag = () => setDrag(null)

  const delJoueur = (e, id) => {
    if (readOnly || playIdx !== null) return
    e.preventDefault(); e.stopPropagation()
    majEtape({ joueurs: joueurs.filter(j => j.id !== id) })
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

  const tb = (active, c = '#9ca3af') => ({
    background: active ? `${c}22` : '#0d0d0d',
    border: `1px solid ${active ? c : '#1f2937'}`,
    borderRadius: '7px', color: active ? c : '#6b7280',
    fontSize: '11px', fontWeight: 700, padding: '5px 9px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  })

  const showEtapesRow = !readOnly || etapes.length > 1

  return (
    <div>
      {showEtapesRow && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginRight: '2px' }}>Étapes</span>
          {etapes.map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => { setPlayIdx(null); setEtapeIdx(i) }}
                disabled={playIdx !== null}
                style={{
                  background: displayIdx === i ? 'rgba(167,139,250,0.18)' : '#0d0d0d',
                  border: `1px solid ${displayIdx === i ? '#a78bfa' : '#1f2937'}`,
                  borderRadius: !readOnly && etapes.length > 1 ? '6px 0 0 6px' : '6px',
                  color: displayIdx === i ? '#a78bfa' : '#9ca3af',
                  fontSize: '11px', fontWeight: 700, padding: '5px 9px',
                  cursor: playIdx !== null ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >{i + 1}</button>
              {!readOnly && etapes.length > 1 && (
                <button onClick={() => supprimerEtape(i)} disabled={playIdx !== null}
                  style={{ background: '#0d0d0d', border: '1px solid #1f2937', borderLeft: 'none', borderRadius: '0 6px 6px 0', color: '#6b7280', fontSize: '10px', padding: '5px 6px', cursor: playIdx !== null ? 'default' : 'pointer' }}>×</button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button onClick={ajouterEtape} disabled={playIdx !== null}
              style={{ background: 'none', border: '1px dashed #374151', borderRadius: '6px', color: '#a78bfa', fontSize: '11px', fontWeight: 700, padding: '5px 9px', cursor: playIdx !== null ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Étape</button>
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
            <div style={{ width: 1, height: 16, background: '#1f2937', margin: '0 2px' }} />
            <input type="number" min={1} max={15} value={serieN} onChange={e => setSerieN(e.target.value)}
              style={{ width: '36px', background: '#0d0d0d', border: '1px solid #1f2937', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '5px 4px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }} />
            <button style={tb(false, '#4ade80')} onClick={() => ajouterSerie('nous')}>+ Série 🟢</button>
            <button style={tb(false, '#f87171')} onClick={() => ajouterSerie('adverse')}>+ Série 🔴</button>
            {(joueurs.length || ballon) ? (
              <button onClick={() => majEtape({ joueurs: [], ballon: null })}
                style={{ ...tb(false), marginLeft: 'auto', color: '#6b7280' }}>↺ Vider l'étape</button>
            ) : null}
          </div>
          <p style={{ color: '#374151', fontSize: '10px', margin: '0 0 6px' }}>
            {mode === 'select' && 'Glisse les joueurs/ballon · Double-clic → renommer · Clic droit → supprimer'}
            {mode === 'add_nous' && 'Clique sur le terrain pour placer un joueur (notre équipe)'}
            {mode === 'add_adv' && 'Clique sur le terrain pour placer un joueur (adversaire)'}
            {mode === 'add_ball' && 'Clique sur le terrain pour placer le ballon'}
          </p>
        </>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', borderRadius: '10px', userSelect: 'none', touchAction: 'none', cursor: !readOnly && mode !== 'select' && playIdx === null ? 'crosshair' : 'default' }}
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
        <rect x={135} y={H - 108} width={W - 270} height={108} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4} />
        <rect x={202} y={H - 48} width={W - 404} height={48} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.3} />
        <rect x={218} y={H - 10} width={W - 436} height={10} fill="#fff" fillOpacity={0.08} stroke="#fff" strokeWidth={2} strokeOpacity={0.65} />
        <circle cx={W / 2} cy={H - 74} r={3} fill="#fff" fillOpacity={0.5} />
        <path d={`M 158 ${H - 108} A 88 88 0 0 0 ${W - 158} ${H - 108}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.38} strokeDasharray="5 4" />

        {/* Ballon */}
        {displayBallon && (
          <g className="dot"
            style={{ transform: `translate(${displayBallon.x}px, ${displayBallon.y}px)`, transition: playIdx !== null ? 'transform 1.1s ease' : 'none', cursor: !readOnly && mode === 'select' && playIdx === null ? 'grab' : 'default' }}
            onMouseDown={e => startDrag(e, 'ballon', null)}
            onTouchStart={e => startDrag(e, 'ballon', null)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!readOnly && playIdx === null) majEtape({ ballon: null }) }}
          >
            <circle r={13} fill="#fff" fillOpacity={0.12} stroke="#fff" strokeWidth={1} />
            <text textAnchor="middle" y={6} fontSize={17}>⚽</text>
          </g>
        )}

        {/* Joueurs */}
        {displayJoueurs.map(j => {
          const isN = j.equipe === 'nous'
          const c = isN ? '#4ade80' : '#f87171'
          const initiales = (j.nom || '').slice(0, 3)
          return (
            <g key={j.id} className="dot"
              style={{ transform: `translate(${j.x}px, ${j.y}px)`, transition: playIdx !== null ? 'transform 1.1s ease' : 'none', cursor: !readOnly && mode === 'select' && playIdx === null ? 'grab' : 'default' }}
              onMouseDown={e => startDrag(e, 'joueur', j.id)}
              onTouchStart={e => startDrag(e, 'joueur', j.id)}
              onDoubleClick={e => beginEdit(e, j)}
              onContextMenu={e => delJoueur(e, j.id)}
            >
              <circle cx={1} cy={1} r={15} fill="rgba(0,0,0,0.45)" />
              <circle r={15} fill={isN ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'} stroke={c} strokeWidth={2} />
              <text textAnchor="middle" y={4} fill={c} fontSize={initiales.length > 2 ? 9 : 12} fontWeight="bold" fontFamily="sans-serif">{initiales}</text>
              {j.nom && (
                <text textAnchor="middle" y={28} fill={c} fontSize={9} fontWeight="700" fontFamily="sans-serif" style={{ paintOrder: 'stroke' }} stroke="#080808" strokeWidth={3}>{j.nom}</text>
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
