import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { makeUseSt } from '../../lib/theme'

const CATEGORIES_OFFRE = [
  { val: 'maillot', label: 'Maillot' },
  { val: 'panneau', label: 'Panneau terrain' },
  { val: 'digital', label: 'Digital / réseaux' },
  { val: 'evenement', label: 'Événement / tournoi' },
  { val: 'equipement', label: 'Équipement' },
  { val: 'naming', label: 'Naming' },
  { val: 'deplacement', label: 'Déplacement' },
  { val: 'autre', label: 'Autre' },
]
const CATEGORIE_LABEL = (val) => CATEGORIES_OFFRE.find(c => c.val === val)?.label || 'Autre'

const DUREES_OFFRE = [
  { val: 'saison', label: 'Saison' },
  { val: 'annee', label: 'Année' },
  { val: 'match', label: 'Match' },
  { val: 'tournoi', label: 'Tournoi' },
  { val: 'stage', label: 'Stage' },
]

const stSombre = {
  card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
  btnSolid: (color = '#4ade80') => ({ background: color, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }),
  btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  modalBg: '#0a0a0a', modalBorder: '#1a1a1a',
  bgRaised: '#1a1a1a', border: '#2a2a2a', borderStrong: '#333',
  text: '#fff', textDim: '#ccc', textFaint: '#666', textGhost: '#444',
}
const stClaire = {
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  btnSolid: (color = '#4ade80') => ({ background: color, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }),
  btnSecondary: { background: 'transparent', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  input: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  label: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  modalBg: '#ffffff', modalBorder: '#e2e8f0',
  bgRaised: '#f1f5f9', border: '#cbd5e1', borderStrong: '#94a3b8',
  text: '#0f172a', textDim: '#334155', textFaint: '#64748b', textGhost: '#94a3b8',
}
const useSt = makeUseSt(stSombre, stClaire)

function ModalOffre({ offre, onClose, onSave, saving, accentColor = '#4ade80' }) {
  const st = useSt()
  const [form, setForm] = useState(() => ({
    nom: offre?.nom || '',
    categorie: offre?.categorie || 'panneau',
    description: offre?.description || '',
    prix: offre?.prix != null ? String(offre.prix) : '',
    duree: offre?.duree || 'saison',
    quantite_totale: offre?.quantite_totale != null ? String(offre.quantite_totale) : '1',
    quantite_vendue: offre?.quantite_vendue != null ? String(offre.quantite_vendue) : '0',
    audience_estimee: offre?.audience_estimee != null ? String(offre.audience_estimee) : '',
    actif: offre?.actif !== false,
  }))
  const champ = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const valide = form.nom.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: st.modalBg, border: `1px solid ${st.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{offre ? 'Modifier l\'offre' : 'Nouvelle offre'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: st.textFaint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={st.label}>Nom de l'offre *</label>
            <input style={st.input} value={form.nom} onChange={e => champ('nom', e.target.value)} placeholder="Ex : Sponsor maillot U15" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Catégorie</label>
              <select style={st.input} value={form.categorie} onChange={e => champ('categorie', e.target.value)}>
                {CATEGORIES_OFFRE.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={st.label}>Durée</label>
              <select style={st.input} value={form.duree} onChange={e => champ('duree', e.target.value)}>
                {DUREES_OFFRE.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Prix (€)</label>
              <input style={st.input} type="number" min="0" step="0.01" value={form.prix} onChange={e => champ('prix', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Quantité totale</label>
              <input style={st.input} type="number" min="1" value={form.quantite_totale} onChange={e => champ('quantite_totale', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Déjà vendues</label>
              <input style={st.input} type="number" min="0" value={form.quantite_vendue} onChange={e => champ('quantite_vendue', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={st.label}>Audience estimée (personnes touchées)</label>
            <input style={st.input} type="number" min="0" value={form.audience_estimee} onChange={e => champ('audience_estimee', e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Description / contreparties incluses</label>
            <textarea style={{ ...st.input, resize: 'vertical', fontFamily: 'inherit' }} rows={3} value={form.description} onChange={e => champ('description', e.target.value)} placeholder="Ex : Logo sur maillot domicile + 2 publications réseaux" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: st.textDim, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.actif} onChange={e => champ('actif', e.target.checked)} />
            Offre active (proposable aux prospects)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} disabled={!valide || saving} style={{ ...st.btnSolid(accentColor), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : offre ? 'Enregistrer' : 'Créer l\'offre'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function CatalogueOffres({ clubId, readOnly = false, accentColor = '#4ade80' }) {
  const st = useSt()
  const [offres, setOffres] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [modal, setModal] = useState(null) // null | 'new' | offre
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('offres_sponsoring').select('*').eq('club_id', clubId).order('categorie').order('prix', { ascending: false })
    if (error?.code === '42P01') { setTableMissing(true); setLoading(false); return }
    setTableMissing(false)
    setOffres(data || [])
    setLoading(false)
  }

  useEffect(() => { if (clubId) loadData() }, [clubId])

  const sauvegarderOffre = async (form) => {
    setSaving(true)
    const estEdition = modal && modal !== 'new'
    const payload = {
      club_id: clubId,
      nom: form.nom.trim(),
      categorie: form.categorie,
      description: form.description || null,
      prix: Number(form.prix) || 0,
      duree: form.duree,
      quantite_totale: Number(form.quantite_totale) || 1,
      quantite_vendue: Number(form.quantite_vendue) || 0,
      audience_estimee: form.audience_estimee ? Number(form.audience_estimee) : null,
      actif: form.actif,
    }
    const { data, error } = estEdition
      ? await supabase.from('offres_sponsoring').update(payload).eq('id', modal.id).select().single()
      : await supabase.from('offres_sponsoring').insert(payload).select().single()
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModal(null)
    if (data) {
      setOffres(prev => estEdition ? prev.map(o => (o.id === data.id ? data : o)) : [...prev, data])
    } else {
      await loadData()
    }
  }

  const supprimerOffre = async (offre) => {
    if (!confirm(`Supprimer l'offre "${offre.nom}" ?`)) return
    const { error } = await supabase.from('offres_sponsoring').delete().eq('id', offre.id)
    if (error) { alert('Erreur : ' + error.message); return }
    setOffres(prev => prev.filter(o => o.id !== offre.id))
  }

  if (tableMissing) {
    return (
      <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '16px 20px', color: '#f59e0b', fontSize: '13px' }}>
        La table <code>offres_sponsoring</code> n'existe pas encore en base — exécute la migration SQL dans Supabase avant d'utiliser cette rubrique.
      </div>
    )
  }

  if (loading) return <p style={{ color: st.textGhost, fontSize: '13px' }}>Chargement...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '13px', color: st.textFaint }}>Catalogue des offres proposables aux sponsors et prospects.</p>
        {!readOnly && <button onClick={() => setModal('new')} style={st.btnSolid(accentColor)}>+ Nouvelle offre</button>}
      </div>

      {offres.length === 0 ? (
        <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
          Aucune offre — crée ton catalogue de packs sponsoring (maillot, panneau, digital...).
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {offres.map(o => {
            const dispo = Math.max(0, o.quantite_totale - o.quantite_vendue)
            return (
              <div key={o.id} style={{ ...st.card, position: 'relative', opacity: o.actif ? 1 : 0.55 }}>
                {!o.actif && (
                  <span style={{ position: 'absolute', top: '14px', right: '14px', background: st.bgRaised, color: st.textFaint, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>INACTIVE</span>
                )}
                {dispo === 0 && o.actif && (
                  <span style={{ position: 'absolute', top: '14px', right: '14px', background: '#ef444420', color: '#ef4444', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>ÉPUISÉ</span>
                )}
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>{o.nom}</p>
                <p style={{ margin: '0 0 12px', color: st.textFaint, fontSize: '12px' }}>{CATEGORIE_LABEL(o.categorie)} · {DUREES_OFFRE.find(d => d.val === o.duree)?.label || o.duree}</p>
                <p style={{ margin: '0 0 10px', color: accentColor, fontWeight: 900, fontSize: '20px' }}>{Number(o.prix).toLocaleString('fr-FR')} €</p>
                {o.description && <p style={{ margin: '0 0 10px', color: st.textDim, fontSize: '13px', lineHeight: 1.5 }}>{o.description}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${st.border}` }}>
                  <span style={{ color: st.textFaint, fontSize: '11px' }}>
                    {dispo}/{o.quantite_totale} disponible{dispo > 1 ? 's' : ''}
                    {o.audience_estimee > 0 && ` · ${Number(o.audience_estimee).toLocaleString('fr-FR')} pers.`}
                  </span>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setModal(o)} style={st.btnSecondary}>Modifier</button>
                      <button onClick={() => supprimerOffre(o)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>Suppr.</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && !readOnly && (
        <ModalOffre
          offre={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={sauvegarderOffre}
          saving={saving}
          accentColor={accentColor}
        />
      )}
    </div>
  )
}
