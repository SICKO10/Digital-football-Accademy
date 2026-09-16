import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

const POSTES = ['Tous', 'Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu axial', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']
const REGIONS = ['Toutes', 'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur", 'DOM-TOM']
const NIVEAUX = ['Tous', 'National 3', 'Régional 1', 'Régional 2', 'Régional 3', 'Départemental 1', 'Départemental 2']
const CATEGORIES = ['Toutes', 'Senior', 'U19', 'U18', 'U17', 'U16', 'U15']
const STATUTS = ['Tous', "À l'écoute", 'Recherche active']

const COLONNES_PAR_POSTE = {
  Gardien: [
    { key: 'moy_arrets', label: 'Arrêts/m', color: '#4ade80' },
    { key: 'pct_arrets', label: '% Arrêts', color: '#4ade80', suffix: '%' },
    { key: 'moy_minutes', label: 'Min/m', color: '#aaa' },
  ],
  Défenseur: [
    { key: 'pct_passes', label: '% Passes', color: '#4ade80', suffix: '%' },
    { key: 'pct_duels', label: '% Duels', color: '#4ade80', suffix: '%' },
    { key: 'moy_interceptions', label: 'Interc./m', color: '#aaa' },
    { key: 'moy_km', label: 'Km/m', color: '#3b82f6' },
  ],
  Milieu: [
    { key: 'pct_passes', label: '% Passes', color: '#4ade80', suffix: '%' },
    { key: 'moy_km', label: 'Km/m', color: '#3b82f6' },
    { key: 'moy_recuperations', label: 'Récup./m', color: '#4ade80' },
    { key: 'pct_duels', label: '% Duels', color: '#aaa', suffix: '%' },
  ],
  Attaquant: [
    { key: 'moy_buts', label: 'Buts/m', color: '#4ade80' },
    { key: 'moy_pd', label: 'PD/m', color: '#4ade80' },
    { key: 'pct_dribbles', label: '% Dribbles', color: '#f59e0b', suffix: '%' },
    { key: 'moy_km', label: 'Km/m', color: '#3b82f6' },
  ],
}

function getPosteFamille(poste) {
  if (!poste || poste === 'Tous') return 'Milieu'
  const p = poste.toLowerCase()
  if (p.includes('gardien')) return 'Gardien'
  if (['défenseur central', 'latéral'].some(s => p.includes(s.split(' ')[0]))) return 'Défenseur'
  if (['ailier', 'attaquant'].some(s => p.includes(s))) return 'Attaquant'
  return 'Milieu'
}

function RadarMini({ data, color = '#4ade80' }) {
  const n = data.length
  const cx = 50, cy = 50, r = 38
  const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2
  const point = (i, val) => {
    const a = angle(i)
    const dist = r * Math.min(val / 100, 1)
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'
  const grid = [0.33, 0.66, 1].map(pct =>
    toPath(data.map((_, i) => { const a = angle(i); return [cx + r * pct * Math.cos(a), cy + r * pct * Math.sin(a)] }))
  )
  return (
    <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px' }}>
      {grid.map((d, i) => <path key={i} d={d} fill="none" stroke="#333" strokeWidth="0.8" />)}
      {data.map((_, i) => { const a = angle(i); return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#333" strokeWidth="0.8" /> })}
      <path d={toPath(data.map((v, i) => point(i, v)))} fill={color + '40'} stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

// Le moteur ne SÉLECTIONNE que sur profil_recrutement (moyennes déjà agrégées
// par MesStats.jsx à chaque saisie de match, cf. calculerMoyennes) + profiles
// pour poste/catégorie/club/région — il n'existe pas de table profil_joueur
// séparée dans ce projet, et rien n'est recalculé ici.
export default function MoteurRecrutement({ userId }) {
  const colors = useColors()
  const [joueurs, setJoueurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [statsSelected, setStatsSelected] = useState([])
  const [messageModal, setMessageModal] = useState(false)
  const [messageTexte, setMessageTexte] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const [filtres, setFiltres] = useState({
    poste: 'Tous',
    region: 'Toutes',
    niveau: 'Tous',
    categorie: 'Toutes',
    statut: 'Tous',
    tri: 'moy_buts',
    km_min: '', passes_min: '', buts_min: '', duels_min: '',
    recuperations_min: '', arrets_min: '',
  })
  const [ongletFiltres, setOngletFiltres] = useState(false)

  const rechercher = useCallback(async () => {
    setLoading(true)
    setSelected(null)

    let query = supabase
      .from('profil_recrutement')
      .select('*, profiles!inner(id, prenom, nom, poste, categorie, club, region, niveau_equipe, pied, avatar_url)')
      .eq('visible_recruteurs', true)
      .gt('nb_matchs', 2) // au moins 3 matchs pour apparaître

    if (filtres.statut !== 'Tous') query = query.eq('statut_recrutement', filtres.statut)
    if (filtres.km_min) query = query.gte('moy_km', Number(filtres.km_min))
    if (filtres.passes_min) query = query.gte('pct_passes', Number(filtres.passes_min))
    if (filtres.buts_min) query = query.gte('moy_buts', Number(filtres.buts_min))
    if (filtres.duels_min) query = query.gte('pct_duels', Number(filtres.duels_min))
    if (filtres.recuperations_min) query = query.gte('moy_recuperations', Number(filtres.recuperations_min))
    if (filtres.arrets_min) query = query.gte('moy_arrets', Number(filtres.arrets_min))

    query = query.order(filtres.tri || 'moy_buts', { ascending: false }).limit(100)

    const { data, error } = await query
    if (error) { console.error(error); setJoueurs([]); setLoading(false); return }

    let results = data || []
    if (filtres.poste !== 'Tous') {
      results = results.filter(j => (j.profiles?.poste || '').toLowerCase().includes(filtres.poste.split(' ')[0].toLowerCase()))
    }
    if (filtres.region !== 'Toutes') {
      results = results.filter(j => (j.profiles?.region || '') === filtres.region)
    }
    if (filtres.niveau !== 'Tous') {
      results = results.filter(j => (j.profiles?.niveau_equipe || '').toLowerCase().includes(filtres.niveau.toLowerCase()))
    }
    if (filtres.categorie !== 'Toutes') {
      results = results.filter(j => (j.profiles?.categorie || '').includes(filtres.categorie))
    }

    setJoueurs(results)
    setLoading(false)
  }, [filtres])

  useEffect(() => { rechercher() }, [])

  async function chargerStatsJoueur(joueurId) {
    const { data } = await supabase
      .from('stats_match_joueur')
      .select('*')
      .eq('joueur_id', joueurId)
      .order('date', { ascending: false })
      .limit(10)
    setStatsSelected(data || [])
  }

  const setFiltre = (key, val) => setFiltres(p => ({ ...p, [key]: val }))
  const famille = getPosteFamille(filtres.poste)
  const colonnes = COLONNES_PAR_POSTE[famille] || COLONNES_PAR_POSTE['Milieu']

  const selectStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 12px', color: colors.text.primary, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const inputSeuil = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 10px', color: colors.text.primary, fontSize: '13px', width: '80px', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Mon Réseau</div>
        <h1 style={{ color: colors.text.primary, fontSize: '24px', fontWeight: 900, margin: 0 }}>🔍 Moteur de Recrutement</h1>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Trouve des joueurs par poste, région, niveau et statistiques</p>
      </div>

      {/* Filtres principaux */}
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <select value={filtres.poste} onChange={e => setFiltre('poste', e.target.value)} style={selectStyle}>
            {POSTES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filtres.region} onChange={e => setFiltre('region', e.target.value)} style={selectStyle}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={filtres.niveau} onChange={e => setFiltre('niveau', e.target.value)} style={selectStyle}>
            {NIVEAUX.map(n => <option key={n}>{n}</option>)}
          </select>
          <select value={filtres.categorie} onChange={e => setFiltre('categorie', e.target.value)} style={selectStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filtres.statut} onChange={e => setFiltre('statut', e.target.value)} style={selectStyle}>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filtres.tri} onChange={e => setFiltre('tri', e.target.value)} style={{ ...selectStyle, borderColor: colors.accent.green + '40', color: colors.accent.green }}>
            <option value="moy_buts">Trier : Buts/m</option>
            <option value="moy_pd">Trier : PD/m</option>
            <option value="moy_km">Trier : Km/m</option>
            <option value="pct_passes">Trier : % Passes</option>
            <option value="pct_duels">Trier : % Duels</option>
            <option value="moy_recuperations">Trier : Récupérations</option>
            <option value="pct_arrets">Trier : % Arrêts</option>
            <option value="nb_matchs">Trier : Matchs joués</option>
          </select>
        </div>

        <button onClick={() => setOngletFiltres(p => !p)}
          style={{ background: 'none', border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '6px 14px', color: colors.text.faint, fontSize: '12px', cursor: 'pointer', marginBottom: ongletFiltres ? '14px' : 0, fontFamily: 'Inter, sans-serif' }}>
          {ongletFiltres ? '▲' : '▼'} Filtres avancés (seuils)
        </button>

        {ongletFiltres && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
            {[
              { key: 'km_min', label: 'Km/m ≥' },
              { key: 'passes_min', label: '% Passes ≥' },
              { key: 'buts_min', label: 'Buts/m ≥' },
              { key: 'duels_min', label: '% Duels ≥' },
              { key: 'recuperations_min', label: 'Récup./m ≥' },
              { key: 'arrets_min', label: 'Arrêts/m ≥' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: colors.text.faint, fontSize: '12px' }}>{label}</span>
                <input type="number" min="0" value={filtres[key]} onChange={e => setFiltre(key, e.target.value)} placeholder="0" style={inputSeuil} />
              </div>
            ))}
          </div>
        )}

        <button onClick={rechercher}
          style={{ marginTop: '14px', background: colors.accent.green, border: 'none', borderRadius: '10px', padding: '10px 24px', color: colors.black, fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          🔍 Rechercher
        </button>
      </div>

      {/* Résultats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: selected ? '1 1 55%' : '1 1 100%', minWidth: '280px' }}>
          <div style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
            {loading ? 'Recherche...' : `${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''} trouvé${joueurs.length > 1 ? 's' : ''}`}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: colors.text.disabled }}>🔍 Recherche en cours...</div>
          )}

          {!loading && joueurs.length === 0 && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Aucun joueur trouvé</div>
              <div style={{ color: colors.text.faint, fontSize: '13px' }}>Modifie les filtres ou élargis les critères</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {joueurs.map((j, idx) => {
              const profil = j.profiles || {}
              const isActive = selected?.joueur_id === j.joueur_id
              const statut = j.statut_recrutement
              const statutColor = statut === 'Recherche active' ? colors.accent.green : statut === "À l'écoute" ? '#f59e0b' : colors.text.disabled

              return (
                <div key={j.joueur_id}
                  onClick={async () => { setSelected(j); await chargerStatsJoueur(j.joueur_id) }}
                  style={{ background: isActive ? colors.accent.green + '15' : colors.background.surface, border: `1px solid ${isActive ? colors.accent.green + '40' : colors.border.subtle}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}>

                  <div style={{ color: idx < 3 ? ['#fbbf24', '#aaa', '#cd7f32'][idx] : colors.text.disabled, fontWeight: 900, fontSize: '14px', width: '28px', textAlign: 'center' }}>
                    #{idx + 1}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '160px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.background.raised, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {profil.avatar_url
                        ? <img src={profil.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>{(profil.prenom || '?')[0]}</span>
                      }
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{profil.prenom} {profil.nom?.charAt(0)}.</div>
                      <div style={{ color: colors.text.disabled, fontSize: '11px' }}>{profil.club} · {profil.region}</div>
                      {statut && statut !== 'Non disponible' && (
                        <div style={{ color: statutColor, fontSize: '10px', fontWeight: 700, marginTop: '1px' }}>● {statut}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '18px', flexShrink: 0 }}>
                    {colonnes.map(c => (
                      <div key={c.key} style={{ textAlign: 'center' }}>
                        <div style={{ color: c.color, fontWeight: 700, fontSize: '14px' }}>
                          {j[c.key] != null ? `${Number(j[c.key]).toFixed(1)}${c.suffix || ''}` : <span style={{ color: colors.text.disabled }}>—</span>}
                        </div>
                        <div style={{ color: colors.text.disabled, fontSize: '9px', textTransform: 'uppercase' }}>{c.label}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: colors.text.faint, fontSize: '14px', fontWeight: 600 }}>{j.nb_matchs}m</div>
                      <div style={{ color: colors.text.disabled, fontSize: '9px', textTransform: 'uppercase' }}>Matchs</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fiche détail */}
        {selected && (
          <div style={{ flex: '1 1 320px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '18px', cursor: 'pointer', float: 'right' }}>×</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.background.raised, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected.profiles?.avatar_url
                  ? <img src={selected.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: colors.accent.green, fontWeight: 800, fontSize: '20px' }}>{(selected.profiles?.prenom || '?')[0]}</span>
                }
              </div>
              <div>
                <div style={{ color: colors.text.primary, fontWeight: 900, fontSize: '18px' }}>{selected.profiles?.prenom} {selected.profiles?.nom}</div>
                <div style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 600 }}>{selected.profiles?.poste}</div>
                <div style={{ color: colors.text.faint, fontSize: '12px' }}>{selected.profiles?.club} · {selected.profiles?.region}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              {(() => {
                const f = getPosteFamille(selected.profiles?.poste)
                const d = f === 'Gardien'
                  ? [selected.pct_arrets || 0, Math.min((selected.moy_arrets || 0) * 20, 100), Math.min((selected.moy_recuperations || 0) * 20, 100), selected.pct_duels || 0, 70, 75]
                  : f === 'Défenseur'
                  ? [selected.pct_passes || 0, selected.pct_duels || 0, Math.min((selected.moy_interceptions || 0) * 15, 100), Math.min((selected.moy_tacles || 0) * 20, 100), Math.min((selected.moy_km || 0) * 10, 100), Math.min((selected.moy_recuperations || 0) * 15, 100)]
                  : f === 'Attaquant'
                  ? [Math.min((selected.moy_buts || 0) * 100, 100), selected.pct_frappes || 0, selected.pct_dribbles || 0, Math.min((selected.moy_pd || 0) * 100, 100), Math.min((selected.moy_km || 0) * 10, 100), 70]
                  : [selected.pct_passes || 0, Math.min((selected.moy_km || 0) * 10, 100), Math.min((selected.moy_recuperations || 0) * 15, 100), selected.pct_duels || 0, Math.min((selected.moy_buts || 0) * 100, 100), Math.min((selected.moy_pd || 0) * 100, 100)]
                return <RadarMini data={d} color={colors.accent.green} />
              })()}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Saison · {selected.nb_matchs} matchs
              </div>
              {[
                { label: 'Minutes / match', val: selected.moy_minutes, suffix: ' min' },
                { label: 'Buts / match', val: selected.moy_buts },
                { label: 'Passes déc. / match', val: selected.moy_pd },
                { label: '% Passes réussies', val: selected.pct_passes, suffix: '%' },
                { label: 'Km / match', val: selected.moy_km, suffix: ' km' },
                { label: 'Récupérations / match', val: selected.moy_recuperations },
                { label: '% Duels gagnés', val: selected.pct_duels, suffix: '%' },
                { label: '% Arrêts', val: selected.pct_arrets, suffix: '%' },
                { label: 'Interceptions / match', val: selected.moy_interceptions },
              ].filter(s => s.val != null && s.val > 0).map(({ label, val, suffix }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                  <span style={{ color: colors.text.faint, fontSize: '13px' }}>{label}</span>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{Number(val).toFixed(1)}{suffix || ''}</span>
                </div>
              ))}
            </div>

            {statsSelected.length > 0 && (() => {
              // "Vérifiées" = remontées automatiquement (feuille de match
              // officielle côté éducateur, ou import Veo) plutôt que
              // ressaisies à la main par le joueur — cf. Recrutement Phase 3.
              const nbVerifiees = statsSelected.filter(m => m.source === 'feuille_match' || m.source === 'veo_csv').length
              const pctVerifiees = Math.round((nbVerifiees / statsSelected.length) * 100)
              return (
              <div style={{ marginBottom: '20px' }}>
                {pctVerifiees > 0 && (
                  <div style={{ background: colors.accent.green + '15', border: `1px solid ${colors.accent.green}30`, borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <div>
                      <div style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 700 }}>{pctVerifiees}% des stats vérifiées</div>
                      <div style={{ color: colors.text.disabled, fontSize: '11px' }}>{nbVerifiees}/{statsSelected.length} matchs via feuille officielle ou Veo</div>
                    </div>
                  </div>
                )}
                <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>5 derniers matchs</div>
                {statsSelected.slice(0, 5).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border.faint}`, fontSize: '12px' }}>
                    <span style={{ color: colors.text.dim }}>
                      vs {m.adversaire}
                      {(m.source === 'feuille_match' || m.source === 'veo_csv') && <span title="Donnée vérifiée" style={{ marginLeft: '6px' }}>✅</span>}
                    </span>
                    <span style={{ color: colors.text.faint }}>{m.minutes}min · {m.buts}⚽ · {m.passes_decisives}🎯{m.km_parcourus ? ` · ${m.km_parcourus}km` : ''}</span>
                  </div>
                ))}
              </div>
              )
            })()}

            <div style={{ background: selected.statut_recrutement === 'Recherche active' ? colors.accent.green + '15' : selected.statut_recrutement === "À l'écoute" ? '#f59e0b15' : colors.background.raised, border: `1px solid ${selected.statut_recrutement === 'Recherche active' ? colors.accent.green + '40' : selected.statut_recrutement === "À l'écoute" ? '#f59e0b40' : colors.border.default}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', textAlign: 'center' }}>
              <span style={{ color: selected.statut_recrutement === 'Recherche active' ? colors.accent.green : selected.statut_recrutement === "À l'écoute" ? '#f59e0b' : colors.text.disabled, fontWeight: 700, fontSize: '13px' }}>
                {selected.statut_recrutement === 'Recherche active' ? '🟢 En recherche active' : selected.statut_recrutement === "À l'écoute" ? "🟡 À l'écoute" : '⚫ Non disponible'}
              </span>
            </div>

            {selected.statut_recrutement !== 'Non disponible' && (
              <button onClick={() => setMessageModal(true)}
                style={{ width: '100%', background: colors.accent.green, border: 'none', borderRadius: '10px', padding: '13px', color: colors.black, fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                ✉️ Contacter ce joueur
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal message */}
      {messageModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setMessageModal(false)}>
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '100%', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 16px', fontWeight: 800 }}>✉️ Contacter {selected.profiles?.prenom}</h3>
            <textarea value={messageTexte} onChange={e => setMessageTexte(e.target.value)}
              placeholder="Bonjour, je suis éducateur/club à... et je suis intéressé par ton profil pour..."
              rows={5}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px', color: colors.text.primary, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setMessageModal(false); setMessageTexte('') }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px', color: colors.text.faint, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Annuler
              </button>
              <button disabled={envoiEnCours} onClick={async () => {
                if (!messageTexte.trim()) return
                setEnvoiEnCours(true)
                const { error } = await supabase.from('messages').insert({
                  sender_id: userId,
                  receiver_id: selected.joueur_id,
                  content: messageTexte.trim(),
                })
                setEnvoiEnCours(false)
                if (error) { alert('Erreur : ' + error.message); return }
                setMessageModal(false)
                setMessageTexte('')
                alert('Message envoyé !')
              }}
                style={{ flex: 2, background: colors.accent.green, border: 'none', borderRadius: '10px', padding: '12px', color: colors.black, fontWeight: 800, cursor: envoiEnCours ? 'default' : 'pointer', opacity: envoiEnCours ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
                {envoiEnCours ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
