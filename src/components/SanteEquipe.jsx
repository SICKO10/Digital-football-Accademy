import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'
import { saisonActuelle } from '../lib/saison'

const ZONES_CORPS = [
  'Cheville gauche', 'Cheville droite', 'Genou gauche', 'Genou droit',
  'Cuisse gauche', 'Cuisse droite', 'Aine gauche', 'Aine droite',
  'Mollet gauche', 'Mollet droit', 'Dos', 'Épaule gauche', 'Épaule droite',
  'Côtes', 'Tête / Commotion', 'Autre',
]

const SPECIALISTES = ['Médecin du sport', 'Kinésithérapeute', 'Ostéopathe', 'Chirurgien', 'Radiologue', 'Autre']

const FORM_VIDE = { equipe_joueur_id: '', type_blessure: '', zone_corps: '', gravite: 'legere', date_debut: new Date().toISOString().slice(0, 10), notes: '' }
const FORM_SUIVI_VIDE = { date_consultation: new Date().toISOString().slice(0, 10), specialiste: '', compte_rendu: '', fichier: null }

// Vue éducateur de "Mon équipe" → onglet Santé : déclaration et suivi des
// blessures des joueurs de l'effectif actif (joueurs = equipe_joueurs, déjà
// filtré par catégorie/équipe par le composant parent). Rattachée à
// equipe_joueurs.id (pas profiles.id) : un joueur du roster n'a pas toujours
// de compte lié, cf. supabase_sante_equipe.sql.
export default function SanteEquipe({ joueurs, educateurId }) {
  const colors = useColors()

  const STATUT_META = {
    en_cours: { label: 'En cours', color: colors.accent.orange },
    en_soin: { label: 'En soin', color: colors.accent.amber },
    retour_prog: { label: 'Retour programmé', color: colors.accent.blue },
    gueri: { label: 'Guéri', color: colors.accent.green },
  }
  const GRAVITE_META = {
    legere: { label: 'Légère', niveau: 1 },
    moderee: { label: 'Modérée', niveau: 2 },
    grave: { label: 'Grave', niveau: 3 },
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
    let document_path = null
    let document_nom = null

    if (formSuivi.fichier) {
      const file = formSuivi.fichier
      const path = `${blessureSelectionnee.equipe_joueur_id}/${blessureSelectionnee.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents-medicaux').upload(path, file)
      if (uploadError) { console.error('upload document médical error:', uploadError); alert('Erreur upload : ' + uploadError.message); setEnvoiEnCours(false); return }
      document_path = path
      document_nom = file.name
    }

    const { error } = await supabase.from('suivi_medical').insert({
      blessure_id: blessureSelectionnee.id,
      auteur_id: educateurId,
      date_consultation: formSuivi.date_consultation,
      specialiste: formSuivi.specialiste || null,
      compte_rendu: formSuivi.compte_rendu,
      document_path, document_nom,
    })
    setEnvoiEnCours(false)
    if (error) { console.error('ajouterSuivi error:', error); alert('Erreur : ' + error.message); return }
    setShowFormSuivi(false)
    setFormSuivi(FORM_SUIVI_VIDE)
    chargerSuivis(blessureSelectionnee.id)
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
        <button onClick={() => { setBlessureSelectionnee(null); setShowFormSuivi(false); setShowFormEtape(false) }} style={{ ...s.btnGhost, marginBottom: '16px' }}>
          ← Retour à l'équipe
        </button>

        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '17px' }}>{joueur ? `${joueur.prenom} ${joueur.nom}` : 'Joueur'}</div>
              <div style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '2px' }}>
                {blessureSelectionnee.type_blessure}{blessureSelectionnee.zone_corps && ` — ${blessureSelectionnee.zone_corps}`}
              </div>
              <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '4px' }}>
                Gravité : {GRAVITE_META[blessureSelectionnee.gravite]?.label || blessureSelectionnee.gravite}
              </div>
            </div>
            <span style={s.pill(meta.color)}>{meta.label}</span>
          </div>
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
              <div style={{ marginBottom: '12px' }}>
                <label style={s.label}>Document médical (PDF, image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setFormSuivi(p => ({ ...p, fichier: e.target.files[0] || null }))}
                  style={{ color: colors.text.faint, fontSize: '12px' }} />
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
          {suivis.map(sv => (
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
                    📎 {sv.document_nom || 'Document'}
                  </button>
                )}
              </div>
              <p style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>{sv.compte_rendu}</p>
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

  const renderRapport = () => {
    const r = genererRapport()
    return (
      <div style={{ ...s.card, border: `1px solid ${colors.border.default}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px' }}>Rapport santé — Saison {saisonActuelle()}</div>
          <button onClick={() => setShowRapport(false)} style={{ color: colors.text.faint, background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Blessures total', val: r.total, color: colors.text.primary },
            { label: 'En cours', val: r.enCours, color: colors.accent.orange },
            { label: 'Durée moy.', val: r.dureeMoyenne != null ? `${r.dureeMoyenne} j` : 'N/A', color: colors.accent.blue },
          ].map(k => (
            <div key={k.label} style={{ background: colors.background.raised, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
              <div style={{ color: k.color, fontWeight: 800, fontSize: '22px' }}>{k.val}</div>
              <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '4px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {r.zonesTriees.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: colors.text.faint, fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>ZONES LES PLUS TOUCHÉES</div>
            {r.zonesTriees.map(([zone, count]) => (
              <div key={zone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{zone}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: colors.background.raised, borderRadius: '4px', height: '6px', width: '100px' }}>
                    <div style={{ background: colors.accent.orange, height: '6px', borderRadius: '4px', width: `${(count / r.total) * 100}%` }} />
                  </div>
                  <span style={{ color: colors.accent.orange, fontSize: '12px', fontWeight: 700, width: '16px' }}>{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {r.joueursTries.length > 0 && (
          <div>
            <div style={{ color: colors.text.faint, fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>JOUEURS LES PLUS TOUCHÉS</div>
            {r.joueursTries.map(([nom, count]) => (
              <div key={nom} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{nom}</span>
                <span style={{ color: colors.accent.orange, fontWeight: 700, fontSize: '13px' }}>{count} blessure{count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0 }}>
            {blessures.filter(b => b.statut !== 'gueri').length} joueur{blessures.filter(b => b.statut !== 'gueri').length !== 1 ? 's' : ''} actuellement hors compétition
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btnGhost} onClick={() => setShowRapport(v => !v)}>Rapport saison</button>
          <button style={s.btn} onClick={() => setShowFormBlessure(true)}>+ Déclarer une blessure</button>
        </div>
      </div>

      {showRapport && renderRapport()}

      {showFormBlessure && (
        <div style={{ ...s.card, border: `1px solid ${colors.border.default}` }}>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>NOUVELLE BLESSURE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['tous', 'Tous'], ...Object.entries(STATUT_META).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setFiltreStatut(k)}
            style={{
              background: filtreStatut === k ? colors.text.primary : colors.background.raised,
              color: filtreStatut === k ? colors.background.base : colors.text.faint,
              border: `1px solid ${filtreStatut === k ? colors.text.primary : colors.border.default}`,
              borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>{label}</button>
        ))}
      </div>

      {blessuresFiltrees.length === 0 && (
        <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
          {filtreStatut === 'tous' ? 'Aucune blessure déclarée' : 'Aucune blessure dans cette catégorie'}
        </div>
      )}
      {blessuresFiltrees.map(b => {
        const meta = STATUT_META[b.statut] || STATUT_META.en_cours
        const joueur = joueurDe(b.equipe_joueur_id)
        const joursDepuis = Math.floor((new Date() - new Date(`${b.date_debut}T12:00:00`)) / (1000 * 86400))
        return (
          <div key={b.id} onClick={() => ouvrirBlessure(b)}
            style={{ ...s.card, marginBottom: '10px', cursor: 'pointer', borderLeft: `3px solid ${meta.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {joueur?.avatar_url
                  ? <img src={joueur.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.background.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint, fontSize: '12px', fontWeight: 700 }}>{joueur?.prenom?.[0] || '?'}</div>}
                <div>
                  <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{joueur ? `${joueur.prenom} ${joueur.nom}` : 'Joueur'}</div>
                  <div style={{ color: colors.text.secondary, fontSize: '12px' }}>{b.type_blessure}{b.zone_corps ? ` — ${b.zone_corps}` : ''}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={s.pill(meta.color)}>{meta.label}</span>
                <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '4px' }}>
                  {joursDepuis === 0 ? "Aujourd'hui" : `Depuis ${joursDepuis} j`}
                  {b.date_retour_estimee && ` · Retour estimé ${new Date(`${b.date_retour_estimee}T12:00:00`).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
