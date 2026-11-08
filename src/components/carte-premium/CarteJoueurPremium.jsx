import { useId, useRef, useState } from 'react'
import logoDF from './logo-df.png'
import { useCadrageVisage } from '../../lib/cadrageVisage'

// Carte joueur premium « collection » : noir charbon, double liseré or, éclairage de
// stade. Composant de présentation autonome : aucune donnée, aucun thème, aucun appel
// réseau. Tout arrive par les paramètres.
//
// Paramètres
//   note, poste, nom, stats [{ cle, valeur }] (six) : texte affiché tel quel
//   photo      : URL d'un portrait (facultatif) ; sans photo, une silhouette neutre
//   drapeau    : élément React (facultatif) ; ecusson : élément React (facultatif)
//   fixe       : true = rendu sans effets (pas de 3D, pas de dégradé sur le texte),
//                pensé pour un export en image
//   largeur    : largeur en px (facultatif) ; sans elle la carte remplit son conteneur
//                (proportions 2:3, tous les textes suivent la largeur)

// Deux palettes : « vert » (identité Digital Football, par défaut) et « or ».
const THEMES = {
  vert: {
    texte: 'linear-gradient(180deg, #f2fff9 0%, #7dffc9 40%, #2ed892 72%, #a6ffd8 100%)', plat: '#5af0b0',
    cadre: ['#e6fff4', '#3ee8a0', '#0b8f60', '#8dffd0', '#14b57c'], halo: '#3ee8a0', ruban: ['#0a7a50', '#7dffc9', '#14b57c'],
    brillant: '#d9fff0', ombre: '62,232,160',
  },
  or: {
    texte: 'linear-gradient(180deg, #fff3b8 0%, #f1cf6b 38%, #c99a2e 70%, #f3d98a 100%)', plat: '#ecc968',
    cadre: ['#fff4bd', '#e9c25a', '#a8741a', '#f3d98a', '#b98a26'], halo: '#f1cf6b', ruban: ['#8a6513', '#f3d98a', '#b98a26'],
    brillant: '#fff2c2', ombre: '201,154,46',
  },
}
const POLICE = "'Barlow Condensed', 'Inter', sans-serif"

// Contour (repère 400 x 600) : moitié droite, puis miroir pour la gauche.
const DROITE = [
  ['M', 200, 8], ['C', 212, 8, 220, 19, 229, 24], ['C', 240, 30, 254, 18, 268, 23],
  ['L', 344, 62], ['Q', 380, 82, 386, 118], ['L', 386, 468], ['C', 386, 490, 377, 505, 362, 517],
  ['L', 246, 580], ['Q', 222, 597, 200, 597],
]
function contour() {
  const r = DROITE.map(([c, ...n]) => `${c}${n.join(' ')}`).join(' ')
  // miroir : on reparcourt les segments à l'envers avec x -> 400 - x
  const pts = []
  for (let i = DROITE.length - 1; i > 0; i--) {
    const [c, ...n] = DROITE[i]
    const prev = DROITE[i - 1]
    const fin = [prev[prev.length - 2], prev[prev.length - 1]]
    const m = (x) => 400 - x
    if (c === 'L') pts.push(`L${m(fin[0])} ${fin[1]}`)
    else if (c === 'Q') pts.push(`Q${m(n[0])} ${n[1]} ${m(fin[0])} ${fin[1]}`)
    else pts.push(`C${m(n[2])} ${n[3]} ${m(n[0])} ${n[1]} ${m(fin[0])} ${fin[1]}`)
  }
  return `${r} ${pts.join(' ')} Z`
}
const CONTOUR = contour()

const Icone = ({ type, c }) => {
  const p = { width: '100%', height: '100%', viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'VIT') return <svg {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill={c} stroke="none" /></svg>
  if (type === 'TIR') return <svg {...p}><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.6" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" /></svg>
  if (type === 'PAS') return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="m12 8 3.6 2.6-1.4 4.2H9.8l-1.4-4.2z" fill={c} /><path d="M12 8V3.2M15.6 10.6l4.6-1.4M14.2 14.8l2.8 3.9M9.8 14.8l-2.8 3.9M8.4 10.6 3.8 9.2" /></svg>
  if (type === 'DRI') return <svg {...p}><circle cx="14" cy="4.5" r="2.2" fill={c} stroke="none" /><path d="M13 8.5 9.5 12l3 2.5-1.5 5.5M13 8.5l3.5 3 3 .5M9.5 12 6 11" /><circle cx="5" cy="19.5" r="2" fill={c} stroke="none" /></svg>
  if (type === 'DEF') return <svg {...p}><path d="M12 2.5 19.5 5.5v6c0 4.7-3.2 8.5-7.5 10-4.3-1.5-7.5-5.3-7.5-10v-6z" /><path d="m8.8 12 2.5 2.5 4.2-5" /></svg>
  if (type === 'MAT') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M12 5v14" /><circle cx="12" cy="12" r="2.8" /></svg>
  if (type === 'MIN') return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 6.5V12l3.6 2.2" /></svg>
  if (type === 'PRE') return <svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4m-8 8 2.6 2.6L16 13" /></svg>
  if (type === 'NOT') return <svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={c} stroke="none" /></svg>
  return <svg {...p}><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></svg>
}

const Silhouette = ({ uid }) => (
  <g transform="translate(0 -44) translate(236 300) scale(1.1) translate(-236 -300)">
    {/* épaules et maillot, vus de dos */}
    <path d="M96 640 L112 440 Q126 346 196 322 Q236 308 278 322 Q348 346 362 440 L376 640 Z" fill={`url(#maillot${uid})`} />
    <path d="M278 322 Q348 346 362 440 L376 640" fill="none" stroke="#b7d1ff" strokeOpacity=".75" strokeWidth="2.6" />
    <path d="M196 322 Q126 346 112 440" fill="none" stroke="#7f9bd0" strokeOpacity=".35" strokeWidth="2" />
    <path d="M212 320 Q236 336 264 320 L268 308 Q238 320 208 308 Z" fill="#eef2f8" fillOpacity=".9" />
    <path d="M300 348 Q346 372 356 440" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="6" />
    <text x="236" y="430" textAnchor="middle" fontFamily={POLICE} fontWeight="800" fontSize="86" fill="#fff" fillOpacity=".12">10</text>
    {/* cou, oreille, tête, cheveux : tout en ombre, seul le liseré accroche la lumière */}
    <path d="M226 262 Q224 298 212 318 Q238 334 264 318 Q254 298 252 262 Z" fill="#191a20" />
    <ellipse cx="238" cy="224" rx="31" ry="41" fill="#16171c" />
    <ellipse cx="268" cy="238" rx="7" ry="11" fill="#1d1e25" />
    <path d="M204 224 Q198 168 238 164 Q284 162 278 220 Q272 196 240 194 Q212 196 204 224 Z" fill="#0d0e12" />
    <g fill="#0d0e12"><circle cx="214" cy="196" r="16" /><circle cx="238" cy="182" r="19" /><circle cx="262" cy="194" r="16" /><circle cx="226" cy="170" r="14" /><circle cx="252" cy="171" r="14" /></g>
    <path d="M268 180 Q294 204 278 252 Q272 266 262 268" fill="none" stroke="#b7d1ff" strokeOpacity=".75" strokeWidth="2.2" />
    <path d="M252 266 Q254 298 264 318" fill="none" stroke="#b7d1ff" strokeOpacity=".35" strokeWidth="1.6" />
  </g>
)

export default function CarteJoueurPremium({
  note, poste, nom, stats = [], photo, drapeau, ecusson, fixe = false, largeur, couleur, theme = 'vert',
}) {
  const uid = useId().replace(/:/g, '')
  const ref = useRef(null)
  const [reflet, setReflet] = useState({ x: 50, y: 30, actif: false })
  const T = THEMES[theme] || THEMES.vert
  // Cadrage automatique sur le visage (null tant que non détecté : cadrage par défaut)
  const cadre = useCadrageVisage(photo)
  const or = couleur || T.plat

  const bouger = (e) => {
    if (fixe || e.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transform = `perspective(1000px) rotateY(${(x - 0.5) * 12}deg) rotateX(${(0.5 - y) * 10}deg) scale(1.02)`
    setReflet({ x: x * 100, y: y * 100, actif: true })
  }
  const quitter = () => {
    if (ref.current) ref.current.style.transform = ''
    setReflet(r => ({ ...r, actif: false }))
  }

  // Unité de taille : 1 u = 1 % de la largeur de la carte.
  const unite = largeur ? `${largeur / 100}px` : '1cqw'
  const u = (n) => `calc(var(--u) * ${n})`
  const textePlat = fixe
  const texteOr = textePlat
    ? { color: or }
    : { backgroundImage: T.texte, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
  const penche = { display: 'inline-block', transform: 'skewX(-9deg)' }

  return (
    <div
      ref={ref}
      onPointerMove={bouger} onPointerLeave={quitter}
      style={{
        '--u': unite,
        width: largeur ? `${largeur}px` : '100%', maxWidth: largeur ? undefined : 380, aspectRatio: '2 / 3',
        containerType: largeur ? undefined : 'inline-size', position: 'relative', userSelect: 'none',
        transition: 'transform .25s ease-out, filter .25s ease-out',
        filter: fixe ? 'none' : `drop-shadow(0 ${reflet.actif ? 26 : 16}px ${reflet.actif ? 38 : 26}px rgba(${T.ombre},${reflet.actif ? 0.42 : 0.28}))`,
        fontFamily: POLICE,
      }}
    >
      <svg viewBox="0 0 400 600" width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          <linearGradient id={`or${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={T.cadre[0]} /><stop offset=".3" stopColor={T.cadre[1]} /><stop offset=".55" stopColor={T.cadre[2]} />
            <stop offset=".78" stopColor={T.cadre[3]} /><stop offset="1" stopColor={T.cadre[4]} />
          </linearGradient>
          <linearGradient id={`fond${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2026" /><stop offset=".5" stopColor="#121317" /><stop offset="1" stopColor="#08090b" />
          </linearGradient>
          <linearGradient id={`maillot${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34415e" /><stop offset="1" stopColor="#141a29" />
          </linearGradient>
          <radialGradient id={`stade${uid}`} cx="62%" cy="36%" r="55%">
            <stop offset="0" stopColor="#9db8e6" stopOpacity=".55" /><stop offset=".45" stopColor="#4d6590" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`bas${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050506" stopOpacity="0" /><stop offset=".28" stopColor="#050506" stopOpacity=".72" /><stop offset=".5" stopColor="#050506" stopOpacity=".92" /><stop offset="1" stopColor="#050506" stopOpacity=".97" />
          </linearGradient>
          <linearGradient id={`ruban${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={T.ruban[0]} stopOpacity="0" /><stop offset=".5" stopColor={T.ruban[1]} stopOpacity=".85" /><stop offset="1" stopColor={T.ruban[2]} stopOpacity=".2" />
          </linearGradient>
          <linearGradient id={`faisceau${uid}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`reflet${uid}`} cx={`${reflet.x}%`} cy={`${reflet.y}%`} r="55%">
            <stop offset="0" stopColor={T.brillant} stopOpacity={reflet.actif ? 0.34 : 0} /><stop offset="1" stopColor={T.brillant} stopOpacity="0" />
          </radialGradient>
          <pattern id={`diag${uid}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="#fff" strokeOpacity=".045" strokeWidth="1.2" />
          </pattern>
          <filter id={`flou${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id={`halo${uid}`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2" /></filter>
          <clipPath id={`clip${uid}`}><path d={CONTOUR} transform="translate(200 300) scale(.972 .978) translate(-200 -300)" /></clipPath>
          {/* Portrait : fondu en ellipse sur tous les bords (aucun bord de photo visible) */}
          <radialGradient id={`m${uid}`} cx=".5" cy=".4" r=".56"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#fff" /><stop offset=".82" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#000" /></radialGradient>
          <mask id={`fondu${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="600">
            <rect x="30" y="70" width="350" height="330" fill={`url(#m${uid})`} />
          </mask>
          {/* Étalonnage : désaturé, contrasté, un peu assombri pour s'accorder au décor de nuit */}
          <filter id={`grade${uid}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values=".62" />
            <feComponentTransfer><feFuncR type="linear" slope="1.12" intercept="-.1" /><feFuncG type="linear" slope="1.12" intercept="-.1" /><feFuncB type="linear" slope="1.12" intercept="-.1" /></feComponentTransfer>
          </filter>
          <linearGradient id={`teinte${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c2a22" /><stop offset="1" stopColor="#03100c" /></linearGradient>
        </defs>

        {/* Double liseré or : épais métallique, vide sombre, fin intérieur */}
        {!fixe && <path d={CONTOUR} fill="none" stroke={T.halo} strokeOpacity=".7" strokeWidth="6" filter={`url(#halo${uid})`} />}
        <path d={CONTOUR} fill={`url(#or${uid})`} />
        <path d={CONTOUR} transform="translate(200 300) scale(.972 .978) translate(-200 -300)" fill={`url(#fond${uid})`} />

        <g clipPath={`url(#clip${uid})`}>
          <rect width="400" height="600" fill={`url(#diag${uid})`} />
          <rect width="400" height="600" fill={`url(#stade${uid})`} />
          {/* faisceaux et projecteurs */}
          <polygon points="400,90 270,300 372,320" fill={`url(#faisceau${uid})`} opacity=".5" />
          <polygon points="400,40 300,300 340,300" fill={`url(#faisceau${uid})`} opacity=".35" />
          {[[318, 138], [334, 136], [350, 134], [366, 132], [322, 154], [338, 152], [354, 150], [370, 148]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4.2" fill="#fff" filter={fixe ? undefined : `url(#flou${uid})`} opacity=".95" />
          ))}
          
          {/* joueur : photo fondue, ou silhouette neutre */}
          {photo ? (
            <g mask={`url(#fondu${uid})`}>
              <image href={photo} crossOrigin="anonymous" {...(cadre ? { x: cadre.x, y: cadre.y, width: cadre.largeur, height: cadre.hauteur, preserveAspectRatio: 'none' } : { x: 30, y: 70, width: 350, height: 330, preserveAspectRatio: 'xMidYMin slice' })} filter={fixe ? undefined : `url(#grade${uid})`} />
              <rect x="30" y="70" width="350" height="330" fill={`url(#teinte${uid})`} opacity=".42" style={{ mixBlendMode: 'multiply' }} />
            </g>
          ) : (
            <Silhouette uid={uid} />
          )}

          {/* dégradé sombre du bas + rubans dorés */}
          <rect x="0" y="294" width="400" height="306" fill={`url(#bas${uid})`} />
          <path d="M0 470 C 80 478 150 520 214 600 L 150 600 C 110 548 60 516 0 506 Z" fill={`url(#ruban${uid})`} opacity=".7" />
          <path d="M0 470 C 80 478 150 520 214 600 L 150 600 C 110 548 60 516 0 506 Z" fill={`url(#ruban${uid})`} opacity=".7" transform="translate(400 0) scale(-1 1)" />
          <path d="M400 232 C 350 250 330 280 300 330 L 322 322 C 350 286 372 262 400 252 Z" fill={`url(#ruban${uid})`} opacity=".8" />
          {!fixe && <rect width="400" height="600" fill={`url(#reflet${uid})`} style={{ mixBlendMode: 'overlay' }} />}
        </g>

        {/* liseré fin intérieur */}
        <path d={CONTOUR} transform="translate(200 300) scale(.945 .95) translate(-200 -300)" fill="none" stroke={`url(#or${uid})`} strokeWidth="1.8" />
        <path d={CONTOUR} fill="none" stroke={T.brillant} strokeOpacity=".55" strokeWidth="1" />
      </svg>

      {/* ── Textes et pictos (HTML : bien rendus à l'export) ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* logo Digital Football */}
        <img src={logoDF} alt="Digital Football" style={{ position: 'absolute', top: '6.4%', left: '50%', width: u(27), transform: 'translateX(-50%)', mixBlendMode: fixe ? 'normal' : 'screen',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent), linear-gradient(180deg, transparent, #000 16%, #000 84%, transparent)', WebkitMaskComposite: 'source-in', maskImage: 'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent), linear-gradient(180deg, transparent, #000 16%, #000 84%, transparent)', maskComposite: 'intersect' }} />

        {/* note, poste, drapeau, écusson */}
        <div style={{ position: 'absolute', top: '13%', left: u(8.5), width: u(20), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ ...penche, ...texteOr, fontWeight: 800, fontSize: u(17.5), lineHeight: 0.92, textShadow: textePlat ? '0 2px 8px rgba(0,0,0,.6)' : 'none' }}>{note}</span>
          <span style={{ fontWeight: 600, fontSize: u(6.6), letterSpacing: '0.06em', color: '#efe3c4', marginTop: u(0.6), textTransform: 'uppercase' }}>{poste}</span>
          <span style={{ width: u(17), height: 2, background: `linear-gradient(90deg, transparent, ${or}, transparent)`, margin: `${u(2.2)} 0` }} />
          {drapeau !== false && <span style={{ width: u(12.5), height: u(8.4), display: 'block', boxShadow: '0 2px 8px rgba(0,0,0,.5)' }}>
            {drapeau || (
              <svg viewBox="0 0 3 2" width="100%" height="100%" preserveAspectRatio="none"><rect width="1" height="2" fill="#1f3f9e" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#e0192e" /></svg>
            )}
          </span>}
          <span style={{ width: u(12.5), height: u(14), marginTop: drapeau === false ? 0 : u(3.4), display: 'block' }}>
            {ecusson || (
              <svg viewBox="0 0 60 70" width="100%" height="100%">
                <path d="M30 3 54 11v22c0 17-10 28-24 34C16 61 6 50 6 33V11z" fill="#0d0e11" stroke={or} strokeWidth="2.6" />
                <text x="30" y="26" textAnchor="middle" fontFamily={POLICE} fontWeight="800" fontSize="11" fill="#efe3c4">LOGO</text>
                <text x="30" y="38" textAnchor="middle" fontFamily={POLICE} fontWeight="800" fontSize="11" fill="#efe3c4">CLUB</text>
                <circle cx="30" cy="51" r="7" fill="none" stroke={or} strokeWidth="1.8" /><circle cx="30" cy="51" r="2.4" fill={or} />
              </svg>
            )}
          </span>
        </div>

        {/* nom */}
        <div style={{ position: 'absolute', top: '55.2%', left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ ...penche, ...texteOr, fontWeight: 800, fontSize: u(10.4), lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: textePlat ? '0 2px 8px rgba(0,0,0,.6)' : 'none' }}>{nom}</span>
        </div>
        <div style={{ position: 'absolute', top: '63.2%', left: '10%', right: '10%', height: 2, background: `linear-gradient(90deg, transparent, ${or} 18%, ${T.brillant} 50%, ${or} 82%, transparent)`, boxShadow: fixe ? 'none' : `0 0 10px ${or}` }} />

        {/* six caractéristiques */}
        <div style={{ position: 'absolute', top: '66%', left: '9%', right: '9%', display: 'grid', gridTemplateColumns: '1fr 1px 1fr', columnGap: u(4) }}>
          {[stats.slice(0, 3), null, stats.slice(3, 6)].map((col, i) => col === null
            ? <span key="sep" style={{ background: `linear-gradient(180deg, transparent, ${or}88, transparent)` }} />
            : (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                {col.map((s, j) => (
                  <div key={s.cle} style={{ display: 'flex', alignItems: 'center', gap: u(2.2), height: u(8.6), borderTop: j ? `1px solid ${or}2e` : 'none' }}>
                    <span style={{ width: u(5.6), height: u(5.6), flexShrink: 0 }}><Icone type={s.icone || s.cle} c={or} /></span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: u(5), letterSpacing: '0.03em', color: '#eceff4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }}>{s.cle}</span>
                    <span style={{ ...penche, ...texteOr, fontWeight: 800, fontSize: u(7.6) }}>{s.valeur}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* terrain en bas */}
        <svg viewBox="0 0 60 38" style={{ position: 'absolute', bottom: '5.2%', left: '50%', width: u(14), transform: 'translateX(-50%)' }} fill="none" stroke={or} strokeWidth="1.6">
          <rect x="2" y="2" width="56" height="34" /><path d="M30 2v34" /><circle cx="30" cy="19" r="5.4" /><rect x="2" y="11" width="9" height="16" /><rect x="49" y="11" width="9" height="16" />
        </svg>
      </div>
    </div>
  )
}
