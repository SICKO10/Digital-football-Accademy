import { useEffect, useRef, useState } from 'react'

// Demi-terrain pour les schémas de coups de pied arrêtés (CPA offensifs/
// défensifs) — plus léger que Tactipad (pas de ballon), avec 4 types
// d'éléments positionnés en % (0-100 sur chaque axe, même convention que le
// reste de l'app) : joueur (rond noir/blanc numéroté), carre (zone
// rectangulaire), cercle_zone (zone circulaire) et fleche (vecteur).
//
// Interactions en mode édition (outil actif fourni par l'appelant) :
// - outil 'joueur' : clic sur le terrain → onCreerElement(joueur) ; clic
//   simple sur un joueur (sans glisser) → onNumeroter(id)
// - outils 'carre'/'cercle_zone'/'fleche' : clic+glisser sur le terrain
//   dessine l'élément, prévisualisé en pointillés puis commité via
//   onCreerElement au relâchement
// - glisser un joueur, un carré ou un cercle (déjà posé) → onDeplacerElement
//   (id, patch) à chaque mouvement (l'appelant ne persiste en base qu'au
//   relâchement, via onFinDeplacement) ; les flèches ne se déplacent pas
//   (elles se redessinent)
// - double-clic sur n'importe quel élément → onSupprimer(id)
const W = 260, H = 190
const RAYON_JOUEUR = 5.5

const clamp = (n) => Math.max(0, Math.min(100, n))

export default function DemiTerrainSchema({
  elements = [], outil = 'joueur', couleurJoueur = 'noir', couleurZone = '#4ade80',
  onCreerElement, onDeplacerElement, onFinDeplacement, onNumeroter, onSupprimer,
  maxWidth = 280,
}) {
  const svgRef = useRef(null)
  const [dragInfo, setDragInfo] = useState(null) // { id, type, offX, offY } — offX/offY = ancre - pointeur au moment du pointerdown
  const [dessin, setDessin] = useState(null)
  const aGlisseRef = useRef(false)

  const cx = W / 2
  const boxW = W * 0.6, boxH = H * 0.32
  const sixW = W * 0.3, sixH = H * 0.12
  const goalW = W * 0.18
  const circleR = W * 0.16
  const spotOffset = H * 0.23
  const trait = { fill: 'none', stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5 }

  const pctDepuisEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: clamp(x), y: clamp(y) }
  }
  const px = (v) => (Number(v) || 0) / 100 * W
  const py = (v) => (Number(v) || 0) / 100 * H

  const demarrerGlisser = (e, el) => {
    if (!onDeplacerElement) return
    e.stopPropagation()
    aGlisseRef.current = false
    const { x, y } = pctDepuisEvent(e)
    const ancreX = el.type === 'cercle_zone' ? el.cx : el.x
    const ancreY = el.type === 'cercle_zone' ? el.cy : el.y
    setDragInfo({ id: el.id, type: el.type, offX: (Number(ancreX) || 0) - x, offY: (Number(ancreY) || 0) - y })
  }

  useEffect(() => {
    if (!dragInfo || !onDeplacerElement) return
    const handleMove = (e) => {
      aGlisseRef.current = true
      const { x, y } = pctDepuisEvent(e)
      const nx = clamp(x + dragInfo.offX), ny = clamp(y + dragInfo.offY)
      onDeplacerElement(dragInfo.id, dragInfo.type === 'cercle_zone' ? { cx: nx, cy: ny } : { x: nx, y: ny })
    }
    const handleUp = () => {
      setDragInfo(null)
      if (aGlisseRef.current) onFinDeplacement && onFinDeplacement()
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragInfo, onDeplacerElement])

  useEffect(() => {
    if (!dessin) return
    const handleMove = (e) => {
      const { x, y } = pctDepuisEvent(e)
      setDessin(d => d ? { ...d, x2: x, y2: y } : d)
    }
    const handleUp = () => {
      setDessin(courant => {
        if (courant && onCreerElement) {
          const { type, x1, y1, x2, y2 } = courant
          if (type === 'carre') {
            const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
            if (w > 1.5 && h > 1.5) onCreerElement({ type: 'carre', x, y, w, h, couleur: couleurZone })
          } else if (type === 'cercle_zone') {
            const r = Math.hypot(x2 - x1, y2 - y1)
            if (r > 1.5) onCreerElement({ type: 'cercle_zone', cx: x1, cy: y1, r, couleur: couleurZone })
          } else if (type === 'fleche') {
            if (Math.hypot(x2 - x1, y2 - y1) > 1.5) onCreerElement({ type: 'fleche', x1, y1, x2, y2, couleur: couleurZone })
          }
        }
        return null
      })
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dessin, couleurZone, onCreerElement])

  const handlePointerDownTerrain = (e) => {
    if (outil === 'joueur' || !onCreerElement) return
    const { x, y } = pctDepuisEvent(e)
    setDessin({ type: outil, x1: x, y1: y, x2: x, y2: y })
  }

  const handleClickTerrain = (e) => {
    if (aGlisseRef.current) { aGlisseRef.current = false; return }
    if (outil !== 'joueur' || !onCreerElement) return
    const { x, y } = pctDepuisEvent(e)
    onCreerElement({ type: 'joueur', x, y, couleur: couleurJoueur, numero: '' })
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onClick={handleClickTerrain} onPointerDown={handlePointerDownTerrain}
      style={{ width: '100%', maxWidth, borderRadius: 8, display: 'block', background: '#2d5a1b', cursor: onCreerElement ? 'crosshair' : 'default' }}>
      <rect x={1} y={1} width={W - 2} height={H - 2} {...trait} />
      <path d={`M ${cx - circleR} ${H} A ${circleR} ${circleR} 0 0 1 ${cx + circleR} ${H}`} {...trait} />
      <rect x={cx - boxW / 2} y={0} width={boxW} height={boxH} {...trait} />
      <rect x={cx - sixW / 2} y={0} width={sixW} height={sixH} {...trait} />
      <circle cx={cx} cy={spotOffset} r={2} fill="rgba(255,255,255,0.6)" />
      <path d={`M ${cx - circleR * 0.85} ${boxH} A ${circleR} ${circleR} 0 0 0 ${cx + circleR * 0.85} ${boxH}`} {...trait} />
      <rect x={cx - goalW / 2} y={-3} width={goalW} height={3} fill="none" stroke="white" strokeWidth="1.5" />

      {elements.map(el => {
        if (el.type === 'carre') {
          return (
            <rect key={el.id} x={px(el.x)} y={py(el.y)} width={px(el.w)} height={py(el.h)}
              fill={el.couleur} fillOpacity={0.15} stroke={el.couleur} strokeWidth={1.5}
              onPointerDown={e => demarrerGlisser(e, el)}
              onDoubleClick={e => { e.stopPropagation(); onSupprimer && onSupprimer(el.id) }}
              style={{ cursor: onDeplacerElement ? 'grab' : 'default' }} />
          )
        }
        if (el.type === 'cercle_zone') {
          return (
            <circle key={el.id} cx={px(el.cx)} cy={py(el.cy)} r={px(el.r)}
              fill={el.couleur} fillOpacity={0.12} stroke={el.couleur} strokeWidth={1.5} strokeDasharray="5,3"
              onPointerDown={e => demarrerGlisser(e, el)}
              onDoubleClick={e => { e.stopPropagation(); onSupprimer && onSupprimer(el.id) }}
              style={{ cursor: onDeplacerElement ? 'grab' : 'default' }} />
          )
        }
        if (el.type === 'fleche') {
          return (
            <g key={el.id} onPointerDown={e => e.stopPropagation()}>
              <defs>
                <marker id={`fleche-${el.id}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill={el.couleur} />
                </marker>
              </defs>
              <line x1={px(el.x1)} y1={py(el.y1)} x2={px(el.x2)} y2={py(el.y2)}
                stroke={el.couleur} strokeWidth={2} markerEnd={`url(#fleche-${el.id})`}
                onDoubleClick={e => { e.stopPropagation(); onSupprimer && onSupprimer(el.id) }}
                style={{ cursor: onSupprimer ? 'pointer' : 'default' }} />
            </g>
          )
        }
        return (
          <g key={el.id}
            onPointerDown={e => demarrerGlisser(e, el)}
            onClick={e => {
              e.stopPropagation()
              if (aGlisseRef.current) { aGlisseRef.current = false; return }
              // e.detail > 1 = ce clic fait partie d'un double-clic (deux
              // "click" natifs sont émis avant le "dblclick") — on l'ignore
              // ici pour ne pas rouvrir une deuxième fois le prompt de
              // numéro juste avant que le clic droit ne serve à supprimer.
              if (e.detail > 1) return
              onNumeroter && onNumeroter(el.id)
            }}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onSupprimer && onSupprimer(el.id) }}
            style={{ cursor: onDeplacerElement ? 'grab' : (onNumeroter ? 'pointer' : 'default') }}>
            <circle cx={px(el.x)} cy={py(el.y)} r={RAYON_JOUEUR}
              fill={el.couleur === 'noir' ? '#111' : '#fff'} stroke={el.couleur === 'noir' ? '#fff' : '#111'} strokeWidth={1.2} />
            {el.numero && (
              <text x={px(el.x)} y={py(el.y)}
                fill={el.couleur === 'noir' ? '#fff' : '#111'} fontSize={6.5} fontWeight={800}
                textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {el.numero}
              </text>
            )}
          </g>
        )
      })}

      {dessin && (() => {
        const { type, x1, y1, x2, y2 } = dessin
        const previsu = { fill: couleurZone, fillOpacity: type === 'cercle_zone' ? 0.1 : 0.15, stroke: couleurZone, strokeWidth: 1.5, strokeDasharray: '3,2' }
        if (type === 'carre') {
          const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
          return <rect x={px(x)} y={py(y)} width={px(w)} height={py(h)} {...previsu} />
        }
        if (type === 'cercle_zone') {
          const r = Math.hypot(x2 - x1, y2 - y1)
          return <circle cx={px(x1)} cy={py(y1)} r={px(r)} {...previsu} />
        }
        if (type === 'fleche') {
          return <line x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={couleurZone} strokeWidth={2} strokeDasharray="3,2" />
        }
        return null
      })()}
    </svg>
  )
}
