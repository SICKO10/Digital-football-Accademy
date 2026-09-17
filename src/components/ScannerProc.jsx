import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { t } from '../lib/translations'
import { useColors } from '../lib/theme'
import { PRINCIPES_OFFENSIFS, PRINCIPES_DEFENSIFS } from '../constants/principesJeu'

const THEMES = [
  { valeur: 'Offensif', cle: 'biblio_theme_offensif' },
  { valeur: 'Défensif', cle: 'biblio_theme_defensif' },
  { valeur: 'Coup de pied arrêté', cle: 'biblio_theme_cpa' },
  { valeur: 'Gardien de but', cle: 'biblio_theme_gardien' },
  { valeur: 'Physique', cle: 'biblio_theme_physique' },
  { valeur: 'Sans thème', cle: 'biblio_theme_sans' },
]
const CATEGORIES_AGE = ['Pour tous', 'U6-U7', 'U8-U9', 'U10-U11', 'U12-U13', 'U14-U15', 'U16-U17', 'U18-U19', 'Senior']

// Gemini répond en texte libre pour theme/categorie_age — on rattache au plus
// proche de nos valeurs canoniques (stockées telles quelles en base) plutôt
// que de forcer l'utilisateur à tout ressaisir si la formulation diffère
// légèrement (ex: "U12" au lieu de "U12-U13").
const normaliser = (valeur, options) => {
  if (!valeur) return ''
  const v = String(valeur).toLowerCase()
  const trouve = options.find(o => o.toLowerCase() === v || v.includes(o.toLowerCase()) || o.toLowerCase().includes(v))
  return trouve || ''
}

const PROCEDE_SCAN_VIDE = { nom: '', theme: '', principe: '', categorie_age: '', nb_joueurs: '', duree: '', but: '', organisation: '', consignes: '', variables: '', criteres_realisation: '', partage_platform: true, schema_data: null }

// Terrain de référence pour convertir les positions % renvoyées par Gemini en
// coordonnées absolues — Tactipad stocke terrain.w/h dans le schéma et
// rescale tout seul vers la taille réelle du canvas au chargement (cf.
// rescaleElements dans Tactipad.jsx), donc n'importe quelle taille de
// référence fixe fonctionne ici.
const TERRAIN_W = 800
const TERRAIN_H = 500
const COULEURS_HEX = {
  noir: '#1a1a1a', bleu: '#3b82f6', rouge: '#ef4444', jaune: '#eab308',
  orange: '#f97316', vert: '#22c55e', blanc: '#ffffff', violet: '#a78bfa',
}
const LETTRES_EQUIPE = ['A', 'B', 'C', 'D']

// Convertit le schema_data (positions en %, vocabulaire libre pour Gemini)
// vers le format natif attendu par Tactipad.initialSchema — cf. `schema` construit
// dans validerSchema() côté Tactipad.jsx (terrain/elements/sequences/equipesCouleurs).
// Une couleur détectée = une équipe (A/B/C/D, dans l'ordre d'apparition) avec
// equipesCouleurs personnalisé, pour garder les couleurs vues sur la photo.
const convertirSchemaScan = (schemaData) => {
  const brut = schemaData?.elements
  if (!Array.isArray(brut) || brut.length === 0) return null

  const lettreParCouleur = {}
  const equipesCouleurs = {}
  const lettrePourCouleur = (couleur) => {
    const cle = couleur || 'vert'
    if (lettreParCouleur[cle]) return lettreParCouleur[cle]
    const lettre = LETTRES_EQUIPE[Object.keys(lettreParCouleur).length] || 'A'
    lettreParCouleur[cle] = lettre
    equipesCouleurs[lettre] = COULEURS_HEX[cle] || '#4ade80'
    return lettre
  }
  const px = (v) => (Number(v) || 0) / 100 * TERRAIN_W
  const py = (v) => (Number(v) || 0) / 100 * TERRAIN_H

  const elements = brut.map((el, i) => {
    const id = `scan_${i}_${Math.random().toString(36).slice(2, 7)}`
    if (el.type === 'joueur') {
      return { id, type: 'joueur', equipe: lettrePourCouleur(el.couleur), gardien: false, numero: '', nom: '', x: px(el.x), y: py(el.y) }
    }
    if (el.type === 'ballon') {
      return { id, type: 'objet', kind: 'ballon', rotation: 0, x: px(el.x), y: py(el.y) }
    }
    if (el.type === 'but') {
      return { id, type: 'objet', kind: 'petite_cage', rotation: el.orientation === 'vertical' ? 90 : 0, x: px(el.x), y: py(el.y) }
    }
    if (el.type === 'fleche') {
      return { id, type: 'fleche', style: el.style === 'course' ? 'pointillee' : 'droite', points: [px(el.x1), py(el.y1), px(el.x2), py(el.y2)], color: '#ffffff' }
    }
    return null
  }).filter(Boolean)

  if (elements.length === 0) return null
  return { terrain: { sport: 'football', vue: 'complet', fond: 'vert', w: TERRAIN_W, h: TERRAIN_H }, elements, sequences: [elements], equipesCouleurs }
}

// Redimensionne (sans jamais agrandir) avant envoi à l'Edge Function — une
// photo de téléphone brute (souvent plusieurs Mo, 3000-4000px de large)
// dépasse la limite de taille de requête et fait planter scan-procede avec
// un 500 avant même d'atteindre Gemini. Même approche que les scans côté
// DashboardEducateur.jsx (redimensionnerImagePourScan).
const redimensionnerImage = (file, maxWidth = 1600) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve({ base64: dataUrl.split(',')[1], preview: dataUrl })
    }
    img.onerror = reject
    img.src = ev.target.result
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function ScannerProc({ userId, clubId, lang, onImporte, onFermer }) {
  const colors = useColors()
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef()

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setResultat(null)
    setErreur(null)
    try {
      const { base64, preview } = await redimensionnerImage(file)
      setImage(preview)
      setImageBase64(base64)
    } catch {
      setErreur(`❌ ${t('scanproc_image_illisible', lang)}`)
    }
  }

  const analyser = async () => {
    if (!imageBase64) return
    setScanning(true)
    setErreur(null)
    try {
      const { data, error } = await supabase.functions.invoke('scan-procede', {
        body: { imageBase64, mimeType: 'image/jpeg' }, // recompressée en JPEG par redimensionnerImage, quel que soit le format d'origine
      })
      if (error) {
        // Sur un statut non-2xx, error.message du client Supabase reste générique
        // ("Edge Function returned a non-2xx status code") — le vrai message
        // renvoyé par la fonction vit dans error.context (la Response brute).
        let detail = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) detail = body.error
          if (body?.stack) console.error('scan-procede stack:', body.stack)
        } catch { /* corps non-JSON, on garde error.message */ }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.error)
      const p = data.procede || {}
      const theme = normaliser(p.theme, THEMES.map(th => th.valeur))
      setResultat({
        ...PROCEDE_SCAN_VIDE,
        nom: p.nom || '',
        theme,
        principe: normaliser(p.principe_jeu, [...PRINCIPES_OFFENSIFS, ...PRINCIPES_DEFENSIFS].map(pr => pr.label)),
        categorie_age: normaliser(p.categorie_age, CATEGORIES_AGE) || 'Pour tous',
        nb_joueurs: p.nb_joueurs != null ? String(p.nb_joueurs) : '',
        duree: p.duree != null ? String(p.duree) : '',
        but: p.but || '',
        organisation: p.organisation || '',
        consignes: p.consignes || '',
        variables: p.variables || '',
        criteres_realisation: p.criteres_realisation || '',
        schema_data: convertirSchemaScan(p.schema_data),
      })
    } catch (e) {
      const brut = e.message || ''
      // Retries déjà tentés côté Edge Function (scan-procede) — un 429/quota
      // ou un 503 qui remonte jusqu'ici signifie qu'ils sont épuisés, pas un
      // vrai échec de lecture : message dédié plutôt que le message technique
      // brut, différent selon la cause (saturation temporaire vs quota).
      const sature = /\b429\b/.test(brut) || /quota/i.test(brut)
      const surcharge = /\b503\b/.test(brut) || /UNAVAILABLE/i.test(brut)
      setErreur(
        sature ? `⏳ ${t('scanproc_erreur_saturation', lang)}`
        : surcharge ? `⚠️ ${t('scanproc_erreur_surcharge', lang)}`
        : `❌ ${t('scanproc_erreur_prefix', lang)}${brut}`
      )
    } finally {
      setScanning(false)
    }
  }

  const sauvegarder = async () => {
    if (!resultat || !resultat.nom.trim()) return
    setSaving(true)
    const { error } = await supabase.from('bibliotheque_exercices').insert({
      type: 'exercice',
      educateur_id: userId,
      club_id: clubId || null,
      nom: resultat.nom.trim(),
      theme: resultat.theme || null,
      principe_jeu: resultat.principe || null,
      categorie_age: resultat.categorie_age || 'Pour tous',
      nb_joueurs: resultat.nb_joueurs || '',
      duree: resultat.duree ? parseInt(resultat.duree) : null,
      but: resultat.but || '',
      organisation: resultat.organisation || '',
      consignes: resultat.consignes || '',
      variables: resultat.variables || '',
      criteres_realisation: resultat.criteres_realisation || '',
      tags: '',
      partage_club: true,
      partage_platform: resultat.partage_platform,
      schema_data: resultat.schema_data || null,
    })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    onImporte?.()
  }

  const champLabel = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }
  const champInput = { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }
  const pastille = (actif) => ({ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, background: actif ? colors.accent.green + '20' : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontSize: '13px', cursor: 'pointer', fontWeight: actif ? 700 : 400, fontFamily: 'Inter, sans-serif' })

  const champsTexte = [
    { key: 'but', label: t('seance_but', lang) },
    { key: 'organisation', label: t('seance_organisation', lang) },
    { key: 'consignes', label: t('seance_consignes', lang) },
    { key: 'variables', label: t('seance_variables', lang) },
    { key: 'criteres_realisation', label: t('seance_criteres_realisation', lang) },
  ]

  return (
    <div style={{ padding: '4px', maxWidth: '560px', width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ color: colors.text.primary, margin: 0, fontSize: '18px', fontWeight: 800 }}>📸 {t('scanproc_titre', lang)}</h2>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>{t('scanproc_sous_titre', lang)}</p>
      </div>

      <div onClick={() => inputRef.current.click()}
        style={{ border: `2px dashed ${colors.border.default}`, borderRadius: '12px', padding: '26px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px' }}>
        {image
          ? <img src={image} alt="Fiche" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', objectFit: 'contain' }} />
          : (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <div style={{ color: colors.text.dim, fontSize: '14px', fontWeight: 600 }}>{t('scanproc_zone_texte', lang)}</div>
              <div style={{ color: colors.text.disabled, fontSize: '12px', marginTop: '4px' }}>{t('scanproc_zone_sous_texte', lang)}</div>
            </div>
          )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
      </div>

      {image && !resultat && (
        <button onClick={analyser} disabled={scanning}
          style={{ width: '100%', background: scanning ? colors.background.raised : colors.accent.green, border: 'none', borderRadius: '10px', padding: '14px', color: scanning ? colors.text.disabled : colors.black, fontWeight: 800, fontSize: '15px', cursor: scanning ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          {scanning ? `🔍 ${t('scanproc_analyse_en_cours', lang)}` : `🤖 ${t('scanproc_analyser', lang)}`}
        </button>
      )}

      {erreur && (
        <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', marginTop: '12px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>{erreur}</span>
          <button onClick={analyser} style={{ background: 'none', border: '1px solid #ef4444', borderRadius: '6px', padding: '4px 10px', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>{t('scanproc_reessayer', lang)}</button>
        </div>
      )}

      {resultat && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
          <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '13px', marginBottom: '16px' }}>✅ {t('scanproc_detecte', lang)}</div>

          {resultat.schema_data && (
            <div style={{ background: colors.accent.blue + '15', border: `1px solid ${colors.accent.blue}30`, borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: colors.accent.blue, fontSize: '12px' }}>
              🎨 Schéma tactique détecté ({resultat.schema_data.elements.length} élément{resultat.schema_data.elements.length > 1 ? 's' : ''}) — ajustable après enregistrement via « Modifier le schéma ».
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={champLabel}>{t('biblio_nom_procede', lang)} *</label>
            <input value={resultat.nom} onChange={e => setResultat(r => ({ ...r, nom: e.target.value }))} style={champInput} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={champLabel}>{t('biblio_champ_theme', lang)}</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {THEMES.map(th => (
                <button key={th.valeur} type="button" onClick={() => setResultat(r => ({ ...r, theme: th.valeur, principe: '' }))} style={pastille(resultat.theme === th.valeur)}>
                  {t(th.cle, lang)}
                </button>
              ))}
            </div>
          </div>

          {(resultat.theme === 'Offensif' || resultat.theme === 'Défensif') && (
            <div style={{ marginBottom: '14px' }}>
              <label style={champLabel}>{t('biblio_principe_label', lang)}</label>
              <select value={resultat.principe} onChange={e => setResultat(r => ({ ...r, principe: e.target.value }))} style={champInput}>
                <option value="">{t('biblio_choisir_principe', lang)}</option>
                {(resultat.theme === 'Offensif' ? PRINCIPES_OFFENSIFS : PRINCIPES_DEFENSIFS).map(p => (
                  <option key={p.id} value={p.label}>{t(`principe_${p.id}`, lang)}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={champLabel}>{t('biblio_categorie_age_label', lang)}</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES_AGE.map(c => (
                <button key={c} type="button" onClick={() => setResultat(r => ({ ...r, categorie_age: c }))} style={pastille(resultat.categorie_age === c)}>
                  {c === 'Pour tous' ? t('biblio_age_pour_tous', lang) : c === 'Senior' ? t('biblio_age_senior', lang) : c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={champLabel}>{t('seance_duree_min', lang)}</label>
              <input type="number" value={resultat.duree} onChange={e => setResultat(r => ({ ...r, duree: e.target.value }))} style={champInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={champLabel}>{t('seance_nb_joueurs', lang)}</label>
              <input value={resultat.nb_joueurs} onChange={e => setResultat(r => ({ ...r, nb_joueurs: e.target.value }))} style={champInput} />
            </div>
          </div>

          {champsTexte.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: '14px' }}>
              <label style={champLabel}>{label}</label>
              <textarea value={resultat[key]} onChange={e => setResultat(r => ({ ...r, [key]: e.target.value }))} rows={2} style={{ ...champInput, resize: 'vertical' }} />
            </div>
          ))}

          <div style={{ background: colors.accent.green + '15', border: `1px solid ${colors.accent.green}30`, borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input type="checkbox" id="scanproc-partage" checked={resultat.partage_platform}
              onChange={e => setResultat(r => ({ ...r, partage_platform: e.target.checked }))}
              style={{ marginTop: '2px', accentColor: colors.accent.green, width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="scanproc-partage" style={{ cursor: 'pointer' }}>
              <div style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 700 }}>{t('biblio_partage_communaute_titre', lang)}</div>
              <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>{t('biblio_partage_communaute_desc', lang)}</div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onFermer && (
              <button onClick={onFermer} style={{ flex: 1, background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px', color: colors.text.faint, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {t('btn_annuler', lang)}
              </button>
            )}
            <button onClick={sauvegarder} disabled={saving || !resultat.nom.trim()}
              style={{ flex: 2, background: saving || !resultat.nom.trim() ? colors.background.raised : colors.accent.green, border: 'none', borderRadius: '10px', padding: '12px', color: saving || !resultat.nom.trim() ? colors.text.disabled : colors.black, fontWeight: 800, fontSize: '14px', cursor: saving || !resultat.nom.trim() ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
              💾 {t('biblio_sauvegarder_bouton', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
