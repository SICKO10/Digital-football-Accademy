import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { envoyerImageStage } from '../../lib/stagesUpload'

// Onglet « Actualités » : publications affichées sur la page publique du
// stage (actualités, photos, objets oubliés). Toute l'équipe du stage peut
// publier, masquer ou supprimer.

const TYPES = {
  actualite: { label: 'Actualité', aide: 'Un message pour les familles : programme du jour, rappel, résultat…' },
  photo: { label: 'Photos', aide: 'Choisis une ou plusieurs photos : elles rejoignent la galerie publique.' },
  objet_perdu: { label: 'Objet oublié', aide: 'Un objet retrouvé sur place : ajoute une photo pour que la famille le reconnaisse.' },
}
const LIBELLES = { actualite: 'Actualité', photo: 'Photo', objet_perdu: 'Objet oublié', objet_retrouve: 'Objet récupéré' }

const dateHeure = (iso) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function StageActualites({ st, colors, accent, stage }) {
  const [posts, setPosts] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [type, setType] = useState('actualite')
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [filtre, setFiltre] = useState('tous')
  const [cleSelecteur, setCleSelecteur] = useState(0) // remet le sélecteur de fichiers à zéro après publication

  useEffect(() => {
    let annule = false
    supabase.from('stages_posts').select('*').eq('stage_id', stage.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (annule) return
        if (error) setErreur('Chargement impossible : ' + error.message)
        setPosts(data || [])
        setChargement(false)
      })
    return () => { annule = true }
  }, [stage.id])

  const publier = async () => {
    setErreur('')
    if (type === 'actualite' && !titre.trim() && !contenu.trim()) return setErreur('Écris un titre ou un message.')
    if (type === 'photo' && fichiers.length === 0) return setErreur('Choisis au moins une photo.')
    if (type === 'objet_perdu' && !titre.trim()) return setErreur('Décris l\'objet (ex. « Gourde bleue »).')
    setEnvoi(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const urls = []
      for (const f of (type === 'actualite' || type === 'objet_perdu' ? fichiers.slice(0, 1) : fichiers.slice(0, 20))) {
        urls.push(await envoyerImageStage(f, stage.club_id))
      }
      const lignes = type === 'photo'
        ? urls.map(url => ({ stage_id: stage.id, created_by: user.id, type, titre: titre.trim() || null, contenu: contenu.trim() || null, image_url: url }))
        : [{ stage_id: stage.id, created_by: user.id, type, titre: titre.trim() || null, contenu: contenu.trim() || null, image_url: urls[0] || null }]
      const { data, error } = await supabase.from('stages_posts').insert(lignes).select()
      if (error) throw error
      setPosts(prev => [...data, ...prev])
      setTitre(''); setContenu(''); setFichiers([]); setCleSelecteur(k => k + 1)
    } catch (e) {
      setErreur('Publication impossible : ' + e.message)
    }
    setEnvoi(false)
  }

  const modifier = async (p, champs) => {
    const { data, error } = await supabase.from('stages_posts').update(champs).eq('id', p.id).select().single()
    if (error) return setErreur(error.message)
    setPosts(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (p) => {
    if (!window.confirm('Supprimer définitivement cette publication ?')) return
    const { error } = await supabase.from('stages_posts').delete().eq('id', p.id)
    if (error) return setErreur(error.message)
    setPosts(prev => prev.filter(x => x.id !== p.id))
  }

  const visibles = posts.filter(p => filtre === 'tous' || (filtre === 'objets' ? p.type.startsWith('objet') : p.type === filtre))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={st.carte}>
        <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '15px', color: colors.text.primary }}>Publier sur la page du stage</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {Object.entries(TYPES).map(([id, t]) => (
            <button key={id} onClick={() => { setType(id); setErreur('') }} style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: type === id ? accent + '18' : 'transparent', border: `1px solid ${type === id ? accent + '60' : colors.border.default}`, color: type === id ? accent : colors.text.dim,
            }}>{t.label}</button>
          ))}
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: colors.text.faint }}>{TYPES[type].aide}</p>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div><label style={st.label}>{type === 'objet_perdu' ? 'Objet' : type === 'photo' ? 'Légende (facultatif)' : 'Titre'}</label><input value={titre} onChange={e => setTitre(e.target.value)} style={st.input} maxLength={120} /></div>
          {type !== 'photo' && <div><label style={st.label}>{type === 'objet_perdu' ? 'Où et quand (facultatif)' : 'Message'}</label><textarea rows={type === 'actualite' ? 4 : 2} value={contenu} onChange={e => setContenu(e.target.value)} style={{ ...st.input, resize: 'vertical' }} maxLength={2000} /></div>}
          <div>
            <label style={st.label}>{type === 'photo' ? 'Photos' : 'Photo (facultatif)'}</label>
            <input key={cleSelecteur} type="file" accept="image/*" multiple onChange={e => setFichiers(Array.from(e.target.files || []))} style={{ fontSize: '13px', color: colors.text.dim }} />
            {fichiers.length > 1 && <span style={{ fontSize: '12px', color: colors.text.faint, marginLeft: '8px' }}>{fichiers.length} photos</span>}
          </div>
        </div>
        {erreur && <p style={st.erreur}>{erreur}</p>}
        <button onClick={publier} disabled={envoi} style={{ ...st.boutonPlein, marginTop: '12px', opacity: envoi ? 0.6 : 1 }}>{envoi ? 'Publication…' : 'Publier'}</button>
      </div>

      <div style={st.carte}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {[['tous', 'Tout'], ['actualite', 'Actualités'], ['photo', 'Photos'], ['objets', 'Objets oubliés']].map(([id, label]) => (
            <button key={id} onClick={() => setFiltre(id)} style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: filtre === id ? accent + '18' : 'transparent', border: `1px solid ${filtre === id ? accent + '60' : colors.border.default}`, color: filtre === id ? accent : colors.text.dim,
            }}>{label}</button>
          ))}
        </div>
        {chargement ? <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>
          : visibles.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>Rien de publié pour l'instant.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {visibles.map(p => (
                <div key={p.id} style={{ background: colors.background.raised, borderRadius: '12px', overflow: 'hidden', opacity: p.visible ? 1 : 0.5, display: 'flex', flexDirection: 'column' }}>
                  {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover' }} loading="lazy" />}
                  <div style={{ padding: '10px 12px', flex: 1 }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: p.type === 'objet_perdu' ? '#facc15' : colors.text.faint }}>
                      {LIBELLES[p.type]}{!p.visible && ' · masquée'} · {dateHeure(p.created_at)}
                    </div>
                    {p.titre && <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary, marginTop: '4px' }}>{p.titre}</div>}
                    {p.contenu && <div style={{ fontSize: '12px', color: colors.text.dim, marginTop: '4px', whiteSpace: 'pre-line' }}>{p.contenu}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 12px 12px' }}>
                    {p.type === 'objet_perdu' && <button onClick={() => modifier(p, { type: 'objet_retrouve' })} style={{ ...st.bouton, padding: '4px 10px', fontSize: '12px' }}>Récupéré</button>}
                    <button onClick={() => modifier(p, { visible: !p.visible })} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>{p.visible ? 'Masquer' : 'Afficher'}</button>
                    <button onClick={() => supprimer(p)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
