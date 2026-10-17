import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { fetchToutesLignes } from '../../lib/supabasePagination'

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
export default function Newsletter({ clubId, auteurNom, auteurId, couleurPrincipale, readOnly }) {
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
      const { data: affRows } = await fetchToutesLignes(() => supabase.from('affiliations').select('id, joueur_id').in('educateur_id', educateurIds).eq('statut', 'accepte').order('id'))
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

      // Destinataires calculés par la fonction à partir du groupe ciblé
      // (le navigateur ne peut plus lire l'email des autres comptes).
      await supabase.functions.invoke('send-newsletter', {
        body: { annonce_id: annonce.id, club_id: clubId, titre: annonce.titre, contenu: annonce.contenu, cible: form.cible },
      })

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
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: colors.text.primary, fontSize: '24px', fontWeight: 800, margin: 0 }}>Newsletter</h1>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Communications envoyées aux membres affiliés du club, dans l'app et par email.</p>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1.4 1 360px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', boxSizing: 'border-box' }}>
            <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>Nouvelle communication</p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Envoyer à</div>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '2px', padding: '3px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
                {CIBLES.map(c => (
                  <button key={c.val} onClick={() => setForm(f => ({ ...f, cible: c.val }))}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: form.cible === c.val ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif',
                      background: form.cible === c.val ? colors.background.raised : 'transparent',
                      color: form.cible === c.val ? colors.text.primary : colors.text.faint }}>
                    {c.label} <span style={{ color: form.cible === c.val ? accent : colors.text.faint, fontSize: '12px', fontWeight: 700 }}>{compteurs[c.val]}</span>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: colors.text.faint }}>Sera envoyée à <strong style={{ color: colors.text.primary }}>{compteurs[form.cible]}</strong> personne{compteurs[form.cible] > 1 ? 's' : ''}, aussi par email.</span>
              <button onClick={envoyer} disabled={!form.titre.trim() || !form.contenu.trim() || envoi}
                style={{ background: accent, color: colors.background.base, border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 800, fontSize: '14px', cursor: envoi ? 'default' : 'pointer', opacity: envoi ? 0.6 : 1 }}>
                {envoi ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>

          <div style={{ flex: '0.8 1 240px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: colors.text.secondary, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', margin: '0 0 16px' }}>Statistiques</p>
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

            {annonces.length > 0 && (() => {
              // Taux de lecture moyen : lectures / destinataires estimés (compteur
              // actuel de la cible, faute d'historique du nombre de destinataires).
              const taux = Math.round(annonces.reduce((acc, a) => acc + Math.min(1, (lusParAnnonce[a.id] || 0) / Math.max(1, compteurs[a.cible] || 1)), 0) / annonces.length * 100)
              return (
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: colors.text.faint }}>Taux de lecture moyen</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: colors.text.primary }}>{taux}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: colors.background.base, overflow: 'hidden' }}>
                    <div style={{ width: `${taux}%`, height: '100%', background: accent }} />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: colors.text.secondary, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>Historique des envois</h3>
          <span style={{ color: colors.text.faint, fontSize: '13px' }}>{annonces.length} message{annonces.length > 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {annonces.map(a => (
              <div key={a.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${accent}`, borderRadius: '12px', padding: '14px 18px' }}>
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
                        title="Supprimer" style={{ background: 'transparent', border: 'none', color: colors.text.faint, cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ color: colors.text.secondary, fontSize: '13px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{a.contenu}</p>
              </div>
            ))}
            {annonces.length === 0 && (
              <div style={{ background: colors.background.surface, border: `1px dashed ${colors.border.default}`, borderRadius: '12px', color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '32px' }}>Aucune communication envoyée pour l'instant.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
