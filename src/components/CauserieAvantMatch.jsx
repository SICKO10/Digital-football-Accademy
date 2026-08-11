import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import TacticalBoard from './TacticalBoard'

const METEO_OPTIONS = [
  { val: 'soleil', icon: '☀️', label: 'Soleil' },
  { val: 'nuageux', icon: '⛅', label: 'Nuageux' },
  { val: 'pluie', icon: '🌧️', label: 'Pluie' },
  { val: 'vent', icon: '💨', label: 'Vent' },
  { val: 'froid', icon: '🥶', label: 'Froid' },
  { val: 'chaud', icon: '🥵', label: 'Chaud' },
]

const TYPE_MATCH = [
  { val: 'championnat', label: 'Championnat' },
  { val: 'coupe', label: 'Coupe' },
  { val: 'amical', label: 'Amical' },
  { val: 'tournoi', label: 'Tournoi' },
]

const formVide = () => ({
  adversaire: '', date_match: '', heure_match: '', domicile_exterieur: 'domicile',
  type_match: 'championnat', objectifs: '', match_aller_resultat: '',
  notre_classement: '', notre_points: '', notre_buts_pour: '', notre_buts_contre: '',
  adversaire_classement: '', adversaire_points: '', adversaire_buts_pour: '', adversaire_buts_contre: '',
  meteo: 'soleil', temperature: '',
  animation_avec_ballon: [''],
  animation_sans_ballon: [''],
  cpa_offensifs: [''],
  cpa_defensifs: [''],
  tireurs: [''],
  schema_cpa_offensif: { etapes: [{ joueurs: [], ballon: null }] },
  schema_cpa_defensif: { etapes: [{ joueurs: [], ballon: null }] },
})

// Liste de points éditable (animation avec/sans ballon, CPA, tireurs) — au
// niveau module plutôt que défini dans le rendu du composant parent : un
// composant recréé à chaque rendu perd son identité pour React (remonté au
// lieu de mis à jour), ce qui fait perdre le focus de l'input en cours de
// frappe à chaque frappe.
function ListeChamp({ valeurs, onChange, onAjouter, onSupprimer, placeholder, inputStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {valeurs.map((val, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '14px', minWidth: '16px' }}>•</span>
          <input style={{ ...inputStyle, flex: 1 }} placeholder={placeholder} value={val} onChange={e => onChange(i, e.target.value)} />
          {valeurs.length > 1 && (
            <button onClick={() => onSupprimer(i)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          )}
        </div>
      ))}
      <button onClick={onAjouter} style={{ background: 'none', border: '1px dashed #222', borderRadius: '8px', color: '#6b7280', fontSize: '12px', padding: '6px', cursor: 'pointer', marginTop: '2px', fontFamily: 'Inter, sans-serif' }}>
        + Ajouter
      </button>
    </div>
  )
}

// Un board TacticalBoard (format multi-étapes) est "rempli" dès qu'une de
// ses étapes contient au moins un joueur ou le ballon.
function boardEstRempli(board) {
  return (board?.etapes || []).some(e => (e.joueurs || []).length > 0 || e.ballon)
}

// Portail vers document.body (même mécanisme que FicheSeancePrint plus haut
// dans DashboardEducateur.jsx) : #fiche-print est déjà utilisé et stylé pour
// l'impression des fiches de séance (index.css, fond blanc/texte noir,
// incompatible avec le rendu sombre voulu ici) — id dédié pour ne jamais
// entrer en collision, avec sa propre règle @media print scoped au composant.
function FicheCauseriePrint({ children }) {
  return createPortal(<div id="fiche-causerie-print">{children}</div>, document.body)
}

export default function CauserieAvantMatch({ userId, equipeNom }) {
  const [vue, setVue] = useState('liste') // 'liste' | 'form' | 'fiche'
  const [fiches, setFiches] = useState([])
  const [ficheCourante, setFicheCourante] = useState(null)
  const [tableMissing, setTableMissing] = useState(false)

  const [form, setForm] = useState(formVide)
  const [saving, setSaving] = useState(false)

  const charger = async () => {
    const { data, error } = await supabase
      .from('causeries')
      .select('*')
      .eq('educateur_id', userId)
      .order('date_match', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      return
    }
    setTableMissing(false)
    setFiches(data || [])
  }

  useEffect(() => { if (userId) charger() }, [userId])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Gestion des listes dynamiques (animation, CPA, tireurs)
  const setLigne = (champ, i, val) => {
    setForm(p => {
      const arr = [...p[champ]]
      arr[i] = val
      return { ...p, [champ]: arr }
    })
  }
  const ajouterLigne = (champ) => setForm(p => ({ ...p, [champ]: [...p[champ], ''] }))
  const supprimerLigne = (champ, i) => setForm(p => {
    const arr = p[champ].filter((_, idx) => idx !== i)
    return { ...p, [champ]: arr.length ? arr : [''] }
  })

  const sauvegarder = async () => {
    if (!form.adversaire.trim()) { alert("Renseigne le nom de l'adversaire.") ; return }
    setSaving(true)
    const numOuNull = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10))
    const payload = {
      educateur_id: userId,
      equipe: equipeNom || null,
      adversaire: form.adversaire.trim(),
      date_match: form.date_match || null,
      heure_match: form.heure_match || null,
      domicile_exterieur: form.domicile_exterieur,
      type_match: form.type_match,
      objectifs: form.objectifs || null,
      match_aller_resultat: form.match_aller_resultat || null,
      notre_classement: numOuNull(form.notre_classement),
      notre_points: numOuNull(form.notre_points),
      notre_buts_pour: numOuNull(form.notre_buts_pour),
      notre_buts_contre: numOuNull(form.notre_buts_contre),
      adversaire_classement: numOuNull(form.adversaire_classement),
      adversaire_points: numOuNull(form.adversaire_points),
      adversaire_buts_pour: numOuNull(form.adversaire_buts_pour),
      adversaire_buts_contre: numOuNull(form.adversaire_buts_contre),
      meteo: form.meteo,
      temperature: numOuNull(form.temperature),
      animation_avec_ballon: form.animation_avec_ballon.filter(Boolean),
      animation_sans_ballon: form.animation_sans_ballon.filter(Boolean),
      cpa_offensifs: form.cpa_offensifs.filter(Boolean),
      cpa_defensifs: form.cpa_defensifs.filter(Boolean),
      tireurs: form.tireurs.filter(Boolean),
      schema_cpa_offensif: form.schema_cpa_offensif || { etapes: [{ joueurs: [], ballon: null }] },
      schema_cpa_defensif: form.schema_cpa_defensif || { etapes: [{ joueurs: [], ballon: null }] },
    }
    const res = ficheCourante?.id
      ? await supabase.from('causeries').update(payload).eq('id', ficheCourante.id).select().single()
      : await supabase.from('causeries').insert(payload).select().single()
    setSaving(false)
    if (res.error) { alert('Erreur : ' + res.error.message); return }
    setFicheCourante(res.data)
    await charger()
    setVue('fiche')
  }

  const ouvrirFiche = (f) => {
    setFicheCourante(f)
    setVue('fiche')
  }

  const editer = (f) => {
    setFicheCourante(f)
    setForm({
      adversaire: f.adversaire || '',
      date_match: f.date_match || '',
      heure_match: f.heure_match ? f.heure_match.slice(0, 5) : '',
      domicile_exterieur: f.domicile_exterieur || 'domicile',
      type_match: f.type_match || 'championnat',
      objectifs: f.objectifs || '',
      match_aller_resultat: f.match_aller_resultat || '',
      notre_classement: f.notre_classement ?? '',
      notre_points: f.notre_points ?? '',
      notre_buts_pour: f.notre_buts_pour ?? '',
      notre_buts_contre: f.notre_buts_contre ?? '',
      adversaire_classement: f.adversaire_classement ?? '',
      adversaire_points: f.adversaire_points ?? '',
      adversaire_buts_pour: f.adversaire_buts_pour ?? '',
      adversaire_buts_contre: f.adversaire_buts_contre ?? '',
      meteo: f.meteo || 'soleil',
      temperature: f.temperature ?? '',
      animation_avec_ballon: f.animation_avec_ballon?.length ? f.animation_avec_ballon : [''],
      animation_sans_ballon: f.animation_sans_ballon?.length ? f.animation_sans_ballon : [''],
      cpa_offensifs: f.cpa_offensifs?.length ? f.cpa_offensifs : [''],
      cpa_defensifs: f.cpa_defensifs?.length ? f.cpa_defensifs : [''],
      tireurs: f.tireurs?.length ? f.tireurs : [''],
      schema_cpa_offensif: f.schema_cpa_offensif || { etapes: [{ joueurs: [], ballon: null }] },
      schema_cpa_defensif: f.schema_cpa_defensif || { etapes: [{ joueurs: [], ballon: null }] },
    })
    setVue('form')
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette fiche ?')) return
    await supabase.from('causeries').delete().eq('id', id)
    await charger()
    setVue('liste')
  }

  // ─── Styles ────────────────────────────────────────────────────────────
  const card = { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' }
  const label = { display: 'block', color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }
  const inp = { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', padding: '9px 12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const txa = { ...inp, minHeight: '75px', resize: 'vertical', lineHeight: 1.6 }
  const btnG = { background: '#4ade80', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, fontSize: '14px', padding: '10px 22px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const btnO = { background: 'none', border: '1px solid #222', borderRadius: '10px', color: '#9ca3af', fontSize: '13px', padding: '9px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const numInp = { ...inp, width: '70px' }
  const sectionTitle = (num, color, txt) => (
    <p style={{ margin: '0 0 14px', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#fff', borderLeft: `3px solid ${color}`, paddingLeft: '10px' }}>
      <span style={{ color, marginRight: '6px' }}>{num}</span>{txt}
    </p>
  )

  if (tableMissing) {
    return (
      <div style={{ background: '#1a1a00', border: '1px solid #f59e0b40', borderRadius: '12px', padding: 24 }}>
        <div style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ La table <code>causeries</code> n'existe pas encore en base (ou vient d'être recréée avec un nouveau format).</div>
        <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>Exécute supabase_causeries.sql dans l'éditeur SQL Supabase.</div>
      </div>
    )
  }

  // ─── VUE LISTE ─────────────────────────────────────────────────────────
  if (vue === 'liste') return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 800 }}>Causerie avant match</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>Fiches de préparation visuelles à afficher dans le vestiaire</p>
        </div>
        <button onClick={() => { setForm(formVide()); setFicheCourante(null); setVue('form') }} style={btnG}>+ Nouvelle fiche</button>
      </div>

      {fiches.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📋</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Aucune fiche pour l'instant.<br />Crée ta première préparation de match.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {fiches.map(f => {
            const meteoIco = METEO_OPTIONS.find(m => m.val === f.meteo)?.icon || ''
            const typeLabel = TYPE_MATCH.find(t => t.val === f.type_match)?.label || ''
            return (
              <div key={f.id} onClick={() => ouvrirFiche(f)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '44px', height: '44px', background: '#0a0a0a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚽</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                    {f.domicile_exterieur === 'domicile' ? '🏠' : '✈️'} vs {f.adversaire}
                  </p>
                  <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '12px' }}>
                    {f.date_match ? new Date(f.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }) : '—'}
                    {' · '}{typeLabel}
                    {f.temperature != null ? ` · ${meteoIco} ${f.temperature}°C` : f.meteo ? ` · ${meteoIco}` : ''}
                  </p>
                </div>
                {f.notre_classement && f.adversaire_classement && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: '#4ade80', fontWeight: 800, fontSize: '18px' }}>
                      {f.notre_classement}<span style={{ color: '#374151', fontSize: '12px' }}> vs </span>{f.adversaire_classement}
                    </p>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '10px' }}>Classement</p>
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); editer(f) }} style={{ ...btnO, fontSize: '12px', padding: '6px 12px' }}>Modifier</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── VUE FORMULAIRE ────────────────────────────────────────────────────
  if (vue === 'form') return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setVue('liste')} style={btnO}>← Retour</button>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 800 }}>{ficheCourante ? 'Modifier la fiche' : 'Nouvelle fiche de match'}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div style={card}>
          {sectionTitle('01', '#4ade80', 'Contexte du match')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={label}>Adversaire *</label>
              <input style={inp} placeholder="AS Monaco U17…" value={form.adversaire} onChange={e => set('adversaire', e.target.value)} />
            </div>
            <div>
              <label style={label}>Type de match</label>
              <select style={inp} value={form.type_match} onChange={e => set('type_match', e.target.value)}>
                {TYPE_MATCH.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Date du match</label>
              <input type="date" style={inp} value={form.date_match} onChange={e => set('date_match', e.target.value)} />
            </div>
            <div>
              <label style={label}>Heure</label>
              <input type="time" style={inp} value={form.heure_match} onChange={e => set('heure_match', e.target.value)} />
            </div>
            <div>
              <label style={label}>Lieu</label>
              <select style={inp} value={form.domicile_exterieur} onChange={e => set('domicile_exterieur', e.target.value)}>
                <option value="domicile">🏠 Domicile</option>
                <option value="exterieur">✈️ Extérieur</option>
              </select>
            </div>
            <div>
              <label style={label}>Match aller — résultat</label>
              <input style={inp} placeholder="Victoire 2-1, Défaite 0-3…" value={form.match_aller_resultat} onChange={e => set('match_aller_resultat', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>Objectifs du match</label>
            <textarea style={txa} placeholder="Gagner pour rester dans le top 5, tester le nouveau système…" value={form.objectifs} onChange={e => set('objectifs', e.target.value)} />
          </div>
        </div>

        <div style={card}>
          {sectionTitle('02', '#60a5fa', 'Classements & statistiques')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ ...label, color: '#4ade80', marginBottom: '10px' }}>🟢 {equipeNom || 'Notre équipe'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={label}>Place</label><input type="number" style={numInp} placeholder="3" value={form.notre_classement} onChange={e => set('notre_classement', e.target.value)} /></div>
                <div><label style={label}>Points</label><input type="number" style={numInp} placeholder="21" value={form.notre_points} onChange={e => set('notre_points', e.target.value)} /></div>
                <div><label style={label}>Buts marqués</label><input type="number" style={numInp} placeholder="18" value={form.notre_buts_pour} onChange={e => set('notre_buts_pour', e.target.value)} /></div>
                <div><label style={label}>Buts encaissés</label><input type="number" style={numInp} placeholder="9" value={form.notre_buts_contre} onChange={e => set('notre_buts_contre', e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p style={{ ...label, color: '#f87171', marginBottom: '10px' }}>🔴 {form.adversaire || 'Adversaire'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={label}>Place</label><input type="number" style={numInp} placeholder="1" value={form.adversaire_classement} onChange={e => set('adversaire_classement', e.target.value)} /></div>
                <div><label style={label}>Points</label><input type="number" style={numInp} placeholder="28" value={form.adversaire_points} onChange={e => set('adversaire_points', e.target.value)} /></div>
                <div><label style={label}>Buts marqués</label><input type="number" style={numInp} placeholder="24" value={form.adversaire_buts_pour} onChange={e => set('adversaire_buts_pour', e.target.value)} /></div>
                <div><label style={label}>Buts encaissés</label><input type="number" style={numInp} placeholder="7" value={form.adversaire_buts_contre} onChange={e => set('adversaire_buts_contre', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          {sectionTitle('03', '#fbbf24', 'Conditions & météo')}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {METEO_OPTIONS.map(m => (
              <button key={m.val} onClick={() => set('meteo', m.val)}
                style={{
                  background: form.meteo === m.val ? 'rgba(251,191,36,0.15)' : '#0a0a0a',
                  border: `1px solid ${form.meteo === m.val ? '#fbbf24' : '#222'}`,
                  borderRadius: '8px', color: form.meteo === m.val ? '#fbbf24' : '#9ca3af',
                  fontSize: '13px', fontWeight: 600, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div style={{ maxWidth: '160px' }}>
            <label style={label}>Température (°C)</label>
            <input type="number" style={inp} placeholder="18" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
          </div>
        </div>

        <div style={card}>
          {sectionTitle('04', '#818cf8', 'Animation avec ballon')}
          <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '12px' }}>Consignes offensives, organisation avec ballon</p>
          <ListeChamp valeurs={form.animation_avec_ballon} onChange={(i, v) => setLigne('animation_avec_ballon', i, v)} onAjouter={() => ajouterLigne('animation_avec_ballon')} onSupprimer={i => supprimerLigne('animation_avec_ballon', i)} inputStyle={inp} placeholder="Ex: Jouer derrière leur ligne défensive, exploiter les espaces…" />
        </div>

        <div style={card}>
          {sectionTitle('05', '#f97316', 'Animation sans ballon')}
          <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '12px' }}>Consignes défensives, organisation sans ballon</p>
          <ListeChamp valeurs={form.animation_sans_ballon} onChange={(i, v) => setLigne('animation_sans_ballon', i, v)} onAjouter={() => ajouterLigne('animation_sans_ballon')} onSupprimer={i => supprimerLigne('animation_sans_ballon', i)} inputStyle={inp} placeholder="Ex: Rester compact, presser haut sur leur relance…" />
        </div>

        <div style={card}>
          {sectionTitle('06', '#22d3ee', 'Coups de pied arrêtés')}

          <div style={{ marginBottom: '24px' }}>
            <p style={{ ...label, color: '#4ade80', marginBottom: '10px' }}>⚽ Offensifs — Corners, CFL, Penalties</p>
            <div style={{ marginBottom: '12px' }}>
              <ListeChamp valeurs={form.cpa_offensifs} onChange={(i, v) => setLigne('cpa_offensifs', i, v)} onAjouter={() => ajouterLigne('cpa_offensifs')} onSupprimer={i => supprimerLigne('cpa_offensifs', i)} inputStyle={inp} placeholder="Ex: Corner entrant côté droit, n°9 au 1er poteau…" />
            </div>
            <div style={{ background: '#050505', border: '1px solid #1f2937', borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 10px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Schéma CPA Offensif</p>
              <TacticalBoard data={form.schema_cpa_offensif} onChange={val => set('schema_cpa_offensif', val)} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ ...label, color: '#f87171', marginBottom: '10px' }}>🛡️ Défensifs</p>
            <div style={{ marginBottom: '12px' }}>
              <ListeChamp valeurs={form.cpa_defensifs} onChange={(i, v) => setLigne('cpa_defensifs', i, v)} onAjouter={() => ajouterLigne('cpa_defensifs')} onSupprimer={i => supprimerLigne('cpa_defensifs', i)} inputStyle={inp} placeholder="Ex: Zone sur corner, le n°5 sur le 2ème poteau…" />
            </div>
            <div style={{ background: '#050505', border: '1px solid #1f2937', borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 10px', color: '#f87171', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Schéma CPA Défensif</p>
              <TacticalBoard data={form.schema_cpa_defensif} onChange={val => set('schema_cpa_defensif', val)} />
            </div>
          </div>

          <div>
            <p style={{ ...label, color: '#fbbf24', marginBottom: '10px' }}>🎯 Tireurs</p>
            <ListeChamp valeurs={form.tireurs} onChange={(i, v) => setLigne('tireurs', i, v)} onAjouter={() => ajouterLigne('tireurs')} onSupprimer={i => supprimerLigne('tireurs', i)} inputStyle={inp} placeholder="Ex: Kevin (penaltys), Mehdi (CFL directs)…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '32px' }}>
          <button onClick={() => setVue('liste')} style={btnO}>Annuler</button>
          <button onClick={sauvegarder} disabled={saving} style={{ ...btnG, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Sauvegarde…' : '✅ Enregistrer la fiche'}
          </button>
        </div>
      </div>
    </div>
  )

  // ─── VUE FICHE (affichage vestiaire) ───────────────────────────────────
  const f = ficheCourante || {}
  const meteoObj = METEO_OPTIONS.find(m => m.val === f.meteo)
  const typeLabel = TYPE_MATCH.find(t => t.val === f.type_match)?.label || ''
  const dateLabel = f.date_match ? new Date(f.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const contenuFiche = (
    <div style={{ background: '#080808', border: '1px solid #222', borderRadius: '20px', overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f2010 0%, #080808 60%)', borderBottom: '1px solid #222', padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{typeLabel.toUpperCase()}</span>
              <span style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 }}>
                {f.domicile_exterieur === 'domicile' ? '🏠 Domicile' : '✈️ Extérieur'}
              </span>
              {f.match_aller_resultat && (
                <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 }}>Aller : {f.match_aller_resultat}</span>
              )}
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {equipeNom || 'Nous'} <span style={{ color: '#4ade80' }}>vs</span> {f.adversaire}
            </h1>
            <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: '14px' }}>
              {dateLabel}{f.heure_match ? ` à ${f.heure_match.slice(0, 5)}` : ''}
              {meteoObj ? `  ·  ${meteoObj.icon} ${meteoObj.label}` : ''}
              {f.temperature != null ? ` ${f.temperature}°C` : ''}
            </p>
          </div>
          {(f.notre_classement || f.adversaire_classement) && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { nom: equipeNom || 'Nous', rang: f.notre_classement, pts: f.notre_points, bp: f.notre_buts_pour, bc: f.notre_buts_contre, color: '#4ade80' },
                { nom: f.adversaire, rang: f.adversaire_classement, pts: f.adversaire_points, bp: f.adversaire_buts_pour, bc: f.adversaire_buts_contre, color: '#f87171' },
              ].map((e, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${e.color}22`, borderRadius: '12px', padding: '14px 18px', textAlign: 'center', minWidth: '110px' }}>
                  <p style={{ margin: 0, color: e.color, fontWeight: 900, fontSize: '28px', lineHeight: 1 }}>{e.rang ? `${e.rang}e` : '—'}</p>
                  <p style={{ margin: '4px 0 2px', color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{e.nom}</p>
                  <p style={{ margin: 0, color: '#fff', fontSize: '12px', fontWeight: 600 }}>{e.pts != null ? `${e.pts} pts` : ''}</p>
                  {(e.bp != null || e.bc != null) && <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '11px' }}>{e.bp ?? '?'} / {e.bc ?? '?'}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {f.objectifs && (
          <div style={{ marginTop: '16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
            <p style={{ margin: '0 0 4px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Objectifs</p>
            <p style={{ margin: 0, color: '#e5e7eb', fontSize: '14px', lineHeight: 1.6 }}>{f.objectifs}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #222' }}>
        <div style={{ padding: '24px', borderRight: '1px solid #222' }}>
          <p style={{ margin: '0 0 14px', color: '#818cf8', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>⚽ Avec ballon</p>
          {(f.animation_avec_ballon || []).filter(Boolean).map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ color: '#818cf8', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
              <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
            </div>
          ))}
          {!(f.animation_avec_ballon || []).filter(Boolean).length && <p style={{ color: '#374151', fontSize: '13px', fontStyle: 'italic' }}>—</p>}
        </div>

        <div style={{ padding: '24px', borderRight: '1px solid #222' }}>
          <p style={{ margin: '0 0 14px', color: '#f97316', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🛡️ Sans ballon</p>
          {(f.animation_sans_ballon || []).filter(Boolean).map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ color: '#f97316', fontWeight: 900, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>›</span>
              <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
            </div>
          ))}
          {!(f.animation_sans_ballon || []).filter(Boolean).length && <p style={{ color: '#374151', fontSize: '13px', fontStyle: 'italic' }}>—</p>}
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 14px', color: '#22d3ee', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎯 Coups de pied arrêtés</p>
          {(f.cpa_offensifs || []).filter(Boolean).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#4ade80', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offensifs</p>
              {(f.cpa_offensifs || []).filter(Boolean).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px', lineHeight: 1.5 }}>{pt}</p>
                </div>
              ))}
            </div>
          )}
          {boardEstRempli(f.schema_cpa_offensif) && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#4ade80', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schéma offensif</p>
              <TacticalBoard data={f.schema_cpa_offensif} onChange={() => {}} readOnly />
            </div>
          )}
          {(f.cpa_defensifs || []).filter(Boolean).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#f87171', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Défensifs</p>
              {(f.cpa_defensifs || []).filter(Boolean).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#f87171', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px', lineHeight: 1.5 }}>{pt}</p>
                </div>
              ))}
            </div>
          )}
          {boardEstRempli(f.schema_cpa_defensif) && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', color: '#f87171', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schéma défensif</p>
              <TacticalBoard data={f.schema_cpa_defensif} onChange={() => {}} readOnly />
            </div>
          )}
          {(f.tireurs || []).filter(Boolean).length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', color: '#fbbf24', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tireurs</p>
              {(f.tireurs || []).filter(Boolean).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>›</span>
                  <p style={{ margin: 0, color: '#d1d5db', fontSize: '13px', lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#374151', fontSize: '12px' }}>Digital Football — Fiche préparée par {equipeNom || "l'équipe"}</p>
        <p style={{ margin: 0, color: '#374151', fontSize: '12px' }}>{dateLabel}</p>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setVue('liste')} style={btnO}>← Fiches</button>
        <button onClick={() => editer(f)} style={btnO}>✏️ Modifier</button>
        <button onClick={() => window.print()} style={{ ...btnO, color: '#4ade80', borderColor: '#4ade8044' }}>🖨️ Imprimer</button>
        <button onClick={() => supprimer(f.id)} style={{ ...btnO, color: '#f87171', borderColor: '#f8717133' }}>Supprimer</button>
      </div>

      {/* Aperçu à l'écran */}
      {contenuFiche}

      {/* Copie hors-écran, portée sur document.body, seule visible à l'impression */}
      <FicheCauseriePrint>{contenuFiche}</FicheCauseriePrint>
      <style>{`
        #fiche-causerie-print { display: none; }
        @media print {
          body > *:not(#fiche-causerie-print) { display: none !important; }
          #fiche-causerie-print { display: block !important; }
        }
      `}</style>
    </div>
  )
}
