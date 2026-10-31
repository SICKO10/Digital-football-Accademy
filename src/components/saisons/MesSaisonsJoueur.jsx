import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'
import { saisonActuelle, libelleSaison } from '../../lib/saison'
import Carte from '../joueur/Carte'
import TitreSection from '../joueur/TitreSection'
import HistoriqueSaisons from './HistoriqueSaisons'

// Sous-rubrique « Mes saisons » de Mon équipe : la saison en cours en premier
// (ses chiffres restent dans « Mes stats »), puis les saisons archivées.
// Tant qu'aucune n'est archivée, HistoriqueSaisons affiche l'état vide soigné.
export default function MesSaisonsJoueur({ joueurId, isMobile }) {
  const colors = useColors()
  return (
    <div style={{ marginTop: spacing['5xl'] }}>
      <TitreSection>Mes saisons</TitreSection>
      <Carte isMobile={isMobile} style={{ marginBottom: spacing.xl, padding: `${spacing.xl} ${spacing['2xl']}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: fontSize['2xl'] }}>Saison {libelleSaison(saisonActuelle())}</p>
          <span style={{ fontSize: fontSize.base, fontWeight: 700, color: colors.accent.green, border: `1px solid ${colors.accent.green}`, borderRadius: 20, padding: '2px 10px' }}>En cours</span>
        </div>
      </Carte>
      <HistoriqueSaisons joueurId={joueurId} />
    </div>
  )
}
