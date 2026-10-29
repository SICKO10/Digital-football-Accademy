import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'
import TuileChiffre from './TuileChiffre'

// "Ma saison" — remplace les quatre tuiles de chiffres isolées de l'ancien
// accueil. À 15 ans, un taux de présence brut ne dit rien ; une barre qui se
// remplit et une phrase qui raconte, si. Les chiffres restent dessous, en
// détail plutôt qu'en message principal.
//
// Tout vient de ce que le dashboard a déjà calculé : `presence` est l'objet
// tauxPresenceAccueil ({ taux, present, total, serie, buts, passes,
// minutesJouees, matchsJoues }) et `notes` la liste des notations reçues.
// Aucune requête ici.
export default function JaugeSaison({ presence, notes = [], isMobile = false, style }) {
  const colors = useColors()
  if (!presence) return null

  const { taux, present, total, serie, buts, passes, minutesJouees, matchsJoues } = presence

  // Seules les notes que l'éducateur a rendues visibles au joueur comptent
  // dans la moyenne (cf. noteVisible, supabase_notations_visibilite.sql).
  const notesVisibles = notes.filter(n => n.noteVisible && typeof n.note === 'number')
  const moyenne = notesVisibles.length > 0
    ? Math.round((notesVisibles.reduce((s, n) => s + n.note, 0) / notesVisibles.length) * 10) / 10
    : null

  const tauxAffiche = Math.max(0, Math.min(100, Math.round(taux ?? 0)))

  // La saison n'a pas commencé : afficher une rangée de zéros serait décourageant
  // et faux (rien n'a encore été joué).
  const saisonCommencee = (total ?? 0) > 0 || (matchsJoues ?? 0) > 0

  return (
    <Carte isMobile={isMobile} style={style}>
      <TitreSection>Ma saison</TitreSection>

      {!saisonCommencee ? (
        <p style={{ margin: 0, fontSize: fontSize.lg, color: colors.text.secondary }}>
          Ta saison commence. Tes présences et tes statistiques apparaîtront ici dès ta première séance.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing.lg }}>
            <span style={{ fontSize: fontSize.lg, color: colors.text.secondary }}>Présence aux séances</span>
            <span style={{ fontSize: fontSize['6xl'], fontWeight: 800, lineHeight: 1, color: colors.accent.green, letterSpacing: '-0.5px' }}>
              {tauxAffiche}<span style={{ fontSize: fontSize.xl, fontWeight: 700 }}> %</span>
            </span>
          </div>

          <div style={{ height: '8px', borderRadius: '999px', background: colors.background.raised, overflow: 'hidden' }}>
            <div style={{ width: `${tauxAffiche}%`, height: '100%', borderRadius: '999px', background: colors.accent.green }} />
          </div>

          <p style={{ margin: `${spacing.lg} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary }}>
            Tu étais là {present} fois sur {total}.
            {serie > 1 ? ` ${serie} séances de suite en ce moment, continue.` : ''}
          </p>

          {(buts > 0 || passes > 0 || moyenne !== null) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: spacing.lg,
                marginTop: spacing['3xl'],
              }}
            >
              <TuileChiffre valeur={buts ?? 0} libelle={(buts ?? 0) > 1 ? 'buts' : 'but'} couleur={colors.accent.green} isMobile={isMobile} />
              <TuileChiffre valeur={passes ?? 0} libelle="passes décisives" couleur={colors.accent.blue} isMobile={isMobile} />
              {moyenne !== null && (
                <TuileChiffre
                  valeur={<>{moyenne}<span style={{ fontSize: fontSize.xl, fontWeight: 700, color: colors.text.faint }}>/10</span></>}
                  libelle={`moyenne du coach sur ${notesVisibles.length} match${notesVisibles.length > 1 ? 's' : ''}`}
                  couleur={colors.accent.amber}
                  isMobile={isMobile}
                />
              )}
            </div>
          )}

          {minutesJouees > 0 && matchsJoues > 0 && (
            <p style={{ margin: `${spacing.lg} 0 0`, fontSize: fontSize.md, color: colors.text.faint }}>
              {minutesJouees} minutes jouées sur {matchsJoues} match{matchsJoues > 1 ? 's' : ''}, soit {Math.round(minutesJouees / matchsJoues)} minutes par match en moyenne.
            </p>
          )}
        </>
      )}
    </Carte>
  )
}
