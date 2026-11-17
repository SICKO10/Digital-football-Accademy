import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import DossierSponsorPDF from './DossierSponsorPDF'
import { styleCarte, styleChamp, styleTableau, styleEtiquette, styleBoutonPrincipal, CLASSE_BOUTON, CLASSE_CHAMP, CLASSE_CLIQUABLE } from '../../lib/identite'
import { styleMontant } from '../../lib/identiteFinance'
import { police, forme } from '../../tokens'
import { TitreEcran, Etiquette } from '../identite'
import { GroupeChoix } from './UiFinance'

// Audience du club, présentée comme un argument pour les sponsors : connexions à la
// plateforme, visites des pages publiques de tournois et de stages, clics sur les
// sponsors. Aucune nouvelle table : tout vient des journaux déjà alimentés
// (connexions_log via sponsors_audience_stats, tournoi_vues_log, stage_vues_log et les
// trois journaux de clics). Une source dont la migration manque s'affiche « non activé ».
// Les visites de la page publique du club viennent de club_vues_log (supabase_club_vues_page_publique.sql).

const CSS = `
  .au-tuiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .au-tuile { text-align: left; cursor: pointer; font-family: Barlow, sans-serif; }
  .au-ligne:hover { background: var(--au-hover); }
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

export default function AudienceSponsors({ clubId, couleurPrincipale, club }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const [donnees, setDonnees] = useState(null) // null = chargement
  const [periode, setPeriode] = useState('saison0')
  const [metrique, setMetrique] = useState('connexions')
  const [survol, setSurvol] = useState(null)
  const [contact, setContact] = useState('')
  const [enCours, setExport] = useState(false)
  const pdfRef = useRef(null)

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
      const [conn, vuesClub, clicsClub, vuesT, vuesS, clicsT, clicsS] = await Promise.all([
        toutLire(() => supabase.rpc('sponsors_audience_stats', { p_club_id: clubId, p_depuis: depuis })),
        toutLire(() => supabase.from('club_vues_log').select('created_at').eq('club_id', clubId).gte('created_at', depuis)),
        toutLire(() => supabase.from('sponsor_clics_log').select('created_at').eq('club_id', clubId).gte('created_at', depuis)),
        lireListe(idsTournois, () => supabase.from('tournoi_vues_log').select('tournoi_id, created_at').in('tournoi_id', idsTournois).gte('created_at', depuis)),
        lireListe(idsStages, () => supabase.from('stage_vues_log').select('stage_id, created_at').in('stage_id', idsStages).gte('created_at', depuis)),
        lireListe(idsTournois, () => supabase.from('tournoi_sponsor_clics_log').select('tournoi_id, created_at').in('tournoi_id', idsTournois).gte('created_at', depuis)),
        lireListe(idsStages, () => supabase.from('stage_sponsor_clics_log').select('stage_id, created_at').in('stage_id', idsStages).gte('created_at', depuis)),
      ])
      if (annule) return
      // 42P01 = table absente, 42883 = fonction absente, 42501 = lecture refusée : la migration
      // n'a pas été lancée. Mieux vaut « Non activé » qu'un faux zéro.
      const manquant = (r) => !!r.error && ['42P01', '42883', '42501'].includes(r.error.code)
      setDonnees({
        tournois, stages,
        connexions: manquant(conn) ? null : (conn.data || []).map(l => ({ d: new Date(`${l.jour}T12:00:00`), n: Number(l.nb), role: l.role })),
        vuesClub: manquant(vuesClub) ? null : (vuesClub.data || []).map(l => ({ d: new Date(l.created_at), n: 1 })),
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

  if (donnees === null) return <p style={{ color: colors.text.secondary, fontSize: 14, fontFamily: 'Barlow, sans-serif' }}>Chargement de l'audience…</p>

  const clicsTous = (donnees.clicsClub || []).concat(donnees.clicsT || [], donnees.clicsS || [])
  const sources = [
    { id: 'connexions', titre: 'Connexions', sous: 'ouvertures de la plateforme', couleur: accent, lignes: donnees.connexions },
    { id: 'club', titre: 'Visites page club', sous: 'page publique du club', couleur: colors.accent.red || accent, lignes: donnees.vuesClub },
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

  const carte = { ...styleCarte(colors), padding: 20 }
  const tb = styleTableau(colors)

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

  // Dossier sponsor : une page A4 en PDF, avec les sources activées et leurs chiffres sur la période choisie.
  const valeursDe = (source) => barres.map(b => somme(dans(source.lignes, debut, fin).filter(l => (parJour ? cleJour(l.d) : cleMois(l.d)) === b.cle)))
  const sourcesActives = sources.filter(s => s.lignes !== null)
  const sourcePrincipale = sourcesActives[0]
  const totalVues = (id) => totalSource(sources.find(s => s.id === id)) || 0
  const apparitions = [
    ...(sourcesActives.some(s => s.id === 'connexions') ? ['Un bandeau partenaires affiché dans l\'application, chez les éducateurs et les joueurs du club'] : []),
    ...(totalVues('tournois') > 0 ? ['Un espace partenaires sur la page publique de chaque tournoi organisé par le club'] : []),
    ...(totalVues('stages') > 0 ? ['Un espace partenaires sur la page publique de chaque stage organisé par le club'] : []),
  ]
  const periodeLabel = PERIODES.find(p => p.id === periode)?.label || ''
  const exporterPDF = async () => {
    if (!pdfRef.current) return
    setExport(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 794 })
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
      const nom = (club?.club || 'club').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      pdf.save(`dossier-sponsor-${nom || 'club'}-${periode}.pdf`)
    } catch (e) {
      console.error('Erreur export dossier sponsor:', e)
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setExport(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Barlow, sans-serif', color: colors.text.primary, '--au-brand': accent, '--au-hover': colors.background.sunken }}>
      <style>{CSS}</style>

      <TitreEcran as="h2" titre="Audience & valeur pour les sponsors"
        sousTitre="Ce que le club offre en visibilité : à chaque connexion et à chaque visite de page publique, les sponsors du club sont affichés. Ces chiffres sont réels et comptés automatiquement." />

      <div style={{ ...carte, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontFamily: police.titre, fontSize: 20, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Dossier sponsor en PDF</div>
          <p style={{ margin: '4px 0 10px', fontSize: 14, color: colors.text.secondary, lineHeight: 1.5 }}>Une page aux couleurs du club avec les chiffres de la période choisie, à joindre à vos propositions.</p>
          <label htmlFor="au-contact" style={{ ...styleEtiquette(colors), display: 'block', marginBottom: 6 }}>Contact affiché en bas de page (facultatif)</label>
          <textarea id="au-contact" value={contact} onChange={e => setContact(e.target.value.slice(0, 160))} rows={2} placeholder={'Prénom Nom, fonction\nemail ou téléphone'} className={CLASSE_CHAMP}
            style={{ ...styleChamp(colors), resize: 'vertical' }} />
        </div>
        <button type="button" className={CLASSE_BOUTON} onClick={exporterPDF} disabled={enCours || aucuneDonnee}
          style={{ ...styleBoutonPrincipal(colors), minHeight: 44, padding: '0 20px' }}>
          {enCours ? 'Création du PDF…' : 'Exporter le dossier sponsor'}
        </button>
        {aucuneDonnee && <p style={{ flexBasis: '100%', margin: 0, fontSize: 13, color: colors.text.secondary }}>Rien n'est encore enregistré sur cette période : choisis une autre période pour exporter.</p>}
      </div>

      <GroupeChoix libelle="Période" choix={PERIODES.map(p => ({ id: p.id, label: p.label }))} valeur={periode} onChoisir={setPeriode} style={{ marginBottom: 16 }} />

      <div className="au-tuiles" style={{ marginBottom: 16 }}>
        {sources.map(s => {
          const total = totalSource(s)
          const actif = metrique === s.id
          const precedent = (periode === 'saison0' && s.lignes !== null) ? somme(dans(s.lignes, debutPrecedent, finPrecedent)) : null
          return (
            <button key={s.id} type="button" className={`au-tuile ${CLASSE_CLIQUABLE}`} aria-pressed={actif} onClick={() => setMetrique(s.id)}
              style={{ ...carte, padding: actif ? '16px 16px 16px 19px' : 16, borderColor: actif ? colors.border.strong : undefined, boxShadow: actif ? `inset ${forme.lisere} 0 0 ${s.couleur}` : 'none', color: colors.text.primary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 1, background: s.couleur, flexShrink: 0 }} />
                <Etiquette>{s.titre}</Etiquette>
              </span>
              <span style={{ ...styleMontant(colors, total === null ? 22 : 40), display: 'block', margin: '10px 0 4px', textTransform: total === null ? 'uppercase' : 'none' }}>{total === null ? 'Non activé' : nombre(total)}</span>
              <span style={{ display: 'block', fontSize: 13, color: colors.text.secondary }}>{s.sous}</span>
              {precedent !== null && <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: colors.text.secondary }}>Saison précédente : {nombre(precedent)}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ ...carte, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontFamily: police.titre, fontSize: 20, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{choisie.titre} {parJour ? 'par jour' : 'par mois'}</h3>
          {choisie.id === 'connexions' && (connexionsParRole.club || connexionsParRole.educateur || connexionsParRole.joueur) ? (
            <span style={{ fontSize: 13, color: colors.text.secondary }}>
              Éducateurs {nombre(connexionsParRole.educateur || 0)} · Joueurs {nombre(connexionsParRole.joueur || 0)} · Club {nombre(connexionsParRole.club || 0)}
            </span>
          ) : null}
        </div>
        {choisie.lignes === null ? (
          <p style={{ margin: 0, fontSize: 14, color: colors.text.secondary }}>Cette mesure n'est pas encore activée sur la base du club.</p>
        ) : (
          <div style={{ position: 'relative' }} onMouseLeave={() => setSurvol(null)}>
            <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label={`${choisie.titre} ${parJour ? 'par jour' : 'par mois'}`} style={{ display: 'block', overflow: 'visible' }}>
              {graduations.map(v => (
                <g key={v}>
                  <line x1={g.gauche} x2={L - g.droite} y1={yDe(v)} y2={yDe(v)} stroke={colors.border.subtle} strokeWidth="1" />
                  <text x={g.gauche - 8} y={yDe(v) + 4} textAnchor="end" fontSize="11" fill={colors.text.secondary}>{nombre(v)}</text>
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
                    {h > 0 && <rect x={x} y={yDe(0) - h} width={largeurBarre} height={h} rx="1" fill={choisie.couleur} />}
                    {afficherLabel && <text x={x + largeurBarre / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={colors.text.secondary}>{b.label}</text>}
                    <rect x={g.gauche + largeurCase * i} y={g.haut} width={largeurCase} height={H - g.haut - g.bas} fill="transparent"
                      onMouseEnter={() => setSurvol(i)} onTouchStart={() => setSurvol(i)} />
                  </g>
                )
              })}
            </svg>
            {survol !== null && (
              <div role="status" style={{ position: 'absolute', top: 0, left: `${Math.min(80, Math.max(0, ((g.gauche + largeurCase * (survol + 0.5)) / L) * 100))}%`, transform: 'translateX(-50%)', pointerEvents: 'none', background: colors.background.raised || colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                <span style={{ display: 'block', color: colors.text.secondary }}>{barres[survol].detail}</span>
                <span style={styleMontant(colors, 17)}>{nombre(valeursBarres[survol])}</span> <span style={{ color: colors.text.secondary }}>{choisie.titre.toLowerCase()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ ...carte, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: police.titre, fontSize: 20, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Par tournoi et par stage</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: colors.text.secondary }}>Visites de la page publique et clics sur les sponsors, sur la période choisie.</p>
        {evenements.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: colors.text.secondary }}>Aucune visite enregistrée sur cette période.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tb.tableau}>
              <thead>
                <tr>{['Événement', 'Visites', 'Clics sponsors'].map((h, i) => (
                  <th key={h} scope="col" style={i === 0 ? tb.entete : tb.enteteChiffre}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {evenements.map(e => (
                  <tr key={`${e.type}-${e.id}`} className="au-ligne">
                    <td style={tb.cellule}>
                      <Etiquette style={{ marginRight: 8 }}>{e.type}</Etiquette>{e.nom}
                    </td>
                    <td style={{ ...tb.celluleChiffre, fontWeight: 700 }}>{nombre(e.vues)}</td>
                    <td style={tb.celluleChiffre}>{nombre(e.clics)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...carte, padding: 16, fontSize: 14, color: colors.text.secondary, lineHeight: 1.6 }}>
        <strong style={{ color: colors.text.primary }}>Comment lire ces chiffres.</strong> Une connexion est une ouverture de la plateforme par un éducateur, un joueur ou le club, pas une personne différente. Une visite est une ouverture de la page publique du club, d'un tournoi ou d'un stage (une seule par session de navigation). Les chiffres commencent le jour où chaque mesure a été activée.
        {aucuneDonnee && <> Rien n'est encore enregistré sur cette période.</>}
      </div>

      {/* Page A4 capturée pour le PDF : montée hors écran, pas masquée, pour une mise en page déjà stable à l'export. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0 }}>
        <DossierSponsorPDF ref={pdfRef} club={club} couleur={accent} periodeLabel={periodeLabel}
          tuiles={sourcesActives.map(s => ({ id: s.id, titre: s.titre, sous: s.sous, couleur: s.couleur, total: totalSource(s) || 0 }))}
          graphique={sourcePrincipale ? { titre: `${sourcePrincipale.titre} ${parJour ? 'par jour' : 'par mois'}`, barres, valeurs: valeursDe(sourcePrincipale), couleur: sourcePrincipale.couleur, parJour } : null}
          roles={sourcePrincipale?.id === 'connexions' ? connexionsParRole : null}
          evenements={evenements} apparitions={apparitions} contact={contact.trim()}
          dateTexte={maintenant.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </div>
    </div>
  )
}
