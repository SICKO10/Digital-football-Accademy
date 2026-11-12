import { useCallback, useEffect, useMemo, useState } from 'react'
import { useColors } from '../../lib/theme'
import { supabase } from '../../supabase'
import { phraseJournal, etatRetablir } from '../../lib/journalMonClub'
import { retablirEntree } from './ecritures'
import { Icone, EnteteEtape, Encart } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'

const LIMITE = 50

// Étape 5 de Mon club : qui a changé quoi dans le menu des éducateurs, avec un
// bouton « Rétablir ». Le journal est écrit par le serveur au moment où les
// éducateurs sont prévenus (un changement annulé dans les secondes du bandeau
// « Annuler » n'y apparaît pas). Rien n'est supprimé : « Rétablir » ajoute une
// ligne. Seul le compte du club peut rétablir (il prévient les éducateurs).
// `educateurs` : éducateurs affiliés acceptés (lignes de club_educateurs).
export default function EtapeJournal({ clubId, educateurs, estCompteClub }) {
  const colors = useColors()
  const [entrees, setEntrees] = useState([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(null)
  const [version, setVersion] = useState(0)
  const recharger = useCallback(() => setVersion(v => v + 1), [])

  const liste = useMemo(() => (educateurs || []).map(e => ({
    id: e.educateur_id,
    nom: [e.educateur?.prenom, e.educateur?.nom].filter(Boolean).join(' ') || e.educateur?.email || 'Éducateur',
  })), [educateurs])
  const noms = useMemo(() => Object.fromEntries(liste.map(e => [e.id, e.nom])), [liste])

  useEffect(() => {
    let annule = false
    supabase.from('mon_club_journal')
      .select('id, auteur_libelle, cree_le, action, outil, educateur_ids, tous, retablit_id')
      .eq('club_id', clubId).order('cree_le', { ascending: false }).limit(LIMITE)
      .then(({ data, error }) => {
        if (annule) return
        if (error) { setErreur('Le journal n\'est pas disponible pour l\'instant, réessayez dans un instant.'); setPret(true); return }
        setErreur('')
        setEntrees(data || [])
        setPret(true)
      })
    return () => { annule = true }
  }, [clubId, version])

  const retablir = async (entree) => {
    setEnCours(entree.id)
    setErreur('')
    setInfo('')
    try {
      const resultat = await retablirEntree(clubId, entree, liste)
      setInfo(resultat === 'deja'
        ? 'Le menu était déjà revenu à cet état : rien n\'a été changé.'
        : 'Rétabli. Vos éducateurs sont prévenus dans leur cloche.')
      recharger()
    } catch (e) {
      setErreur(e.message || 'Le rétablissement n\'a pas pu se faire, réessayez dans un instant.')
    } finally {
      setEnCours(null)
    }
  }

  const quand = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(',', ' à')
  const st = stylesMonClub(colors)

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <EnteteEtape icone={ICONES.journal} titre="Journal des changements"
        texte={`Les changements du menu de vos éducateurs, du plus récent au plus ancien. «\u00a0Rétablir\u00a0» remet le menu comme avant ce changement et prévient vos éducateurs, rien n'est effacé. Les ${LIMITE} derniers changements sont affichés.`}>
        {pret && (
          <button type="button" onClick={recharger} disabled={!!enCours} className="mc-btn" style={st.bouton(false, !!enCours)}>
            <Icone d={ICONES.actualiser} size={15} /> Actualiser
          </button>
        )}
      </EnteteEtape>
      {!estCompteClub && (
        <Encart>Seul le compte du club peut rétablir un changement, car il prévient ensuite les éducateurs. Vous voyez ici l'historique.</Encart>
      )}
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      <p role="status" style={{ margin: info ? '0 0 14px' : 0, fontSize: 13, fontWeight: 700, color: colors.accent.success }}>{info}</p>
      {!pret && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement du journal...</p>}
      {pret && !erreur && entrees.length === 0 && (
        <div style={{ ...st.carte, padding: '44px 24px', textAlign: 'center' }}>
          <span aria-hidden="true" style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', background: st.marque + '24', color: st.marque, marginBottom: 14 }}><Icone d={ICONES.journal} size={26} /></span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text.primary }}>Aucun changement pour l'instant</p>
          <p style={{ margin: '6px auto 0', maxWidth: 420, fontSize: 13, lineHeight: 1.6, color: colors.text.faint }}>Ils apparaissent ici quelques secondes après un réglage de l'étape « Dashboard de mes éducateurs ».</p>
        </div>
      )}

      {entrees.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {entrees.map(e => {
            const etat = etatRetablir(e, entrees)
            const retire = e.action === 'retire'
            const couleur = etat === 'retablissement' ? colors.accent.blue : retire ? colors.accent.amber : colors.accent.success
            const icone = etat === 'retablissement' ? ICONES.retablir : retire ? ICONES.oeilBarre : ICONES.oeil
            return (
              <li key={e.id} className="mc-ligne" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, border: `1px solid ${colors.border.subtle}`, background: colors.background.surface, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: couleur + '24', color: couleur }}>
                  <Icone d={icone} size={19} />
                </span>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: colors.text.primary }}>{phraseJournal(e, noms)}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.text.faint }}>
                    {quand(e.cree_le)}, par {e.auteur_libelle}
                    {etat === 'retablissement' && ' (rétablissement)'}
                    {etat === 'retablie' && ' (déjà rétabli)'}
                  </p>
                </div>
                {etat === 'possible' && estCompteClub && (
                  <button type="button" disabled={!!enCours} onClick={() => retablir(e)} className="mc-btn" style={st.bouton(false, !!enCours)}>
                    <Icone d={ICONES.retablir} size={15} />{enCours === e.id ? 'Rétablissement...' : 'Rétablir'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
