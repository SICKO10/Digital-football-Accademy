import { useEffect } from 'react'
import { PHASES_JEU } from '../../constants/phasesJeu'
import { JOURS_MATCH, jourMatchAuto } from '../../lib/jourMatchFiche'
import { styleEtiquette, styleChamp, CLASSE_CHAMP } from '../../lib/identite'

// Saisie de l'en-tête de la Fiche club : phases, jour J±, dominante, récupérations, temps.
// Sert à la rédaction d'une nouvelle fiche et à l'édition d'une fiche enregistrée
// (même objet `fiche`, le parent fournit `setFiche`). `matchs` = matchs de l'équipe de la
// fiche (vide si inconnus : pas de calcul automatique, la case reste modifiable à la main).
export default function ChampsFicheClub({ fiche, setFiche, matchs, colors, styleChoix }) {
  const maj = (champ, valeur) => setFiche(f => ({ ...f, [champ]: valeur }))
  const phases = fiche.phases_club || []

  // J± suit la date de séance tant que l'éducateur ne l'a pas choisi lui-même.
  const auto = jourMatchAuto(fiche.date, matchs)
  useEffect(() => {
    if (fiche.jour_match_manuel) return
    if ((fiche.jour_match || '') !== auto) setFiche(f => (f.jour_match_manuel ? f : { ...f, jour_match: auto }))
  }, [auto, fiche.jour_match, fiche.jour_match_manuel, setFiche])

  const champ = { ...styleChamp(colors), width: '100%', boxSizing: 'border-box' }
  const etiquette = { ...styleEtiquette(colors), marginBottom: '4px', display: 'block' }
  const basculerPhase = (cle) => maj('phases_club', phases.includes(cle) ? phases.filter(c => c !== cle) : [...phases, cle])
  const choisirJour = (j) => setFiche(f => ({ ...f, jour_match: f.jour_match === j && f.jour_match_manuel ? '' : j, jour_match_manuel: true }))

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div>
        <p style={etiquette}>Phases de jeu travaillées</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
          {PHASES_JEU.map(p => (
            <button key={p.cle} type="button" onClick={() => basculerPhase(p.cle)} aria-pressed={phases.includes(p.cle)}
              style={{ ...styleChoix(colors, phases.includes(p.cle)), fontSize: '12px', padding: '6px 8px' }}>
              {p.long}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={etiquette}>Jour par rapport au match</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
          {JOURS_MATCH.map(j => (
            <button key={j} type="button" onClick={() => choisirJour(j)} aria-pressed={fiche.jour_match === j}
              style={{ ...styleChoix(colors, fiche.jour_match === j), fontSize: '12px', padding: '6px 0' }}>
              {j}
            </button>
          ))}
        </div>
        <p style={{ ...styleEtiquette(colors), textTransform: 'none', letterSpacing: 0, fontWeight: 400, margin: '6px 0 0' }}>
          {fiche.jour_match_manuel
            ? 'Choisi par toi. '
            : auto ? 'Calculé d\'après le match le plus proche de la date. ' : 'Pas de match à moins de 3 jours de la date (ou date vide). '}
          {fiche.jour_match_manuel && (
            <button type="button" onClick={() => setFiche(f => ({ ...f, jour_match_manuel: false }))}
              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
              Revenir au calcul automatique
            </button>
          )}
        </p>
      </div>

      <div>
        <label style={etiquette}>Dominante athlétique</label>
        <input type="text" value={fiche.dominante_athletique || ''} onChange={e => maj('dominante_athletique', e.target.value)} className={CLASSE_CHAMP} style={champ} />
      </div>

      {[0, 1].map(face => (
        <div key={face}>
          <p style={etiquette}>{face === 0 ? 'Recto (procédés 1 à 3)' : 'Verso (procédés 4 à 6)'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            {[0, 1, 2].map(k => {
              const cle = `recup_${face * 3 + k + 1}`
              return <input key={cle} type="text" placeholder={`Récupération ${k + 1}`} aria-label={`Récupération ${k + 1}, ${face === 0 ? 'recto' : 'verso'}`} value={fiche[cle] || ''} onChange={e => maj(cle, e.target.value)} className={CLASSE_CHAMP} style={champ} />
            })}
            <input type="text" placeholder="Tps effectif" aria-label={`Temps effectif, ${face === 0 ? 'recto' : 'verso'}`} value={fiche[`tps_effectif_${face ? 'verso' : 'recto'}`] || ''} onChange={e => maj(`tps_effectif_${face ? 'verso' : 'recto'}`, e.target.value)} className={CLASSE_CHAMP} style={champ} />
            <input type="text" placeholder="Tps total" aria-label={`Temps total, ${face === 0 ? 'recto' : 'verso'}`} value={fiche[`tps_total_${face ? 'verso' : 'recto'}`] || ''} onChange={e => maj(`tps_total_${face ? 'verso' : 'recto'}`, e.target.value)} className={CLASSE_CHAMP} style={champ} />
          </div>
        </div>
      ))}
    </div>
  )
}
