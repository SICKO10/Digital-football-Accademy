import { useColors } from '../../lib/theme'
import { styleBoutonPrincipal, styleBoutonSecondaire, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE } from '../../lib/identite'
import { Pastille } from '../categories/UiCategories'
import { Star } from 'lucide-react'

// Briques communes aux écrans Finance (budget prévisionnel, suivi réel, audience,
// sponsors). Le style vient du kit d'identité (src/lib/identite.js).

// Groupe de choix : boutons rectangulaires (coins 6 px). Le choix actif est plein à la
// couleur du club, les autres au trait. Remplace les « puces » arrondies de période,
// de saison et d'équipe. `role` : « tablist » pour un changement de vue, sinon « radiogroup ».
export function GroupeChoix({ choix, valeur, onChoisir, libelle, role = 'tablist', style }) {
  const colors = useColors()
  const estOnglet = role === 'tablist'
  return (
    <div role={role} aria-label={libelle} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', ...style }}>
      {choix.map(c => {
        const actif = valeur === c.id
        const base = actif ? styleBoutonPrincipal(colors) : styleBoutonSecondaire(colors)
        return (
          <button key={c.id} type="button" role={estOnglet ? 'tab' : 'radio'} {...(estOnglet ? { 'aria-selected': actif } : { 'aria-checked': actif })}
            className={actif ? CLASSE_BOUTON : CLASSE_BOUTON_SECONDAIRE} onClick={() => onChoisir(c.id)}
            style={{ ...base, minHeight: '38px', padding: '0 14px', fontWeight: actif ? 700 : 600 }}>
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

// Barre fine d'un ratio : rectangle de 6 px, piste neutre. La valeur est toujours
// écrite à côté (jamais la barre seule).
export function Barre({ part, couleur, hauteur = 6 }) {
  const colors = useColors()
  const p = Math.max(0, Math.min(100, Number(part) || 0))
  return (
    <div aria-hidden="true" style={{ height: `${hauteur}px`, background: colors.border.default, borderRadius: '1px', overflow: 'hidden' }}>
      <div style={{ width: `${p}%`, height: '100%', background: couleur, borderRadius: '1px' }} />
    </div>
  )
}

// Statut d'un solde : icône + texte plein dans un rectangle à coins 4 px.
export function Statut({ icone: Ico, couleur, children }) {
  return (
    <Pastille style={{ gap: '6px' }}>
      <span style={{ display: 'inline-flex', color: couleur }}><Ico size={14} strokeWidth={2.4} aria-hidden="true" focusable="false" /></span>
      {children}
    </Pastille>
  )
}

// Note sur 5 en étoiles au trait (pleines = note). La note est aussi lisible par les
// lecteurs d'écran ; à écrire en chiffres à côté quand la place le permet.
export function Etoiles({ note, taille = 16 }) {
  const colors = useColors()
  const n = Math.max(0, Math.min(5, Math.round(Number(note) || 0)))
  return (
    <span role="img" aria-label={`Note ${n} sur 5`} style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={taille} strokeWidth={2} aria-hidden="true" focusable="false"
          style={{ color: i <= n ? colors.accent.amber : colors.text.dim, fill: i <= n ? colors.accent.amber : 'none' }} />
      ))}
    </span>
  )
}
