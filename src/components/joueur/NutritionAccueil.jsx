import { useColors } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import { CONSEILS_POSTE, CONSEILS_OBJECTIF, precautionAge } from '../../lib/nutritionConseils'
import Carte from './Carte'
import TitreSection from './TitreSection'
import TuileChiffre from './TuileChiffre'

// Écran « Mon plan » de la Nutrition du joueur : ce que la page apporte (le
// plan du jour), où il en est (calories notées aujourd'hui) et quoi faire
// ensuite (une seule action, noter un repas), puis les conseils propres à son
// poste et à son objectif.
//
// Tout vient de données déjà en base : le profil nutrition (poids, poste,
// objectif, âge), le journal du jour et, si le joueur est affilié, son vrai
// calendrier (type de journée détecté). Le calcul reste celui de
// lib/nutrition.js, fait par NutritionDashboard.
export default function NutritionAccueil({
  profil, tdee, macros, typeJournee, typeJourneeAuto, typesJournee, conseil,
  totauxJour, aNoteAujourdHui, lignesSemaine, semaineEstExemple,
  onChangerType, onNaviguer, isMobile,
}) {
  const colors = useColors()

  const consommees = Math.round(totauxJour.calories)
  const restantes = tdee - consommees
  const part = Math.min(consommees / tdee, 1)
  const depasse = consommees > tdee * 1.1
  const couleurBarre = depasse ? colors.accent.orange : colors.accent.green

  const conseilPoste = CONSEILS_POSTE[profil.poste]
  const conseilObjectif = CONSEILS_OBJECTIF[profil.objectif]
  const precaution = precautionAge(profil)

  const phraseAuto = {
    match: 'Un match est prévu aujourd\'hui dans ton calendrier.',
    entrainement: 'Un entraînement est prévu aujourd\'hui dans ton calendrier.',
    avant_match: 'Un match est prévu demain dans ton calendrier.',
    apres_match: 'Tu as joué hier : place à la récupération.',
    repos: 'Rien de prévu aujourd\'hui dans ton calendrier.',
  }[typeJourneeAuto]

  const bouton = {
    background: colors.accent.green, color: colors.black, border: 'none', borderRadius: radius.lg,
    padding: `${spacing.lg} ${spacing['3xl']}`, minHeight: '44px', fontWeight: 700, fontSize: fontSize.xl,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }
  const boutonDiscret = {
    background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`,
    borderRadius: radius.lg, padding: `${spacing.lg} ${spacing['3xl']}`, minHeight: '44px', fontWeight: 600,
    fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }
  const puce = (actif) => ({
    background: actif ? colors.text.primary : 'transparent',
    color: actif ? colors.background.base : colors.text.faint,
    border: `1px solid ${actif ? colors.text.primary : colors.border.default}`,
    borderRadius: radius.pill, padding: `${spacing.md} ${spacing.xl}`, minHeight: '36px',
    fontSize: fontSize.md, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
  })

  return (
    <div>
      <Carte accent={colors.accent.green} isMobile={isMobile} style={{ marginBottom: spacing['4xl'] }}>
        <TitreSection couleur={colors.accent.green}>Aujourd'hui · {conseil.titre}</TitreSection>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' }}>
          <span style={{ fontSize: isMobile ? '40px' : '48px', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: colors.text.primary }}>{consommees}</span>
          <span style={{ fontSize: fontSize['4xl'], fontWeight: 600, color: colors.text.faint }}>/ {tdee} kcal</span>
        </div>

        <div role="progressbar" aria-valuemin={0} aria-valuemax={tdee} aria-valuenow={consommees} aria-label="Calories notées aujourd'hui"
          style={{ background: colors.background.raised, borderRadius: radius.pill, height: spacing.md, margin: `${spacing['2xl']} 0 ${spacing.lg}`, overflow: 'hidden' }}>
          <div style={{ background: couleurBarre, width: `${part * 100}%`, height: '100%', borderRadius: radius.pill }} />
        </div>

        <p style={{ margin: 0, fontSize: fontSize.xl, color: colors.text.secondary }}>
          {!aNoteAujourdHui
            ? 'Tu n\'as encore rien noté aujourd\'hui. Ton objectif du jour est de ' + tdee + ' kcal.'
            : depasse
              ? `Tu as dépassé ton objectif de ${consommees - tdee} kcal.`
              : restantes > 0
                ? `Il te reste ${restantes} kcal pour atteindre ton objectif.`
                : 'Objectif du jour atteint.'}
        </p>

        <div style={{ marginTop: spacing['3xl'] }}>
          <button style={bouton} onClick={() => onNaviguer('journal')}>
            {aNoteAujourdHui ? 'Ajouter un repas' : 'Noter mon premier repas'}
          </button>
        </div>

        <div style={{ marginTop: spacing['4xl'], paddingTop: spacing['3xl'], borderTop: `1px solid ${colors.border.subtle}` }}>
          <p style={{ margin: `0 0 ${spacing.lg}`, fontSize: fontSize.md, fontWeight: 700, color: colors.text.faint }}>Quel type de journée ?</p>
          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
            {typesJournee.map(t => (
              <button key={t.value} onClick={() => onChangerType(t.value)} style={puce(typeJournee === t.value)}>{t.label}</button>
            ))}
          </div>
          {phraseAuto && (
            <p style={{ margin: `${spacing.lg} 0 0`, fontSize: fontSize.md, color: colors.text.faint }}>
              {phraseAuto} Tu peux changer le type de journée si ce n'est pas le bon.
            </p>
          )}
        </div>
      </Carte>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? spacing.md : spacing.lg, marginBottom: spacing['4xl'] }}>
        <TuileChiffre isMobile={isMobile} couleur={colors.accent.amber} valeur={`${macros.glucides_g} g`} libelle={`Glucides · ${macros.glucides_pct} %`} />
        <TuileChiffre isMobile={isMobile} couleur={colors.accent.blue} valeur={`${macros.proteines_g} g`} libelle={`Protéines · ${macros.proteines_pct} %`} />
        <TuileChiffre isMobile={isMobile} couleur={colors.accent.orange} valeur={`${macros.lipides_g} g`} libelle={`Lipides · ${macros.lipides_pct} %`} />
      </div>

      <Carte isMobile={isMobile} style={{ marginBottom: spacing['4xl'] }}>
        <TitreSection couleur={conseil.couleur}>{conseil.titre}</TitreSection>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {conseil.conseils.map((c, i) => (
            <li key={i} style={{ display: 'flex', gap: spacing.lg, fontSize: fontSize.lg, lineHeight: 1.5, color: colors.text.secondary }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: spacing.md, height: spacing.md, borderRadius: radius.circle, background: conseil.couleur, marginTop: '6px' }} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Carte>

      {(conseilPoste || conseilObjectif) && (
        <Carte isMobile={isMobile} style={{ marginBottom: spacing['4xl'] }}>
          <TitreSection>Pour ton profil</TitreSection>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? spacing['3xl'] : spacing['5xl'] }}>
            {[
              { cle: 'poste', surTitre: 'Ton poste', bloc: conseilPoste, couleur: colors.accent.green },
              { cle: 'objectif', surTitre: 'Ton objectif', bloc: conseilObjectif, couleur: colors.accent.blue },
            ].filter(b => b.bloc).map(({ cle, surTitre, bloc, couleur }) => (
              <div key={cle} style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: fontSize.md, fontWeight: 700, color: couleur }}>{surTitre}</p>
                <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize['3xl'], fontWeight: 800, color: colors.text.primary }}>{bloc.titre}</p>
                <p style={{ margin: `${spacing.md} 0 ${spacing.lg}`, fontSize: fontSize.lg, lineHeight: 1.5, color: colors.text.faint }}>{bloc.resume}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {bloc.conseils.map((c, i) => (
                    <li key={i} style={{ display: 'flex', gap: spacing.lg, fontSize: fontSize.lg, lineHeight: 1.5, color: colors.text.secondary }}>
                      <span aria-hidden="true" style={{ flexShrink: 0, width: spacing.md, height: spacing.md, borderRadius: radius.circle, background: couleur, marginTop: '6px' }} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {precaution && (
            <p style={{ margin: `${spacing.lg} 0 0`, padding: `${spacing.lg} ${spacing.xl}`, borderRadius: radius.lg, background: colors.accent.amber + alpha.subtle, border: `1px solid ${colors.accent.amber + alpha.light}`, fontSize: fontSize.lg, lineHeight: 1.5, color: colors.text.secondary }}>
              {precaution}
            </p>
          )}
        </Carte>
      )}

      <Carte isMobile={isMobile} style={{ marginBottom: spacing['4xl'] }}>
        <TitreSection>{semaineEstExemple ? 'Semaine type' : 'Cette semaine'}</TitreSection>
        {semaineEstExemple && (
          <p style={{ margin: `0 0 ${spacing.lg}`, fontSize: fontSize.md, color: colors.text.faint }}>
            Exemple : rejoins une équipe pour voir tes vraies séances et tes vrais matchs.
          </p>
        )}
        {lignesSemaine.map((l, i) => (
          <div key={l.cle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, padding: `${spacing.lg} 0`, borderTop: i === 0 ? 'none' : `1px solid ${colors.border.subtle}` }}>
            <span style={{ width: isMobile ? '84px' : '120px', flexShrink: 0, fontSize: fontSize.lg, color: colors.text.secondary }}>{l.jour}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: fontSize.md, fontWeight: 600, color: l.couleur }}>{l.libelle}</span>
            <span style={{ fontSize: fontSize.lg, fontWeight: 700, color: colors.text.primary }}>{l.calories} kcal</span>
          </div>
        ))}
      </Carte>

      <Carte isMobile={isMobile}>
        <TitreSection>Comment c'est calculé</TitreSection>
        <p style={{ margin: 0, fontSize: fontSize.lg, lineHeight: 1.6, color: colors.text.secondary }}>
          Ton plan part de ton poids, de ta taille, de ton âge, de ton nombre d'entraînements par semaine, de ton poste et de ton objectif. C'est une estimation de départ, pas un avis médical : écoute aussi ton énergie et ta récupération.
        </p>
        <div style={{ marginTop: spacing['3xl'] }}>
          <button style={boutonDiscret} onClick={() => onNaviguer('profil')}>Modifier mon profil</button>
        </div>
      </Carte>
    </div>
  )
}
