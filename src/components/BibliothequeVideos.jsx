import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { extractYoutubeId, youtubeThumbnail } from '../lib/youtube'

const CATEGORIES = [
  { val: 'toutes', label: 'Toutes' },
  { val: 'technique', label: 'Technique' },
  { val: 'tactique', label: 'Tactique' },
  { val: 'physique', label: 'Physique' },
  { val: 'gardien', label: 'Gardien' },
  { val: 'mental', label: 'Mental' },
  { val: 'autre', label: 'Autre' },
]

// Classification supplémentaire réservée au contenu 'df' (Digital Football) —
// sans intérêt pour 'club'/'perso', qui n'ont pas cette organisation par
// thème de séance.
const THEMES_SEANCE = [
  { val: 'pressing', label: 'Pressing' },
  { val: 'transition', label: 'Transitions' },
  { val: 'jeu_position', label: 'Jeu en position' },
  { val: 'corner', label: 'Corners' },
  { val: 'coup_franc', label: 'Coups francs' },
  { val: 'gardien', label: 'Gardien' },
  { val: 'physique', label: 'Physique' },
  { val: 'technique_individuelle', label: 'Technique individuelle' },
  { val: 'autre', label: 'Autre' },
]

const TYPES_SEANCE = [
  { val: 'collectif', label: 'Collectif' },
  { val: 'individuel', label: 'Individuel' },
  { val: 'les_deux', label: 'Les deux' },
]

// type : 'df' | 'club' | 'perso' — portée réelle appliquée par la RLS de
// bibliotheque_videos (cf. supabase_bibliotheque_videos.sql), la requête
// ci-dessous ne fait que refléter côté client la même portée.
// clubId : requis si type='club' (profiles.id du club).
// proprietaireId : requis si type='perso' (profiles.id de l'éducateur).
// peutAjouter : contrôle l'affichage du bouton d'ajout — la RLS refuserait de
// toute façon une écriture hors-scope, mais autant ne pas montrer un bouton
// voué à échouer (ex: éducateur consultant la bibliothèque du club en lecture
// seule).
export default function BibliothequeVideos({ type, clubId = null, proprietaireId = null, peutAjouter = false, accentColor = '#4ade80' }) {
  const colors = useColors()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [videoActive, setVideoActive] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filtreCategorie, setFiltreCategorie] = useState('toutes')
  const [filtreTheme, setFiltreTheme] = useState('tous')
  const [filtreTypeSeance, setFiltreTypeSeance] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '', description: '', youtube_url: '',
    categorie: 'technique', theme_seance: 'autre', type_seance: 'collectif',
    tags: '', duree: '', visible_joueurs: false,
  })

  const chargerVideos = async () => {
    setLoading(true)
    let query = supabase.from('bibliotheque_videos').select('*').eq('type', type)
    if (type === 'club') query = query.eq('club_id', clubId)
    if (type === 'perso') query = query.eq('proprietaire_id', proprietaireId)
    const { data } = await query.order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if ((type === 'club' && !clubId) || (type === 'perso' && !proprietaireId)) return
    chargerVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, clubId, proprietaireId])

  const ajouterVideo = async () => {
    const youtubeId = extractYoutubeId(form.youtube_url)
    if (!youtubeId) { alert('URL YouTube invalide'); return }
    setSaving(true)
    const { error } = await supabase.from('bibliotheque_videos').insert({
      type,
      club_id: type === 'club' ? clubId : null,
      proprietaire_id: type === 'perso' ? proprietaireId : null,
      titre: form.titre,
      description: form.description || null,
      youtube_url: form.youtube_url,
      youtube_id: youtubeId,
      categorie: form.categorie,
      theme_seance: type === 'df' ? form.theme_seance : null,
      type_seance: type === 'df' ? form.type_seance : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      duree: form.duree || null,
      visible_joueurs: form.visible_joueurs,
    })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setForm({ titre: '', description: '', youtube_url: '', categorie: 'technique', theme_seance: 'autre', type_seance: 'collectif', tags: '', duree: '', visible_joueurs: false })
    setShowForm(false)
    chargerVideos()
  }

  const supprimerVideo = async (id) => {
    if (!confirm('Supprimer cette vidéo ?')) return
    const { error } = await supabase.from('bibliotheque_videos').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setVideoActive(null)
    chargerVideos()
  }

  const videosFiltrees = videos.filter(v => {
    const matchCat = filtreCategorie === 'toutes' || v.categorie === filtreCategorie
    const matchTheme = filtreTheme === 'tous' || v.theme_seance === filtreTheme
    const matchType = filtreTypeSeance === 'tous' || v.type_seance === filtreTypeSeance || v.type_seance === 'les_deux'
    const r = recherche.trim().toLowerCase()
    const matchRecherche = !r || v.titre.toLowerCase().includes(r) || v.description?.toLowerCase().includes(r)
    return matchCat && matchTheme && matchType && matchRecherche
  })

  // Regroupement par thème de séance — uniquement pour le contenu 'df',
  // seul type qui porte cette classification.
  const videosParTheme = type === 'df' ? THEMES_SEANCE.reduce((acc, th) => {
    const vids = videosFiltrees.filter(v => v.theme_seance === th.val)
    if (vids.length) acc.push({ ...th, videos: vids })
    return acc
  }, []) : null
  const videosSansTheme = type === 'df' ? videosFiltrees.filter(v => !v.theme_seance) : null

  const inputStyle = { background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif' }

  const renderCard = (video) => (
    <div key={video.id} onClick={() => setVideoActive(video)}
      style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: colors.background.sunken }}>
        <img src={youtubeThumbnail(video.youtube_id)} alt={video.titre}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {video.duree && (
          <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
            {video.duree}
          </span>
        )}
        {video.type_seance && (
          <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
            {TYPES_SEANCE.find(t => t.val === video.type_seance)?.label || video.type_seance}
          </span>
        )}
      </div>
      <div style={{ padding: '12px' }}>
        <p style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', margin: '0 0 4px', lineHeight: '1.3' }}>{video.titre}</p>
        {video.description && (
          <p style={{ color: colors.text.faint, fontSize: '11px', lineHeight: '1.4', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {video.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {video.categorie && (
            <span style={{ background: accentColor + '22', color: accentColor, borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
              {CATEGORIES.find(c => c.val === video.categorie)?.label || video.categorie}
            </span>
          )}
          {(video.tags || []).map((tag, i) => (
            <span key={i} style={{ background: colors.background.raised, color: colors.text.faint, borderRadius: '4px', padding: '2px 7px', fontSize: '10px' }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>
          {videos.length} vidéo{videos.length > 1 ? 's' : ''}
        </p>
        {peutAjouter && (
          <button onClick={() => setShowForm(v => !v)}
            style={{ background: accentColor, color: colors.black || '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            + Ajouter une vidéo
          </button>
        )}
      </div>

      {showForm && peutAjouter && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '22px', marginBottom: '24px' }}>
          <p style={{ color: colors.text.primary, margin: '0 0 18px', fontSize: '14px', fontWeight: 700 }}>Nouvelle vidéo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Titre de la vidéo" style={inputStyle} />
            <input value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              placeholder="URL YouTube (youtu.be/... ou youtube.com/watch?v=...)" style={inputStyle} />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optionnel)" rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box' }} />
          {type === 'df' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Thème de séance</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {THEMES_SEANCE.map(th => (
                    <button key={th.val} onClick={() => setForm(f => ({ ...f, theme_seance: th.val }))}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        background: form.theme_seance === th.val ? accentColor + '22' : 'transparent',
                        borderColor: form.theme_seance === th.val ? accentColor : colors.border.strong,
                        color: form.theme_seance === th.val ? accentColor : colors.text.faint }}>
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Type de séance</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {TYPES_SEANCE.map(ts => (
                    <button key={ts.val} onClick={() => setForm(f => ({ ...f, type_seance: ts.val }))}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        background: form.type_seance === ts.val ? colors.accent.blue + '22' : 'transparent',
                        borderColor: form.type_seance === ts.val ? colors.accent.blue : colors.border.strong,
                        color: form.type_seance === ts.val ? colors.accent.blue : colors.text.faint }}>
                      {ts.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
            <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} style={inputStyle}>
              {CATEGORIES.filter(c => c.val !== 'toutes').map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
            </select>
            <input value={form.duree} onChange={e => setForm(f => ({ ...f, duree: e.target.value }))}
              placeholder="Durée (ex: 3:42)" style={{ ...inputStyle, width: '100px' }} />
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="Tags (séparés par virgule)" style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
            {/* Sans intérêt pour 'df' : ces vidéos sont déjà visibles de tous
                quel que soit ce champ (cf. RLS bv_select). */}
            {type !== 'df' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.text.secondary, fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.visible_joueurs} onChange={e => setForm(f => ({ ...f, visible_joueurs: e.target.checked }))} style={{ accentColor }} />
                Visible par les joueurs
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
            <button onClick={ajouterVideo} disabled={!form.titre || !form.youtube_url || saving}
              style={{ background: accentColor, color: '#000', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: (!form.titre || !form.youtube_url || saving) ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher..." style={{ ...inputStyle, width: '200px' }} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.val} onClick={() => setFiltreCategorie(cat.val)}
              style={{
                padding: '6px 12px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: filtreCategorie === cat.val ? accentColor + '22' : 'transparent',
                borderColor: filtreCategorie === cat.val ? accentColor : colors.border.strong,
                color: filtreCategorie === cat.val ? accentColor : colors.text.faint,
              }}>
              {cat.label}
            </button>
          ))}
        </div>
        {type === 'df' && (
          <>
            <select value={filtreTheme} onChange={e => setFiltreTheme(e.target.value)} style={inputStyle}>
              <option value="tous">Tous les thèmes</option>
              {THEMES_SEANCE.map(th => <option key={th.val} value={th.val}>{th.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[{ val: 'tous', label: 'Tous' }, ...TYPES_SEANCE.filter(t => t.val !== 'les_deux')].map(t => (
                <button key={t.val} onClick={() => setFiltreTypeSeance(t.val)}
                  style={{ padding: '7px 13px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: filtreTypeSeance === t.val ? colors.accent.blue + '22' : 'transparent',
                    borderColor: filtreTypeSeance === t.val ? colors.accent.blue : colors.border.strong,
                    color: filtreTypeSeance === t.val ? colors.accent.blue : colors.text.faint }}>
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <p style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '40px' }}>Chargement...</p>
      ) : type === 'df' ? (
        <>
          {videosParTheme.map(groupe => (
            <div key={groupe.val} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px', margin: 0 }}>{groupe.label}</p>
                <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{groupe.videos.length} vidéo{groupe.videos.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {groupe.videos.map(renderCard)}
              </div>
            </div>
          ))}
          {videosSansTheme.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px', margin: 0 }}>Sans thème</p>
                <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{videosSansTheme.length} vidéo{videosSansTheme.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {videosSansTheme.map(renderCard)}
              </div>
            </div>
          )}
          {videosFiltrees.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: colors.text.disabled, fontSize: '14px' }}>
              Aucune vidéo
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {videosFiltrees.map(renderCard)}
          {videosFiltrees.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: colors.text.disabled, fontSize: '14px' }}>
              Aucune vidéo{filtreCategorie !== 'toutes' ? ' dans cette catégorie' : ''}
            </div>
          )}
        </div>
      )}

      {videoActive && (
        <div onClick={() => setVideoActive(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div>
                <p style={{ color: '#fff', margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>{videoActive.titre}</p>
                {videoActive.description && <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>{videoActive.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {peutAjouter && (
                  <button onClick={() => supprimerVideo(videoActive.id)}
                    style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', borderRadius: '8px', padding: '0 14px', height: '36px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Supprimer
                  </button>
                )}
                <button onClick={() => setVideoActive(null)}
                  style={{ background: '#1a1a1a', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}>×</button>
              </div>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoActive.youtube_id}?autoplay=1&rel=0`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
