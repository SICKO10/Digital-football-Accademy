import { useColors } from '../../lib/theme'
import { radius } from '../../tokens'

// Liste déroulante de saison. `saisons` vient de saisonsAvecDonnees()
// (lib/saison.js) : [{ valeur, libelle, enCours }].
export default function SelecteurSaison({ saisons, valeur, onChange, style }) {
  const colors = useColors()
  return (
    <select
      value={valeur}
      onChange={e => onChange(e.target.value)}
      aria-label="Saison"
      style={{
        background: colors.background.surface,
        color: colors.text.primary,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.lg,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        ...style,
      }}
    >
      {saisons.map(s => (
        <option key={s.valeur} value={s.valeur}>
          Saison {s.libelle}{s.enCours ? ' (en cours)' : ''}
        </option>
      ))}
    </select>
  )
}
