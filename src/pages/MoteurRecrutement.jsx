import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'
import { police, forme } from '../tokens'
import { TitreEcran, Etiquette, Icone } from '../components/identite'
import { Message } from '../components/categories/UiCategories'
import { styleMontant } from '../lib/identiteFinance'
import { styleCarte, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, styleEtiquette, styleChiffreHeros, couleurCraie, couleurClub, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP, CLASSE_CLIQUABLE } from '../lib/identite'
import { Search, Mail, X, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react'

const POSTES = ['Tous', 'Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu axial', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']
const REGIONS = ['Toutes', 'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur", 'DOM-TOM']
const NIVEAUX = ['Tous', 'National 3', 'Régional 1', 'Régional 2', 'Régional 3', 'Départemental 1', 'Départemental 2']
const CATEGORIES = ['Toutes', 'Senior', 'U19', 'U18', 'U17', 'U16', 'U15']
const STATUTS = ['Tous', "À l'écoute", 'Recherche active']

const COLONNES_PAR_POSTE = {
  Gardien: [
    { key: 'moy_arrets', label: 'Arrêts/m' },
    { key: 'pct_arrets', label: '% Arrêts', suffix: '%' },
    { key: 'moy_minutes', label: 'Min/m' },
  ],
  Défenseur: [
    { key: 'pct_passes', label: '% Passes', suffix: '%' },
    { key: 'pct_duels', label: '% Duels', suffix: '%' },
    { key: 'moy_interceptions', label: 'Interc./m' },
    { key: 'moy_km', label: 'Km/m' },
  ],
  Milieu: [
    { key: 'pct_passes', label: '% Passes', suffix: '%' },
    { key: 'moy_km', label: 'Km/m' },
    { key: 'moy_recuperations', label: 'Récup./m' },
    { key: 'pct_duels', label: '% Duels', suffix: '%' },
  ],
  Attaquant: [
    { key: 'moy_buts', label: 'Buts/m' },
    { key: 'moy_pd', label: 'PD/m' },
    { key: 'pct_dribbles', label: '% Dribbles', suffix: '%' },
    { key: 'moy_km', label: 'Km/m' },
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

function RadarMini({ data, color, grille }) {
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
    <svg viewBox="0 0 100 100" role="img" aria-label="Profil statistique du joueur" style={{ width: '88px', height: '88px' }}>
      {grid.map((d, i) => <path key={i} d={d} fill="none" stroke={grille} strokeWidth="0.8" />)}
      {data.map((_, i) => { const a = angle(i); return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={grille} strokeWidth="0.8" /> })}
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
  // Bilan médical du joueur sélectionné — jamais de donnée brute (cf.
  // supabase_bilan_medical_recruteurs.sql) : resume = agrégats si le joueur
  // a activé partage_bilan_medical ; demande = notre propre demande de
  // détail pour ce joueur (une par recruteur/joueur) ; detail = liste des
  // blessures (sans notes ni documents) seulement si la demande est acceptée.
  const [bilanResume, setBilanResume] = useState(null)
  const [bilanDemande, setBilanDemande] = useState(null)
  const [bilanDetail, setBilanDetail] = useState(null)
  const [demandeMessage, setDemandeMessage] = useState('')
  const [envoiDemandeEnCours, setEnvoiDemandeEnCours] = useState(false)

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
      // Jointure via profiles_public (lien profil_recrutement_joueur_id_fkey, ajouté
      // par supabase_profil_recrutement_fk.sql — il manquait, la requête échouait
      // toujours) : un club/éducateur ne lit plus directement le profil d'un
      // joueur hors de son effectif. Alias « profiles » conservé pour l'écran.
      .select('*, profiles:profiles_public!profil_recrutement_joueur_id_fkey!inner(id, prenom, nom, poste, categorie, club, region, niveau_equipe, pied, avatar_url)')
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

  async function chargerBilanMedical(joueurId) {
    setBilanResume(null); setBilanDemande(null); setBilanDetail(null); setDemandeMessage('')

    const { data: resume } = await supabase.rpc('bilan_medical_resume', { p_joueur_id: joueurId, p_saison: saisonActuelle() })
    setBilanResume(resume?.[0] || null)

    const { data: demande } = await supabase.from('demandes_bilan_medical').select('*')
      .eq('recruteur_id', userId).eq('joueur_id', joueurId).maybeSingle()
    setBilanDemande(demande || null)

    if (demande?.statut === 'acceptee') {
      const { data: detail } = await supabase.rpc('bilan_medical_detail', { p_joueur_id: joueurId })
      setBilanDetail(detail || [])
    }
  }

  async function envoyerDemandeBilan(joueurId) {
    setEnvoiDemandeEnCours(true)
    const { data, error } = await supabase.from('demandes_bilan_medical')
      .insert({ recruteur_id: userId, joueur_id: joueurId, message: demandeMessage.trim() || null })
      .select().single()
    setEnvoiDemandeEnCours(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setBilanDemande(data)
  }

  const setFiltre = (key, val) => setFiltres(p => ({ ...p, [key]: val }))
  const famille = getPosteFamille(filtres.poste)
  const colonnes = COLONNES_PAR_POSTE[famille] || COLONNES_PAR_POSTE['Milieu']

  const craie = `1px solid ${couleurCraie(colors)}`
  const champ = styleChamp(colors)
  const selectStyle = { ...champ, width: 'auto', minWidth: 0, cursor: 'pointer' }
  const inputSeuil = { ...champ, width: '90px' }
  const texteFin = { margin: 0, fontFamily: police.texte, fontSize: '13px', lineHeight: 1.45, color: colors.text.secondary }
  const marqueur = (couleur) => <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: couleur, flexShrink: 0 }} />
  const couleurStatut = (statut) => statut === 'Recherche active' ? colors.accent.success : statut === "À l'écoute" ? colors.accent.amber : colors.text.dim
  const libelleStatut = (statut) => statut === 'Recherche active' ? 'En recherche active' : statut === "À l'écoute" ? "À l'écoute" : 'Non disponible'
  const lettre = (prenom, taille) => (
    <span aria-hidden="true" style={{ fontFamily: police.titre, fontWeight: 700, fontSize: `${taille}px`, color: colors.text.primary, textTransform: 'uppercase' }}>{(prenom || '?')[0]}</span>
  )
  const avatar = (profil, taille, tailleLettre) => (
    <div style={{ width: `${taille}px`, height: `${taille}px`, borderRadius: '50%', background: colors.background.sunken, border: craie, boxSizing: 'border-box', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profil.avatar_url
        ? <img src={profil.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : lettre(profil.prenom, tailleLettre)}
    </div>
  )
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

  return (
    <div style={{ maxWidth: '1100px' }}>
      <TitreEcran
        surTitre="Mon réseau"
        titre="Moteur de recrutement"
        sousTitre="Trouve des joueurs par poste, région, niveau et statistiques"
      />

      {/* Filtres principaux */}
      <div style={{ ...styleCarte(colors), padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <select aria-label="Poste" className={CLASSE_CHAMP} value={filtres.poste} onChange={e => setFiltre('poste', e.target.value)} style={selectStyle}>
            {POSTES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select aria-label="Région" className={CLASSE_CHAMP} value={filtres.region} onChange={e => setFiltre('region', e.target.value)} style={selectStyle}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <select aria-label="Niveau" className={CLASSE_CHAMP} value={filtres.niveau} onChange={e => setFiltre('niveau', e.target.value)} style={selectStyle}>
            {NIVEAUX.map(n => <option key={n}>{n}</option>)}
          </select>
          <select aria-label="Catégorie" className={CLASSE_CHAMP} value={filtres.categorie} onChange={e => setFiltre('categorie', e.target.value)} style={selectStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Statut du joueur" className={CLASSE_CHAMP} value={filtres.statut} onChange={e => setFiltre('statut', e.target.value)} style={selectStyle}>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Trier par" className={CLASSE_CHAMP} value={filtres.tri} onChange={e => setFiltre('tri', e.target.value)} style={{ ...selectStyle, borderColor: couleurClub(colors) }}>
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

        <button onClick={() => setOngletFiltres(p => !p)} aria-expanded={ongletFiltres}
          className={CLASSE_BOUTON_SECONDAIRE}
          style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', fontSize: '13px', marginBottom: ongletFiltres ? '14px' : 0 }}>
          <Icone icone={ongletFiltres ? ChevronUp : ChevronDown} taille={16} /> Filtres avancés (seuils)
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
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor={`seuil-${key}`} style={texteFin}>{label}</label>
                <input id={`seuil-${key}`} className={CLASSE_CHAMP} type="number" min="0" value={filtres[key]} onChange={e => setFiltre(key, e.target.value)} placeholder="0" style={inputSeuil} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '14px' }}>
          <button onClick={rechercher} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
            <Icone icone={Search} /> Rechercher
          </button>
        </div>
      </div>

      {/* Résultats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: selected ? '1 1 55%' : '1 1 100%', minWidth: '280px' }}>
          <p role="status" style={{ ...texteFin, marginBottom: '12px', fontWeight: 600 }}>
            {loading ? 'Recherche...' : `${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''} trouvé${joueurs.length > 1 ? 's' : ''}`}
          </p>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', ...texteFin }}>Recherche en cours...</div>
          )}

          {!loading && joueurs.length === 0 && (
            <div style={{ ...styleCarte(colors), padding: '48px 20px', textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', color: colors.text.dim, marginBottom: '12px' }}><Icone icone={Search} taille={32} /></span>
              <p style={{ margin: '0 0 6px', fontFamily: police.titre, fontWeight: 700, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.text.primary }}>Aucun joueur trouvé</p>
              <p style={texteFin}>Modifie les filtres ou élargis les critères</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {joueurs.map((j, idx) => {
              const profil = j.profiles || {}
              const isActive = selected?.joueur_id === j.joueur_id
              const statut = j.statut_recrutement
              const ouvrir = async () => { setSelected(j); await Promise.all([chargerStatsJoueur(j.joueur_id), chargerBilanMedical(j.joueur_id)]) }

              return (
                <div key={j.joueur_id}
                  role="button" tabIndex={0} aria-pressed={isActive}
                  className={CLASSE_CLIQUABLE}
                  onClick={ouvrir}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir() } }}
                  style={{ ...styleCarte(colors), padding: '12px 16px 12px 19px', background: isActive ? colors.background.sunken : colors.background.surface, boxShadow: isActive ? `inset ${forme.lisere} 0 0 ${couleurClub(colors)}` : 'none', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>

                  <div style={{ ...styleMontant(colors, 18), color: colors.text.secondary, width: '32px', textAlign: 'center' }}>
                    {idx + 1}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '160px' }}>
                    {avatar(profil, 36, 16)}
                    <div>
                      <div style={{ fontFamily: police.texte, color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{profil.prenom} {profil.nom?.charAt(0)}.</div>
                      <div style={{ ...texteFin, fontSize: '12px' }}>{profil.club} · {profil.region}</div>
                      {statut && statut !== 'Non disponible' && (
                        <div style={{ ...texteFin, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>{marqueur(couleurStatut(statut))}{statut}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '18px', flexShrink: 0 }}>
                    {colonnes.map(c => (
                      <div key={c.key} style={{ textAlign: 'center' }}>
                        <div style={styleMontant(colors, 18)}>
                          {j[c.key] != null ? `${Number(j[c.key]).toFixed(1)}${c.suffix || ''}` : <span style={{ color: colors.text.dim }}>—</span>}
                        </div>
                        <div style={{ ...styleEtiquette(colors), fontSize: '11px' }}>{c.label}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ ...styleMontant(colors, 18), color: colors.text.secondary }}>{j.nb_matchs}</div>
                      <div style={{ ...styleEtiquette(colors), fontSize: '11px' }}>Matchs</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fiche détail */}
        {selected && (
          <div style={{ ...styleCarte(colors), flex: '1 1 320px', padding: '24px', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <button onClick={() => setSelected(null)} className={CLASSE_CLIQUABLE} aria-label="Fermer la fiche du joueur"
              style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', float: 'right', width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icone icone={X} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {avatar(selected.profiles || {}, 56, 24)}
              <div>
                <div style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '24px', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.01em', color: colors.text.primary }}>{selected.profiles?.prenom} {selected.profiles?.nom}</div>
                <div style={{ fontFamily: police.texte, color: colors.text.primary, fontSize: '14px', fontWeight: 600 }}>{selected.profiles?.poste}</div>
                <div style={{ ...texteFin, fontSize: '12px' }}>{selected.profiles?.club} · {selected.profiles?.region}</div>
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
                return <RadarMini data={d} color={couleurClub(colors)} grille={colors.border.strong} />
              })()}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Etiquette as="p" style={{ marginBottom: '8px' }}>Saison · {selected.nb_matchs} matchs</Etiquette>
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
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: craie }}>
                  <span style={texteFin}>{label}</span>
                  <span style={styleMontant(colors, 17)}>{Number(val).toFixed(1)}{suffix || ''}</span>
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
                  <Message ton="succes" style={{ marginBottom: '14px' }}>
                    <div style={{ fontWeight: 700 }}>{pctVerifiees}% des stats vérifiées</div>
                    <div style={{ ...texteFin, fontSize: '12px' }}>{nbVerifiees}/{statsSelected.length} matchs via feuille officielle ou Veo</div>
                  </Message>
                )}
                <Etiquette as="p" style={{ marginBottom: '8px' }}>5 derniers matchs</Etiquette>
                {statsSelected.slice(0, 5).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', padding: '8px 0', borderBottom: craie, fontFamily: police.texte, fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: colors.text.primary }}>
                      vs {m.adversaire}
                      {(m.source === 'feuille_match' || m.source === 'veo_csv') && <span title="Donnée vérifiée" style={{ display: 'inline-flex', color: colors.accent.success }}><Icone icone={BadgeCheck} taille={16} libelle="Donnée vérifiée" /></span>}
                    </span>
                    <span style={{ color: colors.text.secondary }}>{m.minutes} min · {pluriel(m.buts ?? 0, 'but')} · {m.passes_decisives ?? 0} passe{(m.passes_decisives ?? 0) > 1 ? 's' : ''} déc.{m.km_parcourus ? ` · ${m.km_parcourus} km` : ''}</span>
                  </div>
                ))}
              </div>
              )
            })()}

            {bilanResume && (
              <div style={{ marginBottom: '20px' }}>
                <Etiquette as="p" style={{ marginBottom: '10px' }}>Bilan médical · saison {saisonActuelle()}</Etiquette>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  {[
                    { label: 'Blessures', val: bilanResume.nb_blessures },
                    { label: 'Jours indispo.', val: bilanResume.jours_indisponibilite },
                    { label: 'Dont graves', val: bilanResume.nb_graves },
                  ].map(m => (
                    <div key={m.label} style={{ flex: 1, background: colors.background.sunken, border: craie, borderRadius: forme.rayonCarte, padding: '10px', textAlign: 'center' }}>
                      <div style={styleChiffreHeros(colors, 26)}>{m.val}</div>
                      <div style={{ ...styleEtiquette(colors), fontSize: '11px', marginTop: '4px' }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {bilanDetail ? (
                  <div style={{ background: colors.background.sunken, border: craie, borderRadius: forme.rayonCarte, padding: '12px' }}>
                    <Etiquette as="p" style={{ marginBottom: '8px' }}>Détail accepté par le joueur</Etiquette>
                    {bilanDetail.length === 0 ? (
                      <p style={texteFin}>Aucune blessure enregistrée.</p>
                    ) : bilanDetail.map((b, i) => (
                      <div key={i} style={{ fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary, padding: '6px 0', borderBottom: i < bilanDetail.length - 1 ? craie : 'none' }}>
                        <strong style={{ color: colors.text.primary }}>{b.type_blessure}</strong>{b.zone_corps ? ` · ${b.zone_corps}` : ''} · {new Date(b.date_debut).toLocaleDateString('fr-FR')}
                        {b.date_retour_effective && ` → ${new Date(b.date_retour_effective).toLocaleDateString('fr-FR')}`}
                      </div>
                    ))}
                  </div>
                ) : bilanDemande?.statut === 'acceptee' ? null : bilanDemande?.statut === 'en_attente' ? (
                  <Message ton="info">Demande de détail envoyée, en attente de réponse du joueur.</Message>
                ) : bilanDemande?.statut === 'refusee' ? (
                  <Message ton="info">Le joueur n'a pas souhaité partager plus de détails.</Message>
                ) : (
                  <div>
                    <textarea value={demandeMessage} onChange={e => setDemandeMessage(e.target.value)}
                      aria-label="Message pour le joueur"
                      className={CLASSE_CHAMP}
                      placeholder="Précise pourquoi tu souhaites en savoir plus (optionnel)"
                      rows={2}
                      style={{ ...champ, resize: 'vertical', marginBottom: '8px' }} />
                    <button disabled={envoiDemandeEnCours} onClick={() => envoyerDemandeBilan(selected.joueur_id)}
                      className={CLASSE_BOUTON_SECONDAIRE}
                      style={{ ...styleBoutonSecondaire(colors), width: '100%' }}>
                      {envoiDemandeEnCours ? 'Envoi...' : 'Demander le détail au joueur'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ ...styleCarte(colors), padding: '10px 14px 10px 17px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: colors.background.sunken, boxShadow: `inset ${forme.lisere} 0 0 ${couleurStatut(selected.statut_recrutement)}` }}>
              <span style={{ fontFamily: police.texte, color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>
                {libelleStatut(selected.statut_recrutement)}
              </span>
            </div>

            {selected.statut_recrutement !== 'Non disponible' && (
              <button onClick={() => setMessageModal(true)} className={CLASSE_BOUTON} style={{ ...styleBoutonPrincipal(colors), width: '100%' }}>
                <Icone icone={Mail} /> Contacter ce joueur
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fenêtre message */}
      {messageModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setMessageModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titre-contact-joueur" style={{ ...styleCarte(colors), padding: '24px', width: '460px', maxWidth: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 id="titre-contact-joueur" style={{ margin: '0 0 16px', fontFamily: police.titre, fontWeight: 700, fontSize: '22px', letterSpacing: '0.02em', textTransform: 'uppercase', color: colors.text.primary }}>Contacter {selected.profiles?.prenom}</h3>
            <textarea value={messageTexte} onChange={e => setMessageTexte(e.target.value)}
              aria-label="Ton message"
              className={CLASSE_CHAMP}
              placeholder="Bonjour, je suis éducateur/club à... et je suis intéressé par ton profil pour..."
              rows={5}
              style={{ ...champ, resize: 'vertical', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setMessageModal(false); setMessageTexte('') }}
                className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), flex: 1 }}>
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
                className={CLASSE_BOUTON} style={{ ...styleBoutonPrincipal(colors), flex: 2 }}>
                {envoiEnCours ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
