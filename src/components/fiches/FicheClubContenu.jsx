import { useId, useLayoutEffect, useRef } from 'react'
import { PHASES_JEU } from '../../constants/phasesJeu'
import { lireHex, contraste } from '../../lib/paletteClub'

// « Fiche club » : copie fidèle du modèle papier AS Cannes (A4 paysage, recto verso,
// 3 procédés par face), aux couleurs et au logo du club. Une .fc-page = une feuille A4
// paysage exacte (1500 × 1060 px, comme .bmf-page) ; recto et verso répètent l'en-tête
// (logo, date, effectif, thème, phases, jour) et portent les procédés 1-3 puis 4-6.
// Les styles sont dans index.css (classes .fc-*). La couleur du club passe par la
// variable CSS --fc ; sans club : rouge du modèle et logo Digital Football.

const ROUGE_MODELE = '#B24B5B'
const LOGO_DEFAUT = '/icons/icon-192.png'
const COLONNES = [['GB', 'GB'], ['DEF', 'DEF'], ['MIL', 'MIL'], ['ATT', 'ATT']]
const JOURS = ['J+1', 'J+2', 'J+3', 'J-3', 'J-2', 'J-1']
const LIGNES_MIN = 5

function formaterDate(d) {
  if (!d) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}

// Texte posé sur la couleur du club : blanc ou encre selon le contraste.
function texteSurCouleur(hex) {
  return contraste(hex, '#FFFFFF') >= contraste(hex, '#16161A') ? '#FFFFFF' : '#16161A'
}

// Terrain entier vertical, quadrillé, comme sur le papier : lignes, surfaces,
// rond central, points de penalty et buts hachurés hors du cadre.
function TerrainVierge() {
  const idHachure = `fc-hachure-${useId().replace(/:/g, '')}`
  const L = 340, H = 500, y0 = 10, y1 = H - 10, milieu = H / 2
  const grille = []
  for (let x = 20; x < L; x += 20) grille.push(<line key={`v${x}`} x1={x} y1={y0} x2={x} y2={y1} />)
  for (let y = y0 + 20; y < y1; y += 20) grille.push(<line key={`h${y}`} x1="0" y1={y} x2={L} y2={y} />)
  const surface = (haut) => {
    const sens = haut ? 1 : -1
    const base = haut ? y0 : y1
    return (
      <g>
        <rect x={L / 2 - 85} y={haut ? base : base - 78} width="170" height="78" />
        <rect x={L / 2 - 35} y={haut ? base : base - 28} width="70" height="28" />
        <circle cx={L / 2} cy={base + sens * 52} r="1.8" fill="#333" stroke="none" />
        <path d={`M ${L / 2 - 30} ${base + sens * 78} A 32 32 0 0 ${haut ? 0 : 1} ${L / 2 + 30} ${base + sens * 78}`} />
        <rect x={L / 2 - 14} y={haut ? base - 9 : base} width="28" height="9" fill={`url(#${idHachure})`} />
      </g>
    )
  }
  return (
    <svg className="fc-terrain" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={idHachure} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#333" strokeWidth="2" />
        </pattern>
      </defs>
      <g stroke="#d6d6d6" strokeWidth="0.8">{grille}</g>
      <g fill="none" stroke="#333" strokeWidth="1.6">
        <rect x="1" y={y0} width={L - 2} height={y1 - y0} />
        <line x1="1" y1={milieu} x2={L - 1} y2={milieu} />
        <circle cx={L / 2} cy={milieu} r="38" />
        <circle cx={L / 2} cy={milieu} r="1.8" fill="#333" stroke="none" />
        {surface(true)}
        {surface(false)}
      </g>
    </svg>
  )
}

// Carré de texte qui réduit sa police jusqu'à ce que tout tienne, sans rien couper.
function TexteAjuste({ className, signature, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ajuster = () => {
      if (!el.clientHeight) return
      let taille = 15
      el.style.fontSize = `${taille}px`
      while (el.scrollHeight > el.clientHeight + 1 && taille > 6) {
        taille -= 0.5
        el.style.fontSize = `${taille}px`
      }
    }
    ajuster()
    if (typeof ResizeObserver === 'undefined') return undefined
    const obs = new ResizeObserver(ajuster)
    obs.observe(el)
    return () => obs.disconnect()
  }, [signature])
  return <div ref={ref} className={className}>{children}</div>
}

function Rubrique({ titre, texte }) {
  if (!texte || !String(texte).trim()) return null
  return <div className="fc-rubrique"><b>{titre}</b><span>{texte}</span></div>
}

function Face({ numeros, face, fiche, logo, joueursParPoste, nonRenseignes }) {
  const nbLignes = Math.max(LIGNES_MIN, ...COLONNES.map(([cle]) => (joueursParPoste?.[cle] || []).length))
  const phasesCochees = new Set(fiche.phases_club || [])
  const jourCoche = fiche.jour_match || ''
  return (
    <div className="fc-page">
      <div className="fc-haut">
        <div className="fc-identite">
          <div className="fc-logo"><img src={logo} alt="" /></div>
          <div className="fc-ligne-id"><b>Date :</b> {formaterDate(fiche.date) || '..../..../.........'}</div>
          <div className="fc-ligne-id"><b>Effectif :</b> {fiche.effectif_texte || '...... + .... GB'}</div>
        </div>
        <table className="fc-effectif">
          <thead>
            <tr>{COLONNES.map(([cle, lib]) => <th key={cle}>{lib}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: nbLignes }, (_, i) => (
              <tr key={i} style={{ height: `${Math.min(28, Math.floor(140 / nbLignes))}px` }}>
                {COLONNES.map(([cle]) => <td key={cle}>{joueursParPoste?.[cle]?.[i] || ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nonRenseignes?.length > 0 && (
        <div className="fc-non-renseignes">Poste non renseigné : {nonRenseignes.join(', ')}</div>
      )}

      <div className="fc-corps">
        <div className="fc-gauche">
          <div className="fc-ligne-a">
            <div className="fc-etiquette fc-etiquette-couleur fc-etiquette-jour">JOUR</div>
            {JOURS.map(j => (
              <div key={j} className={`fc-jour${jourCoche === j ? ' fc-jour-coche' : ''}`}>{j}</div>
            ))}
          </div>
          <div className="fc-ligne-b">
            <div className="fc-etiquette fc-etiquette-couleur fc-etiquette-dominante">Dominante athlétique</div>
            <div className="fc-case-texte">{fiche.dominante_athletique || ''}</div>
          </div>
        </div>
        <div className="fc-droite">
          <div className="fc-ligne-a">
            <div className="fc-etiquette fc-etiquette-grise">Phase de jeu</div>
            {PHASES_JEU.map(p => (
              <div key={p.cle} className={`fc-phase${phasesCochees.has(p.cle) ? ' fc-phase-cochee' : ''}`}>{p.court}</div>
            ))}
          </div>
          <div className="fc-ligne-theme"><b>Thème :</b> {fiche.principe_jeu || fiche.theme || ''}</div>
        </div>
      </div>

      <div className="fc-bas">
        <div className="fc-strip">
          {[0, 1, 2].map(k => {
            const p = (fiche.procedes || [])[numeros[k] - 1] || {}
            const entete = [p.titre, [p.duree && `${p.duree} min`, p.nb_joueurs && `${p.nb_joueurs} joueurs`].filter(Boolean).join(' · ')].filter(Boolean)
            return (
            <div className="fc-strip-groupe" key={k}>
              <TexteAjuste className="fc-carre-gris" signature={`${p.titre}|${p.duree}|${p.nb_joueurs}|${p.organisation}|${p.criteres_realisation}`}>
                {entete.length > 0 && <div className="fc-entete-procede">{entete.map((e, j) => <span key={j}>{e}</span>)}</div>}
                <Rubrique titre="Organisation" texte={p.organisation} />
                <Rubrique titre="Critères de réalisation" texte={p.criteres_realisation} />
              </TexteAjuste>
              <div className="fc-recup"><span>Récupération</span><div className="fc-recup-case">{fiche[`recup_${face * 3 + k + 1}`] || ''}</div></div>
            </div>
            )
          })}
          <div className="fc-temps">
            <div className="fc-temps-cellule">Tps effectif</div>
            <div className="fc-temps-valeur">{fiche[`tps_effectif_${face ? 'verso' : 'recto'}`] || ''}</div>
            <div className="fc-temps-cellule">Tps total</div>
            <div className="fc-temps-valeur">{fiche[`tps_total_${face ? 'verso' : 'recto'}`] || ''}</div>
          </div>
        </div>
        <div className="fc-procedes">
          {numeros.map(n => {
            const p = (fiche.procedes || [])[n - 1] || {}
            return (
            <div className="fc-procede" key={n}>
              <div className="fc-terrain-cadre">
                {p.schema_png ? <img className="fc-schema" src={p.schema_png} alt={`Schéma du procédé ${n}`} /> : <TerrainVierge />}
                <span className="fc-numero">{n}</span>
              </div>
              <TexteAjuste className="fc-carre-blanc" signature={`${p.consignes}|${p.variables}`}>
                <Rubrique titre="Consignes" texte={p.consignes} />
                <Rubrique titre="Variantes" texte={p.variables} />
              </TexteAjuste>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function FicheClubContenu({ fiche, logo, couleur, joueursParPoste, nonRenseignes }) {
  const hex = lireHex(couleur) ? couleur : ROUGE_MODELE
  const style = { '--fc': hex, '--fc-on': texteSurCouleur(hex) }
  const logoAffiche = logo || LOGO_DEFAUT
  return (
    <div className="fc-doc" style={style}>
      <Face numeros={[1, 2, 3]} face={0} fiche={fiche} logo={logoAffiche} joueursParPoste={joueursParPoste} nonRenseignes={nonRenseignes} />
      <Face numeros={[4, 5, 6]} face={1} fiche={fiche} logo={logoAffiche} joueursParPoste={joueursParPoste} nonRenseignes={nonRenseignes} />
    </div>
  )
}
