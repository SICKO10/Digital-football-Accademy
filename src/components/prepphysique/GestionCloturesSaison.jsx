import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const st = {
  card: '#111', card2: '#1a1a1a', border: '#222',
  green: '#4ade80', text: '#fff', muted: '#888',
  red: '#ef4444', yellow: '#eab308', blue: '#60a5fa',
}

const getSaison = () => {
  const now = new Date()
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-${y + 1}`
}

const isApresClotureAuto = () => {
  const now = new Date()
  return now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() >= 20) // après le 20 juin
}

function ModalCloture({ joueur, educateurId, saison, presenceAuto, onClose, onSaved }) {
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
    }, { onConflict: 'joueur_id,saison' })
    setLoading(false)
    if (!error) onSaved()
  }

  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '9px 12px', color: st.text, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: st.text, margin: '0 0 4px' }}>Clôturer la saison {saison}</h3>
        <p style={{ color: st.muted, fontSize: 13, margin: '0 0 24px' }}>{joueur.prenom} {joueur.nom}</p>

        {/* Présence auto */}
        <div style={{ background: '#0a1a0a', border: `1px solid ${st.green}30`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>PRÉSENCE ENTRAÎNEMENTS (calculée auto)</div>
          <div style={{ color: st.green, fontWeight: 700, fontSize: 18 }}>
            {presenceAuto.total > 0 ? `${Math.round((presenceAuto.realisees / presenceAuto.total) * 100)}%` : '—'}
            <span style={{ color: st.muted, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>{presenceAuto.realisees}/{presenceAuto.total} séances</span>
          </div>
        </div>

        {/* Stats match */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: st.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>STATISTIQUES MATCH</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'matchs_joues', label: 'Matchs joués' },
              { key: 'buts', label: 'Buts' },
              { key: 'passes_decisives', label: 'Passes déc.' },
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
          <div style={{ color: st.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>RÉSULTATS D'ÉQUIPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'victoires', label: 'Victoires', color: st.green },
              { key: 'nuls', label: 'Nuls', color: st.yellow },
              { key: 'defaites', label: 'Défaites', color: st.red },
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
          <label style={{ color: st.muted, fontSize: 11, display: 'block', marginBottom: 6 }}>Notes (optionnel)</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Appréciation générale de la saison..." />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '...' : '✅ Clôturer la saison'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestionCloturesSaison({ educateurId }) {
  const [joueurs, setJoueurs] = useState([])
  const [historiques, setHistoriques] = useState([])
  const [presences, setPresences] = useState({}) // { joueur_id: { realisees, total } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saison, setSaison] = useState(getSaison())
  const [modalJoueur, setModalJoueur] = useState(null)

  const load = async () => {
    setLoading(true)

    // Joueurs — TODO: adapter selon votre schéma de groupes
    const { data: joueursData } = await supabase
      .from('profiles')
      .select('id, prenom, nom, matchs_officiel, buts_total, passes_decisives, minutes_jouees, cleansheets')
      .in('plan', ['pro', 'fan'])

    // Historiques de la saison
    const { data: histData, error: histError } = await supabase
      .from('historique_saisons')
      .select('*')
      .eq('educateur_id', educateurId)
      .eq('saison', saison)

    if (histError?.code === '42P01') { setError('tables_missing'); setLoading(false); return }

    // Calcul présences depuis soumissions_prep
    const { data: programmes } = await supabase
      .from('programmes_prep')
      .select('id')
      .eq('educateur_id', educateurId)

    const progIds = (programmes || []).map(p => p.id)
    let presenceMap = {}

    if (progIds.length > 0) {
      const { data: seances } = await supabase
        .from('seances_prep')
        .select('id')
        .in('programme_id', progIds)
        .neq('type_seance', 'repos')

      const seanceIds = (seances || []).map(s => s.id)
      const nbTotal = seanceIds.length

      if (seanceIds.length > 0) {
        const { data: soumissions } = await supabase
          .from('soumissions_prep')
          .select('joueur_id, statut')
          .in('seance_id', seanceIds)

        const joueurIds = (joueursData || []).map(j => j.id)
        joueurIds.forEach(jid => {
          const sj = (soumissions || []).filter(s => s.joueur_id === jid)
          presenceMap[jid] = {
            realisees: sj.filter(s => s.statut === 'valide').length,
            total: nbTotal,
          }
        })
      }
    }

    setJoueurs(joueursData || [])
    setHistoriques(histData || [])
    setPresences(presenceMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [saison])

  const getHistorique = (joueurId) => historiques.find(h => h.joueur_id === joueurId)
  const getPresence = (joueurId) => presences[joueurId] || { realisees: 0, total: 0 }

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>Chargement...</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24, margin: 16 }}>
      <div style={{ color: st.yellow, fontWeight: 700 }}>⚠️ Migration SQL requise</div>
      <div style={{ color: st.muted, fontSize: 14, marginTop: 4 }}>Lance la migration SQL pour activer les clôtures de saison.</div>
    </div>
  )

  const saisonsDispo = ['2026-2027', '2025-2026', '2024-2025', '2023-2024']
  const nbClotures = joueurs.filter(j => getHistorique(j.id)?.cloturee).length

  return (
    <div style={{ padding: 16 }}>
      {/* Banner auto-clôture */}
      {isApresClotureAuto() && nbClotures < joueurs.length && (
        <div style={{ background: '#1a1a00', border: `1px solid ${st.yellow}50`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⏰</span>
          <div>
            <div style={{ color: st.yellow, fontWeight: 700 }}>C'est l'heure de clôturer la saison {saison}</div>
            <div style={{ color: st.muted, fontSize: 13 }}>Nous sommes après le 20 juin. {joueurs.length - nbClotures} joueur(s) sans clôture.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: st.text, margin: 0 }}>📅 Clôtures de saison</h2>
          <p style={{ color: st.muted, fontSize: 13, margin: '4px 0 0' }}>{nbClotures}/{joueurs.length} joueurs clôturés</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={saison} onChange={e => setSaison(e.target.value)}
            style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 12px', color: st.text, fontSize: 13 }}>
            {saisonsDispo.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: st.muted, fontSize: 13 }}>Progression clôtures</span>
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
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: cloture ? '#14532d' : st.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cloture ? st.green : st.muted, fontWeight: 700, fontSize: 14 }}>
                    {(j.prenom || '?')[0]}{(j.nom || '?')[0]}
                  </div>
                  <div>
                    <div style={{ color: st.text, fontWeight: 700 }}>{j.prenom} {j.nom}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ color: st.muted, fontSize: 12 }}>⚽ {cloture ? hist.buts : (j.buts_total || 0)} buts</span>
                      <span style={{ color: st.muted, fontSize: 12 }}>🎯 {cloture ? hist.passes_decisives : (j.passes_decisives || 0)} passes</span>
                      <span style={{ color: st.muted, fontSize: 12 }}>🏃 {cloture ? hist.matchs_joues : (j.matchs_officiel || 0)} matchs</span>
                      {tauxPres !== null && <span style={{ color: tauxPres >= 80 ? st.green : tauxPres >= 50 ? st.yellow : st.red, fontSize: 12 }}>📋 {tauxPres}% présence</span>}
                    </div>
                    {cloture && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span style={{ color: st.green, fontSize: 11 }}>✅ {hist.victoires}V</span>
                        <span style={{ color: st.yellow, fontSize: 11 }}>🟡 {hist.nuls}N</span>
                        <span style={{ color: st.red, fontSize: 11 }}>❌ {hist.defaites}D</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {cloture ? (
                    <span style={{ background: '#14532d', color: st.green, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ Clôturé</span>
                  ) : (
                    <button onClick={() => setModalJoueur(j)}
                      style={{ padding: '8px 16px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      Clôturer →
                    </button>
                  )}
                  {cloture && (
                    <button onClick={() => setModalJoueur(j)}
                      style={{ padding: '6px 12px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.muted, cursor: 'pointer', fontSize: 12 }}>
                      Modifier
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
            <div style={{ color: st.text }}>Aucun joueur trouvé</div>
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
        />
      )}
    </div>
  )
}
