import { useState } from 'react'
import { colors, alpha } from '../../tokens'
import {
  QUESTIONS, FORFAITS_CLUB, outilsAchetables, outilsPrecoches, roleDepuisReponses, compositionPaiement, forfaitPourEquipes,
  PALIERS_EDUCATEUR, outilsDuPack,
} from '../../lib/catalogueOutils'
import { CONTACT_EMAIL } from '../../lib/stripeLinks'

// Composition de l'offre à l'inscription (bloc 11) : trois questions pré-cochent
// les outils, le total suit en direct, puis `onContinuer` reçoit le choix.
// Page publique, toujours sombre : couleurs fixes des jetons (pas useColors, qui
// suit le thème du dashboard et rendrait des cartes claires dans cette page).
// Le prix vient toujours de compositionPaiement et du catalogue, jamais d'ici.
const PERIODES = [['mensuel', 'Mensuel', 'par mois'], ['annuel', 'Annuel', 'par an']]
const MAX_EQUIPES = FORFAITS_CLUB[FORFAITS_CLUB.length - 1].equipes
const police = 'Inter, sans-serif'

const Coche = ({ coche }) => (
  <span aria-hidden="true" style={{
    flexShrink: 0, width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: coche ? colors.accent.green : 'transparent', border: coche ? 'none' : `1.5px solid ${colors.border.strong}`,
  }}>
    {coche && (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.5-5" stroke={colors.black} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
)

function Question({ question, valeur, onChoix }) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ padding: 0, margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: colors.text.primary }}>{question.texte}</legend>
      <div role="radiogroup" aria-label={question.texte} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {question.reponses.map(r => {
          const choisi = valeur === r.id
          return (
            <button key={r.id} type="button" role="radio" aria-checked={choisi} onClick={() => onChoix(r.id)} style={{
              minHeight: 44, padding: '10px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: police, fontSize: 13, fontWeight: 700,
              background: choisi ? colors.accent.green + alpha.subtle : colors.background.base,
              border: `1.5px solid ${choisi ? colors.accent.green : colors.border.default}`,
              color: choisi ? colors.accent.green : colors.text.primary,
            }}>{r.texte}</button>
          )
        })}
      </div>
    </fieldset>
  )
}

function CarteChoix({ nom, promesse, coche, onSelection }) {
  return (
    <button type="button" role="checkbox" aria-checked={coche} onClick={onSelection} style={{
      display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', boxSizing: 'border-box', width: '100%',
      padding: 14, borderRadius: 14, cursor: 'pointer', fontFamily: police, color: colors.text.primary,
      background: coche ? colors.accent.green + alpha.subtle : colors.background.base,
      border: `${coche ? 2 : 1}px solid ${coche ? colors.accent.green : colors.border.default}`,
    }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{nom}</span>
        <Coche coche={coche} />
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.5, color: colors.text.secondary }}>{promesse}</span>
    </button>
  )
}

export default function ComposerOffre({ onContinuer, initial = {} }) {
  const [reponses, setReponses] = useState(initial.reponses || {})
  const [choix, setChoix] = useState(initial.outils ?? null)
  const [periodicite, setPeriodicite] = useState(initial.periodicite || 'mensuel')
  const [nbEquipes, setNbEquipes] = useState(initial.nbEquipes || 1)

  const role = roleDepuisReponses(reponses)
  const repondu = !!role && !!reponses.q2 && !!reponses.q3
  const outils = role ? outilsAchetables(role) : []
  // Tant que la personne n'a rien touché, les outils suivent ses réponses.
  const coches = choix ?? (role ? outilsPrecoches(role, reponses) : [])
  const repondre = (q, id) => setReponses(r => ({ ...r, [q]: id }))
  const basculer = (id) => setChoix(coches.includes(id) ? coches.filter(x => x !== id) : [...coches, id])
  const unite = PERIODES.find(p => p[0] === periodicite)[2]
  const annuel = periodicite === 'annuel'

  const forfait = role === 'club' ? forfaitPourEquipes(nbEquipes) : null
  const compo = !repondu ? null
    : role === 'club'
      ? (forfait ? compositionPaiement('club', { palier: forfait.palier, periodicite }, nbEquipes) : null)
      : coches.length > 0 ? compositionPaiement('educateur', { outils: coches, periodicite }) : null
  const total = compo && !compo.erreur ? compo.total : 0
  const palier = role === 'educateur' && coches.length > 0 ? PALIERS_EDUCATEUR.find(p => p.id === compo?.paliersOutils) : null
  const economie = annuel && compo && !compo.erreur
    ? (role === 'club' ? forfait.prixMensuel * 12 - forfait.prixAnnuel : palier.prixMensuel * 12 - palier.prixAnnuel)
    : 0
  const horsGamme = role === 'club' && !forfait

  const continuer = (gratuit) => onContinuer({
    role,
    reponses,
    periodicite,
    gratuit,
    nbEquipes: role === 'club' ? nbEquipes : 0,
    palier: role === 'club' ? forfait.palier : null,
    // Éducateur : les outils réellement achetés (les 9 pour le palier « tous les outils »). Club : ses outils inclus.
    outils: gratuit ? [] : role === 'educateur' ? compo.outils : coches,
    total: gratuit ? 0 : total,
  })

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: '16px 18px' }

  return (
    <div style={{ fontFamily: police, color: colors.text.primary }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Compose ton offre</h1>
      <p style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.5, color: colors.text.faint }}>
        Trois questions, et on te propose les outils qui te correspondent. Tu peux tout modifier avant de continuer.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
        <Question question={QUESTIONS[0]} valeur={reponses.q1} onChoix={id => repondre('q1', id)} />
        {role && <Question question={QUESTIONS[1]} valeur={reponses.q2} onChoix={id => repondre('q2', id)} />}
        {role && reponses.q2 && <Question question={QUESTIONS[2]} valeur={reponses.q3} onChoix={id => repondre('q3', id)} />}
      </div>

      {repondu && (
        <>
          {reponses.q1 === 'educateur_club' && (
            <p style={{ margin: '0 0 16px', padding: '12px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.6, color: colors.accent.green, background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}25` }}>
              Si ton club t'ouvre certains de ses outils, ils s'ajoutent à ton compte sans frais dès que tu rejoins le club. Choisis seulement ce que tu veux payer toi-même.
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text.secondary }}>
              {role === 'club' ? 'Outils de ton club, inclus dans le forfait' : 'Tes outils, en plus du socle gratuit'}
            </p>
            <div role="radiogroup" aria-label="Périodicité" style={{ display: 'inline-flex', padding: 3, gap: 2, background: colors.background.raised, borderRadius: 999 }}>
              {PERIODES.map(([val, label]) => (
                <button key={val} type="button" role="radio" aria-checked={periodicite === val} onClick={() => setPeriodicite(val)} style={{
                  minHeight: 40, padding: '8px 18px', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: police,
                  background: periodicite === val ? colors.background.surface : 'transparent',
                  color: periodicite === val ? colors.text.primary : colors.text.secondary,
                }}>{label}</button>
              ))}
            </div>
          </div>

          {role === 'club' && (
            <div style={{ ...carte, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Combien d'équipes dans ton club ?</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.text.faint }}>Le forfait dépend du nombre d'équipes.</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <button type="button" aria-label="Une équipe de moins" disabled={nbEquipes <= 1} onClick={() => setNbEquipes(n => Math.max(1, n - 1))} style={boutonPas(nbEquipes <= 1)}>-</button>
                <span aria-live="polite" style={{ minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>{nbEquipes}</span>
                <button type="button" aria-label="Une équipe de plus" disabled={nbEquipes > MAX_EQUIPES} onClick={() => setNbEquipes(n => n + 1)} style={boutonPas(nbEquipes > MAX_EQUIPES)}>+</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
            {outils.map(o => <CarteChoix key={o.id} nom={o.nom} promesse={o.promesse} coche={coches.includes(o.id)} onSelection={() => basculer(o.id)} />)}
          </div>

          <div style={carte}>
            {horsGamme ? (
              <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: colors.accent.amber }}>
                Ton club a plus de {MAX_EQUIPES} équipes : écris-nous à {CONTACT_EMAIL} pour une offre adaptée.
              </p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>
                  {role === 'club'
                    ? forfait.nom
                    : coches.length === 0 ? 'Aucun outil choisi : le socle gratuit'
                      : `${coches.length} ${coches.length > 1 ? 'outils choisis' : 'outil choisi'} : palier jusqu'à ${palier.max} outils`}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900 }}>
                  {total} €{total > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary }}> {unite}</span>}
                </p>
                {palier && palier.max === outilsDuPack().length && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.faint }}>Ce palier donne les {palier.max} outils, même si tu en as coché moins.</p>
                )}
                {economie > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: colors.accent.green }}>Tu économises {economie} € sur l'année par rapport au mensuel</p>
                )}
              </>
            )}
            <button type="button" disabled={horsGamme || (role === 'educateur' && coches.length === 0 ? false : !total)} onClick={() => continuer(role === 'educateur' && coches.length === 0)} style={{
              width: '100%', minHeight: 50, marginTop: 14, border: 'none', borderRadius: 12, fontFamily: police, fontSize: 15, fontWeight: 800,
              background: colors.accent.green, color: colors.black, cursor: horsGamme ? 'not-allowed' : 'pointer', opacity: horsGamme ? 0.5 : 1,
            }}>
              {role === 'educateur' && coches.length === 0 ? 'Continuer gratuitement' : `Continuer : ${total} € ${unite}`}
            </button>
            {role === 'educateur' && coches.length > 0 && (
              <button type="button" onClick={() => continuer(true)} style={{
                width: '100%', minHeight: 44, marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: police, fontSize: 13, fontWeight: 700, color: colors.text.secondary, textDecoration: 'underline',
              }}>Continuer gratuitement, sans outil pour le moment</button>
            )}
            <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: colors.text.faint }}>
              {role === 'club'
                ? 'Le paiement se fait à l\'étape suivante, une fois ton compte créé. Tu pourras changer d\'outils quand tu veux dans Mes outils.'
                : 'Sans engagement : tu pourras ajouter ou retirer des outils quand tu veux. Le paiement se fait à l\'étape suivante.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

const boutonPas = (desactive) => ({
  width: 44, height: 44, borderRadius: 12, fontSize: 20, fontWeight: 800, fontFamily: police,
  background: colors.background.raised, color: desactive ? colors.text.disabled : colors.text.primary,
  border: `1px solid ${colors.border.default}`, cursor: desactive ? 'not-allowed' : 'pointer',
})
