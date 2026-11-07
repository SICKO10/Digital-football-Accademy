import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha, fontSize, radius, spacing } from '../tokens'
import { getPoleDeCategorie } from '../constants/poles'
import { localeOf } from '../lib/translations'
import { IconTactic } from './icones'
import Carte from './joueur/Carte'
import TitreSection from './joueur/TitreSection'
import EnTetePage from './joueur/EnTetePage'
import EmptyState from './EmptyState'
import TactipadViewer from './TactipadViewer'
import SchemaPleinEcran from './SchemaPleinEcran'
import TerrainZonesSvg from './TerrainZonesSvg'
import DemiTerrainSchema from './DemiTerrainSchema'

// Un terrain + sa légende, pour une phase donnée — brique de base réutilisée
// pour les 6 phases (offensif/défensif/transitions×2/CPA×2). La légende est
// cliquable : sélectionner une zone la fait ressortir sur le terrain (fond
// éclairci pour les autres) — purement une interaction d'affichage, ne
// dépend d'aucun champ supplémentaire côté terrain_zones. Sur téléphone, le
// terrain passe au-dessus de sa légende au lieu de la pousser hors de l'écran.
function PanneauZones({ zones, colors, fondUrl, isMobile }) {
  const [zoneActiveId, setZoneActiveId] = useState(null)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: spacing['3xl'], alignItems: 'start' }}>
      <Carte isMobile style={{ display: 'flex', justifyContent: 'center' }}>
        <TerrainZonesSvg zones={zones} fondUrl={fondUrl} zoneActiveId={zoneActiveId} onZoneClick={id => setZoneActiveId(prev => prev === id ? null : id)} />
      </Carte>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, minWidth: 0 }}>
        {zones.length === 0 ? (
          <EmptyState
            icon={<IconTactic />}
            title="Rien n'est encore dessiné pour cette phase"
            subtitle="Ton club n'a pas encore personnalisé cette page. Dès que ton club ou ton éducateur l'aura fait, les zones apparaîtront ici avec leur explication."
          />
        ) : zones.map(z => {
          const couleur = z.couleur || colors.accent.green
          const active = zoneActiveId === z.id
          return (
            <Carte key={z.id} isMobile onClick={() => setZoneActiveId(prev => prev === z.id ? null : z.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.base, padding: `${spacing.base} ${spacing.xl}`,
                borderLeft: `3px solid ${active ? couleur : 'transparent'}`,
                background: active ? couleur + alpha.subtle : colors.background.surface,
              }}>
              <div style={{ width: '14px', height: '14px', borderRadius: radius.sm, background: couleur, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: colors.text.primary, fontSize: fontSize.md, fontWeight: 700 }}>{z.label}</div>
                {z.description && <div style={{ color: colors.text.faint, fontSize: fontSize.base }}>{z.description}</div>}
              </div>
            </Carte>
          )
        })}
      </div>
    </div>
  )
}

// Galerie en lecture seule des schémas CPA d'une phase (autant que le club en
// a créé, cf. ProjetSportif.jsx → SectionZones → "Schémas CPA").
function GalerieCpa({ schemas, colors }) {
  if (schemas.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: spacing.xl, marginTop: spacing.lg }}>
      {schemas.map(s => {
        const numeros = Object.keys(s.legende || {}).sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
        return (
          <Carte key={s.id} isMobile style={{ padding: spacing.base, borderRadius: radius.xl }}>
            <DemiTerrainSchema elements={s.elements || []} />
            <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.base, fontWeight: 700, color: colors.text.primary, textAlign: 'center' }}>{s.nom}</p>
            {numeros.length > 0 && (
              <div style={{ marginTop: spacing.md, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {numeros.map(num => (
                  <p key={num} style={{ margin: 0, fontSize: fontSize.sm, color: colors.text.faint }}>
                    <strong style={{ color: colors.text.secondary }}>{num}</strong> — {s.legende[num]}
                  </p>
                ))}
              </div>
            )}
          </Carte>
        )
      })}
    </div>
  )
}

// Galerie en lecture seule d'images de référence supplémentaires d'une phase
// (plusieurs par pôle+phase, sans zones dessus) — cf. ProjetSportif.jsx →
// SectionZones → "Galerie d'images supplémentaires" (terrain_galerie).
function GalerieImages({ images, colors }) {
  if (images.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: spacing.lg, marginTop: spacing.lg }}>
      {images.map(g => (
        <img key={g.id} src={g.image_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`, display: 'block' }} />
      ))}
    </div>
  )
}

// Carte d'un schéma partagé : l'aperçu réel du schéma (même rendu que le lecteur),
// un voile sombre et un bouton lecture au centre, comme une vignette vidéo.
function CarteSchema({ schema, colors, locale, onOuvrir }) {
  const [largeur, setLargeur] = useState(0)
  const [survol, setSurvol] = useState(false)
  const refMedia = useRef(null)
  const couleur = colors.accent.green
  const etapes = schema.schema?.sequences?.length || 1

  useEffect(() => {
    const el = refMedia.current
    if (!el) return
    const mesurer = () => setLargeur(Math.round(el.clientWidth))
    mesurer()
    const obs = new ResizeObserver(mesurer)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div onClick={onOuvrir} onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      style={{
        cursor: 'pointer', borderRadius: radius.xl, overflow: 'hidden', background: colors.background.surface,
        border: `1px solid ${survol ? couleur : colors.border.subtle}`,
        transform: survol ? 'translateY(-4px)' : 'none',
        boxShadow: survol ? `0 14px 32px ${couleur}33` : 'none',
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
      }}>
      <div ref={refMedia} style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#0B3D1E' }}>
        {largeur > 0 && (
          <div style={{ transform: survol ? 'scale(1.05)' : 'scale(1)', transition: 'transform .35s ease', transformOrigin: 'center' }}>
            <TactipadViewer schema={schema.schema} width={largeur} apercu />
          </div>
        )}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{
            width: '58px', height: '58px', borderRadius: '50%', background: couleur, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 22px rgba(0,0,0,0.45), 0 0 0 ${survol ? '10px' : '6px'} rgba(255,255,255,0.18)`,
            transform: survol ? 'scale(1.1)' : 'scale(1)', transition: 'transform .2s ease, box-shadow .2s ease',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.black} style={{ marginLeft: '3px' }}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
          </span>
        </div>
        {etapes > 1 && (
          <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: fontSize.base, fontWeight: 700, padding: '4px 9px', borderRadius: '999px', letterSpacing: '0.4px' }}>
            Animé · {etapes} étapes
          </span>
        )}
      </div>
      <div style={{ padding: `${spacing.lg} ${spacing.xl} ${spacing.xl}` }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: fontSize['4xl'], lineHeight: 1.25, color: colors.text.primary }}>{schema.nom || 'Sans titre'}</p>
        <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.base, color: colors.text.faint }}>
          Mis à jour le {new Date(schema.updated_at || schema.created_at).toLocaleDateString(locale)}
        </p>
      </div>
    </div>
  )
}

// Schémas partagés en premier : c'est ce que le joueur consulte le plus
// (avant un match, après une séance), les phases de jeu du club viennent ensuite.
const ONGLETS = [
  { key: 'schemas', label: 'Schémas partagés' },
  { key: 'offensif', label: 'Projet Offensif' },
  { key: 'defensif', label: 'Projet Défensif' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'pressing', label: 'Pressing' },
  { key: 'cpa', label: 'CPA' },
]

// Vue joueur du projet tactique du club : les zones de terrain que le club/
// éducateur a personnalisées (table terrain_zones, éditées côté club dans
// ProjetSportif.jsx → SectionZones, et côté éducateur si autorisé), pour son
// propre pôle (déduit de sa catégorie), plus l'onglet "Schémas partagés" qui,
// lui, lit les vrais schémas Tactipad (table tactipads) où
// visible_joueurs = true, appartenant à l'un des éducateurs affiliés au
// joueur (educateurIds). Partage interne distinct du lien public
// (tactipads.partage/partage_slug) : cf. supabase_tactipads_visible_joueurs.sql
// pour la policy RLS qui vérifie l'affiliation acceptée côté base.
export default function PreparationTactiqueJoueur({ educateurIds = [], clubId, categorie, isMobile = false, lang = 'fr', onNaviguer }) {
  const colors = useColors()
  const locale = localeOf(lang)
  const pole = categorie ? getPoleDeCategorie(categorie) : null
  const [onglet, setOnglet] = useState('schemas')
  const [pleinEcran, setPleinEcran] = useState(false)
  const [zones, setZones] = useState([])
  const [fondUrls, setFondUrls] = useState({})
  const [cpaSchemas, setCpaSchemas] = useState([])
  const [galerieImages, setGalerieImages] = useState([])
  const [schemas, setSchemas] = useState([])
  const [loadingSchemas, setLoadingSchemas] = useState(true)
  const [schemaActif, setSchemaActif] = useState(null)

  const idsKey = educateurIds.join(',')

  useEffect(() => {
    const charger = async () => {
      if (!educateurIds.length) { setSchemas([]); setLoadingSchemas(false); return }
      setLoadingSchemas(true)
      const { data } = await supabase.from('tactipads').select('*')
        .in('educateur_id', educateurIds).eq('visible_joueurs', true)
        .order('created_at', { ascending: false })
      setSchemas(data || [])
      setLoadingSchemas(false)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  useEffect(() => {
    const charger = async () => {
      if (!clubId || !pole) { setZones([]); return }
      const { data } = await supabase.from('terrain_zones').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
      setZones(data || [])
    }
    charger()
  }, [clubId, pole?.key])

  // Une image de fond par phase (table terrain_fonds, cf. ProjetSportif.jsx
  // → SectionZones côté club) — pas un seul fond partagé pour tout le club.
  useEffect(() => {
    if (!clubId || !pole) { setFondUrls({}); return }
    supabase.from('terrain_fonds').select('phase, image_url').eq('club_id', clubId).eq('pole_key', pole.key)
      .then(({ data }) => {
        const map = {}
        data?.forEach(f => { map[f.phase] = f.image_url })
        setFondUrls(map)
      })
  }, [clubId, pole?.key])

  useEffect(() => {
    const charger = async () => {
      if (!clubId || !pole) { setCpaSchemas([]); return }
      const { data } = await supabase.from('cpa_schemas').select('*').eq('club_id', clubId).eq('pole_key', pole.key)
        .in('phase', ['cpa_offensif', 'cpa_defensif']).order('ordre')
      setCpaSchemas(data || [])
    }
    charger()
  }, [clubId, pole?.key])

  useEffect(() => {
    if (!clubId || !pole) { setGalerieImages([]); return }
    supabase.from('terrain_galerie').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
      .then(({ data }) => setGalerieImages(data || []))
  }, [clubId, pole?.key])

  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '1100px', margin: '0 auto' }

  if (schemaActif) {
    // Le canevas Konva a une largeur fixe : sur téléphone on le cale sur la
    // largeur de l'écran, et le conteneur défile si la fenêtre change ensuite.
    const largeurSchema = isMobile ? Math.max(260, Math.min(800, window.innerWidth - 2 * 32)) : 800
    return (
      <div style={cadre}>
        <button onClick={() => setSchemaActif(null)}
          style={{ background: 'none', border: 'none', color: colors.accent.blue, cursor: 'pointer', fontSize: fontSize.lg, fontWeight: 700, marginBottom: spacing['2xl'], padding: 0, fontFamily: 'inherit' }}>
          ← Retour aux schémas
        </button>
        <Carte isMobile={isMobile}>
          <h2 style={{ color: colors.text.primary, margin: `0 0 ${spacing['2xl']}`, fontSize: fontSize['4xl'] }}>{schemaActif.nom || 'Sans titre'}</h2>
          {isMobile && (
            <button onClick={() => setPleinEcran(true)}
              style={{ width: '100%', marginBottom: spacing['2xl'], background: colors.accent.green, color: colors.black, border: 'none', borderRadius: radius.lg, padding: '12px 16px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
              Plein écran (téléphone en paysage)
            </button>
          )}
          <div style={{ overflowX: 'auto' }}>
            <TactipadViewer schema={schemaActif.schema} width={largeurSchema} />
          </div>
        </Carte>
        {pleinEcran && <SchemaPleinEcran schema={schemaActif.schema} nom={schemaActif.nom} colors={colors} onFermer={() => setPleinEcran(false)} />}
      </div>
    )
  }

  const tabStyle = (actif) => ({
    padding: `${spacing.base} ${spacing['2xl']}`, borderRadius: radius.lg, border: 'none',
    background: actif ? colors.background.raised : 'transparent',
    color: actif ? colors.text.primary : colors.text.faint,
    fontWeight: actif ? 700 : 400, fontSize: fontSize.lg, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  })

  const zonesPhase = (phase) => zones.filter(z => z.phase === phase)
  const panneau = (phase) => <PanneauZones zones={zonesPhase(phase)} colors={colors} fondUrl={fondUrls[phase]} isMobile={isMobile} />
  const galerie = (phase) => <GalerieImages images={galerieImages.filter(g => g.phase === phase)} colors={colors} />
  const sousPhase = (titre, phase, avecCpa) => (
    <div>
      <TitreSection>{titre}</TitreSection>
      {panneau(phase)}
      {avecCpa && <GalerieCpa schemas={cpaSchemas.filter(s => s.phase === phase)} colors={colors} />}
      {galerie(phase)}
    </div>
  )

  // Deux cas où il n'y a rien à montrer des phases de jeu, avec chacun son
  // action : pas de club (rejoindre une équipe) ou catégorie non renseignée
  // (le pôle se déduit d'elle, sans pôle aucune zone ne peut être lue).
  const blocPhasesVide = !clubId ? (
    <EmptyState
      icon={<IconTactic />}
      title="Le projet de jeu arrive avec ton club"
      subtitle="Une fois dans une équipe, tu retrouves ici les zones du terrain, le pressing, les transitions et les coups de pied arrêtés de ton club."
      cta={onNaviguer ? { label: 'Rejoindre mon équipe', onClick: () => onNaviguer('equipe') } : undefined}
    />
  ) : !pole ? (
    <EmptyState
      icon={<IconTactic />}
      title="Ta catégorie n'est pas renseignée"
      subtitle="Le projet de jeu dépend de ta catégorie (U13, U16, Seniors...). Indique-la dans ton profil pour voir celui qui te concerne."
      cta={onNaviguer ? { label: 'Compléter mon profil', onClick: () => onNaviguer('profil') } : undefined}
    />
  ) : null
  const phasesPretes = !blocPhasesVide

  return (
    <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
      <EnTetePage isMobile={isMobile} kicker="Ton espace tactique" titre="Préparation tactique" accentMot="tactique"
        sousTitre="Le projet de jeu de ton club, phase par phase, et les schémas que ton éducateur partage avec toi. Arrive au match en sachant exactement quoi faire." />

      <div style={{ display: 'flex', gap: spacing.xs, background: colors.background.sunken, borderRadius: radius.xl, padding: spacing.xs, width: 'fit-content', maxWidth: '100%', overflowX: 'auto', border: `1px solid ${colors.border.subtle}` }}>
        {ONGLETS.map(o => <button key={o.key} style={tabStyle(onglet === o.key)} onClick={() => setOnglet(o.key)}>{o.label}</button>)}
      </div>

      {onglet !== 'schemas' && blocPhasesVide}

      {phasesPretes && onglet === 'offensif' && <div>{panneau('attaque')}{galerie('attaque')}</div>}
      {phasesPretes && onglet === 'defensif' && <div>{panneau('defense')}{galerie('defense')}</div>}

      {phasesPretes && onglet === 'transitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['5xl'] }}>
          {sousPhase('Transition offensive', 'transition_att')}
          {sousPhase('Transition défensive', 'transition_def')}
        </div>
      )}

      {phasesPretes && onglet === 'pressing' && <div>{panneau('pressing')}{galerie('pressing')}</div>}

      {phasesPretes && onglet === 'cpa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['5xl'] }}>
          {sousPhase('CPA offensifs', 'cpa_offensif', true)}
          {sousPhase('CPA défensifs', 'cpa_defensif', true)}
        </div>
      )}

      {onglet === 'schemas' && (
        loadingSchemas ? <p style={{ color: colors.text.faint, fontSize: fontSize.lg, margin: 0 }}>Chargement...</p> : (
          schemas.length === 0 ? (
            educateurIds.length === 0 ? (
              <EmptyState
                icon={<IconTactic />}
                title="Les schémas de ton éducateur arrivent avec ton équipe"
                subtitle="Quand tu fais partie d'une équipe, les schémas tactiques que ton éducateur choisit de partager apparaissent ici."
                cta={onNaviguer ? { label: 'Rejoindre mon équipe', onClick: () => onNaviguer('equipe') } : undefined}
              />
            ) : (
              <EmptyState
                icon={<IconTactic />}
                title="Aucun schéma partagé pour l'instant"
                subtitle="Ton éducateur n'a pas encore partagé de schéma tactique. Dès qu'il le fera depuis Tactipad, tu le retrouveras ici, prêt à être consulté avant le match."
              />
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing['2xl'] }}>
              {schemas.map(s => <CarteSchema key={s.id} schema={s} colors={colors} locale={locale} onOuvrir={() => setSchemaActif(s)} />)}
            </div>
          )
        )
      )}
    </div>
  )
}
