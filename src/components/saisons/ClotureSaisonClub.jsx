import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { radius } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { saisonActuelle, libelleSaison, dateFr } from '../../lib/saison'
import { fetchToutesLignesIn } from '../../lib/supabasePagination'
import { bilanCloturesClub, LIBELLE_ETAT_CLOTURE } from '../../lib/cloturesClub'

const nomEquipe = (c) => `${labelCategorie(c.nom)}${c.equipe ? ` ${c.equipe}` : ''}`

// Bas de l'accueil club : bilan de clôture de la saison. Rien n'est archivé ici,
// chaque coach clôture son équipe. Le bouton marque seulement la saison close pour
// le club (table saisons_closes_club). Droit géré par la base (saison_peut_valider).
export default function ClotureSaisonClub({ clubId, userId, categories, accentColor }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const saison = saisonActuelle()
  const [ouvert, setOuvert] = useState(false)
  const [close, setClose] = useState(null)
  const [peut, setPeut] = useState(false)
  const [bilan, setBilan] = useState(null)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const lire = useCallback(async () => {
    const [cl, droit] = await Promise.all([
      supabase.from('saisons_closes_club').select('close_le').eq('club_id', clubId).eq('saison', saison).maybeSingle(),
      supabase.rpc('saison_peut_valider', { p_club_id: clubId, p_categorie: null }),
    ])
    return { close: cl.data || null, peut: droit.data === true }
  }, [clubId, saison])

  const appliquer = (d) => { setClose(d.close); setPeut(d.peut) }
  const recharger = async () => appliquer(await lire())

  useEffect(() => {
    let annule = false
    lire().then(d => { if (!annule) appliquer(d) })
    return () => { annule = true }
  }, [lire])

  // Le bilan se calcule à l'ouverture de la fenêtre seulement.
  useEffect(() => {
    if (!ouvert) return
    let annule = false
    ;(async () => {
      try {
        const ids = categories.map(c => c.id)
        const ej = await fetchToutesLignesIn(ids, lot => supabase.from('equipe_joueurs').select('id, club_categorie_id').in('club_categorie_id', lot).order('id'))
        if (ej.error) throw ej.error
        const ejIds = ej.data.map(x => x.id)
        const aff = await fetchToutesLignesIn(ejIds, lot => supabase.from('affiliations').select('id, equipe_joueur_id, statut, saison').in('equipe_joueur_id', lot).in('statut', ['accepte', 'archive']).order('id'))
        if (aff.error) throw aff.error
        if (!annule) setBilan(bilanCloturesClub({ equipes: categories, equipeJoueurs: ej.data, affiliations: aff.data, saison }))
      } catch {
        if (!annule) setBilan('erreur')
      }
    })()
    return () => { annule = true }
  }, [ouvert, categories, saison])

  const cloturer = async () => {
    setEnCours(true); setErreur('')
    const { error } = await supabase.from('saisons_closes_club').insert({ club_id: clubId, saison, close_par: userId })
    setEnCours(false)
    if (error) { setErreur(error.code === '23505' ? 'Cette saison est déjà close pour le club.' : 'Impossible de clôturer pour le moment. Réessaie, ou vérifie ton rôle (président, directeur sportif, responsable formation).'); return }
    await recharger()
  }
  const rouvrir = async () => {
    setEnCours(true); setErreur('')
    const { error } = await supabase.from('saisons_closes_club').delete().eq('club_id', clubId).eq('saison', saison)
    setEnCours(false)
    if (error) { setErreur('Impossible de rouvrir la saison pour le moment.'); return }
    await recharger()
  }

  const bouton = { padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const accent = accentColor || colors.accent.green

  return (
    <>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12, padding: 16, background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>Clôturer la saison {libelleSaison(saison)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.faint }}>
            {close ? `Saison close pour le club le ${dateFr(close.close_le, { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Voir où en est chaque équipe, puis marquer la saison comme close pour le club.'}
          </p>
        </div>
        <button onClick={() => { setBilan(null); setOuvert(true) }} style={{ ...bouton, background: 'transparent', color: accent, border: `1px solid ${accent}` }}>
          {close ? 'Voir le bilan' : 'Clôturer une saison'}
        </button>
      </div>

      {ouvert && (
        <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: isMobile ? 0 : radius.lg, width: '100%', maxWidth: 620, maxHeight: isMobile ? '100%' : '90vh', overflowY: 'auto', padding: isMobile ? 16 : 24, color: colors.text.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Saison {libelleSaison(saison)}</h2>
              <button onClick={() => setOuvert(false)} aria-label="Fermer" style={{ ...bouton, padding: '6px 12px', fontWeight: 500, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>Fermer</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: colors.text.faint }}>
              Rien n'est archivé ici, chaque coach clôture son équipe. Stages, tournois et administratif ne sont pas touchés.
            </p>

            {bilan === null && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement…</p>}
            {bilan === 'erreur' && <p style={{ fontSize: 13, color: colors.accent.red }}>Impossible de charger le bilan des équipes.</p>}
            {bilan && bilan !== 'erreur' && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>
                  {bilan.nbCloturees} équipe{bilan.nbCloturees > 1 ? 's' : ''} clôturée{bilan.nbCloturees > 1 ? 's' : ''}, {bilan.nbACloturer} pas encore clôturée{bilan.nbACloturer > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bilan.lignes.length === 0 && <p style={{ fontSize: 13, color: colors.text.faint }}>Aucune équipe dans le club.</p>}
                  {bilan.lignes.map(({ equipe, etat }) => (
                    <div key={equipe.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{nomEquipe(equipe)}</span>
                        {equipe.educateur && <span style={{ fontSize: 12, color: colors.text.faint }}> · {equipe.educateur.prenom || ''} {equipe.educateur.nom || ''}</span>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: etat === 'cloturee' ? colors.accent.success : etat === 'a_cloturer' ? colors.accent.amber : colors.text.faint }}>{LIBELLE_ETAT_CLOTURE[etat]}</span>
                    </div>
                  ))}
                </div>
                {bilan.nbACloturer > 0 && !close && (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: colors.text.faint }}>
                    Tu peux marquer la saison close même si des équipes ne le sont pas : leurs coachs pourront clôturer ensuite.
                  </p>
                )}
              </>
            )}

            {erreur && <p style={{ margin: '12px 0 0', fontSize: 13, color: colors.accent.red }}>{erreur}</p>}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, justifyContent: 'flex-end' }}>
              {!peut && <p style={{ margin: 0, fontSize: 12, color: colors.text.faint, alignSelf: 'center', flex: 1 }}>La clôture est réservée au compte principal, au président, au directeur sportif et au responsable formation.</p>}
              {peut && !close && (
                <button onClick={cloturer} disabled={enCours || !bilan || bilan === 'erreur'} style={{ ...bouton, background: accent, color: colors.black, border: 'none', opacity: enCours ? 0.6 : 1 }}>
                  {enCours ? 'Enregistrement…' : `Marquer la saison ${libelleSaison(saison)} comme close`}
                </button>
              )}
              {peut && close && (
                <button onClick={rouvrir} disabled={enCours} style={{ ...bouton, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>
                  {enCours ? '…' : 'Rouvrir la saison'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
