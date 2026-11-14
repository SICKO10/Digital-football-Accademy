import { useEffect, useState } from 'react'
import { useColors } from '../../lib/theme'
import { supabase } from '../../supabase'
import { appelerOutils } from '../../lib/outilsApi'
import { stylesMonClub } from './uiMonClub'

// Qui a une place dans le forfait du club (nouveau modèle, forfait actif).
// `educateurs` : [{ id, nom }]. `sansPlace` : ids sans place, lus dans la base
// (educateur_a_place), donc toujours justes. Les choix du club sont lus dans
// club_places_choisies : « choisi » = place garantie, « retire » = jamais de
// place, rien = automatique (ancienneté). Le changement passe par api/outils.js
// (action choisir_place), qui prévient l'éducateur qui perd sa place.
// `version` relit les choix, `onChange` demande à l'étape de tout relire.
export default function PlacesEducateurs({ clubId, educateurs, sansPlace, places, version, onChange }) {
  const colors = useColors()
  const st = stylesMonClub(colors)
  const [choix, setChoix] = useState({})
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  // Éducateur à qui le club veut donner une place alors que tout est plein.
  const [echange, setEchange] = useState(null)

  useEffect(() => {
    let annule = false
    supabase.from('club_places_choisies').select('educateur_id, etat').eq('club_id', clubId).then(({ data, error }) => {
      if (annule) return
      if (error) { console.error('club_places_choisies', error.message); setErreur('Impossible de lire les places choisies, réessayez dans un instant.'); return }
      setChoix(Object.fromEntries((data || []).map(l => [l.educateur_id, l.etat])))
    })
    return () => { annule = true }
  }, [clubId, version])

  const aPlace = (id) => !sansPlace.includes(id)
  const avecPlace = educateurs.filter(e => aPlace(e.id))
  const pleines = avecPlace.length >= places

  const changer = async (educateur, etat, libere, phrase) => {
    setErreur(''); setMessage(''); setEnCours(educateur.id)
    try {
      await appelerOutils('choisir_place', { educateur: educateur.id, etat, ...(libere ? { libere: libere.id } : {}) })
      setEchange(null)
      setMessage(phrase)
      onChange()
    } catch (e) {
      setErreur(e.message || 'Le changement n\'a pas été enregistré, réessayez dans un instant.')
    }
    setEnCours(null)
  }

  const donner = (e) => {
    if (pleines) { setEchange(e); setErreur(''); setMessage(''); return }
    changer(e, 'choisi', null, `${e.nom} a maintenant une place.`)
  }
  const retirer = (e) => changer(e, 'retire', null, `${e.nom} n'a plus de place. Il en est prévenu s'il recevait des outils de votre club.`)
  const automatique = (e) => changer(e, 'auto', null, `${e.nom} suit de nouveau l'ordre automatique (le plus ancien affilié passe en premier).`)

  const lien = { background: 'none', border: 'none', padding: '6px 4px', minHeight: 44, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: colors.text.secondary, textDecoration: 'underline' }

  return (
    <section aria-labelledby="titre-places" style={{ margin: '0 0 22px', padding: '16px 18px', borderRadius: 16, background: colors.background.surface, border: `1px solid ${colors.border.subtle}` }}>
      <h3 id="titre-places" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.text.primary }}>Qui a une place ?</h3>
      <p style={{ margin: '4px 0 12px', fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }}>
        {avecPlace.length} / {places} places utilisées. Sans choix de votre part, les plus anciens affiliés passent en premier. Un éducateur sans place garde le socle gratuit et ses données.
      </p>
      {erreur && <p role="alert" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {message && <p role="status" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: colors.text.primary }}>{message}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {educateurs.map(e => {
          const place = aPlace(e.id)
          const etat = choix[e.id]
          const occupe = enCours === e.id
          return (
            <li key={e.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '10px 12px', borderRadius: 12, background: colors.background.sunken }}>
              <span style={{ flex: '1 1 160px', minWidth: 0, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>{e.nom}</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: colors.text.primary, background: (place ? st.marque : colors.accent.red) + '22', border: `1px solid ${(place ? st.marque : colors.accent.red)}55` }}>
                {place ? (etat === 'choisi' ? 'Place garantie' : 'A une place') : (etat === 'retire' ? 'Place retirée' : 'Sans place')}
              </span>
              {place
                ? <button type="button" className="mc-btn" disabled={!!enCours} onClick={() => retirer(e)} style={st.bouton(false, !!enCours)}>{occupe ? 'Enregistrement...' : 'Retirer la place'}</button>
                : <button type="button" className="mc-btn" disabled={!!enCours} onClick={() => donner(e)} style={st.bouton(true, !!enCours)}>{occupe ? 'Enregistrement...' : 'Donner une place'}</button>}
              {etat && <button type="button" disabled={!!enCours} onClick={() => automatique(e)} style={lien}>Remettre en automatique</button>}
            </li>
          )
        })}
      </ul>
      {echange && (
        <div role="group" aria-label={`Qui libère sa place pour ${echange.nom} ?`} style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: colors.accent.amber + '22', border: `1px solid ${colors.accent.amber}66` }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>Toutes les places sont prises. Qui libère sa place pour {echange.nom} ?</p>
          <p style={{ margin: '4px 0 10px', fontSize: 13, color: colors.text.secondary }}>Celui que vous choisissez n'a plus de place et en est prévenu s'il recevait des outils de votre club.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {avecPlace.map(l => (
              <button key={l.id} type="button" className="mc-btn" disabled={!!enCours} onClick={() => changer(echange, 'choisi', l, `${echange.nom} a une place, ${l.nom} n'en a plus.`)} style={st.bouton(false, !!enCours)}>{l.nom}</button>
            ))}
            <button type="button" className="mc-btn" onClick={() => setEchange(null)} style={lien}>Annuler</button>
          </div>
        </div>
      )}
    </section>
  )
}
