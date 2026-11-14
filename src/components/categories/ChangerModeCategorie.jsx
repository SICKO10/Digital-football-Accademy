import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { MODES_CATEGORIE } from '../../lib/categoriesClub'
import { bornesSaison, saisonActuelle } from '../../lib/saison'
import {
  regrouperJoueurs, proposerEquipe, equipeAutorisee, texteRaison, joueursSansEquipe, construireRepartition,
  resumeRepartition, resumeFusion, texteLienReste, nomEquipe,
} from '../../lib/categoriesMode'

// Réglages d'une catégorie : passer d'un mode à l'autre (compte principal du
// club seulement, décision 2 du brief). Commun → par équipe : une équipe est
// proposée à chaque joueur, corrigeable, puis confirmation. Par équipe →
// commun : confirmation seule. Le changement se fait en une fois dans la base
// (categorie_changer_mode) : tout ou rien.
export default function ChangerModeCategorie({ categorie, accentColor, filAriane, onRetour, onTermine }) {
  const colors = useColors()
  const equipes = useMemo(() => categorie.equipes || [], [categorie.equipes])
  const libelle = labelCategorie(categorie.nom)
  const versCommun = categorie.mode !== 'commun'
  const cible = versCommun ? 'commun' : 'par_equipe'

  const [fiches, setFiches] = useState(null)
  const [choix, setChoix] = useState({})
  const [propositions, setPropositions] = useState({})
  const [etape, setEtape] = useState(versCommun ? 'confirmation' : 'repartition')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState(null)

  useEffect(() => {
    let annule = false
    supabase.rpc('categories_mode_donnees', { p_categorie_id: categorie.id, p_depuis: bornesSaison(saisonActuelle()).date_debut })
      .then(({ data, error }) => {
        if (annule) return
        if (error) { setErreur(error.message); setFiches([]); return }
        const lignes = data || []
        const props = {}
        const depart = {}
        for (const j of regrouperJoueurs(lignes)) {
          props[j.cle] = proposerEquipe(j, equipes)
          depart[j.cle] = equipeAutorisee(j, equipes.find(e => e.id === props[j.cle].equipe_id)) ? props[j.cle].equipe_id : ''
        }
        setPropositions(props)
        setChoix(depart)
        setFiches(lignes)
      })
    return () => { annule = true }
  }, [categorie.id, equipes])

  const joueurs = useMemo(() => regrouperJoueurs(fiches || []), [fiches])
  const manquants = joueursSansEquipe(joueurs, choix, equipes)
  const resume = resumeRepartition(joueurs, choix, equipes)
  const fusion = resumeFusion(fiches || [], equipes)
  const equipesSansCoach = equipes.filter(e => !e.educateur_id)

  const appliquer = async () => {
    if (enCours) return
    setEnCours(true); setErreur('')
    const { data, error } = await supabase.rpc('categorie_changer_mode', {
      p_categorie_id: categorie.id,
      p_mode: cible,
      p_repartition: versCommun ? [] : construireRepartition(joueurs, choix),
    })
    setEnCours(false)
    if (error) { setErreur(error.message); return }
    setResultat(data || {})
    setEtape('fait')
  }

  const btnLien = { background: 'none', border: 'none', padding: 0, color: accentColor, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const btnPrincipal = (bloque) => ({ padding: '11px 18px', borderRadius: '10px', border: 'none', background: accentColor, color: colors.accent.onBrand, fontWeight: 700, fontSize: '14px', cursor: bloque ? 'not-allowed' : 'pointer', opacity: bloque ? 0.45 : 1, fontFamily: 'Inter, sans-serif' })
  const btnSecondaire = { padding: '11px 18px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '14px 16px' }
  const pastille = { padding: '6px 12px', borderRadius: '9px', background: colors.background.base, border: `1px solid ${colors.border.subtle}`, fontSize: '13px', fontWeight: 700 }
  const point = { margin: 0, fontSize: '14px', lineHeight: 1.5, color: colors.text.secondary }

  const effectifs = (liste) => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {liste.map(({ equipe, nb }) => (
        <span key={equipe.id} style={pastille}>{nomEquipe(equipe)} · {nb} joueur{nb > 1 ? 's' : ''}</span>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '760px', minWidth: 0 }}>
      <nav style={{ fontSize: '13px', color: colors.text.faint }}>
        {(filAriane || []).map((e, i) => (
          <span key={i}><button style={btnLien} onClick={e.onClick}>{e.label}</button> / </span>
        ))}
        Mode {libelle}
      </nav>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Mode de {libelle}</h1>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>
          {etape === 'fait'
            ? `Maintenant : ${MODES_CATEGORIE[cible].label}`
            : `Actuellement : ${MODES_CATEGORIE[categorie.mode]?.label || categorie.mode} · passer en ${MODES_CATEGORIE[cible].label.toLowerCase()}`}
        </p>
      </div>

      {erreur && <p role="alert" style={{ margin: 0, color: colors.accent.red, fontSize: '13px' }}>{erreur}</p>}
      {!fiches && !erreur && <p style={{ margin: 0, color: colors.text.faint, fontSize: '14px' }}>Chargement des joueurs</p>}

      {fiches && etape === 'repartition' && (
        <>
          <div style={carte}>
            <p style={{ ...point, color: colors.text.primary, fontWeight: 700 }}>Chaque joueur doit rejoindre une équipe.</p>
            <p style={{ ...point, marginTop: '4px' }}>
              L'équipe proposée est celle où il a été le plus convoqué cette saison, sinon celle où il s'est le plus entraîné, sinon celle de sa fiche. Tu peux la changer.
            </p>
            <div style={{ marginTop: '12px' }}>{effectifs(resume.parEquipe)}</div>
            {equipesSansCoach.length > 0 && (
              <p style={{ ...point, marginTop: '10px', fontSize: '13px', color: colors.accent.amber }}>
                {equipesSansCoach.map(nomEquipe).join(', ')} {equipesSansCoach.length > 1 ? 'n\'ont' : 'n\'a'} pas d'éducateur : seuls les joueurs qui y sont déjà peuvent y rester. Pour y placer d'autres joueurs, nomme d'abord son éducateur.
              </p>
            )}
          </div>
          {joueurs.length === 0 ? (
            <div style={{ ...carte, textAlign: 'center', color: colors.text.secondary, fontWeight: 600 }}>Aucun joueur dans cette catégorie.</div>
          ) : (
            <div style={{ ...carte, padding: 0 }}>
              {joueurs.map((j, i) => {
                const prop = propositions[j.cle]
                const equipeProp = equipes.find(e => e.id === prop?.equipe_id)
                const sans = !equipeAutorisee(j, equipes.find(e => e.id === choix[j.cle]))
                return (
                  <div key={j.cle} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', borderTop: i ? `1px solid ${colors.border.subtle}` : 'none' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{j.nom}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: sans ? colors.accent.amber : colors.text.faint }}>
                        {!sans ? (choix[j.cle] === prop?.equipe_id ? texteRaison(prop?.raison, equipeProp) : 'Choisi par toi')
                          : equipeProp && !equipeProp.educateur_id ? `Le plus souvent en ${nomEquipe(equipeProp)}, qui n'a pas d'éducateur : choisis une équipe`
                          : 'Aucune équipe choisie'}
                        {!j.principale.joueur_id && ' · sans compte'}
                      </p>
                    </div>
                    <select aria-label={`Équipe de ${j.nom}`} value={choix[j.cle] || ''} onChange={e => setChoix(p => ({ ...p, [j.cle]: e.target.value }))}
                      style={{ flex: '0 1 180px', minWidth: '140px', padding: '9px 10px', borderRadius: '10px', border: `1px solid ${sans ? colors.accent.amber : colors.border.default}`, background: colors.background.base, color: colors.text.primary, fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <option value="">Choisir une équipe</option>
                      {equipes.map(e => (
                        <option key={e.id} value={e.id} disabled={!equipeAutorisee(j, e)}>
                          {nomEquipe(e)}{e.educateur_id ? '' : ' (sans éducateur)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" disabled={manquants.length > 0} onClick={() => setEtape('confirmation')} style={btnPrincipal(manquants.length > 0)}>Continuer</button>
              <button type="button" onClick={onRetour} style={btnSecondaire}>Annuler</button>
            </div>
            {manquants.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.text.faint }}>
                {manquants.length} joueur{manquants.length > 1 ? 's' : ''} sans équipe : choisis une équipe pour {manquants.length > 1 ? 'chacun' : 'lui'}.
              </p>
            )}
          </div>
        </>
      )}

      {fiches && etape === 'confirmation' && (
        <>
          <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ ...point, color: colors.text.primary, fontWeight: 800, fontSize: '15px' }}>Ce qui va changer</p>
            {versCommun ? (
              <>
                {effectifs(fusion.parEquipe)}
                <p style={point}>Ces listes forment une seule liste de {fusion.total} joueur{fusion.total > 1 ? 's' : ''}, partagée par les éducateurs de {libelle}.</p>
                <p style={point}>Aucun joueur ne change d'équipe ni d'éducateur. Un joueur présent dans deux équipes apparaît une fois.</p>
                {fusion.doublons.length > 0 && (
                  <p style={point}>
                    Doublon{fusion.doublons.length > 1 ? 's' : ''} possible{fusion.doublons.length > 1 ? 's' : ''}, signalé{fusion.doublons.length > 1 ? 's' : ''} dans la liste (fiches sans compte au même nom) : {fusion.doublons.map(d => `${d.nom} (${d.nb} fiches)`).join(', ')}.
                  </p>
                )}
                <p style={point}>Les joueurs voient les entraînements et matchs de toute la catégorie et répondent au sondage par date. Les convocations se font depuis la grille de {libelle}.</p>
              </>
            ) : (
              <>
                {effectifs(resume.parEquipe)}
                {resume.changements.length === 0 ? (
                  <p style={point}>Aucun joueur ne change d'équipe.</p>
                ) : (
                  <>
                    <p style={point}>
                      {resume.changements.length > 1
                        ? `${resume.changements.length} joueurs changent d'équipe et passent chez l'éducateur de leur nouvelle équipe :`
                        : '1 joueur change d\'équipe et passe chez l\'éducateur de sa nouvelle équipe :'}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.6, color: colors.text.secondary }}>
                      {resume.changements.map(c => <li key={c.nom + c.apres?.id}>{c.nom} : {nomEquipe(c.avant)} vers {nomEquipe(c.apres)}</li>)}
                    </ul>
                  </>
                )}
                {resume.fichesGardees > 0 && (
                  <p style={point}>{resume.fichesGardees} fiche{resume.fichesGardees > 1 ? 's' : ''} en double d'un même joueur reste{resume.fichesGardees > 1 ? 'nt' : ''} dans leur équipe actuelle.</p>
                )}
                <p style={point}>Le sondage par date de la catégorie s'arrête : chaque équipe reprend son propre sondage.</p>
              </>
            )}
            <p style={{ ...point, color: colors.text.primary }}>
              L'historique ne bouge pas : matchs, entraînements, convocations, présences, minutes et buts restent rattachés à l'équipe où ils ont eu lieu.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" disabled={enCours} onClick={appliquer} style={btnPrincipal(enCours)}>
              {enCours ? 'Changement en cours' : versCommun ? `Passer ${libelle} en effectif commun` : `Passer ${libelle} en effectifs par équipe`}
            </button>
            <button type="button" onClick={versCommun ? onRetour : () => setEtape('repartition')} style={btnSecondaire}>
              {versCommun ? 'Annuler' : 'Modifier la répartition'}
            </button>
          </div>
        </>
      )}

      {etape === 'fait' && resultat && (
        <>
          <div style={{ ...carte, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ ...point, color: colors.text.primary, fontWeight: 800, fontSize: '15px' }}>
              {libelle} est maintenant en {MODES_CATEGORIE[cible].label.toLowerCase()}.
            </p>
            {!versCommun && (
              <p style={point}>
                {resultat.fiches_deplacees || 0} joueur{resultat.fiches_deplacees > 1 ? 's ont' : ' a'} changé d'équipe.
                {resultat.affiliations_deplacees > 1 && ` ${resultat.affiliations_deplacees} d'entre eux suivent désormais l'éducateur de leur nouvelle équipe.`}
                {resultat.affiliations_deplacees === 1 && ' 1 joueur suit désormais l\'éducateur de sa nouvelle équipe.'}
              </p>
            )}
            {(resultat.affiliations_restees || []).length > 0 && (
              <>
                <p style={{ ...point, color: colors.accent.amber }}>À regarder :</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.6, color: colors.text.secondary }}>
                  {resultat.affiliations_restees.map(r => <li key={r.fiche_id}>{texteLienReste(r)}</li>)}
                </ul>
              </>
            )}
          </div>
          <div>
            <button type="button" onClick={onTermine} style={btnPrincipal(false)}>Retour aux catégories</button>
          </div>
        </>
      )}
    </div>
  )
}
