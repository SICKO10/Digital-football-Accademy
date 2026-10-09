import { demanderSignatureMontage } from '../lib/signatureUpload'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

// Outil "Montage Vidéo" (forfait Pro, cf. supabase_montage_video.sql) — le
// gate Pro (profil.plan === 'joueur_pro') est géré par l'appelant
// (DashboardJoueur.jsx, même pattern que NutritionDashboard), pas ici.
//
// Génération : asynchrone côté Cloudinary (api/generer-montage.js +
// api/webhook-montage.js) — ce composant lance la génération puis sonde
// montages_joueur.statut toutes les 5s tant qu'il est à 'generation',
// plutôt que d'attendre une réponse synchrone (la concaténation de
// plusieurs clips vidéo peut prendre largement plus longtemps que le
// temps d'exécution autorisé d'une fonction Vercel).
export default function MontageVideo({ joueurId }) {
  const colors = useColors()
  const [clips, setClips] = useState([])
  const [montage, setMontage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [erreurUpload, setErreurUpload] = useState('')
  const [clipActif, setClipActif] = useState(null)
  const [overlayNom, setOverlayNom] = useState(true)
  const [lancement, setLancement] = useState(false)
  const pollRef = useRef(null)

  const demarrerPolling = () => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data: m } = await supabase.from('montages_joueur').select('*').eq('joueur_id', joueurId).eq('saison', saisonActuelle()).maybeSingle()
      if (m && m.statut !== 'generation') { clearInterval(pollRef.current); setMontage(m) }
      else if (m) setMontage(m)
    }, 5000)
  }

  const charger = async () => {
    const saison = saisonActuelle()
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('montage_clips').select('*').eq('joueur_id', joueurId).eq('saison', saison).order('ordre', { ascending: true }),
      supabase.from('montages_joueur').select('*').eq('joueur_id', joueurId).eq('saison', saison).maybeSingle(),
    ])
    setClips(c || [])
    setMontage(m || null)
    if (m) setOverlayNom(m.overlay_nom)
    if (m?.statut === 'generation') demarrerPolling()
  }

  useEffect(() => { charger(); return () => clearInterval(pollRef.current) }, [joueurId])

  // Au-delà d'environ 100 Mo, l'endpoint Cloudinary standard (un seul POST)
  // refuse la requête — il faut découper le fichier et l'envoyer par
  // morceaux (même endpoint, un header X-Unique-Upload-Id commun à tous les
  // morceaux + Content-Range par morceau ; Cloudinary réassemble et ne
  // renvoie secure_url que sur la réponse du dernier). Sans ça, un simple
  // relèvement de la limite d'affichage aurait laissé passer des fichiers
  // que l'upload aurait de toute façon rejetés.
  const CHUNK_SIZE = 20 * 1024 * 1024 // 20 Mo par morceau — recommandation Cloudinary, large tolérance tous plans
  const uploaderParMorceaux = (file, url, champs) => new Promise((resolve, reject) => {
    const uploadId = `df-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    let start = 0

    const envoyerMorceau = () => {
      const fin = Math.min(start + CHUNK_SIZE, file.size)
      const morceau = file.slice(start, fin)
      const formData = new FormData()
      Object.entries(champs).forEach(([k, v]) => formData.append(k, v))
      formData.append('file', morceau)

      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (!e.lengthComputable) return
        const envoye = start + e.loaded
        setProgress(10 + Math.round((envoye / file.size) * 85))
      }
      xhr.onload = () => {
        let res
        try { res = JSON.parse(xhr.responseText) } catch { reject(new Error('Réponse Cloudinary invalide')); return }
        if (xhr.status >= 400) { reject(new Error(res.error?.message || 'Upload échoué')); return }
        start = fin
        if (start >= file.size) resolve(res) // dernier morceau : réponse complète (secure_url, duration...)
        else envoyerMorceau()
      }
      xhr.onerror = () => reject(new Error('Erreur réseau'))
      xhr.open('POST', url)
      xhr.setRequestHeader('X-Unique-Upload-Id', uploadId)
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${fin - 1}/${file.size}`)
      xhr.send(formData)
    }
    envoyerMorceau()
  })

  const uploadClip = async (file) => {
    setErreurUpload('')
    if (file.size > 2 * 1024 * 1024 * 1024) { setErreurUpload('Fichier trop volumineux (max 2 Go).'); return }
    setUploading(true)
    setProgress(0)
    try {
      const sig = await demanderSignatureMontage(joueurId)
      setProgress(10)

      const resultat = await uploaderParMorceaux(
        file,
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
        Object.fromEntries(Object.entries(sig.params).map(([k, v]) => [k, String(v)]))
      )

      await supabase.from('montage_clips').insert({
        joueur_id: joueurId,
        cloudinary_public_id: resultat.public_id,
        cloudinary_url: resultat.secure_url,
        duree_secondes: resultat.duration,
        trim_debut: 0,
        trim_fin: resultat.duration,
        ordre: clips.length,
        saison: saisonActuelle(),
      })
      setProgress(100)
      await charger()
    } catch (e) {
      setErreurUpload(e.message || 'Erreur inconnue')
    }
    setUploading(false)
  }

  const sauvegarderTrim = async (clip, debut, fin) => {
    await supabase.from('montage_clips').update({ trim_debut: debut, trim_fin: fin }).eq('id', clip.id)
    setClipActif(null)
    charger()
  }

  const supprimerClip = async (id) => {
    await supabase.from('montage_clips').delete().eq('id', id)
    charger()
  }

  const deplacerClip = async (index, direction) => {
    const nouveaux = [...clips]
    const cible = index + direction
    if (cible < 0 || cible >= nouveaux.length) return
    ;[nouveaux[index], nouveaux[cible]] = [nouveaux[cible], nouveaux[index]]
    await Promise.all(nouveaux.map((c, i) => supabase.from('montage_clips').update({ ordre: i }).eq('id', c.id)))
    charger()
  }

  const genererMontage = async () => {
    if (clips.length === 0) return
    setLancement(true)
    const saison = saisonActuelle()
    let montageId = montage?.id
    if (montageId) {
      await supabase.from('montages_joueur').update({ overlay_nom: overlayNom, statut: 'generation', erreur_message: null }).eq('id', montageId)
    } else {
      const { data, error } = await supabase.from('montages_joueur').insert({ joueur_id: joueurId, saison, overlay_nom: overlayNom }).select().single()
      if (error) { setLancement(false); alert('Erreur : ' + error.message); return }
      montageId = data.id
    }
    const res = await fetch('/api/generer-montage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ montage_id: montageId, joueur_id: joueurId }),
    })
    setLancement(false)
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert('Erreur : ' + (err.error || 'génération impossible')); charger(); return }
    await charger()
    demarrerPolling()
  }

  const dureeTotale = clips.reduce((s, c) => s + ((c.trim_fin ?? c.duree_secondes ?? 0) - (c.trim_debut || 0)), 0)

  const st = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' },
    btnSolid: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '12px 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' },
    btnSecondary: { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Montage Vidéo</h1>
      <p style={{ color: colors.text.faint, fontSize: '13px', margin: '0 0 24px' }}>
        Upload tes meilleurs clips, définis les points de trim, génère ta compile — elle apparaîtra sur ta fiche recruteur.
      </p>

      {/* Montage prêt */}
      {montage?.statut === 'pret' && montage.cloudinary_url && (
        <div style={{ ...st.card, marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px', color: colors.accent.green, fontWeight: 800, fontSize: '14px' }}>✓ Ta compile est prête</p>
          <video controls style={{ width: '100%', borderRadius: '10px', maxHeight: '340px', background: colors.black }} src={montage.cloudinary_url} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <a href={montage.cloudinary_url} download style={{ ...st.btnSolid, textDecoration: 'none', display: 'inline-block' }}>Télécharger</a>
            <button onClick={() => navigator.clipboard.writeText(montage.cloudinary_url)} style={st.btnSecondary}>Copier le lien</button>
          </div>
        </div>
      )}

      {montage?.statut === 'generation' && (
        <div style={{ ...st.card, marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: colors.text.secondary, fontSize: '14px' }}>⏳ Génération en cours — ça peut prendre quelques minutes selon le nombre de clips.</p>
        </div>
      )}

      {montage?.statut === 'erreur' && (
        <div style={{ ...st.card, marginBottom: '20px', border: `1px solid ${colors.accent.red}40` }}>
          <p style={{ margin: 0, color: colors.accent.red, fontSize: '13px', fontWeight: 700 }}>La génération a échoué{montage.erreur_message ? ` : ${montage.erreur_message}` : '.'}</p>
        </div>
      )}

      {/* Upload */}
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: `2px dashed ${uploading ? colors.accent.green : colors.border.default}`,
        borderRadius: '14px', padding: '28px 20px', cursor: uploading ? 'default' : 'pointer',
        background: colors.background.surface, marginBottom: '20px',
      }}>
        <span style={{ color: colors.text.secondary, fontSize: '14px', fontWeight: 600 }}>
          {uploading ? `Upload ${progress}%...` : '+ Ajouter un clip vidéo'}
        </span>
        <span style={{ color: colors.text.faint, fontSize: '11px', marginTop: '4px' }}>MP4, MOV — max 2 Go</span>
        <input type="file" accept="video/mp4,video/mov,video/webm" style={{ display: 'none' }} disabled={uploading}
          onChange={e => e.target.files[0] && uploadClip(e.target.files[0])} />
      </label>
      {erreurUpload && <p style={{ color: colors.accent.red, fontSize: '13px', marginTop: '-12px', marginBottom: '20px' }}>{erreurUpload}</p>}

      {/* Liste des clips */}
      {clips.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {clips.length} clip{clips.length > 1 ? 's' : ''} — {Math.round(dureeTotale)}s au total
          </p>
          {clips.map((clip, i) => (
            <div key={clip.id} style={{ ...st.card, marginBottom: '8px', padding: '10px 14px', border: clipActif?.id === clip.id ? `1px solid ${colors.accent.green}` : st.card.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.text.faint, fontSize: '12px', fontWeight: 700 }}>#{i + 1}</span>
                <video src={clip.cloudinary_url} muted preload="metadata" style={{ width: '60px', height: '36px', objectFit: 'cover', borderRadius: '6px', background: colors.black, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: colors.text.faint, fontSize: '11px' }}>
                    {clip.trim_debut?.toFixed(1)}s → {(clip.trim_fin ?? clip.duree_secondes)?.toFixed(1)}s · {((clip.trim_fin ?? clip.duree_secondes ?? 0) - (clip.trim_debut || 0)).toFixed(1)}s
                  </p>
                </div>
                <button onClick={() => deplacerClip(i, -1)} disabled={i === 0} style={{ ...st.btnSecondary, padding: '4px 8px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => deplacerClip(i, 1)} disabled={i === clips.length - 1} style={{ ...st.btnSecondary, padding: '4px 8px', opacity: i === clips.length - 1 ? 0.3 : 1 }}>↓</button>
                <button onClick={() => setClipActif(clipActif?.id === clip.id ? null : clip)} style={{ ...st.btnSecondary, padding: '4px 10px', fontWeight: 700 }}>Trim</button>
                <button onClick={() => supprimerClip(clip.id)} style={{ background: 'transparent', color: colors.accent.red, border: 'none', cursor: 'pointer', fontSize: '15px' }}>✕</button>
              </div>
              {clipActif?.id === clip.id && <TrimEditor clip={clip} onSave={sauvegarderTrim} colors={colors} />}
            </div>
          ))}
        </div>
      )}

      {/* Options + génération */}
      {clips.length > 0 && (
        <div style={{ ...st.card, marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={overlayNom} onChange={e => setOverlayNom(e.target.checked)} />
            <span style={{ color: colors.text.secondary, fontSize: '13px' }}>Afficher mon nom sur la vidéo</span>
          </label>
        </div>
      )}

      {clips.length > 0 && (
        <button onClick={genererMontage} disabled={lancement || montage?.statut === 'generation'}
          style={{ ...st.btnSolid, width: '100%', padding: '14px 0', opacity: (lancement || montage?.statut === 'generation') ? 0.5 : 1 }}>
          {lancement ? 'Lancement...' : montage?.statut === 'pret' ? 'Régénérer ma compile' : `Générer ma compile (${clips.length} clip${clips.length > 1 ? 's' : ''})`}
        </button>
      )}
    </div>
  )
}

function TrimEditor({ clip, onSave, colors }) {
  const [debut, setDebut] = useState(clip.trim_debut || 0)
  const [fin, setFin] = useState(clip.trim_fin ?? clip.duree_secondes ?? 30)
  const duree = clip.duree_secondes || 60
  const videoRef = useRef(null)

  const previewPoint = (t) => { if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause() } }

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border.subtle}` }}>
      <video ref={videoRef} src={clip.cloudinary_url} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', marginBottom: '12px', background: colors.black }} />

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: colors.text.faint, fontSize: '11px' }}>Début : {debut.toFixed(1)}s</label>
          <button onClick={() => previewPoint(debut)} style={{ background: 'transparent', color: colors.accent.green, border: 'none', cursor: 'pointer', fontSize: '11px' }}>▶ Aperçu</button>
        </div>
        <input type="range" min={0} max={duree} step={0.1} value={debut} onChange={e => { const v = parseFloat(e.target.value); if (v < fin) setDebut(v) }} style={{ width: '100%', accentColor: colors.accent.green }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: colors.text.faint, fontSize: '11px' }}>Fin : {fin.toFixed(1)}s</label>
          <button onClick={() => previewPoint(fin)} style={{ background: 'transparent', color: colors.accent.green, border: 'none', cursor: 'pointer', fontSize: '11px' }}>▶ Aperçu</button>
        </div>
        <input type="range" min={0} max={duree} step={0.1} value={fin} onChange={e => { const v = parseFloat(e.target.value); if (v > debut) setFin(v) }} style={{ width: '100%', accentColor: colors.accent.green }} />
      </div>

      <p style={{ color: colors.text.faint, fontSize: '11px', margin: '0 0 12px' }}>Durée sélectionnée : <strong style={{ color: colors.accent.green }}>{(fin - debut).toFixed(1)}s</strong></p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSave(clip, debut, fin)} style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>Valider</button>
        <button onClick={() => onSave(clip, 0, clip.duree_secondes)} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}>Réinitialiser</button>
      </div>
    </div>
  )
}
