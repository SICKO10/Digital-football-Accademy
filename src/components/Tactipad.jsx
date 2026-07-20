import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Arrow, Text, Group, Transformer } from 'react-konva'
import GIF from 'gif.js'
import { supabase } from '../supabase'

const COULEURS = [
  { val: '#4ade80', label: 'Vert' },
  { val: '#ffffff', label: 'Blanc' },
  { val: '#fbbf24', label: 'Jaune' },
  { val: '#ef4444', label: 'Rouge' },
  { val: '#111111', label: 'Noir' },
]

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// Positions en % du terrain (x: 0→1, y: 0→1), gardien (num 1) toujours en x:0.05, y:0.5.
// Seuls 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-4-3, 5-3-2 avaient des coordonnées fournies —
// les 6 autres dispositifs listés dans le sélecteur (4-4-2 plat, 4-5-1, 4-1-4-1,
// 4-3-2-1, 3-4-1-2, 5-4-1) ont été complétés ici en suivant le même gabarit de bandes
// (défense x≈0.20, 1er bloc milieu x≈0.38-0.45, 2e bloc x≈0.55, attaque x≈0.65-0.70)
// pour que le sélecteur fonctionne sur les 12 options plutôt que sur 6 seulement.
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

// ── Génération SVG du terrain (proportionnel à la taille du canvas) ────────────
export function terrainSvgString({ sport, vue, fond, w, h }) {
  const bg = fond === 'vert' ? '#1a7a3c' : '#ffffff'
  const line = fond === 'vert' ? '#ffffff' : '#333333'
  const lw = 2
  const cx = w / 2, cy = h / 2

  if (sport === 'futsal') {
    const zoneW = w * 0.16, buteW = w * 0.05, buteH = h * 0.32
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

// Charge une chaîne SVG comme image utilisable par Konva.Image (nécessaire pour
// que le terrain fasse partie du canvas exporté — un <svg> DOM séparé en fond
// n'apparaîtrait pas dans stage.toDataURL()).
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

// ── Génération des points d'une flèche selon son style ──────────────────────
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

// ── Joueur ────────────────────────────────────────────────────────────────────
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

// ── Objet (cone / ballon / mannequin) ────────────────────────────────────────
export function ObjetNode({ el, isSelected, onSelect = () => {}, onChange = () => {}, draggable = true }) {
  const emoji = el.kind === 'cone' ? '🔸' : el.kind === 'ballon' ? '⚽' : '👤'
  return (
    <Group
      x={el.x} y={el.y} draggable={draggable}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragEnd={e => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >
      {isSelected && <Circle radius={16} fill="#ffffff20" stroke="#fff" strokeWidth={1} />}
      {/* Le texte porte la zone cliquable/draggable : elle ne doit jamais être
          listening=false, sinon un objet non sélectionné n'a aucune zone
          interactive (le cercle ci-dessus n'existe que déjà sélectionné). */}
      <Text text={emoji} fontSize={22} x={-12} y={-13} />
    </Group>
  )
}

export default function Tactipad({ userId, mode = 'standalone', vueParDefaut, onValider, onFermer }) {
  const [isMobile] = useState(window.innerWidth < 768)
  const isModal = mode === 'modal'

  const [sport, setSport] = useState('football')
  const [vue, setVue] = useState(vueParDefaut || 'complet')
  const [fond, setFond] = useState('vert')

  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [equipeActive, setEquipeActive] = useState('A') // équipe ciblée par les dispositifs / le bouton "Équipe A/B"
  const [tool, setTool] = useState('select')
  const [arrowColor, setArrowColor] = useState('#ffffff')
  const [pendingStart, setPendingStart] = useState(null) // {x,y} en attente du 2e clic pour une flèche

  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])

  const [sequences, setSequences] = useState([[]])
  const [etapeActive, setEtapeActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playIntervalRef = useRef(null)

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
  // Un seul Transformer partagé : seuls flèche/zone-rect/zone-cercle sont
  // transformables — joueur/objet/texte n'ont pas de handles (resize n'a pas
  // de sens sur eux, ils se déplacent juste par drag).
  const TRANSFORMABLE_TYPES = ['fleche', 'zone-rect', 'zone-cercle']

  useEffect(() => {
    if (trRef.current) {
      const node = selectedElement && TRANSFORMABLE_TYPES.includes(selectedElement.type) ? nodeRefs.current[selectedId] : null
      trRef.current.nodes(node ? [node] : [])
      trRef.current.getLayer()?.batchDraw()
    }
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

  // Applique un dispositif tactique à l'équipe active. Équipe A garde l'orientation
  // gardien-à-gauche des coordonnées du dispositif ; équipe B est symétrisée en x
  // (gardien à droite), pour rester cohérent avec ajouterEquipe qui place déjà B en
  // miroir. Les noms déjà saisis pour cette équipe sont conservés par numéro de maillot.
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

  const joueurSelectionne = selectedId ? elements.find(e => e.id === selectedId && e.type === 'joueur') || null : null

  const handleStageClick = (e) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return
    const clickedOnEmpty = e.target === stage || e.target.getClassName() === 'Image'
    if (!clickedOnEmpty) return

    if (tool === 'select') {
      setSelectedId(null)
      return
    }

    if (['cone', 'ballon', 'mannequin'].includes(tool)) {
      applyElements([...elements, { id: uid(), type: 'objet', kind: tool, x: pos.x, y: pos.y }])
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
      } else {
        const style = tool.replace('fleche-', '')
        const points = computeArrowPoints(style, pendingStart.x, pendingStart.y, pos.x, pos.y)
        applyElements([...elements, { id: uid(), type: 'fleche', style, points, color: arrowColor }])
        setPendingStart(null)
      }
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

  // Mode modal (intégration Fiche de séance) : génère le PNG et le remonte au parent
  const validerSchema = () => {
    setSelectedId(null)
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
      onValider?.(uri)
    }, 50)
  }

  // ── V2 — séquences animées ────────────────────────────────────────────────
  useEffect(() => () => clearInterval(playIntervalRef.current), [])

  const allerEtape = (index) => {
    if (index === etapeActive) return
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    setSequences(synced)
    setEtapeActive(index)
    setElements(synced[index] || [])
    setHistory([])
    setFuture([])
    setSelectedId(null)
  }

  const ajouterEtape = () => {
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    const nouvelIndex = synced.length
    setSequences([...synced, elements]) // la nouvelle étape démarre comme copie de l'étape actuelle
    setEtapeActive(nouvelIndex)
    setHistory([])
    setFuture([])
    setSelectedId(null)
  }

  const lire = () => {
    if (sequences.length < 2 || playing) return
    const synced = sequences.map((s, i) => (i === etapeActive ? elements : s))
    setSequences(synced)
    setPlaying(true)
    setSelectedId(null)
    let i = etapeActive
    playIntervalRef.current = setInterval(() => {
      i = (i + 1) % synced.length
      setEtapeActive(i)
      setElements(synced[i] || [])
    }, 1500)
  }

  const stopLecture = () => {
    clearInterval(playIntervalRef.current)
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
      await new Promise(r => setTimeout(r, 80)) // laisse Konva re-render l'étape avant capture
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
    setHistory([])
    setFuture([])
    setSelectedId(null)
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

  const outilsFlêches = [
    { key: 'fleche-droite', label: '→', title: 'Flèche droite' },
    { key: 'fleche-courbe', label: '↝', title: 'Flèche courbe' },
    { key: 'fleche-pointillee', label: '⇢', title: 'Flèche pointillée' },
    { key: 'fleche-dribble', label: '⚡', title: 'Flèche dribble' },
  ]
  const outilsZones = [
    { key: 'zone-rect', label: '🔵', title: 'Zone rectangle' },
    { key: 'zone-cercle', label: '○', title: 'Zone cercle' },
    { key: 'texte', label: 'T', title: 'Texte libre' },
  ]
  const outilsObjets = [
    { key: 'cone', label: '🔸', title: 'Cone' },
    { key: 'ballon', label: '⚽', title: 'Ballon' },
    { key: 'mannequin', label: '👤', title: 'Mannequin' },
  ]

  const btnStyle = (active) => ({
    width: '38px', height: '38px', borderRadius: '8px', border: active ? '1px solid #4ade80' : '1px solid #222',
    background: active ? '#4ade8020' : '#111', color: active ? '#4ade80' : '#aaa', fontSize: '16px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['football', '⚽ Football'], ['futsal', '🏟️ Futsal']].map(([v, label]) => (
            <button key={v} onClick={() => setSport(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: sport === v ? '#4ade80' : 'transparent', color: sport === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['demi', 'Demi-terrain'], ['complet', 'Terrain complet']].map(([v, label]) => (
            <button key={v} onClick={() => setVue(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: vue === v ? '#4ade80' : 'transparent', color: vue === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
          {[['vert', '🟢 Vert'], ['blanc', '⬜ Blanc']].map(([v, label]) => (
            <button key={v} onClick={() => setFond(v)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: fond === v ? '#4ade80' : 'transparent', color: fond === v ? '#000' : '#666' }}>{label}</button>
          ))}
        </div>
        <select
          onChange={e => { appliquerDispositif(e.target.value); e.target.value = '' }}
          defaultValue=""
          style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#aaa', fontSize: '12px', padding: '7px 10px', cursor: 'pointer' }}
        >
          <option value="">📋 Dispositif ({equipeActive === 'A' ? 'Équipe A' : 'Équipe B'})...</option>
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
        <button onClick={() => { setEquipeActive('A'); ajouterEquipe('A') }} style={{ padding: '7px 14px', borderRadius: '8px', border: equipeActive === 'A' ? '1px solid #4ade80' : '1px solid #4ade8040', background: equipeActive === 'A' ? '#4ade8030' : '#4ade8015', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🟢 Équipe A</button>
        <button onClick={() => { setEquipeActive('B'); ajouterEquipe('B') }} style={{ padding: '7px 14px', borderRadius: '8px', border: equipeActive === 'B' ? '1px solid #f97316' : '1px solid #f9731640', background: equipeActive === 'B' ? '#f9731630' : '#f9731615', color: '#f97316', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🔴 Équipe B</button>
      </div>

      {tableMissing && !isModal && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>tactipads</code> n'existe pas encore en base — la sauvegarde et la bibliothèque de schémas sont indisponibles tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Toolbar gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => { setTool('select'); setPendingStart(null) }} style={btnStyle(tool === 'select')} title="Sélection">↖</button>
          <div style={{ height: '1px', background: '#222' }} />
          {outilsFlêches.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
          <div style={{ height: '1px', background: '#222' }} />
          {outilsZones.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
          <div style={{ height: '1px', background: '#222' }} />
          {outilsObjets.map(o => (
            <button key={o.key} onClick={() => { setTool(o.key); setPendingStart(null) }} style={btnStyle(tool === o.key)} title={o.title}>{o.label}</button>
          ))}
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
            <p style={{ fontSize: '11px', color: '#4ade80', margin: '0 0 6px' }}>Clique le point d'arrivée de la flèche…</p>
          )}
          {joueurSelectionne && (
            <div style={{
              position: 'absolute', right: '10px', top: '10px',
              background: '#1a1a1a', border: '1px solid #333',
              borderRadius: '8px', padding: '12px', zIndex: 10, width: '180px',
            }}>
              <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>
                Joueur {joueurSelectionne.numero}
              </div>
              <input
                placeholder="Nom du joueur"
                value={joueurSelectionne.nom || ''}
                onChange={e => renommerJoueur(joueurSelectionne.id, e.target.value)}
                style={{ width: '100%', background: '#111', color: 'white', border: '1px solid #444', borderRadius: '4px', padding: '6px', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
          )}
          <Stage ref={stageRef} width={width} height={height} onClick={handleStageClick} onTap={handleStageClick} style={{ borderRadius: '12px', overflow: 'hidden' }}>
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
                    onTransformEnd={ev => {
                      updateElement({ ...e, rotation: ev.target.rotation() })
                    }} />
                )
              })}
              {elements.filter(e => e.type === 'texte').map(e => (
                <Text key={e.id} ref={n => (nodeRefs.current[e.id] = n)} x={e.x} y={e.y} text={e.text} fontSize={16} fontStyle="bold" fill={e.color} draggable
                  onClick={() => setSelectedId(e.id)} onTap={() => setSelectedId(e.id)}
                  onDblClick={() => {
                    const t = prompt('Modifier le texte :', e.text)
                    if (t !== null) updateElement({ ...e, text: t })
                  }}
                  onDragEnd={ev => updateElement({ ...e, x: ev.target.x(), y: ev.target.y() })} />
              ))}
              {elements.filter(e => e.type === 'objet').map(e => (
                <ObjetNode key={e.id} el={e} isSelected={selectedId === e.id} onSelect={setSelectedId} onChange={updateElement} />
              ))}
              {elements.filter(e => e.type === 'joueur').map(e => (
                <JoueurNode key={e.id} el={e} isSelected={selectedId === e.id} onSelect={setSelectedId} onChange={updateElement} onEdit={editerJoueur} />
              ))}
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
          </Stage>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={undo} disabled={!history.length} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: history.length ? 1 : 0.4 }}>↩ Undo</button>
            <button onClick={redo} disabled={!future.length} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: future.length ? 1 : 0.4 }}>↪ Redo</button>
            <button onClick={supprimerSelection} disabled={!selectedId} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', opacity: selectedId ? 1 : 0.4 }}>🗑 Supprimer</button>
            <button onClick={toutEffacer} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#ef4444' }}>🧹 Tout effacer</button>
            <button onClick={exportPNG} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#60a5fa' }}>⬇️ Export PNG</button>
          </div>

          {/* Séquences animées (V2) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1a1a1a' }}>
            {sequences.map((_, i) => (
              <button key={i} onClick={() => allerEtape(i)} disabled={playing}
                style={{ padding: '6px 12px', borderRadius: '8px', border: i === etapeActive ? '1px solid #4ade80' : '1px solid #222', background: i === etapeActive ? '#4ade8020' : '#111', color: i === etapeActive ? '#4ade80' : '#aaa', fontSize: '12px', fontWeight: 600, cursor: playing ? 'default' : 'pointer' }}>
                Étape {i + 1}
              </button>
            ))}
            <button onClick={ajouterEtape} disabled={playing} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px' }}>+ Ajouter étape</button>
            {!playing ? (
              <button onClick={lire} disabled={sequences.length < 2} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#4ade80', opacity: sequences.length < 2 ? 0.4 : 1 }}>▶ Lire</button>
            ) : (
              <button onClick={stopLecture} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#ef4444' }}>⏹ Stop</button>
            )}
            <button onClick={exportGIF} disabled={sequences.length < 2 || playing} style={{ ...btnStyle(false), width: 'auto', padding: '0 12px', color: '#a78bfa', opacity: sequences.length < 2 ? 0.4 : 1 }}>🎞️ Export GIF</button>
          </div>

          {isModal ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={validerSchema} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ✅ Valider le schéma
              </button>
              <button onClick={() => onFermer?.()} style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer' }}>
                ✕ Fermer sans enregistrer
              </button>
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
      </div>

      {/* Bibliothèque de schémas */}
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
