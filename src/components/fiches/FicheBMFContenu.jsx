import { useLayoutEffect, useRef } from 'react'

// Reproduction à l'identique de la fiche de séance BMF fédérale (modèle FFF
// fourni par l'utilisateur) : A4 paysage, en-tête Séance n° / Phase de jeu /
// Catégorie / Effectif / Durée / Date + grand cadre à droite, puis 3 colonnes
// numérotées (Surface, Séquence, schéma, Objectif, But(s), Consignes/
// Variables, Gestion des rotations, Comportements attendus, Critères de
// réussite). Chaque .bmf-page a la taille exacte d'une page A4 paysage
// (1500 × 1060 px, cf. index.css) et est capturée seule par
// genererPdfDepuisElement — rien ne peut déborder sur une page suivante :
// un texte trop long pour sa case voit sa police réduite (TexteAjuste).
// Les champs propres à ce gabarit (objectif, sequence, gestion_rotations)
// vivent dans le JSON des procédés ; surface, comportements_attendus et
// criteres_reussite sont partagés avec le gabarit BEF.

const RUBRIQUES = [
  ['OBJECTIF', 'objectif', 71],
  ['BUT(S)', 'but', 67],
  ['CONSIGNES/VARIABLES', 'consignes_variables', 133],
  ['GESTION DES ROTATIONS', 'gestion_rotations', 53],
  ['COMPORTEMENTS ATTENDUS', 'comportements_attendus', 71],
  ['CRITERES DE REUSSITE', 'criteres_reussite', null],
]

// Réduit la police jusqu'à ce que le texte tienne dans sa case (hauteur fixe
// du gabarit), sans jamais descendre sous un minimum lisible à l'impression.
function TexteAjuste({ texte, taille = 12, min = 7, className, style }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let t = taille
    el.style.fontSize = `${t}px`
    while (t > min && el.scrollHeight > el.clientHeight + 1) {
      t -= 0.5
      el.style.fontSize = `${t}px`
    }
  }, [texte, taille, min])
  return <div ref={ref} className={className} style={style}>{texte}</div>
}

function formaterDate(d) {
  if (!d) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}

function valeurRubrique(p, cle) {
  if (cle === 'consignes_variables') return [p.consignes, p.variables].filter(v => v && String(v).trim()).join('\n')
  return p[cle] || ''
}

function ColonneBMF({ p, numero }) {
  return (
    <div className="bmf-col">
      <div className="bmf-col-head">
        <div className="bmf-num">{numero}</div>
        <TexteAjuste className="bmf-col-cell bmf-col-titre" texte={p.titre || ''} taille={11} min={7} />
        <div className="bmf-col-cell bmf-col-label">Surface</div>
        <TexteAjuste className="bmf-col-cell bmf-col-val" texte={p.surface || ''} taille={10} min={6} />
        <div className="bmf-col-cell bmf-col-label">Séquence</div>
        <TexteAjuste className="bmf-col-cell bmf-col-val" texte={p.sequence || ''} taille={10} min={6} />
      </div>
      <div className="bmf-schema">
        {p.schema_png && <img src={p.schema_png} alt="" />}
      </div>
      {RUBRIQUES.map(([label, cle, hauteur]) => (
        <div key={cle} className={hauteur ? 'bmf-rubrique' : 'bmf-rubrique bmf-rubrique-fin'}>
          <div className="bmf-bande">{label}</div>
          <TexteAjuste className="bmf-texte" texte={valeurRubrique(p, cle)} style={hauteur ? { height: hauteur } : undefined} />
        </div>
      ))}
    </div>
  )
}

export default function FicheBMFContenu({ fiche, categorieLabel, logo }) {
  const procedes = fiche.procedes || []
  const pages = []
  for (let i = 0; i < procedes.length; i += 3) pages.push(procedes.slice(i, i + 3))
  if (pages.length === 0) pages.push([])

  return (
    <div className="bmf-doc">
      {pages.map((procedesPage, pageIndex) => (
        <div className="bmf-page" key={pageIndex}>
          <div className="bmf-entete">
            <div className="bmf-logo">{logo && <img src={logo} alt="" />}</div>
            <div className="bmf-table">
              <div className="bmf-cell bmf-label" style={{ gridArea: '1 / 1' }}>Séance n°</div>
              <div className="bmf-cell" style={{ gridArea: '1 / 2' }}>{fiche.numero_seance || ''}</div>
              <div className="bmf-cell bmf-label bmf-label-petit" style={{ gridArea: '1 / 3' }}>Phase de jeu</div>
              <div className="bmf-cell bmf-cell-gauche" style={{ gridArea: '1 / 4 / 2 / 9' }}>{fiche.phase_jeu || ''}</div>
              <div className="bmf-cell bmf-label" style={{ gridArea: '2 / 1' }}>Catégorie</div>
              <div className="bmf-cell" style={{ gridArea: '2 / 2' }}>{fiche.categorie_age || categorieLabel || ''}</div>
              <div className="bmf-cell bmf-label" style={{ gridArea: '2 / 3' }}>Effectif</div>
              <div className="bmf-cell" style={{ gridArea: '2 / 4' }}>{fiche.nb_joueurs || ''}</div>
              <div className="bmf-cell bmf-label" style={{ gridArea: '2 / 5' }}>Durée</div>
              <div className="bmf-cell" style={{ gridArea: '2 / 6' }}>{fiche.duree_totale || ''}</div>
              <div className="bmf-cell bmf-label" style={{ gridArea: '2 / 7' }}>Date</div>
              <div className="bmf-cell" style={{ gridArea: '2 / 8' }}>{formaterDate(fiche.date)}</div>
            </div>
            <TexteAjuste className="bmf-cadre" taille={13} min={8}
              texte={[fiche.principe_jeu || fiche.theme, fiche.objectif_general].filter(Boolean).join('\n')} />
          </div>
          <div className="bmf-colonnes">
            {[0, 1, 2].map(k => (
              <ColonneBMF key={k} p={procedesPage[k] || {}} numero={pageIndex * 3 + k + 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
