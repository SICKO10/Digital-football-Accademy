import { useColors } from '../../lib/theme'
import { fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'
import BoutonTutoriel from '../tutoriels/BoutonTutoriel'

// Premier écran de la Nutrition, avant que le joueur ait créé son profil :
// dit ce que la page apporte, en trois étapes, et propose une seule action.
// Remplace l'ancien arrivage direct sur un formulaire de poids et de taille,
// sans un mot d'explication.
const ETAPES = [
  { titre: 'Tu renseignes ton profil', texte: 'Poids, taille, âge, poste, objectif et nombre d\'entraînements. Une minute suffit.' },
  { titre: 'On calcule tes besoins', texte: 'Calories, glucides, protéines et lipides, selon ta journée : match, entraînement ou repos.' },
  { titre: 'Tu suis ton plan', texte: 'Chaque jour, tu vois quoi manger, tu notes tes repas et tu suis ton poids.' },
]

export default function NutritionIntro({ onCommencer, onTutoriel, isMobile }) {
  const colors = useColors()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing['4xl'] }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? fontSize['6xl'] : fontSize['8xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>Nutrition</h1>
          <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.xl, color: colors.text.secondary }}>Manger pour finir les matchs aussi fort que tu les commences.</p>
        </div>
        <BoutonTutoriel onClick={onTutoriel} />
      </div>

      <Carte accent={colors.accent.green} isMobile={isMobile}>
        <TitreSection couleur={colors.accent.green}>Ton plan nutrition</TitreSection>
        <p style={{ margin: 0, fontSize: isMobile ? fontSize['4xl'] : fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.3px', color: colors.text.primary }}>
          Un plan pensé pour ton poste et ton objectif
        </p>
        <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.xl, lineHeight: 1.5, color: colors.text.secondary }}>
          Pas de régime compliqué : tu sais chaque jour combien manger et quoi privilégier.
        </p>

        <ol style={{ margin: `${spacing['4xl']} 0 0`, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? spacing['3xl'] : spacing['4xl'] }}>
          {ETAPES.map((e, i) => (
            <li key={e.titre} style={{ display: 'flex', gap: spacing.xl, alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: radius.circle, background: colors.accent.green, color: colors.black, fontSize: fontSize.lg, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: 700, color: colors.text.primary }}>{e.titre}</p>
                <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.lg, lineHeight: 1.5, color: colors.text.faint }}>{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: spacing['4xl'], display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
          <button onClick={onCommencer}
            style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: radius.lg, padding: `${spacing.lg} ${spacing['4xl']}`, minHeight: '44px', fontWeight: 700, fontSize: fontSize.xl, cursor: 'pointer', fontFamily: 'Inter, sans-serif', width: isMobile ? '100%' : undefined }}>
            Créer mon profil
          </button>
        </div>
      </Carte>
    </div>
  )
}
