/**
 * Tactipad3D.jsx
 * Vue 3D synchronisée avec le même data model que Tactipad.jsx
 *
 * Dépendances à installer :
 *   npm install three @react-three/fiber @react-three/drei
 */

import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Dimensions terrain (unités 3D ≈ mètres / 10) ──────────────────────────
const TW = 10.5   // largeur (axe X)
const TD = 6.8    // profondeur (axe Z)

// ── Conversion coordonnées 2D canvas → monde 3D ────────────────────────────
const to3D = (x2d, y2d, cw, ch) => [
  (x2d / cw - 0.5) * TW,
  0,
  (y2d / ch - 0.5) * TD,
]

// ── Presets de caméra ──────────────────────────────────────────────────────
const PRESETS = {
  'Dessus':       { pos: [0, 12, 0.01],  target: [0, 0, 0] },
  'Coach':        { pos: [0, 5.5, 6.5],  target: [0, 0, 0] },
  'TV':           { pos: [0, 6.5, 5.5],  target: [0, 0.5, 0] },
  'Latérale':     { pos: [8, 4.5, 0],    target: [0, 0, 0] },
  'Derrière but': { pos: [-7, 3.5, 0],   target: [0, 1, 0] },
}

// ── Terrain — lignes comme de fines boîtes ─────────────────────────────────
function PitchLines() {
  const LW = 0.035  // épaisseur de ligne
  const y  = 0.01
  const hw = TW / 2
  const hd = TD / 2

  const boxes = []

  // Helper : ligne horizontale (parallèle X)
  const hLine = (x1, x2, z) =>
    boxes.push({ pos: [(x1 + x2) / 2, y, z], size: [Math.abs(x2 - x1) + LW, 0.01, LW] })
  // Helper : ligne verticale (parallèle Z)
  const vLine = (x, z1, z2) =>
    boxes.push({ pos: [x, y, (z1 + z2) / 2], size: [LW, 0.01, Math.abs(z2 - z1)] })

  // Contour
  hLine(-hw, hw, -hd); hLine(-hw, hw, hd)
  vLine(-hw, -hd, hd); vLine(hw, -hd, hd)
  // Ligne médiane
  vLine(0, -hd, hd)

  // Surface de réparation gauche
  const paW = TW * 0.157, paD = TD * 0.486
  hLine(-hw, -hw + paW, -paD / 2); hLine(-hw, -hw + paW, paD / 2); vLine(-hw + paW, -paD / 2, paD / 2)
  // Surface de réparation droite
  hLine(hw - paW, hw, -paD / 2); hLine(hw - paW, hw, paD / 2); vLine(hw - paW, -paD / 2, paD / 2)

  // Surface de but gauche
  const gaW = TW * 0.057, gaD = TD * 0.265
  hLine(-hw, -hw + gaW, -gaD / 2); hLine(-hw, -hw + gaW, gaD / 2); vLine(-hw + gaW, -gaD / 2, gaD / 2)
  // Surface de but droite
  hLine(hw - gaW, hw, -gaD / 2); hLine(hw - gaW, hw, gaD / 2); vLine(hw - gaW, -gaD / 2, gaD / 2)

  // Points de penalty
  const penSpots = [[-hw + TW * 0.114, 0], [hw - TW * 0.114, 0]]

  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}

      {/* Cercle central */}
      <CenterCircle />

      {/* Points de penalty */}
      {penSpots.map(([x, z], i) => (
        <mesh key={`pen-${i}`} position={[x, y + 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}

      {/* Point central */}
      <mesh position={[0, y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  )
}

function CenterCircle() {
  const r = Math.min(TW, TD) * 0.143
  const pts = useMemo(() =>
    Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * r, 0.01, Math.sin(a) * r)
    }), [r])
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: 'white' }), [])
  return <line geometry={geo} material={mat} />
}

// ── Buts ───────────────────────────────────────────────────────────────────
function Goal({ side }) {
  const gw  = TD * 0.132   // largeur du but
  const gh  = 0.55          // hauteur
  const gd  = 0.28          // profondeur
  const x   = side === 'left' ? -TW / 2 : TW / 2
  const dir = side === 'left' ? 1 : -1

  const postGeo  = useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, gh, 8), [gh])
  const barGeo   = useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, gw, 8), [gw])
  const backGeo  = useMemo(() => new THREE.CylinderGeometry(0.020, 0.020, gw, 8), [gw])
  const connGeo  = useMemo(() => new THREE.CylinderGeometry(0.020, 0.020, gd, 8), [gd])
  const mat = <meshStandardMaterial color="white" roughness={0.4} />

  return (
    <group>
      <mesh position={[x, gh / 2, -gw / 2]} geometry={postGeo}>{mat}</mesh>
      <mesh position={[x, gh / 2,  gw / 2]} geometry={postGeo}>{mat}</mesh>
      <mesh position={[x, gh, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={barGeo}>{mat}</mesh>
      <mesh position={[x + dir * gd, gh, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={backGeo}>{mat}</mesh>
      <mesh position={[x + dir * gd / 2, gh, -gw / 2]} rotation={[0, 0, Math.PI / 2]} geometry={connGeo}>{mat}</mesh>
      <mesh position={[x + dir * gd / 2, gh,  gw / 2]} rotation={[0, 0, Math.PI / 2]} geometry={connGeo}>{mat}</mesh>
    </group>
  )
}

// ── Joueur ─────────────────────────────────────────────────────────────────
function Player({ el, cw, ch, isSelected, onClick }) {
  const [x, , z] = to3D(el.x, el.y, cw, ch)
  const jerseyColor = el.equipe === 'A' ? '#4ade80' : '#f97316'
  const skinColor   = '#e8c09a'
  const shortColor  = el.equipe === 'A' ? '#166534' : '#7c2d12'
  const scale = isSelected ? 1.2 : 1

  const jersey = <meshStandardMaterial color={jerseyColor} roughness={0.6} />
  const skin   = <meshStandardMaterial color={skinColor}   roughness={0.7} />
  const short  = <meshStandardMaterial color={shortColor}  roughness={0.6} />

  return (
    <group
      position={[x, 0, z]}
      scale={[scale, scale, scale]}
      onClick={e => { e.stopPropagation(); onClick?.() }}
    >
      {/* ── Pieds ──────────────────────────────────────────────────── */}
      <mesh position={[-0.08, 0.06, 0.05]}>
        <boxGeometry args={[0.1, 0.08, 0.2]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.06, 0.05]}>
        <boxGeometry args={[0.1, 0.08, 0.2]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>

      {/* ── Jambes (chaussettes + peau) ────────────────────────────── */}
      <mesh position={[-0.08, 0.28, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
        {skin}
      </mesh>
      <mesh position={[0.08, 0.28, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
        {skin}
      </mesh>

      {/* ── Short ──────────────────────────────────────────────────── */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.34, 0.18, 0.22]} />
        {short}
      </mesh>

      {/* ── Torse (maillot) ────────────────────────────────────────── */}
      <mesh position={[0, 0.77, 0]}>
        <boxGeometry args={[0.36, 0.38, 0.22]} />
        {jersey}
      </mesh>

      {/* ── Bras ───────────────────────────────────────────────────── */}
      <mesh position={[-0.26, 0.77, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.065, 0.065, 0.42, 8]} />
        {jersey}
      </mesh>
      <mesh position={[0.26, 0.77, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.065, 0.065, 0.42, 8]} />
        {jersey}
      </mesh>

      {/* ── Avant-bras / mains ─────────────────────────────────────── */}
      <mesh position={[-0.31, 0.57, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.055, 0.055, 0.3, 8]} />
        {skin}
      </mesh>
      <mesh position={[0.31, 0.57, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.055, 0.055, 0.3, 8]} />
        {skin}
      </mesh>

      {/* ── Cou ────────────────────────────────────────────────────── */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 8]} />
        {skin}
      </mesh>

      {/* ── Tête ───────────────────────────────────────────────────── */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.19, 14, 14]} />
        {skin}
      </mesh>

      {/* ── Cheveux (petite calotte) ────────────────────────────────── */}
      <mesh position={[0, 1.32, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.19, 10, 10]} />
        <meshStandardMaterial color="#3b1f0a" roughness={1} />
      </mesh>

      {/* ── Numéro sur le maillot ──────────────────────────────────── */}
      <Text
        position={[0, 0.78, 0.12]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor={shortColor}
      >
        {String(el.numero ?? '')}
      </Text>

      {/* ── Nom flottant en dessous ─────────────────────────────────── */}
      {el.nom ? (
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.16}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="black"
        >
          {el.nom}
        </Text>
      ) : null}

      {/* ── Anneau de sélection ────────────────────────────────────── */}
      {isSelected && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.42, 32]} />
          <meshBasicMaterial color="#4ade80" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Ombre au sol ───────────────────────────────────────────── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

// ── Ballon ─────────────────────────────────────────────────────────────────
function Ball({ el, cw, ch }) {
  const [x, , z] = to3D(el.x, el.y, cw, ch)
  return (
    <mesh position={[x, 0.18, z]} castShadow>
      <sphereGeometry args={[0.175, 24, 24]} />
      <meshStandardMaterial color="white" roughness={0.2} metalness={0.05} />
    </mesh>
  )
}

// ── Cône / Coupelle ────────────────────────────────────────────────────────
function Cone({ el, cw, ch }) {
  const [x, , z] = to3D(el.x, el.y, cw, ch)
  return (
    <mesh position={[x, 0.2, z]} castShadow>
      <coneGeometry args={[0.12, 0.4, 12]} />
      <meshStandardMaterial color="#f59e0b" roughness={0.6} />
    </mesh>
  )
}

// ── Mannequin ──────────────────────────────────────────────────────────────
function Mannequin({ el, cw, ch }) {
  const [x, , z] = to3D(el.x, el.y, cw, ch)
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1.5, 8]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
    </group>
  )
}

// ── Contrôleur de caméra ───────────────────────────────────────────────────
function CameraController({ preset }) {
  const ctrlRef = useRef()

  useEffect(() => {
    if (!ctrlRef.current) return
    const p = PRESETS[preset]
    if (!p) return
    ctrlRef.current.object.position.set(...p.pos)
    ctrlRef.current.target.set(...p.target)
    ctrlRef.current.update()
  }, [preset])

  return (
    <OrbitControls
      ref={ctrlRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={25}
    />
  )
}

// ── Composant principal ────────────────────────────────────────────────────
export default function Tactipad3D({ elements, canvasW, canvasH, selectedId, onSelect }) {
  const [preset, setPreset]  = useState('Coach')
  const [shadows, setShadows] = useState(false)

  const players   = elements.filter(e => e.type === 'joueur')
  const ballEl    = elements.find(e => e.type === 'objet' && e.kind === 'ballon')
  const cones     = elements.filter(e => e.type === 'objet' && e.kind === 'cone')
  const mannequins = elements.filter(e => e.type === 'objet' && e.kind === 'mannequin')

  return (
    <div style={{ position: 'relative', width: canvasW, height: canvasH, borderRadius: 12, overflow: 'hidden', background: '#0a1a0a' }}>

      {/* ── Barre de contrôles caméra ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 10,
        display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: canvasW - 20,
      }}>
        {Object.keys(PRESETS).map(k => (
          <button key={k} onClick={() => setPreset(k)}
            style={{
              padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
              border: preset === k ? '1px solid #4ade80' : '1px solid #333',
              background: preset === k ? '#4ade8025' : 'rgba(0,0,0,0.65)',
              color: preset === k ? '#4ade80' : '#999',
              fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>
            {k}
          </button>
        ))}
        <button onClick={() => setShadows(v => !v)}
          style={{
            padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
            border: shadows ? '1px solid #a78bfa' : '1px solid #333',
            background: shadows ? '#a78bfa20' : 'rgba(0,0,0,0.65)',
            color: shadows ? '#a78bfa' : '#666',
            fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
          }}>
          {shadows ? '💡 Ombres ON' : '💡 Ombres OFF'}
        </button>
      </div>

      {/* ── Aide ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, color: '#3a5a3a', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
        🖱 Glisser : tourner · Molette : zoom · Clic droit : déplacer
      </div>

      {/* ── Scène 3D ──────────────────────────────────────────────────── */}
      <Canvas
        shadows={shadows}
        camera={{ position: [0, 5.5, 6.5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a1a0a' }}
        onPointerMissed={() => onSelect?.(null)}
      >
        {/* Lumières */}
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[5, 12, 4]}
          intensity={1.3}
          castShadow={shadows}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <directionalLight position={[-4, 6, -3]} intensity={0.4} />

        {/* Fond gazon (légèrement plus large que le terrain) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.006, 0]}>
          <planeGeometry args={[TW + 2, TD + 2]} />
          <meshStandardMaterial color="#1a5c1a" roughness={1} />
        </mesh>

        {/* Terrain */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[TW, TD]} />
          <meshStandardMaterial color="#2d6a2d" roughness={0.95} />
        </mesh>

        <PitchLines />
        <Goal side="left" />
        <Goal side="right" />

        {/* Joueurs */}
        {players.map(p => (
          <Player
            key={p.id}
            el={p}
            cw={canvasW}
            ch={canvasH}
            isSelected={selectedId === p.id}
            onClick={() => onSelect?.(p.id)}
          />
        ))}

        {/* Ballon */}
        {ballEl && <Ball el={ballEl} cw={canvasW} ch={canvasH} />}

        {/* Cônes */}
        {cones.map(c => <Cone key={c.id} el={c} cw={canvasW} ch={canvasH} />)}

        {/* Mannequins */}
        {mannequins.map(m => <Mannequin key={m.id} el={m} cw={canvasW} ch={canvasH} />)}

        {/* Contrôles caméra */}
        <CameraController preset={preset} />

        {/* Brume légère */}
        <fog attach="fog" args={['#0a1a0a', 18, 40]} />
      </Canvas>
    </div>
  )
}
