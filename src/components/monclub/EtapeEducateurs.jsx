import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useColors } from '../../lib/theme'
import { supabase } from '../../supabase'
import { outilsDuRole, cleFournitureClub, outilOuvrableParClub } from '../../lib/catalogueOutils'
import { appelerOutils } from '../../lib/outilsApi'
import { ecrireLigne, ecrireMode, lireReglages, modeDepuis, prevenirEducateurs, DELAI_PREVENIR, OUTILS_EDUCATEUR } from './ecritures'
import { Icone, EnteteEtape, CarteReglage } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'
import Interrupteur from '../outils/Interrupteur'
import BandeauAnnuler from './BandeauAnnuler'
import ApercuMenuEducateur from './ApercuMenuEducateur'

const AUCUN = []

// Étape 3 de Mon club : le menu des éducateurs affiliés, le même pour tous ou
// réglé éducateur par éducateur. Ne règle que l'affichage du menu : un outil
// retiré reste joignable par un lien direct, rien n'est supprimé. Les réglages
// individuels sont mis de côté (pas effacés) quand on repasse en « même pour
// tous » ; l'appli des éducateurs les ignore alors (voir affichageDepuisLignes).
// `educateurs` : éducateurs affiliés acceptés (lignes de club_educateurs).
// `fourniture` (club du nouveau modèle) : { forfaitActif, places }. Dans ce cas
// l'interrupteur du réglage commun veut dire « le club fournit cet outil »
// (ligne dans outils_club_ouverts, via api/outils.js), dans la limite des places.
// `outils` : useOutils du club (outils ouverts, outils détenus, rechargement).
export default function EtapeEducateurs({ clubId, educateurs, couleurPrincipale, fourniture = null, outils = null }) {
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

  const [sansPlaceLus, setSansPlace] = useState(AUCUN)
  // Outils fournis à un éducateur précis : { [educateur_id]: [outil, ...] }.
  const [fournisIndiv, setFournisIndiv] = useState({})
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

  const liste = useMemo(() => {
    const vus = new Set()
    return (educateurs || []).filter(e => e.educateur_id && !vus.has(e.educateur_id) && vus.add(e.educateur_id)).map(e => ({
      id: e.educateur_id,
      nom: [e.educateur?.prenom, e.educateur?.nom].filter(Boolean).join(' ') || e.educateur?.email || 'Éducateur',
    }))
  }, [educateurs])
  const offre = !!fourniture && !!outils
  const places = fourniture?.places ?? 0
  const fournis = offre ? outils.ouverts : null

  // Éducateurs au-delà de la limite du forfait : la base décide (educateur_a_place).
  const idsListe = liste.map(e => e.id).join(',')
  useEffect(() => {
    if (!offre || !fourniture.forfaitActif || !idsListe) return undefined
    let annule = false
    Promise.all(idsListe.split(',').map(id => supabase.rpc('educateur_a_place', { p_club: clubId, p_educateur: id }).then(r => [id, r])))
      .then(lus => {
        if (annule) return
        if (lus.some(([, r]) => r.error)) { console.error('educateur_a_place', lus.find(([, r]) => r.error)[1].error.message); return }
        setSansPlace(lus.filter(([, r]) => r.data === false).map(([id]) => id))
      })
    return () => { annule = true }
  }, [offre, fourniture?.forfaitActif, places, idsListe, clubId, version])
  // Lecture de ce que le club fournit éducateur par éducateur (le club la lit sous ses droits).
  useEffect(() => {
    if (!offre) return undefined
    let annule = false
    supabase.from('outils_educateur_fournis').select('educateur_id, outil').eq('club_id', clubId).then(({ data, error }) => {
      if (annule) return
      if (error) { console.error('outils_educateur_fournis', error.message); setErreur('Impossible de lire les outils fournis éducateur par éducateur, réessayez dans un instant.'); return }
      const parEducateur = {}
      for (const l of data || []) (parEducateur[l.educateur_id] ||= []).push(l.outil)
      setFournisIndiv(parEducateur)
    })
    return () => { annule = true }
  }, [offre, clubId, version])
  const sansPlace = offre && fourniture.forfaitActif && idsListe ? sansPlaceLus : AUCUN
  const nomSansPlace = liste.filter(e => sansPlace.includes(e.id)).map(e => e.nom)
  const cible = individualise ? (liste.find(e => e.id === choisi) || liste[0] || null) : null
  const ajustes = (id) => Object.keys(individuel(id)).length > 0

  // Ce que voit l'éducateur pour cet outil : ligne individuelle (mode
  // individualisé), sinon réglage commun, sinon affiché.
  const affiche = (o) => {
    if (cible) { const i = individuel(cible.id); if (o.id in i) return i[o.id] }
    return commun[o.id] !== false
  }

  // Nouveau modèle : l'outil est-il fourni, et le club peut-il le fournir ?
  const fourni = (o) => offre && outils.ouverts.includes(cleFournitureClub(o))
  const detenu = (o) => !o.viaClub || outils.lignes.some(l => l.outil === o.viaClub)
  // Fourni à tous, ou à l'éducateur choisi seulement. Seuls les outils offerts (sans `viaClub`) peuvent l'être à un seul.
  const peutEtreFourniAUn = (o) => offre && !o.viaClub
  const fourniAUn = (o) => !!cible && (fournisIndiv[cible.id] || []).includes(o.id)

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

  // Interrupteur « fourni » : ouvre ou ferme l'outil pour tous les éducateurs
  // affiliés (api/outils.js prévient ceux qui le perdent). L'ouvrir remet aussi
  // l'entrée au menu si elle avait été retirée.
  const changerFourniture = async (o) => {
    const cle = cleFournitureClub(o)
    const ouvert = !fourni(o)
    setEnCours(o.id)
    await executer(
      `${o.nom} : ${ouvert ? 'fourni à vos éducateurs' : 'plus fourni à vos éducateurs'}.`,
      async () => {
        await appelerOutils('ouvrir_club', { outil: cle, ouvert })
        if (ouvert && commun[o.id] === false) await ecrireLigne(clubId, 'educateurs', null, o.id, undefined)
        outils.recharger()
      },
      async () => { await appelerOutils('ouvrir_club', { outil: cle, ouvert: !ouvert }); outils.recharger() },
    )
    setEnCours(null)
  }

  // Interrupteur « fourni à cet éducateur » : fournit ou cesse de fournir un outil
  // à lui seul (api/outils.js, même limite de places). Le fournir remet aussi
  // l'entrée à son menu si elle avait été retirée pour lui.
  const changerFournitureIndividuelle = async (o) => {
    const educateur = cible.id
    const ouvert = !fourniAUn(o)
    setEnCours(o.id)
    await executer(
      `${o.nom} : ${ouvert ? 'fourni à' : 'plus fourni à'} ${cible.nom}.`,
      async () => {
        await appelerOutils('fournir_educateur', { outil: o.id, educateur, ouvert })
        if (ouvert && OUTILS_EDUCATEUR.some(x => x.id === o.id) && !affiche(o)) await ecrireLigne(clubId, 'educateur', educateur, o.id, commun[o.id] !== false ? undefined : true)
      },
      () => appelerOutils('fournir_educateur', { outil: o.id, educateur, ouvert: !ouvert }),
    )
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

  const st = stylesMonClub(colors)
  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }
  const outilsListe = offre && !individualise ? outilsDuRole('educateur').filter(o => outilOuvrableParClub(cleFournitureClub(o))) : OUTILS_EDUCATEUR
  const nbAffiches = pret ? outilsListe.filter(o => (offre && !individualise ? fourni(o) : affiche(o))).length : 0
  // Fiche d'un éducateur (nouveau modèle) : aussi les outils fournissables sans entrée de menu à régler (Analyse vidéo).
  const outilsFiche = offre && individualise ? outilsDuRole('educateur').filter(o => OUTILS_EDUCATEUR.some(x => x.id === o.id) || peutEtreFourniAUn(o)) : outilsListe
  const initiales = (nom) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0].toUpperCase()).join('')
  const modes = [
    { id: 'commun', titre: 'Le même pour tous', texte: 'Tous vos éducateurs voient le même menu.', icone: ICONES.menu },
    { id: 'individualise', titre: 'Individualisé', texte: 'Vous réglez le menu éducateur par éducateur.', icone: ICONES.educateurs },
  ]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <EnteteEtape icone={ICONES.educateurs} titre="Dashboard de mes éducateurs"
        texte={offre
          ? 'Choisissez les outils que votre club fournit à vos éducateurs : ils les utilisent sans rien payer, dans la limite des places de votre forfait. Si vous cessez de fournir un outil, vos éducateurs sont prévenus et gardent leurs données. Un outil qu\'un éducateur paie lui-même reste toujours affiché pour lui.'
          : 'Choisissez les entrées du menu que vos éducateurs voient. Retirer un outil enlève seulement son entrée du menu : rien n\'est supprimé, et en le réaffichant l\'éducateur retrouve tout. Un outil qu\'un éducateur paie lui-même reste toujours affiché pour lui.'}>
        {pret && (
          <div style={{ flex: '0 1 220px', minWidth: 170, padding: '12px 16px', borderRadius: 14, background: colors.background.sunken, border: `1px solid ${colors.border.subtle}` }}>
            <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}><strong style={{ fontSize: 20, color: colors.text.primary }}>{nbAffiches}</strong> sur {outilsListe.length} {offre && !individualise ? 'fournis' : 'affichés'}</p>
            <div role="meter" aria-valuemin={0} aria-valuemax={outilsListe.length} aria-valuenow={nbAffiches} aria-label="Entrées affichées dans le menu" style={{ height: 8, borderRadius: 999, marginTop: 8, background: st.marque + '26', overflow: 'hidden' }}>
              <div style={{ width: `${(nbAffiches / outilsListe.length) * 100}%`, height: '100%', borderRadius: 999, background: st.marque, transition: 'width .25s' }} />
            </div>
            {offre && fourniture.forfaitActif && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: colors.text.secondary }}><strong style={{ color: sansPlace.length ? colors.accent.red : colors.text.primary }}>{Math.min(liste.length, places)} / {places}</strong> places</p>
            )}
          </div>
        )}
      </EnteteEtape>
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!pret && !erreur && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement des réglages...</p>}

      {pret && (
        <>
          {offre && !fourniture.forfaitActif && (
            <p role="status" style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: colors.accent.amber + '22', color: colors.text.primary }}>
              Prenez un forfait pour fournir des outils à vos éducateurs.
            </p>
          )}
          {offre && sansPlace.length > 0 && (
            <div role="status" style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, background: colors.accent.amber + '22', color: colors.text.primary }}>
              <strong>Sans place : socle seulement.</strong> Votre forfait permet {places} éducateur{places > 1 ? 's' : ''} : {nomSansPlace.join(', ')} {sansPlace.length > 1 ? 'n\'ont' : 'n\'a'} que le socle gratuit. Passez au forfait supérieur pour leur fournir aussi les outils. Aucune affiliation n'est supprimée.
            </div>
          )}
          <div role="radiogroup" aria-label="Mode de réglage" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14, maxWidth: 720 }}>
            {modes.map(m => {
              const actif = (m.id === 'individualise') === individualise
              return (
                <button key={m.id} type="button" role="radio" aria-checked={actif} disabled={!!enCours} onClick={() => changerMode(m.id)} className="mc-btn mc-carte"
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: enCours ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif',
                    background: actif ? st.marque + '16' : colors.background.surface, border: `2px solid ${actif ? st.marque : colors.border.default}`, color: colors.text.primary }}>
                  <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: actif ? st.marque : colors.background.sunken, color: actif ? st.surMarque : colors.text.faint }}>
                    <Icone d={m.icone} size={20} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 800 }}>{m.titre}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, lineHeight: 1.45, color: colors.text.faint }}>{m.texte}</span>
                  </span>
                  {actif && <span aria-hidden="true" style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: st.marque, color: st.surMarque }}><Icone d={ICONES.check} size={13} trait={3} /></span>}
                </button>
              )
            })}
          </div>
          <div style={{ margin: '0 0 22px' }}>
            <button type="button" aria-expanded={apercu} onClick={() => setApercu(a => !a)} className="mc-btn" style={st.bouton(false)}>
              <Icone d={ICONES.oeil} size={16} />{apercu ? 'Masquer l\'aperçu' : 'Voir comme un éducateur'}
            </button>
          </div>
          {apercu && <ApercuMenuEducateur mode={mode} lignes={lignes} educateurs={liste} couleur={couleurPrincipale} fournis={fournis} sansPlace={sansPlace} fournisIndividuels={fournisIndiv} onFermer={() => setApercu(false)} />}
          {nbMisDeCote > 0 && (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: colors.text.faint }}>
              {nbMisDeCote} éducateur{nbMisDeCote > 1 ? 's ont' : ' a'} un réglage individuel gardé de côté : il revient si vous repassez en « Individualisé ».
            </p>
          )}

          {individualise && (
            liste.length === 0
              ? <p style={{ margin: '12px 0', fontSize: 13, color: colors.text.faint }}>Aucun éducateur affilié pour l'instant. Leur menu suivra le réglage commun dès leur arrivée.</p>
              : (
                <div role="tablist" aria-label="Éducateurs" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 12px', margin: '0 0 12px' }}>
                  {liste.map(e => {
                    const actif = cible?.id === e.id
                    return (
                      <button key={e.id} type="button" role="tab" aria-selected={actif} onClick={() => setChoisi(e.id)} className="mc-btn" style={{ ...st.pastille(actif), paddingLeft: 8 }}>
                        <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: actif ? 'rgba(0,0,0,0.16)' : colors.background.sunken, color: actif ? st.surMarque : colors.text.secondary }}>{initiales(e.nom)}</span>
                        {e.nom}
                        {sansPlace.includes(e.id) && <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: actif ? 'rgba(0,0,0,0.16)' : colors.accent.red + '22', color: actif ? st.surMarque : colors.text.primary }}>Sans place</span>}
                        {(fournisIndiv[e.id] || []).length > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: actif ? 'rgba(0,0,0,0.16)' : st.marque + '22', color: actif ? st.surMarque : colors.text.primary }}>
                            {fournisIndiv[e.id].length} fourni{fournisIndiv[e.id].length > 1 ? 's' : ''} à lui seul
                          </span>
                        )}
                        {ajustes(e.id) && (
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: actif ? 'rgba(0,0,0,0.16)' : colors.accent.amber + '2a', color: actif ? st.surMarque : colors.text.primary }}>
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
            <div>
              {cible && <h3 style={{ margin: '4px 0 14px', fontSize: 16, fontWeight: 800, color: colors.text.primary }}>Menu de {cible.nom}</h3>}
              <div style={grille}>
                {outilsFiche.map(o => {
                  if (offre && !individualise) {
                    const actifF = fourni(o)
                    const bloque = !actifF && (!fourniture.forfaitActif || !detenu(o))
                    return (
                      <CarteReglage
                        key={o.id}
                        nom={o.nom}
                        description={o.promesse}
                        actif={actifF}
                        badge={actifF ? { texte: 'Fourni par le club', couleur: st.marque }
                          : !fourniture.forfaitActif ? { texte: 'Forfait requis', couleur: colors.accent.amber }
                            : !detenu(o) ? { texte: 'Activez-le d\'abord dans Outils du club', couleur: colors.accent.amber } : null}
                        action={<Interrupteur actif={actifF} libelle={`${o.nom} fourni à mes éducateurs`} onClick={() => changerFourniture(o)} desactive={bloque} occupe={enCours === o.id || enCours === 'mode'} />}
                      />
                    )
                  }
                  const reglableMenu = OUTILS_EDUCATEUR.some(x => x.id === o.id)
                  const parUn = cible && peutEtreFourniAUn(o)
                  const pourTous = parUn && fourni(o)
                  const actif = reglableMenu ? affiche(o) : !!(pourTous || fourniAUn(o))
                  const ajuste = reglableMenu && cible && o.id in individuel(cible.id)
                  const aUnePlace = cible && !sansPlace.includes(cible.id)
                  const fournisseurBloque = !!parUn && (!fourniture.forfaitActif || (!fourniAUn(o) && !aUnePlace))
                  return (
                    <CarteReglage
                      key={o.id}
                      nom={o.nom}
                      description={o.promesse}
                      actif={actif}
                      badge={!reglableMenu ? null : !actif
                        ? { texte: 'Retiré du menu', couleur: colors.accent.amber }
                        : ajuste ? { texte: 'Ajusté pour cet éducateur', couleur: st.marque } : null}
                      extra={parUn && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTop: `1px solid ${colors.border.subtle}` }}>
                          <span style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 700, color: colors.text.secondary }}>
                            {pourTous ? 'Fourni à tous vos éducateurs'
                              : fourniAUn(o) ? `Fourni à ${cible.nom}`
                                : !fourniture.forfaitActif ? 'Forfait requis pour fournir cet outil'
                                  : !aUnePlace ? 'Sans place : forfait supérieur nécessaire'
                                    : `Fournir à ${cible.nom} seulement`}
                          </span>
                          <Interrupteur actif={pourTous || fourniAUn(o)} libelle={`${o.nom} fourni à ${cible.nom} seulement`} onClick={() => changerFournitureIndividuelle(o)} desactive={pourTous || fournisseurBloque} occupe={enCours === o.id || enCours === 'mode'} />
                        </div>
                      )}
                      action={reglableMenu ? <Interrupteur actif={actif} libelle={`${o.nom} dans le menu${cible ? ` de ${cible.nom}` : ' des éducateurs'}`} onClick={() => changerOutil(o)} occupe={enCours === o.id || enCours === 'mode'} /> : null}
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
