import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { envoyerImageStage } from '../../lib/stagesUpload'
import { euros } from '../../lib/stages'

// Onglet « Sponsors » : partenaires du stage affichés sur la page publique
// (logo, lien, message). Le montant reste interne : il n'est jamais renvoyé
// par stage_public().

const VIDE = { nom: '', lien_url: '', message: '', montant: '', logo_url: '' }

export default function StageSponsors({ st, colors, stage }) {
  const [sponsors, setSponsors] = useState([])
  const [chargement, setChargement] = useState(true)
  const [edition, setEdition] = useState(null)
  const [fichier, setFichier] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    supabase.from('stages_sponsors').select('*').eq('stage_id', stage.id).order('created_at')
      .then(({ data, error }) => {
        if (annule) return
        if (error) setErreur('Chargement impossible : ' + error.message)
        setSponsors(data || [])
        setChargement(false)
      })
    return () => { annule = true }
  }, [stage.id])

  const enregistrer = async () => {
    const e = edition
    if (!e.nom.trim()) return setErreur('Indique le nom du sponsor.')
    const lien = e.lien_url.trim()
    if (lien && !/^https?:\/\//i.test(lien)) return setErreur('Le lien doit commencer par https://')
    const montant = String(e.montant).trim() === '' ? null : Number(String(e.montant).replace(',', '.'))
    if (montant !== null && !(montant >= 0)) return setErreur('Montant invalide.')
    setEnvoi(true); setErreur('')
    try {
      const logo_url = fichier ? await envoyerImageStage(fichier, stage.club_id) : (e.logo_url || null)
      const valeurs = { nom: e.nom.trim(), lien_url: lien || null, message: e.message.trim() || null, montant, logo_url }
      let resultat
      if (e.id) {
        resultat = await supabase.from('stages_sponsors').update(valeurs).eq('id', e.id).select().single()
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        resultat = await supabase.from('stages_sponsors').insert({ ...valeurs, stage_id: stage.id, created_by: user.id }).select().single()
      }
      if (resultat.error) throw resultat.error
      const data = resultat.data
      setSponsors(prev => e.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data])
      setEdition(null); setFichier(null)
    } catch (err) {
      setErreur('Enregistrement impossible : ' + err.message)
    }
    setEnvoi(false)
  }

  const basculer = async (s) => {
    const { data, error } = await supabase.from('stages_sponsors').update({ actif: !s.actif }).eq('id', s.id).select().single()
    if (error) return setErreur(error.message)
    setSponsors(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (s) => {
    if (!window.confirm(`Retirer le sponsor « ${s.nom} » ?`)) return
    const { error } = await supabase.from('stages_sponsors').delete().eq('id', s.id)
    if (error) return setErreur(error.message)
    setSponsors(prev => prev.filter(x => x.id !== s.id))
  }

  const total = sponsors.filter(s => s.actif).reduce((t, s) => t + Number(s.montant || 0), 0)

  return (
    <div style={st.carte}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: colors.text.primary }}>Sponsors du stage</p>
        {total > 0 && <span style={{ fontSize: '13px', color: colors.text.dim }}>Apport total : <strong style={{ color: colors.text.primary }}>{euros(total)}</strong> (interne)</span>}
      </div>
      <p style={{ margin: '4px 0 12px', fontSize: '12px', color: colors.text.faint }}>Logo, lien et message apparaissent sur la page publique. Le montant n'est jamais affiché.</p>

      {chargement ? <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sponsors.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', opacity: s.actif ? 1 : 0.5, flexWrap: 'wrap' }}>
              {s.logo_url ? <img src={s.logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff', borderRadius: 8 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: colors.background.surface }} />}
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{s.nom}{!s.actif && <span style={{ fontWeight: 400, color: colors.text.faint }}> · masqué</span>}</div>
                <div style={{ fontSize: '12px', color: colors.text.dim }}>{[s.montant ? euros(s.montant) : null, s.lien_url].filter(Boolean).join(' · ') || 'Aucun détail'}</div>
                {s.message && <div style={{ fontSize: '12px', color: colors.text.faint, marginTop: '2px' }}>« {s.message} »</div>}
              </div>
              <button onClick={() => { setErreur(''); setFichier(null); setEdition({ ...VIDE, ...s, lien_url: s.lien_url || '', message: s.message || '', montant: s.montant ?? '' }) }} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Modifier</button>
              <button onClick={() => basculer(s)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>{s.actif ? 'Masquer' : 'Afficher'}</button>
              <button onClick={() => supprimer(s)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Retirer</button>
            </div>
          ))}
        </div>
      )}

      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div><label style={st.label}>Nom *</label><input value={edition.nom} onChange={e => setEdition(p => ({ ...p, nom: e.target.value }))} style={st.input} /></div>
          <div><label style={st.label}>Lien (site, boutique)</label><input value={edition.lien_url} onChange={e => setEdition(p => ({ ...p, lien_url: e.target.value }))} style={st.input} placeholder="https://" /></div>
          <div><label style={st.label}>Montant (interne)</label><input type="number" min="0" step="0.01" value={edition.montant} onChange={e => setEdition(p => ({ ...p, montant: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Message affiché</label><input value={edition.message} onChange={e => setEdition(p => ({ ...p, message: e.target.value }))} style={st.input} maxLength={160} placeholder="Partenaire officiel du stage" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Logo</label><input type="file" accept="image/*" onChange={e => setFichier(e.target.files?.[0] || null)} style={{ fontSize: '13px', color: colors.text.dim }} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={enregistrer} disabled={envoi} style={{ ...st.boutonPlein, opacity: envoi ? 0.6 : 1 }}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button onClick={() => { setEdition(null); setErreur('') }} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setErreur(''); setFichier(null); setEdition({ ...VIDE }) }} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter un sponsor</button>
      )}
      {erreur && <p style={st.erreur}>{erreur}</p>}
    </div>
  )
}
