import { useColors } from '../../lib/theme'
import { styleCarte, styleCarteLiseree, styleChiffreHeros, CLASSE_CLIQUABLE } from '../../lib/identite'
import { TriangleAlert } from 'lucide-react'
import { police } from '../../tokens'
import Etiquette from './Etiquette'

// Carte de chiffre : une étiquette et un chiffre héros, rien d'autre.
// `unite` (« % », « € ») s'affiche plus petite, après une espace insécable.
// `liseree` : liseré couleur du club pour le chiffre clé de l'écran.
// `detail` : une ligne de contexte sous le chiffre ; `alerte` la met en évidence
// (icône de signalement + texte plein, jamais la couleur seule).
// `onClick` : la carte devient un bouton (focus visible via CLASSE_CLIQUABLE).
export default function CarteChiffre({ valeur, unite, etiquette, detail, alerte = false, liseree = false, taille = 40, onClick, style }) {
  const colors = useColors()
  const base = liseree ? styleCarteLiseree(colors) : styleCarte(colors)
  const contenu = (
    <>
      <Etiquette as="span" style={{ display: 'block' }}>{etiquette}</Etiquette>
      <span style={{ ...styleChiffreHeros(colors, taille), display: 'block', marginTop: '10px' }}>
        {valeur}
        {unite && <span style={{ fontSize: '0.55em', fontWeight: 600, marginLeft: '0.15em' }}>{'\u00A0'}{unite}</span>}
      </span>
      {detail && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontFamily: police.texte, fontSize: '13px', lineHeight: 1.3, color: alerte ? colors.text.primary : colors.text.secondary, fontWeight: alerte ? 600 : 400 }}>
          {alerte && <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" focusable="false" style={{ flexShrink: 0, color: colors.accent.amber }} />}
          {detail}
        </span>
      )}
    </>
  )
  if (!onClick) return <div style={{ ...base, ...style }}>{contenu}</div>
  return (
    <button type="button" onClick={onClick} className={CLASSE_CLIQUABLE}
      style={{ ...base, width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', ...style }}>
      {contenu}
    </button>
  )
}
