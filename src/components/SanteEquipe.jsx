import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'
import { saisonActuelle } from '../lib/saison'
import { useWindowWidth } from '../hooks/useWindowWidth'

const IcoCorbeille = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IcoFermer = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoTrombone = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
const IcoCalendrier = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

const ZONES_CORPS = [
  'Cheville gauche', 'Cheville droite', 'Genou gauche', 'Genou droit',
  'Cuisse gauche', 'Cuisse droite', 'Aine gauche', 'Aine droite',
  'Mollet gauche', 'Mollet droit', 'Dos', 'Épaule gauche', 'Épaule droite',
  'Côtes', 'Tête / Commotion', 'Autre',
]

const SPECIALISTES = ['Médecin du sport', 'Kinésithérapeute', 'Ostéopathe', 'Chirurgien', 'Radiologue', 'Autre']

const FORM_VIDE = { equipe_joueur_id: '', type_blessure: '', zone_corps: '', gravite: 'legere', date_debut: new Date().toISOString().slice(0, 10), notes: '' }
const FORM_SUIVI_VIDE = { date_consultation: new Date().toISOString().slice(0, 10), specialiste: '', compte_rendu: '' }

// Vue éducateur de "Mon équipe" → onglet Santé : déclaration et suivi des
// blessures des joueurs de l'effectif actif (joueurs = equipe_joueurs, déjà
// filtré par catégorie/équipe par le composant parent). Rattachée à
// equipe_joueurs.id (pas profiles.id) : un joueur du roster n'a pas toujours
// de compte lié, cf. supabase_sante_equipe.sql.
export default function SanteEquipe({ joueurs, educateurId }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768

  const STATUT_META = {
    en_cours: { label: 'En cours', color: colors.accent.orange },
    en_soin: { label: 'En soin', color: colors.accent.amber },
    retour_prog: { label: 'Retour programmé', color: colors.accent.blue },
    gueri: { label: 'Guéri', color: colors.accent.green },
  }
  const GRAVITE_META = {
    legere: { label: 'Légère', niveau: 1, color: colors.accent.green },
    moderee: { label: 'Modérée', niveau: 2, color: colors.accent.amber },
    grave: { label: 'Grave', niveau: 3, color: colors.accent.red },
  }
  const STATUT_ETAPE_META = {
    a_faire: { label: 'À faire', color: colors.text.disabled },
    en_cours: { label: 'En cours', color: colors.accent.orange },
    validee: { label: 'Validée', color: colors.accent.green },
  }
  const ONGLETS_DETAIL = [
    { id: 'retour', label: 'Retour compétition' },
    { id: 'reedu', label: 'Rééducation' },
    { id: 'suivi', label: 'Suivi médical' },
  ]

  const [blessures, setBlessures] = useState([])
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [blessureSelectionnee, setBlessureSelectionnee] = useState(null)
  const [ongletDetail, setOngletDetail] = useState('retour')
  const [suivis, setSuivis] = useState([])
  const [etapes, setEtapes] = useState([])
  const [showFormBlessure, setShowFormBlessure] = useState(false)
  const [showFormSuivi, setShowFormSuivi] = useState(false)
  const [showFormEtape, setShowFormEtape] = useState(false)
  const [showRapport, setShowRapport] = useState(false)
  const [form, setForm] = useState(FORM_VIDE)
  const [formSuivi, setFormSuivi] = useState(FORM_SUIVI_VIDE)
  const [formEtape, setFormEtape] = useState({ titre: '', description: '', duree_estimee: '' })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const joueursIds = joueurs.map(j => j.id)
  const joueursIdsCle = joueursIds.join(',')

  const chargerBlessures = useCallback(async () => {
    if (joueursIds.length === 0) { setBlessures([]); return }
    const { data } = await supabase.from('blessures').select('*').in('equipe_joueur_id', joueursIds).order('date_debut', { ascending: false })
    setBlessures(data || [])
  }, [joueursIdsCle]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chargerBlessures() }, [chargerBlessures])

  const chargerSuivis = async (blessureId) => {
    const { data } = await supabase.from('suivi_medical').select('*').eq('blessure_id', blessureId).order('date_consultation', { ascending: false })
    setSuivis(data || [])
  }

  const chargerEtapes = async (blessureId) => {
    const { data } = await supabase.from('reeducation_etapes').select('*').eq('blessure_id', blessureId).order('ordre')
    setEtapes(data || [])
  }

  const ouvrirBlessure = (b) => {
    setBlessureSelectionnee(b)
    setOngletDetail('retour')
    chargerSuivis(b.id)
    chargerEtapes(b.id)
  }

  const ajouterEtape = async () => {
    if (!formEtape.titre.trim()) return
    setEnvoiEnCours(true)
    const { error } = await supabase.from('reeducation_etapes').insert({
      blessure_id: blessureSelectionnee.id,
      educateur_id: educateurId,
      ordre: etapes.length + 1,
      titre: formEtape.titre,
      description: formEtape.description || null,
      duree_estimee: formEtape.duree_estimee || null,
    })
    setEnvoiEnCours(false)
    if (error) { console.error('ajouterEtape error:', error); alert('Erreur : ' + error.message); return }
    setShowFormEtape(false)
    setFormEtape({ titre: '', description: '', duree_estimee: '' })
    chargerEtapes(blessureSelectionnee.id)
  }

  const passerEnCours = async (etapeId) => {
    await supabase.from('reeducation_etapes').update({ statut: 'en_cours' }).eq('id', etapeId)
    chargerEtapes(blessureSelectionnee.id)
  }

  const validerEtape = async (etapeId) => {
    await supabase.from('reeducation_etapes').update({ statut: 'validee', date_validation: new Date().toISOString().slice(0, 10) }).eq('id', etapeId)
    chargerEtapes(blessureSelectionnee.id)
  }

  const joueurDe = (equipeJoueurId) => joueurs.find(j => j.id === equipeJoueurId)

  // Couleur d'avatar par défaut (pas de photo) dérivée du prénom, pour
  // distinguer les joueurs d'un coup d'œil dans la liste plutôt qu'un gris
  // uniforme partout.
  const PALETTE_AVATAR = [colors.accent.green, colors.accent.blue, colors.accent.amber, colors.accent.purple, colors.accent.orange]
  const couleurAvatar = (prenom) => PALETTE_AVATAR[(prenom?.charCodeAt(0) || 0) % PALETTE_AVATAR.length]

  const declarerBlessure = async () => {
    if (!form.equipe_joueur_id) { alert('Merci de choisir le joueur concerné.'); return }
    if (!form.type_blessure.trim()) { alert('Merci de renseigner le type de blessure.'); return }
    if (!form.date_debut) { alert('Merci de renseigner la date de début.'); return }
    setEnvoiEnCours(true)
    const { error } = await supabase.from('blessures').insert({
      ...form,
      educateur_id: educateurId,
      saison: saisonActuelle(),
    })
    setEnvoiEnCours(false)
    if (error) { console.error('declarerBlessure error:', error); alert('Erreur : ' + error.message); return }
    setShowFormBlessure(false)
    setForm(FORM_VIDE)
    chargerBlessures()
  }

  const mettreAJourBlessure = async () => {
    const { statut, date_retour_estimee, date_retour_effective, notes } = blessureSelectionnee
    setEnvoiEnCours(true)
    const { error } = await supabase.from('blessures')
      .update({ statut, date_retour_estimee: date_retour_estimee || null, date_retour_effective: date_retour_effective || null, notes, updated_at: new Date().toISOString() })
      .eq('id', blessureSelectionnee.id)
    setEnvoiEnCours(false)
    if (error) { console.error('mettreAJourBlessure error:', error); alert('Erreur : ' + error.message); return }
    chargerBlessures()
  }

  const ajouterSuivi = async () => {
    if (!formSuivi.compte_rendu.trim() || !formSuivi.date_consultation) return
    setEnvoiEnCours(true)
    const { error } = await supabase.from('suivi_medical').insert({
      blessure_id: blessureSelectionnee.id,
      auteur_id: educateurId,
      date_consultation: formSuivi.date_consultation,
      specialiste: formSuivi.specialiste || null,
      compte_rendu: formSuivi.compte_rendu,
      statut: 'effectue', // un ajout côté éducateur consigne toujours un compte-rendu déjà rédigé, jamais un rdv à venir (ça, c'est "+ Programmer un rendez-vous" côté joueur) — le défaut de la colonne est 'prevu', il faut le forcer explicitement ici.
    })
    setEnvoiEnCours(false)
    if (error) { console.error('ajouterSuivi error:', error); alert('Erreur : ' + error.message); return }
    setShowFormSuivi(false)
    setFormSuivi(FORM_SUIVI_VIDE)
    chargerSuivis(blessureSelectionnee.id)
  }

  // ON DELETE CASCADE sur suivi_medical/reeducation_etapes (blessure_id) —
  // supprimer la blessure supprime aussi son suivi et son programme de
  // rééducation, pas besoin de les effacer séparément ici.
  const supprimerBlessure = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette blessure ? Le suivi médical et le programme de rééducation associés seront aussi supprimés. Cette action est définitive.')) return false
    const { error } = await supabase.from('blessures').delete().eq('id', id)
    if (error) { console.error('supprimerBlessure error:', error); alert('Erreur : ' + error.message); return false }
    setBlessures(prev => prev.filter(b => b.id !== id))
    return true
  }

  const ouvrirDocument = async (path) => {
    const { data, error } = await supabase.storage.from('documents-medicaux').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) { alert("Impossible d'ouvrir ce document."); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const s = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    label: { color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block', fontWeight: 700 },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
    textarea: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
    pill: (color) => ({ background: color + alpha.soft, color, border: `1px solid ${color}${alpha.medium}`, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }),
  }

  // ── Détail d'une blessure ──────────────────────────────────────────────
  if (blessureSelectionnee) {
    const meta = STATUT_META[blessureSelectionnee.statut] || STATUT_META.en_cours
    const joueur = joueurDe(blessureSelectionnee.equipe_joueur_id)
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <button onClick={() => { setBlessureSelectionnee(null); setShowFormSuivi(false); setShowFormEtape(false) }} style={s.btnGhost}>
            ← Retour à l'équipe
          </button>
          <button onClick={async e => {
            const supprimee = await supprimerBlessure(blessureSelectionnee.id, e)
            if (supprimee) { setBlessureSelectionnee(null); setShowFormSuivi(false); setShowFormEtape(false) }
          }} style={{ ...s.btnGhost, color: colors.accent.red, borderColor: colors.accent.red + '40' }}>
            Supprimer cette blessure
          </button>
        </div>

        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '17px' }}>{joueur ? `${joueur.prenom} ${joueur.nom}` : 'Joueur'}</div>
              <div style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '2px' }}>
                {blessureSelectionnee.type_blessure}{blessureSelectionnee.zone_corps && ` — ${blessureSelectionnee.zone_corps}`}
              </div>
            </div>
            <span style={s.pill(meta.color)}>{meta.label}</span>
          </div>

          {(() => {
            const grav = GRAVITE_META[blessureSelectionnee.gravite]
            if (!grav) return null
            return (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: colors.text.faint, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Gravité</span>
                  <span style={{ color: grav.color, fontSize: '10px', fontWeight: 700 }}>{grav.label}</span>
                </div>
                <div style={{ height: '5px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(grav.niveau / 3) * 100}%`, height: '100%', background: grav.color, borderRadius: '3px' }} />
                </div>
              </div>
            )
          })()}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {ONGLETS_DETAIL.map(o => (
            <button key={o.id} onClick={() => setOngletDetail(o.id)}
              style={{
                background: ongletDetail === o.id ? colors.text.primary : colors.background.raised,
                color: ongletDetail === o.id ? colors.background.base : colors.text.faint,
                border: `1px solid ${ongletDetail === o.id ? colors.text.primary : colors.border.default}`,
                borderRadius: '20px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Inter, sans-serif',
              }}>{o.label}</button>
          ))}
        </div>

        {ongletDetail === 'retour' && (
        <div style={s.card}>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>RETOUR À LA COMPÉTITION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={s.label}>Date estimée</label>
              <input type="date" style={s.input} value={blessureSelectionnee.date_retour_estimee || ''}
                onChange={e => setBlessureSelectionnee(p => ({ ...p, date_retour_estimee: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Date effective</label>
              <input type="date" style={s.input} value={blessureSelectionnee.date_retour_effective || ''}
                onChange={e => setBlessureSelectionnee(p => ({ ...p, date_retour_effective: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Statut</label>
            <select style={s.input} value={blessureSelectionnee.statut}
              onChange={e => setBlessureSelectionnee(p => ({ ...p, statut: e.target.value }))}>
              {Object.entries(STATUT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={s.label}>Notes éducateur</label>
            <textarea style={s.textarea} value={blessureSelectionnee.notes || ''}
              onChange={e => setBlessureSelectionnee(p => ({ ...p, notes: e.target.value }))}
              placeholder="Programme de reprise, restrictions, observations..." />
          </div>
          <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={mettreAJourBlessure}>Enregistrer</button>
        </div>
        )}

        {ongletDetail === 'reedu' && (() => {
          const progression = etapes.length > 0 ? Math.round((etapes.filter(e => e.statut === 'validee').length / etapes.length) * 100) : 0
          return (
            <div>
              {etapes.length > 0 && (
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: colors.text.secondary, fontSize: '13px' }}>Progression rééducation</span>
                    <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>{progression}%</span>
                  </div>
                  <div style={{ background: colors.background.raised, borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: colors.accent.green, width: `${progression}%`, height: '8px', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '6px' }}>{etapes.filter(e => e.statut === 'validee').length} / {etapes.length} étapes complétées</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ color: colors.text.secondary, fontSize: '13px' }}>Programme de retour au jeu</div>
                {!showFormEtape && <button style={s.btn} onClick={() => setShowFormEtape(true)}>+ Ajouter une étape</button>}
              </div>

              {showFormEtape && (
                <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.border.default}` }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={s.label}>Titre de l'étape</label>
                    <input style={s.input} placeholder="ex : Phase 1 — Repos actif, Reprise course légère..."
                      value={formEtape.titre} onChange={e => setFormEtape(p => ({ ...p, titre: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={s.label}>Durée estimée</label>
                    <input style={s.input} placeholder="ex : 3 jours, 1 semaine..."
                      value={formEtape.duree_estimee} onChange={e => setFormEtape(p => ({ ...p, duree_estimee: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={s.label}>Exercices / consignes détaillées</label>
                    <textarea style={s.textarea} placeholder="Détaille les exercices, charges autorisées, restrictions, objectifs de la phase..."
                      value={formEtape.description} onChange={e => setFormEtape(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={ajouterEtape}>Ajouter</button>
                    <button style={s.btnGhost} onClick={() => { setShowFormEtape(false); setFormEtape({ titre: '', description: '', duree_estimee: '' }) }}>Annuler</button>
                  </div>
                </div>
              )}

              {etapes.length === 0 && !showFormEtape && (
                <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '30px 0', border: `1px dashed ${colors.border.default}`, borderRadius: '8px' }}>
                  Aucun programme défini — crée les étapes de rééducation
                </div>
              )}

              {etapes.map((etape, idx) => {
                const stMeta = STATUT_ETAPE_META[etape.statut] || STATUT_ETAPE_META.a_faire
                return (
                  <div key={etape.id} style={{ background: stMeta.color + alpha.faint, border: `1px solid ${stMeta.color}${alpha.light}`, borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: etape.statut === 'validee' ? colors.accent.green : colors.background.raised,
                          color: etape.statut === 'validee' ? colors.black : colors.text.faint,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px',
                        }}>{idx + 1}</div>
                        <div>
                          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{etape.titre}</div>
                          {etape.duree_estimee && <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>{etape.duree_estimee}</div>}
                          {etape.description && <p style={{ color: colors.text.secondary, fontSize: '12px', marginTop: '6px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{etape.description}</p>}
                          {etape.date_validation && <div style={{ color: colors.accent.green, fontSize: '11px', marginTop: '4px' }}>Validée le {new Date(`${etape.date_validation}T12:00:00`).toLocaleDateString('fr-FR')}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <span style={{ color: stMeta.color, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>{stMeta.label}</span>
                        {etape.statut === 'a_faire' && (
                          <button onClick={() => passerEnCours(etape.id)} style={{ background: colors.background.raised, color: colors.accent.orange, border: `1px solid ${colors.accent.orange}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Démarrer</button>
                        )}
                        {etape.statut === 'en_cours' && (
                          <button onClick={() => validerEtape(etape.id)} style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, border: `1px solid ${colors.accent.green}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Valider</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {ongletDetail === 'suivi' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px' }}>SUIVI MÉDICAL</div>
            {!showFormSuivi && <button style={s.btn} onClick={() => setShowFormSuivi(true)}>+ Ajouter un suivi</button>}
          </div>

          {showFormSuivi && (
            <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.border.default}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={s.label}>Date</label>
                  <input type="date" style={s.input} value={formSuivi.date_consultation}
                    onChange={e => setFormSuivi(p => ({ ...p, date_consultation: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Spécialiste</label>
                  <select style={s.input} value={formSuivi.specialiste} onChange={e => setFormSuivi(p => ({ ...p, specialiste: e.target.value }))}>
                    <option value="">Choisir…</option>
                    {SPECIALISTES.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={s.label}>Compte rendu</label>
                <textarea style={s.textarea} value={formSuivi.compte_rendu}
                  onChange={e => setFormSuivi(p => ({ ...p, compte_rendu: e.target.value }))}
                  placeholder="Observations, protocole de soin, recommandations..." />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={ajouterSuivi}>Enregistrer</button>
                <button style={s.btnGhost} onClick={() => { setShowFormSuivi(false); setFormSuivi(FORM_SUIVI_VIDE) }}>Annuler</button>
              </div>
            </div>
          )}

          {suivis.length === 0 && !showFormSuivi && (
            <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucun suivi médical enregistré</div>
          )}

          {/* Rdv à venir — programmés par le joueur lui-même (statut='prevu',
              cf. supabase_sante_rdv_medical.sql), pas encore de compte-rendu. */}
          {suivis.filter(sv => sv.statut === 'prevu').map(sv => (
            <div key={sv.id} style={{ background: colors.background.raised, borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>
                    Rdv le {new Date(`${sv.date_consultation}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {sv.heure_rdv && ` à ${sv.heure_rdv.slice(0, 5)}`}
                  </span>
                  {sv.specialiste && <span style={{ color: colors.accent.blue, fontSize: '12px', marginLeft: '8px' }}>{sv.specialiste}</span>}
                </div>
                <span style={s.pill(colors.accent.blue)}>Prévu par le joueur</span>
              </div>
            </div>
          ))}

          {suivis.filter(sv => sv.statut === 'effectue').map(sv => (
            <div key={sv.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>
                    {new Date(`${sv.date_consultation}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {sv.specialiste && <span style={{ color: colors.accent.green, fontSize: '12px', marginLeft: '8px' }}>{sv.specialiste}</span>}
                </div>
                {sv.document_path && (
                  <button onClick={() => ouvrirDocument(sv.document_path)} style={{ background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><IcoTrombone />{sv.document_nom || 'Document'}</span>
                  </button>
                )}
              </div>
              {sv.compte_rendu && <p style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>{sv.compte_rendu}</p>}
            </div>
          ))}
        </div>
        )}
      </div>
    )
  }

  // ── Liste équipe ────────────────────────────────────────────────────────
  const blessuresFiltrees = blessures.filter(b => filtreStatut === 'tous' || b.statut === filtreStatut)

  const genererRapport = () => {
    const total = blessures.length
    const enCours = blessures.filter(b => b.statut !== 'gueri').length
    const blessuresAvecDuree = blessures.filter(b => b.date_retour_effective && b.date_debut)
    const dureeMoyenne = blessuresAvecDuree.length > 0
      ? Math.round(blessuresAvecDuree.reduce((acc, b) => acc + (new Date(b.date_retour_effective) - new Date(b.date_debut)) / (1000 * 86400), 0) / blessuresAvecDuree.length)
      : null

    const zonesCount = blessures.reduce((acc, b) => { if (b.zone_corps) acc[b.zone_corps] = (acc[b.zone_corps] || 0) + 1; return acc }, {})
    const zonesTriees = Object.entries(zonesCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const joueursCount = blessures.reduce((acc, b) => {
      const j = joueurDe(b.equipe_joueur_id)
      const nom = j ? `${j.prenom} ${j.nom}` : 'Joueur'
      acc[nom] = (acc[nom] || 0) + 1
      return acc
    }, {})
    const joueursTries = Object.entries(joueursCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { total, enCours, dureeMoyenne, zonesTriees, joueursTries }
  }

  const eyebrow = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }

  const renderRapport = () => {
    const r = genererRapport()
    const maxZone = r.zonesTriees[0]?.[1] || 1
    return (
      <div style={{ ...s.card, padding: isMobile ? '16px' : '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div>
            <p style={eyebrow}>Rapport santé</p>
            <p style={{ margin: '4px 0 0', color: colors.text.primary, fontWeight: 800, fontSize: '16px' }}>Saison {saisonActuelle()}</p>
          </div>
          <button onClick={() => setShowRapport(false)} title="Fermer" style={{ color: colors.text.faint, background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IcoFermer /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Blessures', val: r.total, color: colors.text.primary },
            { label: 'En cours', val: r.enCours, color: colors.accent.orange },
            { label: 'Durée moyenne', val: r.dureeMoyenne != null ? r.dureeMoyenne : '–', unite: r.dureeMoyenne != null ? 'j' : '', color: colors.accent.blue, detail: r.dureeMoyenne == null ? 'aucun retour daté' : null },
          ].map(k => (
            <div key={k.label} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ margin: 0, color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{k.label}</p>
              <p style={{ margin: '6px 0 0', color: k.color, fontWeight: 800, fontSize: '24px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.val}{k.unite && <span style={{ fontSize: '13px', color: colors.text.faint, marginLeft: '3px' }}>{k.unite}</span>}</p>
              {k.detail && <p style={{ margin: '4px 0 0', color: colors.text.faint, fontSize: '11px' }}>{k.detail}</p>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: isMobile ? '20px' : '28px' }}>
          <div>
            <p style={{ ...eyebrow, marginBottom: '12px' }}>Zones les plus touchées</p>
            {r.zonesTriees.length === 0 ? <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Aucune zone renseignée.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {r.zonesTriees.map(([zone, count]) => (
                  <div key={zone} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 130px) minmax(0,1fr) 24px', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.text.secondary, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone}</span>
                    <div style={{ background: colors.background.base, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ background: colors.accent.orange, height: '100%', borderRadius: '4px', width: `${(count / maxZone) * 100}%` }} />
                    </div>
                    <span style={{ color: colors.accent.orange, fontSize: '13px', fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p style={{ ...eyebrow, marginBottom: '12px' }}>Joueurs les plus touchés</p>
            {r.joueursTries.length === 0 ? <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Aucune blessure.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {r.joueursTries.map(([nom, count]) => (
                  <div key={nom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{nom}</span>
                    <span style={{ color: colors.accent.orange, fontWeight: 700, fontSize: '12px' }}>{count} blessure{count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const blessuresActives = blessures.filter(b => b.statut !== 'gueri')
  const joueursBlessesActifs = new Set(blessuresActives.map(b => b.equipe_joueur_id)).size
  const kpis = [
    { val: joueursBlessesActifs, total: joueurs.length, label: 'Joueurs blessés', color: joueursBlessesActifs > 0 ? colors.accent.orange : colors.accent.green },
    { val: blessures.filter(b => b.statut === 'en_cours').length, label: 'En cours', color: colors.accent.orange },
    { val: blessures.filter(b => b.statut === 'en_soin').length, label: 'En soin', color: colors.accent.amber },
    { val: blessures.filter(b => b.statut === 'gueri').length, label: 'Guéris (saison)', color: colors.accent.green },
  ]
  // Blessures actives d'abord (par statut), puis guéries ; dans chaque statut,
  // la plus récente en premier (ordre déjà renvoyé par la requête).
  const ORDRE_STATUT = ['en_cours', 'en_soin', 'retour_prog', 'gueri']
  const blessuresAffichees = [...blessuresFiltrees].sort((a, b) => ORDRE_STATUT.indexOf(a.statut) - ORDRE_STATUT.indexOf(b.statut))
  const formatDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Chiffres clés */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: '10px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...s.card, marginBottom: 0, padding: '16px 18px' }}>
            <p style={{ margin: 0, color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 800, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {k.val}{k.total ? <span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 600 }}> / {k.total}</span> : ''}
            </p>
            {k.total > 0 && (
              <div style={{ height: '4px', background: colors.background.base, borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${(k.val / k.total) * 100}%`, height: '100%', background: k.color, borderRadius: '2px' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barre d'actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>
          {blessuresActives.length === 0
            ? 'Tout le groupe est disponible.'
            : <><strong style={{ color: colors.text.primary }}>{blessuresActives.length}</strong> blessure{blessuresActives.length !== 1 ? 's' : ''} en cours de suivi</>}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...s.btnGhost, background: showRapport ? colors.background.raised : 'transparent', color: showRapport ? colors.text.primary : colors.text.faint }} onClick={() => setShowRapport(v => !v)}>Rapport saison</button>
          <button style={s.btn} onClick={() => setShowFormBlessure(true)}>+ Déclarer une blessure</button>
        </div>
      </div>

      {showRapport && renderRapport()}

      {showFormBlessure && (
        <div style={{ ...s.card, marginBottom: 0, border: `1px solid ${colors.accent.green}40` }}>
          <p style={{ ...eyebrow, marginBottom: '14px' }}>Nouvelle blessure</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={s.label}>Joueur</label>
              <select style={s.input} value={form.equipe_joueur_id} onChange={e => setForm(p => ({ ...p, equipe_joueur_id: e.target.value }))}>
                <option value="">Choisir…</option>
                {joueurs.map(j => <option key={j.id} value={j.id}>{j.prenom} {j.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Type de blessure</label>
              <input style={s.input} placeholder="ex : Entorse, Contracture, Fracture..."
                value={form.type_blessure} onChange={e => setForm(p => ({ ...p, type_blessure: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Zone du corps</label>
              <select style={s.input} value={form.zone_corps} onChange={e => setForm(p => ({ ...p, zone_corps: e.target.value }))}>
                <option value="">Choisir…</option>
                {ZONES_CORPS.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Gravité</label>
              <select style={s.input} value={form.gravite} onChange={e => setForm(p => ({ ...p, gravite: e.target.value }))}>
                {Object.entries(GRAVITE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Date de début</label>
              <input type="date" style={s.input} value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={s.label}>Notes initiales</label>
            <textarea style={s.textarea} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Circonstances, observations..." />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={declarerBlessure}>Enregistrer</button>
            <button style={s.btnGhost} onClick={() => { setShowFormBlessure(false); setForm(FORM_VIDE) }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Filtres par statut */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['tous', 'Tous', colors.text.secondary], ...Object.entries(STATUT_META).map(([k, v]) => [k, v.label, v.color])].map(([k, label, couleur]) => {
          const count = k === 'tous' ? blessures.length : blessures.filter(b => b.statut === k).length
          const actif = filtreStatut === k
          return (
            <button key={k} onClick={() => setFiltreStatut(k)}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: actif ? couleur + '1f' : 'transparent',
                color: actif ? (k === 'tous' ? colors.text.primary : couleur) : colors.text.faint,
                border: `1px solid ${actif ? couleur + '70' : colors.border.default}`,
                borderRadius: '18px', padding: '6px 13px', fontSize: '12px', cursor: 'pointer', fontWeight: actif ? 700 : 500, fontFamily: 'Inter, sans-serif', opacity: count === 0 && !actif ? 0.55 : 1,
              }}>
              {k !== 'tous' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: couleur }} />}
              {label}
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: actif ? 'inherit' : colors.text.faint }}>{count}</span>
            </button>
          )
        })}
      </div>

      {blessuresAffichees.length === 0 && (
        <div style={{ ...s.card, marginBottom: 0, textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ margin: 0, color: colors.text.secondary, fontSize: '14px', fontWeight: 600 }}>{filtreStatut === 'tous' ? 'Aucune blessure déclarée' : 'Aucune blessure dans cette catégorie'}</p>
          {filtreStatut === 'tous' && <p style={{ margin: '6px 0 0', color: colors.text.faint, fontSize: '12px' }}>Déclare une blessure pour suivre la rééducation et le retour à la compétition.</p>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: '10px' }}>
        {blessuresAffichees.map(b => {
          const meta = STATUT_META[b.statut] || STATUT_META.en_cours
          const grav = GRAVITE_META[b.gravite]
          const joueur = joueurDe(b.equipe_joueur_id)
          const joursDepuis = Math.floor((new Date() - new Date(`${b.date_debut}T12:00:00`)) / (1000 * 86400))
          // Avancement vers le retour estimé (début → date estimée), affiché
          // seulement si une date de retour est renseignée et la blessure active.
          const dureePrevue = b.date_retour_estimee ? Math.round((new Date(`${b.date_retour_estimee}T12:00:00`) - new Date(`${b.date_debut}T12:00:00`)) / 86400000) : null
          const avancement = dureePrevue > 0 && b.statut !== 'gueri' ? Math.min(100, Math.max(0, Math.round(joursDepuis / dureePrevue * 100))) : null
          const retardRetour = avancement === 100 && joursDepuis > dureePrevue
          const initiales = `${joueur?.prenom?.[0] || ''}${joueur?.nom?.[0] || ''}`.toUpperCase() || '?'
          return (
            <div key={b.id} onClick={() => ouvrirBlessure(b)} className="sante-carte"
              style={{ ...s.card, marginBottom: 0, padding: '14px 16px', cursor: 'pointer', borderLeft: `3px solid ${meta.color}`, display: 'flex', flexDirection: 'column', gap: '12px', opacity: b.statut === 'gueri' ? 0.75 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {joueur?.avatar_url
                  ? <img src={joueur.avatar_url} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.color}66`, flexShrink: 0 }} />
                  : (() => {
                      const c = couleurAvatar(joueur?.prenom)
                      return <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: c + alpha.soft, border: `2px solid ${meta.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>{initiales}</div>
                    })()}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: colors.text.primary, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{joueur ? `${joueur.prenom} ${joueur.nom}` : 'Joueur'}</p>
                  <p style={{ margin: '2px 0 0', color: colors.text.secondary, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ textTransform: 'capitalize' }}>{b.type_blessure}</span>{b.zone_corps ? <span style={{ color: colors.text.faint }}>{` · ${b.zone_corps}`}</span> : ''}
                  </p>
                </div>
                <button onClick={e => supprimerBlessure(b.id, e)} title="Supprimer cette blessure"
                  style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                  <IcoCorbeille />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: meta.color, background: meta.color + '1a', border: `1px solid ${meta.color}40` }}>{meta.label}</span>
                {grav && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: colors.text.secondary, background: colors.background.raised, border: `1px solid ${colors.border.default}` }}>
                  <span style={{ display: 'inline-flex', gap: '2px' }}>{[1, 2, 3].map(n => <span key={n} style={{ width: '4px', height: '8px', borderRadius: '1px', background: n <= grav.niveau ? grav.color : colors.border.strong }} />)}</span>
                  {grav.label}
                </span>}
                <span style={{ fontSize: '12px', color: colors.text.faint, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                  {joursDepuis <= 0 ? "Depuis aujourd'hui" : `J+${joursDepuis}`} · {formatDate(b.date_debut)}
                </span>
              </div>

              {b.date_retour_estimee && b.statut !== 'gueri' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: retardRetour ? colors.accent.red : colors.text.faint }}>
                      <IcoCalendrier /> Retour estimé {formatDate(b.date_retour_estimee)}{retardRetour ? ' · dépassé' : ''}
                    </span>
                    {avancement != null && <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{avancement}%</span>}
                  </div>
                  {avancement != null && (
                    <div style={{ height: '5px', borderRadius: '3px', background: colors.background.base, overflow: 'hidden' }}>
                      <div style={{ width: `${avancement}%`, height: '100%', borderRadius: '3px', background: retardRetour ? colors.accent.red : colors.accent.blue }} />
                    </div>
                  )}
                </div>
              )}
              {b.statut === 'gueri' && b.date_retour_effective && (
                <span style={{ fontSize: '11px', color: colors.accent.green }}>De retour le {formatDate(b.date_retour_effective)}</span>
              )}
            </div>
          )
        })}
      </div>
      <style>{`.sante-carte:hover { background: ${colors.background.raised} !important; }`}</style>
    </div>
  )
}
