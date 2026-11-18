import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { fontSize, forme, spacing } from '../../tokens'
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

const POLICE_CHIFFRES = "'Barlow Condensed', 'Barlow', sans-serif"

const moisLong = (mois) => {
  const [a, m] = mois.split('-')
  return new Date(parseInt(a), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// Une case du tableau d'affichage : grand chiffre condensé, légende en majuscules,
// rang dans l'équipe en petit. Le détail passe en infobulle pour garder la case compacte.
function Case({ valeur, libelle, detail, couleur, rang, colors }) {
  return (
    <div title={detail || undefined} style={{ background: colors.background.raised, borderRadius: forme.rayonPastille, padding: `${spacing.lg} ${spacing.base}`, textAlign: 'center', minWidth: 0 }}>
      <div className="dj-chiffre" style={{ fontSize: '34px', lineHeight: 1, color: couleur || colors.text.primary }}>{valeur}</div>
      <div style={{ marginTop: spacing.md, fontFamily: POLICE_CHIFFRES, fontSize: fontSize.base, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.text.faint }}>{libelle}</div>
      {rang && rang.total > 0 && (
        <div title="Ton rang dans l'équipe" style={{ marginTop: spacing.sm, fontSize: fontSize.md, fontWeight: 700, color: rang.rank === 1 ? colors.accent.amber : colors.text.faint }}>
          #{rang.rank}/{rang.total}
        </div>
      )}
    </div>
  )
}

function Pastille({ texte, couleur, colors }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.md, padding: '7px 14px', borderRadius: forme.rayonPastille, background: couleur + '22', border: `1px solid ${couleur}55`, color: colors.text.primary, fontSize: fontSize.lg, fontWeight: 700 }}>
      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 1, background: couleur }} />{texte}
    </span>
  )
}

// Page « profil » de Mes statistiques : la carte joueur façon FIFA, les chiffres
// de la saison (minutes, présence, buts, passes décisives, poste, clean sheets
// pour un gardien, note moyenne, points séance) et les récompenses.
//
// `matchs` : liste déjà fusionnée (lib/statsFusion) des matchs saisis par
// l'éducateur et de ceux saisis par le joueur ; `statsEquipe` : présence, points
// séance, notes et élus du mois (calculés par DashboardJoueur) ; `serieEquipe` :
// les derniers résultats de l'équipe (V, N ou D, du plus ancien au plus récent).
export default function ProfilStatsJoueur({ userId, joueurPoste, matchs = [], statsEquipe, isMobile, onOuvrirFiche, logoClub, profilJoueur, serieEquipe = [] }) {
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
          <CarteJoueur userId={userId} saison={saison} logoClub={logoClub} profilJoueur={profilJoueur} largeur={isMobile ? 260 : 290}
            stats={{ buts, passesD: passes, cleanSheets, matchs: nbMatchs, minutes, noteMoyenne, presencePct: presence ?? undefined }} />
        </div>

        {/* Feuille de match : poste, saison, tableau d'affichage et série de l'équipe */}
        <Carte identite isMobile={isMobile} style={{ flex: 1, minWidth: isMobile ? '100%' : '320px', borderLeft: `${forme.lisere} solid ${colors.accent.green}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.lg, flexWrap: 'wrap', marginBottom: spacing.xl }}>
            <TitreSection style={{ margin: 0 }}>Feuille de match</TitreSection>
            <span className="dj-chiffre" style={{ fontSize: fontSize['3xl'], color: colors.text.secondary, letterSpacing: '0.04em' }}>
              {joueurPoste ? joueurPoste.toUpperCase() : 'POSTE À CHOISIR'} · {saison.replace('-', ' / ')}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: spacing.md }}>
            {tuiles.map(t => (
              <Case key={t.libelle} colors={colors} libelle={t.libelle} detail={t.detail} couleur={t.couleur} rang={t.rang} valeur={t.valeur} />
            ))}
          </div>
          {nbMatchs > 0 && (
            <p style={{ margin: `${spacing.xl} 0 0`, color: colors.text.faint, fontSize: fontSize.md, lineHeight: 1.5 }}>
              {nbMatchs} match{nbMatchs > 1 ? 's' : ''} cette saison : {parEducateur} saisi{parEducateur > 1 ? 's' : ''} par ton éducateur, {nbMatchs - parEducateur} par toi.
            </p>
          )}
          {serieEquipe.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.xl }}>
              <span className="dj-eyebrow" style={{ color: colors.text.faint, marginRight: spacing.sm }}>Série de l'équipe</span>
              {serieEquipe.map((res, k) => (
                <span key={k} className="dj-chiffre" title={res === 'V' ? 'Victoire' : res === 'N' ? 'Nul' : 'Défaite'}
                  style={{ width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: forme.rayonPastille, background: res === 'V' ? colors.accent.green : res === 'N' ? colors.accent.amber : colors.accent.red, color: colors.accent.onBrand, fontSize: fontSize.xl }}>{res}</span>
              ))}
            </div>
          )}
        </Carte>
      </div>

      <Carte identite isMobile={isMobile}>
        <TitreSection>Mes récompenses</TitreSection>

        {aucuneRecompense ? (
          <p style={{ margin: 0, color: colors.text.faint, fontSize: fontSize.xl, lineHeight: 1.5 }}>
            Pas encore de récompense cette saison. Les titres de ton équipe (tournois, championnat, coupe), les distinctions individuelles et les titres de joueur du mois apparaissent ici dès qu'ils sont obtenus. Continue les séances et les matchs : chaque présence compte.
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
        <Carte identite isMobile={isMobile}>
          <TitreSection>Séances, mois par mois</TitreSection>
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
                  <div style={{ height: '8px', borderRadius: forme.rayonPastille, background: colors.background.sunken, overflow: 'hidden' }}>
                    <div style={{ width: `${m.taux}%`, height: '100%', borderRadius: forme.rayonPastille, background: couleurTaux }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Carte>
      )}

      {statsEquipe && (
        <Carte identite isMobile={isMobile}>
          <TitreSection>Avis de ton éducateur</TitreSection>
          {statsEquipe.evaluations?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing['2xl'], flexWrap: 'wrap' }}>
              <span style={{ color: colors.text.secondary, fontSize: fontSize.xl }}>
                {statsEquipe.evaluations.length} évaluation{statsEquipe.evaluations.length > 1 ? 's' : ''} disponible{statsEquipe.evaluations.length > 1 ? 's' : ''}
              </span>
              {onOuvrirFiche && (
                <button onClick={onOuvrirFiche} style={{ background: colors.accent.green, color: colors.accent.onBrand || colors.black, border: 'none', borderRadius: forme.rayonPastille, padding: '9px 18px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
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
