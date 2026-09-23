import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { calculerTDEE, calculerMacros, CONSEILS_JOURNEE, MULTIPLICATEUR_JOURNEE, RECETTES } from '../lib/nutrition'
import EducationNutrition from './EducationNutrition'

const REPAS_LABELS = {
  petit_dejeuner: 'Petit déjeuner',
  collation_matin: 'Collation matin',
  dejeuner: 'Déjeuner',
  collation_apres: 'Collation après-midi',
  diner: 'Dîner',
}

const POSTES = [
  { value: 'gardien', label: 'Gardien de but' },
  { value: 'defenseur', label: 'Défenseur' },
  { value: 'milieu', label: 'Milieu de terrain' },
  { value: 'attaquant', label: 'Attaquant' },
]

const OBJECTIFS = [
  { value: 'performance', label: 'Performance' },
  { value: 'prise_masse', label: 'Prise de masse' },
  { value: 'perte_poids', label: 'Perte de poids' },
  { value: 'endurance', label: 'Endurance' },
]

const TYPE_JOURNEE_OPTIONS = [
  { value: 'match', label: 'Jour de match' },
  { value: 'avant_match', label: 'Veille de match' },
  { value: 'apres_match', label: 'Lendemain de match' },
  { value: 'entrainement', label: 'Entraînement' },
  { value: 'repos', label: 'Repos' },
]

const PROGRAMME_SEMAINE = [
  { jour: 'Lundi', type: 'entrainement' },
  { jour: 'Mardi', type: 'repos' },
  { jour: 'Mercredi', type: 'entrainement' },
  { jour: 'Jeudi', type: 'avant_match' },
  { jour: 'Vendredi', type: 'match' },
  { jour: 'Samedi', type: 'apres_match' },
  { jour: 'Dimanche', type: 'repos' },
]

const PROFIL_VIDE = { poids_kg: '', taille_cm: '', age: '', sexe: 'homme', poste: 'milieu', nb_entrainements_semaine: 3, objectif: 'performance' }

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'
// Identifiants nutriments USDA FoodData Central (Energy / Protein / Carbohydrate / Total lipid).
const USDA_NUTRIENT_IDS = { calories: 1008, proteines: 1003, glucides: 1005, lipides: 1004 }

function RecetteCard({ recette, onAjouter }) {
  const colors = useColors()
  const [ouvert, setOuvert] = useState(false)
  const [imageEnErreur, setImageEnErreur] = useState(false)
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setOuvert(o => !o)}>
        <div>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{recette.nom}</div>
          <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>{recette.timing}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '16px' }}>{recette.calories}</div>
          <div style={{ color: colors.text.faint, fontSize: '10px' }}>kcal</div>
        </div>
      </div>

      {ouvert && (
        <div style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
          {recette.image && !imageEnErreur && (
            <div style={{ height: '160px', overflow: 'hidden', background: colors.background.raised, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={recette.image} alt={recette.nom} onError={() => setImageEnErreur(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {(!recette.image || imageEnErreur) && recette.emoji && (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: colors.background.raised }}>
              {recette.emoji}
            </div>
          )}

          <div style={{ padding: '14px 16px' }}>
            {(recette.difficulte || recette.temps) && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {recette.difficulte && <span style={{ color: colors.text.faint, fontSize: '12px' }}>{recette.difficulte}</span>}
                {recette.temps && <span style={{ color: colors.text.faint, fontSize: '12px' }}>{recette.temps}</span>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
              {[
                { label: 'Glucides', val: recette.glucides_g, color: colors.accent.amber },
                { label: 'Protéines', val: recette.proteines_g, color: colors.accent.green },
                { label: 'Lipides', val: recette.lipides_g, color: colors.accent.orange },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: m.color, fontWeight: 700, fontSize: '16px' }}>{m.val}g</div>
                  <div style={{ color: colors.text.faint, fontSize: '10px' }}>{m.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>INGRÉDIENTS</div>
              {recette.ingredients.map((ing, i) => <div key={i} style={{ color: colors.text.secondary, fontSize: '13px', marginBottom: '3px' }}>• {ing}</div>)}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>PRÉPARATION</div>
              <p style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{recette.preparation}</p>
            </div>

            {recette.pourquoi && (
              <div style={{ background: colors.accent.green + '0f', border: `1px solid ${colors.accent.green}33`, borderRadius: '8px', padding: '10px', marginBottom: '14px' }}>
                <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>POURQUOI CETTE RECETTE ?</div>
                <p style={{ color: colors.text.secondary, fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{recette.pourquoi}</p>
              </div>
            )}

            <button onClick={onAjouter} style={{ background: colors.accent.green + '1a', color: colors.accent.green, border: `1px solid ${colors.accent.green}`, borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              + Ajouter au journal du jour
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Module Nutrition, Dashboard Joueur (forfait Pro) : profil physique →
// besoins caloriques/macros calculés côté client (lib/nutrition.js), suivi
// de poids, journal alimentaire avec recherche d'aliments via l'API
// publique USDA FoodData Central (gratuite, DEMO_KEY suffisant en dev —
// VITE_USDA_API_KEY recommandée en prod pour un quota plus large).
export default function NutritionDashboard({ joueurId, educateurId }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('plan')
  const [profil, setProfil] = useState(null)
  const [profilForm, setProfilForm] = useState(PROFIL_VIDE)
  const [typeJournee, setTypeJournee] = useState('entrainement')
  const [typeJourneeAuto, setTypeJourneeAuto] = useState(null)
  const [journal, setJournal] = useState([])
  const [journalSemaine, setJournalSemaine] = useState([])
  const [poidsHisto, setPoidsHisto] = useState([])
  const [recherche, setRecherche] = useState('')
  const [resultatsUSDA, setResultatsUSDA] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [nouveauPoids, setNouveauPoids] = useState('')
  const [repasActif, setRepasActif] = useState('dejeuner')
  const [educationSousSection, setEducationSousSection] = useState('macros')
  const [loading, setLoading] = useState(true)

  const chargerJournalSemaine = async () => {
    const il7j = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const { data } = await supabase.from('nutrition_journal').select('*').eq('joueur_id', joueurId).gte('date', il7j).order('date')
    setJournalSemaine(data || [])
  }

  // Détection automatique du type de journée à partir du calendrier réel de
  // l'éducateur affilié (entrainements/matchs_equipe, filtrés par
  // educateur_id — comme partout ailleurs dans DashboardJoueur.jsx, pas de
  // notion de "type" sur entrainements : les deux tables sont déjà
  // distinctes, la table elle-même indique le type). Ne s'applique qu'une
  // fois au chargement — un changement manuel ensuite n'est jamais écrasé.
  const detecterTypeJourneeAuto = async () => {
    if (!educateurId) return
    const today = new Date().toISOString().slice(0, 10)
    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const [{ data: matchsProches }, { data: entrainementsAuj }] = await Promise.all([
      supabase.from('matchs_equipe').select('date').eq('educateur_id', educateurId).in('date', [hier, today, demain]),
      supabase.from('entrainements').select('id').eq('educateur_id', educateurId).eq('date', today),
    ])
    let type
    if (matchsProches?.some(m => m.date === today)) type = 'match'
    else if (entrainementsAuj?.length > 0) type = 'entrainement'
    else if (matchsProches?.some(m => m.date === demain)) type = 'avant_match'
    else if (matchsProches?.some(m => m.date === hier)) type = 'apres_match'
    else type = 'repos'
    setTypeJourneeAuto(type)
    setTypeJournee(type)
  }

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: j }, { data: pds }] = await Promise.all([
        supabase.from('nutrition_profil').select('*').eq('joueur_id', joueurId).maybeSingle(),
        supabase.from('nutrition_journal').select('*').eq('joueur_id', joueurId).eq('date', new Date().toISOString().slice(0, 10)).order('created_at'),
        supabase.from('nutrition_poids').select('*').eq('joueur_id', joueurId).order('date', { ascending: false }).limit(30),
      ])
      if (p) { setProfil(p); setProfilForm(p); setOnglet('plan') } else { setOnglet('profil') }
      setJournal(j || [])
      setPoidsHisto(pds || [])
      setLoading(false)
      await chargerJournalSemaine()
      await detecterTypeJourneeAuto()
    })()
  }, [joueurId]) // eslint-disable-line react-hooks/exhaustive-deps

  const ajouterRecetteJournal = async (recette) => {
    const { error } = await supabase.from('nutrition_journal').insert({
      joueur_id: joueurId,
      date: new Date().toISOString().slice(0, 10),
      repas: repasActif,
      aliment_nom: recette.nom,
      quantite_g: null,
      calories: recette.calories,
      proteines_g: recette.proteines_g,
      glucides_g: recette.glucides_g,
      lipides_g: recette.lipides_g,
    })
    if (error) { console.error('ajouterRecetteJournal error:', error); alert('Erreur : ' + error.message); return }
    chargerJournal()
  }

  const chargerJournal = async () => {
    const { data } = await supabase.from('nutrition_journal').select('*').eq('joueur_id', joueurId).eq('date', new Date().toISOString().slice(0, 10)).order('created_at')
    setJournal(data || [])
  }

  const chargerPoids = async () => {
    const { data } = await supabase.from('nutrition_poids').select('*').eq('joueur_id', joueurId).order('date', { ascending: false }).limit(30)
    setPoidsHisto(data || [])
  }

  const sauvegarderProfil = async () => {
    if (!profilForm.poids_kg || !profilForm.taille_cm || !profilForm.age) return
    const { data, error } = await supabase.from('nutrition_profil').upsert({
      joueur_id: joueurId,
      ...profilForm,
      poids_kg: parseFloat(profilForm.poids_kg),
      taille_cm: parseInt(profilForm.taille_cm, 10),
      age: parseInt(profilForm.age, 10),
      nb_entrainements_semaine: parseInt(profilForm.nb_entrainements_semaine, 10),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'joueur_id' }).select().single()
    if (error) { console.error('sauvegarderProfil error:', error); alert('Erreur : ' + error.message); return }
    setProfil(data)
    setOnglet('plan')
  }

  const enregistrerPoids = async () => {
    if (!nouveauPoids) return
    const { error } = await supabase.from('nutrition_poids').upsert({
      joueur_id: joueurId, poids_kg: parseFloat(nouveauPoids), date: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'joueur_id,date' })
    if (error) { console.error('enregistrerPoids error:', error); alert('Erreur : ' + error.message); return }
    setNouveauPoids('')
    chargerPoids()
  }

  const rechercherAliment = async (query) => {
    if (!query || query.length < 2) { setResultatsUSDA([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${USDA_API_KEY}`)
      const data = await res.json()
      setResultatsUSDA(data.foods || [])
    } catch (e) {
      console.error('recherche USDA error:', e)
      setResultatsUSDA([])
    }
    setSearchLoading(false)
  }

  const ajouterAlimentJournal = async (food, quantite_g) => {
    const getNutrient = (id) => {
      const n = food.foodNutrients?.find(fn => fn.nutrientId === id)
      return n ? Math.round((n.value * quantite_g / 100) * 10) / 10 : 0
    }
    const { error } = await supabase.from('nutrition_journal').insert({
      joueur_id: joueurId,
      date: new Date().toISOString().slice(0, 10),
      repas: repasActif,
      aliment_nom: food.description,
      quantite_g,
      calories: getNutrient(USDA_NUTRIENT_IDS.calories),
      proteines_g: getNutrient(USDA_NUTRIENT_IDS.proteines),
      glucides_g: getNutrient(USDA_NUTRIENT_IDS.glucides),
      lipides_g: getNutrient(USDA_NUTRIENT_IDS.lipides),
    })
    if (error) { console.error('ajouterAlimentJournal error:', error); alert('Erreur : ' + error.message); return }
    setRecherche('')
    setResultatsUSDA([])
    chargerJournal()
  }

  const s = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    label: { color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block', fontWeight: 700 },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
    pillTab: (actif) => ({ background: actif ? colors.text.primary : colors.background.raised, color: actif ? colors.background.base : colors.text.faint, border: `1px solid ${actif ? colors.text.primary : colors.border.default}`, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }),
  }

  if (loading) return <div style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Chargement…</div>

  // ── Onglet Profil ────────────────────────────────────────────────────
  if (onglet === 'profil' || !profil) {
    return (
      <div>
        {profil && <button onClick={() => setOnglet('plan')} style={{ ...s.btnGhost, marginBottom: '16px' }}>← Mon plan</button>}
        <div style={s.card}>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>
            {profil ? 'MODIFIER MON PROFIL' : 'CRÉER MON PROFIL NUTRITIONNEL'}
          </div>
          {!profil && <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '16px' }}>Renseigne tes informations pour obtenir ton programme nutrition personnalisé.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={s.label}>Poids (kg)</label>
              <input type="number" style={s.input} placeholder="ex : 72" value={profilForm.poids_kg} onChange={e => setProfilForm(p => ({ ...p, poids_kg: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Taille (cm)</label>
              <input type="number" style={s.input} placeholder="ex : 178" value={profilForm.taille_cm} onChange={e => setProfilForm(p => ({ ...p, taille_cm: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Âge</label>
              <input type="number" style={s.input} placeholder="ex : 19" value={profilForm.age} onChange={e => setProfilForm(p => ({ ...p, age: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Sexe</label>
              <select style={s.input} value={profilForm.sexe} onChange={e => setProfilForm(p => ({ ...p, sexe: e.target.value }))}>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Poste</label>
              <select style={s.input} value={profilForm.poste} onChange={e => setProfilForm(p => ({ ...p, poste: e.target.value }))}>
                {POSTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Entraînements / semaine</label>
              <select style={s.input} value={profilForm.nb_entrainements_semaine} onChange={e => setProfilForm(p => ({ ...p, nb_entrainements_semaine: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}x / semaine</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <label style={s.label}>Objectif</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {OBJECTIFS.map(o => (
                <button key={o.value} onClick={() => setProfilForm(p => ({ ...p, objectif: o.value }))} style={s.pillTab(profilForm.objectif === o.value)}>{o.label}</button>
              ))}
            </div>
          </div>
          <button style={{ ...s.btn, marginTop: '20px', width: '100%' }} onClick={sauvegarderProfil}>Calculer mon programme</button>
        </div>
      </div>
    )
  }

  const tdee = calculerTDEE(profil)
  const macros = calculerMacros(tdee, typeJournee)
  const conseil = CONSEILS_JOURNEE[typeJournee]

  const totauxJour = journal.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    proteines_g: acc.proteines_g + (item.proteines_g || 0),
    glucides_g: acc.glucides_g + (item.glucides_g || 0),
    lipides_g: acc.lipides_g + (item.lipides_g || 0),
  }), { calories: 0, proteines_g: 0, glucides_g: 0, lipides_g: 0 })

  // ── Onglet Plan ──────────────────────────────────────────────────────
  const renderPlan = () => (
    <div>
      {typeJourneeAuto && (
        <div style={{ background: colors.accent.green + '14', border: `1px solid ${colors.accent.green}33`, borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
          <span style={{ color: colors.accent.green, fontWeight: 700 }}>Détection auto</span>
          <span style={{ color: colors.text.secondary, marginLeft: '8px' }}>
            {typeJourneeAuto === 'match' ? 'Match détecté aujourd\'hui — programme match activé'
              : typeJourneeAuto === 'entrainement' ? 'Entraînement détecté aujourd\'hui — programme entraînement activé'
              : typeJourneeAuto === 'avant_match' ? 'Match demain — charge glucides recommandée'
              : typeJourneeAuto === 'apres_match' ? 'Match hier — programme récupération activé'
              : 'Pas de séance détectée — programme repos'}
          </span>
          <span style={{ color: colors.text.faint, marginLeft: '8px' }}>(modifiable ci-dessous)</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {TYPE_JOURNEE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => setTypeJournee(t.value)} style={s.pillTab(typeJournee === t.value)}>{t.label}</button>
        ))}
      </div>

      <div style={{ ...s.card, borderLeft: `3px solid ${conseil.couleur}` }}>
        <div style={{ color: conseil.couleur, fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>{conseil.titre}</div>
        {conseil.conseils.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <span style={{ color: conseil.couleur, flexShrink: 0 }}>›</span>
            <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{c}</span>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>TES BESOINS DU JOUR</div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', fontWeight: 900, color: colors.accent.green, lineHeight: 1 }}>{tdee}</div>
          <div style={{ color: colors.text.faint, fontSize: '13px', marginTop: '4px' }}>calories</div>
        </div>
        {[
          { label: 'Glucides', key: 'glucides_g', color: colors.accent.amber, pct: macros.glucides_pct },
          { label: 'Protéines', key: 'proteines_g', color: colors.accent.green, pct: macros.proteines_pct },
          { label: 'Lipides', key: 'lipides_g', color: colors.accent.orange, pct: macros.lipides_pct },
        ].map(m => (
          <div key={m.key} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{m.label}</span>
              <span style={{ color: m.color, fontWeight: 700, fontSize: '13px' }}>{macros[m.key]}g <span style={{ color: colors.text.faint, fontWeight: 400 }}>({m.pct}%)</span></span>
            </div>
            <div style={{ background: colors.background.raised, borderRadius: '4px', height: '8px' }}>
              <div style={{ background: m.color, width: `${m.pct}%`, height: '8px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>PROGRAMME SEMAINE TYPE</div>
        {PROGRAMME_SEMAINE.map(({ jour, type }) => {
          const cal = Math.round(calculerTDEE(profil) * MULTIPLICATEUR_JOURNEE[type])
          const c = CONSEILS_JOURNEE[type].couleur
          return (
            <div key={jour} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
              <span style={{ color: colors.text.secondary, fontSize: '13px', width: '80px' }}>{jour}</span>
              <span style={{ color: c, fontSize: '12px', fontWeight: 600 }}>{CONSEILS_JOURNEE[type].titre.split(' — ')[0]}</span>
              <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{cal} kcal</span>
            </div>
          )
        })}
      </div>

      <button style={{ ...s.btnGhost, width: '100%', textAlign: 'center' }} onClick={() => setOnglet('profil')}>Modifier mon profil</button>
    </div>
  )

  // ── Onglet Journal ───────────────────────────────────────────────────
  const renderJournal = () => {
    const groupes = Object.keys(REPAS_LABELS).reduce((acc, repas) => { acc[repas] = journal.filter(j => j.repas === repas); return acc }, {})
    return (
      <div>
        <div style={s.card}>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '12px', marginBottom: '10px' }}>RÉSUMÉ AUJOURD'HUI</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            {[
              { label: 'Calories', val: Math.round(totauxJour.calories), target: tdee, unit: 'kcal', color: colors.accent.green },
              { label: 'Glucides', val: Math.round(totauxJour.glucides_g), target: macros.glucides_g, unit: 'g', color: colors.accent.amber },
              { label: 'Protéines', val: Math.round(totauxJour.proteines_g), target: macros.proteines_g, unit: 'g', color: colors.accent.blue },
              { label: 'Lipides', val: Math.round(totauxJour.lipides_g), target: macros.lipides_g, unit: 'g', color: colors.accent.orange },
            ].map(item => (
              <div key={item.label}>
                <div style={{ color: item.color, fontWeight: 800, fontSize: '18px' }}>{item.val}</div>
                <div style={{ color: colors.text.faint, fontSize: '10px' }}>/ {item.target} {item.unit}</div>
                <div style={{ color: colors.text.faint, fontSize: '10px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={{ marginBottom: '10px' }}>
            <label style={s.label}>Ajouter à quel repas</label>
            <select style={s.input} value={repasActif} onChange={e => setRepasActif(e.target.value)}>
              {Object.entries(REPAS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <input style={s.input} placeholder="Rechercher un aliment... (ex : poulet, pâtes, banane)" value={recherche}
              onChange={e => { setRecherche(e.target.value); rechercherAliment(e.target.value) }} />
            {searchLoading && <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '6px' }}>Recherche…</div>}
            {resultatsUSDA.length > 0 && (
              <div style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {resultatsUSDA.map(food => (
                  <div key={food.fdcId} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${colors.border.subtle}`, fontSize: '13px', color: colors.text.secondary }}
                    onClick={() => {
                      const quantite = parseInt(window.prompt(`Quantité en grammes pour "${food.description}" ?`, '100') || '', 10)
                      if (quantite > 0) ajouterAlimentJournal(food, quantite)
                    }}>
                    {food.description}
                    <span style={{ color: colors.text.faint, fontSize: '11px', marginLeft: '8px' }}>{food.brandOwner || food.foodCategory || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {Object.entries(groupes).map(([repas, items]) => items.length > 0 && (
          <div key={repas} style={s.card}>
            <div style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '12px', marginBottom: '10px' }}>{REPAS_LABELS[repas]}</div>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <div>
                  <div style={{ color: colors.text.primary, fontSize: '13px' }}>{item.aliment_nom}</div>
                  <div style={{ color: colors.text.faint, fontSize: '11px' }}>{item.quantite_g}g</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>{Math.round(item.calories)} kcal</div>
                  <div style={{ color: colors.text.faint, fontSize: '11px' }}>G:{Math.round(item.glucides_g)}g P:{Math.round(item.proteines_g)}g L:{Math.round(item.lipides_g)}g</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Onglet Poids ─────────────────────────────────────────────────────
  const renderPoids = () => (
    <div>
      <div style={s.card}>
        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>ENREGISTRER MON POIDS</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" step="0.1" style={{ ...s.input, flex: 1 }}
            placeholder={`Poids aujourd'hui (kg) — dernier : ${poidsHisto[0]?.poids_kg || profil?.poids_kg || '?'}kg`}
            value={nouveauPoids} onChange={e => setNouveauPoids(e.target.value)} />
          <button style={s.btn} onClick={enregistrerPoids}>Enregistrer</button>
        </div>
      </div>

      {poidsHisto.length > 0 && (
        <div style={s.card}>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>ÉVOLUTION (30 derniers jours)</div>
          {(() => {
            const pts = [...poidsHisto].reverse()
            const vals = pts.map(p => p.poids_kg)
            const min = Math.min(...vals) - 0.5
            const max = Math.max(...vals) + 0.5
            const W = 100, H = 60
            const toX = i => pts.length > 1 ? (i / (pts.length - 1)) * W : W / 2
            const toY = v => max > min ? H - ((v - min) / (max - min)) * H : H / 2
            return (
              <svg viewBox="0 0 100 60" style={{ width: '100%', height: '120px' }}>
                <polyline points={pts.map((p, i) => `${toX(i)},${toY(p.poids_kg)}`).join(' ')} fill="none" stroke={colors.accent.green} strokeWidth="1.5" />
                {pts.map((p, i) => <circle key={i} cx={toX(i)} cy={toY(p.poids_kg)} r="2" fill={colors.accent.green} />)}
              </svg>
            )
          })()}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: colors.text.faint, fontSize: '12px' }}>Début : {poidsHisto[poidsHisto.length - 1]?.poids_kg}kg</span>
            <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>Actuel : {poidsHisto[0]?.poids_kg}kg</span>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>HISTORIQUE</div>
        {poidsHisto.slice(0, 10).map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
            <span style={{ color: colors.text.faint, fontSize: '13px' }}>{new Date(`${p.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span style={{ color: colors.text.primary, fontWeight: 600, fontSize: '13px' }}>{p.poids_kg} kg</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Onglet Recettes ──────────────────────────────────────────────────
  const renderRecettes = () => {
    const recettesJour = RECETTES[typeJournee] || RECETTES.entrainement
    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {TYPE_JOURNEE_OPTIONS.map(t => (
            <button key={t.value} onClick={() => setTypeJournee(t.value)} style={s.pillTab(typeJournee === t.value)}>{t.label}</button>
          ))}
        </div>
        <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '16px' }}>
          {recettesJour.length} recette{recettesJour.length > 1 ? 's' : ''} recommandée{recettesJour.length > 1 ? 's' : ''} pour ce type de journée
        </div>
        {recettesJour.map((recette, i) => <RecetteCard key={i} recette={recette} onAjouter={() => ajouterRecetteJournal(recette)} />)}
      </div>
    )
  }

  // ── Onglet Éducation (macros / comparateur / hydratation) ──────────────
  const renderEducation = () => (
    <EducationNutrition sousSection={educationSousSection} setSousSection={setEducationSousSection} profil={profil} />
  )

  // ── Onglet Rapport (moyennes 7 derniers jours) ──────────────────────────
  const renderRapport = () => {
    const parJour = journalSemaine.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = { calories: 0, proteines_g: 0, glucides_g: 0, lipides_g: 0 }
      acc[item.date].calories += item.calories || 0
      acc[item.date].proteines_g += item.proteines_g || 0
      acc[item.date].glucides_g += item.glucides_g || 0
      acc[item.date].lipides_g += item.lipides_g || 0
      return acc
    }, {})
    const jours = Object.entries(parJour)
    const nbJours = jours.length

    if (nbJours === 0) {
      return (
        <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
          Commence à remplir ton journal alimentaire pour voir ton rapport hebdomadaire ici.
        </div>
      )
    }

    const moyCalories = Math.round(jours.reduce((a, [, j]) => a + j.calories, 0) / nbJours)
    const moyProteines = Math.round(jours.reduce((a, [, j]) => a + j.proteines_g, 0) / nbJours)
    const moyGlucides = Math.round(jours.reduce((a, [, j]) => a + j.glucides_g, 0) / nbJours)
    const moyLipides = Math.round(jours.reduce((a, [, j]) => a + j.lipides_g, 0) / nbJours)
    const diffCalories = tdee ? moyCalories - tdee : null
    const maxCal = Math.max(...jours.map(([, j]) => j.calories), tdee || 0)
    const aujourdHui = new Date().toISOString().slice(0, 10)

    return (
      <div>
        <div style={s.card}>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>MOYENNES SUR {nbJours} JOUR{nbJours > 1 ? 'S' : ''}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ background: colors.accent.green + '14', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
              <div style={{ color: colors.accent.green, fontWeight: 900, fontSize: '28px' }}>{moyCalories}</div>
              <div style={{ color: colors.text.faint, fontSize: '11px' }}>kcal / jour</div>
              {diffCalories !== null && (
                <div style={{ color: diffCalories > 0 ? colors.accent.orange : colors.accent.blue, fontSize: '11px', marginTop: '4px' }}>
                  {diffCalories > 0 ? '+' : ''}{diffCalories} vs objectif
                </div>
              )}
            </div>
            {[
              { label: 'Glucides moy.', val: `${moyGlucides}g`, color: colors.accent.amber, target: macros?.glucides_g },
              { label: 'Protéines moy.', val: `${moyProteines}g`, color: colors.accent.green, target: macros?.proteines_g },
              { label: 'Lipides moy.', val: `${moyLipides}g`, color: colors.accent.orange, target: macros?.lipides_g },
            ].map(m => (
              <div key={m.label} style={{ background: colors.background.raised, borderRadius: '8px', padding: '12px', border: `1px solid ${colors.border.subtle}` }}>
                <div style={{ color: m.color, fontWeight: 700, fontSize: '18px' }}>{m.val}</div>
                <div style={{ color: colors.text.faint, fontSize: '10px' }}>{m.label}</div>
                {m.target && <div style={{ color: colors.text.disabled, fontSize: '10px' }}>objectif : {m.target}g</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>CALORIES PAR JOUR</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
            {jours.map(([date, j]) => {
              const h = maxCal > 0 ? Math.round((j.calories / maxCal) * 80) : 0
              const estAujourdHui = date === aujourdHui
              const depasseObjectif = tdee && j.calories > tdee
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '10px', color: depasseObjectif ? colors.accent.orange : colors.accent.green, fontWeight: 600 }}>{Math.round(j.calories)}</div>
                  <div style={{ width: '100%', height: `${h}px`, borderRadius: '4px', background: estAujourdHui ? colors.accent.green : (depasseObjectif ? colors.accent.orange : colors.accent.blue), opacity: estAujourdHui ? 1 : 0.7 }} />
                  <div style={{ fontSize: '9px', color: colors.text.faint }}>{new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                </div>
              )
            })}
          </div>
          {tdee && <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '8px' }}>Objectif : {tdee} kcal/jour</div>}
        </div>

        <div style={s.card}>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>DÉTAIL PAR JOUR</div>
          {jours.map(([date, j]) => (
            <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
              <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: colors.text.faint, fontSize: '11px' }}>G:{Math.round(j.glucides_g)}g P:{Math.round(j.proteines_g)}g L:{Math.round(j.lipides_g)}g</span>
                <span style={{ color: tdee && j.calories > tdee * 1.1 ? colors.accent.orange : colors.accent.green, fontWeight: 700, fontSize: '14px' }}>{Math.round(j.calories)} kcal</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const ONGLETS = [
    { id: 'plan', label: 'Mon plan' },
    { id: 'journal', label: 'Journal' },
    { id: 'recettes', label: 'Recettes' },
    { id: 'education', label: 'Éducation' },
    { id: 'rapport', label: 'Rapport' },
    { id: 'poids', label: 'Poids' },
    { id: 'profil', label: 'Profil' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {ONGLETS.map(o => <button key={o.id} onClick={() => setOnglet(o.id)} style={s.pillTab(onglet === o.id)}>{o.label}</button>)}
      </div>
      {onglet === 'plan' && renderPlan()}
      {onglet === 'journal' && renderJournal()}
      {onglet === 'recettes' && renderRecettes()}
      {onglet === 'education' && renderEducation()}
      {onglet === 'rapport' && renderRapport()}
      {onglet === 'poids' && renderPoids()}
    </div>
  )
}
