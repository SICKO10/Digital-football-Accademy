import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useColors } from '../../lib/theme'
import { ecrireLigne, ecrireMode, lireReglages, modeDepuis, prevenirEducateurs, DELAI_PREVENIR, OUTILS_EDUCATEUR } from './ecritures'
import CarteOutil from '../outils/CarteOutil'
import Interrupteur from '../outils/Interrupteur'
import BandeauAnnuler from './BandeauAnnuler'
import ApercuMenuEducateur from './ApercuMenuEducateur'

// Étape 3 de Mon club : le menu des éducateurs affiliés, le même pour tous ou
// réglé éducateur par éducateur. Ne règle que l'affichage du menu : un outil
// retiré reste joignable par un lien direct, rien n'est supprimé. Les réglages
// individuels sont mis de côté (pas effacés) quand on repasse en « même pour
// tous » ; l'appli des éducateurs les ignore alors (voir affichageDepuisLignes).
// `educateurs` : éducateurs affiliés acceptés (lignes de club_educateurs).
export default function EtapeEducateurs({ clubId, educateurs, couleurPrincipale }) {
  const colors = useColors()
  const [mode, setMode] = useState('commun')
  const [lignes, setLignes] = useState([])
  const [pret, setPret] = useState(false)
  const [choisi, setChoisi] = useState(null)
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [apercu, setApercu] = useState(false)
  const [changement, setChangement] = useState(null)
  const finChangement = useCallback(() => setChangement(null), [])
  const numero = useRef(0)
  // Lot de changements en attente d'être annoncés aux éducateurs : l'état du
  // réglage avant le premier changement, et la minuterie d'envoi.
  const lot = useRef({ avant: null, minuterie: null })
  const etat = useRef({})

  const [version, setVersion] = useState(0)
  const lire = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    let annule = false
    lireReglages(clubId).then(({ reglages, lus }) => {
      if (annule) return
      const echec = reglages.error || lus.error
      if (echec) { setErreur(echec.message || 'Impossible de lire les réglages, réessayez dans un instant.'); return }
      setMode(modeDepuis(reglages))
      setLignes(lus.data || [])
      setPret(true)
    })
    return () => { annule = true }
  }, [clubId, version])

  const commun = useMemo(() => Object.fromEntries(lignes.filter(l => l.cible === 'educateurs').map(l => [l.outil, l.visible])), [lignes])
  const individuel = useCallback(
    (educId) => Object.fromEntries(lignes.filter(l => l.cible === 'educateur' && l.educateur_id === educId).map(l => [l.outil, l.visible])),
    [lignes],
  )
  const individualise = mode === 'individualise'
  const nbMisDeCote = !individualise ? new Set(lignes.filter(l => l.cible === 'educateur').map(l => l.educateur_id)).size : 0

  const liste = useMemo(() => (educateurs || []).map(e => ({
    id: e.educateur_id,
    nom: [e.educateur?.prenom, e.educateur?.nom].filter(Boolean).join(' ') || e.educateur?.email || 'Éducateur',
  })), [educateurs])
  const cible = individualise ? (liste.find(e => e.id === choisi) || liste[0] || null) : null
  const ajustes = (id) => Object.keys(individuel(id)).length > 0

  // Ce que voit l'éducateur pour cet outil : ligne individuelle (mode
  // individualisé), sinon réglage commun, sinon affiché.
  const affiche = (o) => {
    if (cible) { const i = individuel(cible.id); if (o.id in i) return i[o.id] }
    return commun[o.id] !== false
  }

  // Envoie aux éducateurs ce qui a vraiment changé dans leur menu depuis le début
  // du lot, relu en base : un changement annulé, ou remis comme avant, n'envoie rien.
  const prevenir = useCallback(async () => {
    const { avant } = lot.current
    lot.current = { avant: null, minuterie: null }
    if (!avant) return
    try {
      await prevenirEducateurs(clubId, avant, etat.current.liste)
    } catch (e) {
      console.error('Mon club : éducateurs non prévenus', e.message)
      if (etat.current.monte) setErreur('Le réglage est bien enregistré, mais vos éducateurs n\'ont pas pu être prévenus.')
    }
  }, [clubId])

  const programmerPrevenir = () => {
    clearTimeout(lot.current.minuterie)
    lot.current.minuterie = setTimeout(prevenir, DELAI_PREVENIR)
  }

  // Garde sous la main ce que le lot a besoin de relire hors de l'affichage.
  useEffect(() => { etat.current = { ...etat.current, liste, mode, lignes } }, [liste, mode, lignes])

  // Quitter la page avec un lot en attente : on l'envoie tout de suite.
  useEffect(() => {
    const suivi = etat
    const suiviLot = lot
    suivi.current.monte = true
    return () => {
      suivi.current.monte = false
      clearTimeout(suiviLot.current.minuterie)
      prevenir()
    }
  }, [prevenir])

  const executer = async (message, faire, defaire) => {
    setErreur('')
    if (!lot.current.avant) lot.current.avant = { mode: etat.current.mode, lignes: etat.current.lignes }
    try {
      await faire()
      lire()
      programmerPrevenir()
      setChangement({
        id: ++numero.current,
        message,
        annuler: async () => {
          setChangement(null)
          setErreur('')
          try { await defaire(); lire(); programmerPrevenir() } catch (e) { setErreur(e.message) }
        },
      })
    } catch (e) {
      setErreur(e.message || 'Le changement n\'a pas été enregistré, réessayez dans un instant.')
    }
  }

  const changerOutil = async (o) => {
    const visible = !affiche(o)
    setEnCours(o.id)
    if (cible) {
      const avant = individuel(cible.id)[o.id]
      // Retrouver la valeur du réglage commun = plus d'ajustement pour cet outil.
      const apres = visible === (commun[o.id] !== false) ? undefined : visible
      await executer(
        `${o.nom} pour ${cible.nom} : ${visible ? 'affiché' : 'retiré du menu'}.`,
        () => ecrireLigne(clubId, 'educateur', cible.id, o.id, apres),
        () => ecrireLigne(clubId, 'educateur', cible.id, o.id, avant),
      )
    } else {
      const avant = commun[o.id]
      await executer(
        `${o.nom} : ${visible ? 'affiché' : 'retiré du menu'} pour tous vos éducateurs.`,
        () => ecrireLigne(clubId, 'educateurs', null, o.id, visible ? undefined : false),
        () => ecrireLigne(clubId, 'educateurs', null, o.id, avant),
      )
    }
    setEnCours(null)
  }

  const changerMode = async (nouveau) => {
    if (nouveau === mode) return
    const avant = mode
    setEnCours('mode')
    await executer(
      nouveau === 'commun'
        ? 'Le même menu pour tous. Vos réglages individuels sont gardés de côté.'
        : 'Menu réglé éducateur par éducateur. Au départ, chacun suit le réglage commun.',
      () => ecrireMode(clubId, nouveau),
      () => ecrireMode(clubId, avant),
    )
    setEnCours(null)
  }

  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }
  const bouton = (actif) => ({
    cursor: enCours ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '9px 16px', borderRadius: 8,
    fontWeight: actif ? 700 : 400,
    ...(actif
      ? { background: colors.accent.brand, color: colors.accent.onBrand, border: 'none' }
      : { background: 'transparent', color: colors.text.muted, border: `1px solid ${colors.border.default}` }),
  })

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <p style={{ margin: '0 0 16px', maxWidth: 620, fontSize: 13, lineHeight: 1.55, color: colors.text.faint }}>
        Choisissez les entrées du menu que vos éducateurs voient. Retirer un outil enlève seulement son entrée du menu : rien n'est supprimé, et en le réaffichant l'éducateur retrouve tout. Un outil qu'un éducateur paie lui-même reste toujours affiché pour lui.
      </p>
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!pret && !erreur && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement des réglages...</p>}

      {pret && (
        <>
          <div role="radiogroup" aria-label="Mode de réglage" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <button type="button" role="radio" aria-checked={!individualise} disabled={!!enCours} onClick={() => changerMode('commun')} style={bouton(!individualise)}>
              Le même pour tous
            </button>
            <button type="button" role="radio" aria-checked={individualise} disabled={!!enCours} onClick={() => changerMode('individualise')} style={bouton(individualise)}>
              Individualisé
            </button>
          </div>
          <div style={{ margin: '0 0 16px' }}>
            <button type="button" aria-expanded={apercu} onClick={() => setApercu(a => !a)} style={{ ...bouton(false), cursor: 'pointer' }}>
              {apercu ? 'Masquer l\'aperçu' : 'Voir comme un éducateur'}
            </button>
          </div>
          {apercu && <ApercuMenuEducateur mode={mode} lignes={lignes} educateurs={liste} couleur={couleurPrincipale} onFermer={() => setApercu(false)} />}
          {nbMisDeCote > 0 && (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: colors.text.faint }}>
              {nbMisDeCote} éducateur{nbMisDeCote > 1 ? 's ont' : ' a'} un réglage individuel gardé de côté : il revient si vous repassez en « Individualisé ».
            </p>
          )}

          {individualise && (
            liste.length === 0
              ? <p style={{ margin: '12px 0', fontSize: 13, color: colors.text.faint }}>Aucun éducateur affilié pour l'instant. Leur menu suivra le réglage commun dès leur arrivée.</p>
              : (
                <div role="tablist" aria-label="Éducateurs" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0', margin: '8px 0 16px' }}>
                  {liste.map(e => {
                    const actif = cible?.id === e.id
                    return (
                      <button key={e.id} type="button" role="tab" aria-selected={actif} onClick={() => setChoisi(e.id)} style={{ ...bouton(actif), flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        {e.nom}
                        {ajustes(e.id) && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: actif ? 'rgba(255,255,255,0.25)' : colors.accent.amber + '1f', color: actif ? colors.accent.onBrand : colors.accent.amber }}>
                            Ajusté
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
          )}

          {(!individualise || cible) && (
            <div style={{ marginTop: individualise ? 0 : 16 }}>
              {cible && <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: colors.text.primary }}>Menu de {cible.nom}</h3>}
              <div style={grille}>
                {OUTILS_EDUCATEUR.map(o => {
                  const actif = affiche(o)
                  const ajuste = cible && o.id in individuel(cible.id)
                  return (
                    <CarteOutil
                      key={o.id}
                      nom={o.nom}
                      promesse={o.promesse}
                      badge={!actif
                        ? { texte: 'Retiré du menu', couleur: colors.accent.amber }
                        : ajuste ? { texte: 'Ajusté pour cet éducateur', couleur: colors.accent.brand } : null}
                      action={<Interrupteur actif={actif} libelle={`${o.nom} dans le menu${cible ? ` de ${cible.nom}` : ' des éducateurs'}`} onClick={() => changerOutil(o)} occupe={enCours === o.id || enCours === 'mode'} />}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <BandeauAnnuler changement={changement} onFin={finChangement} />
    </div>
  )
}
