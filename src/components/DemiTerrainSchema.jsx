// Demi-terrain pour les schémas de coups de pied arrêtés (CPA offensifs/
// défensifs) — plus léger que Tactipad (pas de flèches/ballon/numéros),
// juste des joueurs représentés par des ronds noir/blanc, positionnés en %
// (0-100 sur chaque axe) sur un demi-terrain généré (mêmes proportions que
// la moitié "but" de TerrainZonesSvg). En mode édition (onAjouter fourni),
// cliquer sur le terrain pose un rond de la couleur en cours ; cliquer sur
// un rond existant le retire.
const W = 260, H = 190

export default function DemiTerrainSchema({ joueurs = [], onAjouter, onRetirer, maxWidth = 280 }) {
  const cx = W / 2
  const boxW = W * 0.6, boxH = H * 0.32
  const sixW = W * 0.3, sixH = H * 0.12
  const goalW = W * 0.18
  const circleR = W * 0.16
  const spotOffset = H * 0.23
  const trait = { fill: 'none', stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5 }

  const handleClick = (e) => {
    if (!onAjouter) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onAjouter(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} onClick={handleClick}
      style={{ width: '100%', maxWidth, borderRadius: 8, display: 'block', background: '#2d5a1b', cursor: onAjouter ? 'crosshair' : 'default' }}>
      <rect x={1} y={1} width={W - 2} height={H - 2} {...trait} />
      <path d={`M ${cx - circleR} ${H} A ${circleR} ${circleR} 0 0 1 ${cx + circleR} ${H}`} {...trait} />
      <rect x={cx - boxW / 2} y={0} width={boxW} height={boxH} {...trait} />
      <rect x={cx - sixW / 2} y={0} width={sixW} height={sixH} {...trait} />
      <circle cx={cx} cy={spotOffset} r={2} fill="rgba(255,255,255,0.6)" />
      <path d={`M ${cx - circleR * 0.85} ${boxH} A ${circleR} ${circleR} 0 0 0 ${cx + circleR * 0.85} ${boxH}`} {...trait} />
      <rect x={cx - goalW / 2} y={-3} width={goalW} height={3} fill="none" stroke="white" strokeWidth="1.5" />

      {joueurs.map((j, i) => (
        <circle key={i} cx={(Number(j.x) || 0) / 100 * W} cy={(Number(j.y) || 0) / 100 * H} r={7}
          fill={j.couleur === 'noir' ? '#111' : '#fff'} stroke={j.couleur === 'noir' ? '#fff' : '#111'} strokeWidth={1.5}
          onClick={e => { if (onRetirer) { e.stopPropagation(); onRetirer(i) } }}
          style={{ cursor: onRetirer ? 'pointer' : 'default' }} />
      ))}
    </svg>
  )
}
