import { useState, useMemo } from 'react'
import { alpha } from '../tokens'
import { useColors } from '../lib/theme'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { saisonActuelle, filtrerParSaison } from '../lib/saison'

const NATURES_BUT = [
  { value: 'cpa', label: 'CPA' },
  { value: 'attaque_placee', label: 'Attaque placée' },
  { value: 'attaque_rapide', label: 'Attaque rapide' },
  { value: 'erreur_individuelle', label: 'Erreur individuelle' },
  { value: 'exploit_personnel', label: 'Exploit personnel' },
]

const COTES_BUT = [
  { value: 'gauche', label: 'Gauche' },
  { value: 'centre', label: 'Centre' },
  { value: 'droite', label: 'Droite' },
]

// Un seul graphique en ligne (quart d'heure) ou en barres (nature/côté),
// couleur unique — remplace les anciens graphiques marqués+encaissés
// superposés, moins lisibles à deux séries sur la même échelle.
function GraphiqueLigne({ data, color, colors }) {
  const W = 500, H = 70, pad = 20
  const n = data.length
  const max = Math.max(...data.map(d => d.valeur), 1)
  const x = i => pad + (i / (n - 1)) * (W - pad * 2)
  const y = v => H - 8 - (v / max) * (H - 20)
  const pts = data.map((d, i) => `${x(i)},${y(d.valeur)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
      {[0.5, 1].map(t => (
        <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke={colors.border.subtle} strokeWidth="1" />
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.valeur)} r="4" fill={color} />
          {d.valeur > 0 && <text x={x(i)} y={y(d.valeur) - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">{d.valeur}</text>}
          <text x={x(i)} y={H} textAnchor="middle" fill={colors.text.faint} fontSize="9">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

function BarresHorizontales({ data, color, colors }) {
  const max = Math.max(...data.map(d => d.valeur), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: colors.text.secondary }}>{d.label}</span>
            <span style={{ fontSize: 11, color: colors.text.faint }}>{d.valeur}</span>
          </div>
          <div style={{ height: 6, background: colors.background.base, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.valeur / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stats d'équipe calculées uniquement à partir de matchs_equipe
// (score_nous/score_eux/domicile/competition) — aucune nouvelle table.
// "Buts par quart d'heure" et "premier à marquer" ne sont volontairement
// pas implémentés : ça demanderait de savoir À QUELLE MINUTE chaque but a
// été marqué, une donnée que rien dans l'app ne capture aujourd'hui (ni
// matchs_equipe, ni stats_match qui n'a que des totaux par joueur) — les
// construire aurait affiché une section vide en permanence.
//
// Composant purement présentationnel : reçoit les matchs déjà chargés par
// l'appelant (DashboardJoueur.jsx fait sa propre requête matchs_equipe par
// éducateur affilié ; DashboardClub.jsx réutilise clubMatchs[categorieActive],
// déjà chargé pour l'onglet Classements — pas de requête dupliquée).
//
// masquerVND : DashboardClub.jsx affiche déjà victoires/nuls/défaites +
// clean sheets dans l'onglet Classements existant — évite de les répéter
// une seconde fois juste en dessous.
// noteEquipe (optionnel) : { moyenne, nb } — moyenne des notations_match d'équipe
// (est_note_equipe=true), calculée par l'appelant. Seul DashboardEducateur.jsx la
// passe : c'est l'éducateur qui note ses propres matchs, cette donnée n'existe pas
// côté DashboardJoueur.jsx/DashboardClub.jsx qui réutilisent aussi ce composant.
export default function StatsEquipe({ matchs: tousMatchs = [], masquerVND = false, noteEquipe = null, saison = saisonActuelle() }) {
  // Seuls les matchs de la saison demandée (en cours par défaut) comptent.
  const matchs = useMemo(() => filtrerParSaison(tousMatchs, saison), [tousMatchs, saison])
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [filtreCompetition, setFiltreCompetition] = useState('all')
  const [filtreLieu, setFiltreLieu] = useState('all')

  const competitionsDisponibles = useMemo(
    () => [...new Set(matchs.map(m => m.competition).filter(Boolean))],
    [matchs]
  )

  const matchsJoues = useMemo(() => matchs
    .filter(m => m.score_nous !== null && m.score_nous !== '' && m.score_eux !== null && m.score_eux !== '')
    .filter(m => filtreCompetition === 'all' || m.competition === filtreCompetition)
    .filter(m => filtreLieu === 'all' || (filtreLieu === 'domicile' ? m.domicile : !m.domicile))
    .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [matchs, filtreCompetition, filtreLieu]
  )

  const total = matchsJoues.length

  const avecResultat = matchsJoues.map(m => {
    const bp = parseInt(m.score_nous) || 0, bc = parseInt(m.score_eux) || 0
    return { ...m, bp, bc, resultat: bp > bc ? 'victoire' : bp < bc ? 'defaite' : 'nul' }
  })

  const v = avecResultat.filter(m => m.resultat === 'victoire').length
  const n = avecResultat.filter(m => m.resultat === 'nul').length
  const d = avecResultat.filter(m => m.resultat === 'defaite').length
  const butsP = avecResultat.reduce((s, m) => s + m.bp, 0)
  const butsE = avecResultat.reduce((s, m) => s + m.bc, 0)
  const cleanSheets = avecResultat.filter(m => m.bc === 0).length

  const dom = avecResultat.filter(m => m.domicile)
  const ext = avecResultat.filter(m => !m.domicile)
  const pctVictoire = (liste) => liste.length ? Math.round(liste.filter(m => m.resultat === 'victoire').length / liste.length * 100) : null

  // Buts par quart d'heure — alimenté par matchs_equipe.buts_detail (minute extraite
  // par le scanner IA de feuille de match). Absent tant qu'aucun match n'a été scanné
  // avec des minutes lisibles : la section reste cachée plutôt que d'afficher un
  // graphique à zéro partout.
  const butsAvecMinute = avecResultat.flatMap(m => (m.buts_detail || []).filter(b => typeof b.minute === 'number'))
  const quartsGraphique = [0, 1, 2, 3, 4, 5].map(idx => {
    const minDebut = idx * 15
    const minFin = idx === 5 ? 999 : (idx + 1) * 15
    const butsQuart = butsAvecMinute.filter(b => b.minute >= minDebut && b.minute < minFin)
    return {
      label: idx === 5 ? "75-90'+" : `${minDebut}-${minFin}'`,
      marques: butsQuart.filter(b => b.equipe === 'nous').length,
      encaisses: butsQuart.filter(b => b.equipe === 'eux').length,
    }
  })

  // Buts par nature — même source (matchs_equipe.buts_detail) que le graphique
  // par quart d'heure, mais sur le champ "nature" (saisi à la main dans la
  // modale "Marquer comme joué" côté éducateur, cf. DashboardEducateur.jsx).
  // Caché tant qu'aucun but n'a de nature renseignée, même logique que
  // butsAvecMinute plus haut.
  const butsAvecNature = avecResultat.flatMap(m => (m.buts_detail || []).filter(b => b.nature))
  const natureGraphique = NATURES_BUT.map(n => {
    const butsNature = butsAvecNature.filter(b => b.nature === n.value)
    return {
      label: n.label,
      marques: butsNature.filter(b => b.equipe === 'nous').length,
      encaisses: butsNature.filter(b => b.equipe === 'eux').length,
    }
  }).filter(n => n.marques > 0 || n.encaisses > 0)

  // Buts par côté (gauche/centre/droite) — même source (buts_detail.cote),
  // saisi à la main dans la même modale que la nature. Caché tant qu'aucun
  // but n'a de côté renseigné, même logique que les deux graphiques ci-dessus.
  const butsAvecCote = avecResultat.flatMap(m => (m.buts_detail || []).filter(b => b.cote))
  const coteGraphique = COTES_BUT.map(c => {
    const butsCote = butsAvecCote.filter(b => b.cote === c.value)
    return {
      label: c.label,
      marques: butsCote.filter(b => b.equipe === 'nous').length,
      encaisses: butsCote.filter(b => b.equipe === 'eux').length,
    }
  }).filter(c => c.marques > 0 || c.encaisses > 0)

  const forme = avecResultat.slice(0, 5)
  const serie = (() => {
    if (!forme.length) return null
    const premier = forme[0].resultat
    let count = 0
    for (const m of forme) { if (m.resultat === premier) count++; else break }
    if (count < 2) return null
    const labels = { victoire: 'victoire', nul: 'match nul', defaite: 'défaite' }
    return `${count} ${labels[premier]}s de suite`
  })()

  const pct = (n, t) => t > 0 ? Math.round(n / t * 100) : 0

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: isMobile ? '14px' : '16px 18px', minWidth: 0 }
  const chip = (active, c) => ({ padding: '6px 14px', borderRadius: '16px', border: `1px solid ${active ? c : colors.border.default}`, cursor: 'pointer', fontSize: '12px', background: active ? c + alpha.subtle : 'transparent', color: active ? c : colors.text.faint, fontWeight: active ? 700 : 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' })
  const eyebrow = (texte, couleur) => (
    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>
      {couleur && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: couleur, flexShrink: 0 }} />}
      {texte}
    </p>
  )
  const couleurResultat = r => r === 'victoire' ? colors.accent.green : r === 'nul' ? colors.accent.amber : colors.accent.red
  const couleurNote = noteEquipe ? (noteEquipe.moyenne >= 7 ? colors.accent.green : noteEquipe.moyenne >= 5 ? colors.accent.amber : colors.accent.red) : null
  // Barre V/N/D empilée (proportions), réutilisée pour le bilan global et
  // pour domicile/extérieur.
  const barreVND = (vv, nn, dd, hauteur = 6) => {
    const t = vv + nn + dd
    return (
      <div style={{ display: 'flex', height: hauteur, borderRadius: hauteur, overflow: 'hidden', background: colors.background.base, gap: t ? '2px' : 0 }}>
        {[[vv, colors.accent.green], [nn, colors.accent.amber], [dd, colors.accent.red]].map(([val, c], i) => val > 0 && <div key={i} style={{ width: `${(val / t) * 100}%`, background: c }} />)}
      </div>
    )
  }
  const kpi = ({ label, valeur, unite, detail, couleur }) => (
    <div key={label} style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }}>{label}</p>
      <p style={{ margin: 0, fontSize: isMobile ? '24px' : '28px', fontWeight: 800, lineHeight: 1, color: couleur, fontVariantNumeric: 'tabular-nums' }}>
        {valeur}{unite && <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text.faint, marginLeft: '3px' }}>{unite}</span>}
      </p>
      {detail && <div style={{ fontSize: '12px', color: colors.text.faint }}>{detail}</div>}
    </div>
  )
  const diff = butsP - butsE

  if (matchs.length === 0) {
    return <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '20px' }}>Aucun match enregistré pour l'instant.</p>
  }

  // Analyses détaillées des buts : chaque ligne met côte à côte marqués
  // (vert) et encaissés (rouge) sur la même mesure, pour comparer d'un coup
  // d'œil. Une ligne n'apparaît que si la donnée existe (cf. calculs plus haut).
  const analyses = [
    butsAvecMinute.length > 0 && {
      titre: "Par quart d'heure",
      rendu: cle => <GraphiqueLigne data={quartsGraphique.map(q => ({ label: q.label, valeur: q[cle] }))} color={cle === 'marques' ? colors.accent.green : colors.accent.red} colors={colors} />,
    },
    natureGraphique.length > 0 && {
      titre: 'Par nature',
      rendu: cle => <BarresHorizontales data={natureGraphique.filter(x => x[cle] > 0).map(x => ({ label: x.label, valeur: x[cle] }))} color={cle === 'marques' ? colors.accent.green : colors.accent.red} colors={colors} />,
    },
    coteGraphique.length > 0 && {
      titre: 'Par côté',
      rendu: cle => <BarresHorizontales data={coteGraphique.filter(x => x[cle] > 0).map(x => ({ label: x.label, valeur: x[cle] }))} color={cle === 'marques' ? colors.accent.green : colors.accent.red} colors={colors} />,
    },
  ].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '18px' }}>
      {/* Filtres : compétition à gauche, lieu à droite */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {competitionsDisponibles.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFiltreCompetition('all')} style={chip(filtreCompetition === 'all', colors.accent.green)}>Toutes compétitions</button>
            {competitionsDisponibles.map(c => (
              <button key={c} onClick={() => setFiltreCompetition(c)} style={chip(filtreCompetition === c, colors.accent.green)}>{c}</button>
            ))}
          </div>
        )}
        <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'inline-flex', padding: '3px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
          {[{ k: 'all', l: 'Tout' }, { k: 'domicile', l: 'Domicile' }, { k: 'exterieur', l: 'Extérieur' }].map(f => (
            <button key={f.k} onClick={() => setFiltreLieu(f.k)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: filtreLieu === f.k ? 700 : 500, fontFamily: 'Inter, sans-serif', background: filtreLieu === f.k ? colors.background.raised : 'transparent', color: filtreLieu === f.k ? colors.text.primary : colors.text.faint }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div style={{ ...carte, textAlign: 'center', padding: '28px' }}>
          <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Aucun match joué avec ces filtres.</p>
        </div>
      ) : (
        <>
          {/* Chiffres clés */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {noteEquipe && kpi({ label: 'Note équipe', valeur: noteEquipe.moyenne, unite: '/10', couleur: couleurNote, detail: `${noteEquipe.nb} match${noteEquipe.nb > 1 ? 's' : ''} évalué${noteEquipe.nb > 1 ? 's' : ''}` })}
            {!masquerVND && kpi({
              label: 'Bilan', valeur: `${pct(v, total)}%`, unite: 'victoires', couleur: colors.text.primary,
              detail: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {barreVND(v, n, d)}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <strong style={{ color: colors.accent.green }}>{v}V</strong> · <strong style={{ color: colors.accent.amber }}>{n}N</strong> · <strong style={{ color: colors.accent.red }}>{d}D</strong>
                  </span>
                </div>
              ),
            })}
            {kpi({ label: 'Buts marqués', valeur: butsP, couleur: colors.accent.green, detail: `${(butsP / total).toFixed(1)} par match` })}
            {kpi({ label: 'Buts encaissés', valeur: butsE, couleur: colors.accent.red, detail: `${(butsE / total).toFixed(1)} par match` })}
            {kpi({ label: 'Différence', valeur: diff > 0 ? `+${diff}` : diff, couleur: diff > 0 ? colors.accent.green : diff < 0 ? colors.accent.red : colors.text.secondary, detail: `sur ${total} match${total > 1 ? 's' : ''}` })}
            {kpi({ label: 'Clean sheets', valeur: cleanSheets, couleur: colors.accent.purpleLight, detail: `${pct(cleanSheets, total)}% des matchs` })}
          </div>

          {/* Forme + domicile/extérieur */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>
            {forme.length > 0 && (
              <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  {eyebrow('Forme récente')}
                  {serie && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', color: couleurResultat(forme[0].resultat), background: couleurResultat(forme[0].resultat) + alpha.subtle }}>{serie}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '6px' }}>
                  {forme.map((m, i) => {
                    const c = couleurResultat(m.resultat)
                    return (
                      <div key={i} title={`vs ${m.adversaire || 'Adversaire'} · ${m.bp}-${m.bc}`}
                        style={{ borderRadius: '8px', padding: '8px 4px', textAlign: 'center', background: c + alpha.subtle, border: `1px solid ${c}33`, opacity: i === 0 ? 1 : 0.85 }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: c }}>{m.resultat === 'victoire' ? 'V' : m.resultat === 'nul' ? 'N' : 'D'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{m.bp}-{m.bc}</p>
                      </div>
                    )
                  })}
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>Du plus récent (à gauche) au plus ancien</p>
              </div>
            )}

            {filtreLieu === 'all' && (dom.length > 0 || ext.length > 0) && (
              <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {eyebrow('Domicile / Extérieur')}
                {[
                  { label: 'Domicile', liste: dom },
                  { label: 'Extérieur', liste: ext },
                ].map(({ label, liste }) => {
                  const pctV = pctVictoire(liste)
                  const vv = liste.filter(m => m.resultat === 'victoire').length
                  const nn = liste.filter(m => m.resultat === 'nul').length
                  const dd = liste.filter(m => m.resultat === 'defaite').length
                  return (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{label} <span style={{ fontSize: '11px', fontWeight: 500, color: colors.text.faint }}>{liste.length} match{liste.length > 1 ? 's' : ''}</span></span>
                        <span style={{ fontSize: '12px', color: colors.text.faint, fontVariantNumeric: 'tabular-nums' }}>
                          {vv}V · {nn}N · {dd}D{pctV !== null && <strong style={{ color: colors.text.primary, marginLeft: '8px' }}>{pctV}%</strong>}
                        </span>
                      </div>
                      {barreVND(vv, nn, dd, 8)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Analyse des buts : marqués / encaissés côte à côte */}
          {analyses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                {eyebrow('Analyse des buts')}
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: colors.text.faint }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors.accent.green }} />Marqués</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors.accent.red }} />Encaissés</span>
                </div>
              </div>
              {analyses.map(a => (
                <div key={a.titre} style={carte}>
                  <p style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700 }}>{a.titre}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: isMobile ? '18px' : '28px' }}>
                    {['marques', 'encaisses'].map(cle => (
                      <div key={cle} style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: cle === 'marques' ? colors.accent.green : colors.accent.red }}>{cle === 'marques' ? 'Marqués' : 'Encaissés'}</p>
                        {a.rendu(cle)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ margin: 0, color: colors.text.ghost, fontSize: '11px', textAlign: 'center' }}>
            {total} match{total > 1 ? 's' : ''} joué{total > 1 ? 's' : ''}{filtreCompetition !== 'all' ? ` · ${filtreCompetition}` : ''}{filtreLieu !== 'all' ? ` · ${filtreLieu === 'domicile' ? 'domicile' : 'extérieur'}` : ''}
          </p>
        </>
      )}
    </div>
  )
}
