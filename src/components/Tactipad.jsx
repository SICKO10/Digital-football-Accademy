import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Ellipse, Rect, Arrow, Line, Text, Group, Transformer } from 'react-konva'
import GIF from 'gif.js'
import { supabase } from '../supabase'
import { t } from '../lib/translations'

const COULEURS = [
  { val: '#4ade80', label: 'Vert' },
  { val: '#ffffff', label: 'Blanc' },
  { val: '#fbbf24', label: 'Jaune' },
  { val: '#ef4444', label: 'Rouge' },
  { val: '#111111', label: 'Noir' },
]

// Rayon approximatif d'un joueur/objet en unités Stage — marge pour que le
// centre d'un élement glissé ne sorte jamais visuellement du terrain.
const ELEMENT_DRAG_MARGIN = 18

// Espacement du quadrillage repère, en unités Stage (le Stage se redimensionne
// dynamiquement — pas de largeur/hauteur fixes comme TacticalBoard.jsx).
const GRID_SIZE = 50

// Jusqu'à 4 équipes sur le plateau (utile pour les exercices à plusieurs
// groupes, pas seulement une opposition A vs B) — couleur/label lookupés
// partout au lieu d'un ternaire binaire A/B codé en dur.
export const EQUIPES_CONFIG = {
  A: { label: 'tac_equipe_a', color: '#4ade80', emoji: '🟢' },
  B: { label: 'tac_equipe_b', color: '#f97316', emoji: '🟠' },
  C: { label: 'tac_equipe_c', color: '#60a5fa', emoji: '🔵' },
  D: { label: 'tac_equipe_d', color: '#f43f5e', emoji: '🔴' },
}

// Palette proposée dans le picker de couleur d'équipe (clic droit sur un bouton équipe).
const PALETTE_COULEURS_EQUIPE = [
  '#4ade80', '#22c55e', '#f97316', '#ef4444', '#60a5fa', '#3b82f6',
  '#f43f5e', '#a78bfa', '#fbbf24', '#f59e0b', '#34d399', '#ffffff',
  '#e879f9', '#06b6d4', '#84cc16', '#fb923c',
]

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

export const DISPOSITIFS = {
  '4-3-3': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.42, y: 0.25 }, { num: 7, x: 0.42, y: 0.50 }, { num: 8, x: 0.42, y: 0.75 },
    { num: 9, x: 0.65, y: 0.20 }, { num: 10, x: 0.65, y: 0.50 }, { num: 11, x: 0.65, y: 0.80 },
  ],
  '4-4-2': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.42, y: 0.15 }, { num: 7, x: 0.42, y: 0.38 }, { num: 8, x: 0.42, y: 0.62 }, { num: 9, x: 0.42, y: 0.85 },
    { num: 10, x: 0.65, y: 0.35 }, { num: 11, x: 0.65, y: 0.65 },
  ],
  '4-4-2-plat': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.40, y: 0.15 }, { num: 7, x: 0.40, y: 0.38 }, { num: 8, x: 0.40, y: 0.62 }, { num: 9, x: 0.40, y: 0.85 },
    { num: 10, x: 0.65, y: 0.38 }, { num: 11, x: 0.65, y: 0.62 },
  ],
  '4-2-3-1': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.38, y: 0.35 }, { num: 7, x: 0.38, y: 0.65 },
    { num: 8, x: 0.55, y: 0.15 }, { num: 9, x: 0.55, y: 0.50 }, { num: 10, x: 0.55, y: 0.85 },
    { num: 11, x: 0.70, y: 0.50 },
  ],
  '4-5-1': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.40, y: 0.10 }, { num: 7, x: 0.40, y: 0.30 }, { num: 8, x: 0.40, y: 0.50 }, { num: 9, x: 0.40, y: 0.70 }, { num: 10, x: 0.40, y: 0.90 },
    { num: 11, x: 0.65, y: 0.50 },
  ],
  '4-1-4-1': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.35, y: 0.50 },
    { num: 7, x: 0.50, y: 0.15 }, { num: 8, x: 0.50, y: 0.38 }, { num: 9, x: 0.50, y: 0.62 }, { num: 10, x: 0.50, y: 0.85 },
    { num: 11, x: 0.68, y: 0.50 },
  ],
  '4-3-2-1': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.15 }, { num: 3, x: 0.20, y: 0.38 }, { num: 4, x: 0.20, y: 0.62 }, { num: 5, x: 0.20, y: 0.85 },
    { num: 6, x: 0.38, y: 0.20 }, { num: 7, x: 0.38, y: 0.50 }, { num: 8, x: 0.38, y: 0.80 },
    { num: 9, x: 0.55, y: 0.35 }, { num: 10, x: 0.55, y: 0.65 },
    { num: 11, x: 0.70, y: 0.50 },
  ],
  '3-5-2': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.25 }, { num: 3, x: 0.20, y: 0.50 }, { num: 4, x: 0.20, y: 0.75 },
    { num: 5, x: 0.40, y: 0.10 }, { num: 6, x: 0.40, y: 0.30 }, { num: 7, x: 0.40, y: 0.50 }, { num: 8, x: 0.40, y: 0.70 }, { num: 9, x: 0.40, y: 0.90 },
    { num: 10, x: 0.65, y: 0.35 }, { num: 11, x: 0.65, y: 0.65 },
  ],
  '3-4-3': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.25 }, { num: 3, x: 0.20, y: 0.50 }, { num: 4, x: 0.20, y: 0.75 },
    { num: 5, x: 0.40, y: 0.15 }, { num: 6, x: 0.40, y: 0.38 }, { num: 7, x: 0.40, y: 0.62 }, { num: 8, x: 0.40, y: 0.85 },
    { num: 9, x: 0.65, y: 0.20 }, { num: 10, x: 0.65, y: 0.50 }, { num: 11, x: 0.65, y: 0.80 },
  ],
  '3-4-1-2': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.25 }, { num: 3, x: 0.20, y: 0.50 }, { num: 4, x: 0.20, y: 0.75 },
    { num: 5, x: 0.42, y: 0.15 }, { num: 6, x: 0.42, y: 0.38 }, { num: 7, x: 0.42, y: 0.62 }, { num: 8, x: 0.42, y: 0.85 },
    { num: 9, x: 0.55, y: 0.50 },
    { num: 10, x: 0.68, y: 0.35 }, { num: 11, x: 0.68, y: 0.65 },
  ],
  '5-3-2': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.10 }, { num: 3, x: 0.20, y: 0.30 }, { num: 4, x: 0.20, y: 0.50 }, { num: 5, x: 0.20, y: 0.70 }, { num: 6, x: 0.20, y: 0.90 },
    { num: 7, x: 0.42, y: 0.25 }, { num: 8, x: 0.42, y: 0.50 }, { num: 9, x: 0.42, y: 0.75 },
    { num: 10, x: 0.65, y: 0.35 }, { num: 11, x: 0.65, y: 0.65 },
  ],
  '5-4-1': [
    { num: 1, x: 0.05, y: 0.50 },
    { num: 2, x: 0.20, y: 0.10 }, { num: 3, x: 0.20, y: 0.30 }, { num: 4, x: 0.20, y: 0.50 }, { num: 5, x: 0.20, y: 0.70 }, { num: 6, x: 0.20, y: 0.90 },
    { num: 7, x: 0.45, y: 0.15 }, { num: 8, x: 0.45, y: 0.38 }, { num: 9, x: 0.45, y: 0.62 }, { num: 10, x: 0.45, y: 0.85 },
    { num: 11, x: 0.68, y: 0.50 },
  ],
}

export function terrainSvgString({ sport, vue, fond, w, h }) {
  const bg = fond === 'vert' ? '#1a7a3c' : '#ffffff'
  const line = fond === 'vert' ? '#ffffff' : '#333333'
  const lw = 2
  const cx = w / 2, cy = h / 2

  if (sport === 'futsal') {
    const buteW = w * 0.05, buteH = h * 0.32
    if (vue === 'demi') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="${bg}" stroke="${line}" stroke-width="${lw}"/>
        <line x1="${w - 2}" y1="0" x2="${w - 2}" y2="${h}" stroke="${line}" stroke-width="${lw}" stroke-dasharray="8,6"/>
        <rect x="0" y="${cy - buteH / 2}" width="${buteW}" height="${buteH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
        <path d="M 0 ${cy - h * 0.32} A ${w * 0.28} ${w * 0.28} 0 0 1 0 ${cy + h * 0.32}" fill="none" stroke="${line}" stroke-width="${lw}"/>
        <path d="M ${w - 2} ${cy - h * 0.18} A ${w * 0.13} ${w * 0.13} 0 0 0 ${w - 2} ${cy + h * 0.18}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      </svg>`
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="${bg}" stroke="${line}" stroke-width="${lw}"/>
      <line x1="${cx}" y1="0" x2="${cx}" y2="${h}" stroke="${line}" stroke-width="${lw}"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.14}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <circle cx="${cx}" cy="${cy}" r="2.5" fill="${line}"/>
      <rect x="0" y="${cy - buteH / 2}" width="${buteW}" height="${buteH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <path d="M 0 ${cy - h * 0.3} A ${w * 0.26} ${w * 0.26} 0 0 1 0 ${cy + h * 0.3}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <rect x="${w - buteW}" y="${cy - buteH / 2}" width="${buteW}" height="${buteH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <path d="M ${w} ${cy - h * 0.3} A ${w * 0.26} ${w * 0.26} 0 0 0 ${w} ${cy + h * 0.3}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    </svg>`
  }

  const boxW = w * 0.16, boxH = h * 0.55, goalW = w * 0.06, goalH = h * 0.28
  if (vue === 'demi') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="${bg}" stroke="${line}" stroke-width="${lw}"/>
      <line x1="${w - 2}" y1="0" x2="${w - 2}" y2="${h}" stroke="${line}" stroke-width="${lw}" stroke-dasharray="8,6"/>
      <rect x="0" y="${cy - boxH / 2}" width="${boxW}" height="${boxH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <rect x="0" y="${cy - goalH / 2}" width="${goalW}" height="${goalH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <circle cx="${boxW * 0.65}" cy="${cy}" r="2.5" fill="${line}"/>
      <path d="M ${boxW} ${cy - h * 0.18} A ${h * 0.2} ${h * 0.2} 0 0 1 ${boxW} ${cy + h * 0.18}" fill="none" stroke="${line}" stroke-width="${lw}"/>
      <path d="M ${w - 2} ${cy - h * 0.2} A ${w * 0.14} ${w * 0.14} 0 0 0 ${w - 2} ${cy + h * 0.2}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    </svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}" stroke="${line}" stroke-width="${lw}"/>
    <line x1="${cx}" y1="0" x2="${cx}" y2="${h}" stroke="${line}" stroke-width="${lw}"/>
    <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.15}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <circle cx="${cx}" cy="${cy}" r="2.5" fill="${line}"/>
    <rect x="0" y="${cy - boxH / 2}" width="${boxW}" height="${boxH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <rect x="0" y="${cy - goalH / 2}" width="${goalW}" height="${goalH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <path d="M ${boxW} ${cy - h * 0.1} A ${h * 0.12} ${h * 0.12} 0 0 1 ${boxW} ${cy + h * 0.1}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <rect x="${w - boxW}" y="${cy - boxH / 2}" width="${boxW}" height="${boxH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <rect x="${w - goalW}" y="${cy - goalH / 2}" width="${goalW}" height="${goalH}" fill="none" stroke="${line}" stroke-width="${lw}"/>
    <path d="M ${w - boxW} ${cy - h * 0.1} A ${h * 0.12} ${h * 0.12} 0 0 0 ${w - boxW} ${cy + h * 0.1}" fill="none" stroke="${line}" stroke-width="${lw}"/>
  </svg>`
}

export function useSvgImage(svgString) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    const image = new window.Image()
    image.onload = () => setImg(image)
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
    return () => { image.onload = null }
  }, [svgString])
  return img
}

function computeArrowPoints(style, x1, y1, x2, y2) {
  if (style === 'dribble') {
    const steps = 6
    const pts = []
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    const amp = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const px = x1 + dx * t
      const py = y1 + dy * t
      const off = i === 0 || i === steps ? 0 : (i % 2 === 0 ? amp : -amp)
      pts.push(px + nx * off, py + ny * off)
    }
    return pts
  }
  if (style === 'courbe') {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    const offset = Math.min(len * 0.35, 50)
    return [x1, y1, mx + nx * offset, my + ny * offset, x2, y2]
  }
  return [x1, y1, x2, y2]
}

// couleurs : surcharge optionnelle { A, B, C, D } — permet à l'éditeur de
// personnaliser les couleurs d'équipe (cf. equipesCouleurs) sans toucher aux
// couleurs par défaut d'EQUIPES_CONFIG, réutilisées telles quelles par
// TactipadPublic.jsx quand un schéma n'a pas de couleurs personnalisées.
export function JoueurNode({ el, isSelected, onSelect = () => {}, onChange = () => {}, onEdit = () => {}, draggable = true, couleurs = null, dragBoundFunc }) {
  const isJoker = el.type === 'joker'
  const color = isJoker ? '#ffffff' : (couleurs?.[el.equipe] ?? EQUIPES_CONFIG[el.equipe]?.color ?? EQUIPES_CONFIG.A.color)
  return (
    <Group
      x={el.x} y={el.y} draggable={draggable} dragBoundFunc={dragBoundFunc}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDblClick={() => onEdit(el.id)}
      onDblTap={() => onEdit(el.id)}
      onDragEnd={e => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >
      {isJoker ? (
        <Circle radius={14} fill="rgba(255,255,255,0.55)" stroke={isSelected ? '#4ade80' : '#000000'} strokeWidth={isSelected ? 3 : 1.5} dash={[4, 3]} />
      ) : el.gardien ? (
        <Rect x={-14} y={-14} width={28} height={28} cornerRadius={8} fill={color} stroke={isSelected ? '#fff' : '#00000060'} strokeWidth={isSelected ? 3 : 1.5} />
      ) : (
        <Circle radius={14} fill={color} stroke={isSelected ? '#fff' : '#00000060'} strokeWidth={isSelected ? 3 : 1.5} />
      )}
      <Text text={isJoker ? '★' : String(el.numero ?? '')} fontSize={isJoker ? 14 : 12} fontStyle="bold" fill="#000" width={28} height={28} x={-14} y={-14} align="center" verticalAlign="middle" listening={false} />
      {el.nom && (
        <Text text={el.nom} fontSize={10} fill="#fff" x={-30} y={16} width={60} align="center" listening={false} />
      )}
    </Group>
  )
}

// Matériel tactique (coupelles/cônes colorés, cerceau, échelles de coordination)
// — rendu en formes Konva natives (pas de <img>/SVG externe) pour rester cohérent
// avec le reste des objets du plateau (plot, cages...) : sélection/drag/suppression
// génériques déjà gérés par ObjetNode pour tout élément type:'objet', quel que soit
// son kind.
const MATERIEL_COULEURS = {
  coupelle_rouge: { fill: '#e53e3e', dark: '#c53030' },
  coupelle_jaune: { fill: '#ecc94b', dark: '#d69e2e' },
  coupelle_bleue: { fill: '#3182ce', dark: '#2b6cb0' },
  cone_orange: { fill: '#ed8936', dark: '#c05621' },
  cone_rouge: { fill: '#e53e3e', dark: '#c53030' },
}

export function ObjetNode({ el, isSelected, onSelect = () => {}, onChange = () => {}, onDelete = () => {}, onRotate = () => {}, draggable = true, dragBoundFunc }) {
  const [hovered, setHovered] = useState(false)
  const isCage = el.kind === 'petite_cage' || el.kind === 'grande_cage'
  const isPlot = el.kind === 'plot'
  const isCoupelle = el.kind === 'coupelle_rouge' || el.kind === 'coupelle_jaune' || el.kind === 'coupelle_bleue'
  const isConeMateriel = el.kind === 'cone_orange' || el.kind === 'cone_rouge'
  const isCerceau = el.kind === 'cerceau'
  const isEchelleV = el.kind === 'echelle'
  const isEchelleH = el.kind === 'echelle_h'
  const cageW = el.kind === 'grande_cage' ? 44 : 30
  const cageH = el.kind === 'grande_cage' ? 24 : 18

  // Décalage du bouton × et rayon de l'anneau de sélection — dépendent de la
  // taille de chaque forme, faute d'une bounding box générique côté Konva ici.
  let delX = 10, delY = -12, selRadius = 16
  if (isCage) { delX = cageW / 2; delY = -cageH / 2; selRadius = cageW / 2 + 6 }
  else if (isPlot) { delX = 8; delY = -13 }
  else if (isCoupelle) { delX = 11; delY = -6; selRadius = 13 }
  else if (isConeMateriel) { delX = 9; delY = -13; selRadius = 16 }
  else if (isCerceau) { delX = 15; delY = -15; selRadius = 19 }
  else if (isEchelleV) { delX = 11; delY = -33; selRadius = 36 }
  else if (isEchelleH) { delX = 33; delY = -11; selRadius = 36 }

  const rungsV = [-27, -18, -9, 0, 9, 18, 27]

  return (
    <Group
      x={el.x} y={el.y} rotation={el.rotation || 0} draggable={draggable} dragBoundFunc={dragBoundFunc}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDblClick={() => isCage && draggable && onRotate()}
      onDblTap={() => isCage && draggable && onRotate()}
      onMouseEnter={() => draggable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragEnd={e => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >
      {isSelected && <Circle radius={selRadius} fill="#ffffff20" stroke="#fff" strokeWidth={1} />}
      {isCage ? (
        <>
          <Rect x={-cageW / 2} y={-cageH / 2} width={cageW} height={cageH} fill="transparent" stroke="#fff" strokeWidth={2} cornerRadius={1} />
          <Line points={[-cageW / 2, cageH / 2, -cageW / 2 + 6, cageH / 2 + 6, cageW / 2 - 6, cageH / 2 + 6, cageW / 2, cageH / 2]} stroke="#fff" strokeWidth={1.2} dash={[3, 2]} />
        </>
      ) : isPlot ? (
        <>
          <Rect x={-4} y={-9} width={8} height={16} cornerRadius={4} fill="#eab308" stroke="#ca8a04" strokeWidth={1.2} />
          <Circle y={-9} radius={4.5} fill="#fde047" stroke="#ca8a04" strokeWidth={1} />
        </>
      ) : isCoupelle ? (
        <Ellipse radiusX={11} radiusY={5} fill={MATERIEL_COULEURS[el.kind].fill} stroke={MATERIEL_COULEURS[el.kind].dark} strokeWidth={1} />
      ) : isConeMateriel ? (
        <>
          <Line points={[0, -13, -9, 13, 9, 13]} closed fill={MATERIEL_COULEURS[el.kind].fill} stroke={MATERIEL_COULEURS[el.kind].dark} strokeWidth={1} />
          <Ellipse y={13} radiusX={9} radiusY={2.5} fill={MATERIEL_COULEURS[el.kind].dark} />
        </>
      ) : isCerceau ? (
        <>
          <Circle radius={15} stroke="#38a169" strokeWidth={3} />
          <Circle radius={15} stroke="#68d391" strokeWidth={1.2} dash={[3, 3]} opacity={0.6} />
        </>
      ) : isEchelleV ? (
        <>
          <Rect x={-11} y={-33} width={3} height={66} cornerRadius={1.5} fill="#805ad5" />
          <Rect x={8} y={-33} width={3} height={66} cornerRadius={1.5} fill="#805ad5" />
          {rungsV.map(by => <Rect key={by} x={-11} y={by - 1.2} width={22} height={2.5} fill="#b794f4" />)}
        </>
      ) : isEchelleH ? (
        <>
          <Rect x={-33} y={-11} width={66} height={3} cornerRadius={1.5} fill="#805ad5" />
          <Rect x={-33} y={8} width={66} height={3} cornerRadius={1.5} fill="#805ad5" />
          {rungsV.map(bx => <Rect key={bx} x={bx - 1.2} y={-11} width={2.5} height={22} fill="#b794f4" />)}
        </>
      ) : (
        /* Le texte porte la zone cliquable/draggable : elle ne doit jamais être
           listening=false, sinon un objet non sélectionné n'a aucune zone
           interactive (le cercle ci-dessus n'existe que déjà sélectionné). */
        <Text text={el.kind === 'cone' ? '🔸' : el.kind === 'ballon' ? '⚽' : '👤'} fontSize={22} x={-12} y={-13} />
      )}
      {draggable && hovered && (
        <Group
          x={delX}
          y={delY}
          onClick={e => { e.cancelBubble = true; onDelete() }}
          onTap={e => { e.cancelBubble = true; onDelete() }}
        >
          <Circle radius={7} fill="#ef4444" />
          <Text text="×" fontSize={11} fontStyle="bold" fill="#fff" x={-4} y={-6} />
        </Group>
      )}
    </Group>
  )
}

export default function Tactipad({ userId, mode = 'standalone', vueParDefaut, onValider, onFermer, lang = 'fr' }) {
  const [isMobile] = useState(window.innerWidth < 768)
  const isModal = mode === 'modal'

  const [sport, setSport] = useState('football')
  const [vue, setVue] = useState(vueParDefaut || 'complet')
  const [fond, setFond] = useState('vert')

  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  // Sélection multiple — glisser sur le fond du terrain (outil "select") pose
  // un rectangle, puis Suppr ou le bouton dédié efface tout ce qu'il contient.
  // Restreinte aux éléments ponctuels (joueur/joker/objet/texte) dont x/y est
  // un centre — les zones (coin) et flèches (liste de points) n'ont pas une
  // géométrie compatible avec ce test "centre dans le rectangle".
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectionBox, setSelectionBox] = useState(null) // { x, y, w, h } en coordonnées Stage
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionStart = useRef(null)
  const [equipeActive, setEquipeActive] = useState('A')
  // Couleurs d'équipe personnalisables (clic droit sur le bouton équipe) —
  // initialisées depuis EQUIPES_CONFIG, sauvegardées/rechargées avec le
  // schéma (cf. sauvegarderSchema/chargerSchema) pour survivre à la fermeture.
  const [equipesCouleurs, setEquipesCouleurs] = useState(() => {
    const init = {}
    Object.keys(EQUIPES_CONFIG).forEach(eq => { init[eq] = EQUIPES_CONFIG[eq].color })
    return init
  })
  const [colorPickerOpen, setColorPickerOpen] = useState(null) // 'A' | 'B' | 'C' | 'D' | null
  const [tool, setTool] = useState('select')
  const [showMaterielPanel, setShowMaterielPanel] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [arrowColor, setArrowColor] = useState('#ffffff')
  const [pendingStart, setPendingStart] = useState(null)
  // ── NOUVEAU : position souris pour preview flèche ─────────────────────────
  const [mousePos, setMousePos] = useState(null)

  // ── Ajout d'un joueur individuel (par opposition au dispositif complet de
  // 11 posé par appliquerDispositif) ────────────────────────────────────────
  const [joueursEquipe, setJoueursEquipe] = useState([])
  const [showPickerJoueur, setShowPickerJoueur] = useState(false)
  const [pickerScreenPos, setPickerScreenPos] = useState({ x: 0, y: 0 }) // position écran (fixed) du popup
  const [pickerStagePos, setPickerStagePos] = useState({ x: 0, y: 0 })   // position sur le terrain (coords Konva) du joueur à créer
  const [pickerNumero, setPickerNumero] = useState('')
  const [pickerNom, setPickerNom] = useState('')
  const [pickerNbJoueurs, setPickerNbJoueurs] = useState('1')

  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])

  const [sequences, setSequences] = useState([[]])
  const [etapeActive, setEtapeActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playIntervalRef = useRef(null)
  const animRef = useRef(null)
  const stepTimeoutRef = useRef(null)
  const stopRequestedRef = useRef(false)
  const [animSpeed, setAnimSpeed] = useState(1)
  const [stepDurations, setStepDurations] = useState({})   // { [index]: ms }
  const [showMovementArrows, setShowMovementArrows] = useState(true)

  const [nomSchema, setNomSchema] = useState('')
  const [schemas, setSchemas] = useState([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)
  const [savingSchema, setSavingSchema] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [currentSchemaId, setCurrentSchemaId] = useState(null)

  // Dossiers pour organiser les schémas sauvegardés (cf. supabase_schemas_dossiers.sql)
  const [dossiers, setDossiers] = useState([])
  const [dossierActif, setDossierActif] = useState(null) // filtre affiché — null = tous
  const [dossierSauvegarde, setDossierSauvegarde] = useState('') // dossier assigné au prochain enregistrement
  const [newDossierNom, setNewDossierNom] = useState('')
  const [showAddDossier, setShowAddDossier] = useState(false)

  const stageRef = useRef(null)
  const trRef = useRef(null)
  const nodeRefs = useRef({})

  // Largeur du canvas Konva — mesurée sur son propre conteneur (canvasRef) via
  // ResizeObserver plutôt que dérivée de window.innerWidth : Tactipad est
  // rendu dans des contextes très différents (onglet avec sidebar 220px
  // persistante dès 768px de large, modale avec son propre padding...) que ce
  // composant n'a aucun moyen de connaître à l'avance. Se fier à la largeur
  // réellement disponible marche partout, y compris en cas de sidebar
  // tablette qui rognait l'espace sans que le calcul précédent (window.
  // innerWidth - 32) n'en tienne compte, faisant déborder le terrain sur la
  // droite. Valeur de secours identique à l'ancien calcul tant que la
  // première mesure n'est pas encore arrivée ; useLayoutEffect (avant peinture)
  // pour que la correction soit invisible plutôt qu'un flash de mauvaise taille.
  const canvasRef = useRef(null)
  const [width, setWidth] = useState(() => Math.min(window.innerWidth - 32, 1000))
  const height = Math.round(width * 10 / 16)

  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const mettreAJourLargeur = () => {
      const disponible = el.getBoundingClientRect().width
      if (disponible > 0) setWidth(Math.max(280, Math.min(Math.round(disponible), 1000)))
    }
    mettreAJourLargeur()
    const observer = new ResizeObserver(mettreAJourLargeur)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Konva stocke les positions en unités absolues (pixels du Stage au moment
  // du placement), pas en coordonnées relatives 0-1 comme DISPOSITIFS. Si le
  // conteneur se rétrécit après coup (le panneau joueurs apparaît dès qu'un
  // joueur est posé, cf. plus bas), le ResizeObserver ci-dessus recalcule
  // bien `width`/`height` et le Stage/l'image du terrain suivent — mais les
  // joueurs/flèches/zones déjà posés restent à leurs anciennes coordonnées
  // absolues, désormais fausses par rapport au terrain rétréci. On rescale
  // donc tous les éléments (de l'étape active ET des autres étapes) au même
  // ratio que le Stage à chaque changement de largeur, sans passer par
  // l'historique undo (correction automatique, pas une action de l'utilisateur).
  const prevDimsRef = useRef({ width, height })
  useEffect(() => {
    const { width: prevW, height: prevH } = prevDimsRef.current
    if (prevW === width && prevH === height) return
    if (prevW > 0 && prevH > 0) {
      const rx = width / prevW
      const ry = height / prevH
      const rescaleEl = (el) => {
        if (el.type === 'fleche') return { ...el, points: el.points.map((p, i) => (i % 2 === 0 ? p * rx : p * ry)) }
        if (el.type === 'zone-rect') return { ...el, x: el.x * rx, y: el.y * ry, width: el.width * rx, height: el.height * ry }
        if (el.type === 'zone-cercle') return { ...el, x: el.x * rx, y: el.y * ry, radius: el.radius * ((rx + ry) / 2) }
        return { ...el, x: el.x * rx, y: el.y * ry }
      }
      setElements(prev => prev.map(rescaleEl))
      setSequences(prev => prev.map(seq => seq.map(rescaleEl)))
    }
    prevDimsRef.current = { width, height }
  }, [width, height])

  const svgString = useMemo(() => terrainSvgString({ sport, vue, fond, w: width, h: height }), [sport, vue, fond, width, height])
  const terrainImg = useSvgImage(svgString)

  useEffect(() => {
    if (!isMobile && !isModal) { chargerSchemas(); chargerDossiers() }
  }, [])

  // Effectif réel de l'éducateur, pour proposer ses vrais joueurs dans le
  // picker d'ajout individuel (userId = educateur_id ici, cf. les deux points
  // d'usage de <Tactipad> dans DashboardEducateur.jsx).
  useEffect(() => {
    if (!userId) return
    supabase.from('equipe_joueurs').select('id, prenom, nom, poste, numero_maillot').eq('educateur_id', userId).order('nom')
      .then(({ data }) => setJoueursEquipe(data || []))
  }, [userId])

  const selectedElement = selectedId ? elements.find(e => e.id === selectedId) || null : null
  const TRANSFORMABLE_TYPES = ['fleche', 'zone-rect', 'zone-cercle']

  useEffect(() => {
    if (trRef.current) {
      const node = selectedElement && TRANSFORMABLE_TYPES.includes(selectedElement.type) ? nodeRefs.current[selectedId] : null
      trRef.current.nodes(node ? [node] : [])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, elements])

  // ── NOUVEAU : raccourcis clavier ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        setElements(prev => prev.filter(el => !selectedIds.has(el.id)))
        setSelectedIds(new Set())
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        setElements(prev => prev.filter(el => el.id !== selectedId))
        setSelectedId(null)
        return
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setSelectedIds(new Set())
        setPendingStart(null)
        setMousePos(null)
        setTool('select')
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        setHistory(h => {
          if (h.length === 0) return h
          const prev = h[h.length - 1]
          setFuture(f => [elements, ...f])
          setElements(prev)
          setSelectedId(null)
          return h.slice(0, -1)
        })
        return
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault()
        setFuture(f => {
          if (f.length === 0) return f
          const next = f[0]
          setHistory(h => [...h, elements])
          setElements(next)
          setSelectedId(null)
          return f.slice(1)
        })
        return
      }
      if (e.ctrlKey && e.key === 'd' && selectedId) {
        e.preventDefault()
        setElements(prev => {
          const el = prev.find(el => el.id === selectedId)
          if (!el) return prev
          return [...prev, { ...el, id: uid(), x: (el.x || 0) + 20, y: (el.y || 0) + 20 }]
        })
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, selectedIds, elements])

  const pushHistory = () => {
    setHistory(h => [...h, elements])
    setFuture([])
  }

  const applyElements = (next) => {
    pushHistory()
    setElements(next)
  }

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setFuture(f => [elements, ...f])
    setHistory(h => h.slice(0, -1))
    setElements(prev)
    setSelectedId(null)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    setHistory(h => [...h, elements])
    setFuture(f => f.slice(1))
    setElements(next)
    setSelectedId(null)
  }

  const supprimerSelection = () => {
    if (!selectedId) return
    applyElements(elements.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }

  const toutEffacer = () => {
    if (!confirm('Tout effacer le schéma actuel ?')) return
    applyElements([])
    setSelectedId(null)
  }

  // Équipes A/D attaquent vers la droite (côté gauche du terrain), B/C vers
  // la gauche (côté droit) — sans ce mirroring, B était le seul côté
  // inversé et C se retrouvait superposée à A au lieu d'être en face de B.
  const appliquerDispositif = (cle) => {
    if (!cle || !DISPOSITIFS[cle]) return
    const mirror = equipeActive === 'B' || equipeActive === 'C'
    const nouveauxJoueurs = DISPOSITIFS[cle].map(p => {
      const px = mirror ? 1 - p.x : p.x
      const ancien = elements.find(e => e.type === 'joueur' && e.equipe === equipeActive && String(e.numero) === String(p.num))
      return {
        id: uid(),
        type: 'joueur',
        equipe: equipeActive,
        gardien: p.num === 1,
        numero: p.num,
        nom: ancien?.nom || '',
        x: px * width,
        y: p.y * height,
      }
    })
    applyElements([
      ...elements.filter(e => !(e.type === 'joueur' && e.equipe === equipeActive)),
      ...nouveauxJoueurs,
    ])
    setSelectedId(null)
  }

  const updateElement = (updated) => {
    applyElements(elements.map(e => (e.id === updated.id ? updated : e)))
  }

  const editerJoueur = (id) => {
    const el = elements.find(e => e.id === id)
    if (!el) return
    if (el.type === 'joker') {
      const nom = prompt('Nom du joker (optionnel) :', el.nom ?? '')
      if (nom === null) return
      updateElement({ ...el, nom: nom.trim() })
      return
    }
    const numero = prompt('Numéro du joueur :', el.numero ?? '')
    if (numero === null) return
    const nom = prompt('Nom du joueur (optionnel) :', el.nom ?? '')
    updateElement({ ...el, numero: numero.trim(), nom: (nom || '').trim() })
  }

  // Pose un seul joueur (par opposition à appliquerDispositif qui pose les 11
  // d'un coup) — depuis le picker ouvert par l'outil 👤. joueurRef pointe
  // vers un joueur réel de l'effectif (id/prenom/nom/numero_maillot) si choisi
  // depuis la liste, sinon numero/nom viennent des champs libres du picker.
  const ajouterJoueurIndividuel = (joueurRef = null) => {
    const numero = (joueurRef?.numero_maillot ?? pickerNumero ?? '').toString().trim()
    const nom = joueurRef ? `${joueurRef.prenom || ''} ${joueurRef.nom || ''}`.trim() : pickerNom.trim()
    applyElements([...elements, {
      id: uid(), type: 'joueur', equipe: equipeActive, gardien: false,
      numero, nom, x: pickerStagePos.x, y: pickerStagePos.y,
    }])
    setShowPickerJoueur(false)
    setTool('select')
  }

  // Pose n joueurs d'un coup (ex: "8" → 8 joueurs), numérotés à la suite en
  // partant du numéro saisi dans le picker (ou du prochain numéro dispo pour
  // cette équipe si le champ N° est vide), en colonne verticale centrée sur
  // le point cliqué.
  const ajouterJoueursMultiples = () => {
    const n = Math.max(1, parseInt(pickerNbJoueurs, 10) || 1)
    const depart = parseInt(pickerNumero, 10) || (elements.filter(e => e.type === 'joueur' && e.equipe === equipeActive).length + 1)
    const nouveaux = Array.from({ length: n }, (_, i) => ({
      id: uid(), type: 'joueur', equipe: equipeActive, gardien: false,
      numero: String(depart + i), nom: '',
      x: pickerStagePos.x, y: pickerStagePos.y + (i - (n - 1) / 2) * 36,
    }))
    applyElements([...elements, ...nouveaux])
    setShowPickerJoueur(false)
    setTool('select')
  }

  // Joueur "joker" — pas rattaché à une équipe (utile pour un exercice, un
  // remplaçant polyvalent...), rendu en pointillés blancs dans JoueurNode.
  const ajouterJoker = () => {
    applyElements([...elements, { id: uid(), type: 'joker', nom: '', x: pickerStagePos.x, y: pickerStagePos.y }])
    setShowPickerJoueur(false)
    setTool('select')
  }

  // Renommage rapide via le panneau latéral — pas de push dans l'historique undo à
  // chaque frappe (contrairement à editerJoueur), sinon chaque lettre tapée créerait
  // une étape d'annulation séparée.
  const renommerJoueur = (id, nom) => {
    setElements(prev => prev.map(e => (e.id === id ? { ...e, nom } : e)))
  }

  const handleStageClick = (e) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return
    const clickedOnEmpty = e.target === stage || e.target.getClassName() === 'Image'
    if (!clickedOnEmpty) return

    if (tool === 'select') { setSelectedId(null); return }

    if (tool === 'joueur') {
      const dejaPlaces = elements.filter(el => el.type === 'joueur' && el.equipe === equipeActive).length
      setPickerStagePos(pos)
      setPickerScreenPos({ x: e.evt.clientX, y: e.evt.clientY })
      setPickerNumero(String(dejaPlaces + 1))
      setPickerNom('')
      setShowPickerJoueur(true)
      return
    }

    if (['cone', 'ballon', 'mannequin', 'petite_cage', 'grande_cage', 'plot', 'coupelle_rouge', 'coupelle_jaune', 'coupelle_bleue', 'cone_orange', 'cone_rouge', 'cerceau', 'echelle', 'echelle_h'].includes(tool)) {
      applyElements([...elements, { id: uid(), type: 'objet', kind: tool, x: pos.x, y: pos.y, rotation: 0 }])
      return
    }

    if (tool === 'texte') {
      const texte = prompt('Texte à afficher :', '')
      if (texte && texte.trim()) {
        applyElements([...elements, { id: uid(), type: 'texte', x: pos.x, y: pos.y, text: texte.trim(), color: arrowColor }])
      }
      return
    }

    if (tool === 'zone-rect') {
      applyElements([...elements, { id: uid(), type: 'zone-rect', x: pos.x - 50, y: pos.y - 30, width: 100, height: 60, color: arrowColor }])
      return
    }

    if (tool === 'zone-cercle') {
      applyElements([...elements, { id: uid(), type: 'zone-cercle', x: pos.x, y: pos.y, radius: 40, color: arrowColor }])
      return
    }

    if (['fleche-droite', 'fleche-courbe', 'fleche-pointillee', 'fleche-dribble'].includes(tool)) {
      if (!pendingStart) {
        setPendingStart({ x: pos.x, y: pos.y })
        setMousePos({ x: pos.x, y: pos.y })
      } else {
        const style = tool.replace('fleche-', '')
        const points = computeArrowPoints(style, pendingStart.x, pendingStart.y, pos.x, pos.y)
        applyElements([...elements, { id: uid(), type: 'fleche', style, points, color: arrowColor }])
        setPendingStart(null)
        setMousePos(null)
        setTool('select') // revient en mode sélection après avoir posé la flèche, au lieu de rester en mode "prochain clic = nouvelle flèche"
      }
    }
  }

  // ── Sélection multiple : glisser sur le fond avec l'outil "select" ────────
  // Le rectangle et les positions comparées sont en coordonnées Stage (comme
  // pos.x/pos.y posé sur les éléments), pas en pixels écran — contrairement à
  // un div positionné en position:fixed, ça reste juste si le canvas est
  // redimensionné/scrollé.
  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage()
    const clickedOnEmpty = e.target === stage || e.target.getClassName() === 'Image'
    if (tool !== 'select' || !clickedOnEmpty) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    selectionStart.current = pos
    setIsSelecting(true)
    setSelectedIds(new Set())
  }

  const ELEMENTS_SELECTIONNABLES = ['joueur', 'joker', 'objet', 'texte']

  const handleStageMouseUp = () => {
    if (isSelecting && selectionBox && (selectionBox.w > 3 || selectionBox.h > 3)) {
      const dansLaBoite = elements.filter(el =>
        ELEMENTS_SELECTIONNABLES.includes(el.type) &&
        el.x >= selectionBox.x && el.x <= selectionBox.x + selectionBox.w &&
        el.y >= selectionBox.y && el.y <= selectionBox.y + selectionBox.h
      )
      setSelectedIds(new Set(dansLaBoite.map(el => el.id)))
    }
    setIsSelecting(false)
    setSelectionBox(null)
    selectionStart.current = null
  }

  // ── Mise à jour de la position souris pour la preview flèche + le rectangle
  // de sélection en cours ────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return
    if (pendingStart) setMousePos(pos)
    if (isSelecting && selectionStart.current) {
      const sx = Math.min(pos.x, selectionStart.current.x)
      const sy = Math.min(pos.y, selectionStart.current.y)
      setSelectionBox({ x: sx, y: sy, w: Math.abs(pos.x - selectionStart.current.x), h: Math.abs(pos.y - selectionStart.current.y) })
    }
  }

  const exportPNG = () => {
    setSelectedId(null)
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `tactipad-${Date.now()}.png`
      link.href = uri
      link.click()
    }, 50)
  }

  const validerSchema = () => {
    setSelectedId(null)
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
      onValider?.(uri)
    }, 50)
  }

  useEffect(() => () => clearInterval(playIntervalRef.current), [])
  useEffect(() => () => { cancelAnimationFrame(animRef.current); clearTimeout(stepTimeoutRef.current) }, [])

  const allerEtape = (index) => {
    if (index === etapeActive) return
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    setSequences(synced)
    setEtapeActive(index)
    setElements(synced[index] || [])
    setHistory([]); setFuture([]); setSelectedId(null)
  }

  const ajouterEtape = () => {
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const nouvelIndex = synced.length
    setSequences([...synced, elements])
    setEtapeActive(nouvelIndex)
    setHistory([]); setFuture([]); setSelectedId(null)
  }

  const dupliquerEtape = () => {
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const copy = synced[etapeActive].map(el => ({ ...el }))
    const newSeqs = [...synced]
    newSeqs.splice(etapeActive + 1, 0, copy)
    setSequences(newSeqs)
    setEtapeActive(etapeActive + 1)
    setElements(copy)
    setHistory([]); setFuture([]); setSelectedId(null)
  }

  const supprimerEtape = (idx) => {
    if (sequences.length <= 1) return
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const newSeqs = synced.filter((_, i) => i !== idx)
    const newIdx = Math.min(idx, newSeqs.length - 1)
    setSequences(newSeqs)
    setEtapeActive(newIdx)
    setElements(newSeqs[newIdx] || [])
    setHistory([]); setFuture([]); setSelectedId(null)
    // Réindexer les durées
    setStepDurations(prev => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k)
        if (ki < idx) next[ki] = v
        else if (ki > idx) next[ki - 1] = v
      })
      return next
    })
  }

  const lire = () => {
    if (sequences.length < 2 || playing) return
    cancelAnimationFrame(animRef.current)
    clearInterval(playIntervalRef.current)
    clearTimeout(stepTimeoutRef.current)
    stopRequestedRef.current = false

    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    setSequences(synced)
    setPlaying(true)
    setSelectedId(null)

    // Capturer au moment du play (évite les stale closures dans rAF)
    const seqs = synced
    const spd = animSpeed
    const durs = stepDurations

    const animateStep = (fromIdx) => {
      if (stopRequestedRef.current) return
      const toIdx = fromIdx + 1
      if (toIdx >= seqs.length) {
        setPlaying(false)
        setEtapeActive(fromIdx)
        setElements(seqs[fromIdx])
        return
      }

      const duration = (durs[fromIdx] || 2000) / spd
      const fromElems = seqs[fromIdx]
      const toElems = seqs[toIdx]
      const fromIds = new Set(fromElems.map(e => e.id))
      const startTime = performance.now()
      setEtapeActive(fromIdx)

      const frame = (now) => {
        const raw = Math.min((now - startTime) / duration, 1)
        const t = easeInOut(raw)

        const interpolated = fromElems.map(el => {
          // Joueurs, jokers et objets → interpolation de position
          if (el.type === 'joueur' || el.type === 'joker' || el.type === 'objet') {
            const target = toElems.find(e => e.id === el.id)
            if (!target) return el
            return { ...el, x: lerp(el.x, target.x, t), y: lerp(el.y, target.y, t) }
          }
          // Flèches/zones → bascule à mi-transition
          return raw >= 0.5 ? (toElems.find(e => e.id === el.id) || el) : el
        })

        // Éléments présents dans toElems mais absents de fromElems
        const newElems = toElems.filter(e => !fromIds.has(e.id))
        setElements([...interpolated, ...newElems])

        if (raw < 1) {
          animRef.current = requestAnimationFrame(frame)
        } else {
          setElements(toElems)
          setEtapeActive(toIdx)
          if (stopRequestedRef.current) return
          // Petite pause entre étapes
          stepTimeoutRef.current = setTimeout(() => animateStep(toIdx), 150)
        }
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animateStep(etapeActive)
  }

  const stopLecture = () => {
    stopRequestedRef.current = true
    cancelAnimationFrame(animRef.current)
    clearInterval(playIntervalRef.current)
    clearTimeout(stepTimeoutRef.current)
    setPlaying(false)
  }

  const exportGIF = async () => {
    if (sequences.length < 2) { alert('Ajoute au moins 2 étapes pour exporter une animation.'); return }
    stopLecture()
    setSelectedId(null)
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    setSequences(synced)
    const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: '/gif.worker.js' })
    for (const etape of synced) {
      setElements(etape)
      await new Promise(r => setTimeout(r, 80))
      const canvas = stageRef.current.toCanvas({ pixelRatio: 1 })
      gif.addFrame(canvas, { delay: 1500 })
    }
    gif.on('finished', blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tactipad-animation-${Date.now()}.gif`
      link.click()
      URL.revokeObjectURL(url)
    })
    gif.render()
    setElements(synced[etapeActive] || [])
  }

  const chargerSchemas = async () => {
    setLoadingSchemas(true)
    const { data, error } = await supabase.from('tactipads').select('*').eq('educateur_id', userId).order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      setLoadingSchemas(false)
      return
    }
    setTableMissing(false)
    setSchemas(data || [])
    setLoadingSchemas(false)
  }

  const chargerDossiers = async () => {
    const { data, error } = await supabase.from('schemas_dossiers').select('*').eq('educateur_id', userId).order('ordre').order('created_at')
    if (error) return // table pas encore créée (supabase_schemas_dossiers.sql) — les dossiers restent simplement indisponibles
    setDossiers(data || [])
  }

  const ajouterDossier = async () => {
    if (!newDossierNom.trim()) return
    const { error } = await supabase.from('schemas_dossiers').insert({ educateur_id: userId, nom: newDossierNom.trim(), ordre: dossiers.length })
    if (error) { alert('Erreur lors de la création du dossier : ' + error.message); return }
    setNewDossierNom('')
    setShowAddDossier(false)
    await chargerDossiers()
  }

  const supprimerDossier = async (id) => {
    if (!confirm('Supprimer ce dossier ? Les schémas qu\'il contient ne seront pas supprimés.')) return
    const { error } = await supabase.from('schemas_dossiers').delete().eq('id', id).eq('educateur_id', userId)
    if (error) { alert('Erreur lors de la suppression : ' + error.message); return }
    if (dossierActif === id) setDossierActif(null)
    await Promise.all([chargerDossiers(), chargerSchemas()])
  }

  const sauvegarderSchema = async () => {
    const syncedSequences = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const schema = { terrain: { sport, vue, fond }, elements, sequences: syncedSequences, equipesCouleurs }
    const payload = { educateur_id: userId, nom: nomSchema.trim() || 'Sans titre', schema, dossier_id: dossierSauvegarde || null }
    const idEnEdition = currentSchemaId
    const nomSnapshot = nomSchema
    // Optimistic : le champ nom se réinitialise tout de suite (schéma
    // "sauvegardé") sans attendre la réponse Supabase, qui continue en
    // arrière-plan. Erreur → on restaure nom/id pour ne rien perdre.
    setSavingSchema(true)
    setNomSchema('')
    setCurrentSchemaId(null)
    const { error } = idEnEdition
      ? await supabase.from('tactipads').update(payload).eq('id', idEnEdition)
      : await supabase.from('tactipads').insert(payload)
    setSavingSchema(false)
    if (error) {
      setNomSchema(nomSnapshot)
      setCurrentSchemaId(idEnEdition)
      if (error.code === '42P01') { setTableMissing(true); return }
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    await chargerSchemas()
  }

  const chargerSchema = (s) => {
    const schema = s.schema || {}
    if (schema.terrain) {
      setSport(schema.terrain.sport || 'football')
      setVue(schema.terrain.vue || 'complet')
      setFond(schema.terrain.fond || 'vert')
    }
    const seqs = schema.sequences && schema.sequences.length ? schema.sequences : [schema.elements || []]
    setSequences(seqs)
    setEtapeActive(0)
    setElements(seqs[0] || schema.elements || [])
    setHistory([]); setFuture([]); setSelectedId(null)
    if (schema.equipesCouleurs) setEquipesCouleurs(schema.equipesCouleurs)
    setNomSchema(s.nom || '')
    setCurrentSchemaId(s.id)
    setDossierSauvegarde(s.dossier_id || '')
  }

  const supprimerSchema = async (id) => {
    if (!confirm('Supprimer ce schéma ?')) return
    const { error } = await supabase.from('tactipads').delete().eq('id', id).eq('educateur_id', userId)
    if (error) { alert('Erreur lors de la suppression : ' + error.message); return }
    if (currentSchemaId === id) setCurrentSchemaId(null)
    await chargerSchemas()
  }

  const partagerSchema = async (id) => {
    const slug = Math.random().toString(36).substring(2, 10)
    const { error } = await supabase.from('tactipads').update({ partage: true, partage_slug: slug }).eq('id', id)
    if (error) { alert('Erreur lors du partage : ' + error.message); return }
    const lien = `${window.location.origin}/tactipad/${slug}`
    await navigator.clipboard.writeText(lien).catch(() => {})
    alert('Lien copié : ' + lien)
    await chargerSchemas()
  }

  if (isMobile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#666' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</p>
        <p>Utilisez un écran plus large pour dessiner.</p>
      </div>
    )
  }

  const iconeZigzag = (
    <svg width="16" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="1,12 5,4 9,12 13,4 17,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="15,6 17,8 15,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  const iconeCarre = (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  )
  const outilsFlêches = [
    { key: 'fleche-droite', label: '→', title: 'Flèche droite' },
    { key: 'fleche-courbe', label: '↝', title: 'Flèche courbe' },
    { key: 'fleche-pointillee', label: '⇢', title: 'Flèche pointillée' },
    { key: 'fleche-dribble', label: iconeZigzag, title: 'Flèche dribble (zigzag)' },
  ]
  const outilsZones = [
    { key: 'zone-rect', label: iconeCarre, title: 'Zone rectangle' },
    { key: 'zone-cercle', label: '○', title: 'Zone cercle' },
    { key: 'texte', label: 'T', title: 'Texte libre' },
  ]
  // Coupelle générique (cone), mannequin et plot retirés de la palette — le
  // nouveau panneau Matériel (coupelles colorées, cônes, cerceau, échelles)
  // les remplace. Rendu conservé côté ObjetNode pour ne pas casser l'affichage
  // des schémas déjà enregistrés qui contiennent encore ces kind.
  const outilsObjets = [
    { key: 'ballon', label: '⚽', title: 'Ballon' },
    { key: 'petite_cage', label: '🥅', title: 'Petite cage (double-clic pour pivoter)' },
    { key: 'grande_cage', label: '🥅', title: 'Grande cage (double-clic pour pivoter)' },
  ]

  // Matériel tactique : cliquer une vignette active l'outil (comme les autres
  // objets ci-dessus), puis un clic sur le terrain le pose — même logique de
  // placement que le reste du plateau, pas de drag & drop natif depuis ce panneau.
  const outilsMateriel = [
    { key: 'coupelle_rouge', title: 'Coupelle rouge', apercu: <svg width="26" height="14" viewBox="0 0 24 12"><ellipse cx="12" cy="6" rx="11" ry="5" fill="#e53e3e" stroke="#c53030" strokeWidth="1"/></svg> },
    { key: 'coupelle_jaune', title: 'Coupelle jaune', apercu: <svg width="26" height="14" viewBox="0 0 24 12"><ellipse cx="12" cy="6" rx="11" ry="5" fill="#ecc94b" stroke="#d69e2e" strokeWidth="1"/></svg> },
    { key: 'coupelle_bleue', title: 'Coupelle bleue', apercu: <svg width="26" height="14" viewBox="0 0 24 12"><ellipse cx="12" cy="6" rx="11" ry="5" fill="#3182ce" stroke="#2b6cb0" strokeWidth="1"/></svg> },
    { key: 'cone_orange', title: 'Cône orange', apercu: <svg width="18" height="26" viewBox="0 0 20 28"><polygon points="10,2 0,26 20,26" fill="#ed8936" stroke="#c05621" strokeWidth="1"/><ellipse cx="10" cy="26" rx="10" ry="3" fill="#c05621"/></svg> },
    { key: 'cone_rouge', title: 'Cône rouge', apercu: <svg width="18" height="26" viewBox="0 0 20 28"><polygon points="10,2 0,26 20,26" fill="#e53e3e" stroke="#c53030" strokeWidth="1"/><ellipse cx="10" cy="26" rx="10" ry="3" fill="#c53030"/></svg> },
    { key: 'cerceau', title: 'Cerceau', apercu: <svg width="26" height="26" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="#38a169" strokeWidth="3.5"/></svg> },
    { key: 'echelle', title: 'Échelle', apercu: <svg width="14" height="30" viewBox="0 0 30 80"><rect x="3" y="2" width="4" height="76" rx="2" fill="#805ad5"/><rect x="23" y="2" width="4" height="76" rx="2" fill="#805ad5"/><rect x="3" y="8" width="24" height="3" rx="1" fill="#b794f4"/><rect x="3" y="30" width="24" height="3" rx="1" fill="#b794f4"/><rect x="3" y="52" width="24" height="3" rx="1" fill="#b794f4"/><rect x="3" y="74" width="24" height="3" rx="1" fill="#b794f4"/></svg> },
    { key: 'echelle_h', title: 'Échelle (horizontal)', apercu: <svg width="30" height="14" viewBox="0 0 80 30"><rect x="2" y="3" width="76" height="4" rx="2" fill="#805ad5"/><rect x="2" y="23" width="76" height="4" rx="2" fill="#805ad5"/><rect x="8" y="3" width="3" height="24" rx="1" fill="#b794f4"/><rect x="30" y="3" width="3" height="24" rx="1" fill="#b794f4"/><rect x="52" y="3" width="3" height="24" rx="1" fill="#b794f4"/><rect x="74" y="3" width="3" height="24" rx="1" fill="#b794f4"/></svg> },
  ]

  const btnStyle = (active) => ({
    width: '38px', height: '38px', borderRadius: '8px', border: active ? '1px solid #4ade80' : '1px solid #222',
    background: active ? '#4ade8020' : '#111', color: active ? '#4ade80' : '#aaa', fontSize: '16px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  // Empêche de glisser un joueur/joker/objet hors du terrain — Konva n'a
  // aucune contrainte native, dragBoundFunc est le mécanisme prévu pour ça
  // (appliqué en direct pendant le drag, pas seulement au drop).
  const dragBound = (pos) => ({
    x: Math.max(ELEMENT_DRAG_MARGIN, Math.min(width - ELEMENT_DRAG_MARGIN, pos.x)),
    y: Math.max(ELEMENT_DRAG_MARGIN, Math.min(height - ELEMENT_DRAG_MARGIN, pos.y)),
  })

  // ── Panneau joueurs droit ─────────────────────────────────────────────────
  const joueursParEquipe = Object.keys(EQUIPES_CONFIG)
    .map(eq => ({ eq, joueurs: elements.filter(e => e.type === 'joueur' && e.equipe === eq).sort((a, b) => Number(a.numero) - Number(b.numero)) }))
    .filter(g => g.joueurs.length > 0)
  const jokers = elements.filter(e => e.type === 'joker')
  const hasJoueurs = joueursParEquipe.length > 0 || jokers.length > 0

  // Style du tool actif pour preview flèche
  const arrowPreviewStyle = tool.replace('fleche-', '')

  return (
    <div onClick={() => colorPickerOpen && setColorPickerOpen(null)}>
      {/* Barre du haut */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['football', t('tac_football', lang)], ['futsal', t('tac_futsal', lang)]].map(([v, label]) => (
            <button key={v} onClick={() => setSport(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: sport === v ? '#4ade80' : 'transparent', color: sport === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['demi', t('tac_demi_terrain', lang)], ['complet', t('tac_terrain_complet', lang)]].map(([v, label]) => (
            <button key={v} onClick={() => setVue(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: vue === v ? '#4ade80' : 'transparent', color: vue === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['vert', `🟢 ${t('tac_vert', lang)}`], ['blanc', `⬜ ${t('tac_blanc', lang)}`]].map(([v, label]) => (
            <button key={v} onClick={() => setFond(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: fond === v ? '#4ade80' : 'transparent', color: fond === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <select
          onChange={e => { appliquerDispositif(e.target.value); e.target.value = '' }}
          defaultValue=""
          style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#aaa', fontSize: '12px', padding: '7px 10px', cursor: 'pointer' }}
        >
          <option value="">📋 {t('tac_dispositif', lang)} ({t(EQUIPES_CONFIG[equipeActive].label, lang)})...</option>
          <optgroup label="4 défenseurs">
            <option value="4-3-3">4-3-3</option>
            <option value="4-4-2">4-4-2</option>
            <option value="4-4-2-plat">4-4-2 plat</option>
            <option value="4-2-3-1">4-2-3-1</option>
            <option value="4-5-1">4-5-1</option>
            <option value="4-1-4-1">4-1-4-1</option>
            <option value="4-3-2-1">4-3-2-1 (arbre de Noël)</option>
          </optgroup>
          <optgroup label="3 défenseurs">
            <option value="3-4-3">3-4-3</option>
            <option value="3-5-2">3-5-2</option>
            <option value="3-4-1-2">3-4-1-2</option>
          </optgroup>
          <optgroup label="5 défenseurs">
            <option value="5-3-2">5-3-2</option>
            <option value="5-4-1">5-4-1</option>
          </optgroup>
        </select>
        {/* Les 4 équipes se comportent pareil : le clic ne fait que sélectionner
            l'équipe active, aucun joueur n'apparaît tout seul — il faut soit les
            poser un par un/en série (outil 👤), soit choisir un dispositif dans
            le menu ci-dessus pour poser les 11 d'un coup.
            Clic droit : ouvre la palette de couleur de l'équipe (clic gauche = sélection). */}
        {Object.keys(EQUIPES_CONFIG).map(eq => {
          const couleur = equipesCouleurs[eq]
          const actif = equipeActive === eq
          return (
            <div key={eq} style={{ position: 'relative' }}>
              <button
                onClick={() => setEquipeActive(eq)}
                onContextMenu={e => { e.preventDefault(); setColorPickerOpen(colorPickerOpen === eq ? null : eq) }}
                style={{
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                  border: actif ? `1px solid ${couleur}` : `1px solid ${couleur}40`,
                  background: actif ? `${couleur}30` : `${couleur}15`,
                  color: couleur, fontSize: '12px', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: couleur, display: 'inline-block' }} />
                {t(EQUIPES_CONFIG[eq].label, lang)}
                <span style={{ fontSize: '10px', opacity: 0.5 }}>▾</span>
              </button>
              {colorPickerOpen === eq && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '38px', left: 0, zIndex: 100, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', boxShadow: '0 8px 32px #00000080' }}>
                  {PALETTE_COULEURS_EQUIPE.map(c => (
                    <button key={c} onClick={() => { setEquipesCouleurs(prev => ({ ...prev, [eq]: c })); setColorPickerOpen(null) }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: c, border: couleur === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tableMissing && !isModal && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>tactipads</code> n'existe pas encore en base.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Toolbar gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => { setTool('select'); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === 'select')} title="Sélection [Échap]">↖</button>
          <button onClick={() => setShowGrid(v => !v)} style={btnStyle(showGrid)} title="Quadrillage">⊞</button>
          <div style={{ height: '1px', background: '#222' }} />
          {outilsFlêches.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
          <div style={{ height: '1px', background: '#222' }} />
          {outilsZones.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
          <div style={{ height: '1px', background: '#222' }} />
          {outilsObjets.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
          <button onClick={() => { setTool('joueur'); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === 'joueur')} title={`Ajouter un joueur individuel (${t(EQUIPES_CONFIG[equipeActive].label, lang)})`}>👤</button>
          <div style={{ height: '1px', background: '#222' }} />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMaterielPanel(v => !v)}
              title="Matériel"
              style={btnStyle(showMaterielPanel || outilsMateriel.some(o => o.key === tool))}
            >
              🧰
            </button>
            {showMaterielPanel && (
              <div style={{
                position: 'absolute', top: 0, left: '100%', marginLeft: '8px', zIndex: 1000,
                background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '260px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                <div style={{ gridColumn: '1 / -1', fontSize: '10px', color: '#666', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>
                  MATÉRIEL — clique puis pose sur le terrain
                </div>
                {outilsMateriel.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { setTool(o.key); setPendingStart(null); setMousePos(null); setShowMaterielPanel(false) }}
                    title={o.title}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      background: tool === o.key ? '#4ade8020' : '#1a1a1a', border: tool === o.key ? '1px solid #4ade80' : '1px solid #2a2a2a',
                      borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', color: '#ccc', height: '52px',
                    }}
                  >
                    {o.apercu}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: '1px', background: '#222' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {COULEURS.map(c => (
              <button key={c.val} onClick={() => setArrowColor(c.val)} title={c.label}
                style={{ width: '22px', height: '22px', borderRadius: '50%', background: c.val, border: arrowColor === c.val ? '2px solid #4ade80' : '1px solid #444', cursor: 'pointer', margin: '0 8px' }} />
            ))}
          </div>
        </div>

        {/* Canvas — flex:1/minWidth:0 pour pouvoir rétrécir dans la ligne flex
            (toolbar + canvas) au lieu de forcer sa largeur naturelle ; c'est
            ce conteneur, une fois réellement rétréci par le layout (sidebar,
            padding de la modale...), que canvasRef mesure pour dimensionner
            le Stage Konva. overflow:hidden en filet de sécurité contre tout
            débordement d'1-2px (arrondi sub-pixel). */}
        <div ref={canvasRef} style={{ position: 'relative', flex: 1, minWidth: 0, maxWidth: '1000px', overflow: 'hidden' }}>
          {pendingStart && (
            <p style={{ fontSize: '11px', color: '#4ade80', margin: '0 0 6px' }}>
              Clique le point d'arrivée de la flèche… <span style={{ color: '#666' }}>(Échap pour annuler)</span>
            </p>
          )}
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleStageMouseUp}
            style={{ borderRadius: '12px', overflow: 'hidden', cursor: pendingStart ? 'crosshair' : 'default' }}
          >
            <Layer>
              {terrainImg && <KonvaImage image={terrainImg} width={width} height={height} listening={false} />}

              {/* Quadrillage repère — listening=false, comme dans TacticalBoard.jsx : ne
                  capte jamais les clics/drag, purement visuel. */}
              {showGrid && (
                <>
                  {Array.from({ length: Math.floor(width / GRID_SIZE) }, (_, i) => (i + 1) * GRID_SIZE).map(x => (
                    <Line key={`gv-${x}`} points={[x, 0, x, height]} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} dash={[4, 4]} listening={false} />
                  ))}
                  {Array.from({ length: Math.floor(height / GRID_SIZE) }, (_, i) => (i + 1) * GRID_SIZE).map(y => (
                    <Line key={`gh-${y}`} points={[0, y, width, y]} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} dash={[4, 4]} listening={false} />
                  ))}
                </>
              )}

              {elements.filter(e => e.type === 'zone-rect').map(e => (
                <Rect key={e.id} ref={n => (nodeRefs.current[e.id] = n)} x={e.x} y={e.y} width={e.width} height={e.height} rotation={e.rotation || 0}
                  fill={e.color + '40'} stroke={e.color} strokeWidth={2} draggable
                  onClick={() => setSelectedId(e.id)} onTap={() => setSelectedId(e.id)}
                  onDragEnd={ev => updateElement({ ...e, x: ev.target.x(), y: ev.target.y() })}
                  onTransformEnd={ev => {
                    const node = ev.target
                    updateElement({ ...e, x: node.x(), y: node.y(), rotation: node.rotation(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()) })
                    node.scaleX(1); node.scaleY(1)
                  }} />
              ))}
              {elements.filter(e => e.type === 'zone-cercle').map(e => (
                <Circle key={e.id} ref={n => (nodeRefs.current[e.id] = n)} x={e.x} y={e.y} radius={e.radius}
                  fill={e.color + '40'} stroke={e.color} strokeWidth={2} draggable
                  onClick={() => setSelectedId(e.id)} onTap={() => setSelectedId(e.id)}
                  onDragEnd={ev => updateElement({ ...e, x: ev.target.x(), y: ev.target.y() })}
                  onTransformEnd={ev => {
                    const node = ev.target
                    updateElement({ ...e, x: node.x(), y: node.y(), radius: Math.max(6, e.radius * node.scaleX()) })
                    node.scaleX(1); node.scaleY(1)
                  }} />
              ))}
              {elements.filter(e => e.type === 'fleche').map(e => {
                // Pivot = centre de la boîte englobante des points (coords absolues,
                // stockage inchangé) — nécessaire pour que la rotation Konva tourne
                // autour du centre de la flèche plutôt que du coin (0,0) du canvas.
                const xs = e.points.filter((_, i) => i % 2 === 0)
                const ys = e.points.filter((_, i) => i % 2 === 1)
                const cx = (Math.min(...xs) + Math.max(...xs)) / 2
                const cy = (Math.min(...ys) + Math.max(...ys)) / 2
                const relPoints = e.points.map((p, i) => p - (i % 2 === 0 ? cx : cy))
                return (
                  <Arrow key={e.id} ref={n => (nodeRefs.current[e.id] = n)}
                    x={cx} y={cy} points={relPoints} rotation={e.rotation || 0}
                    stroke={e.color} fill={e.color}
                    strokeWidth={3} tension={e.style === 'courbe' ? 0.5 : 0} dash={e.style === 'pointillee' ? [10, 5] : undefined}
                    draggable onClick={() => setSelectedId(e.id)} onTap={() => setSelectedId(e.id)}
                    onDragEnd={ev => {
                      const node = ev.target
                      const dx = node.x() - cx, dy = node.y() - cy
                      updateElement({ ...e, points: e.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)) })
                    }}
                    onTransformEnd={ev => { updateElement({ ...e, rotation: ev.target.rotation() }) }} />
                )
              })}
              {elements.filter(e => e.type === 'texte').map(e => (
                <Text key={e.id} ref={n => (nodeRefs.current[e.id] = n)} x={e.x} y={e.y} text={e.text} fontSize={16} fontStyle="bold" fill={e.color} draggable
                  onClick={() => setSelectedId(e.id)} onTap={() => setSelectedId(e.id)}
                  onDblClick={() => { const t = prompt('Modifier le texte :', e.text); if (t !== null) updateElement({ ...e, text: t }) }}
                  onDragEnd={ev => updateElement({ ...e, x: ev.target.x(), y: ev.target.y() })} />
              ))}
              {elements.filter(e => e.type === 'objet').map(e => (
                <ObjetNode key={e.id} el={e} isSelected={selectedId === e.id || selectedIds.has(e.id)} onSelect={setSelectedId} onChange={updateElement}
                  onDelete={() => applyElements(elements.filter(x => x.id !== e.id))}
                  onRotate={() => updateElement({ ...e, rotation: (e.rotation || 0) === 0 ? 90 : 0 })}
                  dragBoundFunc={dragBound}
                />
              ))}
              {elements.filter(e => e.type === 'joueur' || e.type === 'joker').map(e => (
                <JoueurNode key={e.id} el={e} isSelected={selectedId === e.id || selectedIds.has(e.id)} onSelect={setSelectedId} onChange={updateElement} onEdit={editerJoueur} couleurs={equipesCouleurs} dragBoundFunc={dragBound} />
              ))}

              {/* ── Rectangle de sélection multiple en cours de glisser ────────── */}
              {selectionBox && (
                <Rect
                  x={selectionBox.x} y={selectionBox.y} width={selectionBox.w} height={selectionBox.h}
                  fill="#60a5fa15" stroke="#60a5fa" strokeWidth={1.5} dash={[6, 4]} listening={false}
                />
              )}

              {/* ── NOUVEAU : preview flèche en temps réel ──────────────────── */}
              {pendingStart && mousePos && ['fleche-droite', 'fleche-courbe', 'fleche-pointillee', 'fleche-dribble'].includes(tool) && (
                <>
                  {/* Point de départ */}
                  <Circle x={pendingStart.x} y={pendingStart.y} radius={5} fill={arrowColor} opacity={0.8} listening={false} />
                  {/* Flèche preview */}
                  <Arrow
                    points={computeArrowPoints(
                      arrowPreviewStyle,
                      pendingStart.x, pendingStart.y,
                      mousePos.x, mousePos.y
                    )}
                    stroke={arrowColor}
                    fill={arrowColor}
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[6, 4]}
                    tension={arrowPreviewStyle === 'courbe' ? 0.5 : 0}
                    listening={false}
                    pointerLength={10}
                    pointerWidth={8}
                  />
                </>
              )}

              <Transformer
                ref={trRef}
                flipEnabled={false}
                rotateEnabled={selectedElement?.type === 'fleche' || selectedElement?.type === 'zone-rect'}
                resizeEnabled={selectedElement?.type === 'zone-rect' || selectedElement?.type === 'zone-cercle'}
                keepRatio={selectedElement?.type === 'zone-cercle'}
                borderStroke="#4ade80"
                anchorStroke="#4ade80"
                anchorSize={8}
              />
            </Layer>

            {/* ── Layer flèches de déplacement vers l'étape suivante ── */}
            {showMovementArrows && !playing && sequences.length > 1 && etapeActive < sequences.length - 1 && (
              <Layer listening={false}>
                {elements.filter(el => el.type === 'joueur').map(el => {
                  const nextElems = sequences[etapeActive + 1] || []
                  const target = nextElems.find(e => e.id === el.id)
                  if (!target) return null
                  const dx = target.x - el.x
                  const dy = target.y - el.y
                  if (Math.sqrt(dx * dx + dy * dy) < 10) return null
                  const color = equipesCouleurs[el.equipe] ?? EQUIPES_CONFIG.A.color
                  return (
                    <Arrow key={`mv-${el.id}`}
                      points={[el.x, el.y, target.x, target.y]}
                      stroke={color} fill={color}
                      strokeWidth={2.5} opacity={0.65}
                      dash={[8, 5]}
                      pointerLength={10} pointerWidth={8}
                    />
                  )
                }).filter(Boolean)}
              </Layer>
            )}
          </Stage>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={undo} disabled={!history.length} title="Ctrl+Z" style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: history.length ? 1 : 0.4 }}>↩ {t('tac_undo', lang)}</button>
            <button onClick={redo} disabled={!future.length} title="Ctrl+Y" style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: future.length ? 1 : 0.4 }}>↪ {t('tac_redo', lang)}</button>
            <button onClick={supprimerSelection} disabled={!selectedId} title="Suppr" style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: selectedId ? 1 : 0.4 }}>🗑 {t('btn_supprimer', lang)}</button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => { applyElements(elements.filter(el => !selectedIds.has(el.id))); setSelectedIds(new Set()) }}
                title="Suppr"
                style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: '8px', padding: '0 14px', height: '38px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                🗑 Supprimer {selectedIds.size} élément{selectedIds.size > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={toutEffacer} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#ef4444' }}>🧹 {t('tac_tout_effacer', lang)}</button>
            <button onClick={exportPNG} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#60a5fa' }}>⬇️ {t('tac_export_png', lang)}</button>
          </div>

          {/* Séquences */}
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1a1a1a' }}>

            {/* Ligne 1 : étapes + boutons navigation */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {sequences.map((_, i) => (
                <button key={i} onClick={() => allerEtape(i)} disabled={playing}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: i === etapeActive ? '1px solid #4ade80' : '1px solid #222', background: i === etapeActive ? '#4ade8020' : '#111', color: i === etapeActive ? '#4ade80' : '#aaa', fontSize: '12px', fontWeight: 600, cursor: playing ? 'default' : 'pointer' }}>
                  {t('tac_etape', lang)} {i + 1}
                </button>
              ))}
              <button onClick={ajouterEtape} disabled={playing} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px' }}>{t('tac_ajouter_etape', lang)}</button>
              <button onClick={dupliquerEtape} disabled={playing} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#a78bfa' }}>📋 {t('tac_dupliquer', lang)}</button>
              {sequences.length > 1 && (
                <button onClick={() => supprimerEtape(etapeActive)} disabled={playing}
                  style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#ef4444' }}>
                  🗑 {t('tac_etape', lang)}
                </button>
              )}
            </div>

            {/* Ligne 2 : lecture + prev/next + vitesse + durée + flèches */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => { stopLecture(); allerEtape(0) }} disabled={playing || etapeActive === 0}
                style={{ ...btnStyle(false), width: 'auto', padding: '0 10px', opacity: etapeActive === 0 ? 0.3 : 1 }}>⏮</button>
              <button onClick={() => allerEtape(etapeActive - 1)} disabled={playing || etapeActive === 0}
                style={{ ...btnStyle(false), width: 'auto', padding: '0 10px', opacity: etapeActive === 0 ? 0.3 : 1 }}>◀</button>

              {!playing ? (
                <button onClick={lire} disabled={sequences.length < 2}
                  style={{ ...btnStyle(false), width: 'auto', padding: '0 16px', color: '#4ade80', opacity: sequences.length < 2 ? 0.4 : 1, fontWeight: 700 }}>
                  ▶ Lire
                </button>
              ) : (
                <button onClick={stopLecture}
                  style={{ ...btnStyle(false), width: 'auto', padding: '0 16px', color: '#ef4444', fontWeight: 700 }}>
                  ⏹ Stop
                </button>
              )}

              <button onClick={() => allerEtape(etapeActive + 1)} disabled={playing || etapeActive >= sequences.length - 1}
                style={{ ...btnStyle(false), width: 'auto', padding: '0 10px', opacity: etapeActive >= sequences.length - 1 ? 0.3 : 1 }}>▶</button>
              <button onClick={() => { stopLecture(); allerEtape(sequences.length - 1) }} disabled={playing || etapeActive >= sequences.length - 1}
                style={{ ...btnStyle(false), width: 'auto', padding: '0 10px', opacity: etapeActive >= sequences.length - 1 ? 0.3 : 1 }}>⏭</button>

              {/* Vitesse */}
              <div style={{ display: 'flex', gap: 3, background: '#0a0a0a', borderRadius: 8, padding: 3 }}>
                {[0.5, 1, 1.5, 2].map(s => (
                  <button key={s} onClick={() => setAnimSpeed(s)}
                    style={{ ...btnStyle(animSpeed === s), width: 'auto', padding: '0 8px', fontSize: 11, height: 30 }}>
                    {s}x
                  </button>
                ))}
              </div>

              {/* Durée de l'étape active */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, color: '#555' }}>Durée :</span>
                <input type="number" min={300} max={8000} step={100}
                  value={stepDurations[etapeActive] ?? 2000}
                  onChange={e => setStepDurations(prev => ({ ...prev, [etapeActive]: Math.max(300, parseInt(e.target.value) || 2000) }))}
                  style={{ width: 68, background: '#111', border: '1px solid #222', borderRadius: 6, padding: '4px 6px', color: '#aaa', fontSize: 11, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                <span style={{ fontSize: 11, color: '#555' }}>ms</span>
              </div>

              {/* Toggle flèches de déplacement */}
              <button onClick={() => setShowMovementArrows(v => !v)}
                style={{ ...btnStyle(showMovementArrows), width: 'auto', padding: '0 12px', fontSize: 11 }}>
                {showMovementArrows ? '↗ Flèches ON' : '↗ Flèches OFF'}
              </button>

              <button onClick={exportGIF} disabled={sequences.length < 2 || playing}
                style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#a78bfa', opacity: sequences.length < 2 ? 0.4 : 1 }}>
                🎞️ Export GIF
              </button>
            </div>
          </div>

          {isModal ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={validerSchema} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>✅ Valider le schéma</button>
              <button onClick={() => onFermer?.()} style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer' }}>✕ Fermer sans enregistrer</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={nomSchema} onChange={e => setNomSchema(e.target.value)} placeholder="Nom du schéma"
                style={{ flex: 1, minWidth: '160px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} />
              {dossiers.length > 0 && (
                <select value={dossierSauvegarde} onChange={e => setDossierSauvegarde(e.target.value)}
                  style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', color: '#aaa', fontSize: '12px', padding: '8px 10px', cursor: 'pointer' }}>
                  <option value="">📁 Sans dossier</option>
                  {dossiers.map(d => <option key={d.id} value={d.id}>🗂 {d.nom}</option>)}
                </select>
              )}
              <button onClick={sauvegarderSchema} disabled={savingSchema || tableMissing} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: tableMissing ? 0.4 : 1 }}>
                {savingSchema ? '...' : currentSchemaId ? '💾 Mettre à jour' : '💾 Sauvegarder'}
              </button>
              {currentSchemaId && (
                <button onClick={() => { setCurrentSchemaId(null); setNomSchema(''); setDossierSauvegarde('') }} style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer' }}>Nouveau</button>
              )}
            </div>
          )}
        </div>

        {/* ── NOUVEAU : panneau joueurs à droite ──────────────────────────── */}
        {hasJoueurs && (
          <div style={{ width: 170, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {joueursParEquipe.map(({ eq, joueurs }) => (
              <div key={eq}>
                <div style={{ color: equipesCouleurs[eq], fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>{EQUIPES_CONFIG[eq].emoji} {t(EQUIPES_CONFIG[eq].label, lang)}</div>
                {joueurs.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: j.gardien ? 4 : '50%', background: equipesCouleurs[eq], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                      {j.numero}
                    </div>
                    <input
                      value={j.nom || ''}
                      onChange={e => renommerJoueur(j.id, e.target.value)}
                      placeholder={j.gardien ? 'Gardien' : `Joueur ${j.numero}`}
                      style={{ flex: 1, background: '#111', border: `1px solid ${selectedId === j.id ? equipesCouleurs[eq] : '#222'}`, borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, width: '100%', boxSizing: 'border-box' }}
                      onFocus={() => setSelectedId(j.id)}
                    />
                  </div>
                ))}
              </div>
            ))}
            {jokers.length > 0 && (
              <div>
                <div style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>⭐ JOKERS</div>
                {jokers.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                      ★
                    </div>
                    <input
                      value={j.nom || ''}
                      onChange={e => renommerJoueur(j.id, e.target.value)}
                      placeholder="Joker"
                      style={{ flex: 1, background: '#111', border: `1px solid ${selectedId === j.id ? '#e5e7eb' : '#222'}`, borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, width: '100%', boxSizing: 'border-box' }}
                      onFocus={() => setSelectedId(j.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Raccourcis clavier */}
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>
              <div style={{ color: '#444', fontSize: 10, lineHeight: 1.7 }}>
                <div><kbd style={{ background: '#1a1a1a', padding: '1px 4px', borderRadius: 3 }}>Suppr</kbd> Effacer</div>
                <div><kbd style={{ background: '#1a1a1a', padding: '1px 4px', borderRadius: 3 }}>Ctrl+Z</kbd> Annuler</div>
                <div><kbd style={{ background: '#1a1a1a', padding: '1px 4px', borderRadius: 3 }}>Ctrl+D</kbd> Dupliquer</div>
                <div><kbd style={{ background: '#1a1a1a', padding: '1px 4px', borderRadius: 3 }}>Échap</kbd> Désélectionner</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bibliothèque */}
      {!isModal && (() => {
        const schemasAffiches = dossierActif === null ? schemas : schemas.filter(s => s.dossier_id === dossierActif)
        return (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>📚 Mes schémas {schemas.length > 0 ? `(${schemas.length})` : ''}</p>

            {(dossiers.length > 0 || showAddDossier) && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                <button onClick={() => setDossierActif(null)}
                  style={{ background: dossierActif === null ? '#4ade8020' : '#111', border: `1px solid ${dossierActif === null ? '#4ade80' : '#222'}`, color: dossierActif === null ? '#4ade80' : '#888', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  Tous ({schemas.length})
                </button>
                {dossiers.map(d => {
                  const count = schemas.filter(s => s.dossier_id === d.id).length
                  const actif = dossierActif === d.id
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button onClick={() => setDossierActif(d.id)}
                        style={{ background: actif ? `${d.couleur}20` : '#111', border: `1px solid ${actif ? d.couleur : '#222'}`, color: actif ? d.couleur : '#888', borderRadius: '20px 0 0 20px', padding: '5px 4px 5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        🗂 {d.nom} ({count})
                      </button>
                      <button onClick={() => supprimerDossier(d.id)} title="Supprimer le dossier"
                        style={{ background: actif ? `${d.couleur}20` : '#111', border: `1px solid ${actif ? d.couleur : '#222'}`, borderLeft: 'none', color: '#666', borderRadius: '0 20px 20px 0', padding: '5px 10px 5px 4px', fontSize: '11px', cursor: 'pointer' }}>×</button>
                    </div>
                  )
                })}
                {showAddDossier ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input autoFocus value={newDossierNom} onChange={e => setNewDossierNom(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && ajouterDossier()}
                      placeholder="Nom du dossier" style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '5px 10px', fontSize: '11px', width: '130px' }} />
                    <button onClick={ajouterDossier} style={{ background: '#4ade80', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '11px', padding: '5px 10px', cursor: 'pointer' }}>OK</button>
                    <button onClick={() => { setShowAddDossier(false); setNewDossierNom('') }} style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddDossier(true)} style={{ background: 'none', border: '1px dashed #333', borderRadius: '20px', color: '#666', fontSize: '11px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer' }}>+ Dossier</button>
                )}
              </div>
            )}
            {dossiers.length === 0 && !showAddDossier && (
              <button onClick={() => setShowAddDossier(true)} style={{ background: 'none', border: '1px dashed #333', borderRadius: '20px', color: '#666', fontSize: '11px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', marginBottom: '14px' }}>+ Créer un dossier</button>
            )}

            {loadingSchemas ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
            ) : schemasAffiches.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>{schemas.length === 0 ? 'Aucun schéma sauvegardé pour l\'instant.' : 'Aucun schéma dans ce dossier.'}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schemasAffiches.map(s => {
                  const dossier = dossiers.find(d => d.id === s.dossier_id)
                  return (
                    <div key={s.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {dossier && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dossier.couleur, flexShrink: 0 }} />}
                          {s.nom || 'Sans titre'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}{dossier ? ` · 🗂 ${dossier.nom}` : ''}{s.partage ? ' · 🔗 partagé' : ''}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => chargerSchema(s)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Charger</button>
                        <button onClick={() => partagerSchema(s.id)} style={{ background: '#a78bfa15', border: '1px solid #a78bfa40', color: '#a78bfa', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>🔗 Partager</button>
                        <button onClick={() => supprimerSchema(s.id)} style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Picker "Ajouter un joueur" — ouvert par l'outil 👤, positionné au clic ── */}
      {showPickerJoueur && (
        <>
          <div onClick={() => setShowPickerJoueur(false)} style={{ position: 'fixed', inset: 0, zIndex: 499 }} />
          <div style={{
            position: 'fixed', top: pickerScreenPos.y, left: pickerScreenPos.x,
            background: '#111', border: '1px solid #222',
            borderRadius: '12px', padding: '12px', zIndex: 500,
            minWidth: '220px', maxHeight: '320px', overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', fontWeight: '700' }}>
              AJOUTER UN JOUEUR — {EQUIPES_CONFIG[equipeActive].emoji} {t(EQUIPES_CONFIG[equipeActive].label, lang)}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                value={pickerNumero} onChange={e => setPickerNumero(e.target.value)}
                placeholder="N°" style={{ width: '44px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#fff', padding: '6px', fontSize: '12px', textAlign: 'center' }}
              />
              <input
                value={pickerNom} onChange={e => setPickerNom(e.target.value)}
                placeholder="Nom (optionnel)" style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '12px' }}
                onKeyDown={e => e.key === 'Enter' && ajouterJoueurIndividuel()}
              />
            </div>
            <button onClick={() => ajouterJoueurIndividuel()}
              style={{ display: 'block', width: '100%', padding: '6px', marginBottom: '10px', background: '#4ade8020', border: '1px solid #4ade8050', color: '#4ade80', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              + Ajouter ce joueur
            </button>

            {/* Ajout rapide par nombre — pose n joueurs numérotés à la suite en une fois */}
            <div style={{ borderTop: '1px solid #222', margin: '4px 0 8px' }} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
              <input
                type="number" min="1" value={pickerNbJoueurs} onChange={e => setPickerNbJoueurs(e.target.value)}
                style={{ width: '44px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#fff', padding: '6px', fontSize: '12px', textAlign: 'center' }}
              />
              <button onClick={ajouterJoueursMultiples}
                style={{ flex: 1, padding: '6px', background: '#4ade8020', border: '1px solid #4ade8050', color: '#4ade80', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                + Ajouter en série
              </button>
            </div>
            <button onClick={ajouterJoker}
              style={{ display: 'block', width: '100%', padding: '6px', marginBottom: '8px', background: '#ffffff12', border: '1px dashed #ffffff50', color: '#e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              ★ + Joker
            </button>

            {joueursEquipe.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #222', margin: '4px 0 8px' }} />
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>OU DEPUIS L'EFFECTIF</div>
                {joueursEquipe.map(j => (
                  <button key={j.id} onClick={() => ajouterJoueurIndividuel(j)}
                    style={{ display: 'block', width: '100%', padding: '6px 8px', background: 'transparent', border: 'none', color: '#d1d5db', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', fontSize: '13px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    {j.numero_maillot ? `#${j.numero_maillot} ` : ''}{j.prenom} {j.nom}
                    {j.poste && <span style={{ color: '#6b7280', fontSize: '11px' }}> ({j.poste})</span>}
                  </button>
                ))}
              </>
            )}

            <button onClick={() => setShowPickerJoueur(false)}
              style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  )
}
