import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'

const CIBLES = [
  { val: 'tous', label: 'Tout le monde' },
  { val: 'educateurs', label: 'Éducateurs' },
  { val: 'joueurs', label: 'Joueurs' },
]

// Newsletter du club (annonces_club) — un clic sur "Envoyer" publie la
// communication en interne ET déclenche l'email groupé (edge function
// send-newsletter) au groupe ciblé, systématiquement. Destinataires calculés
// depuis club_educateurs (éducateurs affiliés) et affiliations (joueurs
// affiliés à ces éducateurs) — il n'existe pas de colonne profiles.role, le
// rattachement au club passe toujours par ces deux tables (cf.
// DashboardClub.jsx pour le même schéma).
export default function Newsletter({ clubId, clubNom, auteurNom, auteurId, couleurPrincipale, readOnly }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const [annonces, setAnnonces] = useState([])
  const [lusParAnnonce, setLusParAnnonce] = useState({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ titre: '', contenu: '', cible: 'tous' })
  const [envoi, setEnvoi] = useState(false)
  const [compteurs, setCompteurs] = useState({ tous: 0, educateurs: 0, joueurs: 0 })

  useEffect(() => { chargerAnnonces() }, [clubId])
  useEffect(() => { chargerCompteurs() }, [clubId])

  // Comptage seul (pas d'email) — mêmes tables que recupererDestinataires,
  // sans le fetch profiles (inutile juste pour afficher un nombre).
  const chargerCompteurs = async () => {
    if (!clubId) return
    const { data: educRows } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', clubId).eq('statut', 'accepte')
    const educateurIds = [...new Set((educRows || []).map(r => r.educateur_id).filter(Boolean))]
    let joueurIds = []
    if (educateurIds.length > 0) {
      const { data: affRows } = await supabase.from('affiliations').select('joueur_id').in('educateur_id', educateurIds).eq('statut', 'accepte')
      joueurIds = [...new Set((affRows || []).map(r => r.joueur_id).filter(Boolean))]
    }
    setCompteurs({ tous: educateurIds.length + joueurIds.length, educateurs: educateurIds.length, joueurs: joueurIds.length })
  }

  const chargerAnnonces = async () => {
    if (!clubId) return
    setLoading(true)
    const { data } = await supabase.from('annonces_club').select('*').eq('club_id', clubId).order('created_at', { ascending: false })
    setAnnonces(data || [])
    const ids = (data || []).map(a => a.id)
    if (ids.length > 0) {
      const { data: lues } = await supabase.from('annonces_lues').select('annonce_id').in('annonce_id', ids)
      const compte = {}
      ;(lues || []).forEach(l => { compte[l.annonce_id] = (compte[l.annonce_id] || 0) + 1 })
      setLusParAnnonce(compte)
    } else {
      setLusParAnnonce({})
    }
    setLoading(false)
  }

  // Éducateurs affiliés (club_educateurs) et joueurs affiliés à ces éducateurs
  // (affiliations) — profiles n'a pas de colonne role, ce sont ces deux tables
  // qui portent le rattachement au club.
  const recupererDestinataires = async (cible) => {
    const { data: educRows } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', clubId).eq('statut', 'accepte')
    const educateurIds = [...new Set((educRows || []).map(r => r.educateur_id).filter(Boolean))]

    let ids = []
    if (cible === 'tous' || cible === 'educateurs') ids.push(...educateurIds)
    if ((cible === 'tous' || cible === 'joueurs') && educateurIds.length > 0) {
      const { data: affRows } = await supabase.from('affiliations').select('joueur_id').in('educateur_id', educateurIds).eq('statut', 'accepte')
      ids.push(...(affRows || []).map(r => r.joueur_id).filter(Boolean))
    }
    ids = [...new Set(ids)]
    if (ids.length === 0) return []

    const { data: profils } = await supabase.from('profiles').select('email, prenom, nom').in('id', ids)
    return (profils || []).filter(p => p.email).map(p => ({ email: p.email, nom: `${p.prenom || ''} ${p.nom || ''}`.trim() }))
  }

  const envoyer = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) return
    setEnvoi(true)
    try {
      const { data: annonce, error } = await supabase.from('annonces_club').insert({
        club_id: clubId,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        auteur_nom: auteurNom,
        auteur_id: auteurId,
        cible: form.cible,
      }).select().single()
      if (error) throw error

      const destinataires = await recupererDestinataires(form.cible)
      if (destinataires.length > 0) {
        await supabase.functions.invoke('send-newsletter', {
          body: { annonce_id: annonce.id, club_id: clubId, titre: annonce.titre, contenu: annonce.contenu, destinataires },
        })
      }

      setForm({ titre: '', contenu: '', cible: 'tous' })
      await chargerAnnonces()
    } catch (e) {
      console.error('Erreur envoi newsletter:', e)
      alert("L'envoi a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette communication ?')) return
    await supabase.from('annonces_club').delete().eq('id', id)
    setAnnonces(prev => prev.filter(a => a.id !== id))
  }

  const cibleLabel = (val) => CIBLES.find(c => c.val === val)?.label || val

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ color: accent, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Communication</div>
        <h1 style={{ color: colors.text.primary, fontSize: '22px', fontWeight: 900, margin: 0 }}>Newsletter</h1>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1.2 1 360px', background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '24px', boxSizing: 'border-box' }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '15px', fontWeight: 700 }}>Nouvelle communication</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Envoyer à</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CIBLES.map(c => (
                  <button key={c.val} onClick={() => setForm(f => ({ ...f, cible: c.val }))}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      background: form.cible === c.val ? accent + alpha.subtle : 'transparent',
                      borderColor: form.cible === c.val ? accent : colors.border.strong,
                      color: form.cible === c.val ? accent : colors.text.faint }}>
                    {c.label} <span style={{ opacity: 0.6, fontSize: '11px' }}>({compteurs[c.val]})</span>
                  </button>
                ))}
              </div>
            </div>

            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Objet / Titre"
              style={{ width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '12px', color: colors.text.primary, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }} />

            <textarea value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
              placeholder="Contenu du message..." rows={6}
              style={{ width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '12px', color: colors.text.primary, fontSize: '14px', resize: 'vertical', marginBottom: '16px', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={envoyer} disabled={!form.titre.trim() || !form.contenu.trim() || envoi}
                style={{ background: accent, color: colors.background.base, border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 800, fontSize: '14px', cursor: envoi ? 'default' : 'pointer', opacity: envoi ? 0.6 : 1 }}>
                {envoi ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>

          <div style={{ flex: '0.8 1 240px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>Statistiques</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: colors.text.primary }}>{annonces.length}</div>
                  <div style={{ fontSize: '11px', color: colors.text.faint }}>Envois</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: colors.accent.green }}>{Object.values(lusParAnnonce).reduce((s, v) => s + v, 0)}</div>
                  <div style={{ fontSize: '11px', color: colors.text.faint }}>Lus</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: accent }}>{compteurs.tous}</div>
                  <div style={{ fontSize: '11px', color: colors.text.faint }}>Membres</div>
                </div>
              </div>
            </div>

            <div style={{ background: accent + alpha.faint, border: `1px solid ${accent}20`, borderRadius: '14px', padding: '16px' }}>
              <p style={{ color: accent, fontWeight: 700, fontSize: '13px', margin: '0 0 6px' }}>Conseil</p>
              <p style={{ color: colors.text.faint, fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                Chaque communication est aussi envoyée par email aux destinataires ciblés — vérifiez le groupe choisi avant d'envoyer.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Historique des envois</h3>
          <span style={{ color: colors.text.faint, fontSize: '13px' }}>{annonces.length} message{annonces.length > 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {annonces.map(a => (
              <div key={a.id} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{a.titre}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ background: colors.background.raised, color: colors.text.faint, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>
                      {cibleLabel(a.cible)}
                    </span>
                    {a.envoye_email && (
                      <span style={{ background: colors.accent.blue + alpha.soft, color: colors.accent.blue, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>Email envoyé</span>
                    )}
                    <span style={{ background: accent + alpha.faint, color: accent, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>
                      {lusParAnnonce[a.id] || 0} lu{(lusParAnnonce[a.id] || 0) > 1 ? 's' : ''}
                    </span>
                    <span style={{ color: colors.text.disabled, fontSize: '11px' }}>
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {!readOnly && (
                      <button onClick={() => supprimer(a.id)}
                        style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{a.contenu}</p>
              </div>
            ))}
            {annonces.length === 0 && (
              <div style={{ color: colors.text.ghost, fontSize: '13px', textAlign: 'center', padding: '40px' }}>Aucune communication envoyée</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
