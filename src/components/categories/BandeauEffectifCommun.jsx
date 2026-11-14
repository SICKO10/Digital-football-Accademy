import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'

// « Mon équipe » d'un éducateur dont la catégorie est en effectif commun
// (bloc 3 du chantier catégories) : rappelle que la liste est partagée et
// signale les doublons possibles. Rien n'est affiché en mode par équipe.
export default function BandeauEffectifCommun({ effectif }) {
  const colors = useColors()
  if (!effectif) return null
  const { categorie, nbJoueurs, fichesMasquees, doublons } = effectif
  const info = colors.accent.info
  const alerte = colors.accent.orange

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ padding: '12px 14px', borderRadius: '12px', background: info + alpha.subtle, border: `1px solid ${info}${alpha.light}` }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: colors.text.primary }}>
          Effectif commun {labelCategorie(categorie.nom)} · {nbJoueurs} joueur{nbJoueurs > 1 ? 's' : ''}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.secondary, lineHeight: 1.5 }}>
          Cette liste est partagée par les éducateurs de toutes les équipes {labelCategorie(categorie.nom)}. Un joueur que tu ajoutes est visible par eux, et inversement. Seul celui qui a ajouté un joueur, ou le club, peut le supprimer.
        </p>
      </div>
      {(doublons.length > 0 || fichesMasquees > 0) && (
        <div style={{ padding: '12px 14px', borderRadius: '12px', background: alerte + alpha.subtle, border: `1px solid ${alerte}${alpha.light}` }}>
          {doublons.length > 0 && (
            <p style={{ margin: 0, fontSize: '12px', color: colors.text.primary, lineHeight: 1.5 }}>
              <strong>Doublons possibles :</strong>{' '}
              {doublons.map(d => `${d.nom} (${d.nb} fiches)`).join(', ')}. Ces fiches n'ont pas toutes de compte relié : vérifie s'il s'agit du même joueur avant de convoquer.
            </p>
          )}
          {fichesMasquees > 0 && (
            <p style={{ margin: doublons.length > 0 ? '6px 0 0' : 0, fontSize: '12px', color: colors.text.secondary, lineHeight: 1.5 }}>
              {fichesMasquees === 1
                ? 'Un joueur a deux fiches reliées au même compte : une seule est affichée.'
                : `${fichesMasquees} fiches en double reliées au même compte : une seule par joueur est affichée.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
