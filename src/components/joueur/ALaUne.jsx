import { useColors } from '../../lib/theme'
import { fontSize, radius, spacing } from '../../tokens'
import { localeOf } from '../../lib/translations'
import Carte from './Carte'
import TitreSection from './TitreSection'
import CompositionTerrain from '../CompositionTerrain'

// Bloc « à la une » de l'accueil joueur : le seul bloc en relief de l'écran
// (niveau="relief" de Carte, qui porte la lumière de terrain). Il rend le
// gagnant de choisirALaUne() (src/lib/ecranJoueur.js), rien d'autre : aucune
// requête, tout vient de ce que le dashboard a déjà chargé.
//
// `choix` = { type, contenu } ; null → le composant ne rend rien (le bloc
// disparaît, jamais de carte vide). Les actions passent par des fonctions du
// dashboard (`onOuvrirOnglet`, `onNaviguer`, `onRepondreConvocation`).

const dateLongue = (lang, d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })

const Titre = ({ children, isMobile }) => {
  const colors = useColors()
  return (
    <p style={{ margin: `${spacing.md} 0 0`, fontSize: isMobile ? fontSize['5xl'] : fontSize['7xl'], fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.2, color: colors.text.primary }}>{children}</p>
  )
}

const Detail = ({ children }) => {
  const colors = useColors()
  return <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary }}>{children}</p>
}

const Bouton = ({ children, onClick }) => {
  const colors = useColors()
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        marginTop: spacing['2xl'], background: colors.accent.green, color: colors.accent.onBrand, border: 'none',
        borderRadius: radius.xl, padding: `${spacing.lg} ${spacing['3xl']}`, fontWeight: 700, fontSize: fontSize.xl,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      }}
    >
      {children}
    </button>
  )
}

const Pastille = ({ children }) => {
  const colors = useColors()
  return (
    <div style={{ background: colors.background.raised, borderRadius: radius.lg, padding: `${spacing.sm} ${spacing.lg}`, fontSize: fontSize.md, color: colors.text.dim }}>{children}</div>
  )
}

const Eyebrow = ({ children }) => {
  const colors = useColors()
  return <TitreSection couleur={colors.accent.green} style={{ margin: 0 }}>{children}</TitreSection>
}

export default function ALaUne({ choix, isMobile = false, lang = 'fr', repConvoc, onRepondreConvocation, onOuvrirOnglet, onNaviguer, style }) {
  const colors = useColors()
  if (!choix) return null
  const { type, contenu } = choix

  let corps = null
  let ouvrir = null

  if (type === 'convocation') {
    const m = contenu.matchs_equipe
    const quand = [
      m?.date && new Date(`${m.date}T00:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' }),
      m?.heure && m.heure.slice(0, 5),
      m?.lieu,
    ].filter(Boolean).join(' · ')
    corps = (
      <>
        <Eyebrow>Tu es convoqué{m?.competition ? ` · ${m.competition}` : ''}</Eyebrow>
        <Titre isMobile={isMobile}>{m?.domicile ? 'vs' : '@'} {m?.adversaire || 'adversaire à confirmer'}</Titre>
        {quand && <Detail>{quand}</Detail>}

        {contenu.timeline?.length > 0 && (
          <div style={{ marginTop: spacing['2xl'] }}>
            <TitreSection style={{ margin: `0 0 ${spacing.md}` }}>Programme</TitreSection>
            {contenu.timeline.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: isMobile ? spacing.lg : spacing['2xl'], alignItems: 'center', padding: `${spacing.md} 0`, borderBottom: i < contenu.timeline.length - 1 ? `1px solid ${colors.border.subtle}` : 'none' }}>
                <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: fontSize.xl, minWidth: '50px' }}>{step.heure}</span>
                <span style={{ color: colors.text.secondary, fontSize: fontSize.xl }}>{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {contenu.notes && (
          <p style={{ color: colors.text.secondary, fontSize: fontSize.xl, fontStyle: 'italic', background: colors.background.base, borderRadius: radius.base, padding: `${spacing.base} ${spacing.lg}`, margin: `${spacing['2xl']} 0 0` }}>
            {contenu.notes}
          </p>
        )}

        <div style={{ display: 'flex', gap: isMobile ? spacing.base : spacing.lg, marginTop: spacing['2xl'] }}>
          <button onClick={() => onRepondreConvocation('present')}
            style={{ flex: 1, background: repConvoc === 'present' ? colors.accent.green : colors.background.raised, color: repConvoc === 'present' ? colors.accent.onBrand : colors.text.primary, border: 'none', borderRadius: radius.xl, padding: isMobile ? `${spacing.base} ${spacing['3xl']}` : `${spacing.xl} ${spacing['3xl']}`, fontWeight: 700, fontSize: fontSize['2xl'], cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Présent
          </button>
          <button onClick={() => onRepondreConvocation('absent')}
            style={{ flex: 1, background: repConvoc === 'absent' ? colors.accent.red : colors.background.raised, color: colors.text.primary, border: 'none', borderRadius: radius.xl, padding: isMobile ? `${spacing.base} ${spacing['3xl']}` : `${spacing.xl} ${spacing['3xl']}`, fontWeight: 700, fontSize: fontSize['2xl'], cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Absent
          </button>
        </div>

        {(contenu.type_terrain || contenu.arbitre_nom) && (
          <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', marginTop: spacing['2xl'] }}>
            {contenu.type_terrain && <Pastille>{contenu.type_terrain}</Pastille>}
            {contenu.arbitre_nom && <Pastille>Arbitre : {contenu.arbitre_nom}</Pastille>}
          </div>
        )}
      </>
    )
  } else if (type === 'composition') {
    corps = (
      <>
        <Eyebrow>Composition</Eyebrow>
        <Titre isMobile={isMobile}>vs {contenu.adversaire}</Titre>
        {contenu.date_match && <Detail>{dateLongue(lang, contenu.date_match)}</Detail>}
        <div style={{ marginTop: spacing['2xl'] }}>
          <CompositionTerrain
            formation={contenu.formation || '4-4-2'}
            titulaires={contenu.titulaires || []}
            remplacants={contenu.remplacants || []}
            modeEdit={false}
            affichageNom={contenu.composition_affichage_nom || 'nom'}
          />
        </div>
      </>
    )
  } else if (type === 'seance') {
    ouvrir = () => onOuvrirOnglet('entrainement')
    corps = (
      <>
        <Eyebrow>Prochaine séance</Eyebrow>
        <Titre isMobile={isMobile}>{contenu.description || 'Entraînement'}</Titre>
        <Detail>{[dateLongue(lang, contenu.date), contenu.heure ? `à ${contenu.heure}` : null, contenu.lieu].filter(Boolean).join(' · ')} · Voir la séance</Detail>
      </>
    )
  } else if (type === 'match') {
    corps = (
      <>
        <Eyebrow>Prochain match</Eyebrow>
        <Titre isMobile={isMobile}>{contenu.domicile ? 'vs' : '@'} {contenu.adversaire || 'adversaire à confirmer'}</Titre>
        <Detail>{[dateLongue(lang, contenu.date), contenu.heure ? `à ${contenu.heure}` : null].filter(Boolean).join(' · ')}</Detail>
      </>
    )
  } else if (type === 'analyse') {
    ouvrir = () => onOuvrirOnglet('analyses')
    corps = (
      <>
        <Eyebrow>Ton analyse est prête</Eyebrow>
        <Titre isMobile={isMobile}>{contenu.titre || 'Analyse vidéo'}</Titre>
        <Detail>{[contenu.poste, new Date(contenu.created_at).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long' })].filter(Boolean).join(' · ')}</Detail>
        <Bouton onClick={() => onOuvrirOnglet('analyses')}>Voir mon rapport</Bouton>
      </>
    )
  } else if (type === 'visibilite') {
    corps = contenu.visible ? (
      <>
        <Eyebrow>Visibilité recruteurs</Eyebrow>
        <Titre isMobile={isMobile}>Les recruteurs et les clubs peuvent te trouver</Titre>
        {contenu.statut && <Detail>Statut affiché : {contenu.statut}</Detail>}
        <Bouton onClick={() => onOuvrirOnglet('profil')}>Gérer ma visibilité</Bouton>
      </>
    ) : (
      <>
        <Eyebrow>Visibilité recruteurs</Eyebrow>
        <Titre isMobile={isMobile}>Pour l'instant, personne ne peut te trouver</Titre>
        <Detail>Rends ton profil visible pour que recruteurs et clubs puissent te contacter.</Detail>
        <Bouton onClick={() => onOuvrirOnglet('profil')}>Activer ma visibilité</Bouton>
      </>
    )
  } else if (type === 'publier') {
    corps = (
      <>
        <Eyebrow>Fais-toi voir</Eyebrow>
        <Titre isMobile={isMobile}>{contenu.estPro ? 'Publie ton premier clip' : 'Publie ton premier reel'}</Titre>
        <Detail>{contenu.estPro ? 'Il apparaîtra dans le Feed et sur Jogabonito, visible des agents et des clubs.' : 'Il apparaîtra sur Jogabonito.'}</Detail>
        <Bouton onClick={() => onNaviguer(contenu.estPro ? '/upload-clip' : '/upload-reel')}>Publier</Bouton>
      </>
    )
  }

  if (!corps) return null

  return (
    <Carte
      niveau="relief"
      isMobile={isMobile}
      className={ouvrir ? 'dj-cliquable' : undefined}
      onClick={ouvrir || undefined}
      style={style}
    >
      {corps}
    </Carte>
  )
}
