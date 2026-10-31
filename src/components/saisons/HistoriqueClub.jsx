import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { radius } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { fetchToutesLignes, fetchToutesLignesIn } from '../../lib/supabasePagination'
import {
  saisonActuelle, saisonsAvecDonnees, aSaisonsPassees, bornesDatesSaison,
  libelleSaison, MESSAGE_AUCUNE_SAISON_ARCHIVEE,
} from '../../lib/saison'
import { POLES } from '../../constants/poles'
import SelecteurSaison from './SelecteurSaison'
import HistoriqueCollectif from './HistoriqueCollectif'

// Historique d'une saison côté club. Tout est recalculé depuis les données datées
// (matchs, séances, plans), comme pour le coach : rien n'est copié ni archivé.
// Une fenêtre unique, trois vues selon le bouton d'où l'on vient :
//   'equipe'      : une équipe, une saison (réutilise HistoriqueCollectif)
//   'educateurs'  : qui encadrait quelle équipe, avec quel effectif
//   'projet'      : projet sportif de deux saisons côte à côte
const nomEquipe = (c) => `${labelCategorie(c.nom)}${c.equipe ? ` ${c.equipe}` : ''}`

export function BoutonHistoriqueSaison({ onClick, couleur, style, libelle = 'Historique saison' }) {
  const colors = useColors()
  return (
    <button onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 10, border: `1px solid ${couleur || colors.border.default}`, background: 'transparent', color: couleur || colors.text.secondary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', ...style }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
      {libelle}
    </button>
  )
}

export default function HistoriqueClub({ clubId, categories = [], vue, equipeInitiale = null, onClose }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const titres = { equipe: 'Historique des équipes', educateurs: 'Historique des éducateurs', projet: 'Historique du projet sportif' }

  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={titres[vue]}
        style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: isMobile ? 0 : radius.lg, width: '100%', maxWidth: 980, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto', padding: isMobile ? 16 : 24, color: colors.text.primary }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{titres[vue]}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Fermer</button>
        </div>
        {vue === 'equipe' && <VueEquipe categories={categories} equipeInitiale={equipeInitiale} />}
        {vue === 'educateurs' && <VueEducateurs categories={categories} />}
        {vue === 'projet' && <VueProjet clubId={clubId} />}
      </div>
    </div>
  )
}

function useStyles() {
  const colors = useColors()
  return {
    colors,
    carte: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: '14px 16px', minWidth: 0 },
    eyebrow: { margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary },
    discret: { margin: 0, fontSize: 13, color: colors.text.faint },
    select: { background: colors.background.surface, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  }
}

// ── Vue équipe ──────────────────────────────────────────────
function VueEquipe({ categories, equipeInitiale }) {
  const { colors, select, discret } = useStyles()
  const [equipeId, setEquipeId] = useState(equipeInitiale || categories[0]?.id || '')
  const [chargees, setChargees] = useState(null)

  useEffect(() => {
    if (!equipeId) return
    let annule = false
    ;(async () => {
      const { data } = await supabase.from('equipe_joueurs').select('*').eq('club_categorie_id', equipeId)
      if (!annule) setChargees({ equipeId, joueurs: data || [] })
    })()
    return () => { annule = true }
  }, [equipeId])

  if (!categories.length) return <p style={discret}>Crée d'abord une équipe pour retrouver son historique.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <select value={equipeId} onChange={e => setEquipeId(e.target.value)} aria-label="Équipe" style={{ ...select, alignSelf: 'flex-start' }}>
        {categories.map(c => <option key={c.id} value={c.id}>{nomEquipe(c)}</option>)}
      </select>
      <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>
        Les matchs et séances saisis sans équipe précise ne sont pas comptés ici.
      </p>
      {chargees?.equipeId !== equipeId
        ? <p style={discret}>Chargement…</p>
        : <HistoriqueCollectif key={equipeId} equipeId={equipeId} joueurs={chargees.joueurs} sansIndividuel />}
    </div>
  )
}

// ── Vue éducateurs ──────────────────────────────────────────
// Le couple coach + équipe d'une saison se retrouve dans les matchs et séances
// datés de la saison (la clôture vide l'équipe, mais pas ces lignes).
function VueEducateurs({ categories }) {
  const { colors, carte, eyebrow, discret } = useStyles()
  const ids = useMemo(() => categories.map(c => c.id), [categories])
  const [lignes, setLignes] = useState(null)
  const [noms, setNoms] = useState({})
  const [saison, setSaison] = useState(saisonActuelle())
  const [effectifs, setEffectifs] = useState(null)

  useEffect(() => {
    let annule = false
    ;(async () => {
      const lire = (table) => fetchToutesLignesIn(ids, p => supabase.from(table).select('id, date, club_categorie_id, educateur_id').in('club_categorie_id', p).order('id'))
      const [m, e] = await Promise.all([lire('matchs_equipe'), lire('entrainements')])
      if (annule) return
      const tout = [
        ...(m.data || []).map(x => ({ ...x, type: 'match' })),
        ...(e.data || []).map(x => ({ ...x, type: 'seance' })),
      ].filter(x => x.date && x.educateur_id)
      const profils = [...new Set(tout.map(x => x.educateur_id))]
      let n = {}
      if (profils.length) {
        const { data } = await supabase.from('profiles_public').select('id, prenom, nom').in('id', profils)
        ;(data || []).forEach(p => { n[p.id] = `${p.prenom || ''} ${p.nom || ''}`.trim() })
      }
      if (annule) return
      setNoms(n)
      setLignes(tout)
    })()
    return () => { annule = true }
  }, [ids])

  const saisons = useMemo(() => saisonsAvecDonnees((lignes || []).map(x => x.date)), [lignes])
  const enCours = saison === saisonActuelle()

  const groupes = useMemo(() => {
    const { debut, fin } = bornesDatesSaison(saison)
    const g = {}
    ;(lignes || []).filter(x => x.date >= debut && x.date <= fin).forEach(x => {
      const k = `${x.club_categorie_id}|${x.educateur_id}`
      const cur = g[k] ||= { equipeId: x.club_categorie_id, educateurId: x.educateur_id, matchs: [], seances: 0 }
      if (x.type === 'match') cur.matchs.push(x.id); else cur.seances++
    })
    return Object.values(g)
  }, [lignes, saison])

  // Effectif : saison en cours = effectif actuel de l'équipe ; saison passée =
  // joueurs qui ont une ligne de stats sur un match de l'équipe cette saison-là.
  useEffect(() => {
    if (!lignes) return
    let annule = false
    ;(async () => {
      const res = {}
      if (enCours) {
        const { data } = await supabase.from('equipe_joueurs').select('id, club_categorie_id').in('club_categorie_id', ids)
        ;(data || []).forEach(j => { res[j.club_categorie_id] = (res[j.club_categorie_id] || 0) + 1 })
      } else {
        const matchIds = groupes.flatMap(x => x.matchs)
        const { data } = matchIds.length
          ? await fetchToutesLignesIn(matchIds, p => supabase.from('stats_match').select('id, match_id, joueur_id').in('match_id', p).order('id'))
          : { data: [] }
        const equipeDeMatch = {}
        groupes.forEach(x => x.matchs.forEach(id => { equipeDeMatch[id] = x.equipeId }))
        const vus = {}
        ;(data || []).forEach(s => { (vus[equipeDeMatch[s.match_id]] ||= new Set()).add(s.joueur_id) })
        Object.entries(vus).forEach(([eq, set]) => { res[eq] = set.size })
      }
      if (!annule) setEffectifs({ cle: `${saison}|${groupes.length}`, res })
    })()
    return () => { annule = true }
  }, [lignes, groupes, enCours, ids, saison])

  if (ids.length && lignes === null) return <p style={discret}>Chargement…</p>
  const effectifsValides = effectifs && effectifs.cle === `${saison}|${groupes.length}` ? effectifs.res : null
  const parEquipe = categories
    .map(c => ({ cat: c, coachs: groupes.filter(x => x.equipeId === c.id) }))
    .filter(x => x.coachs.length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SelecteurSaison saisons={saisons} valeur={saison} onChange={setSaison} />
        <span style={{ fontSize: 13, color: colors.text.faint }}>Saison {libelleSaison(saison)}{enCours ? ' (en cours)' : ''}</span>
      </div>
      {!aSaisonsPassees(saisons) && <p style={{ margin: 0, fontSize: 12, color: colors.text.faint }}>{MESSAGE_AUCUNE_SAISON_ARCHIVEE}</p>}
      {parEquipe.length === 0 ? (
        <div style={{ ...carte, textAlign: 'center', padding: 28 }}><p style={discret}>Aucun match ni séance enregistré cette saison-là.</p></div>
      ) : parEquipe.map(({ cat, coachs }) => (
        <div key={cat.id} style={carte}>
          <p style={eyebrow}>{nomEquipe(cat)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coachs.map(x => (
              <div key={x.educateurId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{noms[x.educateurId] || 'Éducateur'}</span>
                <span style={{ color: colors.text.faint }}>{x.matchs.length} match{x.matchs.length > 1 ? 's' : ''} · {x.seances} séance{x.seances > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.text.faint }}>
            {effectifsValides === null ? 'Effectif en cours de calcul…'
              : enCours ? `Effectif actuel : ${effectifsValides[cat.id] || 0} joueur${(effectifsValides[cat.id] || 0) > 1 ? 's' : ''}`
              : `Effectif : ${effectifsValides[cat.id] || 0} joueur${(effectifsValides[cat.id] || 0) > 1 ? 's' : ''} ayant des stats de match cette saison-là`}
          </p>
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>
        Une équipe sans aucun match ni séance dans la saison n'apparaît pas.
      </p>
    </div>
  )
}

// ── Vue projet sportif ──────────────────────────────────────
// Planification annuelle (par pôle), règles du jeu (par pôle) et plan annuel par
// catégorie ont une colonne saison : on les compare. Les principes de jeu n'en ont
// pas : leur historique démarrera à partir d'une première sauvegarde.
const libelleType = { preparation: 'Préparation', competition: 'Compétition', treve: 'Trêve', reprise: 'Reprise' }

function VueProjet({ clubId }) {
  const { colors, carte, eyebrow, discret, select } = useStyles()
  const isMobile = useWindowWidth() < 768
  const [data, setData] = useState(null)
  const enCours = saisonActuelle()
  const [a, setA] = useState(enCours)
  const [bChoisi, setB] = useState(null)

  useEffect(() => {
    let annule = false
    ;(async () => {
      const lire = (table) => fetchToutesLignes(() => supabase.from(table).select('*').eq('club_id', clubId).order('id'))
      const [p, r, pa] = await Promise.all([lire('planification_annuelle'), lire('regles_jeu'), lire('plan_annuel')])
      if (annule) return
      if (p.error || r.error || pa.error) { setData({ erreur: true }); return }
      setData({ planification: p.data, regles: r.data, plans: pa.data })
    })()
    return () => { annule = true }
  }, [clubId])

  // Les règles gardent la saison en texte libre (« 2026-2027 », parfois « 2026 - 2027 »).
  const normal = (s) => (s || '').replace(/\s/g, '')
  const saisons = useMemo(() => {
    if (!data || data.erreur) return []
    const set = new Set([enCours])
    ;[...data.planification, ...data.regles, ...data.plans].forEach(x => { const s = normal(x.saison); if (/^\d{4}-\d{4}$/.test(s)) set.add(s) })
    return [...set].sort().reverse().map(valeur => ({ valeur, libelle: libelleSaison(valeur), enCours: valeur === enCours }))
  }, [data, enCours])

  const b = bChoisi ?? (saisons.find(s => s.valeur !== enCours)?.valeur || '')

  if (data === null) return <p style={discret}>Chargement…</p>
  if (data.erreur) return <p style={discret}>Impossible de charger le projet sportif. Réessaie dans un instant.</p>

  const colonne = (saison) => {
    if (!saison) return <div style={carte}><p style={discret}>Choisis une saison à comparer.</p></div>
    const periodes = data.planification.filter(x => normal(x.saison) === saison)
    const regles = data.regles.filter(x => normal(x.saison) === saison)
    const plans = data.plans.filter(x => normal(x.saison) === saison)
    if (!periodes.length && !regles.length && !plans.length) {
      return <div style={carte}><p style={discret}>Rien d'enregistré pour la saison {libelleSaison(saison)}.</p></div>
    }
    const nomPole = (k) => POLES[k] ? `${POLES[k].label}${POLES[k].genre === 'feminin' ? ' féminin' : ''}` : k
    const parPole = (liste) => liste.reduce((acc, x) => { (acc[x.pole_key] ||= []).push(x); return acc }, {})
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.length > 0 && (
          <div style={carte}>
            <p style={eyebrow}>Plan annuel par catégorie</p>
            {plans.map(pl => (
              <div key={pl.id} style={{ marginBottom: 8, fontSize: 13 }}>
                <strong>{labelCategorie(pl.categorie)}</strong>
                <span style={{ color: colors.text.faint }}> · {pl.nb_seances_semaine} séance{pl.nb_seances_semaine > 1 ? 's' : ''} par semaine</span>
                {pl.projet_jeu && <div style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>{pl.projet_jeu}</div>}
              </div>
            ))}
          </div>
        )}
        {Object.entries(parPole(periodes)).map(([pole, liste]) => (
          <div key={`p-${pole}`} style={carte}>
            <p style={eyebrow}>Planification · {nomPole(pole)}</p>
            {liste.sort((x, y) => (x.date_debut || '').localeCompare(y.date_debut || '')).map(x => (
              <div key={x.id} style={{ marginBottom: 8, fontSize: 13 }}>
                <strong>{x.periode_nom}</strong>
                <span style={{ color: colors.text.faint }}> · {libelleType[x.type] || x.type}</span>
                {[['Technique', x.objectif_technique], ['Physique', x.objectif_physique], ['Mental', x.objectif_mental], ['Tactique', x.objectif_tactique]].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>{l} : {v}</div>
                ))}
              </div>
            ))}
          </div>
        ))}
        {Object.entries(parPole(regles)).map(([pole, liste]) => (
          <div key={`r-${pole}`} style={carte}>
            <p style={eyebrow}>Règles du jeu · {nomPole(pole)}</p>
            {liste.map(x => <div key={x.id} style={{ fontSize: 13, marginBottom: 4 }}>{x.titre}<span style={{ color: colors.text.faint }}> · {labelCategorie(x.categorie)}</span></div>)}
          </div>
        ))}
      </div>
    )
  }

  const choix = (valeur, onChange, etiquette) => (
    <select value={valeur || ''} onChange={e => onChange(e.target.value)} aria-label={etiquette} style={select}>
      <option value="">Choisir une saison</option>
      {saisons.map(s => <option key={s.valeur} value={s.valeur}>Saison {s.libelle}{s.enCours ? ' (en cours)' : ''}</option>)}
    </select>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!aSaisonsPassees(saisons) && <p style={{ margin: 0, fontSize: 12, color: colors.text.faint }}>{MESSAGE_AUCUNE_SAISON_ARCHIVEE} La comparaison se remplira à partir de là.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>{choix(a, setA, 'Première saison')}{colonne(a)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>{choix(b, setB, 'Seconde saison')}{colonne(b)}</div>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>
        Les principes de jeu et les zones de terrain ne sont pas rattachés à une saison : leur historique commencera à partir de leur prochaine sauvegarde.
      </p>
    </div>
  )
}
