import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'

// Audience du club, présentée comme un argument pour les sponsors : connexions à la
// plateforme, visites des pages publiques de tournois et de stages, clics sur les
// sponsors. Aucune nouvelle table : tout vient des journaux déjà alimentés
// (connexions_log via sponsors_audience_stats, tournoi_vues_log, stage_vues_log et les
// trois journaux de clics). Une source dont la migration manque s'affiche « non activé ».
// Les visites de la page publique du club ne sont pas encore comptées.

const CSS = `
  .au-chip:focus-visible, .au-tuile:focus-visible { outline: 2px solid var(--au-brand); outline-offset: 2px; }
  .au-tuiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .au-tuile { text-align: left; cursor: pointer; font-family: Inter, sans-serif; transition: border-color .12s, background .12s; }
  .au-ligne { transition: background .12s; }
  .au-ligne:hover { background: var(--au-hover); }
  @media (max-width: 960px) { .au-tuiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 520px) { .au-tuiles { grid-template-columns: 1fr; } }
`

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const cleJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const cleMois = (d) => `${d.getFullYear()}-${d.getMonth()}`
const nombre = (n) => n.toLocaleString('fr-FR')

// Saison sportive : du 1er juillet au 30 juin.
const debutSaison = (d) => new Date(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1, 6, 1)

// Lit toute une table par pages de 1000 lignes (limite de l'API), sans s'arrêter à la première page.
async function toutLire(construire) {
  let lignes = []
  for (let page = 0; page < 30; page++) {
    const { data, error } = await construire().range(page * 1000, page * 1000 + 999)
    if (error) return { error }
    lignes = lignes.concat(data || [])
    if (!data || data.length < 1000) break
  }
  return { data: lignes }
}

export default function AudienceSponsors({ clubId, couleurPrincipale }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const surBrand = colors.accent.onBrand || '#000'
  const [donnees, setDonnees] = useState(null) // null = chargement
  const [periode, setPeriode] = useState('saison0')
  const [metrique, setMetrique] = useState('connexions')
  const [survol, setSurvol] = useState(null)

  const maintenant = useMemo(() => new Date(), [])
  const saisonCourante = useMemo(() => debutSaison(maintenant), [maintenant])
  const saisonPrecedente = useMemo(() => new Date(saisonCourante.getFullYear() - 1, 6, 1), [saisonCourante])

  useEffect(() => {
    if (!clubId) return
    let annule = false
    ;(async () => {
      const depuis = saisonPrecedente.toISOString()
      const [tournoisRes, stagesRes] = await Promise.all([
        supabase.from('tournois_organises').select('id, nom, date').eq('club_id', clubId),
        supabase.from('stages').select('id, nom, date_debut').eq('club_id', clubId),
      ])
      const tournois = tournoisRes.data || []
      const stages = stagesRes.data || []
      const idsTournois = tournois.map(t => t.id)
      const idsStages = stages.map(s => s.id)

      const lireListe = async (ids, construire) => (ids.length === 0 ? { data: [] } : toutLire(construire))
      const [conn, clicsClub, vuesT, vuesS, clicsT, clicsS] = await Promise.all([
        toutLire(() => supabase.rpc('sponsors_audience_stats', { p_club_id: clubId, p_depuis: depuis })),
        toutLire(() => supabase.from('sponsor_clics_log').select('created_at').eq('club_id', clubId).gte('created_at', depuis)),
        lireListe(idsTournois, () => supabase.from('tournoi_vues_log').select('tournoi_id, created_at').in('tournoi_id', idsTournois).gte('created_at', depuis)),
        lireListe(idsStages, () => supabase.from('stage_vues_log').select('stage_id, created_at').in('stage_id', idsStages).gte('created_at', depuis)),
        lireListe(idsTournois, () => supabase.from('tournoi_sponsor_clics_log').select('tournoi_id, created_at').in('tournoi_id', idsTournois).gte('created_at', depuis)),
        lireListe(idsStages, () => supabase.from('stage_sponsor_clics_log').select('stage_id, created_at').in('stage_id', idsStages).gte('created_at', depuis)),
      ])
      if (annule) return
      // 42P01 = table absente, 42883 = fonction absente : la migration n'a pas été lancée.
      const manquant = (r) => !!r.error && ['42P01', '42883'].includes(r.error.code)
      setDonnees({
        tournois, stages,
        connexions: manquant(conn) ? null : (conn.data || []).map(l => ({ d: new Date(`${l.jour}T12:00:00`), n: Number(l.nb), role: l.role })),
        clicsClub: manquant(clicsClub) ? null : (clicsClub.data || []).map(l => ({ d: new Date(l.created_at), n: 1 })),
        vuesT: manquant(vuesT) ? null : (vuesT.data || []).map(l => ({ d: new Date(l.created_at), n: 1, id: l.tournoi_id })),
        vuesS: manquant(vuesS) ? null : (vuesS.data || []).map(l => ({ d: new Date(l.created_at), n: 1, id: l.stage_id })),
        clicsT: manquant(clicsT) ? null : (clicsT.data || []).map(l => ({ d: new Date(l.created_at), n: 1, id: l.tournoi_id })),
        clicsS: manquant(clicsS) ? null : (clicsS.data || []).map(l => ({ d: new Date(l.created_at), n: 1, id: l.stage_id })),
      })
    })()
    return () => { annule = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const anneeSaison = saisonCourante.getFullYear()
  const PERIODES = [
    { id: 'saison0', label: `Saison ${anneeSaison}/${anneeSaison + 1}` },
    { id: 'saison1', label: `Saison ${anneeSaison - 1}/${anneeSaison}` },
    { id: 'mois12', label: '12 derniers mois' },
    { id: 'jours30', label: '30 derniers jours' },
  ]

  // Intervalle [debut, fin[ et barres du graphique selon la période choisie.
  const { debut, fin, barres } = useMemo(() => {
    const auj = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
    if (periode === 'jours30') {
      const liste = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - i)
        liste.push({ cle: cleJour(d), label: String(d.getDate()), detail: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) })
      }
      return { debut: new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - 29), fin: new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1), barres: liste, parJour: true }
    }
    const premier = periode === 'saison0' ? saisonCourante : periode === 'saison1' ? saisonPrecedente : new Date(auj.getFullYear(), auj.getMonth() - 11, 1)
    const liste = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(premier.getFullYear(), premier.getMonth() + i, 1)
      liste.push({ cle: cleMois(d), label: MOIS_COURTS[d.getMonth()], detail: `${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}` })
    }
    return { debut: premier, fin: new Date(premier.getFullYear(), premier.getMonth() + 12, 1), barres: liste, parJour: false }
  }, [periode, maintenant, saisonCourante, saisonPrecedente])
  const parJour = periode === 'jours30'

  if (donnees === null) return <p style={{ color: colors.text.faint, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Chargement de l'audience…</p>

  const clicsTous = (donnees.clicsClub || []).concat(donnees.clicsT || [], donnees.clicsS || [])
  const sources = [
    { id: 'connexions', titre: 'Connexions', sous: 'ouvertures de la plateforme', couleur: accent, lignes: donnees.connexions },
    { id: 'tournois', titre: 'Visites tournois', sous: 'pages publiques', couleur: colors.accent.blue || accent, lignes: donnees.vuesT },
    { id: 'stages', titre: 'Visites stages', sous: 'pages publiques', couleur: colors.accent.amber || accent, lignes: donnees.vuesS },
    { id: 'clics', titre: 'Clics sponsors', sous: 'bandeau, tournois, stages', couleur: colors.accent.purpleLight || accent, lignes: donnees.clicsClub === null && donnees.clicsT === null && donnees.clicsS === null ? null : clicsTous },
  ]
  const dans = (lignes, a, b) => (lignes || []).filter(l => l.d >= a && l.d < b)
  const somme = (lignes) => lignes.reduce((s, l) => s + l.n, 0)
  const totalSource = (s) => (s.lignes === null ? null : somme(dans(s.lignes, debut, fin)))
  const debutPrecedent = new Date(saisonPrecedente)
  const finPrecedent = saisonCourante

  const choisie = sources.find(s => s.id === metrique) || sources[0]
  const valeursBarres = barres.map(b => {
    const lignes = choisie.lignes === null ? [] : dans(choisie.lignes, debut, fin)
    return somme(lignes.filter(l => (parJour ? cleJour(l.d) : cleMois(l.d)) === b.cle))
  })

  // Détail des connexions par rôle sur la période.
  const connexionsParRole = (donnees.connexions || []).filter(l => l.d >= debut && l.d < fin)
    .reduce((acc, l) => { acc[l.role] = (acc[l.role] || 0) + l.n; return acc }, {})

  // Détail par événement (tournois et stages) sur la période.
  const evenements = [
    ...donnees.tournois.map(t => ({ type: 'Tournoi', id: t.id, nom: t.nom, vues: dans((donnees.vuesT || []).filter(v => v.id === t.id), debut, fin).length, clics: dans((donnees.clicsT || []).filter(v => v.id === t.id), debut, fin).length })),
    ...donnees.stages.map(s => ({ type: 'Stage', id: s.id, nom: s.nom, vues: dans((donnees.vuesS || []).filter(v => v.id === s.id), debut, fin).length, clics: dans((donnees.clicsS || []).filter(v => v.id === s.id), debut, fin).length })),
  ].filter(e => e.vues > 0 || e.clics > 0).sort((a, b) => b.vues - a.vues)

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 16, padding: 20, boxSizing: 'border-box' }

  // Graphique : barres fines, une seule échelle, tooltip au survol.
  const L = 640, H = 220, g = { gauche: 38, droite: 8, haut: 12, bas: 28 }
  const max = Math.max(...valeursBarres, 0)
  const pas = max <= 4 ? 1 : Math.pow(10, Math.floor(Math.log10(max / 3)))
  const unite = [1, 2, 5, 10].map(m => m * pas).find(p => max / p <= 4) || pas * 10
  const sommet = Math.max(unite, Math.ceil(max / unite) * unite)
  const graduations = []
  for (let v = 0; v <= sommet; v += unite) graduations.push(v)
  const largeurCase = (L - g.gauche - g.droite) / barres.length
  const largeurBarre = Math.min(24, largeurCase * 0.6)
  const yDe = (v) => g.haut + (H - g.haut - g.bas) * (1 - v / sommet)

  const aucuneDonnee = sources.every(s => s.lignes === null || totalSource(s) === 0)

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: colors.text.primary, '--au-brand': accent, '--au-hover': colors.background.sunken }}>
      <style>{CSS}</style>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Audience & valeur pour les sponsors</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: colors.text.secondary, lineHeight: 1.5, maxWidth: 680 }}>
          Ce que le club offre en visibilité : à chaque connexion et à chaque visite de page publique, les sponsors du club sont affichés. Ces chiffres sont réels et comptés automatiquement.
        </p>
      </div>

      <div role="tablist" aria-label="Période" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PERIODES.map(p => {
          const actif = periode === p.id
          return (
            <button key={p.id} className="au-chip" role="tab" aria-selected={actif} onClick={() => setPeriode(p.id)}
              style={{ padding: '8px 16px', minHeight: 40, borderRadius: 999, border: `1px solid ${actif ? accent : colors.border.subtle}`, background: actif ? accent : 'transparent', color: actif ? surBrand : colors.text.secondary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="au-tuiles" style={{ marginBottom: 16 }}>
        {sources.map(s => {
          const total = totalSource(s)
          const actif = metrique === s.id
          const precedent = (periode === 'saison0' && s.lignes !== null) ? somme(dans(s.lignes, debutPrecedent, finPrecedent)) : null
          return (
            <button key={s.id} type="button" className="au-tuile" aria-pressed={actif} onClick={() => setMetrique(s.id)}
              style={{ ...carte, padding: 16, borderColor: actif ? s.couleur : colors.border.subtle, borderWidth: actif ? 2 : 1, borderStyle: 'solid', color: colors.text.primary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: colors.text.secondary }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: s.couleur }} />{s.titre}
              </span>
              <span style={{ display: 'block', margin: '8px 0 2px', fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{total === null ? 'Non activé' : nombre(total)}</span>
              <span style={{ display: 'block', fontSize: 12, color: colors.text.faint }}>{s.sous}</span>
              {precedent !== null && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: colors.text.faint }}>Saison précédente : {nombre(precedent)}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ ...carte, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{choisie.titre} {parJour ? 'par jour' : 'par mois'}</h3>
          {choisie.id === 'connexions' && (connexionsParRole.club || connexionsParRole.educateur || connexionsParRole.joueur) ? (
            <span style={{ fontSize: 12, color: colors.text.faint }}>
              Éducateurs {nombre(connexionsParRole.educateur || 0)} · Joueurs {nombre(connexionsParRole.joueur || 0)} · Club {nombre(connexionsParRole.club || 0)}
            </span>
          ) : null}
        </div>
        {choisie.lignes === null ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Cette mesure n'est pas encore activée sur la base du club.</p>
        ) : (
          <div style={{ position: 'relative' }} onMouseLeave={() => setSurvol(null)}>
            <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label={`${choisie.titre} ${parJour ? 'par jour' : 'par mois'}`} style={{ display: 'block', overflow: 'visible' }}>
              {graduations.map(v => (
                <g key={v}>
                  <line x1={g.gauche} x2={L - g.droite} y1={yDe(v)} y2={yDe(v)} stroke={colors.border.subtle} strokeWidth="1" />
                  <text x={g.gauche - 8} y={yDe(v) + 4} textAnchor="end" fontSize="11" fill={colors.text.faint}>{nombre(v)}</text>
                </g>
              ))}
              {barres.map((b, i) => {
                const v = valeursBarres[i]
                const x = g.gauche + largeurCase * i + (largeurCase - largeurBarre) / 2
                const h = v > 0 ? Math.max(3, yDe(0) - yDe(v)) : 0
                const afficherLabel = !parJour || i % 5 === 4 || i === 0
                return (
                  <g key={b.cle}>
                    {survol === i && <rect x={g.gauche + largeurCase * i} y={g.haut} width={largeurCase} height={H - g.haut - g.bas} fill={colors.background.sunken} opacity="0.7" />}
                    {h > 0 && <path d={`M${x},${yDe(0)} V${yDe(0) - h + 4} Q${x},${yDe(0) - h} ${x + 4},${yDe(0) - h} H${x + largeurBarre - 4} Q${x + largeurBarre},${yDe(0) - h} ${x + largeurBarre},${yDe(0) - h + 4} V${yDe(0)} Z`} fill={choisie.couleur} />}
                    {afficherLabel && <text x={x + largeurBarre / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={colors.text.faint}>{b.label}</text>}
                    <rect x={g.gauche + largeurCase * i} y={g.haut} width={largeurCase} height={H - g.haut - g.bas} fill="transparent"
                      onMouseEnter={() => setSurvol(i)} onTouchStart={() => setSurvol(i)} />
                  </g>
                )
              })}
            </svg>
            {survol !== null && (
              <div role="status" style={{ position: 'absolute', top: 0, left: `${Math.min(80, Math.max(0, ((g.gauche + largeurCase * (survol + 0.5)) / L) * 100))}%`, transform: 'translateX(-50%)', pointerEvents: 'none', background: colors.background.raised || colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                <span style={{ display: 'block', color: colors.text.faint }}>{barres[survol].detail}</span>
                <span style={{ fontWeight: 800 }}>{nombre(valeursBarres[survol])}</span> <span style={{ color: colors.text.secondary }}>{choisie.titre.toLowerCase()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ ...carte, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Par tournoi et par stage</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text.faint }}>Visites de la page publique et clics sur les sponsors, sur la période choisie.</p>
        {evenements.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>Aucune visite enregistrée sur cette période.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>{['Événement', 'Visites', 'Clics sponsors'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {evenements.map(e => (
                  <tr key={`${e.type}-${e.id}`} className="au-ligne">
                    <td style={{ padding: '10px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.text.faint, marginRight: 8, textTransform: 'uppercase' }}>{e.type}</span>{e.nom}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, borderBottom: `1px solid ${colors.border.subtle}` }}>{nombre(e.vues)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: `1px solid ${colors.border.subtle}` }}>{nombre(e.clics)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...carte, padding: 16, fontSize: 13, color: colors.text.secondary, lineHeight: 1.6 }}>
        <strong style={{ color: colors.text.primary }}>Comment lire ces chiffres.</strong> Une connexion est une ouverture de la plateforme par un éducateur, un joueur ou le club, pas une personne différente. Une visite est une ouverture de la page publique d'un tournoi ou d'un stage. Les chiffres commencent le jour où chaque mesure a été activée.
        {aucuneDonnee && <> Rien n'est encore enregistré sur cette période.</>}
        {' '}Les visites de la page publique du club ne sont pas encore comptées.
      </div>
    </div>
  )
}
