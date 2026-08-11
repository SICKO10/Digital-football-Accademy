import { useState, useRef, useCallback } from 'react'

// Demi-terrain football — coordonnées normalisées (0-100)
const PITCH_W = 500
const PITCH_H = 340

export default function TacticalBoard({ joueurs = [], onChange, readOnly = false }) {
  // joueurs = [{id, x, y, equipe: 'nous'|'adverse', label}]
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [modeEquipe, setModeEquipe] = useState('nous')
  const nextId = useRef(joueurs.length + 1)

  const getSVGPos = (e) => {
    const svg = svgRef.current
    if (!svg) return { x: 50, y: 50 }
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 100),
      y: Math.round(((clientY - rect.top) / rect.height) * 100),
    }
  }

  const ajouterJoueur = (e) => {
    if (readOnly || dragging) return
    if (e.target.closest('.joueur-dot')) return
    const pos = getSVGPos(e)
    const id = nextId.current++
    const nouveau = {
      id,
      x: pos.x,
      y: pos.y,
      equipe: modeEquipe,
      label: modeEquipe === 'nous'
        ? String(joueurs.filter(j => j.equipe === 'nous').length + 1)
        : String(joueurs.filter(j => j.equipe === 'adverse').length + 1),
    }
    onChange([...joueurs, nouveau])
  }

  const startDrag = (e, id) => {
    if (readOnly) return
    e.stopPropagation()
    setDragging(id)
  }

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    const pos = getSVGPos(e)
    onChange(joueurs.map(j => j.id === dragging
      ? { ...j, x: Math.max(2, Math.min(98, pos.x)), y: Math.max(2, Math.min(98, pos.y)) }
      : j
    ))
  }, [dragging, joueurs, onChange])

  const stopDrag = () => setDragging(null)

  const supprimerJoueur = (e, id) => {
    e.stopPropagation()
    onChange(joueurs.filter(j => j.id !== id))
  }

  const reset = () => { onChange([]); nextId.current = 1 }

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Ajouter :</span>
          <button
            onClick={() => setModeEquipe('nous')}
            style={{
              background: modeEquipe === 'nous' ? 'rgba(74,222,128,0.15)' : '#111',
              border: `1px solid ${modeEquipe === 'nous' ? '#4ade80' : '#222'}`,
              borderRadius: '8px', color: modeEquipe === 'nous' ? '#4ade80' : '#9ca3af',
              fontSize: '12px', fontWeight: 700, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            🟢 Notre équipe
          </button>
          <button
            onClick={() => setModeEquipe('adverse')}
            style={{
              background: modeEquipe === 'adverse' ? 'rgba(248,113,113,0.15)' : '#111',
              border: `1px solid ${modeEquipe === 'adverse' ? '#f87171' : '#222'}`,
              borderRadius: '8px', color: modeEquipe === 'adverse' ? '#f87171' : '#9ca3af',
              fontSize: '12px', fontWeight: 700, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            🔴 Adversaire
          </button>
          <span style={{ color: '#374151', fontSize: '11px', marginLeft: '4px' }}>Clic sur le terrain pour placer · Clic droit pour supprimer</span>
          {joueurs.length > 0 && (
            <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #222', borderRadius: '8px', color: '#6b7280', fontSize: '11px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        style={{ width: '100%', borderRadius: '10px', cursor: readOnly ? 'default' : 'crosshair', userSelect: 'none', touchAction: 'none' }}
        onClick={ajouterJoueur}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchMove={onMouseMove}
        onTouchEnd={stopDrag}
      >
        <rect width={PITCH_W} height={PITCH_H} fill="#1a3a1a" rx="8" />

        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={i * 72} y={0} width={72} height={PITCH_H}
            fill={i % 2 === 0 ? '#1d3d1d' : '#1a3a1a'} rx={i === 0 ? '8 0 0 8' : i === 6 ? '0 8 8 0' : '0'} />
        ))}

        <line x1={0} y1={0} x2={PITCH_W} y2={0} stroke="#4ade8044" strokeWidth={2} />
        <text x={PITCH_W / 2} y={16} textAnchor="middle" fill="#4ade8055" fontSize={11} fontFamily="sans-serif">— côté adverse —</text>

        <rect x={10} y={10} width={PITCH_W - 20} height={PITCH_H - 20} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.5} />
        <rect x={130} y={PITCH_H - 100} width={PITCH_W - 260} height={100} fill="rgba(255,255,255,0.03)" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.5} />
        <rect x={195} y={PITCH_H - 45} width={PITCH_W - 390} height={45} fill="rgba(255,255,255,0.02)" stroke="#fff" strokeWidth={1} strokeOpacity={0.4} />
        <rect x={210} y={PITCH_H - 8} width={PITCH_W - 420} height={8} fill="none" stroke="#fff" strokeWidth={2} strokeOpacity={0.7} />
        <circle cx={PITCH_W / 2} cy={PITCH_H - 70} r={3} fill="#fff" fillOpacity={0.6} />
        <path d={`M 155 ${PITCH_H - 100} A 80 80 0 0 0 ${PITCH_W - 155} ${PITCH_H - 100}`} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="4 3" />

        {joueurs.map(j => {
          const cx = (j.x / 100) * PITCH_W
          const cy = (j.y / 100) * PITCH_H
          const isNous = j.equipe === 'nous'
          const couleur = isNous ? '#4ade80' : '#f87171'
          return (
            <g
              key={j.id}
              className="joueur-dot"
              onMouseDown={e => startDrag(e, j.id)}
              onTouchStart={e => startDrag(e, j.id)}
              onContextMenu={e => { e.preventDefault(); supprimerJoueur(e, j.id) }}
              style={{ cursor: readOnly ? 'default' : 'grab' }}
            >
              <circle cx={cx + 1} cy={cy + 1} r={14} fill="rgba(0,0,0,0.5)" />
              <circle cx={cx} cy={cy} r={14} fill={isNous ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'} stroke={couleur} strokeWidth={2} />
              <text x={cx} y={cy + 5} textAnchor="middle" fill={couleur} fontSize={12} fontWeight="bold" fontFamily="sans-serif">{j.label}</text>
            </g>
          )
        })}
      </svg>

      {!readOnly && joueurs.length === 0 && (
        <p style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '8px' }}>Clique sur le terrain pour placer les joueurs</p>
      )}

      {joueurs.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>🟢 Notre équipe</span>
          <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600 }}>🔴 Adversaire</span>
          {!readOnly && <span style={{ fontSize: '11px', color: '#374151' }}>Clic droit → supprimer</span>}
        </div>
      )}
    </div>
  )
}
