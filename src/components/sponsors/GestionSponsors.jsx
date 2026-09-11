import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { makeUseSt } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import CatalogueOffres from './CatalogueOffres'
import ValorisationClub from './ValorisationClub'

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

const ROLES_SPONSOR = [
  { val: '', label: '— Non défini —' },
  { val: 'maillot', label: 'Maillot' },
  { val: 'equipementier', label: 'Équipementier' },
  { val: 'partenaire_officiel', label: 'Partenaire officiel' },
  { val: 'fournisseur', label: 'Fournisseur' },
  { val: 'media', label: 'Média' },
  { val: 'naming', label: 'Naming' },
  { val: 'autre', label: 'Autre' },
]
const ROLE_LABEL = (role) => ROLES_SPONSOR.find(r => r.val === role)?.label || 'Autre'

const CONTACT_ROLES = [
  { val: '', label: '— Sélectionner —' },
  { val: 'pdg', label: 'PDG / Directeur Général' },
  { val: 'directeur_marketing', label: 'Directeur Marketing' },
  { val: 'responsable_marketing', label: 'Responsable Marketing' },
  { val: 'responsable_communication', label: 'Responsable Communication' },
  { val: 'secretaire', label: 'Secrétaire' },
  { val: 'comptable', label: 'Comptable' },
  { val: 'autre', label: 'Autre' },
]
const CONTACT_ROLE_LABEL = (role) => CONTACT_ROLES.find(r => r.val === role)?.label || null

// ── CRM prospects (pipeline commercial, avant signature) ─────────────────────
const STATUTS_PROSPECT = [
  { val: 'nouveau', label: 'Nouveau', couleur: '#6b7280' },
  { val: 'contacte', label: 'Contacté', couleur: '#60a5fa' },
  { val: 'proposition', label: 'Proposition envoyée', couleur: '#a78bfa' },
  { val: 'negociation', label: 'Négociation', couleur: '#f59e0b' },
  { val: 'gagne', label: 'Gagné', couleur: '#22c55e' },
  { val: 'perdu', label: 'Perdu', couleur: '#ef4444' },
]
const TYPES_ECHANGE = [
  { val: 'note', label: '📝 Note' },
  { val: 'appel', label: '📞 Appel' },
  { val: 'email', label: '✉️ Email' },
  { val: 'rdv', label: '🤝 RDV' },
]

const stSombre = {
  card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: (active, color = '#4ade80') => ({ padding: '9px 16px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? color : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px' }),
  btnSolid: (color = '#4ade80') => ({ background: color, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }),
  btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  modalBg: '#0a0a0a', modalBorder: '#1a1a1a',
  bgRaised: '#1a1a1a', border: '#2a2a2a', borderStrong: '#333',
  text: '#fff', textDim: '#ccc', textFaint: '#666', textGhost: '#444',
}
const stClaire = {
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: (active, color = '#4ade80') => ({ padding: '9px 16px', borderRadius: '8px', border: active ? 'none' : '1px solid #cbd5e1', background: active ? color : 'transparent', color: active ? '#000' : '#334155', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px' }),
  btnSolid: (color = '#4ade80') => ({ background: color, color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }),
  btnSecondary: { background: 'transparent', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  input: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  label: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  modalBg: '#ffffff', modalBorder: '#e2e8f0',
  bgRaised: '#f1f5f9', border: '#cbd5e1', borderStrong: '#94a3b8',
  text: '#0f172a', textDim: '#334155', textFaint: '#64748b', textGhost: '#94a3b8',
}
const useSt = makeUseSt(stSombre, stClaire)

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
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  sponsors.forEach(s => {
    if (s.date_fin) {
      const fin = new Date(s.date_fin)
      if (fin > today && fin < in30days) alerts.push({ type: 'expiration', sponsor: s })
    }
    if (getStatutPaiement(s).label === 'En retard') alerts.push({ type: 'retard', sponsor: s })
    // Anniversaire du partenariat — même jour/mois que la signature, dans les 7 prochains jours.
    if (s.date_signature) {
      const sign = new Date(s.date_signature)
      const anniversaire = new Date(today.getFullYear(), sign.getMonth(), sign.getDate())
      if (anniversaire >= today && anniversaire <= in7days) alerts.push({ type: 'anniversaire', sponsor: s })
    }
    const engagementsEnRetard = (s.contreparties_suivi || []).filter(it => it.statut !== 'fait' && it.echeance && new Date(it.echeance) < today)
    if (engagementsEnRetard.length > 0) alerts.push({ type: 'contrepartie_retard', sponsor: s, nb: engagementsEnRetard.length })
  })
  return alerts
}

// ── Petits composants de présentation ────────────────────────────────────────
function StatutBadge({ statut }) {
  return (
    <span style={{ background: statut.color + '20', border: `1px solid ${statut.color}50`, color: statut.color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {statut.label}
    </span>
  )
}

function SponsorCard({ sponsor, onEdit, onDelete, onAjouterPaiement, onToggleStatutContrepartie, onEcheanceContrepartie, onUploadPreuve, onRenouveler, readOnly = false }) {
  const st = useSt()
  const niveau = sponsor.niveaux_partenariat
  const recu = getMontantRecu(sponsor)
  const total = Number(sponsor.montant_contrat) || 0
  const pct = total > 0 ? Math.min(100, Math.round((recu / total) * 100)) : 0
  const statut = getStatutPaiement(sponsor)
  const engagements = sponsor.contreparties_suivi || []
  const finProche = sponsor.date_fin && new Date(sponsor.date_fin) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

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
            {sponsor.role && (
              <span style={{ fontSize: '11px', background: st.bgRaised, border: `1px solid ${st.border}`, borderRadius: '4px', padding: '2px 8px', color: st.textDim }}>
                {ROLE_LABEL(sponsor.role)}
              </span>
            )}
          </div>
          {(sponsor.contact_nom || sponsor.contact_email) && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: st.textFaint }}>
              {[sponsor.contact_nom, CONTACT_ROLE_LABEL(sponsor.contact_role), sponsor.contact_email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => onAjouterPaiement(sponsor)} style={st.btn('#60a5fa')}>+ Paiement</button>
            <button onClick={() => onEdit(sponsor)} style={st.btnSecondary}>Modifier</button>
            <button onClick={() => onDelete(sponsor)} style={st.btn('#ef4444')}>Supprimer</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
        <div>
          <p style={st.label}>Contrat</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{total.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p style={st.label}>Reçu</p>
          <p style={{ margin: 0, fontWeight: 700, color: '#22c55e' }}>{recu.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p style={st.label}>Reste</p>
          <p style={{ margin: 0, fontWeight: 700, color: total - recu > 0 ? '#f59e0b' : st.textFaint }}>{Math.max(0, total - recu).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div style={{ background: st.bgRaised, borderRadius: '6px', height: '6px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: statut.color }} />
      </div>

      {sponsor.date_fin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: '12px', color: st.textFaint }}>Fin de contrat : {new Date(sponsor.date_fin).toLocaleDateString('fr-FR')}</p>
          {finProche && !readOnly && (
            <button onClick={() => onRenouveler(sponsor)} style={st.btn('#f59e0b')}>↻ Proposer un renouvellement</button>
          )}
        </div>
      )}

      {engagements.length > 0 && (
        <div>
          <p style={st.label}>Contreparties</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {engagements.map(item => {
              const enRetard = item.statut !== 'fait' && item.echeance && new Date(item.echeance) < new Date()
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => !readOnly && onToggleStatutContrepartie(sponsor, item)} disabled={readOnly}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: item.statut === 'fait' ? '#22c55e' : enRetard ? '#ef4444' : st.textFaint, cursor: readOnly ? 'default' : 'pointer', fontSize: '13px', padding: '2px 0', textAlign: 'left', flex: 1, minWidth: '160px' }}>
                    <span>{item.statut === 'fait' ? '✓' : '○'}</span> {item.label}
                  </button>
                  {!readOnly && (
                    <input type="date" value={item.echeance || ''} onChange={e => onEcheanceContrepartie(sponsor, item, e.target.value)}
                      style={{ ...st.input, width: '130px', padding: '4px 8px', fontSize: '11px' }} />
                  )}
                  {item.preuve_url ? (
                    <a href={item.preuve_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#60a5fa' }}>📷 Voir la preuve</a>
                  ) : !readOnly && (
                    <label style={{ fontSize: '11px', color: st.textFaint, cursor: 'pointer', textDecoration: 'underline' }}>
                      📷 Ajouter une preuve
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && onUploadPreuve(sponsor, item, e.target.files[0])} />
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function NiveauCard({ niveau, nbSponsors, montantTotal, onEdit, onDelete, readOnly = false }) {
  const st = useSt()
  return (
    <div style={{ ...st.card, borderTop: `3px solid ${niveau.couleur}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: niveau.couleur }}>{niveau.nom}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: st.textFaint }}>{Number(niveau.montant_annuel || 0).toLocaleString('fr-FR')} € / an indicatif</p>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => onEdit(niveau)} style={st.btnSecondary}>Modifier</button>
            <button onClick={() => onDelete(niveau)} style={st.btn('#ef4444')}>Supprimer</button>
          </div>
        )}
      </div>
      {niveau.contreparties?.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: '18px', color: st.textDim, fontSize: '12px' }}>
          {niveau.contreparties.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
      <p style={{ margin: '10px 0 0', fontSize: '11px', color: st.textFaint }}>{nbSponsors} sponsor{nbSponsors > 1 ? 's' : ''} · {montantTotal.toLocaleString('fr-FR')} € cette saison</p>
    </div>
  )
}

// ── Modales (composants module-level : évite le remount/perte de focus) ─────
function ModalSponsor({ sponsor, niveaux, onClose, onSave, saving, accentColor = '#4ade80' }) {
  const st = useSt()
  const isMobile = useWindowWidth() < 768
  const [form, setForm] = useState(() => ({
    entreprise: sponsor?.entreprise || '',
    contact_nom: sponsor?.contact_nom || '',
    contact_role: sponsor?.contact_role || '',
    role: sponsor?.role || '',
    contact_email: sponsor?.contact_email || '',
    contact_telephone: sponsor?.contact_telephone || '',
    niveau_id: sponsor?.niveau_id || '',
    montant_contrat: sponsor?.montant_contrat != null ? String(sponsor.montant_contrat) : '',
    date_signature: sponsor?.date_signature || '',
    date_fin: sponsor?.date_fin || '',
    notes: sponsor?.notes || '',
  }))

  const champ = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const changerNiveau = (niveauId) => {
    const niveau = niveaux.find(n => n.id === niveauId)
    setForm(f => ({
      ...f,
      niveau_id: niveauId,
      montant_contrat: (!f.montant_contrat && niveau) ? String(niveau.montant_annuel || '') : f.montant_contrat,
    }))
  }

  const valide = form.entreprise.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: st.modalBg, border: `1px solid ${st.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{sponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: st.textFaint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={st.label}>Entreprise *</label>
            <input style={st.input} value={form.entreprise} onChange={e => champ('entreprise', e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Type de partenariat</label>
            <select style={st.input} value={form.role} onChange={e => champ('role', e.target.value)}>
              {ROLES_SPONSOR.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
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
            <label style={st.label}>Contact — rôle</label>
            <select style={st.input} value={form.contact_role} onChange={e => champ('contact_role', e.target.value)}>
              {CONTACT_ROLES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
            </select>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Date de signature</label>
              <input style={st.input} type="date" value={form.date_signature} onChange={e => champ('date_signature', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Date de fin</label>
              <input style={st.input} type="date" value={form.date_fin} onChange={e => champ('date_fin', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={st.label}>Notes</label>
            <textarea style={{ ...st.input, resize: 'vertical', fontFamily: 'inherit' }} rows={3} value={form.notes} onChange={e => champ('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} disabled={!valide || saving} style={{ ...st.btnSolid(accentColor), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : sponsor ? 'Enregistrer' : 'Créer le sponsor'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function ModalPaiement({ sponsor, onClose, onSave, saving }) {
  const st = useSt()
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mode, setMode] = useState(MODES_PAIEMENT[0])
  const [reference, setReference] = useState('')

  const valide = Number(montant) > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: st.modalBg, border: `1px solid ${st.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>Ajouter un paiement — {sponsor.entreprise}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: st.textFaint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
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

function ModalNiveau({ niveau, suggestionsContreparties = [], onClose, onSave, saving, accentColor = '#4ade80' }) {
  const st = useSt()
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
      <div onClick={e => e.stopPropagation()} style={{ background: st.modalBg, border: `1px solid ${st.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{niveau ? 'Modifier le niveau' : 'Nouveau niveau'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: st.textFaint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.val, border: couleur === c.val ? `2px solid ${st.text}` : `1px solid ${st.borderStrong}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div>
            <label style={st.label}>Contreparties</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {contreparties.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: st.bgRaised, borderRadius: '8px', padding: '6px 10px' }}>
                  <span style={{ flex: 1, fontSize: '13px', color: st.textDim }}>{c}</span>
                  <button onClick={() => supprimerContrepartie(i)} style={{ background: 'none', border: 'none', color: st.textDim, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            {/* Liste déroulante des prestations déjà utilisées sur d'autres niveaux de
                ce club (niveaux_partenariat.contreparties, dédupliquées) — en choisir
                une l'ajoute directement à ce niveau sans avoir à la retaper. Elle
                reste disponible pour être réutilisée sur n'importe quel autre niveau
                (retirée uniquement de CETTE liste tant qu'elle est déjà dans ce
                niveau, jamais supprimée de la liste globale). */}
            {suggestionsContreparties.filter(c => !contreparties.includes(c)).length > 0 && (
              <select style={{ ...st.input, marginBottom: '8px' }} value=""
                onChange={e => { if (e.target.value) { setContreparties(c => [...c, e.target.value]) } }}>
                <option value="">— Choisir une prestation existante —</option>
                {suggestionsContreparties.filter(c => !contreparties.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={st.input} placeholder="Ou saisir une nouvelle prestation" value={nouvelleContrepartie}
                onChange={e => setNouvelleContrepartie(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ajouterContrepartie() } }} />
              <button onClick={ajouterContrepartie} style={st.btnSecondary}>+ Ajouter</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={() => onSave({ nom: nom.trim(), montant_annuel: Number(montantAnnuel) || 0, couleur, contreparties })}
            disabled={!valide || saving} style={{ ...st.btnSolid(accentColor), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : niveau ? 'Enregistrer' : 'Créer le niveau'}
          </button>
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// Fiche prospect complète : édition des infos + statut/pipeline + historique
// des échanges + conversion en sponsor signé une fois gagné. Un seul modal
// plutôt qu'un modal liste + un modal détail séparés, pour rester simple.
function ModalProspect({ prospect, echanges, onClose, onSave, onDelete, onAjouterEchange, onConvertir, saving, accentColor = '#4ade80' }) {
  const st = useSt()
  const isMobile = useWindowWidth() < 768
  const [form, setForm] = useState(() => ({
    nom_entreprise: prospect?.nom_entreprise || '',
    secteur: prospect?.secteur || '',
    adresse: prospect?.adresse || '',
    ville: prospect?.ville || '',
    contact_nom: prospect?.contact_nom || '',
    contact_fonction: prospect?.contact_fonction || '',
    contact_email: prospect?.contact_email || '',
    contact_telephone: prospect?.contact_telephone || '',
    recommande_par: prospect?.recommande_par || '',
    interets: prospect?.interets || '',
    equipe_interessee: prospect?.equipe_interessee || '',
    budget_estime: prospect?.budget_estime != null ? String(prospect.budget_estime) : '',
    montant_potentiel: prospect?.montant_potentiel != null ? String(prospect.montant_potentiel) : '',
    probabilite: prospect?.probabilite ?? 20,
    statut: prospect?.statut || 'nouveau',
    responsable: prospect?.responsable || '',
    prochaine_action: prospect?.prochaine_action || '',
    date_relance: prospect?.date_relance || '',
    offre_proposee: prospect?.offre_proposee || '',
    motif_refus: prospect?.motif_refus || '',
    relance_saison_suivante: prospect?.relance_saison_suivante || false,
  }))
  const [nouvelEchange, setNouvelEchange] = useState('')
  const [typeEchange, setTypeEchange] = useState('note')

  const champ = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const valide = form.nom_entreprise.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: st.modalBg, border: `1px solid ${st.modalBorder}`, borderRadius: '16px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{prospect ? 'Modifier le prospect' : 'Nouveau prospect'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: st.textFaint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Entreprise *</label>
              <input style={st.input} value={form.nom_entreprise} onChange={e => champ('nom_entreprise', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Secteur</label>
              <input style={st.input} value={form.secteur} onChange={e => champ('secteur', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Adresse</label>
              <input style={st.input} value={form.adresse} onChange={e => champ('adresse', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Ville / zone</label>
              <input style={st.input} value={form.ville} onChange={e => champ('ville', e.target.value)} />
            </div>
          </div>

          <div style={{ height: 1, background: st.border, margin: '4px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Contact — nom</label>
              <input style={st.input} value={form.contact_nom} onChange={e => champ('contact_nom', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Contact — fonction</label>
              <input style={st.input} value={form.contact_fonction} onChange={e => champ('contact_fonction', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Contact — email</label>
              <input style={st.input} type="email" value={form.contact_email} onChange={e => champ('contact_email', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Contact — téléphone</label>
              <input style={st.input} value={form.contact_telephone} onChange={e => champ('contact_telephone', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={st.label}>Recommandé par</label>
            <input style={st.input} value={form.recommande_par} onChange={e => champ('recommande_par', e.target.value)} />
          </div>

          <div style={{ height: 1, background: st.border, margin: '4px 0' }} />

          <div>
            <label style={st.label}>Statut</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {STATUTS_PROSPECT.map(s => (
                <button key={s.val} onClick={() => champ('statut', s.val)} style={{ padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: form.statut === s.val ? s.couleur : st.bgRaised, color: form.statut === s.val ? '#000' : st.textFaint }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {form.statut === 'perdu' && (
            <div>
              <label style={st.label}>Motif du refus</label>
              <input style={st.input} value={form.motif_refus} onChange={e => champ('motif_refus', e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: st.textDim, marginTop: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.relance_saison_suivante} onChange={e => champ('relance_saison_suivante', e.target.checked)} />
                À relancer la saison prochaine
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Budget estimé (€)</label>
              <input style={st.input} type="number" min="0" step="0.01" value={form.budget_estime} onChange={e => champ('budget_estime', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Montant potentiel (€)</label>
              <input style={st.input} type="number" min="0" step="0.01" value={form.montant_potentiel} onChange={e => champ('montant_potentiel', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={st.label}>Probabilité de signature — {form.probabilite}%</label>
            <input type="range" min="0" max="100" step="10" value={form.probabilite} onChange={e => champ('probabilite', Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Équipe / projet intéressant</label>
              <input style={st.input} value={form.equipe_interessee} onChange={e => champ('equipe_interessee', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Responsable commercial</label>
              <input style={st.input} value={form.responsable} onChange={e => champ('responsable', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={st.label}>Intérêts identifiés</label>
            <input style={st.input} value={form.interets} onChange={e => champ('interets', e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Offre proposée</label>
            <input style={st.input} value={form.offre_proposee} onChange={e => champ('offre_proposee', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={st.label}>Prochaine action</label>
              <input style={st.input} value={form.prochaine_action} onChange={e => champ('prochaine_action', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Date de relance</label>
              <input style={st.input} type="date" value={form.date_relance} onChange={e => champ('date_relance', e.target.value)} />
            </div>
          </div>

          {prospect && (
            <>
              <div style={{ height: 1, background: st.border, margin: '4px 0' }} />
              <div>
                <label style={st.label}>Historique des échanges</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                  {(echanges || []).length === 0 ? (
                    <p style={{ color: st.textGhost, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucun échange enregistré.</p>
                  ) : echanges.map(e => (
                    <div key={e.id} style={{ background: st.bgRaised, borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: st.textFaint, marginBottom: '2px' }}>
                        <span>{TYPES_ECHANGE.find(t => t.val === e.type)?.label || e.type}</span>
                        <span>{new Date(e.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: st.textDim }}>{e.contenu}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select style={{ ...st.input, width: 'auto' }} value={typeEchange} onChange={e => setTypeEchange(e.target.value)}>
                    {TYPES_ECHANGE.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                  </select>
                  <input style={{ ...st.input, flex: 1 }} placeholder="Ajouter une note..." value={nouvelEchange}
                    onChange={e => setNouvelEchange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && nouvelEchange.trim()) { onAjouterEchange(prospect.id, typeEchange, nouvelEchange.trim()); setNouvelEchange('') } }} />
                  <button onClick={() => { if (nouvelEchange.trim()) { onAjouterEchange(prospect.id, typeEchange, nouvelEchange.trim()); setNouvelEchange('') } }} style={st.btnSecondary}>Ajouter</button>
                </div>
              </div>
            </>
          )}
        </div>

        {prospect && form.statut === 'gagne' && !prospect.sponsor_id && (
          <div style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, borderRadius: '10px', padding: '12px 14px', marginTop: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: accentColor, fontWeight: 700 }}>🎉 Prospect gagné !</p>
            <button onClick={() => onConvertir(prospect)} style={st.btnSolid(accentColor)}>Créer la fiche sponsor signé</button>
          </div>
        )}
        {prospect?.sponsor_id && (
          <p style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700, marginTop: '16px' }}>✅ Converti en sponsor signé</p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} disabled={!valide || saving} style={{ ...st.btnSolid(accentColor), flex: 1, opacity: (!valide || saving) ? 0.5 : 1 }}>
            {saving ? 'Enregistrement...' : prospect ? 'Enregistrer' : 'Créer le prospect'}
          </button>
          {prospect && <button onClick={() => onDelete(prospect.id)} style={{ ...st.btnSecondary, color: '#ef4444' }}>Supprimer</button>}
          <button onClick={onClose} style={st.btnSecondary}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function GestionSponsors({ clubId, saison, readOnly = false, accentColor = '#4ade80' }) {
  const st = useSt()
  const isMobile = useWindowWidth() < 768
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
  const [triSponsors, setTriSponsors] = useState('defaut')
  // ── CRM prospects (pipeline, indépendant de la saison) ──
  const [prospects, setProspects] = useState([])
  const [modalProspect, setModalProspect] = useState(null) // null | 'new' | prospect
  const [echangesProspect, setEchangesProspect] = useState([])

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

  const loadProspects = async () => {
    const { data } = await supabase.from('prospects_sponsors').select('*').eq('club_id', clubId).order('created_at', { ascending: false })
    setProspects(data || [])
  }

  useEffect(() => { if (clubId) loadData() }, [clubId, saisonActive])
  useEffect(() => { if (clubId) loadProspects() }, [clubId])

  // ── CRUD prospects ──
  const sauvegarderProspect = async (form) => {
    setSaving(true)
    const estEdition = modalProspect && modalProspect !== 'new'
    const payload = {
      club_id: clubId,
      nom_entreprise: form.nom_entreprise.trim(),
      secteur: form.secteur || null,
      adresse: form.adresse || null,
      ville: form.ville || null,
      contact_nom: form.contact_nom || null,
      contact_fonction: form.contact_fonction || null,
      contact_email: form.contact_email || null,
      contact_telephone: form.contact_telephone || null,
      recommande_par: form.recommande_par || null,
      interets: form.interets || null,
      equipe_interessee: form.equipe_interessee || null,
      budget_estime: form.budget_estime ? Number(form.budget_estime) : null,
      montant_potentiel: form.montant_potentiel ? Number(form.montant_potentiel) : null,
      probabilite: form.probabilite,
      statut: form.statut,
      responsable: form.responsable || null,
      prochaine_action: form.prochaine_action || null,
      date_relance: form.date_relance || null,
      offre_proposee: form.offre_proposee || null,
      motif_refus: form.motif_refus || null,
      relance_saison_suivante: form.relance_saison_suivante,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = estEdition
      ? await supabase.from('prospects_sponsors').update(payload).eq('id', modalProspect.id).select().single()
      : await supabase.from('prospects_sponsors').insert(payload).select().single()
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalProspect(null)
    if (data) setProspects(prev => estEdition ? prev.map(p => (p.id === data.id ? data : p)) : [data, ...prev])
  }

  const supprimerProspect = async (id) => {
    if (!confirm('Supprimer ce prospect ?')) return
    await supabase.from('prospects_sponsors').delete().eq('id', id)
    setProspects(prev => prev.filter(p => p.id !== id))
    setModalProspect(null)
  }

  const ouvrirProspect = async (prospect) => {
    setModalProspect(prospect)
    const { data } = await supabase.from('prospects_echanges').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false })
    setEchangesProspect(data || [])
  }

  const ajouterEchangeProspect = async (prospectId, type, contenu) => {
    const { data } = await supabase.from('prospects_echanges').insert({ prospect_id: prospectId, type, contenu }).select().single()
    if (data) setEchangesProspect(prev => [data, ...prev])
  }

  // Convertit un prospect gagné en ligne réelle de la table sponsors (celle
  // gérée par l'onglet "Sponsors" pour le suivi post-signature) — le prospect
  // reste dans le pipeline (statut "gagne") mais pointe désormais vers sa
  // fiche sponsor via sponsor_id, pour ne pas le proposer deux fois.
  const convertirEnSponsor = async (prospect) => {
    const { data, error } = await supabase.from('sponsors').insert({
      club_id: clubId,
      saison: saisonActive,
      entreprise: prospect.nom_entreprise,
      contact_nom: prospect.contact_nom || null,
      contact_role: prospect.contact_fonction || null,
      contact_email: prospect.contact_email || null,
      contact_telephone: prospect.contact_telephone || null,
      montant_contrat: prospect.montant_potentiel || 0,
      notes: prospect.interets || null,
      paiements: [],
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    await supabase.from('prospects_sponsors').update({ sponsor_id: data.id }).eq('id', prospect.id)
    setSponsors(prev => [...prev, data])
    setProspects(prev => prev.map(p => (p.id === prospect.id ? { ...p, sponsor_id: data.id } : p)))
    setModalProspect(null)
    setVue('sponsors')
  }

  // ── CRUD sponsors ──
  const sauvegarderSponsor = async (form) => {
    setSaving(true)
    const estEdition = modalSponsor && modalSponsor !== 'new'
    const payload = {
      club_id: clubId,
      saison: saisonActive,
      entreprise: form.entreprise.trim(),
      contact_nom: form.contact_nom || null,
      contact_role: form.contact_role || null,
      role: form.role || null,
      contact_email: form.contact_email || null,
      contact_telephone: form.contact_telephone || null,
      niveau_id: form.niveau_id || null,
      montant_contrat: Number(form.montant_contrat) || 0,
      date_signature: form.date_signature || null,
      date_fin: form.date_fin || null,
      notes: form.notes || null,
    }
    // Nouveau sponsor rattaché à un niveau : pré-remplit contreparties_suivi
    // (tableau structuré avec échéance/statut/preuve) depuis les contreparties
    // du niveau, pour ne pas resaisir la liste à la main.
    if (!estEdition && form.niveau_id) {
      const niveau = niveaux.find(n => n.id === form.niveau_id)
      payload.contreparties_suivi = (niveau?.contreparties || []).map(label => ({
        id: crypto.randomUUID(), label, echeance: null, statut: 'a_faire', preuve_url: null,
      }))
    }
    // ModalSponsor garde son propre état de formulaire local (initialisé depuis
    // le sponsor passé en prop) — fermer la modale avant confirmation de
    // l'écriture perdrait la saisie en cas d'erreur, donc pas de fermeture
    // optimiste ici. En revanche .select().single() sur l'écriture elle-même
    // évite le rechargement complet (loadData) qui suivait : la ligne locale
    // se met à jour directement avec la vraie donnée renvoyée par Supabase.
    const { data, error } = estEdition
      ? await supabase.from('sponsors').update(payload).eq('id', modalSponsor.id).select('*, niveaux_partenariat(nom, couleur, contreparties)').single()
      : await supabase.from('sponsors').insert({ ...payload, paiements: [] }).select('*, niveaux_partenariat(nom, couleur, contreparties)').single()
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalSponsor(null)
    if (data) {
      setSponsors(prev => estEdition ? prev.map(s => (s.id === data.id ? data : s)) : [...prev, data])
    } else {
      await loadData()
    }
  }

  // Duplique un sponsor en fin de contrat vers la saison suivante — pas de
  // signature auto (le club renégocie), juste une proposition pré-remplie
  // pour éviter de ressaisir contact/niveau/contreparties à chaque saison.
  const proposerRenouvellement = async (sponsor) => {
    const idxSaison = SAISONS.indexOf(sponsor.saison)
    const saisonSuivante = idxSaison > 0 ? SAISONS[idxSaison - 1] : SAISONS[0]
    if (!confirm(`Créer une proposition de renouvellement de "${sponsor.entreprise}" pour la saison ${saisonSuivante} ?`)) return
    const { data, error } = await supabase.from('sponsors').insert({
      club_id: clubId,
      saison: saisonSuivante,
      entreprise: sponsor.entreprise,
      contact_nom: sponsor.contact_nom,
      contact_role: sponsor.contact_role,
      role: sponsor.role,
      contact_email: sponsor.contact_email,
      contact_telephone: sponsor.contact_telephone,
      niveau_id: sponsor.niveau_id,
      montant_contrat: sponsor.montant_contrat,
      notes: `Renouvellement proposé depuis ${sponsor.saison}.`,
      paiements: [],
    }).select('*, niveaux_partenariat(nom, couleur, contreparties)').single()
    if (error) { alert('Erreur : ' + error.message); return }
    alert(`Proposition créée pour la saison ${saisonSuivante} — passe sur cette saison pour la retrouver et la compléter.`)
    if (saisonSuivante === saisonActive) setSponsors(prev => [...prev, data])
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
    setSponsors(prev => prev.map(s => (s.id === modalPaiement.id ? { ...s, paiements: nouveauxPaiements } : s)))
  }

  // Met à jour un seul élément du tableau contreparties_suivi (statut,
  // échéance ou preuve) sans toucher aux autres — optimiste puis persisté.
  const majContrepartieSuivi = async (sponsor, itemId, patch) => {
    const actuelles = sponsor.contreparties_suivi || []
    const nouvelles = actuelles.map(it => (it.id === itemId ? { ...it, ...patch } : it))
    setSponsors(prev => prev.map(s => (s.id === sponsor.id ? { ...s, contreparties_suivi: nouvelles } : s)))
    const { error } = await supabase.from('sponsors').update({ contreparties_suivi: nouvelles }).eq('id', sponsor.id)
    if (error) {
      alert('Erreur : ' + error.message)
      setSponsors(prev => prev.map(s => (s.id === sponsor.id ? { ...s, contreparties_suivi: actuelles } : s)))
    }
  }

  const toggleStatutContrepartie = (sponsor, item) => {
    majContrepartieSuivi(sponsor, item.id, { statut: item.statut === 'fait' ? 'a_faire' : 'fait' })
  }

  // Photo du panneau/maillot installé ou capture d'une publication — même
  // bucket "proofs" que le suivi de préparation physique (déjà en place,
  // policies ouvertes aux utilisateurs connectés).
  const uploaderPreuveContrepartie = async (sponsor, item, file) => {
    const ext = file.name.split('.').pop()
    const path = `sponsors/${sponsor.id}/${item.id}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
    if (uploadError) { alert('Erreur upload : ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
    majContrepartieSuivi(sponsor, item.id, { preuve_url: urlData.publicUrl })
  }

  // ── CRUD niveaux ──
  const sauvegarderNiveau = async (form) => {
    setSaving(true)
    const estEdition = modalNiveau && modalNiveau !== 'new'
    const { data, error } = estEdition
      ? await supabase.from('niveaux_partenariat').update(form).eq('id', modalNiveau.id).select().single()
      : await supabase.from('niveaux_partenariat').insert({ club_id: clubId, ordre: niveaux.length, ...form }).select().single()
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalNiveau(null)
    if (data) {
      setNiveaux(prev => estEdition ? prev.map(n => (n.id === data.id ? data : n)) : [...prev, data])
    } else {
      await loadData()
    }
  }

  const supprimerNiveau = async (niveau) => {
    if (!confirm(`Supprimer le niveau "${niveau.nom}" ? Les sponsors qui y sont rattachés le perdront (mais resteront).`)) return
    const { error } = await supabase.from('niveaux_partenariat').delete().eq('id', niveau.id)
    if (error) { alert('Erreur : ' + error.message); return }
    await loadData()
  }

  const exporterRapport = () => {
    const header = ['Entreprise', 'Niveau', 'Contrat (€)', 'Reçu (€)', 'Reste (€)', 'Statut']
    const rows = sponsors.map(s => {
      const recu = getMontantRecu(s)
      const total = Number(s.montant_contrat) || 0
      return [s.entreprise, s.niveaux_partenariat?.nom || '', total, recu, Math.max(0, total - recu), getStatutPaiement(s).label]
    })
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sponsors_${saisonActive}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const relancerSponsors = () => {
    const impayes = sponsors.filter(s => getStatutPaiement(s).label !== 'Payé' && s.contact_email)
    if (impayes.length === 0) { alert('Aucun sponsor à relancer.'); return }
    window.location.href = `mailto:?bcc=${impayes.map(s => s.contact_email).join(',')}&subject=${encodeURIComponent('Rappel de paiement — partenariat')}`
  }

  if (tableMissing) {
    return (
      <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '16px 20px', color: '#f59e0b', fontSize: '13px' }}>
        Les tables <code>sponsors</code> et <code>niveaux_partenariat</code> n'existent pas encore en base — exécute la migration SQL dans Supabase avant d'utiliser cette rubrique.
      </div>
    )
  }

  if (loading) return <p style={{ color: st.textGhost, fontSize: '13px' }}>Chargement...</p>

  // Tri/filtre appliqué uniquement à l'affichage de l'onglet "Sponsors" — ne
  // touche ni les KPI ni le dashboard, calculés sur `sponsors` en entier.
  const sponsorsAffiches = (() => {
    if (triSponsors === 'date_fin') {
      return [...sponsors].sort((a, b) => {
        if (!a.date_fin) return 1
        if (!b.date_fin) return -1
        return new Date(a.date_fin) - new Date(b.date_fin)
      })
    }
    if (triSponsors === 'montant') {
      return [...sponsors].sort((a, b) => (Number(b.montant_contrat) || 0) - (Number(a.montant_contrat) || 0))
    }
    if (triSponsors === 'impayes') {
      return sponsors.filter(s => getStatutPaiement(s).label !== 'Payé')
    }
    return sponsors
  })()

  const alerts = getAlerts(sponsors)
  const budgetTotal = sponsors.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
  const encaisse = sponsors.reduce((s, sp) => s + getMontantRecu(sp), 0)
  const restant = Math.max(0, budgetTotal - encaisse)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={st.tabs}>
          {[
            { id: 'dashboard', label: 'Tableau de bord' },
            { id: 'prospects', label: `Prospects${prospects.length ? ` (${prospects.length})` : ''}` },
            { id: 'sponsors', label: 'Sponsors' },
            { id: 'contreparties', label: 'Contreparties' },
            { id: 'niveaux', label: 'Niveaux' },
            { id: 'offres', label: 'Offres' },
            { id: 'valorisation', label: 'Valorisation' },
          ].map(t => (
            <button key={t.id} style={st.tab(vue === t.id, accentColor)} onClick={() => setVue(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {vue === 'prospects' ? (
            !readOnly && <button onClick={() => setModalProspect('new')} style={st.btnSolid(accentColor)}>+ Nouveau prospect</button>
          ) : ['offres', 'valorisation'].includes(vue) ? null : (
            <>
              <select style={{ ...st.input, width: 'auto' }} value={saisonActive} onChange={e => setSaisonActive(e.target.value)}>
                {SAISONS.map(s => <option key={s}>{s}</option>)}
              </select>
              {!readOnly && vue !== 'contreparties' && (
                <button onClick={() => setModalSponsor('new')} style={st.btnSolid(accentColor)}>+ Ajouter un sponsor</button>
              )}
            </>
          )}
        </div>
      </div>

      {vue === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={st.card}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: st.textFaint, textTransform: 'uppercase' }}>Sponsors actifs</p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: accentColor }}>{sponsors.length}</p>
            </div>
            <div style={st.card}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: st.textFaint, textTransform: 'uppercase' }}>Budget total</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: st.text }}>{budgetTotal.toLocaleString('fr-FR')} €</p>
            </div>
            <div style={{ ...st.card, border: '1px solid #22c55e40' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: st.textFaint, textTransform: 'uppercase' }}>Encaissé</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#22c55e' }}>{encaisse.toLocaleString('fr-FR')} €</p>
              <div style={{ marginTop: '10px', background: st.bgRaised, borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${budgetTotal > 0 ? Math.min(100, encaisse / budgetTotal * 100) : 0}%`, background: '#22c55e', borderRadius: '999px' }} />
              </div>
            </div>
            <div style={{ ...st.card, border: '1px solid #f59e0b40' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: st.textFaint, textTransform: 'uppercase' }}>Restant à recevoir</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#f59e0b' }}>{restant.toLocaleString('fr-FR')} €</p>
              <div style={{ marginTop: '10px', background: st.bgRaised, borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${budgetTotal > 0 ? Math.min(100, restant / budgetTotal * 100) : 0}%`, background: '#f59e0b', borderRadius: '999px' }} />
              </div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div style={{ background: '#ef444410', border: '1px solid #ef444440', borderRadius: '12px', padding: '16px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#ef4444' }}>Alertes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {alerts.map((a, i) => (
                  <p key={i} style={{ margin: 0, fontSize: '13px', color: st.textDim }}>
                    {a.type === 'expiration' && `Contrat ${a.sponsor.entreprise} expire dans moins de 30 jours`}
                    {a.type === 'retard' && `Paiement en retard — ${a.sponsor.entreprise}`}
                    {a.type === 'anniversaire' && `🎂 Anniversaire du partenariat avec ${a.sponsor.entreprise} cette semaine`}
                    {a.type === 'contrepartie_retard' && `${a.nb} contrepartie${a.nb > 1 ? 's' : ''} en retard — ${a.sponsor.entreprise}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px', alignItems: 'start' }}>

            {/* Colonne gauche — niveaux + derniers sponsors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {niveaux.length > 0 && (
                <div style={st.card}>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 14px' }}>Répartition par niveau</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {niveaux.map(n => {
                      const sponsorsNiveau = sponsors.filter(s => s.niveau_id === n.id)
                      const montant = sponsorsNiveau.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
                      const encaisseNiveau = sponsorsNiveau.reduce((s, sp) => s + getMontantRecu(sp), 0)
                      return (
                        <div key={n.id} style={{ padding: '14px 16px', borderRadius: '12px', background: st.bgRaised, borderLeft: `3px solid ${n.couleur}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: n.couleur, fontWeight: 800, fontSize: '13px' }}>{n.nom}</span>
                            <span style={{ color: st.text, fontWeight: 700 }}>{montant.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: st.textFaint, fontSize: '12px' }}>{sponsorsNiveau.length} sponsor{sponsorsNiveau.length > 1 ? 's' : ''}</span>
                            <span style={{ color: '#22c55e', fontSize: '12px' }}>{encaisseNiveau.toLocaleString('fr-FR')} € encaissé</span>
                          </div>
                          <div style={{ background: st.border, borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: montant > 0 ? `${Math.min(100, encaisseNiveau / montant * 100)}%` : '0%', background: n.couleur, borderRadius: '999px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={st.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Derniers sponsors</p>
                  <button onClick={() => setVue('sponsors')} style={{ color: accentColor, background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Voir tous →</button>
                </div>
                {sponsors.length === 0 ? (
                  <p style={{ color: st.textGhost, fontSize: '13px', margin: 0 }}>Aucun sponsor pour l'instant.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...sponsors].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: st.bgRaised }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{s.entreprise}</p>
                          {s.niveaux_partenariat?.nom && <p style={{ margin: '2px 0 0', fontSize: '11px', color: st.textFaint }}>{s.niveaux_partenariat.nom}</p>}
                        </div>
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{getMontantRecu(s).toLocaleString('fr-FR')} €</span>
                        <StatutBadge statut={getStatutPaiement(s)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colonne droite — objectif + actions rapides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={st.card}>
                <p style={{ color: st.textFaint, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 14px' }}>Objectif saison</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: st.textDim, fontSize: '13px' }}>{encaisse.toLocaleString('fr-FR')} € / {budgetTotal.toLocaleString('fr-FR')} €</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{budgetTotal > 0 ? Math.round(encaisse / budgetTotal * 100) : 0}%</span>
                </div>
                <div style={{ background: st.bgRaised, borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${budgetTotal > 0 ? Math.min(100, encaisse / budgetTotal * 100) : 0}%`, background: 'linear-gradient(90deg, #22c55e, #38bdf8)', borderRadius: '999px', transition: 'width 0.8s ease' }} />
                </div>
                <p style={{ color: st.textFaint, fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>{restant.toLocaleString('fr-FR')} € restant à encaisser</p>
              </div>

              <div style={st.card}>
                <p style={{ color: st.textFaint, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 14px' }}>Actions rapides</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    !readOnly && { label: 'Ajouter un sponsor', action: () => setModalSponsor('new') },
                    !readOnly && { label: 'Gérer les niveaux', action: () => setVue('niveaux') },
                    { label: 'Relancer les sponsors', action: relancerSponsors },
                    { label: 'Exporter le rapport', action: exporterRapport },
                  ].filter(Boolean).map(a => (
                    <button key={a.label} onClick={a.action}
                      style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${st.border}`, background: 'transparent', color: st.textDim, fontSize: '13px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      onMouseEnter={e => { e.currentTarget.style.background = st.bgRaised; e.currentTarget.style.color = st.text }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = st.textDim }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {vue === 'prospects' && (
        <div>
          {prospects.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
              Aucun prospect pour l'instant. Clique sur "+ Nouveau prospect" pour démarrer ton pipeline commercial.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {STATUTS_PROSPECT.map(statutInfo => {
                const prospectsColonne = prospects.filter(p => p.statut === statutInfo.val)
                const totalColonne = prospectsColonne.reduce((s, p) => s + (Number(p.montant_potentiel) || 0), 0)
                return (
                  <div key={statutInfo.val} style={{ flex: '0 0 260px', width: '260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: '8px' }}>
                      <span style={{ color: statutInfo.couleur, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{statutInfo.label}</span>
                      <span style={{ color: st.textFaint, fontSize: '11px' }}>{prospectsColonne.length}</span>
                    </div>
                    {totalColonne > 0 && (
                      <p style={{ margin: '0 0 8px', padding: '0 10px', color: st.textFaint, fontSize: '11px' }}>{totalColonne.toLocaleString('fr-FR')} € potentiel</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {prospectsColonne.map(p => (
                        <div key={p.id} onClick={() => ouvrirProspect(p)}
                          style={{ ...st.card, padding: '12px 14px', cursor: 'pointer', borderTop: `3px solid ${statutInfo.couleur}` }}>
                          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '13px' }}>{p.nom_entreprise}</p>
                          {p.secteur && <p style={{ margin: '0 0 6px', color: st.textFaint, fontSize: '11px' }}>{p.secteur}</p>}
                          {p.montant_potentiel != null && (
                            <p style={{ margin: '0 0 4px', color: accentColor, fontSize: '13px', fontWeight: 700 }}>{Number(p.montant_potentiel).toLocaleString('fr-FR')} €</p>
                          )}
                          <p style={{ margin: 0, color: st.textFaint, fontSize: '11px' }}>{p.probabilite}% de probabilité</p>
                          {p.prochaine_action && (
                            <p style={{ margin: '6px 0 0', color: st.textDim, fontSize: '11px', borderTop: `1px solid ${st.border}`, paddingTop: '6px' }}>
                              → {p.prochaine_action}{p.date_relance ? ` (${new Date(p.date_relance).toLocaleDateString('fr-FR')})` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {vue === 'sponsors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
            {!readOnly ? (
              <button onClick={() => setModalSponsor('new')} style={st.btnSolid(accentColor)}>+ Nouveau sponsor</button>
            ) : <span />}
            {sponsors.length > 0 && (
              <select style={{ ...st.input, width: 'auto' }} value={triSponsors} onChange={e => setTriSponsors(e.target.value)}>
                <option value="defaut">Trier / filtrer</option>
                <option value="date_fin">Date de fin de contrat</option>
                <option value="montant">Sponsor le plus élevé</option>
                <option value="impayes">Impayés</option>
              </select>
            )}
          </div>
          {sponsors.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
              Aucun sponsor pour la saison {saisonActive}. Clique sur "+ Nouveau sponsor" pour commencer.
            </div>
          ) : sponsorsAffiches.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
              Aucun sponsor impayé — tout est à jour
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sponsorsAffiches.map(s => (
                <SponsorCard key={s.id} sponsor={s}
                  onEdit={setModalSponsor}
                  onDelete={supprimerSponsor}
                  onAjouterPaiement={setModalPaiement}
                  onToggleStatutContrepartie={toggleStatutContrepartie}
                  onEcheanceContrepartie={(sp, item, val) => majContrepartieSuivi(sp, item.id, { echeance: val || null })}
                  onUploadPreuve={uploaderPreuveContrepartie}
                  onRenouveler={proposerRenouvellement}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {vue === 'contreparties' && (() => {
        const lignes = sponsors.flatMap(s => (s.contreparties_suivi || []).map(item => ({ sponsor: s, item })))
          .sort((a, b) => {
            if (!a.item.echeance) return 1
            if (!b.item.echeance) return -1
            return a.item.echeance.localeCompare(b.item.echeance)
          })
        return lignes.length === 0 ? (
          <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
            Aucune contrepartie à suivre pour la saison {saisonActive} — elles apparaissent ici dès qu'un sponsor est rattaché à un niveau avec des contreparties définies.
          </div>
        ) : (
          <div style={{ ...st.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: st.bgRaised }}>
                    {['Partenaire', 'Engagement du club', 'Échéance', 'Statut', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: st.textFaint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(({ sponsor, item }) => {
                    const enRetard = item.statut !== 'fait' && item.echeance && new Date(item.echeance) < new Date()
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${st.border}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{sponsor.entreprise}</td>
                        <td style={{ padding: '10px 14px', color: st.textDim }}>{item.label}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {!readOnly ? (
                            <input type="date" value={item.echeance || ''} onChange={e => majContrepartieSuivi(sponsor, item.id, { echeance: e.target.value || null })}
                              style={{ ...st.input, width: '140px', padding: '5px 8px' }} />
                          ) : item.echeance ? new Date(item.echeance).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => !readOnly && toggleStatutContrepartie(sponsor, item)} disabled={readOnly}
                            style={{ background: item.statut === 'fait' ? '#22c55e20' : enRetard ? '#ef444420' : st.bgRaised, border: 'none', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: item.statut === 'fait' ? '#22c55e' : enRetard ? '#ef4444' : st.textFaint, cursor: readOnly ? 'default' : 'pointer' }}>
                            {item.statut === 'fait' ? 'Fait' : enRetard ? 'En retard' : 'À faire'}
                          </button>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {item.preuve_url ? (
                            <a href={item.preuve_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#60a5fa' }}>📷 Preuve</a>
                          ) : !readOnly && (
                            <label style={{ fontSize: '12px', color: st.textFaint, cursor: 'pointer', textDecoration: 'underline' }}>
                              📷 Ajouter
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploaderPreuveContrepartie(sponsor, item, e.target.files[0])} />
                            </label>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {vue === 'niveaux' && (
        <div>
          {!readOnly && (
            <button onClick={() => setModalNiveau('new')} style={{ ...st.btnSolid(accentColor), marginBottom: '1.25rem' }}>+ Ajouter un niveau</button>
          )}
          {niveaux.length === 0 ? (
            <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: st.textFaint }}>
              Commence par créer tes niveaux de partenariat (ex: Bronze 500€, Silver 1000€, Gold 2000€).
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {niveaux.map(n => {
                const sponsorsNiveau = sponsors.filter(s => s.niveau_id === n.id)
                const montant = sponsorsNiveau.reduce((s, sp) => s + (Number(sp.montant_contrat) || 0), 0)
                return (
                  <NiveauCard key={n.id} niveau={n} nbSponsors={sponsorsNiveau.length} montantTotal={montant}
                    onEdit={setModalNiveau} onDelete={supprimerNiveau} readOnly={readOnly} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {vue === 'offres' && (
        <CatalogueOffres clubId={clubId} readOnly={readOnly} accentColor={accentColor} />
      )}

      {vue === 'valorisation' && (
        <ValorisationClub clubId={clubId} readOnly={readOnly} accentColor={accentColor} />
      )}

      {modalSponsor && !readOnly && (
        <ModalSponsor
          sponsor={modalSponsor === 'new' ? null : modalSponsor}
          niveaux={niveaux}
          onClose={() => setModalSponsor(null)}
          onSave={sauvegarderSponsor}
          saving={saving}
          accentColor={accentColor}
        />
      )}
      {modalNiveau && !readOnly && (
        <ModalNiveau
          niveau={modalNiveau === 'new' ? null : modalNiveau}
          suggestionsContreparties={[...new Set(niveaux.flatMap(n => n.contreparties || []))]}
          onClose={() => setModalNiveau(null)}
          onSave={sauvegarderNiveau}
          saving={saving}
          accentColor={accentColor}
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
      {modalProspect && (
        <ModalProspect
          prospect={modalProspect === 'new' ? null : modalProspect}
          echanges={echangesProspect}
          onClose={() => setModalProspect(null)}
          onSave={sauvegarderProspect}
          onDelete={supprimerProspect}
          onAjouterEchange={ajouterEchangeProspect}
          onConvertir={convertirEnSponsor}
          saving={saving}
          accentColor={accentColor}
        />
      )}
    </div>
  )
}
