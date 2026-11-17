import { useColors } from '../../lib/theme'
import { alpha, fontSize, forme, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Bloc « Ma progression » de l'accueil : un tableau d'affichage de 3 ou 4
// chiffres en Barlow Condensed, puis les 5 derniers résultats de l'équipe en
// pastilles V / N / D. Tout est calculé par le parent (aucune requête ici).
//
// `chiffres` : [{ valeur, libelle, couleur? }], déjà filtré : un chiffre sans
// donnée n'est pas passé, la carte n'affiche jamais un zéro menteur.
// `resultats` : [{ code: 'V' | 'N' | 'D', titre }], du plus ancien au plus récent.
// Sans aucun chiffre ni résultat : une phrase + une action.

const Pastille = ({ code, titre }) => {
  const colors = useColors()
  const couleur = code === 'V' ? colors.accent.green : code === 'D' ? colors.accent.red : colors.accent.amber
  return (
    <span
      title={titre}
      className="dj-chiffre"
      style={{
        width: 32, height: 32, boxSizing: 'border-box', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: forme.rayonPastille, fontSize: fontSize['4xl'],
        background: couleur + alpha.subtle, border: `1px solid ${couleur + alpha.light}`, color: couleur,
      }}
    >
      {code}
    </span>
  )
}

export default function ProgressionAccueil({
  chiffres = [], resultats = [], onVoirStats, onSaisir, readOnly = false, niveau = 'standard', isMobile = false, style,
}) {
  const colors = useColors()
  const vide = chiffres.length === 0 && resultats.length === 0

  const lien = (texte, onClick) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        color: colors.accent.green, fontWeight: 700, fontSize: fontSize['2xl'], fontFamily: 'Barlow, sans-serif',
      }}
    >
      {texte}
    </button>
  )

  return (
    <Carte niveau={niveau} isMobile={isMobile} style={style}>
      <TitreSection>Ma progression</TitreSection>

      {vide ? (
        <>
          <p style={{ margin: 0, fontSize: fontSize['3xl'], color: colors.text.secondary }}>
            Ta progression apparaîtra ici dès ton premier match noté ou ta première séance suivie.
          </p>
          {!readOnly && onSaisir && <div style={{ marginTop: spacing.lg }}>{lien('Saisir mon premier match', onSaisir)}</div>}
        </>
      ) : (
        <>
          {chiffres.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chiffres.length}, minmax(0, 1fr))` }}>
              {chiffres.map((c, i) => (
                <div
                  key={c.libelle}
                  style={{
                    textAlign: 'center', minWidth: 0, padding: `0 ${spacing.sm}`,
                    borderLeft: i === 0 ? 'none' : `1px solid ${colors.border.subtle}`,
                  }}
                >
                  <div className="dj-chiffre" style={{ fontSize: isMobile ? 36 : 44, lineHeight: 1, color: c.couleur || colors.text.primary }}>
                    {c.valeur}
                  </div>
                  <div style={{ marginTop: spacing.sm, fontSize: fontSize.md, fontWeight: 600, color: colors.text.faint }}>
                    {c.libelle}
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultats.length > 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap',
                marginTop: chiffres.length > 0 ? spacing['2xl'] : 0,
                paddingTop: chiffres.length > 0 ? spacing['2xl'] : 0,
                borderTop: chiffres.length > 0 ? `1px solid ${colors.border.subtle}` : 'none',
              }}
            >
              <span style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginRight: spacing.sm }}>
                {resultats.length > 1 ? `${resultats.length} derniers résultats` : 'Dernier résultat'}
              </span>
              {resultats.map((r, i) => <Pastille key={i} code={r.code} titre={r.titre} />)}
            </div>
          )}

          {onVoirStats && <div style={{ marginTop: spacing['2xl'] }}>{lien('Mes statistiques →', onVoirStats)}</div>}
        </>
      )}
    </Carte>
  )
}
