import { useCallback, useEffect, useRef, useState } from 'react'
import { useColors } from '../../lib/theme'
import { OUTILS } from '../../lib/catalogueOutils'
import { MODELES, planModele, planVide } from '../../lib/modelesDepart'
import { ecrireLigne, ecrireMode, lireReglages, modeDepuis, prevenirEducateurs, DELAI_PREVENIR, OUTILS_EDUCATEUR } from './ecritures'
import BandeauAnnuler from './BandeauAnnuler'
import ApercuMenuEducateur from './ApercuMenuEducateur'
import { Icone } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'

const OUTILS_CLUB = OUTILS.filter(o => o.role === 'club')
const nomClub = (id) => OUTILS_CLUB.find(o => o.id === id)?.nom || id
const nomEduc = (id) => OUTILS_EDUCATEUR.find(o => o.id === id)?.nom || id

// Modèles de départ, en haut de l'étape « Outils du club » : un clic montre ce
// qui va changer (outils du club et menu des éducateurs), « Appliquer » le fait,
// « Annuler » revient en arrière. Ne fait qu'afficher ou masquer : aucun modèle
// n'achète ni n'active un outil payant d'un éducateur. Le menu des éducateurs est
// réglé en « même pour tous » ; les réglages individuels sont gardés de côté.
// `clubAffiche(id)` et `appliquerClub(outil, visible)` viennent de l'étape Outils
// (même écriture que les interrupteurs) ; `educateurs` : [{ id, nom }].
export default function ModelesDepart({ clubId, educateurs, nouveauModele, clubAffiche, appliquerClub, couleur }) {
  const colors = useColors()
  const [ouvert, setOuvert] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')
  const [changement, setChangement] = useState(null)
  const finChangement = useCallback(() => setChangement(null), [])
  const numero = useRef(0)
  const lot = useRef({ avant: null, minuterie: null })
  const suivi = useRef({ liste: educateurs, monte: true })
  useEffect(() => { suivi.current.liste = educateurs }, [educateurs])

  const prevenir = useCallback(async () => {
    const { avant } = lot.current
    lot.current = { avant: null, minuterie: null }
    if (!avant) return
    try {
      await prevenirEducateurs(clubId, avant, suivi.current.liste)
    } catch (e) {
      console.error('Mon club : éducateurs non prévenus', e.message)
      if (suivi.current.monte) setErreur('Le modèle est bien appliqué, mais vos éducateurs n\'ont pas pu être prévenus.')
    }
  }, [clubId])

  // Quitter l'étape avec un envoi en attente : on le fait tout de suite.
  useEffect(() => {
    const s = suivi
    const l = lot
    s.current.monte = true
    return () => { s.current.monte = false; clearTimeout(l.current.minuterie); prevenir() }
  }, [prevenir])

  const choisir = async (modele) => {
    if (ouvert?.modele.id === modele.id) { setOuvert(null); return }
    setErreur('')
    setOccupe(true)
    try {
      const { reglages, lus } = await lireReglages(clubId)
      const echec = reglages.error || lus.error
      if (echec) throw new Error(echec.message)
      const mode = modeDepuis(reglages)
      const lignes = lus.data || []
      const commun = Object.fromEntries(lignes.filter(l => l.cible === 'educateurs').map(l => [l.outil, l.visible]))
      const plan = planModele(modele, {
        clubIds: OUTILS_CLUB.map(o => o.id),
        educIds: OUTILS_EDUCATEUR.map(o => o.id),
        clubAffiche: (id) => clubAffiche(OUTILS_CLUB.find(o => o.id === id)),
        educAffiche: (id) => commun[id] !== false,
      })
      // Menu des éducateurs après le modèle (réglage commun), pour l'aperçu.
      const apres = OUTILS_EDUCATEUR.filter(o => !modele.educateurs.includes(o.id)).map(o => ({ cible: 'educateurs', outil: o.id, visible: false }))
      setOuvert({ modele, plan, mode, lignes, commun, apres })
    } catch (e) {
      setErreur(e.message || 'Impossible de lire les réglages, réessayez dans un instant.')
    } finally {
      setOccupe(false)
    }
  }

  const appliquer = async () => {
    const { modele, plan, mode, lignes, commun } = ouvert
    setOccupe(true)
    setErreur('')
    if (!lot.current.avant) lot.current.avant = { mode, lignes }
    const retablirClub = []
    try {
      for (const [ids, visible] of [[plan.club.retires, false], [plan.club.affiches, true]]) {
        for (const id of ids) {
          await appliquerClub(OUTILS_CLUB.find(o => o.id === id), visible)
          retablirClub.push([id, !visible])
        }
      }
      if (mode === 'individualise') await ecrireMode(clubId, 'commun')
      for (const id of plan.educateurs.retires) await ecrireLigne(clubId, 'educateurs', null, id, false)
      for (const id of plan.educateurs.affiches) await ecrireLigne(clubId, 'educateurs', null, id, undefined)
    } catch (e) {
      setErreur(e.message || 'Le modèle n\'a pas pu être appliqué en entier, vérifiez les cartes ci-dessous.')
      setOccupe(false)
      clearTimeout(lot.current.minuterie)
      lot.current.minuterie = setTimeout(prevenir, DELAI_PREVENIR)
      return
    }
    clearTimeout(lot.current.minuterie)
    lot.current.minuterie = setTimeout(prevenir, DELAI_PREVENIR)
    setOuvert(null)
    setOccupe(false)
    setChangement({
      id: ++numero.current,
      message: `Modèle « ${modele.nom} » appliqué.`,
      annuler: async () => {
        setChangement(null)
        setErreur('')
        try {
          for (const [id, visible] of retablirClub) await appliquerClub(OUTILS_CLUB.find(o => o.id === id), visible)
          if (mode === 'individualise') await ecrireMode(clubId, mode)
          for (const id of [...plan.educateurs.retires, ...plan.educateurs.affiches]) await ecrireLigne(clubId, 'educateurs', null, id, commun[id])
        } catch (e) { setErreur(e.message) }
        clearTimeout(lot.current.minuterie)
        lot.current.minuterie = setTimeout(prevenir, DELAI_PREVENIR)
      },
    })
  }

  const st = stylesMonClub(colors)
  const ligne = { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }

  // Une liste d'outils sous forme de pastilles, avec son titre.
  const Groupe = ({ titre, ids, nom, couleur }) => (
    <div style={{ margin: '0 0 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: colors.text.faint }}>{titre}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ids.map(id => (
          <span key={id} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, color: colors.text.primary, background: couleur + '24', border: `1px solid ${couleur}66` }}>{nom(id)}</span>
        ))}
      </div>
    </div>
  )

  const rendu = ouvert && (() => {
    const { modele, plan, mode } = ouvert
    const nbRetires = plan.club.retires.length + plan.educateurs.retires.length
    return (
      <div style={{ margin: '16px 0 0', padding: 22, borderRadius: 18, border: `2px solid ${st.marque}`, background: colors.background.surface, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: colors.text.primary }}>Modèle « {modele.nom} »</h3>
        {planVide(plan) ? (
          <p style={ligne}>Rien à changer : vos outils et le menu de vos éducateurs sont déjà réglés ainsi.</p>
        ) : (
          <>
            <p style={{ ...ligne, fontWeight: 800, fontSize: 14, color: colors.text.primary, marginBottom: 14 }}>
              {nbRetires > 0 ? `${nbRetires} outil${nbRetires > 1 ? 's' : ''} retiré${nbRetires > 1 ? 's' : ''} au total.` : 'Aucun outil retiré.'}
            </p>
            {plan.club.retires.length > 0 && <Groupe titre={`${nouveauModele ? 'Désactivés' : 'Retirés'} du menu du club`} ids={plan.club.retires} nom={nomClub} couleur={colors.accent.amber} />}
            {plan.club.affiches.length > 0 && <Groupe titre={`${nouveauModele ? 'Réactivés' : 'Réaffichés'} sur le dashboard du club`} ids={plan.club.affiches} nom={nomClub} couleur={colors.accent.success} />}
            {plan.educateurs.retires.length > 0 && <Groupe titre="Retirés du menu de vos éducateurs" ids={plan.educateurs.retires} nom={nomEduc} couleur={colors.accent.amber} />}
            {plan.educateurs.affiches.length > 0 && <Groupe titre="Réaffichés dans le menu de vos éducateurs" ids={plan.educateurs.affiches} nom={nomEduc} couleur={colors.accent.success} />}
            {nouveauModele && plan.club.retires.length > 0 && (
              <p style={{ ...ligne, color: colors.text.primary }}>Un outil désactivé est aussi fermé à vos éducateurs. Vos données restent là. Vous pourrez le réactiver et le rouvrir.</p>
            )}
            {mode === 'individualise' && (
              <p style={ligne}>Le menu des éducateurs repasse en « Le même pour tous ». Vos réglages individuels sont gardés de côté.</p>
            )}
            <p style={{ ...ligne, color: colors.text.faint }}>Rien n'est supprimé et aucun outil payant n'est acheté ni activé. Un outil qu'un éducateur paie lui-même reste affiché pour lui. Vos éducateurs sont prévenus dans leur cloche.</p>
          </>
        )}
        <ApercuMenuEducateur mode="commun" lignes={ouvert.apres} educateurs={[]} couleur={couleur} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {!planVide(plan) && <button type="button" disabled={occupe} onClick={appliquer} className="mc-btn" style={st.bouton(true, occupe)}><Icone d={ICONES.check} size={16} trait={2.6} /> Appliquer</button>}
          <button type="button" disabled={occupe} onClick={() => setOuvert(null)} className="mc-btn" style={st.bouton(false, occupe)}>{planVide(plan) ? 'Fermer' : 'Ne pas appliquer'}</button>
        </div>
      </div>
    )
  })()

  return (
    <section aria-labelledby="modeles-depart" style={{ margin: '0 0 36px', padding: 22, borderRadius: 20, background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: st.marque + '24', color: st.marque }}><Icone d={ICONES.eclair} size={18} /></span>
        <h3 id="modeles-depart" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: colors.text.primary }}>Modèles de départ</h3>
      </div>
      <p style={{ margin: '0 0 16px', maxWidth: 640, fontSize: 13, lineHeight: 1.55, color: colors.text.faint }}>
        Un clic pour pré-régler vos outils et le menu de vos éducateurs, puis vous ajustez. Vous voyez ce qui change avant de valider.
      </p>
      <div role="group" aria-label="Modèles de départ" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {MODELES.map(m => {
          const actif = ouvert?.modele.id === m.id
          return (
            <button key={m.id} type="button" disabled={occupe} aria-expanded={actif} onClick={() => choisir(m)} className="mc-btn mc-carte"
              style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: occupe ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', border: `2px solid ${actif ? st.marque : colors.border.default}`, background: actif ? st.marque + '16' : colors.background.surface, color: colors.text.primary }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{m.nom}</span>
              <span style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.45, color: colors.text.faint }}>{m.pour}</span>
            </button>
          )
        })}
      </div>
      {erreur && <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {rendu}
      <BandeauAnnuler changement={changement} onFin={finChangement} />
    </section>
  )
}
