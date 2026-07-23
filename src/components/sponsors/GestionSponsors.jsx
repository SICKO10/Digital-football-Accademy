import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

const COULEURS_NIVEAU = [
  { val: '#22c55e', label: 'Vert' },
  { val: '#fbbf24', label: 'Or' },
  { val: '#9ca3af', label: 'Argent' },
  { val: '#b45309', label: 'Bronze' },
  { val: '#3b82f6', label: 'Bleu' },
  { val: '#ef4444', label: 'Rouge' },
]

const MODES_PAIEMENT = ['Virement', 'Chèque', 'Espèces', 'Autre']
const SAISONS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024']

const st = {
  card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: (active) => ({ padding: '9px 16px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px' }),
  btnSolid: (color = '#4ade80') => ({ background: color, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }),
  btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
}

// ── Calculs (fonctions pures, hors composant) ────────────────────────────────
const getMontantRecu = (sponsor) => {
  const paiements = Array.isArray(sponsor.paiements) ? sponsor.paiements : []
  return paiements.reduce((sum, p) => sum + (Number(p.montant) || 0), 0)
}

const getStatutPaiement = (sponsor) => {
  const recu = getMontantRecu(sponsor)
  const total = Number(sponsor.montant_contrat) || 0
  if (total === 0) return { label: 'Non défini', color: '#6b7280' }
  if (recu >= total) return { label: 'Payé', color: '#22c55e' }
  if (recu > 0) return { label: 'Partiel', color: '#f59e0b' }
  if (sponsor.date_fin && new Date(sponsor.date_fin) < new Date()) return { label: 'En retard', color: '#ef4444' }
  return { label: 'En attente', color: '#6b7280' }
}

const getAlerts = (sponsors) => {
  const alerts = []
  const today = new Date()
  const in30days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  sponsors.forEach(s => {
    if (s.date_fin) {
      const fin = new Date(s.date_fin)
      if (fin > today && fin < in30days) alerts.push({ type: 'expiration', sponsor: s })
    }
    if (getStatutPaiement(s).label === 'En retard') alerts.push({ type: 'retard', sponsor: s })
  })
  return alerts
}

// ── Petits composants de présentation ────────────────────────────────────────
function KpiCard({ label, valeur, couleur = '#4ade80' }) {
  return (
    <div style={{ ...st.card, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: couleur }}>{valeur}</p>
      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
    </div>
  )
}

function StatutBadge({ statut }) {
  return (
    <span style={{ background: statut.color + '20', border: `1px solid ${statut.color}50`, color: statut.color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {statut.label}
    </span>
  )
}

function SponsorCard({ sponsor, onEdit, onDelete, onAjouterPaiement, onToggleContrepartie }) {
  const niveau = sponsor.niveaux_partenariat
  const recu = getMontantRecu(sponsor)
  const total = Number(sponsor.montant_contrat) || 0
  const pct = total > 0 ? Math.min(100, Math.round((recu / total) * 100)) : 0
  const statut = getStatutPaiement(sponsor)
  const contrepartiesLivrees = sponsor.contreparties_livrees || []
  const contrepartiesNiveau = niveau?.contreparties || []

  return (
    <div style={st.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{sponsor.entreprise}</p>
            {niveau && (
              <span style={{ background: niveau.couleur + '20', border: `1px solid ${niveau.couleur}50`, color: niveau.couleur, fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>{niveau.nom}</span>
            )}
            <StatutBadge statut={statut} />
          </div>
          {(sponsor.contact_nom || sponsor.contact_email) && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
              {[sponsor.contact_nom, sponsor.contact_email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => onAjouterPaiement(sponsor)} style={st.btn('#60a5fa')}>+ Paiement</button>
          <button onClick={() => onEdit(sponsor)} style={st.btnSecondary}>Modifier</button>
          <button onClick={() => onDelete(sponsor)} style={st.btn('#ef4444')}>Supprimer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
        <div>
          <p style={st.label}>Contrat</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{total.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p style={st.label}>Reçu</p>
          <p style={{ margin: 0, fontWeight: 700, color: '#4ade80' }}>{recu.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p style={st.label}>Reste</p>
          <p style={{ margin: 0, fontWeight: 700, color: total - recu > 0 ? '#f59e0b' : '#666' }}>{Math.max(0, total - recu).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: '6px', height: '6px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: statut.color }} />
      </div>

      {sponsor.date_fin && (
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#666' }}>Fin de contrat : {new Date(sponsor.date_fin).toLocaleDateString('fr-FR')}</p>
      )}

      {contrepartiesNiveau.length > 0 && (
        <div>
          <p style={st.label}>Contreparties</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {contrepartiesNiveau.map((c, i) => {
              const livree = contrepartiesLivrees.includes(c)
              return (
                <button key={i} onClick={() => onToggleContrepartie(sponsor, c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: livree ? '#4ade80' : '#666', cursor: 'pointer', fontSize: '13px', padding: '2px 0', textAlign: 'left' }}>
                  <span>{livree ? '✓' : '○'}</span> {c}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function NiveauCard({ niveau, nbSponsors, montantTotal, onEdit, onDelete }) {
  return (
    <div style={{ ...st.card, borderLeft: `4px solid ${niveau.couleur}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{niveau.nom}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>{Number(niveau.montant_annuel || 0).toLocaleString('fr-FR')} € / an indicatif</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => onEdit(niveau)} style={st.btnSecondary}>Modifier</button>
          <button onClick={() => onDelete(niveau)} style={st.btn('#ef4444')}>Supprimer</button>
        </div>
      </div>
      {niveau.contreparties?.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: '18px', color: '#aaa', fontSize: '12px' }}>
          {niveau.contreparties.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
      <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#555' }}>{nbSponsors} sponsor{nbSponsors > 1 ? 's' : ''} · {montantTotal.toLocaleString('fr-FR')} € cette saison</p>
    </div>
  )
}

// ── Modales (composants module-level : évite le remount/perte de focus) ─────
function ModalSponsor({ sponsor, niveaux, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    entreprise: sponsor?.entreprise || '',
    contact_nom: sponsor?.contact_nom || '',
    contact_email: sponsor?.contact_email || '',
    contact_telephone: sponsor?.contact_telephone || '',
    niveau_id: sponsor?.niveau_id || '',
    montant_contrat: sponsor?.montant_contrat != null ? String(sponsor.montant_contrat) : '',
    date_signature: sponsor?.date_signature || '',
    date_fin: sponsor?.date_fin || '',
    notes: sponsor?.notes || '',
    contreparties_livrees: sponsor?.contreparties_livrees || [],
  }))

  const champ = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const niveauActif = niveaux.find(n => n.id === form.niveau_id)

  const changerNiveau = (niveauId) => {
    const niveau = niveaux.find(n => n.id === niveauId)
    setForm(f => ({
      ...f,
      niveau_id: niveauId,
      montant_contrat: (!f.montant_contrat && niveau) ? String(niveau.montant_annuel || '') : f.montant_contrat,
    }))
  }

  const toggleContrepartie = (c) => {
    setForm(f => ({
      ...f,
      contreparties_livrees: f.contreparties_livrees.includes(c)
        ? f.contreparties_livrees.filter(x => x !== c)
        : [...f.contreparties_livrees, c],
    }))
  }

  const valide = form.entreprise.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{sponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={st.label}>Entreprise *</label>
            <input style={st.input} value={form.entreprise} onChange={e => champ('entreprise', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Contact — nom</label>
              <input style={st.input} value={form.contact_nom} onChange={e => champ('contact_nom', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Contact — téléphone</label>
              <input style={st.input} value={form.contact_telephone} onChange={e => champ('contact_telephone', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={st.label}>Contact — email</label>
            <input style={st.input} type="email" value={form.contact_email} onChange={e => champ('contact_email', e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Niveau de partenariat</label>
            <select style={st.input} value={form.niveau_id} onChange={e => changerNiveau(e.target.value)}>
              <option value="">— Aucun —</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>Montant du contrat (€)</label>
            <input style={st.input} type="number" min="0" step="0.01" value={form.montant_contrat} onChange={e => champ('montant_contrat', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Date de signature</label>
              <input style={st.input} type="date" value={form.date_signature} onChange={e => champ('date_signature', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Date de fin</label>
              <input style={st.input} type="date" value={form.date_fin} onChange={e => champ('date_fin', e.target.value)} />
            </div>
          </div>

          {niveauActif?.contreparties?.length > 0 && (
            <div>
              <label style={st.label}>Contreparties livrées</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {niveauActif.contreparties.map((c, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.contreparties_livrees.includes(c)} onChange={() => toggleContrepartie(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={st.label}>Notes</label>
            <textarea style={{ ...st.input, resize: 'vertical', fontFamily: 'inherit' }} rows={3} value={form.notes} onChange={e => champ('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} disabled={!valide || saving} style={{ ...st.btnSolid('#4ade80'), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : sponsor ? 'Enregistrer' : 'Créer le sponsor'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function ModalPaiement({ sponsor, onClose, onSave, saving }) {
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mode, setMode] = useState(MODES_PAIEMENT[0])
  const [reference, setReference] = useState('')

  const valide = Number(montant) > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>Ajouter un paiement — {sponsor.entreprise}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={st.label}>Montant (€)</label>
            <input style={st.input} type="number" min="0" step="0.01" value={montant} onChange={e => setMontant(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={st.label}>Date du paiement</label>
            <input style={st.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Mode</label>
            <select style={st.input} value={mode} onChange={e => setMode(e.target.value)}>
              {MODES_PAIEMENT.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>Référence (optionnel)</label>
            <input style={st.input} value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={() => onSave({ montant: Number(montant), date, mode, reference: reference || null, id: Date.now() })}
            disabled={!valide || saving} style={{ ...st.btnSolid('#60a5fa'), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : 'Ajouter le paiement'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function ModalNiveau({ niveau, onClose, onSave, saving }) {
  const [nom, setNom] = useState(niveau?.nom || '')
  const [montantAnnuel, setMontantAnnuel] = useState(niveau?.montant_annuel != null ? String(niveau.montant_annuel) : '')
  const [couleur, setCouleur] = useState(niveau?.couleur || COULEURS_NIVEAU[0].val)
  const [contreparties, setContreparties] = useState(niveau?.contreparties || [])
  const [nouvelleContrepartie, setNouvelleContrepartie] = useState('')

  const ajouterContrepartie = () => {
    const val = nouvelleContrepartie.trim()
    if (!val) return
    setContreparties(c => [...c, val])
    setNouvelleContrepartie('')
  }
  const supprimerContrepartie = (i) => setContreparties(c => c.filter((_, j) => j !== i))

  const valide = nom.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{niveau ? 'Modifier le niveau' : 'Nouveau niveau'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={st.label}>Nom * (ex: Partenaire Or)</label>
            <input style={st.input} value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Montant annuel indicatif (€)</label>
            <input style={st.input} type="number" min="0" step="0.01" value={montantAnnuel} onChange={e => setMontantAnnuel(e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Couleur</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {COULEURS_NIVEAU.map(c => (
                <button key={c.val} onClick={() => setCouleur(c.val)} title={c.label}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.val, border: couleur === c.val ? '2px solid #fff' : '1px solid #333', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div>
            <label style={st.label}>Contreparties</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {contreparties.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1a1a', borderRadius: '8px', padding: '6px 10px' }}>
                  <span style={{ flex: 1, fontSize: '13px', color: '#ccc' }}>{c}</span>
                  <button onClick={() => supprimerContrepartie(i)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={st.input} placeholder="Ex: Logo sur maillot" value={nouvelleContrepartie}
                onChange={e => setNouvelleContrepartie(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ajouterContrepartie() } }} />
              <button onClick={ajouterContrepartie} style={st.btnSecondary}>+ Ajouter</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={() => onSave({ nom: nom.trim(), montant_annuel: Number(montantAnnuel) || 0, couleur, contreparties })}
            disabled={!valide || saving} style={{ ...st.btnSolid('#4ade80'), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : niveau ? 'Enregistrer' : 'Créer le niveau'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function GestionSponsors({ clubId, saison }) {
  const [vue, setVue] = useState('dashboard')
  const [saisonActive, setSaisonActive] = useState(saison)
  const [niveaux, setNiveaux] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [modalSponsor, setModalSponsor] = useState(null) // null | 'new' | sponsor
  const [modalNiveau, setModalNiveau] = useState(null) // null | 'new' | niveau
  const [modalPaiement, setModalPaiement] = useState(null) // null | sponsor
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [{ data: niv, error: errNiv }, { data: spon, error: errSpon }] = await Promise.all([
      supabase.from('niveaux_partenariat').select('*').eq('club_id', clubId).order('ordre'),
      supabase.from('sponsors').select('*, niveaux_partenariat(nom, couleur, contreparties)').eq('club_id', clubId).eq('saison', saisonActive),
    ])
    if (errNiv?.code === '42P01' || errSpon?.code === '42P01') {
      setTableMissing(true)
      setLoading(false)
      return
    }
    setTableMissing(false)
    setNiveaux(niv || [])
    setSponsors(spon || [])
    setLoading(false)
  }

  useEffect(() => { if (clubId) loadData() }, [clubId, saisonActive])

  // ── CRUD sponsors ──
  const sauvegarderSponsor = async (form) => {
    setSaving(true)
    const estEdition = modalSponsor && modalSponsor !== 'new'
    const payload = {
      club_id: clubId,
      saison: saisonActive,
      entreprise: form.entreprise.trim(),
      contact_nom: form.contact_nom || null,
      contact_email: form.contact_email || null,
      contact_telephone: form.contact_telephone || null,
      niveau_id: form.niveau_id || null,
      montant_contrat: Number(form.montant_contrat) || 0,
      date_signature: form.date_signature || null,
      date_fin: form.date_fin || null,
      contreparties_livrees: form.contreparties_livrees,
      notes: form.notes || null,
    }
    const { error } = estEdition
      ? await supabase.from('sponsors').update(payload).eq('id', modalSponsor.id)
      : await supabase.from('sponsors').insert({ ...payload, paiements: [] })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalSponsor(null)
    await loadData()
  }

  const supprimerSponsor = async (sponsor) => {
    if (!confirm(`Supprimer le sponsor "${sponsor.entreprise}" ?`)) return
    const { error } = await supabase.from('sponsors').delete().eq('id', sponsor.id)
    if (error) { alert('Erreur : ' + error.message); return }
    await loadData()
  }

  const ajouterPaiement = async (paiement) => {
    if (!modalPaiement) return
    setSaving(true)
    const nouveauxPaiements = [...(modalPaiement.paiements || []), paiement]
    const { error } = await supabase.from('sponsors').update({ paiements: nouveauxPaiements }).eq('id', modalPaiement.id)
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalPaiement(null)
    await loadData()
  }

  const toggleContrepartie = async (sponsor, contrepartie) => {
    const actuelles = sponsor.contreparties_livrees || []
    const nouvelles = actuelles.includes(contrepartie)
      ? actuelles.filter(c => c !== contrepartie)
      : [...actuelles, contrepartie]
    setSponsors(prev => prev.map(s => (s.id === sponsor.id ? { ...s, contreparties_livrees: nouvelles } : s)))
    const { error } = await supabase.from('sponsors').update({ contreparties_livrees: nouvelles }).eq('id', sponsor.id)
    if (error) {
      alert('Erreur : ' + error.message)
      setSponsors(prev => prev.map(s => (s.id === sponsor.id ? { ...s, contreparties_livrees: actuelles } : s)))
    }
  }

  // ── CRUD niveaux ──
  const sauvegarderNiveau = async (form) => {
    setSaving(true)
    const estEdition = modalNiveau && modalNiveau !== 'new'
    const { error } = estEdition
      ? await supabase.from('niveaux_partenariat').update(form).eq('id', modalNiveau.id)
      : await supabase.from('niveaux_partenariat').insert({ club_id: clubId, ordre: niveaux.length, ...form })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalNiveau(null)
    await loadData()
  }

  const supprimerNiveau = async (niveau) => {
    if (!confirm(`Supprimer le niveau "${niveau.nom}" ? Les sponsors qui y sont rattachés le perdront (mais resteront).`)) return
    const { error } = await supabase.from('niveaux_partenariat').delete().eq('id', niveau.id)
    if (error) { alert('Erreur : ' + error.message); return }
    await loadData()
  }

  if (tableMissing) {
    return (
      <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '16px 20px', color: '#f59e0b', fontSize: '13px' }}>
        ⚠️ Les tables <code>sponsors</code> et <code>niveaux_partenariat</code> n'existent pas encore en base — exécute la migration SQL dans Supabase avant d'utiliser cette rubrique.
      </div>
    )
  }

  if (loading) return <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>

  const alerts = getAlerts(sponsors)
  const budgetTotal = sponsors.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
  const encaisse = sponsors.reduce((s, sp) => s + getMontantRecu(sp), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={st.tabs}>
          {[
            { id: 'dashboard', label: '📊 Tableau de bord' },
            { id: 'sponsors', label: '🤝 Sponsors' },
            { id: 'niveaux', label: '⭐ Niveaux' },
          ].map(t => (
            <button key={t.id} style={st.tab(vue === t.id)} onClick={() => setVue(t.id)}>{t.label}</button>
          ))}
        </div>
        <select style={{ ...st.input, width: 'auto' }} value={saisonActive} onChange={e => setSaisonActive(e.target.value)}>
          {SAISONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {vue === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
            <KpiCard label="Sponsors actifs" valeur={sponsors.length} />
            <KpiCard label="Budget total" valeur={`${budgetTotal.toLocaleString('fr-FR')} €`} couleur="#60a5fa" />
            <KpiCard label="Encaissé" valeur={`${encaisse.toLocaleString('fr-FR')} €`} couleur="#4ade80" />
            <KpiCard label="Restant à recevoir" valeur={`${Math.max(0, budgetTotal - encaisse).toLocaleString('fr-FR')} €`} couleur="#f59e0b" />
          </div>

          {alerts.length > 0 && (
            <div style={{ background: '#ef444410', border: '1px solid #ef444440', borderRadius: '12px', padding: '16px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#ef4444' }}>Alertes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {alerts.map((a, i) => (
                  <p key={i} style={{ margin: 0, fontSize: '13px', color: '#ccc' }}>
                    {a.type === 'expiration'
                      ? `⚠️ Contrat ${a.sponsor.entreprise} expire dans moins de 30 jours`
                      : `🔴 Paiement en retard — ${a.sponsor.entreprise}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {niveaux.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 10px' }}>Répartition par niveau</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {niveaux.map(n => {
                  const sponsorsNiveau = sponsors.filter(s => s.niveau_id === n.id)
                  const montant = sponsorsNiveau.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
                  return (
                    <div key={n.id} style={{ ...st.card, borderLeft: `4px solid ${n.couleur}` }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{n.nom}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>{sponsorsNiveau.length} sponsor{sponsorsNiveau.length > 1 ? 's' : ''} · {montant.toLocaleString('fr-FR')} €</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 10px' }}>Derniers sponsors</p>
            {sponsors.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Aucun sponsor pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...sponsors].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(s => (
                  <div key={s.id} style={{ ...st.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{s.entreprise}</p>
                    <StatutBadge statut={getStatutPaiement(s)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {vue === 'sponsors' && (
        <div>
          <button onClick={() => setModalSponsor('new')} style={{ ...st.btnSolid('#4ade80'), marginBottom: '1.25rem' }}>+ Nouveau sponsor</button>
          {sponsors.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
              Aucun sponsor pour la saison {saisonActive}. Clique sur "+ Nouveau sponsor" pour commencer.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sponsors.map(s => (
                <SponsorCard key={s.id} sponsor={s}
                  onEdit={setModalSponsor}
                  onDelete={supprimerSponsor}
                  onAjouterPaiement={setModalPaiement}
                  onToggleContrepartie={toggleContrepartie}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {vue === 'niveaux' && (
        <div>
          <button onClick={() => setModalNiveau('new')} style={{ ...st.btnSolid('#4ade80'), marginBottom: '1.25rem' }}>+ Ajouter un niveau</button>
          {niveaux.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
              Commence par créer tes niveaux de partenariat (ex: Bronze 500€, Silver 1000€, Gold 2000€).
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {niveaux.map(n => {
                const sponsorsNiveau = sponsors.filter(s => s.niveau_id === n.id)
                const montant = sponsorsNiveau.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
                return (
                  <NiveauCard key={n.id} niveau={n} nbSponsors={sponsorsNiveau.length} montantTotal={montant}
                    onEdit={setModalNiveau} onDelete={supprimerNiveau} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalSponsor && (
        <ModalSponsor
          sponsor={modalSponsor === 'new' ? null : modalSponsor}
          niveaux={niveaux}
          onClose={() => setModalSponsor(null)}
          onSave={sauvegarderSponsor}
          saving={saving}
        />
      )}
      {modalNiveau && (
        <ModalNiveau
          niveau={modalNiveau === 'new' ? null : modalNiveau}
          onClose={() => setModalNiveau(null)}
          onSave={sauvegarderNiveau}
          saving={saving}
        />
      )}
      {modalPaiement && (
        <ModalPaiement
          sponsor={modalPaiement}
          onClose={() => setModalPaiement(null)}
          onSave={ajouterPaiement}
          saving={saving}
        />
      )}
    </div>
  )
}
