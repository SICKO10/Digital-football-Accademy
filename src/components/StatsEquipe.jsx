import { useState, useMemo } from 'react'
import { alpha } from '../tokens'
import { useColors } from '../lib/theme'

const NATURES_BUT = [
  { value: 'cpa', label: 'CPA' },
  { value: 'attaque_placee', label: 'Attaque placée' },
  { value: 'attaque_rapide', label: 'Attaque rapide' },
  { value: 'erreur_individuelle', label: 'Erreur individuelle' },
  { value: 'exploit_personnel', label: 'Exploit personnel' },
]

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
export default function StatsEquipe({ matchs = [], masquerVND = false, noteEquipe = null }) {
  const colors = useColors()
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

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }
  const chip = (active, c) => ({ padding: '6px 14px', borderRadius: '16px', border: `1px solid ${active ? c : colors.border.default}`, cursor: 'pointer', fontSize: '12px', background: active ? c + alpha.subtle : 'transparent', color: active ? c : colors.text.faint, fontWeight: active ? 700 : 400, fontFamily: 'Inter, sans-serif' })

  if (matchs.length === 0) {
    return <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '20px' }}>Aucun match enregistré pour l'instant.</p>
  }

  return (
    <div>
      {noteEquipe && (
        <div style={{
          background: colors.background.surface,
          border: `1px solid ${noteEquipe.moyenne >= 7 ? colors.accent.green : noteEquipe.moyenne >= 5 ? colors.accent.amber : colors.accent.red}`,
          borderRadius: '14px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        }}>
          <div>
            <div style={{ color: colors.text.faint, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Note globale équipe</div>
            <div style={{ color: colors.text.primary, fontSize: '13px', marginTop: '4px' }}>
              Moyenne sur {noteEquipe.nb} match{noteEquipe.nb > 1 ? 's' : ''} évalué{noteEquipe.nb > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: noteEquipe.moyenne >= 7 ? colors.accent.green : noteEquipe.moyenne >= 5 ? colors.accent.amber : colors.accent.red }}>
            {noteEquipe.moyenne}<span style={{ fontSize: '18px', color: colors.text.faint, marginLeft: '4px' }}>/10</span>
          </div>
        </div>
      )}
      {(competitionsDisponibles.length > 1) && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltreCompetition('all')} style={chip(filtreCompetition === 'all', colors.accent.green)}>Toutes compétitions</button>
          {competitionsDisponibles.map(c => (
            <button key={c} onClick={() => setFiltreCompetition(c)} style={chip(filtreCompetition === c, colors.accent.green)}>{c}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {[{ k: 'all', l: 'Tout' }, { k: 'domicile', l: 'Domicile' }, { k: 'exterieur', l: 'Extérieur' }].map(f => (
              <button key={f.k} onClick={() => setFiltreLieu(f.k)} style={chip(filtreLieu === f.k, colors.accent.amber)}>{f.l}</button>
            ))}
          </div>
        </div>
      )}

      {total === 0 ? (
        <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '20px' }}>Aucun match joué avec ces filtres.</p>
      ) : (
        <>
          {forme.length > 0 && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ color: colors.text.faint, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>Forme récente</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {forme.map((m, i) => {
                  const c = m.resultat === 'victoire' ? colors.accent.green : m.resultat === 'nul' ? colors.accent.amber : colors.accent.red
                  return (
                    <div key={i} title={`vs ${m.adversaire} · ${m.bp}-${m.bc}`}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                        background: m.resultat === 'victoire' ? colors.accent.green + alpha.subtle : m.resultat === 'nul' ? colors.accent.amber + alpha.subtle : colors.accent.red + alpha.subtle,
                        color: c, border: `1px solid ${c}22` }}>
                      {m.resultat === 'victoire' ? 'V' : m.resultat === 'nul' ? 'N' : 'D'}
                    </div>
                  )
                })}
              </div>
              {serie && <span style={{ color: colors.text.secondary, fontSize: '13px' }}>— {serie}</span>}
            </div>
          )}

          {!masquerVND && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Victoires', val: v, color: colors.accent.green },
                { label: 'Nuls', val: n, color: colors.accent.amber },
                { label: 'Défaites', val: d, color: colors.accent.red },
              ].map(s => (
                <div key={s.label} style={card}>
                  <p style={{ margin: 0, color: s.color, fontSize: '26px', fontWeight: 800 }}>{s.val}</p>
                  <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>{s.label}</p>
                  <p style={{ margin: 0, color: s.color, fontSize: '12px', fontWeight: 600 }}>{pct(s.val, total)}%</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div style={card}>
              <p style={{ margin: 0, color: colors.accent.green, fontSize: '22px', fontWeight: 800 }}>{butsP}</p>
              <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>Buts marqués</p>
              <p style={{ margin: 0, color: colors.text.dim, fontSize: '11px' }}>{(butsP / total).toFixed(1)}/match</p>
            </div>
            <div style={card}>
              <p style={{ margin: 0, color: colors.accent.red, fontSize: '22px', fontWeight: 800 }}>{butsE}</p>
              <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>Buts encaissés</p>
              <p style={{ margin: 0, color: colors.text.dim, fontSize: '11px' }}>{(butsE / total).toFixed(1)}/match</p>
            </div>
            <div style={card}>
              <p style={{ margin: 0, color: colors.accent.purpleLight, fontSize: '22px', fontWeight: 800 }}>{cleanSheets}</p>
              <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>Clean sheets</p>
              <p style={{ margin: 0, color: colors.text.dim, fontSize: '11px' }}>{pct(cleanSheets, total)}%</p>
            </div>
          </div>

          {filtreLieu === 'all' && (dom.length > 0 || ext.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Domicile', liste: dom, color: colors.accent.green },
                { label: 'Extérieur', liste: ext, color: colors.accent.blue },
              ].map(({ label, liste, color }) => {
                const pctV = pctVictoire(liste)
                return (
                  <div key={label} style={{ ...card, textAlign: 'left' }}>
                    <p style={{ margin: '0 0 8px', color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{label}</p>
                    <p style={{ margin: '0 0 8px', color: colors.text.faint, fontSize: '12px' }}>{liste.length} match{liste.length > 1 ? 's' : ''}</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ color: colors.accent.green, fontSize: '12px' }}>V {liste.filter(m => m.resultat === 'victoire').length}</span>
                      <span style={{ color: colors.accent.amber, fontSize: '12px' }}>N {liste.filter(m => m.resultat === 'nul').length}</span>
                      <span style={{ color: colors.accent.red, fontSize: '12px' }}>D {liste.filter(m => m.resultat === 'defaite').length}</span>
                    </div>
                    {pctV !== null && <p style={{ margin: '8px 0 0', color, fontSize: '15px', fontWeight: 700 }}>{pctV}% victoires</p>}
                  </div>
                )
              })}
            </div>
          )}

          {butsAvecMinute.length > 0 && (
            <div style={{ ...card, textAlign: 'left', marginTop: '10px' }}>
              <p style={{ margin: '0 0 14px', color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>Buts par quart d'heure</p>
              {(() => {
                const W = 500, H = 80, pad = 20
                const n = quartsGraphique.length
                const max = Math.max(...quartsGraphique.flatMap(q => [q.marques, q.encaisses]), 1)
                const x = i => pad + (i / (n - 1)) * (W - pad * 2)
                const y = v => H - 8 - (v / max) * (H - 20)
                const pts = arr => arr.map((q, i) => `${x(i)},${y(q)}`).join(' ')
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90, overflow: 'visible' }}>
                    {/* Lignes de grille légères */}
                    {[0.25, 0.5, 0.75, 1].map(t => (
                      <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="#1a1a1a" strokeWidth="1" />
                    ))}
                    {/* Zone remplie marqués */}
                    <polyline points={pts(quartsGraphique.map(q => q.marques))} fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinejoin="round" />
                    {/* Zone remplie encaissés */}
                    <polyline points={pts(quartsGraphique.map(q => q.encaisses))} fill="none" stroke={colors.accent.red} strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 2" />
                    {/* Points + labels marqués */}
                    {quartsGraphique.map((q, i) => (
                      <g key={i}>
                        <circle cx={x(i)} cy={y(q.marques)} r="4" fill={colors.accent.green} />
                        {q.marques > 0 && <text x={x(i)} y={y(q.marques) - 8} textAnchor="middle" fill={colors.accent.green} fontSize="10" fontWeight="700">{q.marques}</text>}
                        <circle cx={x(i)} cy={y(q.encaisses)} r="4" fill={colors.accent.red} />
                        {q.encaisses > 0 && <text x={x(i)} y={y(q.encaisses) - 8} textAnchor="middle" fill={colors.accent.red} fontSize="10" fontWeight="700">{q.encaisses}</text>}
                        <text x={x(i)} y={H} textAnchor="middle" fill={colors.text.faint} fontSize="9">{q.label}</text>
                      </g>
                    ))}
                  </svg>
                )
              })()}
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: colors.accent.green, display: 'inline-block' }} /> Marqués</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: colors.accent.red, display: 'inline-block' }} /> Encaissés</span>
              </div>
            </div>
          )}

          {natureGraphique.length > 0 && (
            <div style={{ ...card, textAlign: 'left', marginTop: '10px' }}>
              <p style={{ margin: '0 0 14px', color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>Buts par nature</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const max = Math.max(...natureGraphique.flatMap(x => [x.marques, x.encaisses]), 1)
                  return natureGraphique.map(n => (
                    <div key={n.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: colors.text.secondary }}>{n.label}</span>
                        <span style={{ fontSize: 11, color: colors.text.faint }}>{n.marques}M · {n.encaisses}E</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(n.marques / max) * 100}%`, background: colors.accent.green, borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(n.encaisses / max) * 100}%`, background: colors.accent.red, borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          <p style={{ margin: '14px 0 0', color: colors.text.ghost, fontSize: '11px', textAlign: 'center' }}>
            {total} match{total > 1 ? 's' : ''} joué{total > 1 ? 's' : ''}{filtreCompetition !== 'all' ? ` · ${filtreCompetition}` : ''}{filtreLieu !== 'all' ? ` · ${filtreLieu === 'domicile' ? 'domicile' : 'extérieur'}` : ''}
          </p>
        </>
      )}
    </div>
  )
}
