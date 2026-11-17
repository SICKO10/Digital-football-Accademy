import { useColors } from '../../lib/theme'
import { styleChamp, CLASSE_CHAMP } from '../../lib/identite'

// Liste déroulante de saison. `saisons` vient de saisonsAvecDonnees()
// (lib/saison.js) : [{ valeur, libelle, enCours }].
export default function SelecteurSaison({ saisons, valeur, onChange, style }) {
  const colors = useColors()
  return (
    <select
      value={valeur}
      onChange={e => onChange(e.target.value)}
      aria-label="Saison"
      className={CLASSE_CHAMP}
      style={{ ...styleChamp(colors), width: 'auto', fontWeight: 600, cursor: 'pointer', ...style }}
    >
      {saisons.map(s => (
        <option key={s.valeur} value={s.valeur}>
          Saison {s.libelle}{s.enCours ? ' (en cours)' : ''}
        </option>
      ))}
    </select>
  )
}
