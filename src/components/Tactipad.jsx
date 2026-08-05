import { useEffect, useMemo, useRef, useState } from 'react'
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

export function JoueurNode({ el, isSelected, onSelect = () => {}, onChange = () => {}, onEdit = () => {}, draggable = true }) {
  const color = el.equipe === 'A' ? '#4ade80' : '#f97316'
  return (
    <Group
      x={el.x} y={el.y} draggable={draggable}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDblClick={() => onEdit(el.id)}
      onDblTap={() => onEdit(el.id)}
      onDragEnd={e => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >
      {el.gardien ? (
        <Rect x={-14} y={-14} width={28} height={28} cornerRadius={8} fill={color} stroke={isSelected ? '#fff' : '#00000060'} strokeWidth={isSelected ? 3 : 1.5} />
      ) : (
        <Circle radius={14} fill={color} stroke={isSelected ? '#fff' : '#00000060'} strokeWidth={isSelected ? 3 : 1.5} />
      )}
      <Text text={String(el.numero ?? '')} fontSize={12} fontStyle="bold" fill="#000" width={28} height={28} x={-14} y={-14} align="center" verticalAlign="middle" listening={false} />
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

export function ObjetNode({ el, isSelected, onSelect = () => {}, onChange = () => {}, onDelete = () => {}, onRotate = () => {}, draggable = true }) {
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
      x={el.x} y={el.y} rotation={el.rotation || 0} draggable={draggable}
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
  const [equipeActive, setEquipeActive] = useState('A')
  const [tool, setTool] = useState('select')
  const [showMaterielPanel, setShowMaterielPanel] = useState(false)
  const [arrowColor, setArrowColor] = useState('#ffffff')
  const [pendingStart, setPendingStart] = useState(null)
  // ── NOUVEAU : position souris pour preview flèche ─────────────────────────
  const [mousePos, setMousePos] = useState(null)

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

  const stageRef = useRef(null)
  const trRef = useRef(null)
  const nodeRefs = useRef({})

  const width = Math.min(window.innerWidth - 32, 800)
  const height = Math.round(width * 10 / 16)

  const svgString = useMemo(() => terrainSvgString({ sport, vue, fond, w: width, h: height }), [sport, vue, fond, width, height])
  const terrainImg = useSvgImage(svgString)

  useEffect(() => {
    if (!isMobile && !isModal) chargerSchemas()
  }, [])

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

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        setElements(prev => prev.filter(el => el.id !== selectedId))
        setSelectedId(null)
        return
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
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
  }, [selectedId, elements])

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

  const ajouterEquipe = (equipe) => {
    if (elements.some(e => e.type === 'joueur' && e.equipe === equipe)) return
    const baseX = equipe === 'A' ? width * 0.28 : width * 0.72
    const joueurs = []
    for (let i = 1; i <= 10; i++) {
      joueurs.push({ id: uid(), type: 'joueur', equipe, gardien: false, numero: i + 1, nom: '', x: baseX + (equipe === 'A' ? -1 : 1) * (i % 2) * 40, y: (height / 11) * i })
    }
    joueurs.push({ id: uid(), type: 'joueur', equipe, gardien: true, numero: 1, nom: '', x: equipe === 'A' ? width * 0.05 : width * 0.95, y: height / 2 })
    applyElements([...elements, ...joueurs])
  }

  const appliquerDispositif = (cle) => {
    if (!cle || !DISPOSITIFS[cle]) return
    const nouveauxJoueurs = DISPOSITIFS[cle].map(p => {
      const px = equipeActive === 'B' ? 1 - p.x : p.x
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
    const numero = prompt('Numéro du joueur :', el.numero ?? '')
    if (numero === null) return
    const nom = prompt('Nom du joueur (optionnel) :', el.nom ?? '')
    updateElement({ ...el, numero: numero.trim(), nom: (nom || '').trim() })
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
      }
    }
  }

  // ── NOUVEAU : mise à jour de la position souris pour la preview flèche ────
  const handleMouseMove = (e) => {
    if (!pendingStart) return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (pos) setMousePos(pos)
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
          // Joueurs et objets → interpolation de position
          if (el.type === 'joueur' || el.type === 'objet') {
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

  const sauvegarderSchema = async () => {
    setSavingSchema(true)
    const syncedSequences = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const schema = { terrain: { sport, vue, fond }, elements, sequences: syncedSequences }
    const payload = { educateur_id: userId, nom: nomSchema.trim() || 'Sans titre', schema }
    const { error } = currentSchemaId
      ? await supabase.from('tactipads').update(payload).eq('id', currentSchemaId)
      : await supabase.from('tactipads').insert(payload)
    setSavingSchema(false)
    if (error) {
      if (error.code === '42P01') { setTableMissing(true); return }
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    setNomSchema('')
    setCurrentSchemaId(null)
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
    setNomSchema(s.nom || '')
    setCurrentSchemaId(s.id)
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
  const iconeCoupelle = (
    <svg width="18" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 11 Q11 1 20 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <ellipse cx="11" cy="11.5" rx="9" ry="2.5" stroke="currentColor" strokeWidth="1.5"/>
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
  const outilsObjets = [
    { key: 'cone', label: iconeCoupelle, title: 'Coupelle' },
    { key: 'ballon', label: '⚽', title: 'Ballon' },
    { key: 'mannequin', label: '👤', title: 'Mannequin' },
    { key: 'petite_cage', label: '🥅', title: 'Petite cage (double-clic pour pivoter)' },
    { key: 'grande_cage', label: '🥅', title: 'Grande cage (double-clic pour pivoter)' },
    { key: 'plot', label: '🟡', title: 'Plot' },
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

  // ── Panneau joueurs droit ─────────────────────────────────────────────────
  const joueursA = elements.filter(e => e.type === 'joueur' && e.equipe === 'A').sort((a, b) => Number(a.numero) - Number(b.numero))
  const joueursB = elements.filter(e => e.type === 'joueur' && e.equipe === 'B').sort((a, b) => Number(a.numero) - Number(b.numero))
  const hasJoueurs = joueursA.length > 0 || joueursB.length > 0

  // Style du tool actif pour preview flèche
  const arrowPreviewStyle = tool.replace('fleche-', '')

  return (
    <div>
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
          <option value="">📋 {t('tac_dispositif', lang)} ({equipeActive === 'A' ? t('tac_equipe_a', lang) : t('tac_equipe_b', lang)})...</option>
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
        <button onClick={() => { setEquipeActive('A'); ajouterEquipe('A') }} style={{ padding: '7px 14px', borderRadius: '8px', border: equipeActive === 'A' ? '1px solid #4ade80' : '1px solid #4ade8040', background: equipeActive === 'A' ? '#4ade8030' : '#4ade8015', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🟢 {t('tac_equipe_a', lang)}</button>
        <button onClick={() => { setEquipeActive('B'); ajouterEquipe('B') }} style={{ padding: '7px 14px', borderRadius: '8px', border: equipeActive === 'B' ? '1px solid #f97316' : '1px solid #f9731640', background: equipeActive === 'B' ? '#f9731630' : '#f9731615', color: '#f97316', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🔴 {t('tac_equipe_b', lang)}</button>
      </div>

      {tableMissing && !isModal && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>tactipads</code> n'existe pas encore en base.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Toolbar gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => { setTool('select'); setPendingStart(null); setMousePos(null) }} style={btnStyle(tool === 'select')} title="Sélection [Échap]">↖</button>
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

        {/* Canvas */}
        <div style={{ position: 'relative' }}>
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
            onMouseMove={handleMouseMove}
            style={{ borderRadius: '12px', overflow: 'hidden', cursor: pendingStart ? 'crosshair' : 'default' }}
          >
            <Layer>
              {terrainImg && <KonvaImage image={terrainImg} width={width} height={height} listening={false} />}

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
                <ObjetNode key={e.id} el={e} isSelected={selectedId === e.id} onSelect={setSelectedId} onChange={updateElement}
                  onDelete={() => applyElements(elements.filter(x => x.id !== e.id))}
                  onRotate={() => updateElement({ ...e, rotation: (e.rotation || 0) === 0 ? 90 : 0 })}
                />
              ))}
              {elements.filter(e => e.type === 'joueur').map(e => (
                <JoueurNode key={e.id} el={e} isSelected={selectedId === e.id} onSelect={setSelectedId} onChange={updateElement} onEdit={editerJoueur} />
              ))}

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
                  const color = el.equipe === 'A' ? '#4ade80' : '#f97316'
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center' }}>
              <input value={nomSchema} onChange={e => setNomSchema(e.target.value)} placeholder="Nom du schéma"
                style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }} />
              <button onClick={sauvegarderSchema} disabled={savingSchema || tableMissing} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: tableMissing ? 0.4 : 1 }}>
                {savingSchema ? '...' : currentSchemaId ? '💾 Mettre à jour' : '💾 Sauvegarder'}
              </button>
              {currentSchemaId && (
                <button onClick={() => { setCurrentSchemaId(null); setNomSchema('') }} style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer' }}>Nouveau</button>
              )}
            </div>
          )}
        </div>

        {/* ── NOUVEAU : panneau joueurs à droite ──────────────────────────── */}
        {hasJoueurs && (
          <div style={{ width: 170, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {joueursA.length > 0 && (
              <div>
                <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>ÉQUIPE A</div>
                {joueursA.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: j.gardien ? 4 : '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                      {j.numero}
                    </div>
                    <input
                      value={j.nom || ''}
                      onChange={e => renommerJoueur(j.id, e.target.value)}
                      placeholder={j.gardien ? 'Gardien' : `Joueur ${j.numero}`}
                      style={{ flex: 1, background: '#111', border: `1px solid ${selectedId === j.id ? '#4ade80' : '#222'}`, borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, width: '100%', boxSizing: 'border-box' }}
                      onFocus={() => setSelectedId(j.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            {joueursB.length > 0 && (
              <div>
                <div style={{ color: '#f97316', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>ÉQUIPE B</div>
                {joueursB.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: j.gardien ? 4 : '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                      {j.numero}
                    </div>
                    <input
                      value={j.nom || ''}
                      onChange={e => renommerJoueur(j.id, e.target.value)}
                      placeholder={j.gardien ? 'Gardien' : `Joueur ${j.numero}`}
                      style={{ flex: 1, background: '#111', border: `1px solid ${selectedId === j.id ? '#f97316' : '#222'}`, borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, width: '100%', boxSizing: 'border-box' }}
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
      {!isModal && (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>📚 Mes schémas {schemas.length > 0 ? `(${schemas.length})` : ''}</p>
          {loadingSchemas ? (
            <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
          ) : schemas.length === 0 ? (
            <p style={{ color: '#444', fontSize: '13px' }}>Aucun schéma sauvegardé pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schemas.map(s => (
                <div key={s.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.nom || 'Sans titre'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}{s.partage ? ' · 🔗 partagé' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => chargerSchema(s)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Charger</button>
                    <button onClick={() => partagerSchema(s.id)} style={{ background: '#a78bfa15', border: '1px solid #a78bfa40', color: '#a78bfa', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>🔗 Partager</button>
                    <button onClick={() => supprimerSchema(s.id)} style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
