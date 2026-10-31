import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'
import { etatSaisonJoueur, derniereAffiliationArchivee, messageFinSaison } from '../../lib/finSaisonJoueur'
import Carte from '../joueur/Carte'
import { IconTrophy } from '../icones'

// Encadré affiché quand le coach du joueur a clôturé la saison et qu'aucun nouvel
// éducateur n'a encore intégré le joueur. S'appuie sur l'affiliation archivée,
// pas sur la date : il disparaît dès qu'une nouvelle affiliation est acceptée.
export default function MessageFinSaisonJoueur({ affiliations, isMobile, onVoirSaisons }) {
  const colors = useColors()
  if (etatSaisonJoueur(affiliations) !== 'terminee') return null
  const derniere = derniereAffiliationArchivee(affiliations)
  const pe = derniere?.profil_educateur
  const coach = [pe?.prenom, pe?.nom].filter(Boolean).join(' ')
  return (
    <Carte accent={colors.accent.amber} isMobile={isMobile} style={{ marginBottom: spacing['2xl'] }}>
      <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start' }}>
        <span style={{ color: colors.accent.amber, flexShrink: 0, marginTop: 2 }}><IconTrophy size={22} /></span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: fontSize.xl }}>Saison terminée</p>
          <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.md, color: colors.text.muted, lineHeight: 1.5 }}>
            {messageFinSaison({ coach, saison: derniere?.saison })}
          </p>
          {onVoirSaisons && (
            <button onClick={onVoirSaisons}
              style={{ marginTop: spacing.lg, background: 'none', border: 'none', padding: 0, color: colors.accent.green, fontWeight: 700, fontSize: fontSize.md, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Voir mes saisons
            </button>
          )}
        </div>
      </div>
    </Carte>
  )
}
