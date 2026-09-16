import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'
import { getPosteFamille } from '../lib/postes'

const STATS_PAR_POSTE = {
  Gardien: [
    { key: 'arrets', label: 'Arrêts', icon: '🧤' },
    { key: 'buts_encaisses', label: 'Buts encaissés', icon: '🥅' },
    { key: 'sorties', label: 'Sorties', icon: '🏃' },
    { key: 'relances_reussies', label: 'Relances réussies', icon: '🎯' },
    { key: 'duels_total', label: 'Duels tentés', icon: '⚔️' },
    { key: 'duels_gagnes', label: 'Duels gagnés', icon: '✅' },
  ],
  Défenseur: [
    { key: 'interceptions', label: 'Interceptions', icon: '✂️' },
    { key: 'tacles_reussis', label: 'Tacles réussis', icon: '🦵' },
    { key: 'degagements', label: 'Dégagements', icon: '👊' },
    { key: 'duels_total', label: 'Duels tentés', icon: '⚔️' },
    { key: 'duels_gagnes', label: 'Duels gagnés', icon: '✅' },
    { key: 'passes_tentees', label: 'Passes tentées', icon: '📊' },
    { key: 'passes_reussies', label: 'Passes réussies', icon: '🎯' },
    { key: 'fautes_commises', label: 'Fautes', icon: '🟡' },
    { key: 'km_parcourus', label: 'Km parcourus', icon: '🏃', decimal: true },
  ],
  Milieu: [
    { key: 'passes_tentees', label: 'Passes tentées', icon: '📊' },
    { key: 'passes_reussies', label: 'Passes réussies', icon: '🎯' },
    { key: 'recuperations', label: 'Récupérations', icon: '💪' },
    { key: 'duels_total', label: 'Duels tentés', icon: '⚔️' },
    { key: 'duels_gagnes', label: 'Duels gagnés', icon: '✅' },
    { key: 'km_parcourus', label: 'Km parcourus', icon: '🏃', decimal: true },
    { key: 'dribbles_tentes', label: 'Dribbles tentés', icon: '🔄' },
    { key: 'dribbles_reussis', label: 'Dribbles réussis', icon: '✅' },
    { key: 'fautes_commises', label: 'Fautes', icon: '🟡' },
  ],
  Attaquant: [
    { key: 'frappes_tentees', label: 'Frappes tentées', icon: '👟' },
    { key: 'frappes_cadrees', label: 'Frappes cadrées', icon: '🎯' },
    { key: 'dribbles_tentes', label: 'Dribbles tentés', icon: '🔄' },
    { key: 'dribbles_reussis', label: 'Dribbles réussis', icon: '✅' },
    { key: 'hors_jeu', label: 'Hors-jeu', icon: '🚩' },
    { key: 'km_parcourus', label: 'Km parcourus', icon: '🏃', decimal: true },
    { key: 'passes_tentees', label: 'Passes tentées', icon: '📊' },
    { key: 'passes_reussies', label: 'Passes réussies', icon: '🎯' },
  ],
}

const NIVEAUX = ['National 3', 'Régional 1', 'Régional 2', 'Régional 3', 'Départemental 1', 'Départemental 2', 'U19 Régional', 'U18 Régional', 'U17 Régional', 'U16 Régional', 'U15 Régional', 'Autre']

const FORM_VIDE = {
  date: new Date().toISOString().split('T')[0],
  adversaire: '', niveau: '', minutes: 90, titulaire: true,
  buts: 0, passes_decisives: 0, cartons_jaunes: 0, cartons_rouges: 0,
  passes_tentees: '', passes_reussies: '', recuperations: '',
  duels_total: '', duels_gagnes: '', km_parcourus: '',
  frappes_tentees: '', frappes_cadrees: '', dribbles_tentes: '', dribbles_reussis: '',
  hors_jeu: '', interceptions: '', tacles_reussis: '', degagements: '',
  fautes_commises: '', arrets: '', buts_encaisses: '', sorties: '', relances_reussies: '',
}

// Moyennes/pourcentages calculés à partir de tous les matchs saisis — mêmes
// noms de champs que profil_recrutement (upsert direct du résultat).
function calculerMoyennes(matchs) {
  if (!matchs.length) return {}
  const n = matchs.length
  const sum = (key) => matchs.reduce((s, m) => s + (Number(m[key]) || 0), 0)
  const avg = (key) => Math.round((sum(key) / n) * 100) / 100
  const pct = (num, den) => {
    const t = sum(den)
    return t > 0 ? Math.round((sum(num) / t) * 100) : null
  }
  const totalArrets = sum('arrets')
  const totalEncaisses = sum('buts_encaisses')
  return {
    nb_matchs: n,
    moy_minutes: avg('minutes'),
    moy_buts: avg('buts'),
    moy_pd: avg('passes_decisives'),
    moy_km: avg('km_parcourus'),
    moy_recuperations: avg('recuperations'),
    pct_passes: pct('passes_reussies', 'passes_tentees'),
    pct_duels: pct('duels_gagnes', 'duels_total'),
    // Arrêts / (arrêts + buts encaissés) — pas arrêts / frappes tentées (le
    // gardien n'a pas cette stat), sinon ce pourcentage n'a pas de sens.
    pct_arrets: (totalArrets + totalEncaisses) > 0 ? Math.round((totalArrets / (totalArrets + totalEncaisses)) * 100) : null,
    moy_arrets: avg('arrets'),
    pct_frappes: pct('frappes_cadrees', 'frappes_tentees'),
    pct_dribbles: pct('dribbles_reussis', 'dribbles_tentes'),
    moy_interceptions: avg('interceptions'),
    moy_tacles: avg('tacles_reussis'),
  }
}

// Radar SVG pour le profil — pas de lib externe, mêmes conventions que le
// reste de l'app (schémas terrain dessinés à la main en SVG/jsPDF ailleurs).
function RadarChart({ data, labels, color, gridColor, textColor }) {
  const n = labels.length
  const cx = 120, cy = 120, r = 90
  const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2
  const point = (i, val) => {
    const a = angle(i)
    const dist = r * Math.min(val / 100, 1)
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const gridPoint = (i, pct) => {
    const a = angle(i)
    const dist = r * pct
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'

  const dataPath = toPath(data.map((v, i) => point(i, v)))
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => toPath(labels.map((_, i) => gridPoint(i, pct))))

  return (
    <svg viewBox="0 0 240 240" style={{ width: '200px', height: '200px', flexShrink: 0 }}>
      {gridLines.map((d, i) => <path key={i} d={d} fill="none" stroke={gridColor} strokeWidth="1" />)}
      {labels.map((_, i) => {
        const [x, y] = gridPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={gridColor} strokeWidth="1" />
      })}
      <path d={dataPath} fill={color + alpha.subtle} stroke={color} strokeWidth="2" />
      {data.map((v, i) => {
        const [x, y] = point(i, v)
        return <circle key={i} cx={x} cy={y} r="4" fill={color} />
      })}
      {labels.map((label, i) => {
        const [x, y] = gridPoint(i, 1.18)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={textColor} fontSize="9" fontWeight="600">{label}</text>
      })}
    </svg>
  )
}

export default function MesStats({ userId, joueurPoste }) {
  const colors = useColors()
  const [vue, setVue] = useState('profil') // profil | saisir | historique
  const [matchs, setMatchs] = useState([])
  const [saving, setSaving] = useState(false)
  const poste = getPosteFamille(joueurPoste)
  const statsSpec = STATS_PAR_POSTE[poste] || STATS_PAR_POSTE.Milieu

  const [form, setForm] = useState(FORM_VIDE)

  const charger = async () => {
    const { data } = await supabase.from('stats_match_joueur').select('*').eq('joueur_id', userId).order('date', { ascending: false })
    setMatchs(data || [])
  }

  useEffect(() => { if (userId) charger() }, [userId])

  const sauvegarder = async () => {
    setSaving(true)
    const payload = { ...form, joueur_id: userId, source: 'manuel' }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    const { error } = await supabase.from('stats_match_joueur').insert(payload)
    if (error) { alert(error.message); setSaving(false); return }

    const { data: allMatchs } = await supabase.from('stats_match_joueur').select('*').eq('joueur_id', userId)
    const moyennes = calculerMoyennes(allMatchs || [])
    await supabase.from('profil_recrutement').upsert({ joueur_id: userId, ...moyennes, updated_at: new Date().toISOString() }, { onConflict: 'joueur_id' })

    setSaving(false)
    await charger()
    setVue('profil')
    setForm(FORM_VIDE)
  }

  const moy = calculerMoyennes(matchs)
  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }

  const radarConfig = poste === 'Gardien'
    ? { labels: ['Arrêts%', 'Sorties', 'Relances', 'Duels', 'Comm.', 'Réflexes'], data: [moy.pct_arrets || 0, Math.min((moy.moy_arrets || 0) * 20, 100), Math.min((moy.moy_recuperations || 0) * 20, 100), moy.pct_duels || 0, 70, 75] }
    : poste === 'Défenseur'
    ? { labels: ['Passes%', 'Duels%', 'Interc.', 'Tacles', 'Km', 'Récup.'], data: [moy.pct_passes || 0, moy.pct_duels || 0, Math.min((moy.moy_interceptions || 0) * 15, 100), Math.min((moy.moy_tacles || 0) * 20, 100), Math.min((moy.moy_km || 0) * 10, 100), Math.min((moy.moy_recuperations || 0) * 15, 100)] }
    : poste === 'Attaquant'
    ? { labels: ['Buts/m', 'Frappes%', 'Dribbles%', 'PD/m', 'Km', 'Pressing'], data: [Math.min((moy.moy_buts || 0) * 100, 100), moy.pct_frappes || 0, moy.pct_dribbles || 0, Math.min((moy.moy_pd || 0) * 100, 100), Math.min((moy.moy_km || 0) * 10, 100), 70] }
    : { labels: ['Passes%', 'Km', 'Récup.', 'Duels%', 'Buts/m', 'PD/m'], data: [moy.pct_passes || 0, Math.min((moy.moy_km || 0) * 10, 100), Math.min((moy.moy_recuperations || 0) * 15, 100), moy.pct_duels || 0, Math.min((moy.moy_buts || 0) * 100, 100), Math.min((moy.moy_pd || 0) * 100, 100)] }

  const statsClesRadar = [
    moy.moy_buts !== undefined && { label: 'Buts / match', value: moy.moy_buts },
    moy.moy_pd !== undefined && { label: 'PD / match', value: moy.moy_pd },
    moy.pct_passes && { label: 'Passes réussies', value: `${moy.pct_passes}%` },
    moy.moy_km && { label: 'Km / match', value: `${moy.moy_km} km` },
    moy.moy_recuperations && { label: 'Récupérations / match', value: moy.moy_recuperations },
    moy.pct_duels && { label: 'Duels gagnés', value: `${moy.pct_duels}%` },
    moy.pct_arrets != null && { label: 'Arrêts', value: `${moy.pct_arrets}%` },
    moy.moy_interceptions && { label: 'Interceptions / match', value: moy.moy_interceptions },
    moy.pct_dribbles && { label: 'Dribbles réussis', value: `${moy.pct_dribbles}%` },
    { label: 'Minutes / match', value: `${moy.moy_minutes} min` },
  ].filter(Boolean)

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Mon Développement</div>
        <h1 style={{ color: colors.text.primary, fontSize: '24px', fontWeight: 900, margin: 0 }}>Mes Statistiques</h1>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>
          {moy.nb_matchs || 0} match{(moy.nb_matchs || 0) > 1 ? 's' : ''} enregistré{(moy.nb_matchs || 0) > 1 ? 's' : ''} · {joueurPoste || poste}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[{ key: 'profil', label: 'Mon profil' }, { key: 'saisir', label: '+ Saisir un match' }, { key: 'historique', label: `Historique (${matchs.length})` }].map(o => (
          <button key={o.key} onClick={() => setVue(o.key)}
            style={{ padding: '9px 18px', borderRadius: '20px', border: vue === o.key ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: vue === o.key ? colors.accent.green + alpha.subtle : 'transparent', color: vue === o.key ? colors.accent.green : colors.text.faint, fontWeight: vue === o.key ? 700 : 400, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {o.label}
          </button>
        ))}
      </div>

      {vue === 'profil' && (
        matchs.length === 0 ? (
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Aucune stat enregistrée</div>
            <div style={{ color: colors.text.faint, fontSize: '14px', marginBottom: '20px' }}>Saisis tes stats après chaque match pour construire ton profil</div>
            <button onClick={() => setVue('saisir')} style={{ background: colors.accent.green, border: 'none', borderRadius: '10px', padding: '12px 24px', color: colors.black, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              + Saisir mon premier match
            </button>
          </div>
        ) : (
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            <RadarChart data={radarConfig.data} labels={radarConfig.labels} color={colors.accent.green} gridColor={colors.border.subtle} textColor={colors.text.faint} />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
                Saison en cours · {moy.nb_matchs} matchs
              </div>
              {statsClesRadar.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                  <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{label}</span>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {vue === 'saisir' && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontWeight: 800 }}>Saisir un match</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Adversaire *</label>
              <input value={form.adversaire} onChange={e => setForm(p => ({ ...p, adversaire: e.target.value }))} placeholder="AS Monaco" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Niveau</label>
              <select value={form.niveau} onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))} style={inputStyle}>
                <option value="">— Choisir —</option>
                {NIVEAUX.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Minutes jouées</label>
              <input type="number" min="0" max="120" value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: Number(e.target.value) }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[{ label: 'Titulaire', val: true }, { label: 'Remplaçant', val: false }].map(({ label, val }) => (
              <button key={label} onClick={() => setForm(p => ({ ...p, titulaire: val }))}
                style={{ padding: '8px 20px', borderRadius: '20px', border: form.titulaire === val ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.strong}`, background: form.titulaire === val ? colors.accent.green + alpha.subtle : 'transparent', color: form.titulaire === val ? colors.accent.green : colors.text.faint, fontWeight: form.titulaire === val ? 700 : 400, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Stats de base</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { key: 'buts', label: '⚽ Buts' },
              { key: 'passes_decisives', label: '🎯 PD' },
              { key: 'cartons_jaunes', label: '🟡 CJ' },
              { key: 'cartons_rouges', label: '🔴 CR' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type="number" min="0" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} style={inputStyle} />
              </div>
            ))}
          </div>

          <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Stats {poste}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {statsSpec.map(({ key, label, icon, decimal }) => (
              <div key={key}>
                <label style={labelStyle}>{icon} {label}</label>
                <input type="number" min="0" step={decimal ? '0.1' : '1'} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
            ))}
          </div>

          <button onClick={sauvegarder} disabled={saving || !form.adversaire}
            style={{ width: '100%', background: (saving || !form.adversaire) ? colors.background.raised : colors.accent.green, border: 'none', borderRadius: '10px', padding: '14px', color: (saving || !form.adversaire) ? colors.text.disabled : colors.black, fontWeight: 800, fontSize: '15px', cursor: (saving || !form.adversaire) ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Sauvegarde...' : 'Enregistrer ce match'}
          </button>
        </div>
      )}

      {vue === 'historique' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {matchs.length === 0 && <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '40px' }}>Aucun match enregistré</div>}
          {matchs.map(m => (
            <div key={m.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>
                  vs {m.adversaire}
                  {m.niveau && <span style={{ color: colors.text.disabled, fontWeight: 400, fontSize: '12px', marginLeft: '8px' }}>{m.niveau}</span>}
                </div>
                <div style={{ color: colors.text.faint, fontSize: '12px' }}>
                  {new Date(m.date).toLocaleDateString('fr-FR')} · {m.titulaire ? 'Titulaire' : 'Remplaçant'} · {m.minutes}min
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                {m.buts > 0 && <span style={{ color: colors.accent.green, fontWeight: 700 }}>⚽ {m.buts}</span>}
                {m.passes_decisives > 0 && <span style={{ color: colors.accent.green, fontWeight: 700 }}>🎯 {m.passes_decisives}</span>}
                {m.km_parcourus && <span style={{ color: colors.text.secondary }}>🏃 {m.km_parcourus}km</span>}
                {m.passes_tentees && m.passes_reussies && (
                  <span style={{ color: colors.text.secondary }}>📊 {Math.round(m.passes_reussies / m.passes_tentees * 100)}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
