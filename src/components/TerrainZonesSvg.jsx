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

export default function TerrainZonesSvg({ zones, fondUrl }) {
  const cx = W / 2, cy = H / 2
  const boxW = W * 0.6, boxH = H * 0.16
  const sixW = W * 0.3, sixH = H * 0.06
  const goalW = W * 0.18
  const circleR = W * 0.16
  const spotOffset = H * 0.115
  const trait = { fill: 'none', stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5 }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 280, borderRadius: 12, display: 'block', background: '#2d5a1b' }}>
      {fondUrl ? (
        <>
          <clipPath id="terrain-clip"><rect width={W} height={H} rx="8" /></clipPath>
          <image href={fondUrl} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" clipPath="url(#terrain-clip)" />
        </>
      ) : (
        <>
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
        </>
      )}

      {zones.map(z => {
        const x = (Number(z.x) || 0) / 100 * W, y = (Number(z.y) || 0) / 100 * H
        const w = (Number(z.largeur) || 0) / 100 * W, h = (Number(z.hauteur) || 0) / 100 * H
        return (
          <g key={z.id}>
            <rect x={x} y={y} width={w} height={h} fill={(z.couleur || '#4ade80') + 'cc'} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
            {z.label && <text x={x + w / 2} y={y + h / 2} fill="white" fontSize={Math.min(11, h * 0.35)} fontWeight="800" textAnchor="middle" dominantBaseline="middle">{z.label.toUpperCase()}</text>}
          </g>
        )
      })}
    </svg>
  )
}
