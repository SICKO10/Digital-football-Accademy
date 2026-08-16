import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Arrow, Text } from 'react-konva'
import { terrainSvgString, useSvgImage, JoueurNode, ObjetNode, rescaleElements } from './Tactipad'
import { colors } from '../tokens'

const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

// Lecture seule d'un schéma Tactipad déjà enregistré (table tactipads,
// colonne schema : { terrain, elements, sequences, equipesCouleurs }).
// Réutilise le même rendu Konva que TactipadPublic.jsx (terrain, JoueurNode,
// ObjetNode) en y ajoutant la lecture animée des étapes (sequences), absente
// de la page de partage public — pas de sauvegarde de durée par étape dans
// le schéma (Tactipad.jsx ne la persiste pas non plus), 2s par étape par défaut.
export default function TactipadViewer({ schema, width = 640 }) {
  const terrain = schema?.terrain || { sport: 'football', vue: 'complet', fond: 'vert' }
  const sequencesRaw = schema?.sequences?.length ? schema.sequences : [schema?.elements || []]
  // Remet à l'échelle si le schéma a été enregistré à une autre largeur que
  // celle d'affichage ici (cf. rescaleElements dans Tactipad.jsx) — sans ça,
  // un élément placé près d'un bord sur un grand écran déborderait du canvas
  // plus étroit de la Causerie.
  const sequences = schema?.terrain?.w ? sequencesRaw.map(seq => rescaleElements(seq, schema.terrain.w, width)) : sequencesRaw
  const hasAnimation = sequences.length > 1

  const height = Math.round(width * 10 / 16)
  const svgString = terrainSvgString({ ...terrain, w: width, h: height })
  const terrainImg = useSvgImage(svgString)

  const [elements, setElements] = useState(sequences[0] || [])
  const [etape, setEtape] = useState(0)
  const [playing, setPlaying] = useState(false)
  const animRef = useRef(null)
  const stepTimeoutRef = useRef(null)
  const stopRef = useRef(false)

  // Une même causerie peut proposer plusieurs mouvements : on repart de zéro
  // si le schéma affiché change (nouvelle instance logique, même composant monté).
  useEffect(() => {
    stopRef.current = true
    cancelAnimationFrame(animRef.current)
    clearTimeout(stepTimeoutRef.current)
    setElements(sequences[0] || [])
    setEtape(0)
    setPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema])

  useEffect(() => () => { cancelAnimationFrame(animRef.current); clearTimeout(stepTimeoutRef.current) }, [])

  const lire = () => {
    if (!hasAnimation || playing) return
    stopRef.current = false
    setPlaying(true)
    const depart = etape >= sequences.length - 1 ? 0 : etape

    const animateStep = (fromIdx) => {
      if (stopRef.current) return
      const toIdx = fromIdx + 1
      if (toIdx >= sequences.length) { setPlaying(false); setEtape(fromIdx); setElements(sequences[fromIdx]); return }
      const fromElems = sequences[fromIdx]
      const toElems = sequences[toIdx]
      const fromIds = new Set(fromElems.map(e => e.id))
      const startTime = performance.now()
      setEtape(fromIdx)

      const frame = (now) => {
        const raw = Math.min((now - startTime) / 2000, 1)
        const t = easeInOut(raw)
        const interpolated = fromElems.map(el => {
          if (el.type === 'joueur' || el.type === 'joker' || el.type === 'objet') {
            const target = toElems.find(e => e.id === el.id)
            if (!target) return el
            return { ...el, x: lerp(el.x, target.x, t), y: lerp(el.y, target.y, t) }
          }
          return raw >= 0.5 ? (toElems.find(e => e.id === el.id) || el) : el
        })
        const newElems = toElems.filter(e => !fromIds.has(e.id))
        setElements([...interpolated, ...newElems])
        if (raw < 1) {
          animRef.current = requestAnimationFrame(frame)
        } else {
          setElements(toElems)
          setEtape(toIdx)
          if (stopRef.current) return
          stepTimeoutRef.current = setTimeout(() => animateStep(toIdx), 400)
        }
      }
      animRef.current = requestAnimationFrame(frame)
    }
    animateStep(depart)
  }

  const stop = () => {
    stopRef.current = true
    cancelAnimationFrame(animRef.current)
    clearTimeout(stepTimeoutRef.current)
    setPlaying(false)
  }

  return (
    <div>
      <Stage width={width} height={height} style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Layer>
          {terrainImg && <KonvaImage image={terrainImg} width={width} height={height} listening={false} />}

          {elements.filter(e => e.type === 'zone-rect').map(e => (
            <Rect key={e.id} x={e.x} y={e.y} width={e.width} height={e.height} rotation={e.rotation || 0} fill={e.color + '40'} stroke={e.color} strokeWidth={2} listening={false} />
          ))}
          {elements.filter(e => e.type === 'zone-cercle').map(e => (
            <Circle key={e.id} x={e.x} y={e.y} radius={e.radius} fill={e.color + '40'} stroke={e.color} strokeWidth={2} listening={false} />
          ))}
          {elements.filter(e => e.type === 'fleche').map(e => {
            const xs = e.points.filter((_, i) => i % 2 === 0)
            const ys = e.points.filter((_, i) => i % 2 === 1)
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2
            const relPoints = e.points.map((p, i) => p - (i % 2 === 0 ? cx : cy))
            return (
              <Arrow key={e.id} x={cx} y={cy} points={relPoints} rotation={e.rotation || 0} stroke={e.color} fill={e.color} strokeWidth={3}
                tension={e.style === 'courbe' ? 0.5 : 0} dash={e.style === 'pointillee' ? [10, 5] : undefined} listening={false} />
            )
          })}
          {elements.filter(e => e.type === 'texte').map(e => (
            <Text key={e.id} x={e.x} y={e.y} text={e.text} fontSize={16} fontStyle="bold" fill={e.color} listening={false} />
          ))}
          {elements.filter(e => e.type === 'objet').map(e => (
            <ObjetNode key={e.id} el={e} isSelected={false} draggable={false} />
          ))}
          {elements.filter(e => e.type === 'joueur' || e.type === 'joker').map(e => (
            <JoueurNode key={e.id} el={e} isSelected={false} draggable={false} couleurs={schema?.equipesCouleurs} />
          ))}
        </Layer>
      </Stage>

      {hasAnimation && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <button onClick={playing ? stop : lire} style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '7px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {playing ? '⏸ Pause' : '▶ Lire l\'animation'}
          </button>
          <span style={{ color: colors.text.faint, fontSize: '12px' }}>Étape {etape + 1}/{sequences.length}</span>
        </div>
      )}
    </div>
  )
}
