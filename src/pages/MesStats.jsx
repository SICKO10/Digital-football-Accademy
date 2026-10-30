import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha, fontSize, radius, spacing } from '../tokens'
import { getPosteFamille } from '../lib/postes'
import { calculerMoyennes } from '../lib/statsRecrutement'
import { IconChart, IconTarget, IconPass, IconRun, IconCheck } from '../components/icones'
import Carte from '../components/joueur/Carte'
import TitreSection from '../components/joueur/TitreSection'

const STATS_PAR_POSTE = {
  Gardien: [
    { key: 'arrets', label: 'Arrêts' },
    { key: 'buts_encaisses', label: 'Buts encaissés' },
    { key: 'sorties', label: 'Sorties' },
    { key: 'relances_reussies', label: 'Relances réussies' },
    { key: 'duels_total', label: 'Duels tentés' },
    { key: 'duels_gagnes', label: 'Duels gagnés' },
  ],
  Défenseur: [
    { key: 'interceptions', label: 'Interceptions' },
    { key: 'tacles_reussis', label: 'Tacles réussis' },
    { key: 'degagements', label: 'Dégagements' },
    { key: 'duels_total', label: 'Duels tentés' },
    { key: 'duels_gagnes', label: 'Duels gagnés' },
    { key: 'passes_tentees', label: 'Passes tentées' },
    { key: 'passes_reussies', label: 'Passes réussies' },
    { key: 'fautes_commises', label: 'Fautes' },
    { key: 'km_parcourus', label: 'Km parcourus', decimal: true },
  ],
  Milieu: [
    { key: 'passes_tentees', label: 'Passes tentées' },
    { key: 'passes_reussies', label: 'Passes réussies' },
    { key: 'recuperations', label: 'Récupérations' },
    { key: 'duels_total', label: 'Duels tentés' },
    { key: 'duels_gagnes', label: 'Duels gagnés' },
    { key: 'km_parcourus', label: 'Km parcourus', decimal: true },
    { key: 'dribbles_tentes', label: 'Dribbles tentés' },
    { key: 'dribbles_reussis', label: 'Dribbles réussis' },
    { key: 'fautes_commises', label: 'Fautes' },
  ],
  Attaquant: [
    { key: 'frappes_tentees', label: 'Frappes tentées' },
    { key: 'frappes_cadrees', label: 'Frappes cadrées' },
    { key: 'dribbles_tentes', label: 'Dribbles tentés' },
    { key: 'dribbles_reussis', label: 'Dribbles réussis' },
    { key: 'hors_jeu', label: 'Hors-jeu' },
    { key: 'km_parcourus', label: 'Km parcourus', decimal: true },
    { key: 'passes_tentees', label: 'Passes tentées' },
    { key: 'passes_reussies', label: 'Passes réussies' },
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

// Une zone de saisie du formulaire : titre de groupe, consigne courte, champs.
function Groupe({ titre, aide, children }) {
  const colors = useColors()
  return (
    <div>
      <TitreSection style={{ margin: 0 }}>{titre}</TitreSection>
      {aide && <p style={{ margin: `${spacing.xs} 0 ${spacing.lg}`, color: colors.text.faint, fontSize: fontSize.lg }}>{aide}</p>}
      {!aide && <div style={{ height: spacing.lg }} />}
      {children}
    </div>
  )
}

export default function MesStats({ userId, joueurPoste, isMobile = false }) {
  const colors = useColors()
  const [vue, setVue] = useState('profil') // profil | saisir | historique
  const [matchs, setMatchs] = useState([])
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [enregistre, setEnregistre] = useState(false)
  const poste = getPosteFamille(joueurPoste)
  const statsSpec = STATS_PAR_POSTE[poste] || STATS_PAR_POSTE.Milieu

  const [form, setForm] = useState(FORM_VIDE)

  const charger = async () => {
    const { data } = await supabase.from('stats_match_joueur').select('*').eq('joueur_id', userId).order('date', { ascending: false })
    setMatchs(data || [])
  }

  useEffect(() => { if (userId) charger() }, [userId])

  const changerVue = (v) => { setVue(v); setErreur(''); setEnregistre(false) }

  const sauvegarder = async () => {
    setSaving(true)
    setErreur('')
    const payload = { ...form, joueur_id: userId, source: 'manuel' }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    const { error } = await supabase.from('stats_match_joueur').insert(payload)
    if (error) { setErreur(error.message); setSaving(false); return }

    const { data: allMatchs } = await supabase.from('stats_match_joueur').select('*').eq('joueur_id', userId)
    const moyennes = calculerMoyennes(allMatchs || [])
    await supabase.from('profil_recrutement').upsert({ joueur_id: userId, ...moyennes, updated_at: new Date().toISOString() }, { onConflict: 'joueur_id' })

    setSaving(false)
    await charger()
    setVue('profil')
    setEnregistre(true)
    setForm({ ...FORM_VIDE, date: new Date().toISOString().split('T')[0] })
  }

  const moy = calculerMoyennes(matchs)
  const formulaireValide = !!form.adversaire.trim() && !!form.date
  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: `0 ${spacing.lg}`, minHeight: '44px', color: colors.text.primary, fontSize: fontSize['3xl'], width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { color: colors.text.faint, fontSize: fontSize.base, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: spacing.xs }
  const grille = (colonnes) => ({ display: 'grid', gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`, gap: spacing.lg })
  const pastille = (actif) => ({
    minHeight: '44px', padding: `0 ${spacing['3xl']}`, borderRadius: radius.pill,
    border: `1px solid ${actif ? colors.accent.green : colors.border.default}`,
    background: actif ? colors.accent.green + alpha.subtle : 'transparent',
    color: actif ? colors.accent.green : colors.text.faint,
    fontWeight: actif ? 700 : 500, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  })
  const boutonPrincipal = (actif) => ({
    minHeight: '48px', padding: `0 ${spacing['4xl']}`, border: 'none', borderRadius: radius.xl,
    background: actif ? colors.accent.green : colors.background.raised,
    color: actif ? colors.black : colors.text.disabled,
    fontWeight: 800, fontSize: fontSize['2xl'], cursor: actif ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
  })

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
    <div style={{ padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
      <div>
        <TitreSection couleur={colors.accent.green} style={{ margin: `0 0 ${spacing.xs}` }}>Mon développement</TitreSection>
        <h1 style={{ color: colors.text.primary, fontSize: fontSize['7xl'], fontWeight: 800, margin: 0 }}>Mes statistiques</h1>
        <p style={{ color: colors.text.faint, fontSize: fontSize.lg, margin: `${spacing.xs} 0 0` }}>
          {moy.nb_matchs || 0} match{(moy.nb_matchs || 0) > 1 ? 's' : ''} enregistré{(moy.nb_matchs || 0) > 1 ? 's' : ''} · {joueurPoste || poste}
        </p>
      </div>

      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
        {[{ key: 'profil', label: 'Mon profil' }, { key: 'saisir', label: 'Saisir un match' }, { key: 'historique', label: `Historique (${matchs.length})` }].map(o => (
          <button key={o.key} onClick={() => changerVue(o.key)} style={pastille(vue === o.key)}>{o.label}</button>
        ))}
      </div>

      {vue === 'profil' && enregistre && (
        <Carte isMobile={isMobile} accent={colors.accent.green} style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, color: colors.accent.green, fontWeight: 700, fontSize: fontSize.xl }}>
          <IconCheck size={18} /> Match enregistré, ton profil est à jour.
        </Carte>
      )}

      {vue === 'profil' && (
        matchs.length === 0 ? (
          <Carte isMobile={isMobile} style={{ textAlign: 'center', padding: isMobile ? spacing['4xl'] : '48px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.lg, color: colors.icon.muted }}><IconChart size={44} /></div>
            <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize['4xl'], marginBottom: spacing.md }}>Aucune stat enregistrée</div>
            <div style={{ color: colors.text.faint, fontSize: fontSize.xl, marginBottom: spacing['3xl'] }}>Saisis tes stats après chaque match pour construire ton profil.</div>
            <button onClick={() => changerVue('saisir')} style={boutonPrincipal(true)}>Saisir mon premier match</button>
          </Carte>
        ) : (
          <Carte isMobile={isMobile} style={{ display: 'flex', gap: spacing['5xl'], alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <RadarChart data={radarConfig.data} labels={radarConfig.labels} color={colors.accent.green} gridColor={colors.border.subtle} textColor={colors.text.faint} />
            <div style={{ flex: 1, minWidth: '220px' }}>
              <TitreSection couleur={colors.accent.green} style={{ marginBottom: spacing['2xl'] }}>Saison en cours · {moy.nb_matchs} matchs</TitreSection>
              {statsClesRadar.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.sm} 0`, borderBottom: `1px solid ${colors.border.faint}` }}>
                  <span style={{ color: colors.text.secondary, fontSize: fontSize.lg }}>{label}</span>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.lg }}>{value}</span>
                </div>
              ))}
            </div>
          </Carte>
        )
      )}

      {vue === 'saisir' && (
        <Carte isMobile={isMobile} style={{ display: 'flex', flexDirection: 'column', gap: spacing['4xl'] }}>
          <Groupe titre="Le match" aide="Ces deux champs sont obligatoires : la date et l'adversaire.">
            <div style={grille(isMobile ? 1 : 2)}>
              <div>
                <label style={labelStyle} htmlFor="ms-date">Date</label>
                <input id="ms-date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="ms-adv">Adversaire</label>
                <input id="ms-adv" value={form.adversaire} onChange={e => setForm(p => ({ ...p, adversaire: e.target.value }))} placeholder="AS Monaco" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="ms-niv">Niveau</label>
                <select id="ms-niv" value={form.niveau} onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))} style={inputStyle}>
                  <option value="">Choisir</option>
                  {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="ms-min">Minutes jouées</label>
                <input id="ms-min" type="number" inputMode="numeric" min="0" max="120" value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: Number(e.target.value) }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
              {[{ label: 'Titulaire', val: true }, { label: 'Remplaçant', val: false }].map(({ label, val }) => (
                <button key={label} onClick={() => setForm(p => ({ ...p, titulaire: val }))} style={pastille(form.titulaire === val)}>{label}</button>
              ))}
            </div>
          </Groupe>

          <Groupe titre="Ton match en chiffres" aide="Mets 0 si tu n'as rien à signaler.">
            <div style={grille(isMobile ? 2 : 4)}>
              {[
                { key: 'buts', label: 'Buts' },
                { key: 'passes_decisives', label: 'Passes décisives' },
                { key: 'cartons_jaunes', label: 'Cartons jaunes' },
                { key: 'cartons_rouges', label: 'Cartons rouges' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={labelStyle} htmlFor={`ms-${key}`}>{label}</label>
                  <input id={`ms-${key}`} type="number" inputMode="numeric" min="0" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} style={inputStyle} />
                </div>
              ))}
            </div>
          </Groupe>

          <Groupe titre={`Stats détaillées · ${poste}`} aide="Facultatif. Remplis ce que tu connais, laisse vide le reste : ton profil se calcule avec ce que tu donnes.">
            <div style={grille(isMobile ? 2 : 3)}>
              {statsSpec.map(({ key, label, decimal }) => (
                <div key={key}>
                  <label style={labelStyle} htmlFor={`ms-${key}`}>{label}</label>
                  <input id={`ms-${key}`} type="number" inputMode={decimal ? 'decimal' : 'numeric'} min="0" step={decimal ? '0.1' : '1'} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
              ))}
            </div>
          </Groupe>

          {erreur && (
            <div role="alert" style={{ color: colors.accent.red, fontSize: fontSize.lg, fontWeight: 600 }}>
              Le match n'a pas été enregistré. {erreur}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing['2xl'], flexWrap: 'wrap' }}>
            <button onClick={sauvegarder} disabled={saving || !formulaireValide} style={{ ...boutonPrincipal(!saving && formulaireValide), width: isMobile ? '100%' : 'auto' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer ce match'}
            </button>
            {!formulaireValide && <span style={{ color: colors.text.faint, fontSize: fontSize.lg }}>Indique la date et l'adversaire pour enregistrer.</span>}
          </div>
        </Carte>
      )}

      {vue === 'historique' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {matchs.length === 0 && (
            <Carte isMobile={isMobile} style={{ textAlign: 'center', color: colors.text.faint, fontSize: fontSize.xl }}>Aucun match enregistré pour le moment.</Carte>
          )}
          {matchs.map(m => (
            <Carte key={m.id} isMobile={isMobile} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.base }}>
              <div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.xl, marginBottom: '3px' }}>
                  vs {m.adversaire}
                  {m.niveau && <span style={{ color: colors.text.disabled, fontWeight: 400, fontSize: fontSize.md, marginLeft: spacing.md }}>{m.niveau}</span>}
                </div>
                <div style={{ color: colors.text.faint, fontSize: fontSize.md }}>
                  {new Date(m.date).toLocaleDateString('fr-FR')} · {m.titulaire ? 'Titulaire' : 'Remplaçant'} · {m.minutes} min
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing.lg, fontSize: fontSize.lg, flexWrap: 'wrap' }}>
                {m.buts > 0 && <span style={{ color: colors.accent.green, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}><IconTarget size={13} />{m.buts}</span>}
                {m.passes_decisives > 0 && <span style={{ color: colors.accent.green, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}><IconPass size={13} />{m.passes_decisives}</span>}
                {m.km_parcourus && <span style={{ color: colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}><IconRun size={13} />{m.km_parcourus} km</span>}
                {m.passes_tentees && m.passes_reussies && (
                  <span style={{ color: colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}><IconChart size={13} />{Math.round(m.passes_reussies / m.passes_tentees * 100)}%</span>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}
    </div>
  )
}
