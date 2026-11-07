import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { fontSize, radius, spacing } from '../../tokens'
import { saisonActuelle, bornesSaison } from '../../lib/saison'
import { getPosteFamille } from '../../lib/postes'
import CarteJoueur from '../CarteJoueur'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Badges de palmarès (table joueur_badges) : collectifs = l'équipe entière gagne
// le même badge ; individuels = distinction personnelle. Même répartition que
// CarteJoueur.jsx (TYPES_COLLECTIFS).
const TYPES_COLLECTIFS = new Set(['tournoi_victoire', 'champion', 'coupe'])
const TYPES_IGNORES = new Set(['tournoi_participation', 'veo_stats_autodeclarees'])

const POLICE_CHIFFRES = "'Barlow Condensed', 'Inter', sans-serif"

const moisLong = (mois) => {
  const [a, m] = mois.split('-')
  return new Date(parseInt(a), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function Tuile({ valeur, libelle, detail, couleur, colors }) {
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl, padding: `${spacing.xl} ${spacing.xl}`, minWidth: 0 }}>
      <div style={{ fontFamily: POLICE_CHIFFRES, fontWeight: 800, fontSize: '44px', lineHeight: 1, color: couleur || colors.text.primary }}>{valeur}</div>
      <div style={{ marginTop: spacing.md, fontSize: fontSize.base, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.faint }}>{libelle}</div>
      {detail && <div style={{ marginTop: spacing.xs, fontSize: fontSize.md, color: colors.text.faint }}>{detail}</div>}
    </div>
  )
}

function Pastille({ texte, couleur, colors }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.md, padding: '7px 14px', borderRadius: radius.pill, background: couleur + '22', border: `1px solid ${couleur}55`, color: colors.text.primary, fontSize: fontSize.lg, fontWeight: 700 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: couleur }} />{texte}
    </span>
  )
}

// Page « profil » de Mes statistiques : la carte joueur façon FIFA, les chiffres
// de la saison (minutes, présence, buts, passes décisives, poste, clean sheets
// pour un gardien, note moyenne, points séance) et les récompenses.
//
// Sources : pour un joueur rattaché à une équipe, les chiffres officiels saisis
// par l'éducateur (`statsEquipe`, calculés par DashboardJoueur) ; sinon les
// matchs saisis par le joueur lui-même (`matchs`, table stats_match_joueur).
export default function ProfilStatsJoueur({ userId, joueurPoste, matchs = [], statsEquipe, isMobile }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [badges, setBadges] = useState([])

  useEffect(() => {
    if (!userId) return
    supabase.from('joueur_badges').select('*').eq('joueur_id', userId).eq('saison', saison)
      .then(({ data }) => setBadges(data || []))
  }, [userId, saison])

  const estGardien = getPosteFamille(joueurPoste) === 'Gardien'
  const { date_debut, date_fin } = bornesSaison(saison)
  const matchsSaison = matchs.filter(m => m.date >= date_debut && m.date <= date_fin)

  const officiel = !!statsEquipe && statsEquipe.matchsJoues > 0
  const nbMatchs = officiel ? statsEquipe.matchsJoues : matchsSaison.length
  const minutes = officiel ? statsEquipe.minutesJouees : matchsSaison.reduce((s, m) => s + (m.minutes || 0), 0)
  const buts = officiel ? statsEquipe.buts : matchsSaison.reduce((s, m) => s + (m.buts || 0), 0)
  const passes = officiel ? statsEquipe.passes : matchsSaison.reduce((s, m) => s + (m.passes_decisives || 0), 0)
  const cleanSheets = officiel ? statsEquipe.cleanSheets : matchsSaison.filter(m => m.buts_encaisses === 0).length

  const notes = (statsEquipe?.evals || []).filter(n => n.note != null && n.noteVisible !== false).map(n => Number(n.note))
  const noteMoyenne = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length) : null
  const presence = statsEquipe?.tauxPresence ?? null
  const moisSaison = (statsEquipe?.elusMois || []).filter(m => m.saison === saison)
  const annee = (statsEquipe?.classementAnnee || []).find(a => a.saison === saison)
  const points = statsEquipe ? (annee?.mesPoints ?? 0) : null

  const tuiles = [
    { valeur: joueurPoste || '—', libelle: 'Poste', petit: true },
    { valeur: nbMatchs, libelle: 'Matchs joués' },
    { valeur: minutes, libelle: 'Minutes jouées', detail: nbMatchs ? `${Math.round(minutes / nbMatchs)} min par match` : null },
    { valeur: buts, libelle: 'Buts', couleur: colors.accent.green },
    { valeur: passes, libelle: 'Passes décisives', couleur: colors.accent.green },
    estGardien && { valeur: cleanSheets, libelle: 'Clean sheets', couleur: colors.accent.green },
    { valeur: noteMoyenne != null ? noteMoyenne.toFixed(1).replace('.', ',') : '—', libelle: 'Note moyenne', detail: noteMoyenne != null ? `sur 10, ${notes.length} match${notes.length > 1 ? 's' : ''} noté${notes.length > 1 ? 's' : ''}` : 'Pas encore de note de ton éducateur' },
    { valeur: presence != null ? `${presence}%` : '—', libelle: 'Présence aux séances', detail: statsEquipe?.total ? `${statsEquipe.present} séances sur ${statsEquipe.total}` : null },
    { valeur: points ?? '—', libelle: 'Points séance', couleur: colors.accent.amber, detail: annee && annee.mesPoints > 0 ? `${annee.rang}${annee.rang === 1 ? 'er' : 'e'} du classement général` : null },
  ].filter(Boolean)

  const collectifs = badges.filter(b => TYPES_COLLECTIFS.has(b.type))
  const individuels = badges.filter(b => !TYPES_COLLECTIFS.has(b.type) && !TYPES_IGNORES.has(b.type))
  const elus = (statsEquipe?.elusMois || []).filter(m => m.estElu).sort((a, b) => b.mois.localeCompare(a.mois))
  const elusAnnee = (statsEquipe?.classementAnnee || []).filter(a => a.estElu).sort((a, b) => b.saison.localeCompare(a.saison))
  const suiviMois = moisSaison.slice().sort((a, b) => b.mois.localeCompare(a.mois)).slice(0, 4)
  const aucuneRecompense = collectifs.length + individuels.length + elus.length + elusAnnee.length === 0

  return (
    <>
      <div style={{ display: 'flex', gap: spacing['4xl'], flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: isMobile ? 'center' : 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <CarteJoueur userId={userId} saison={saison} />
        </div>
        <div style={{ flex: 1, minWidth: isMobile ? '100%' : '320px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: spacing.xl }}>
          {tuiles.map(t => (
            <Tuile key={t.libelle} colors={colors} libelle={t.libelle} detail={t.detail} couleur={t.couleur}
              valeur={t.petit ? <span style={{ fontSize: '28px', lineHeight: 1.15, display: 'block', paddingTop: '8px' }}>{t.valeur}</span> : t.valeur} />
          ))}
        </div>
      </div>

      <Carte isMobile={isMobile}>
        <TitreSection couleur={colors.accent.amber}>Mes récompenses</TitreSection>

        {aucuneRecompense ? (
          <p style={{ margin: 0, color: colors.text.faint, fontSize: fontSize.xl, lineHeight: 1.5 }}>
            Pas encore de récompense cette saison. Les titres de ton équipe (tournois, championnat, coupe), les distinctions individuelles et les titres de joueur du mois apparaissent ici dès qu'ils sont obtenus.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
            {elusAnnee.length > 0 && (
              <div>
                <p style={{ margin: `0 0 ${spacing.lg}`, color: colors.text.secondary, fontSize: fontSize.lg, fontWeight: 700 }}>Joueur de l'année</p>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  {elusAnnee.map(a => <Pastille key={a.saison} colors={colors} couleur={colors.accent.amber} texte={`Saison ${a.saison.replace('-', ' - ')} · ${a.mesPoints} pts`} />)}
                </div>
              </div>
            )}
            {elus.length > 0 && (
              <div>
                <p style={{ margin: `0 0 ${spacing.lg}`, color: colors.text.secondary, fontSize: fontSize.lg, fontWeight: 700 }}>Joueur du mois</p>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  {elus.map(m => <Pastille key={m.mois} colors={colors} couleur={colors.accent.amber} texte={`${moisLong(m.mois)} · ${m.mesPoints} pts`} />)}
                </div>
              </div>
            )}
            {collectifs.length > 0 && (
              <div>
                <p style={{ margin: `0 0 ${spacing.lg}`, color: colors.text.secondary, fontSize: fontSize.lg, fontWeight: 700 }}>Titres collectifs</p>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  {collectifs.map(b => <Pastille key={b.id} colors={colors} couleur={colors.accent.green} texte={b.label} />)}
                </div>
              </div>
            )}
            {individuels.length > 0 && (
              <div>
                <p style={{ margin: `0 0 ${spacing.lg}`, color: colors.text.secondary, fontSize: fontSize.lg, fontWeight: 700 }}>Distinctions individuelles</p>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  {individuels.map(b => <Pastille key={b.id} colors={colors} couleur={colors.accent.orange || colors.accent.amber} texte={b.label} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </Carte>

      {suiviMois.length > 0 && (
        <Carte isMobile={isMobile}>
          <TitreSection couleur={colors.accent.amber}>Points séance, mois par mois</TitreSection>
          <p style={{ margin: `0 0 ${spacing.xl}`, color: colors.text.faint, fontSize: fontSize.lg }}>
            Le joueur qui cumule le plus de points séance est élu joueur du mois, une fois le mois terminé. À la fin de la saison, le premier du classement général des points séance est élu joueur de l'année.
            {annee && annee.mesPoints > 0 && <strong style={{ color: colors.accent.amber }}> Classement général provisoire : {annee.rang}{annee.rang === 1 ? 'er' : 'e'} sur {annee.nbJoueurs}.</strong>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {suiviMois.map(m => (
              <div key={m.mois}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm, fontSize: fontSize.lg }}>
                  <span style={{ color: colors.text.secondary, textTransform: 'capitalize' }}>
                    {moisLong(m.mois)}{m.enCours ? ' (en cours)' : ''}{m.estElu && <strong style={{ color: colors.accent.amber, marginLeft: spacing.md }}>Joueur du mois</strong>}
                  </span>
                  <span style={{ color: colors.accent.amber, fontWeight: 700 }}>{m.mesPoints} pt{m.mesPoints > 1 ? 's' : ''} <span style={{ color: colors.text.faint, fontWeight: 400 }}>· meilleur total {m.max}</span></span>
                </div>
                <div style={{ height: '8px', borderRadius: radius.pill, background: colors.background.sunken, overflow: 'hidden' }}>
                  <div style={{ width: `${m.max ? Math.round((m.mesPoints / m.max) * 100) : 0}%`, height: '100%', borderRadius: radius.pill, background: colors.accent.amber }} />
                </div>
              </div>
            ))}
          </div>
        </Carte>
      )}
    </>
  )
}
