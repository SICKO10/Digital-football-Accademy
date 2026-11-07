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

function Tuile({ valeur, libelle, detail, couleur, rang, colors }) {
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl, padding: `${spacing.xl} ${spacing.xl}`, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: POLICE_CHIFFRES, fontWeight: 800, fontSize: '44px', lineHeight: 1, color: couleur || colors.text.primary }}>{valeur}</span>
        {rang && rang.total > 0 && (
          <span title="Ton rang dans l'équipe" style={{ fontSize: fontSize.md, fontWeight: 700, color: rang.rank === 1 ? colors.accent.amber : colors.text.faint, background: colors.background.sunken, borderRadius: radius.pill, padding: '2px 8px' }}>
            #{rang.rank}/{rang.total}
          </span>
        )}
      </div>
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
// `matchs` : liste déjà fusionnée (lib/statsFusion) des matchs saisis par
// l'éducateur et de ceux saisis par le joueur ; `statsEquipe` : présence, points
// séance, notes et élus du mois (calculés par DashboardJoueur).
export default function ProfilStatsJoueur({ userId, joueurPoste, matchs = [], statsEquipe, isMobile, onOuvrirFiche }) {
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

  const nbMatchs = matchsSaison.length
  const parEducateur = matchsSaison.filter(m => m.origine === 'educateur').length
  const minutes = matchsSaison.reduce((s, m) => s + (m.minutes || 0), 0)
  const buts = matchsSaison.reduce((s, m) => s + (m.buts || 0), 0)
  const passes = matchsSaison.reduce((s, m) => s + (m.passes_decisives || 0), 0)
  const cleanSheets = matchsSaison.filter(m => m.clean_sheet).length

  const notes = (statsEquipe?.evals || []).filter(n => n.note != null && n.noteVisible !== false).map(n => Number(n.note))
  const noteMoyenne = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length) : null
  const presence = statsEquipe?.tauxPresence ?? null
  const moisSaison = (statsEquipe?.elusMois || []).filter(m => m.saison === saison)
  const annee = (statsEquipe?.classementAnnee || []).find(a => a.saison === saison)
  const points = statsEquipe ? (annee?.mesPoints ?? 0) : null

  const tuiles = [
    { valeur: joueurPoste || '—', libelle: 'Poste', petit: true },
    { valeur: nbMatchs, libelle: 'Matchs joués', rang: statsEquipe?.rankMatchs, detail: nbMatchs ? `${parEducateur} saisi${parEducateur > 1 ? 's' : ''} par ton éducateur, ${nbMatchs - parEducateur} par toi` : null },
    { valeur: minutes, libelle: 'Minutes jouées', detail: nbMatchs ? `${Math.round(minutes / nbMatchs)} min par match` : null },
    { valeur: buts, libelle: 'Buts', couleur: colors.accent.green, rang: statsEquipe?.rankButs },
    { valeur: passes, libelle: 'Passes décisives', couleur: colors.accent.green, rang: statsEquipe?.rankPasses },
    estGardien && { valeur: cleanSheets, libelle: 'Clean sheets', couleur: colors.accent.green, rang: statsEquipe?.rankClean },
    { valeur: noteMoyenne != null ? noteMoyenne.toFixed(1).replace('.', ',') : '—', libelle: 'Note moyenne', detail: noteMoyenne != null ? `sur 10, ${notes.length} match${notes.length > 1 ? 's' : ''} noté${notes.length > 1 ? 's' : ''}` : 'Pas encore de note de ton éducateur' },
    { valeur: presence != null ? `${presence}%` : '—', libelle: 'Présence aux séances', detail: statsEquipe?.total ? `${statsEquipe.present} séances sur ${statsEquipe.total}` : null },
    { valeur: points ?? '—', libelle: 'Points séance', couleur: colors.accent.amber, rang: statsEquipe?.rankPoints, detail: annee && annee.mesPoints > 0 ? `${annee.rang}${annee.rang === 1 ? 'er' : 'e'} du classement général` : null },
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
          <CarteJoueur userId={userId} saison={saison} stats={{ buts, passesD: passes, cleanSheets, matchs: nbMatchs }} />
        </div>
        <div style={{ flex: 1, minWidth: isMobile ? '100%' : '320px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: spacing.xl }}>
          {tuiles.map(t => (
            <Tuile key={t.libelle} colors={colors} libelle={t.libelle} detail={t.detail} couleur={t.couleur} rang={t.rang}
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

      {(statsEquipe?.presenceMensuelle?.length > 0 || suiviMois.length > 0) && (
        <Carte isMobile={isMobile}>
          <TitreSection couleur={colors.accent.amber}>Séances, mois par mois</TitreSection>
          <p style={{ margin: `0 0 ${spacing.xl}`, color: colors.text.faint, fontSize: fontSize.lg, lineHeight: 1.5 }}>
            Ta présence et tes points séance. Le joueur qui cumule le plus de points séance est élu joueur du mois, une fois le mois terminé. À la fin de la saison, le premier du classement général des points séance est élu joueur de l'année.
            {annee && annee.mesPoints > 0 && <strong style={{ color: colors.accent.amber }}> Classement général provisoire : {annee.rang}{annee.rang === 1 ? 'er' : 'e'} sur {annee.nbJoueurs}.</strong>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
            {(statsEquipe?.presenceMensuelle || []).slice().reverse().map(m => {
              const elu = (statsEquipe?.elusMois || []).find(e => e.mois === m.month)
              const couleurTaux = m.taux >= 80 ? colors.accent.success : m.taux >= 60 ? colors.accent.amber : colors.accent.red
              return (
                <div key={m.month}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing.sm, fontSize: fontSize.lg, flexWrap: 'wrap' }}>
                    <span style={{ color: colors.text.secondary, textTransform: 'capitalize' }}>
                      {moisLong(m.month)}{elu?.estElu && <strong style={{ color: colors.accent.amber, marginLeft: spacing.md }}>Joueur du mois</strong>}
                    </span>
                    <span>
                      <strong style={{ color: couleurTaux }}>{m.taux}%</strong>
                      <span style={{ color: colors.text.faint }}> ({m.present}/{m.total})</span>
                      {m.points > 0 && <strong style={{ color: colors.accent.amber, marginLeft: spacing.md }}>{m.points} pt{m.points > 1 ? 's' : ''} séance</strong>}
                      {elu && elu.max > 0 && <span style={{ color: colors.text.faint }}> · meilleur total {elu.max}</span>}
                    </span>
                  </div>
                  <div style={{ height: '8px', borderRadius: radius.pill, background: colors.background.sunken, overflow: 'hidden' }}>
                    <div style={{ width: `${m.taux}%`, height: '100%', borderRadius: radius.pill, background: couleurTaux }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Carte>
      )}

      {statsEquipe && (
        <Carte isMobile={isMobile}>
          <TitreSection couleur={colors.accent.amber}>Avis de ton éducateur</TitreSection>
          {statsEquipe.evaluations?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing['2xl'], flexWrap: 'wrap' }}>
              <span style={{ color: colors.text.secondary, fontSize: fontSize.xl }}>
                {statsEquipe.evaluations.length} évaluation{statsEquipe.evaluations.length > 1 ? 's' : ''} disponible{statsEquipe.evaluations.length > 1 ? 's' : ''}
              </span>
              {onOuvrirFiche && (
                <button onClick={onOuvrirFiche} style={{ background: colors.accent.green, color: colors.accent.onBrand || colors.black, border: 'none', borderRadius: radius.lg, padding: '9px 18px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Voir ma fiche
                </button>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: colors.text.faint, fontSize: fontSize.lg, fontStyle: 'italic' }}>Ton éducateur n'a pas encore partagé d'évaluation.</p>
          )}
        </Carte>
      )}
    </>
  )
}
