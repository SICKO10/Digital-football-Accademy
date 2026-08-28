import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { t } from '../../lib/translations'
import { makeUseSt } from '../../lib/theme'
import Avatar from '../Avatar'

const stSombre = {
  card: '#111', card2: '#1a1a1a', border: '#222',
  green: '#4ade80', text: '#fff', muted: '#888',
  red: '#ef4444', yellow: '#eab308', blue: '#60a5fa',
}
const stClaire = {
  card: '#ffffff', card2: '#f1f5f9', border: '#cbd5e1',
  green: '#4ade80', text: '#0f172a', muted: '#64748b',
  red: '#ef4444', yellow: '#eab308', blue: '#60a5fa',
}
const useSt = makeUseSt(stSombre, stClaire)

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

  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '9px 12px', color: st.text, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: st.text, margin: '0 0 4px' }}>{t('cloture_titre_modal', lang)} {saison}</h3>
        <p style={{ color: st.muted, fontSize: 13, margin: '0 0 24px' }}>{joueur.prenom} {joueur.nom}</p>

        {/* Présence auto */}
        <div style={{ background: '#0a1a0a', border: `1px solid ${st.green}30`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>{t('cloture_presence_auto', lang).toUpperCase()}</div>
          <div style={{ color: st.green, fontWeight: 700, fontSize: 18 }}>
            {presenceAuto.total > 0 ? `${Math.round((presenceAuto.realisees / presenceAuto.total) * 100)}%` : '—'}
            <span style={{ color: st.muted, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>{presenceAuto.realisees}/{presenceAuto.total} séances</span>
          </div>
        </div>

        {/* Stats match */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: st.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>{t('cloture_stats_match', lang).toUpperCase()}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'matchs_joues', label: 'Matchs joués' },
              { key: 'buts', label: t('comp_buts', lang) },
              { key: 'passes_decisives', label: t('comp_passes_dec', lang) },
              { key: 'minutes_jouees', label: 'Minutes' },
              { key: 'cleansheets', label: 'Clean sheets' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ color: st.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* Résultats */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: st.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>{t('cloture_resultats_equipe', lang).toUpperCase()}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'victoires', label: t('comp_victoire', lang), color: st.green },
              { key: 'nuls', label: t('comp_nul', lang), color: st.yellow },
              { key: 'defaites', label: t('comp_defaite', lang), color: st.red },
            ].map(f => (
              <div key={f.key}>
                <label style={{ color: f.color, fontSize: 11, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inp, borderColor: `${f.color}40` }} />
              </div>
            ))}
          </div>
          {totalMatchs > 0 && (
            <div style={{ marginTop: 10, background: st.card2, borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                <div style={{ background: st.green, flex: form.victoires }} />
                <div style={{ background: st.yellow, flex: form.nuls }} />
                <div style={{ background: st.red, flex: form.defaites }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: st.muted }}>
                <span style={{ color: st.green }}>{totalMatchs > 0 ? Math.round((form.victoires / totalMatchs) * 100) : 0}% V</span>
                <span style={{ color: st.yellow }}>{totalMatchs > 0 ? Math.round((form.nuls / totalMatchs) * 100) : 0}% N</span>
                <span style={{ color: st.red }}>{totalMatchs > 0 ? Math.round((form.defaites / totalMatchs) * 100) : 0}% D</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: st.muted, fontSize: 11, display: 'block', marginBottom: 6 }}>{t('cloture_notes_optionnel', lang)}</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={t('cloture_appreciation', lang)} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>{t('btn_annuler', lang)}</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '...' : `✅ ${t('cloture_clore_saison_btn', lang)}`}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saison, setSaison] = useState(getSaison())
  const [modalJoueur, setModalJoueur] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [notesEdu, setNotesEdu] = useState([]) // notes_educateur reçues (tous joueurs, toutes saisons)

  const load = async () => {
    setLoading(true)

    // Joueurs affiliés à cet éducateur (même chemin que PrepPhysiqueJoueur : table
    // `affiliations`, statut 'accepte' — pas tous les comptes pro/fan de la plateforme).
    const { data: afData } = await supabase
      .from('affiliations')
      .select('joueur_id, equipe_joueur_id')
      .eq('educateur_id', educateurId)
      .eq('statut', 'accepte')
    const joueurIds = [...new Set((afData || []).map(a => a.joueur_id))]
    // presences_entrainement.joueur_id référence equipe_joueurs(id), pas profiles(id) —
    // il faut donc passer par l'affiliation pour retrouver l'equipe_joueur_id de chacun.
    const equipeJoueurIdMap = {}
    ;(afData || []).forEach(a => { equipeJoueurIdMap[a.joueur_id] = a.equipe_joueur_id })

    const { data: joueursData } = joueurIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, prenom, nom, avatar_url, matchs_officiel, buts_total, passes_decisives, minutes_jouees, cleansheets')
          .in('id', joueurIds)
      : { data: [] }

    // Historiques de la saison
    const { data: histData, error: histError } = await supabase
      .from('historique_saisons')
      .select('*')
      .eq('educateur_id', educateurId)
      .eq('saison', saison)

    if (histError?.code === '42P01') { setError('tables_missing'); setLoading(false); return }

    // Présence réelle aux entraînements (pas la prépa physique, moins pertinente dans
    // un historique de saison — même calcul que chargerStatsJoueur côté joueur).
    const equipeJoueurIds = Object.values(equipeJoueurIdMap).filter(Boolean)
    let presenceMap = {}

    if (equipeJoueurIds.length > 0) {
      const { data: presencesData } = await supabase
        .from('presences_entrainement')
        .select('joueur_id, statut')
        .eq('educateur_id', educateurId)
        .in('joueur_id', equipeJoueurIds)

      ;(joueursData || []).forEach(j => {
        const equipeJoueurId = equipeJoueurIdMap[j.id]
        const pr = (presencesData || []).filter(p => p.joueur_id === equipeJoueurId)
        presenceMap[j.id] = {
          realisees: pr.filter(p => p.statut === 'present').length,
          total: pr.length,
        }
      })
    }

    // Évaluations reçues (notes_educateur, tous joueurs confondus, toutes
    // saisons) — moyenne générale affichée en en-tête de cet historique.
    const { data: notesData } = await supabase
      .from('notes_educateur')
      .select('note')
      .eq('educateur_id', educateurId)
      .eq('auteur_type', 'joueur')
    setNotesEdu(notesData || [])

    setJoueurs(joueursData || [])
    setHistoriques(histData || [])
    setPresences(presenceMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [saison])

  const archiverAffiliations = async () => {
    const incomplet = joueurs.length - nbClotures
    const message = incomplet > 0
      ? `${incomplet} joueur(s) n'ont pas encore été clôturés individuellement. Archiver quand même toutes les affiliations actives de la saison ${saison} ?\n\nCette action est irréversible : les joueurs devront être ré-affiliés pour la nouvelle saison.`
      : `Archiver toutes les affiliations actives de la saison ${saison} ?\n\nCette action est irréversible : les joueurs devront être ré-affiliés pour la nouvelle saison.`
    if (!confirm(message)) return

    setArchiving(true)
    const { error } = await supabase
      .from('affiliations')
      .update({ statut: 'archive', saison, date_fin: new Date().toISOString() })
      .eq('educateur_id', educateurId)
      .eq('statut', 'accepte')

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
    alert('✅ Saison archivée — les affiliations actives ont été clôturées.')
    await load()
  }

  const getHistorique = (joueurId) => historiques.find(h => h.joueur_id === joueurId)
  const getPresence = (joueurId) => presences[joueurId] || { realisees: 0, total: 0 }

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>{t('btn_chargement', lang)}</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24, margin: 16 }}>
      <div style={{ color: st.yellow, fontWeight: 700 }}>⚠️ {t('cloture_migration_requise', lang)}</div>
      <div style={{ color: st.muted, fontSize: 14, marginTop: 4 }}>{t('cloture_lance_migration', lang)}</div>
    </div>
  )

  const saisonsDispo = ['2026-2027', '2025-2026', '2024-2025', '2023-2024']
  const nbClotures = joueurs.filter(j => getHistorique(j.id)?.cloturee).length
  const moyGeneraleNotes = notesEdu.length ? notesEdu.reduce((s, n) => s + n.note, 0) / notesEdu.length : null

  return (
    <div style={{ padding: 16 }}>
      {/* Banner auto-clôture */}
      {isApresClotureAuto() && nbClotures < joueurs.length && (
        <div style={{ background: '#1a1a00', border: `1px solid ${st.yellow}50`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⏰</span>
          <div>
            <div style={{ color: st.yellow, fontWeight: 700 }}>{t('cloture_heure_de', lang)} {saison}</div>
            <div style={{ color: st.muted, fontSize: 13 }}>Nous sommes après le 20 juin. {joueurs.length - nbClotures} joueur(s) sans clôture.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ color: st.text, margin: 0 }}>📅 {t('cloture_titre', lang)}</h2>
            {moyGeneraleNotes !== null && (
              <div title="Moyenne générale des évaluations reçues, tous joueurs confondus" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2a220a', border: `1px solid ${st.yellow}40`, borderRadius: 20, padding: '3px 10px' }}>
                <span style={{ color: st.yellow, fontWeight: 800, fontSize: 14 }}>{moyGeneraleNotes.toFixed(1)}</span>
                <span style={{ color: st.yellow, fontSize: 12 }}>{'★'.repeat(Math.round(moyGeneraleNotes))}{'☆'.repeat(5 - Math.round(moyGeneraleNotes))}</span>
                <span style={{ color: st.muted, fontSize: 11 }}>({notesEdu.length})</span>
              </div>
            )}
          </div>
          <p style={{ color: st.muted, fontSize: 13, margin: '4px 0 0' }}>{nbClotures}/{joueurs.length} {t('cloture_joueurs_clotures', lang)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={saison} onChange={e => setSaison(e.target.value)}
            style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 12px', color: st.text, fontSize: 13 }}>
            {saisonsDispo.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {joueurs.length > 0 && (
            <button onClick={archiverAffiliations} disabled={archiving}
              style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.red}60`, borderRadius: 8, color: st.red, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: archiving ? 0.6 : 1 }}>
              {archiving ? '...' : `🔒 ${t('cloture_clore_saison', lang)}`}
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression globale */}
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: st.muted, fontSize: 13 }}>{t('cloture_progression', lang)}</span>
          <span style={{ color: st.green, fontWeight: 700 }}>{joueurs.length > 0 ? Math.round((nbClotures / joueurs.length) * 100) : 0}%</span>
        </div>
        <div style={{ background: st.card2, borderRadius: 99, height: 8 }}>
          <div style={{ background: st.green, borderRadius: 99, height: 8, width: `${joueurs.length > 0 ? (nbClotures / joueurs.length) * 100 : 0}%`, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Liste joueurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {joueurs.map(j => {
          const hist = getHistorique(j.id)
          const pres = getPresence(j.id)
          const cloture = hist?.cloturee
          const tauxPres = pres.total > 0 ? Math.round((pres.realisees / pres.total) * 100) : null

          return (
            <div key={j.id} style={{ background: st.card, border: `1px solid ${cloture ? st.green + '40' : st.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar person={j} size={36}
                    bg={cloture ? '#14532d' : st.card2} border="none"
                    textColor={cloture ? st.green : st.muted} />
                  <div>
                    <div style={{ color: st.text, fontWeight: 700 }}>{j.prenom} {j.nom}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ color: st.muted, fontSize: 12 }}>⚽ {cloture ? hist.buts : (j.buts_total || 0)} buts</span>
                      <span style={{ color: st.muted, fontSize: 12 }}>🎯 {cloture ? hist.passes_decisives : (j.passes_decisives || 0)} passes</span>
                      <span style={{ color: st.muted, fontSize: 12 }}>🏃 {cloture ? hist.matchs_joues : (j.matchs_officiel || 0)} matchs</span>
                      {tauxPres !== null && <span style={{ color: tauxPres >= 80 ? st.green : tauxPres >= 50 ? st.yellow : st.red, fontSize: 12 }}>📋 {tauxPres}% présence</span>}
                    </div>
                    {cloture && (() => {
                      const totalMatchsHist = (hist.victoires || 0) + (hist.nuls || 0) + (hist.defaites || 0)
                      const tauxVictoire = totalMatchsHist > 0 ? Math.round((hist.victoires / totalMatchsHist) * 100) : null
                      return (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                        <span style={{ color: st.green, fontSize: 11 }}>✅ {hist.victoires}V</span>
                        <span style={{ color: st.yellow, fontSize: 11 }}>🟡 {hist.nuls}N</span>
                        <span style={{ color: st.red, fontSize: 11 }}>❌ {hist.defaites}D</span>
                        {tauxVictoire !== null && (
                          <span style={{ color: tauxVictoire >= 50 ? st.green : st.muted, fontSize: 11, fontWeight: 700 }}>· {tauxVictoire}% victoires</span>
                        )}
                      </div>
                      )
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {cloture ? (
                    <span style={{ background: '#14532d', color: st.green, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ {t('cloture_clotures', lang)}</span>
                  ) : (
                    <button onClick={() => setModalJoueur(j)}
                      style={{ padding: '8px 16px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      {t('cloture_clore_arrow', lang)}
                    </button>
                  )}
                  {cloture && (
                    <button onClick={() => setModalJoueur(j)}
                      style={{ padding: '6px 12px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.muted, cursor: 'pointer', fontSize: 12 }}>
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
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
