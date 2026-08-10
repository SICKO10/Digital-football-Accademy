import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { normaliserHeure, normaliserCle, trouverFeuilleAvecDonnees } from '../lib/excelImport'
import { enqueueGroqRequest, libelleStatutGroq } from '../lib/groqQueue'

const JOURS = [
  { val: 'lundi', label: 'Lundi' },
  { val: 'mardi', label: 'Mardi' },
  { val: 'mercredi', label: 'Mercredi' },
  { val: 'jeudi', label: 'Jeudi' },
  { val: 'vendredi', label: 'Vendredi' },
  { val: 'samedi', label: 'Samedi' },
  { val: 'dimanche', label: 'Dimanche' },
]

const TYPES_TERRAIN = [
  { val: 'foot_11', label: 'Foot à 11' },
  { val: 'foot_8', label: 'Foot à 8' },
  { val: '5c5', label: '5 contre 5' },
  { val: 'autre', label: 'Autre' },
]

const creneauVide = (terrainId) => ({
  id: null, terrain_id: terrainId || '', equipe: '', educateur_id: '',
  jour: 'lundi', heure_debut: '', heure_fin: '',
})

const normaliserJour = (val) => JOURS.find(j => normaliserCle(val).includes(j.val))?.val || ''

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
}

export default function PlanningTerrains({ clubId, mode = 'dirigeant', userId, accentColor = '#4ade80', readOnly = false }) {
  const estDirigeant = mode === 'dirigeant' && !readOnly
  const [vue, setVue] = useState('planning') // 'configuration' | 'planning'

  const [terrains, setTerrains] = useState([])
  const [loadingTerrains, setLoadingTerrains] = useState(true)
  const [terrainActif, setTerrainActif] = useState(null)
  const [terrainEdits, setTerrainEdits] = useState({}) // { [id]: { nom, type } } édition en cours
  const [showAddTerrain, setShowAddTerrain] = useState(false)
  const [newTerrain, setNewTerrain] = useState({ nom: '', type: 'foot_11' })
  const [savingTerrain, setSavingTerrain] = useState(false)

  const [planning, setPlanning] = useState([])
  const [loadingPlanning, setLoadingPlanning] = useState(true)
  const [educateurs, setEducateurs] = useState([])

  const [formCreneau, setFormCreneau] = useState(null) // creneauVide() ou creneau existant en édition, ou null si fermé
  const [savingCreneau, setSavingCreneau] = useState(false)
  const [liberating, setLiberating] = useState({}) // { [id]: bool }

  const [showImport, setShowImport] = useState(false)
  const [importLignes, setImportLignes] = useState([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [iaStatus, setIaStatus] = useState(null)

  const chargerTerrains = async () => {
    setLoadingTerrains(true)
    const { data } = await supabase.from('terrains').select('*').eq('club_id', clubId).order('created_at')
    setTerrains(data || [])
    if (data?.length && !terrainActif) setTerrainActif(data[0].id)
    setLoadingTerrains(false)
  }

  const chargerPlanning = async () => {
    setLoadingPlanning(true)
    const { data } = await supabase.from('planning_terrains').select('*').eq('club_id', clubId).order('heure_debut')
    setPlanning(data || [])
    setLoadingPlanning(false)
  }

  const chargerEducateurs = async () => {
    const { data } = await supabase.from('club_educateurs').select('educateur_id, educateur:educateur_id(prenom, nom)').eq('club_id', clubId).eq('statut', 'accepte')
    setEducateurs(data || [])
  }

  useEffect(() => {
    if (!clubId) return
    chargerTerrains()
    chargerPlanning()
    chargerEducateurs()

    const channel = supabase
      .channel(`planning_terrains_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_terrains', filter: `club_id=eq.${clubId}` }, () => {
        chargerPlanning()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  // ── Configuration terrains (dirigeant) ──────────────────────────────────────
  const ajouterTerrain = async () => {
    if (!newTerrain.nom.trim()) return
    // Optimistic : le formulaire se referme tout de suite sans attendre la
    // réponse Supabase, qui continue en arrière-plan. Erreur → réouvert
    // avec la saisie intacte.
    const snapshot = { ...newTerrain }
    setSavingTerrain(true)
    setNewTerrain({ nom: '', type: 'foot_11' })
    setShowAddTerrain(false)
    const { error } = await supabase.from('terrains').insert({ club_id: clubId, nom: snapshot.nom.trim(), type: snapshot.type })
    setSavingTerrain(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNewTerrain(snapshot)
      setShowAddTerrain(true)
      return
    }
    await chargerTerrains()
  }

  const modifierTerrainChamp = (id, champ, valeur) => {
    setTerrainEdits(prev => ({ ...prev, [id]: { nom: prev[id]?.nom ?? terrains.find(t => t.id === id)?.nom ?? '', type: prev[id]?.type ?? terrains.find(t => t.id === id)?.type ?? 'autre', [champ]: valeur } }))
  }

  const sauvegarderTerrain = async (id) => {
    const edit = terrainEdits[id]
    if (!edit) return
    // Optimistic : sort du mode édition tout de suite sans attendre la
    // réponse Supabase. Erreur → l'édition se rouvre (aucune vérification
    // d'erreur n'existait avant, on en ajoute a minima pour ne pas échouer
    // silencieusement maintenant que l'UI ne réagit plus au retour serveur).
    setTerrainEdits(prev => { const next = { ...prev }; delete next[id]; return next })
    const { error } = await supabase.from('terrains').update({ nom: edit.nom.trim(), type: edit.type }).eq('id', id)
    if (error) {
      alert('Erreur : ' + error.message)
      setTerrainEdits(prev => ({ ...prev, [id]: edit }))
      return
    }
    await chargerTerrains()
  }

  const toggleActifTerrain = async (t) => {
    // Optimistic : la ligne bascule tout de suite dans la liste locale
    // plutôt que d'attendre la réponse Supabase puis un rechargement complet.
    setTerrains(prev => prev.map(x => x.id === t.id ? { ...x, actif: !t.actif } : x))
    const { error } = await supabase.from('terrains').update({ actif: !t.actif }).eq('id', t.id)
    if (error) {
      setTerrains(prev => prev.map(x => x.id === t.id ? { ...x, actif: t.actif } : x))
      alert('Erreur : ' + error.message)
    }
  }

  const supprimerTerrain = async (id) => {
    if (!confirm('Supprimer ce terrain ? Tous les créneaux associés seront aussi supprimés.')) return
    await supabase.from('terrains').delete().eq('id', id)
    if (terrainActif === id) setTerrainActif(null)
    await chargerTerrains()
    await chargerPlanning()
  }

  // ── Créneaux (dirigeant) ─────────────────────────────────────────────────────
  const sauvegarderCreneau = async () => {
    if (!formCreneau.terrain_id || !formCreneau.heure_debut || !formCreneau.heure_fin) return
    const payload = {
      club_id: clubId,
      terrain_id: formCreneau.terrain_id,
      equipe: formCreneau.equipe.trim() || null,
      educateur_id: formCreneau.educateur_id || null,
      jour: formCreneau.jour,
      heure_debut: formCreneau.heure_debut,
      heure_fin: formCreneau.heure_fin,
    }
    // Optimistic : le formulaire se ferme tout de suite sans attendre la
    // réponse Supabase, qui continue en arrière-plan. Erreur → réouvert
    // avec la saisie intacte.
    const snapshot = { ...formCreneau }
    setSavingCreneau(true)
    setFormCreneau(null)
    const { error } = snapshot.id
      ? await supabase.from('planning_terrains').update(payload).eq('id', snapshot.id)
      : await supabase.from('planning_terrains').insert(payload)
    setSavingCreneau(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setFormCreneau(snapshot)
      return
    }
    await chargerPlanning()
  }

  const supprimerCreneau = async (id) => {
    if (!confirm('Supprimer ce créneau ?')) return
    await supabase.from('planning_terrains').delete().eq('id', id)
    await chargerPlanning()
  }

  // ── Import Excel/CSV (dirigeant) ─────────────────────────────────────────────
  const telechargerTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = ['Terrain', 'Équipe', 'Éducateur', 'Jour (lundi-dimanche)', 'Heure début (HH:MM)', 'Heure fin (HH:MM)']
    const exemple = [terrains[0]?.nom || 'Terrain principal', 'U15 A', 'Jean Dupont', 'mardi', '18:00', '19:30']
    const ws = XLSX.utils.aoa_to_sheet([headers, exemple])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Planning terrains')
    XLSX.writeFile(wb, 'template_planning_terrains.xlsx')
  }

  const nomEducateurDeLigne = (e) => `${e.educateur?.prenom || ''} ${e.educateur?.nom || ''}`.trim()

  // Import Excel/CSV du planning : lit le fichier et envoie directement son
  // contenu brut à l'IA (même modèle/file d'attente que les autres scans IA
  // de l'app, cf. enqueueGroqRequest), sans tenter de détecter/valider des
  // en-têtes ou colonnes nous-mêmes au préalable — les fichiers réels
  // (grilles par semaine, tableaux croisés, en-têtes sur plusieurs lignes...)
  // ne rentrent pas de façon fiable dans un mapping de colonnes fixe, et
  // l'IA s'en sort largement mieux. Alimente le tableau d'aperçu éditable
  // (importLignes) — aucun insert direct : le dirigeant garde la main pour
  // corriger/valider avant "Valider l'import".
  const handleFichierImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportError('Format non supporté. Utilise un fichier .xlsx ou .csv (depuis Numbers : exporte en .xlsx ou .csv au préalable).')
      e.target.value = ''
      return
    }
    setImporting(true)
    setIaStatus(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const { sheet: feuilleTrouvee } = trouverFeuilleAvecDonnees(wb, s => XLSX.utils.sheet_to_json(s, { header: 1, defval: '' })) || {}
      const feuille = feuilleTrouvee || wb.Sheets[wb.SheetNames[0]]
      const grille = XLSX.utils.sheet_to_json(feuille, { header: 1, defval: '' })
      // Colonnes jointes par " | " (pas des tabulations) : les tabulations brutes dans
      // une chaîne envoyée à un LLM peuvent se retrouver telles quelles dans sa réponse
      // JSON et casser le parsing (JSON.parse n'accepte pas un \t littéral non échappé).
      const sample = grille
        .filter(row => row.some(c => String(c ?? '').trim() !== ''))
        .slice(0, 40)
        .map(row => row.slice(0, 30).map(c => String(c ?? '')).join(' | '))
        .join('\n').trim()
      if (!sample) throw new Error('Fichier vide ou illisible.')

      const prompt = `Voici le contenu brut (colonnes séparées par " | ") d'un planning d'occupation de terrains de football club, sous une forme quelconque (grille par semaine, tableau croisé, liste...) :

---DEBUT FICHIER---
${sample}
---FIN FICHIER---

Terrains existants dans ce club (réutilise ces noms exacts si tu les reconnais dans le fichier) : ${terrains.map(t => t.nom).join(', ') || 'aucun terrain enregistré'}

Extrait tous les créneaux d'occupation. Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant/après, sans balise markdown, format exact :
[{ "terrain": "...", "equipe": "...", "educateur": "...", "jour": "lundi", "heure_debut": "HH:MM", "heure_fin": "HH:MM" }]

Règles :
- "jour" en minuscules parmi lundi/mardi/mercredi/jeudi/vendredi/samedi/dimanche
- "heure_debut"/"heure_fin" au format HH:MM, chaîne vide si absent du fichier
- "educateur" = nom de l'éducateur/coach si visible, sinon chaîne vide
- Ignore les lignes/colonnes vides ou de mise en forme (titres, totaux...)
- Ne retourne que des créneaux réels trouvés dans le fichier, jamais d'exemple`

      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_completion_tokens: 4000,
        }),
      }, setIaStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("L'IA n'a pas pu analyser ce fichier.")
      const extraits = JSON.parse(jsonMatch[0])
      if (!Array.isArray(extraits) || extraits.length === 0) throw new Error('Aucun créneau détecté dans ce fichier.')

      const mapped = extraits.map(c => {
        const terrain = terrains.find(t => normaliserCle(t.nom) === normaliserCle(c.terrain))
        const educateur = educateurs.find(e => normaliserCle(nomEducateurDeLigne(e)) === normaliserCle(c.educateur))
        return {
          _id: crypto.randomUUID(),
          terrain_id: terrain?.id || '',
          equipe: (c.equipe || '').trim(),
          educateur_id: educateur?.educateur_id || '',
          jour: normaliserJour(c.jour) || 'lundi',
          heure_debut: normaliserHeure(c.heure_debut) || '',
          heure_fin: normaliserHeure(c.heure_fin) || '',
        }
      }).filter(l => l.equipe || l.heure_debut || l.heure_fin)

      if (mapped.length === 0) throw new Error("L'IA n'a trouvé aucun créneau exploitable dans ce fichier.")
      setImportLignes(mapped)
    } catch (err) {
      setImportError(err.message)
    }
    setImporting(false)
    setIaStatus(null)
    e.target.value = ''
  }

  const modifierLigneImport = (id, champ, valeur) => {
    setImportLignes(prev => prev.map(l => (l._id === id ? { ...l, [champ]: valeur } : l)))
  }

  const supprimerLigneImport = (id) => setImportLignes(prev => prev.filter(l => l._id !== id))

  const validerImport = async () => {
    const valides = importLignes.filter(l => l.terrain_id && l.heure_debut && l.heure_fin)
    if (valides.length === 0) return
    setImporting(true)
    const payload = valides.map(l => ({
      club_id: clubId,
      terrain_id: l.terrain_id,
      equipe: l.equipe.trim() || null,
      educateur_id: l.educateur_id || null,
      jour: l.jour,
      heure_debut: l.heure_debut,
      heure_fin: l.heure_fin,
    }))
    const { error } = await supabase.from('planning_terrains').insert(payload)
    setImporting(false)
    if (error) { alert('Erreur lors de l\'import : ' + error.message); return }
    setImportLignes([])
    setShowImport(false)
    await chargerPlanning()
  }

  // ── Libération (éducateur) ──────────────────────────────────────────────────
  const toggleLiberation = async (creneau) => {
    setLiberating(prev => ({ ...prev, [creneau.id]: true }))
    const { error } = await supabase.rpc('liberer_creneau', { p_creneau_id: creneau.id, p_libere: !creneau.libere })
    setLiberating(prev => ({ ...prev, [creneau.id]: false }))
    if (error) { alert('Erreur : ' + error.message); return }
    await chargerPlanning()
  }

  const nomEducateur = (educateurId) => {
    const e = educateurs.find(x => x.educateur_id === educateurId)
    return e ? `${e.educateur?.prenom || ''} ${e.educateur?.nom || ''}`.trim() : ''
  }

  const creneauxDuJour = (jour) => planning
    .filter(c => c.terrain_id === terrainActif && c.jour === jour)
    .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))

  const renderCreneauCard = (c) => {
    const estMonCreneau = mode === 'educateur' && c.educateur_id === userId
    return (
      <div key={c.id} style={{
        background: c.libere ? accentColor + '10' : '#0a0a0a',
        border: `1px solid ${c.libere ? accentColor + '40' : '#1a1a1a'}`,
        borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
      }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: c.libere ? accentColor : '#fff' }}>
          {c.heure_debut?.slice(0, 5)} – {c.heure_fin?.slice(0, 5)}
        </p>
        {c.libere ? (
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: accentColor }}>Disponible — libéré par {c.libere_par || 'un éducateur'}</p>
        ) : (
          <>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ccc' }}>{c.equipe || '—'}</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{nomEducateur(c.educateur_id) || '—'}</p>
          </>
        )}

        {estDirigeant && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button onClick={() => setFormCreneau({ id: c.id, terrain_id: c.terrain_id, equipe: c.equipe || '', educateur_id: c.educateur_id || '', jour: c.jour, heure_debut: c.heure_debut?.slice(0, 5) || '', heure_fin: c.heure_fin?.slice(0, 5) || '' })}
              style={{ background: '#ffffff10', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
            <button onClick={() => supprimerCreneau(c.id)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {estMonCreneau && (
          <button onClick={() => toggleLiberation(c)} disabled={liberating[c.id]}
            style={{ marginTop: '8px', width: '100%', background: c.libere ? '#1a1a1a' : accentColor, color: c.libere ? '#aaa' : '#000', border: c.libere ? '1px solid #2a2a2a' : 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {liberating[c.id] ? '...' : c.libere ? 'Annuler la libération' : 'Libérer ce créneau'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🏟️ Planning des terrains</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>
        {estDirigeant ? "Configure tes terrains et organise l'occupation hebdomadaire." : "Planning de la semaine — libère un créneau si tu n'en as pas besoin."}
      </p>

      {estDirigeant && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {[['planning', 'Planning'], ['configuration', 'Configuration']].map(([val, label]) => (
            <button key={val} onClick={() => setVue(val)}
              style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: vue === val ? accentColor : '#1a1a1a', color: vue === val ? '#000' : '#888', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {estDirigeant && vue === 'configuration' && (
        <div style={st.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Mes terrains</p>
            <button onClick={() => setShowAddTerrain(v => !v)}
              style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, color: accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {showAddTerrain ? '✕ Fermer' : '+ Ajouter un terrain'}
            </button>
          </div>
          {showAddTerrain && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input style={{ ...st.input, maxWidth: '220px' }} placeholder="Nom (ex: Terrain principal)" value={newTerrain.nom} onChange={e => setNewTerrain(t => ({ ...t, nom: e.target.value }))} />
              <select style={{ ...st.input, maxWidth: '160px' }} value={newTerrain.type} onChange={e => setNewTerrain(t => ({ ...t, type: e.target.value }))}>
                {TYPES_TERRAIN.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
              </select>
              <button onClick={ajouterTerrain} disabled={savingTerrain || !newTerrain.nom.trim()}
                style={{ background: accentColor, color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {savingTerrain ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          )}
          {loadingTerrains ? (
            <p style={{ color: '#444', fontSize: '12px' }}>Chargement...</p>
          ) : terrains.length === 0 ? (
            <p style={{ color: '#444', fontSize: '12px' }}>Aucun terrain configuré pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {terrains.map(t => {
                const edit = terrainEdits[t.id]
                return (
                  <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 12px' }}>
                    <input style={{ ...st.input, maxWidth: '220px' }} value={edit?.nom ?? t.nom} onChange={e => modifierTerrainChamp(t.id, 'nom', e.target.value)} />
                    <select style={{ ...st.input, maxWidth: '150px' }} value={edit?.type ?? t.type} onChange={e => modifierTerrainChamp(t.id, 'type', e.target.value)}>
                      {TYPES_TERRAIN.map(ty => <option key={ty.val} value={ty.val}>{ty.label}</option>)}
                    </select>
                    <button onClick={() => toggleActifTerrain(t)}
                      style={{ background: t.actif ? accentColor + '15' : '#ffffff08', border: `1px solid ${t.actif ? accentColor + '40' : '#2a2a2a'}`, color: t.actif ? accentColor : '#666', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      {t.actif ? 'Actif' : 'Inactif'}
                    </button>
                    {edit && (
                      <button onClick={() => sauvegarderTerrain(t.id)}
                        style={{ background: accentColor, color: '#000', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>💾 Enregistrer</button>
                    )}
                    <button onClick={() => supprimerTerrain(t.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {(vue === 'planning' || !estDirigeant) && (
        <div>
          {loadingTerrains ? (
            <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
          ) : terrains.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', color: '#555' }}>
              {estDirigeant ? "Ajoute d'abord un terrain dans l'onglet Configuration." : "Aucun terrain configuré par le club pour l'instant."}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {terrains.map(t => (
                  <button key={t.id} onClick={() => setTerrainActif(t.id)}
                    style={{ background: terrainActif === t.id ? accentColor + '15' : 'transparent', border: `1px solid ${terrainActif === t.id ? accentColor + '40' : '#2a2a2a'}`, color: terrainActif === t.id ? accentColor : '#888', padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t.nom}{!t.actif ? ' (inactif)' : ''}
                  </button>
                ))}
              </div>

              {estDirigeant && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setFormCreneau(creneauVide(terrainActif))}
                    style={{ background: accentColor, color: '#000', border: 'none', padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Nouveau créneau
                  </button>
                  <button onClick={telechargerTemplate}
                    style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '8px 18px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    📥 Télécharger le template
                  </button>
                  <button onClick={() => setShowImport(v => !v)}
                    style={{ background: showImport ? accentColor + '15' : 'transparent', border: `1px solid ${showImport ? accentColor + '40' : '#333'}`, color: showImport ? accentColor : '#888', padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {showImport ? '✕ Fermer' : '📊 Importer Excel / CSV'}
                  </button>
                </div>
              )}

              {estDirigeant && showImport && (
                <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>Import Excel / CSV</p>
                  <p style={{ fontSize: '12px', color: '#555', margin: '0 0 12px' }}>
                    L'IA analyse directement le fichier, quel que soit son format (grille par semaine, tableau croisé, liste avec en-têtes...) — utilise le template si tu pars de zéro. Depuis Numbers : exporte d'abord en .xlsx ou .csv.
                  </p>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFichierImport} style={{ display: 'none' }} id="input-import-terrains" />
                  <label htmlFor="input-import-terrains"
                    style={{ background: accentColor, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: importing ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: importing ? 0.6 : 1, display: 'inline-flex', alignItems: 'center' }}>
                    {importing ? libelleStatutGroq(iaStatus) : 'Choisir un fichier'}
                  </label>

                  {importError && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>❌ {importError}</p>}

                  {importLignes.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '760px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Terrain</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Équipe</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Éducateur</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Jour</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Début</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Fin</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {importLignes.map(l => (
                              <tr key={l._id} style={{ borderBottom: '1px solid #141414', background: !l.terrain_id ? '#ef444408' : 'transparent' }}>
                                <td style={{ padding: '6px 10px' }}>
                                  <select style={{ ...st.input, borderColor: !l.terrain_id ? '#ef444460' : '#2a2a2a', minWidth: '130px' }} value={l.terrain_id} onChange={e => modifierLigneImport(l._id, 'terrain_id', e.target.value)}>
                                    <option value="">— aucun —</option>
                                    {terrains.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px' }}><input style={{ ...st.input, minWidth: '100px' }} value={l.equipe} onChange={e => modifierLigneImport(l._id, 'equipe', e.target.value)} /></td>
                                <td style={{ padding: '6px 10px' }}>
                                  <select style={{ ...st.input, minWidth: '140px' }} value={l.educateur_id} onChange={e => modifierLigneImport(l._id, 'educateur_id', e.target.value)}>
                                    <option value="">—</option>
                                    {educateurs.map(e => <option key={e.educateur_id} value={e.educateur_id}>{nomEducateurDeLigne(e)}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  <select style={st.input} value={l.jour} onChange={e => modifierLigneImport(l._id, 'jour', e.target.value)}>
                                    {JOURS.map(j => <option key={j.val} value={j.val}>{j.label}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px' }}><input style={st.input} type="time" value={l.heure_debut} onChange={e => modifierLigneImport(l._id, 'heure_debut', e.target.value)} /></td>
                                <td style={{ padding: '6px 10px' }}><input style={st.input} type="time" value={l.heure_fin} onChange={e => modifierLigneImport(l._id, 'heure_fin', e.target.value)} /></td>
                                <td style={{ padding: '6px 10px' }}><button onClick={() => supprimerLigneImport(l._id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button onClick={validerImport} disabled={importing}
                        style={{ marginTop: '14px', background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: importing ? 0.6 : 1 }}>
                        {importing ? 'Import en cours...' : `✓ Valider l'import (${importLignes.filter(l => l.terrain_id && l.heure_debut && l.heure_fin).length} créneau${importLignes.length > 1 ? 'x' : ''})`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formCreneau && (
                <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px' }}>{formCreneau.id ? 'Modifier le créneau' : 'Nouveau créneau'}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={st.label}>Terrain</label>
                      <select style={st.input} value={formCreneau.terrain_id} onChange={e => setFormCreneau(f => ({ ...f, terrain_id: e.target.value }))}>
                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>Jour</label>
                      <select style={st.input} value={formCreneau.jour} onChange={e => setFormCreneau(f => ({ ...f, jour: e.target.value }))}>
                        {JOURS.map(j => <option key={j.val} value={j.val}>{j.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>Heure début</label>
                      <input style={st.input} type="time" value={formCreneau.heure_debut} onChange={e => setFormCreneau(f => ({ ...f, heure_debut: e.target.value }))} />
                    </div>
                    <div>
                      <label style={st.label}>Heure fin</label>
                      <input style={st.input} type="time" value={formCreneau.heure_fin} onChange={e => setFormCreneau(f => ({ ...f, heure_fin: e.target.value }))} />
                    </div>
                    <div>
                      <label style={st.label}>Équipe</label>
                      <input style={st.input} value={formCreneau.equipe} onChange={e => setFormCreneau(f => ({ ...f, equipe: e.target.value }))} placeholder="Ex: U15 A" />
                    </div>
                    <div>
                      <label style={st.label}>Éducateur</label>
                      <select style={st.input} value={formCreneau.educateur_id} onChange={e => setFormCreneau(f => ({ ...f, educateur_id: e.target.value }))}>
                        <option value="">—</option>
                        {educateurs.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={sauvegarderCreneau} disabled={savingCreneau}
                      style={{ background: accentColor, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {savingCreneau ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button onClick={() => setFormCreneau(null)}
                      style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {loadingPlanning ? (
                <p style={{ color: '#444', fontSize: '13px' }}>Chargement du planning...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {JOURS.map(j => (
                    <div key={j.val}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', textAlign: 'center' }}>{j.label}</p>
                      {creneauxDuJour(j.val).length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#333', textAlign: 'center' }}>—</p>
                      ) : (
                        creneauxDuJour(j.val).map(renderCreneauCard)
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
