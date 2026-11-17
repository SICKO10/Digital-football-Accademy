import { useState, useMemo } from 'react'
import { police, forme as formeJeton } from '../tokens'
import { styleCarte, styleChiffreHeros, couleurClub, CLASSE_CLIQUABLE } from '../lib/identite'
import { Etiquette, CarteChiffre, PastilleResultat, Jauge } from './identite'
import { useColors } from '../lib/theme'
import { resultatMatch } from '../lib/resultatMatch'
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
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map(d => `${d.label} : ${d.valeur}`).join(', ')} style={{ width: '100%', height: 80, overflow: 'visible' }}>
      {[0.5, 1].map(t => (
        <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke={colors.border.subtle} strokeWidth="1" />
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <rect x={x(i) - 3.5} y={y(d.valeur) - 3.5} width="7" height="7" rx="1" fill={color} />
          {d.valeur > 0 && <text x={x(i)} y={y(d.valeur) - 8} textAnchor="middle" fill={colors.text.primary} fontSize="12" fontWeight="700" fontFamily={police.titre}>{d.valeur}</text>}
          <text x={x(i)} y={H} textAnchor="middle" fill={colors.text.dim} fontSize="10" fontFamily={police.texte}>{d.label}</text>
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
            <span style={{ fontFamily: police.texte, fontSize: 13, color: colors.text.secondary }}>{d.label}</span>
            <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 15, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{d.valeur}</span>
          </div>
          <div style={{ height: 6, background: colors.background.sunken, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.valeur / max) * 100}%`, background: color, borderRadius: 1 }} />
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
    return { ...m, bp, bc, resultat: { V: 'victoire', D: 'defaite', N: 'nul' }[resultatMatch(m)] }
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

  const carte = styleCarte(colors)
  // Filtre : bouton à coins 6 px, plein à la couleur du club quand il est actif
  // (le texte est recalculé par le moteur de palette).
  const filtre = actif => ({
    minHeight: '36px', padding: '0 14px', borderRadius: formeJeton.rayonCarte, cursor: 'pointer',
    fontFamily: police.texte, fontSize: '13px', fontWeight: 600,
    background: actif ? colors.accent.brand : 'transparent',
    color: actif ? colors.accent.onBrand : colors.text.primary,
    border: `1px solid ${actif ? 'transparent' : colors.border.strong}`,
  })
  const marqueur = couleur => <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: couleur, flexShrink: 0 }} />
  const lettreResultat = r => (r === 'victoire' ? 'V' : r === 'nul' ? 'N' : 'D')
  const segmentsVND = (vv, nn, dd) => [
    { libelle: 'Victoires', valeur: vv },
    { libelle: 'Nuls', valeur: nn },
    { libelle: 'Défaites', valeur: dd },
  ]
  const diff = butsP - butsE

  if (matchs.length === 0) {
    return <p style={{ color: colors.text.dim, fontFamily: police.texte, fontSize: '14px', textAlign: 'center', padding: '20px' }}>Aucun match enregistré pour l'instant.</p>
  }

  // Analyses détaillées des buts : chaque ligne met côte à côte marqués
  // et encaissés sur la même mesure, pour comparer d'un coup d'œil. Une ligne
  // n'apparaît que si la donnée existe (cf. calculs plus haut).
  const couleurMarques = colors.accent.success
  const couleurEncaisses = colors.accent.red
  const analyses = [
    butsAvecMinute.length > 0 && {
      titre: "Par quart d'heure",
      rendu: cle => <GraphiqueLigne data={quartsGraphique.map(q => ({ label: q.label, valeur: q[cle] }))} color={cle === 'marques' ? couleurMarques : couleurEncaisses} colors={colors} />,
    },
    natureGraphique.length > 0 && {
      titre: 'Par nature',
      rendu: cle => <BarresHorizontales data={natureGraphique.filter(x => x[cle] > 0).map(x => ({ label: x.label, valeur: x[cle] }))} color={cle === 'marques' ? couleurMarques : couleurEncaisses} colors={colors} />,
    },
    coteGraphique.length > 0 && {
      titre: 'Par côté',
      rendu: cle => <BarresHorizontales data={coteGraphique.filter(x => x[cle] > 0).map(x => ({ label: x.label, valeur: x[cle] }))} color={cle === 'marques' ? couleurMarques : couleurEncaisses} colors={colors} />,
    },
  ].filter(Boolean)

  const petitTexte = { margin: 0, fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '18px' }}>
      {/* Filtres : compétition à gauche, lieu à droite */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {competitionsDisponibles.length > 1 && (
          <div role="group" aria-label="Compétition" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" className={CLASSE_CLIQUABLE} aria-pressed={filtreCompetition === 'all'} onClick={() => setFiltreCompetition('all')} style={filtre(filtreCompetition === 'all')}>Toutes compétitions</button>
            {competitionsDisponibles.map(c => (
              <button type="button" key={c} className={CLASSE_CLIQUABLE} aria-pressed={filtreCompetition === c} onClick={() => setFiltreCompetition(c)} style={filtre(filtreCompetition === c)}>{c}</button>
            ))}
          </div>
        )}
        <div role="group" aria-label="Lieu du match" style={{ marginLeft: isMobile ? 0 : 'auto', display: 'inline-flex', gap: '6px' }}>
          {[{ k: 'all', l: 'Tout' }, { k: 'domicile', l: 'Domicile' }, { k: 'exterieur', l: 'Extérieur' }].map(f => (
            <button type="button" key={f.k} className={CLASSE_CLIQUABLE} aria-pressed={filtreLieu === f.k} onClick={() => setFiltreLieu(f.k)} style={filtre(filtreLieu === f.k)}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div style={{ ...carte, textAlign: 'center', padding: '28px' }}>
          <p style={petitTexte}>Aucun match joué avec ces filtres.</p>
        </div>
      ) : (
        <>
          {/* Chiffres clés */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            {noteEquipe && <CarteChiffre etiquette="Note équipe" valeur={noteEquipe.moyenne} unite="/10" taille={32} detail={`${noteEquipe.nb} match${noteEquipe.nb > 1 ? 's' : ''} évalué${noteEquipe.nb > 1 ? 's' : ''}`} />}
            {!masquerVND && (
              <div style={carte}>
                <Etiquette as="span" style={{ display: 'block' }}>Bilan</Etiquette>
                <span style={{ ...styleChiffreHeros(colors, 32), display: 'block', marginTop: '10px' }}>
                  {pct(v, total)}<span style={{ fontSize: '0.55em', fontWeight: 600, marginLeft: '0.15em' }}>{' '}% de victoires</span>
                </span>
                <Jauge segments={segmentsVND(v, n, d)} legende={false} style={{ marginTop: '10px' }} />
                <span style={{ display: 'block', marginTop: '8px', fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{v}V · {n}N · {d}D</span>
              </div>
            )}
            <CarteChiffre etiquette="Buts marqués" valeur={butsP} taille={32} detail={`${(butsP / total).toFixed(1)} par match`} />
            <CarteChiffre etiquette="Buts encaissés" valeur={butsE} taille={32} detail={`${(butsE / total).toFixed(1)} par match`} />
            <CarteChiffre etiquette="Différence" valeur={diff > 0 ? `+${diff}` : diff} taille={32} detail={`sur ${total} match${total > 1 ? 's' : ''}`} />
            <CarteChiffre etiquette="Clean sheets" valeur={cleanSheets} taille={32} detail={`${pct(cleanSheets, total)}% des matchs`} />
          </div>

          {/* Forme + domicile/extérieur */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>
            {forme.length > 0 && (
              <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <Etiquette as="p" style={{ margin: 0 }}>Forme récente</Etiquette>
                  {serie && <span style={{ fontFamily: police.texte, fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', color: colors.text.primary, border: `1px solid ${colors.border.strong}` }}>{serie}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '6px' }}>
                  {forme.map((m, i) => (
                    <div key={i} title={`vs ${m.adversaire || 'Adversaire'} · ${m.bp}-${m.bc}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 2px', boxShadow: i === 0 ? `inset 0 -3px 0 ${couleurClub(colors)}` : 'none' }}>
                      <PastilleResultat resultat={lettreResultat(m.resultat)} taille={26} />
                      <span style={{ fontFamily: police.titre, fontWeight: 600, fontSize: '16px', color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{m.bp}-{m.bc}</span>
                    </div>
                  ))}
                </div>
                <p style={{ ...petitTexte, fontSize: '12px', color: colors.text.dim }}>Du plus récent (à gauche, souligné) au plus ancien</p>
              </div>
            )}

            {filtreLieu === 'all' && (dom.length > 0 || ext.length > 0) && (
              <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Etiquette as="p" style={{ margin: 0 }}>Domicile / Extérieur</Etiquette>
                {[
                  { label: 'Domicile', liste: dom },
                  { label: 'Extérieur', liste: ext },
                ].map(({ label, liste }) => {
                  const pctV = pctVictoire(liste)
                  const vv = liste.filter(m => m.resultat === 'victoire').length
                  const nn = liste.filter(m => m.resultat === 'nul').length
                  const dd = liste.filter(m => m.resultat === 'defaite').length
                  return (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: police.texte, fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>{label} <span style={{ fontSize: '12px', fontWeight: 400, color: colors.text.dim }}>{liste.length} match{liste.length > 1 ? 's' : ''}</span></span>
                        <span style={{ fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>
                          {vv}V · {nn}N · {dd}D{pctV !== null && <strong style={{ fontFamily: police.titre, fontSize: '16px', color: colors.text.primary, marginLeft: '8px' }}>{pctV}%</strong>}
                        </span>
                      </div>
                      <Jauge segments={segmentsVND(vv, nn, dd)} legende={false} hauteur={8} />
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
                <Etiquette as="p" style={{ margin: 0 }}>Analyse des buts</Etiquette>
                <div style={{ display: 'flex', gap: '14px', fontFamily: police.texte, fontSize: '12px', color: colors.text.secondary }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{marqueur(couleurMarques)}Marqués</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{marqueur(couleurEncaisses)}Encaissés</span>
                </div>
              </div>
              {analyses.map(a => (
                <div key={a.titre} style={carte}>
                  <p style={{ margin: '0 0 14px', fontFamily: police.texte, fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>{a.titre}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: isMobile ? '18px' : '28px' }}>
                    {['marques', 'encaisses'].map(cle => (
                      <div key={cle} style={{ minWidth: 0 }}>
                        <Etiquette as="p" style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {marqueur(cle === 'marques' ? couleurMarques : couleurEncaisses)}{cle === 'marques' ? 'Marqués' : 'Encaissés'}
                        </Etiquette>
                        {a.rendu(cle)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ ...petitTexte, fontSize: '12px', color: colors.text.dim, textAlign: 'center' }}>
            {total} match{total > 1 ? 's' : ''} joué{total > 1 ? 's' : ''}{filtreCompetition !== 'all' ? ` · ${filtreCompetition}` : ''}{filtreLieu !== 'all' ? ` · ${filtreLieu === 'domicile' ? 'domicile' : 'extérieur'}` : ''}
          </p>
        </>
      )}
    </div>
  )
}
