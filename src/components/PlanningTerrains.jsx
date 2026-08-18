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

// Zone occupée sur le terrain pour ce créneau — permet à plusieurs équipes de
// se partager un même terrain au même horaire : foot à 11 (U13+) sur un
// demi-terrain chacune (2 zones max), foot à 5/futsal/U6-U11 jusqu'à 5 zones.
// 'plein' (défaut) = le créneau occupe tout le terrain, comme avant.
const ZONES = [
  { val: 'plein', label: 'Terrain plein' },
  { val: 'demi-A', label: 'Demi-terrain A' },
  { val: 'demi-B', label: 'Demi-terrain B' },
  { val: 'zone-1', label: 'Zone 1' },
  { val: 'zone-2', label: 'Zone 2' },
  { val: 'zone-3', label: 'Zone 3' },
  { val: 'zone-4', label: 'Zone 4' },
  { val: 'zone-5', label: 'Zone 5' },
]
// 'plein' reprend la couleur de marque du club (accentColor, déjà utilisée
// partout ailleurs) ; les sous-zones ont chacune une couleur fixe distincte
// pour rester lisibles quand plusieurs sont empilées sur la même case.
const ZONE_COLORS_FIXES = { 'demi-A': '#60a5fa', 'demi-B': '#818cf8', 'zone-1': '#fbbf24', 'zone-2': '#f97316', 'zone-3': '#f43f5e', 'zone-4': '#c084fc', 'zone-5': '#22d3ee' }
const couleurZone = (zone, accentColor) => ZONE_COLORS_FIXES[zone] || accentColor

// Zones disponibles selon le type réel du terrain (cf. règle club : foot à 11
// = 1 demi-terrain par équipe, foot à 8/5 contre 5 = jusqu'à 5 groupes). Un
// terrain "autre" (non classé) ne propose que "plein", faute de règle connue.
const zonesDisponibles = (typeTerrain) => {
  if (typeTerrain === 'foot_11') return ZONES.filter(z => ['plein', 'demi-A', 'demi-B'].includes(z.val))
  if (typeTerrain === 'foot_8' || typeTerrain === '5c5') return ZONES.filter(z => z.val === 'plein' || z.val.startsWith('zone-'))
  return [ZONES[0]]
}

// Couleur de secours pour une équipe sans couleur choisie (club_categories.couleur
// nulle) — palette fixe, indexée sur l'ordre des catégories pour rester stable
// d'un rendu à l'autre tant que la liste de catégories ne change pas.
const PALETTE_EQUIPES = ['#4ade80', '#60a5fa', '#f97316', '#a78bfa', '#f43f5e', '#22d3ee', '#fbbf24', '#34d399', '#818cf8', '#f472b6']
const couleurEquipe = (nomEquipe, categories) => {
  const idx = categories.findIndex(c => `${c.nom} ${c.equipe || ''}`.trim() === (nomEquipe || '').trim())
  if (idx === -1) return null
  return categories[idx]?.couleur || PALETTE_EQUIPES[idx % PALETTE_EQUIPES.length]
}

const creneauVide = (terrainId) => ({
  id: null, terrain_id: terrainId || '', equipe: '', educateur_id: '',
  jour: 'lundi', heure_debut: '', heure_fin: '', zone: 'plein',
})

const normaliserJour = (val) => JOURS.find(j => normaliserCle(val).includes(j.val))?.val || ''
const normaliserZone = (val) => ZONES.find(z => z.val === String(val || '').trim().toLowerCase())?.val || 'plein'

// date.toISOString() convertit en UTC — en France (UTC+1/+2), minuit local
// devient 22h/23h la veille en UTC, donc .toISOString().split('T')[0] renvoie
// la date de la veille. Reconstruit la date à partir des composants LOCAUX
// (année/mois/jour), jamais via toISOString, pour rester alignée avec les
// dates stockées en base (YYYY-MM-DD, sans fuseau) et avec labelCourt
// (toLocaleDateString, déjà en local).
const dateLocaleStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Les 7 dates (lundi→dimanche) de la semaine affichée, décalée de
// `offsetSemaines` par rapport à la semaine courante (0 = cette semaine,
// -1 = précédente, +1 = suivante). JOURS est déjà ordonné lundi→dimanche,
// donc son index correspond directement au décalage depuis le lundi.
const getDatesSemaine = (offsetSemaines = 0) => {
  const aujourdHui = new Date()
  const jourISO = aujourdHui.getDay() || 7 // Date.getDay() : 0=dimanche → 7 pour rester en semaine ISO (1=lundi)
  const lundi = new Date(aujourdHui)
  lundi.setDate(aujourdHui.getDate() - jourISO + 1 + offsetSemaines * 7)

  return JOURS.map((j, i) => {
    const date = new Date(lundi)
    date.setDate(lundi.getDate() + i)
    return {
      val: j.val,
      label: j.label,
      dateStr: dateLocaleStr(date),
      labelCourt: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }
  })
}

// Deux créneaux se chevauchent si leurs horaires se recoupent (bornes
// incluses côté début, exclues côté fin — un créneau qui finit à 18:00 ne
// chevauche pas celui qui commence à 18:00).
const seChevauchent = (a, b) => a.heure_debut < b.heure_fin && b.heure_debut < a.heure_fin

// Durée estimée d'un match pour la détection de conflit (matchs_equipe n'a
// pas d'heure de fin en base, contrairement aux créneaux) — 2h, valeur
// raisonnable pour un match + échauffement, jamais persistée.
const DUREE_MATCH_MIN = 120
const heureFinMatch = (heureDebut) => {
  if (!heureDebut) return null
  const [h, m] = heureDebut.split(':').map(Number)
  const total = h * 60 + m + DUREE_MATCH_MIN
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Jour de la semaine (lundi..dimanche, cf. JOURS) pour une date donnée — sert
// à comparer un match (daté) aux créneaux récurrents (jour de semaine).
const jourDepuisDate = (dateStr) => {
  const jsDay = new Date(`${dateStr}T12:00:00`).getDay() // 0=dimanche..6=samedi
  return JOURS[(jsDay + 6) % 7].val
}

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
  const [categories, setCategories] = useState([]) // club_categories — équipes du club, pour le sélecteur + la couleur par équipe
  const [heuresClub, setHeuresClub] = useState({ ouverture: '08:00', fermeture: '22:00' })
  const [reclamingId, setReclamingId] = useState(null)
  const [semaineOffset, setSemaineOffset] = useState(0) // 0 = semaine courante, -1 = précédente, +1 = suivante
  const [exceptions, setExceptions] = useState([]) // planning_terrains_exceptions de la semaine affichée
  const [matchsSemaine, setMatchsSemaine] = useState([]) // matchs_equipe de toutes les catégories du club, semaine affichée — informatif (pas de terrain_id en base, donc pas assignable à un créneau précis)

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

  const chargerCategories = async () => {
    const { data } = await supabase.from('club_categories').select('id, nom, equipe, educateur_id, couleur').eq('club_id', clubId).order('nom')
    setCategories(data || [])
  }

  const chargerHeuresClub = async () => {
    const { data } = await supabase.from('profiles').select('planning_heure_ouverture, planning_heure_fermeture').eq('id', clubId).maybeSingle()
    if (data) setHeuresClub({ ouverture: (data.planning_heure_ouverture || '08:00').slice(0, 5), fermeture: (data.planning_heure_fermeture || '22:00').slice(0, 5) })
  }

  // Exceptions ponctuelles (libération/remplacement pour une date précise,
  // cf. planning_terrains_exceptions) de la semaine affichée uniquement —
  // une exception dont la date est passée n'est jamais chargée ici, donc le
  // créneau de base reprend automatiquement sans purge à faire.
  const chargerExceptions = async (offset) => {
    const dates = getDatesSemaine(offset)
    const { data } = await supabase.from('planning_terrains_exceptions').select('*')
      .eq('club_id', clubId).gte('date_exception', dates[0].dateStr).lte('date_exception', dates[6].dateStr)
    setExceptions(data || [])
  }

  // Matchs À DOMICILE de toutes les catégories affiliées au club (pas
  // seulement celle de l'éducateur qui consulte), pour la semaine affichée.
  // Un match à l'extérieur ne se joue pas sur un terrain du club, donc n'a
  // rien à faire dans ce planning (domicile=false exclu à la source).
  // Rattachés à un terrain via terrain_id quand renseigné ; sinon affichés à
  // part dans "Matchs sans terrain assigné" (cf. matchsSansTerrainSemaine).
  const chargerMatchsSemaine = async (offset) => {
    const ids = educateurs.map(e => e.educateur_id)
    if (ids.length === 0) { setMatchsSemaine([]); return }
    const dates = getDatesSemaine(offset)
    const { data } = await supabase.from('matchs_equipe').select('id, date, heure, adversaire, domicile, educateur_id, terrain_id')
      .in('educateur_id', ids).eq('domicile', true).gte('date', dates[0].dateStr).lte('date', dates[6].dateStr)
    setMatchsSemaine(data || [])
  }

  useEffect(() => {
    if (!clubId) return
    chargerTerrains()
    chargerPlanning()
    chargerEducateurs()
    chargerCategories()
    chargerHeuresClub()

    const channel = supabase
      .channel(`planning_terrains_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_terrains', filter: `club_id=eq.${clubId}` }, () => {
        chargerPlanning()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  useEffect(() => {
    if (!clubId) return
    chargerExceptions(semaineOffset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, semaineOffset])

  useEffect(() => {
    if (!clubId) return
    chargerMatchsSemaine(semaineOffset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, semaineOffset, educateurs])

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
      zone: formCreneau.zone || 'plein',
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
      // Liste "position: valeur" des cellules non vides plutôt qu'un dump ligne
      // par ligne : une grille complexe (planning par semaine, tableau croisé)
      // peut avoir bien plus de 30 colonnes utiles, et la plupart des cellules
      // d'un planning sont vides — les lister toutes gaspillait des tokens sans
      // rien apporter. Chaque cellule garde sa position (Lx = ligne, Cy =
      // colonne) pour que l'IA puisse reconstituer quelles valeurs sont sur la
      // même ligne/colonne. "0" exclu (souvent une cellule de mise en forme
      // vide plutôt qu'une vraie donnée). Plafonné à 150 cellules : au-delà,
      // le fichier est trop dense pour tenir dans le contexte du modèle —
      // avertit plutôt que de tronquer silencieusement.
      const cellsNonVides = []
      grille.slice(0, 55).forEach((row, i) => {
        row.forEach((cell, j) => {
          const val = String(cell ?? '').trim()
          if (val && val !== '0') cellsNonVides.push(`L${i + 1}C${j + 1}: "${val}"`)
        })
      })
      if (cellsNonVides.length === 0) throw new Error('Fichier vide ou illisible.')
      if (cellsNonVides.length > 150) {
        console.warn(`Import planning terrains IA : ${cellsNonVides.length} cellules non vides détectées, seules les 150 premières sont envoyées à l'IA.`)
      }
      const sample = cellsNonVides.slice(0, 150).join('\n')

      const prompt = `Voici la liste des cellules non vides d'un planning d'occupation de terrains de football club (format Excel), sous une forme quelconque (grille par semaine, tableau croisé, liste...). Chaque ligne indique la position de la cellule (Lx = ligne x, Cy = colonne y) et sa valeur — les cellules d'une même ligne Lx sont sur la même ligne du fichier, celles d'une même colonne Cy sont dans la même colonne :

---DEBUT FICHIER---
${sample}
---FIN FICHIER---

Terrains existants dans ce club (réutilise ces noms exacts si tu les reconnais dans le fichier) : ${terrains.map(t => t.nom).join(', ') || 'aucun terrain enregistré'}

RÈGLE IMPORTANTE — plusieurs équipes peuvent partager un même terrain au même horaire, sur des zones différentes :
- Foot à 11 (catégories U13, U14, U15, U16, U17, U18, U19, U20, Seniors, R1, R2...) : chaque équipe occupe UN DEMI-TERRAIN, donc au plus 2 équipes simultanées sur un terrain plein (zones "demi-A" et "demi-B").
- Foot à 5 / futsal / U6, U7, U8, U9, U10, U11, U12 : jusqu'à 5 groupes peuvent se partager un même terrain (zones "zone-1" à "zone-5").
- Si une seule équipe/groupe occupe tout le terrain à cet horaire, ou si tu ne peux pas déterminer de partage, mets zone "plein".

Extrait tous les créneaux d'occupation. Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant/après, sans balise markdown, format exact :
[{ "terrain": "...", "equipe": "...", "educateur": "...", "jour": "lundi", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "zone": "plein" }]

Règles :
- "jour" en minuscules parmi lundi/mardi/mercredi/jeudi/vendredi/samedi/dimanche
- "heure_debut"/"heure_fin" au format HH:MM, chaîne vide si absent du fichier
- "educateur" = nom de l'éducateur/coach si visible, sinon chaîne vide
- "zone" parmi plein/demi-A/demi-B/zone-1/zone-2/zone-3/zone-4/zone-5, selon la règle de partage ci-dessus déduite de la catégorie de l'équipe
- Ignore les lignes/colonnes vides ou de mise en forme (titres, totaux...)
- Ne retourne que des créneaux réels trouvés dans le fichier, jamais d'exemple`

      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          reasoning_effort: 'low',
          messages: [
            { role: 'system', content: 'Réponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
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
          zone: normaliserZone(c.zone),
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
      zone: l.zone || 'plein',
    }))
    const { error } = await supabase.from('planning_terrains').insert(payload)
    setImporting(false)
    if (error) { alert('Erreur lors de l\'import : ' + error.message); return }
    setImportLignes([])
    setShowImport(false)
    await chargerPlanning()
  }

  // ── Libération / remplacement ponctuel (éducateur) ──────────────────────────
  // planning_terrains reste le gabarit récurrent (jamais modifié ici) ; toute
  // libération ou remplacement passe par une exception datée
  // (planning_terrains_exceptions), via les fonctions SECURITY DEFINER
  // dédiées (aucune policy UPDATE/INSERT n'est ouverte aux éducateurs sur ces
  // tables — RLS ne permet pas de restreindre une écriture à "seulement mes
  // propres créneaux/exceptions").
  const libererCreneauDate = async (creneau, dateStr, liberer) => {
    const cle = `${creneau.id}_${dateStr}`
    setLiberating(prev => ({ ...prev, [cle]: true }))
    const { error } = await supabase.rpc('liberer_creneau_date', { p_creneau_id: creneau.id, p_date: dateStr, p_liberer: liberer })
    setLiberating(prev => ({ ...prev, [cle]: false }))
    if (error) { alert('Erreur : ' + error.message); return }
    await chargerExceptions(semaineOffset)
  }

  const reclamerCreneauDate = async (creneau, dateStr) => {
    const cle = `${creneau.id}_${dateStr}`
    setReclamingId(cle)
    const { error } = await supabase.rpc('reclamer_creneau_date', { p_creneau_id: creneau.id, p_date: dateStr })
    setReclamingId(null)
    if (error) { alert('Erreur : ' + error.message); return }
    await chargerExceptions(semaineOffset)
  }

  // Dirigeant uniquement : annule une exception (le créneau de base reprend
  // pour cette date) — accès direct autorisé par RLS (policy dirigeant), pas
  // besoin d'une fonction dédiée comme pour les éducateurs.
  const supprimerException = async (exceptionId) => {
    if (!confirm('Supprimer cette exception ? Le créneau de base reprendra pour cette date.')) return
    await supabase.from('planning_terrains_exceptions').delete().eq('id', exceptionId)
    await chargerExceptions(semaineOffset)
  }

  const nomEducateur = (educateurId) => {
    const e = educateurs.find(x => x.educateur_id === educateurId)
    return e ? `${e.educateur?.prenom || ''} ${e.educateur?.nom || ''}`.trim() : ''
  }

  const creneauxDuJour = (jour) => planning
    .filter(c => c.terrain_id === terrainActif && c.jour === jour)
    .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))

  // Seulement les matchs affectés au terrain actif — un match sans terrain
  // n'apparaît plus ici (cf. matchsSansTerrainSemaine, liste à part).
  const matchsDuJour = (dateStr) => matchsSemaine
    .filter(m => m.date === dateStr && m.terrain_id === terrainActif)
    .sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))

  const matchsSansTerrainSemaine = matchsSemaine
    .filter(m => !m.terrain_id)
    .sort((a, b) => a.date === b.date ? (a.heure || '').localeCompare(b.heure || '') : a.date.localeCompare(b.date))

  // Fusionne un créneau du gabarit avec son exception (s'il y en a une) pour
  // UNE date précise — vue "effective" utilisée uniquement pour l'affichage
  // et la détection de conflit, jamais persistée telle quelle.
  const creneauPourDate = (c, dateStr) => {
    const exception = exceptions.find(e => e.creneau_id === c.id && e.date_exception === dateStr)
    if (!exception) return { ...c, exception: null, libere: false, estRemplacement: false }
    if (exception.type === 'liberation') {
      return { ...c, exception, libere: true, libere_par: exception.libere_par, estRemplacement: false }
    }
    // remplacement : une autre équipe occupe ce créneau, ce jour-là uniquement
    return { ...c, exception, libere: false, estRemplacement: true, equipe: exception.equipe_remplacante || c.equipe, educateur_id: exception.educateur_id }
  }

  // Conflits d'un match sur un terrain donné, à sa date/heure — contre les
  // créneaux récurrents (gabarit, exceptions incluses) ET les autres matchs
  // du même terrain/jour. Règle métier : un terrain "foot à 11" est occupé en
  // entier par un match (toute zone confondue, y compris demi-A/demi-B —
  // un vrai match prend toute la largeur même si l'entraînement s'y partage
  // habituellement en demi-terrains) ; les autres formats (foot à 8, 5 contre
  // 5) suivent la même règle de partage par zone que les créneaux entre eux
  // (le match, qui n'a pas de zone, est traité comme "plein").
  const conflitsMatch = (match, terrainId) => {
    if (!terrainId || !match.heure) return []
    const terrain = terrains.find(t => t.id === terrainId)
    const ignorerZone = terrain?.type === 'foot_11'
    const jour = jourDepuisDate(match.date)
    const horaireMatch = { heure_debut: match.heure, heure_fin: heureFinMatch(match.heure) }

    const conflitsCreneaux = planning
      .filter(c => c.terrain_id === terrainId && c.jour === jour)
      .map(c => creneauPourDate(c, match.date))
      .filter(c => !c.libere && (ignorerZone || (c.zone || 'plein') === 'plein') && seChevauchent(horaireMatch, c))

    const conflitsAutresMatchs = matchsSemaine
      .filter(m => m.id !== match.id && m.terrain_id === terrainId && m.date === match.date && m.heure)
      .filter(m => seChevauchent(horaireMatch, { heure_debut: m.heure, heure_fin: heureFinMatch(m.heure) }))

    return [...conflitsCreneaux, ...conflitsAutresMatchs]
  }

  const [assigningMatchId, setAssigningMatchId] = useState(null)

  // Passe par la RPC affecter_terrain_match plutôt qu'un .update() direct :
  // matchs_equipe n'autorise en écriture que l'éducateur propriétaire du match
  // (cf. policy "educateur_matchs"), pas le club — la RPC (security definer)
  // vérifie elle-même que l'appelant a le droit ('terrains' can_edit ou
  // président) avant de ne toucher qu'à terrain_id.
  const assignerTerrainMatch = async (match, terrainId) => {
    if (!terrainId) {
      const { error } = await supabase.rpc('affecter_terrain_match', { p_match_id: match.id, p_terrain_id: null })
      if (error) { alert('Erreur : ' + error.message); return }
      setMatchsSemaine(prev => prev.map(m => m.id === match.id ? { ...m, terrain_id: null } : m))
      return
    }
    const conflits = conflitsMatch(match, terrainId)
    if (conflits.length > 0) {
      const noms = conflits.map(c => c.equipe || c.adversaire || 'créneau').join(', ')
      if (!window.confirm(`⚠️ Ce terrain est déjà occupé à cet horaire par : ${noms}.\n\nAffecter quand même ?`)) return
    }
    setAssigningMatchId(match.id)
    const { error } = await supabase.rpc('affecter_terrain_match', { p_match_id: match.id, p_terrain_id: terrainId })
    setAssigningMatchId(null)
    if (error) { alert('Erreur : ' + error.message); return }
    setMatchsSemaine(prev => prev.map(m => m.id === match.id ? { ...m, terrain_id: terrainId } : m))
  }

  // conflit = un autre créneau du même terrain/jour, sur la MÊME zone, à un
  // horaire qui se chevauche — deux zones différentes (ex: demi-A/demi-B)
  // se partagent légitimement le terrain, ce n'est pas un conflit. Un
  // créneau libéré pour cette date ne compte pas dans les conflits (le
  // terrain est effectivement libre à cet horaire-là).
  // cBase = ligne du gabarit récurrent (planning_terrains) ; dateStr = date
  // précise affichée ; listeBase = tous les créneaux du gabarit de ce
  // terrain/jour, pour la détection de conflit une fois fusionnés eux aussi.
  const renderCreneauCard = (cBase, dateStr, listeBase = []) => {
    const c = creneauPourDate(cBase, dateStr)
    const liste = listeBase.map(x => creneauPourDate(x, dateStr))
    const cle = `${cBase.id}_${dateStr}`
    const zone = c.zone || 'plein'
    const enConflit = !c.libere && liste.some(autre => autre.id !== c.id && !autre.libere && (autre.zone || 'plein') === zone && seChevauchent(c, autre))
    const couleurBord = zone !== 'plein' ? couleurZone(zone, accentColor) : (c.libere ? accentColor : '#1a1a1a')
    return (
      <div key={c.id} style={{
        background: c.libere ? accentColor + '10' : '#0a0a0a',
        border: `1px solid ${enConflit ? '#ef4444' : (c.libere ? accentColor + '40' : '#1a1a1a')}`,
        borderLeft: `3px solid ${enConflit ? '#ef4444' : couleurBord}`,
        borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: c.libere ? accentColor : '#fff' }}>
            {c.heure_debut?.slice(0, 5)} – {c.heure_fin?.slice(0, 5)}
          </p>
          {zone !== 'plein' && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: couleurZone(zone, accentColor), background: couleurZone(zone, accentColor) + '18', border: `1px solid ${couleurZone(zone, accentColor)}40`, borderRadius: '10px', padding: '1px 7px', whiteSpace: 'nowrap' }}>
              {ZONES.find(z => z.val === zone)?.label || zone}
            </span>
          )}
        </div>
        {enConflit && (
          <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>⚠️ Même zone qu'un autre créneau à cet horaire</p>
        )}
        {c.libere ? (
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: accentColor }}>Disponible ce jour — libéré par {c.libere_par || 'un éducateur'}</p>
        ) : (
          <>
            {c.estRemplacement && (
              <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 700, color: '#fbbf24', background: '#fbbf2418', border: '1px solid #fbbf2440', borderRadius: '10px', padding: '1px 7px', margin: '4px 0 0' }}>
                Remplacement ce jour
              </span>
            )}
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {couleurEquipe(c.equipe, categories) && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: couleurEquipe(c.equipe, categories), flexShrink: 0 }} />
              )}
              {c.equipe || '—'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{nomEducateur(c.educateur_id) || '—'}</p>
          </>
        )}

        {estDirigeant && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button onClick={() => setFormCreneau({ id: cBase.id, terrain_id: cBase.terrain_id, equipe: cBase.equipe || '', educateur_id: cBase.educateur_id || '', jour: cBase.jour, heure_debut: cBase.heure_debut?.slice(0, 5) || '', heure_fin: cBase.heure_fin?.slice(0, 5) || '', zone: cBase.zone || 'plein' })}
              style={{ background: '#ffffff10', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
            <button onClick={() => supprimerCreneau(cBase.id)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px' }}>✕</button>
            {c.exception && (
              <button onClick={() => supprimerException(c.exception.id)} title="Supprimer cette exception — le créneau de base reprend"
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid #2a2a2a', color: '#888', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer' }}>
                ↩ exception
              </button>
            )}
          </div>
        )}

        {mode === 'educateur' && cBase.educateur_id === userId && !c.estRemplacement && (
          <button onClick={() => libererCreneauDate(cBase, dateStr, !c.libere)} disabled={liberating[cle]}
            style={{ marginTop: '8px', width: '100%', background: c.libere ? '#1a1a1a' : accentColor, color: c.libere ? '#aaa' : '#000', border: c.libere ? '1px solid #2a2a2a' : 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {liberating[cle] ? '...' : c.libere ? 'Annuler la libération' : 'Libérer ce jour'}
          </button>
        )}

        {mode === 'educateur' && c.libere && cBase.educateur_id !== userId && (
          <button onClick={() => reclamerCreneauDate(cBase, dateStr)} disabled={reclamingId === cle}
            style={{ marginTop: '8px', width: '100%', background: accentColor, color: '#000', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {reclamingId === cle ? '...' : 'Prendre ce créneau'}
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
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Zone</th>
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
                                <td style={{ padding: '6px 10px' }}>
                                  <select style={{ ...st.input, minWidth: '120px' }} value={l.zone || 'plein'} onChange={e => modifierLigneImport(l._id, 'zone', e.target.value)}>
                                    {ZONES.map(z => <option key={z.val} value={z.val}>{z.label}</option>)}
                                  </select>
                                </td>
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
                      <input style={st.input} type="time" min={heuresClub.ouverture} max={heuresClub.fermeture} value={formCreneau.heure_debut} onChange={e => setFormCreneau(f => ({ ...f, heure_debut: e.target.value }))} />
                    </div>
                    <div>
                      <label style={st.label}>Heure fin</label>
                      <input style={st.input} type="time" min={heuresClub.ouverture} max={heuresClub.fermeture} value={formCreneau.heure_fin} onChange={e => setFormCreneau(f => ({ ...f, heure_fin: e.target.value }))} />
                    </div>
                    <div>
                      <label style={st.label}>Équipe</label>
                      {categories.length > 0 ? (
                        <select style={st.input} value={formCreneau.equipe} onChange={e => setFormCreneau(f => ({ ...f, equipe: e.target.value }))}>
                          <option value="">—</option>
                          {categories.map(c => <option key={c.id} value={`${c.nom} ${c.equipe || ''}`.trim()}>{c.nom} {c.equipe}</option>)}
                        </select>
                      ) : (
                        <input style={st.input} value={formCreneau.equipe} onChange={e => setFormCreneau(f => ({ ...f, equipe: e.target.value }))} placeholder="Ex: U15 A" />
                      )}
                    </div>
                    <div>
                      <label style={st.label}>Éducateur</label>
                      <select style={st.input} value={formCreneau.educateur_id} onChange={e => setFormCreneau(f => ({ ...f, educateur_id: e.target.value }))}>
                        <option value="">—</option>
                        {educateurs.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>Zone occupée</label>
                      <select style={st.input} value={formCreneau.zone || 'plein'} onChange={e => setFormCreneau(f => ({ ...f, zone: e.target.value }))}>
                        {zonesDisponibles(terrains.find(t => t.id === formCreneau.terrain_id)?.type).map(z => <option key={z.val} value={z.val}>{z.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#555', margin: '-4px 0 12px' }}>
                    Horaires du club : {heuresClub.ouverture}–{heuresClub.fermeture}. Foot à 11 (U13+) : un demi-terrain par équipe (2 max sur un terrain plein). Foot à 5/futsal/U6-U11 : jusqu'à 5 zones sur un même terrain.
                  </p>
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

              {/* ── Navigation semaine — les libérations/remplacements affichés sont
                  ceux de la semaine visible uniquement (exceptions datées). ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <button onClick={() => setSemaineOffset(o => o - 1)}
                  style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', padding: '5px 12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  ‹
                </button>
                <span style={{ color: '#ccc', fontWeight: 600, fontSize: '13px' }}>
                  {(() => {
                    const dates = getDatesSemaine(semaineOffset)
                    return `${dates[0].labelCourt} – ${dates[6].labelCourt}`
                  })()}
                  {semaineOffset === 0 && <span style={{ color: accentColor, marginLeft: '8px', fontSize: '11px', fontWeight: 700 }}>Cette semaine</span>}
                </span>
                <button onClick={() => setSemaineOffset(o => o + 1)}
                  style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', padding: '5px 12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  ›
                </button>
                {semaineOffset !== 0 && (
                  <button onClick={() => setSemaineOffset(0)}
                    style={{ background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter, sans-serif' }}>
                    revenir à cette semaine
                  </button>
                )}
              </div>

              {matchsSansTerrainSemaine.length > 0 && (
                <div style={{ background: '#1a1505', border: '1px solid #facc1540', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#facc15' }}>⚠️ Matchs sans terrain assigné cette semaine</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchsSansTerrainSemaine.map(m => {
                      const cat = categories.find(c => c.educateur_id === m.educateur_id)
                      const edu = educateurs.find(e => e.educateur_id === m.educateur_id)
                      const nomEquipe = cat ? `${cat.nom} ${cat.equipe || ''}`.trim() : (edu ? `${edu.educateur?.prenom || ''} ${edu.educateur?.nom || ''}`.trim() : 'Équipe')
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                          <span style={{ color: '#ccc' }}>
                            {nomEquipe || 'Équipe'} · {m.domicile ? 'vs' : '@'} {m.adversaire || 'Match'} · {new Date(`${m.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{m.heure ? ` ${m.heure.slice(0, 5)}` : ''}
                          </span>
                          <select
                            disabled={assigningMatchId === m.id}
                            value=""
                            onChange={e => assignerTerrainMatch(m, e.target.value)}
                            style={{ ...st.input, width: 'auto', fontSize: '11px', padding: '4px 8px' }}>
                            <option value="" disabled>+ Affecter un terrain</option>
                            {terrains.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {loadingPlanning ? (
                <p style={{ color: '#444', fontSize: '13px' }}>Chargement du planning...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {getDatesSemaine(semaineOffset).map(j => {
                    const liste = creneauxDuJour(j.val)
                    const matchsJour = matchsDuJour(j.dateStr)
                    return (
                      <div key={j.val}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px', textAlign: 'center' }}>{j.label.slice(0, 3)}</p>
                        <p style={{ fontSize: '11px', color: '#333', margin: '0 0 8px', textAlign: 'center' }}>{j.labelCourt}</p>
                        {matchsJour.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                            {matchsJour.map(m => {
                              const cat = categories.find(c => c.educateur_id === m.educateur_id)
                              const edu = educateurs.find(e => e.educateur_id === m.educateur_id)
                              const nomEquipe = cat ? `${cat.nom} ${cat.equipe || ''}`.trim() : (edu ? `${edu.educateur?.prenom || ''} ${edu.educateur?.nom || ''}`.trim() : 'Équipe')
                              const couleur = cat?.couleur || couleurEquipe(nomEquipe, categories)
                              const conflits = conflitsMatch(m, terrainActif)
                              return (
                                <div key={m.id} style={{ background: `${couleur}18`, border: `1px solid ${couleur}44`, borderRadius: '8px', padding: '5px 7px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur, flexShrink: 0 }} />
                                    <span style={{ color: couleur, fontWeight: 700, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomEquipe || 'Équipe'}</span>
                                  </div>
                                  <p style={{ margin: '2px 0 0', color: '#888', fontSize: '9px' }}>
                                    ⚽ {m.domicile ? 'vs' : '@'} {m.adversaire || 'Match'}{m.heure ? ` · ${m.heure.slice(0, 5)}` : ''}
                                  </p>
                                  {conflits.length > 0 && (
                                    <p style={{ margin: '4px 0 0', fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>⚠️ Terrain déjà occupé à cet horaire</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {liste.length === 0 ? (
                          matchsJour.length === 0 && <p style={{ fontSize: '11px', color: '#333', textAlign: 'center' }}>—</p>
                        ) : (
                          liste.map(c => renderCreneauCard(c, j.dateStr, liste))
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
