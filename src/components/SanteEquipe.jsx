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

  const [blessures, setBlessures] = useState([])
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [blessureSelectionnee, setBlessureSelectionnee] = useState(null)
  const [suivis, setSuivis] = useState([])
  const [showFormBlessure, setShowFormBlessure] = useState(false)
  const [showFormSuivi, setShowFormSuivi] = useState(false)
  const [form, setForm] = useState(FORM_VIDE)
  const [formSuivi, setFormSuivi] = useState(FORM_SUIVI_VIDE)
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

  const joueurDe = (equipeJoueurId) => joueurs.find(j => j.id === equipeJoueurId)

  const declarerBlessure = async () => {
    if (!form.equipe_joueur_id || !form.type_blessure.trim() || !form.date_debut) return
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
        <button onClick={() => { setBlessureSelectionnee(null); setShowFormSuivi(false) }} style={{ ...s.btnGhost, marginBottom: '16px' }}>
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
      </div>
    )
  }

  // ── Liste équipe ────────────────────────────────────────────────────────
  const blessuresFiltrees = blessures.filter(b => filtreStatut === 'tous' || b.statut === filtreStatut)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0 }}>
            {blessures.filter(b => b.statut !== 'gueri').length} joueur{blessures.filter(b => b.statut !== 'gueri').length !== 1 ? 's' : ''} actuellement hors compétition
          </p>
        </div>
        <button style={s.btn} onClick={() => setShowFormBlessure(true)}>+ Déclarer une blessure</button>
      </div>

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
          <div key={b.id} onClick={() => { setBlessureSelectionnee(b); chargerSuivis(b.id) }}
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
