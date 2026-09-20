import { useEffect, useRef, useState } from 'react'

// Demi-terrain pour les schémas de coups de pied arrêtés (CPA offensifs/
// défensifs) — plus léger que Tactipad (pas de flèches/ballon), juste des
// joueurs représentés par des ronds noir/blanc numérotés, positionnés en %
// (0-100 sur chaque axe) sur un demi-terrain généré (mêmes proportions que
// la moitié "but" de TerrainZonesSvg).
//
// Interactions en mode édition :
// - clic sur le terrain (hors joueur) → onAjouter(x, y) pose un rond
// - glisser un joueur → onDeplacer(index, x, y) à chaque mouvement (état
//   local uniquement côté appelant, pas de sauvegarde à chaque pixel)
// - relâcher après un glisser → onFinDeplacement() pour persister
// - clic simple sur un joueur (sans glisser) → onNumeroter(index)
// - double-clic sur un joueur → onRetirer(index)
const W = 260, H = 190

export default function DemiTerrainSchema({ joueurs = [], onAjouter, onDeplacer, onFinDeplacement, onRetirer, onNumeroter, maxWidth = 280 }) {
  const svgRef = useRef(null)
  const [dragIndex, setDragIndex] = useState(null)
  const aGlisseRef = useRef(false)

  const cx = W / 2
  const boxW = W * 0.6, boxH = H * 0.32
  const sixW = W * 0.3, sixH = H * 0.12
  const goalW = W * 0.18
  const circleR = W * 0.16
  const spotOffset = H * 0.23
  const rayonJoueur = 5.5
  const trait = { fill: 'none', stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5 }

  const pctDepuisEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  useEffect(() => {
    if (dragIndex === null || !onDeplacer) return
    const handleMove = (e) => {
      aGlisseRef.current = true
      const { x, y } = pctDepuisEvent(e)
      onDeplacer(dragIndex, x, y)
    }
    const handleUp = () => {
      setDragIndex(null)
      if (aGlisseRef.current) onFinDeplacement && onFinDeplacement()
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex, onDeplacer])

  const handleClickTerrain = (e) => {
    if (aGlisseRef.current) { aGlisseRef.current = false; return }
    if (!onAjouter) return
    const { x, y } = pctDepuisEvent(e)
    onAjouter(x, y)
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onClick={handleClickTerrain}
      style={{ width: '100%', maxWidth, borderRadius: 8, display: 'block', background: '#2d5a1b', cursor: onAjouter ? 'crosshair' : 'default' }}>
      <rect x={1} y={1} width={W - 2} height={H - 2} {...trait} />
      <path d={`M ${cx - circleR} ${H} A ${circleR} ${circleR} 0 0 1 ${cx + circleR} ${H}`} {...trait} />
      <rect x={cx - boxW / 2} y={0} width={boxW} height={boxH} {...trait} />
      <rect x={cx - sixW / 2} y={0} width={sixW} height={sixH} {...trait} />
      <circle cx={cx} cy={spotOffset} r={2} fill="rgba(255,255,255,0.6)" />
      <path d={`M ${cx - circleR * 0.85} ${boxH} A ${circleR} ${circleR} 0 0 0 ${cx + circleR * 0.85} ${boxH}`} {...trait} />
      <rect x={cx - goalW / 2} y={-3} width={goalW} height={3} fill="none" stroke="white" strokeWidth="1.5" />

      {joueurs.map((j, i) => (
        <g key={i}
          onPointerDown={e => { if (onDeplacer) { e.stopPropagation(); aGlisseRef.current = false; setDragIndex(i) } }}
          onClick={e => {
            e.stopPropagation()
            if (aGlisseRef.current) { aGlisseRef.current = false; return }
            onNumeroter && onNumeroter(i)
          }}
          onDoubleClick={e => { e.stopPropagation(); onRetirer && onRetirer(i) }}
          style={{ cursor: onDeplacer ? 'grab' : (onNumeroter ? 'pointer' : 'default') }}>
          <circle cx={(Number(j.x) || 0) / 100 * W} cy={(Number(j.y) || 0) / 100 * H} r={rayonJoueur}
            fill={j.couleur === 'noir' ? '#111' : '#fff'} stroke={j.couleur === 'noir' ? '#fff' : '#111'} strokeWidth={1.2} />
          {j.numero && (
            <text x={(Number(j.x) || 0) / 100 * W} y={(Number(j.y) || 0) / 100 * H}
              fill={j.couleur === 'noir' ? '#fff' : '#111'} fontSize={6.5} fontWeight={800}
              textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {j.numero}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
