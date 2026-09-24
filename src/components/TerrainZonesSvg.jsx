// Terrain pour l'éditeur de zones (club/éducateur, ProjetSportif.jsx →
// SectionZones) et son affichage joueur (PreparationTactiqueJoueur.jsx) —
// fond fixe (vert + tracés blancs), indépendant du thème clair/sombre,
// partagé entre les deux pour ne pas dupliquer les mêmes proportions à deux
// endroits. Deux fonds possibles :
// - fondUrl renseigné (image uploadée par le club, cf. bouton "Image de
//   fond" dans SectionZones) : l'image remplace le terrain dessiné.
// - sinon : terrain généré (rond central, surfaces de réparation et de but,
//   points de penalty) — remplace l'ancien simple rectangle vert uni.
// Zones dessinées par-dessus à partir de x/y/largeur/hauteur en % (0-100 sur
// chaque axe indépendamment, même convention que les schémas scannés/
// Tactipad ailleurs dans l'app).
const W = 260, H = 360

export default function TerrainZonesSvg({ zones, fondUrl, zoneActiveId, onZoneClick }) {
  const cx = W / 2, cy = H / 2
  const boxW = W * 0.6, boxH = H * 0.16
  const sixW = W * 0.3, sixH = H * 0.06
  const goalW = W * 0.18
  const circleR = W * 0.16
  const spotOffset = H * 0.115
  const trait = { fill: 'none', stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5 }
  const corner = 6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 280, borderRadius: 12, display: 'block', background: '#2d5a1b' }}>
      <defs>
        <linearGradient id="terrain-gazon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#357a1f" />
          <stop offset="100%" stopColor="#2a611a" />
        </linearGradient>
        <pattern id="terrain-bandes" x="0" y="0" width={W} height={H / 9} patternUnits="userSpaceOnUse">
          <rect width={W} height={H / 18} fill="rgba(255,255,255,0.035)" />
        </pattern>
      </defs>
      {fondUrl ? (
        <>
          <clipPath id="terrain-clip"><rect width={W} height={H} rx="8" /></clipPath>
          <image href={fondUrl} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" clipPath="url(#terrain-clip)" />
        </>
      ) : (
        <>
          <rect x={1} y={1} width={W - 2} height={H - 2} rx="8" fill="url(#terrain-gazon)" />
          <rect x={1} y={1} width={W - 2} height={H - 2} rx="8" fill="url(#terrain-bandes)" />
          <rect x={1} y={1} width={W - 2} height={H - 2} rx="8" {...trait} />
          <line x1={0} y1={cy} x2={W} y2={cy} {...trait} />
          <circle cx={cx} cy={cy} r={circleR} {...trait} />
          <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.6)" />
          {/* Surfaces haut */}
          <rect x={cx - boxW / 2} y={0} width={boxW} height={boxH} {...trait} />
          <rect x={cx - sixW / 2} y={0} width={sixW} height={sixH} {...trait} />
          <circle cx={cx} cy={spotOffset} r={2} fill="rgba(255,255,255,0.6)" />
          <path d={`M ${cx - circleR * 0.85} ${boxH} A ${circleR} ${circleR} 0 0 0 ${cx + circleR * 0.85} ${boxH}`} {...trait} />
          <rect x={cx - goalW / 2} y={-3} width={goalW} height={3} fill="none" stroke="white" strokeWidth="1.5" />
          {/* Surfaces bas */}
          <rect x={cx - boxW / 2} y={H - boxH} width={boxW} height={boxH} {...trait} />
          <rect x={cx - sixW / 2} y={H - sixH} width={sixW} height={sixH} {...trait} />
          <circle cx={cx} cy={H - spotOffset} r={2} fill="rgba(255,255,255,0.6)" />
          <path d={`M ${cx - circleR * 0.85} ${H - boxH} A ${circleR} ${circleR} 0 0 1 ${cx + circleR * 0.85} ${H - boxH}`} {...trait} />
          <rect x={cx - goalW / 2} y={H} width={goalW} height={3} fill="none" stroke="white" strokeWidth="1.5" />
          {/* Corners */}
          <path d={`M ${corner} 1 A ${corner} ${corner} 0 0 0 1 ${corner}`} {...trait} />
          <path d={`M ${W - corner} 1 A ${corner} ${corner} 0 0 1 ${W - 1} ${corner}`} {...trait} />
          <path d={`M 1 ${H - corner} A ${corner} ${corner} 0 0 0 ${corner} ${H - 1}`} {...trait} />
          <path d={`M ${W - 1} ${H - corner} A ${corner} ${corner} 0 0 0 ${W - corner} ${H - 1}`} {...trait} />
        </>
      )}

      {zones.map(z => {
        const x = (Number(z.x) || 0) / 100 * W, y = (Number(z.y) || 0) / 100 * H
        const w = (Number(z.largeur) || 0) / 100 * W, h = (Number(z.hauteur) || 0) / 100 * H
        const active = zoneActiveId != null && z.id === zoneActiveId
        const inactif = zoneActiveId != null && !active
        return (
          <g key={z.id} onClick={() => onZoneClick?.(z.id)} style={{ cursor: onZoneClick ? 'pointer' : 'default' }}>
            <rect x={x} y={y} width={w} height={h}
              fill={(z.couleur || '#4ade80') + (inactif ? '55' : 'cc')}
              stroke={active ? '#fff' : 'rgba(0,0,0,0.3)'} strokeWidth={active ? 2 : 1} />
            {z.label && <text x={x + w / 2} y={y + h / 2} fill="white" fontSize={Math.min(11, h * 0.35)} fontWeight="800" textAnchor="middle" dominantBaseline="middle" opacity={inactif ? 0.6 : 1}>{z.label.toUpperCase()}</text>}
          </g>
        )
      })}
    </svg>
  )
}
