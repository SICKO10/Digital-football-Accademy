import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { t } from '../../lib/translations'
import { useStPalette as useSt } from '../../lib/useStFinance'
import { TitreEcran, Etiquette, Icone, Jauge, PastilleResultat } from '../identite'
import { CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../../lib/identite'
import { forme } from '../../tokens'
import { Lock, CircleCheck, TriangleAlert, Clock, Users, Star, X } from 'lucide-react'
import Avatar from '../Avatar'
import { statutPresenceEffectif, estStatutPresent } from '../../lib/presence'
import { fetchToutesLignes, fetchToutesLignesIn } from '../../lib/supabasePagination'

const getSaison = () => {
  const now = new Date()
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-${y + 1}`
}

const isApresClotureAuto = () => {
  const now = new Date()
  return now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() >= 20) // après le 20 juin
}

function ModalCloture({ joueur, educateurId, saison, presenceAuto, onClose, onSaved, lang = 'fr' }) {
  const st = useSt()
  const [form, setForm] = useState({
    matchs_joues: joueur.matchs_officiel || 0,
    buts: joueur.buts_total || 0,
    passes_decisives: joueur.passes_decisives || 0,
    minutes_jouees: joueur.minutes_jouees || 0,
    cleansheets: joueur.cleansheets || 0,
    victoires: 0,
    nuls: 0,
    defaites: 0,
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const totalMatchs = form.victoires + form.nuls + form.defaites

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('historique_saisons').upsert({
      joueur_id: joueur.id,
      educateur_id: educateurId,
      saison,
      matchs_joues: parseInt(form.matchs_joues) || 0,
      buts: parseInt(form.buts) || 0,
      passes_decisives: parseInt(form.passes_decisives) || 0,
      minutes_jouees: parseInt(form.minutes_jouees) || 0,
      cleansheets: parseInt(form.cleansheets) || 0,
      victoires: parseInt(form.victoires) || 0,
      nuls: parseInt(form.nuls) || 0,
      defaites: parseInt(form.defaites) || 0,
      seances_realisees: presenceAuto.realisees,
      seances_total: presenceAuto.total,
      notes: form.notes || null,
      cloturee: true,
      date_cloture: new Date().toISOString(),
    }, { onConflict: 'joueur_id,educateur_id,saison' })
    setLoading(false)
    if (!error) onSaved()
  }

  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, padding: '9px 12px', color: st.text, fontFamily: st.police.texte, fontSize: 16, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-cloture-joueur" style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, padding: 24, width: 500, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: st.police.texte }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div>
            <h3 id="titre-cloture-joueur" style={{ color: st.text, margin: '0 0 4px', fontFamily: st.police.titre, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{t('cloture_titre_modal', lang)} {saison}</h3>
            <p style={{ color: st.muted, fontSize: 14, margin: 0 }}>{joueur.prenom} {joueur.nom}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className={CLASSE_BOUTON_SECONDAIRE} style={{ width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${st.border}`, borderRadius: forme.rayonPastille, color: st.text, cursor: 'pointer', flexShrink: 0 }}>
            <Icone icone={X} />
          </button>
        </div>

        {/* Présence auto */}
        <div style={{ background: st.card2, boxShadow: `inset 3px 0 0 ${st.green}`, borderRadius: forme.rayonCarte, padding: '12px 14px', marginBottom: 20 }}>
          <Etiquette as="div" style={{ marginBottom: 4 }}>{t('cloture_presence_auto', lang)}</Etiquette>
          <div style={{ color: st.text, fontFamily: st.police.titre, fontWeight: 700, fontSize: 28, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {presenceAuto.total > 0 ? `${Math.round((presenceAuto.realisees / presenceAuto.total) * 100)}%` : '—'}
            <span style={{ color: st.muted, fontFamily: st.police.texte, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{presenceAuto.realisees}/{presenceAuto.total} séances</span>
          </div>
        </div>

        {/* Stats match */}
        <div style={{ marginBottom: 16 }}>
          <Etiquette as="div" style={{ marginBottom: 10 }}>{t('cloture_stats_match', lang)}</Etiquette>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'matchs_joues', label: 'Matchs joués' },
              { key: 'buts', label: t('comp_buts', lang) },
              { key: 'passes_decisives', label: t('comp_passes_dec', lang) },
              { key: 'minutes_jouees', label: 'Minutes' },
              { key: 'cleansheets', label: 'Clean sheets' },
            ].map(f => (
              <div key={f.key}>
                <label htmlFor={`cloture-${f.key}`} style={{ color: st.muted, fontSize: 13, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input id={`cloture-${f.key}`} type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={CLASSE_CHAMP} style={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* Résultats */}
        <div style={{ marginBottom: 16 }}>
          <Etiquette as="div" style={{ marginBottom: 10 }}>{t('cloture_resultats_equipe', lang)}</Etiquette>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'victoires', label: t('comp_victoire', lang), color: st.green },
              { key: 'nuls', label: t('comp_nul', lang), color: st.yellow },
              { key: 'defaites', label: t('comp_defaite', lang), color: st.red },
            ].map(f => (
              <div key={f.key}>
                <label htmlFor={`cloture-${f.key}`} style={{ color: st.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 1, background: f.color, flexShrink: 0 }} />{f.label}
                </label>
                <input id={`cloture-${f.key}`} type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={CLASSE_CHAMP} style={inp} />
              </div>
            ))}
          </div>
          {totalMatchs > 0 && (
            <Jauge pourcentages style={{ marginTop: 12 }}
              segments={[
                { libelle: 'V', valeur: form.victoires },
                { libelle: 'N', valeur: form.nuls },
                { libelle: 'D', valeur: form.defaites },
              ]} />
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="cloture-notes" style={{ color: st.muted, fontSize: 13, display: 'block', marginBottom: 6 }}>{t('cloture_notes_optionnel', lang)}</label>
          <textarea id="cloture-notes" className={CLASSE_CHAMP} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={t('cloture_appreciation', lang)} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className={CLASSE_BOUTON_SECONDAIRE} style={{ minHeight: 44, padding: '0 20px', background: 'transparent', border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, color: st.text, cursor: 'pointer', fontFamily: st.police.texte, fontSize: 15 }}>{t('btn_annuler', lang)}</button>
          <button onClick={handleSave} disabled={loading} className={CLASSE_BOUTON} style={{ minHeight: 44, padding: '0 20px', background: st.brand, border: '1px solid transparent', borderRadius: forme.rayonCarte, color: st.surBrand, fontFamily: st.police.texte, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '...' : t('cloture_clore_saison_btn', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestionCloturesSaison({ educateurId, equipeActiveId, lang = 'fr' }) {
  const st = useSt()
  const [joueurs, setJoueurs] = useState([])
  const [historiques, setHistoriques] = useState([])
  const [presences, setPresences] = useState({}) // { joueur_id: { realisees, total } }

  // Présences aux entraînements de la saison clôturée, avec les mêmes règles
  // que les dashboards (lib/presence) : saisie de l'éducateur sinon réponse au
  // sondage, convoqué = présent, séances passées uniquement. Avant, seules
  // les lignes presences_entrainement étaient lues — sans filtre de saison,
  // sans les sondages, convoqué compté absent, et tronquées au-delà de 1000
  // lignes : les chiffres archivés ne correspondaient pas aux dashboards.
  const chargerPresencesSaison = async (profilIds) => {
    const [debut, fin] = saison.split('-').map(Number)
    const aujourdHui = new Date().toISOString().split('T')[0]
    const finSaison = `${fin}-06-30`
    const { data: seances } = await fetchToutesLignes(() => {
      let q = supabase.from('entrainements').select('id').eq('educateur_id', educateurId)
        .gte('date', `${debut}-07-01`).lte('date', finSaison < aujourdHui ? finSaison : aujourdHui).order('id')
      if (equipeActiveId) q = q.eq('club_categorie_id', equipeActiveId)
      return q
    })
    const seanceIds = (seances || []).map(e => e.id)
    if (seanceIds.length === 0) return { statutsJoueur: () => [] }
    const [{ data: lignes }, { data: dispos }] = await Promise.all([
      fetchToutesLignesIn(seanceIds, ids => supabase.from('presences_entrainement').select('entrainement_id, joueur_id, statut, present').in('entrainement_id', ids).order('entrainement_id').order('joueur_id')),
      fetchToutesLignesIn(seanceIds, ids => supabase.from('disponibilites').select('id, joueur_id, seance_id, statut').in('seance_id', ids).in('joueur_id', profilIds).order('id')),
    ])
    const lignesParCle = {}
    ;(lignes || []).forEach(p => { lignesParCle[`${p.entrainement_id}|${p.joueur_id}`] = p })
    const sondageParCle = {}
    ;(dispos || []).forEach(d => { sondageParCle[`${d.seance_id}|${d.joueur_id}`] = d.statut })
    return {
      statutsJoueur: (equipeJoueurId, profilId) => seanceIds
        .map(id => statutPresenceEffectif(lignesParCle[`${id}|${equipeJoueurId}`], sondageParCle[`${id}|${profilId}`]))
        .filter(Boolean),
    }
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saison, setSaison] = useState(getSaison())
  const [modalJoueur, setModalJoueur] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [notesEdu, setNotesEdu] = useState([]) // notes_educateur reçues (tous joueurs, toutes saisons)
  const [affiliationIdsEquipeActive, setAffiliationIdsEquipeActive] = useState(null) // null = pas de filtrage équipe (fallback)

  const load = async () => {
    setLoading(true)

    // Joueurs affiliés à cet éducateur (même chemin que PrepPhysiqueJoueur : table
    // `affiliations`, statut 'accepte' — pas tous les comptes pro/fan de la plateforme).
    const { data: afDataBrute } = await supabase
      .from('affiliations')
      .select('id, joueur_id, equipe_joueur_id')
      .eq('educateur_id', educateurId)
      .eq('statut', 'accepte')

    // Un coach peut gérer plusieurs équipes (switcher) — restreint à celle
    // active via equipe_joueurs.club_categorie_id (affiliations elle-même n'a
    // pas cette colonne, seul equipe_joueurs l'a) pour ne jamais clôturer/
    // afficher les deux équipes mélangées.
    let afData = afDataBrute || []
    if (equipeActiveId) {
      const equipeJoueurIdsBrut = [...new Set(afData.map(a => a.equipe_joueur_id).filter(Boolean))]
      const { data: ejData } = equipeJoueurIdsBrut.length > 0
        ? await supabase.from('equipe_joueurs').select('id, club_categorie_id').in('id', equipeJoueurIdsBrut)
        : { data: [] }
      const idsEquipeActive = new Set((ejData || []).filter(e => e.club_categorie_id === equipeActiveId).map(e => e.id))
      afData = afData.filter(a => idsEquipeActive.has(a.equipe_joueur_id))
      setAffiliationIdsEquipeActive(afData.map(a => a.id))
    } else {
      setAffiliationIdsEquipeActive(null)
    }

    const joueurIds = [...new Set(afData.map(a => a.joueur_id))]
    // presences_entrainement.joueur_id référence equipe_joueurs(id), pas profiles(id) —
    // il faut donc passer par l'affiliation pour retrouver l'equipe_joueur_id de chacun.
    const equipeJoueurIdMap = {}
    afData.forEach(a => { equipeJoueurIdMap[a.joueur_id] = a.equipe_joueur_id })

    // Présence réelle aux entraînements (pas la prépa physique, moins pertinente dans
    // un historique de saison — même calcul que chargerStatsJoueur côté joueur).
    const equipeJoueurIds = Object.values(equipeJoueurIdMap).filter(Boolean)

    // Les 4 requêtes ci-dessous ne dépendent que de joueurIds/equipeJoueurIds
    // (déjà connus via afData, résolu plus haut) — aucune ne lit le résultat
    // d'une autre, lancées en parallèle plutôt qu'en série.
    const [
      { data: joueursData },
      { data: histData, error: histError },
      presencesRes,
      { data: notesData },
    ] = await Promise.all([
      joueurIds.length > 0
        ? supabase.from('profiles_public').select('id, prenom, nom, avatar_url, matchs_officiel, buts_total, passes_decisives, minutes_jouees, cleansheets').in('id', joueurIds)
        : Promise.resolve({ data: [] }),
      // Historiques de la saison — restreints aux joueurs de l'équipe active
      // (historique_saisons n'a pas de club_categorie_id propre).
      joueurIds.length > 0
        ? supabase.from('historique_saisons').select('*').eq('educateur_id', educateurId).eq('saison', saison).in('joueur_id', joueurIds)
        : Promise.resolve({ data: [], error: null }),
      equipeJoueurIds.length > 0 ? chargerPresencesSaison(joueurIds) : Promise.resolve(null),
      // Évaluations reçues (notes_educateur, tous joueurs confondus, toutes
      // saisons) — moyenne générale affichée en en-tête de cet historique.
      supabase.from('notes_educateur').select('note').eq('educateur_id', educateurId).eq('auteur_type', 'joueur'),
    ])

    if (histError?.code === '42P01') { setError('tables_missing'); setLoading(false); return }

    let presenceMap = {}
    if (equipeJoueurIds.length > 0) {
      (joueursData || []).forEach(j => {
        const equipeJoueurId = equipeJoueurIdMap[j.id]
        const statuts = presencesRes ? presencesRes.statutsJoueur(equipeJoueurId, j.id) : []
        presenceMap[j.id] = {
          realisees: statuts.filter(estStatutPresent).length,
          total: statuts.length,
        }
      })
    }

    setNotesEdu(notesData || [])

    setJoueurs(joueursData || [])
    setHistoriques(histData || [])
    setPresences(presenceMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [saison, equipeActiveId])

  const archiverAffiliations = async () => {
    const incomplet = joueurs.length - nbClotures
    const message = incomplet > 0
      ? `${incomplet} joueur(s) n'ont pas encore été clôturés individuellement. Archiver quand même toutes les affiliations actives de la saison ${saison} ?\n\nCette action est irréversible : les joueurs devront être ré-affiliés pour la nouvelle saison.`
      : `Archiver toutes les affiliations actives de la saison ${saison} ?\n\nCette action est irréversible : les joueurs devront être ré-affiliés pour la nouvelle saison.`
    if (!confirm(message)) return

    setArchiving(true)
    // Restreint à l'équipe active (affiliationIdsEquipeActive, calculé dans
    // load()) quand un equipeActiveId est fourni — sinon archive tout le
    // coach comme avant (fallback si le composant est utilisé sans switcher).
    let q = supabase.from('affiliations').update({ statut: 'archive', saison, date_fin: new Date().toISOString() }).eq('educateur_id', educateurId).eq('statut', 'accepte')
    if (affiliationIdsEquipeActive) q = q.in('id', affiliationIdsEquipeActive)
    const { error } = await q

    // Libère la catégorie/équipe club déclarée par cet éducateur (cf.
    // declarerMaCategorie côté DashboardEducateur.jsx) : à la nouvelle saison,
    // lui (ou qui reprend cette équipe) sera re-invité à la déclarer plutôt que
    // de garder silencieusement le rattachement de la saison précédente. Ciblée
    // par id (equipeActiveId, l'équipe active du switcher) et non par
    // educateur_id seul — un coach peut gérer plusieurs équipes, clôturer l'une
    // ne doit pas désaffecter les autres. Best effort — une erreur ici ne doit
    // pas faire échouer l'archivage des affiliations.
    if (equipeActiveId) await supabase.from('club_categories').update({ educateur_id: null }).eq('id', equipeActiveId)

    setArchiving(false)

    if (error) { alert('Erreur lors de l\'archivage : ' + error.message); return }
    alert('Saison archivée — les affiliations actives ont été clôturées.')
    await load()
  }

  const getHistorique = (joueurId) => historiques.find(h => h.joueur_id === joueurId)
  const getPresence = (joueurId) => presences[joueurId] || { realisees: 0, total: 0 }

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>{t('btn_chargement', lang)}</div>

  if (error === 'tables_missing') return (
    <div style={{ background: st.card, boxShadow: `inset 3px 0 0 ${st.yellow}`, border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, padding: 20, margin: 16, fontFamily: st.police.texte }}>
      <div style={{ color: st.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Icone icone={TriangleAlert} />{t('cloture_migration_requise', lang)}</div>
      <div style={{ color: st.muted, fontSize: 14, marginTop: 4 }}>{t('cloture_lance_migration', lang)}</div>
    </div>
  )

  const saisonsDispo = ['2026-2027', '2025-2026', '2024-2025', '2023-2024']
  const nbClotures = joueurs.filter(j => getHistorique(j.id)?.cloturee).length
  const moyGeneraleNotes = notesEdu.length ? notesEdu.reduce((s, n) => s + n.note, 0) / notesEdu.length : null
  const pctClotures = joueurs.length > 0 ? Math.round((nbClotures / joueurs.length) * 100) : 0
  const carteSt = { background: st.card, border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte }
  const statSt = { color: st.muted, fontSize: 13, display: 'inline-flex', alignItems: 'baseline', gap: 4 }
  const chiffreSt = { color: st.text, fontFamily: st.police.titre, fontWeight: 600, fontSize: 16, fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={{ padding: 16, fontFamily: st.police.texte }}>
      {/* Bandeau auto-clôture */}
      {isApresClotureAuto() && nbClotures < joueurs.length && (
        <div role="status" style={{ ...carteSt, boxShadow: `inset 3px 0 0 ${st.yellow}`, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: st.text, display: 'inline-flex' }}><Icone icone={Clock} taille={20} /></span>
          <div>
            <div style={{ color: st.text, fontWeight: 700 }}>{t('cloture_heure_de', lang)} {saison}</div>
            <div style={{ color: st.muted, fontSize: 14 }}>Nous sommes après le 20 juin. {joueurs.length - nbClotures} joueur(s) sans clôture.</div>
          </div>
        </div>
      )}

      <TitreEcran
        titre={t('cloture_titre', lang)}
        sousTitre={`${nbClotures}/${joueurs.length} ${t('cloture_joueurs_clotures', lang)}`}
        actions={(
          <>
            {moyGeneraleNotes !== null && (
              <div title="Moyenne générale des évaluations reçues, tous joueurs confondus" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${st.border}`, borderRadius: forme.rayonPastille, padding: '4px 10px', color: st.text }}>
                <Icone icone={Star} taille={16} />
                <span style={{ ...chiffreSt, fontSize: 18 }}>{moyGeneraleNotes.toFixed(1)}</span>
                <span style={{ color: st.muted, fontSize: 13 }}>({notesEdu.length})</span>
              </div>
            )}
            <select value={saison} onChange={e => setSaison(e.target.value)} aria-label="Saison" className={CLASSE_CHAMP}
              style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, padding: '0 12px', minHeight: 44, width: 'auto', color: st.text, fontFamily: st.police.texte, fontSize: 16 }}>
              {saisonsDispo.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {joueurs.length > 0 && (
              <button onClick={archiverAffiliations} disabled={archiving} className={CLASSE_BOUTON_SECONDAIRE}
                style={{ minHeight: 44, padding: '0 16px', background: 'transparent', border: `1px solid ${st.red}`, borderRadius: forme.rayonCarte, color: st.text, fontWeight: 700, cursor: 'pointer', fontFamily: st.police.texte, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: archiving ? 0.6 : 1 }}>
                <Icone icone={Lock} />{archiving ? '...' : t('cloture_clore_saison', lang)}
              </button>
            )}
          </>
        )}
      />

      {/* Progression globale */}
      <div style={{ ...carteSt, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <Etiquette as="span">{t('cloture_progression', lang)}</Etiquette>
          <span style={{ ...chiffreSt, fontSize: 24 }}>{pctClotures}%</span>
        </div>
        <div role="img" aria-label={`${t('cloture_progression', lang)} : ${pctClotures} %`} style={{ background: st.card2, borderRadius: 1, height: 6, overflow: 'hidden' }}>
          <div style={{ background: st.brand, height: 6, width: `${pctClotures}%`, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Liste joueurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {joueurs.map(j => {
          const hist = getHistorique(j.id)
          const pres = getPresence(j.id)
          const cloture = hist?.cloturee
          const tauxPres = pres.total > 0 ? Math.round((pres.realisees / pres.total) * 100) : null
          const couleurPres = tauxPres >= 80 ? st.green : tauxPres >= 50 ? st.yellow : st.red

          return (
            <div key={j.id} style={{ ...carteSt, boxShadow: cloture ? `inset 3px 0 0 ${st.green}` : 'none', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar person={j} size={36}
                    bg={st.card2} border="none"
                    textColor={st.text} />
                  <div>
                    <div style={{ color: st.text, fontWeight: 700 }}>{j.prenom} {j.nom}</div>
                    <div style={{ display: 'flex', gap: '4px 16px', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={statSt}><span style={chiffreSt}>{cloture ? hist.buts : (j.buts_total || 0)}</span> buts</span>
                      <span style={statSt}><span style={chiffreSt}>{cloture ? hist.passes_decisives : (j.passes_decisives || 0)}</span> passes</span>
                      <span style={statSt}><span style={chiffreSt}>{cloture ? hist.matchs_joues : (j.matchs_officiel || 0)}</span> matchs</span>
                      {tauxPres !== null && (
                        <span style={statSt}>
                          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 1, background: couleurPres, alignSelf: 'center' }} />
                          <span style={chiffreSt}>{tauxPres}%</span> présence
                        </span>
                      )}
                    </div>
                    {cloture && (() => {
                      const totalMatchsHist = (hist.victoires || 0) + (hist.nuls || 0) + (hist.defaites || 0)
                      const tauxVictoire = totalMatchsHist > 0 ? Math.round((hist.victoires / totalMatchsHist) * 100) : null
                      return (
                      <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={statSt}><PastilleResultat resultat="V" taille={20} /><span style={chiffreSt}>{hist.victoires}</span></span>
                        <span style={statSt}><PastilleResultat resultat="N" taille={20} /><span style={chiffreSt}>{hist.nuls}</span></span>
                        <span style={statSt}><PastilleResultat resultat="D" taille={20} /><span style={chiffreSt}>{hist.defaites}</span></span>
                        {tauxVictoire !== null && (
                          <span style={statSt}><span style={chiffreSt}>{tauxVictoire}%</span> victoires</span>
                        )}
                      </div>
                      )
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {cloture ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: st.text, border: `1px solid ${st.border}`, borderRadius: forme.rayonPastille, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
                      <Icone icone={CircleCheck} taille={16} />{t('cloture_clotures', lang)}
                    </span>
                  ) : (
                    <button onClick={() => setModalJoueur(j)} className={CLASSE_BOUTON}
                      style={{ minHeight: 44, padding: '0 16px', background: st.brand, border: '1px solid transparent', borderRadius: forme.rayonCarte, color: st.surBrand, fontWeight: 700, cursor: 'pointer', fontFamily: st.police.texte, fontSize: 15 }}>
                      {t('cloture_clore_arrow', lang)}
                    </button>
                  )}
                  {cloture && (
                    <button onClick={() => setModalJoueur(j)} className={CLASSE_BOUTON_SECONDAIRE}
                      style={{ minHeight: 44, padding: '0 14px', background: 'transparent', border: `1px solid ${st.border}`, borderRadius: forme.rayonCarte, color: st.text, cursor: 'pointer', fontFamily: st.police.texte, fontSize: 14 }}>
                      {t('btn_modifier', lang)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {joueurs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Icone icone={Users} taille={40} /></div>
            <div style={{ color: st.text }}>{t('cloture_aucun_joueur', lang)}</div>
          </div>
        )}
      </div>

      {modalJoueur && (
        <ModalCloture
          joueur={modalJoueur}
          educateurId={educateurId}
          saison={saison}
          presenceAuto={getPresence(modalJoueur.id)}
          onClose={() => setModalJoueur(null)}
          onSaved={async () => { await load(); setModalJoueur(null) }}
          lang={lang}
        />
      )}
    </div>
  )
}
