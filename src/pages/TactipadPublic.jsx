import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Arrow, Text } from 'react-konva'
import { supabase } from '../supabase'
import { terrainSvgString, useSvgImage, JoueurNode, ObjetNode } from '../components/Tactipad'

export default function TactipadPublic() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tactipad, setTactipad] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('tactipads').select('*').eq('partage_slug', slug).eq('partage', true).maybeSingle()
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setTactipad(data)
      setLoading(false)
    }
    load()
  }, [slug])

  const width = Math.min(window.innerWidth - 32, 800)
  const height = Math.round(width * 10 / 16)

  const schema = tactipad?.schema || {}
  const terrain = schema.terrain || { sport: 'football', vue: 'complet', fond: 'vert' }
  const elements = schema.elements || []

  const svgString = terrainSvgString({ ...terrain, w: width, h: height })
  const terrainImg = useSvgImage(svgString)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>
        Chargement...
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontSize: '32px' }}>🎨</p>
        <p style={{ color: '#666' }}>Ce schéma n'existe pas ou n'est plus partagé.</p>
        <button onClick={() => navigate('/')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
      <p style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 4px', textAlign: 'center' }}>{tactipad.nom || 'Schéma tactique'}</p>
      <p style={{ color: '#555', fontSize: '12px', marginBottom: '20px' }}>Partagé le {new Date(tactipad.created_at).toLocaleDateString('fr-FR')}</p>

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
            // Même logique de pivot que dans l'éditeur : rotation stockée = rotation
            // autour du centre de la boîte englobante des points, pas de (0,0).
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
          {elements.filter(e => e.type === 'joueur').map(e => (
            <JoueurNode key={e.id} el={e} isSelected={false} draggable={false} />
          ))}
        </Layer>
      </Stage>

      <button onClick={() => navigate('/')} style={{ marginTop: '24px', background: '#4ade80', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        Voir sur Digital Football Academy
      </button>
    </div>
  )
}
