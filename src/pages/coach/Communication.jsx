import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import Pill from '../../components/coachAdmin/Pill'
import StatCard from '../../components/coachAdmin/StatCard'
import FilterBar from '../../components/coachAdmin/FilterBar'
import { IcoMegaphone } from './NavIcons'

const TYPES = [
  { id: 'info', label: 'Info', pill: 'info' },
  { id: 'feature', label: 'Nouveauté', pill: 'success' },
  { id: 'maintenance', label: 'Maintenance', pill: 'pending' },
  { id: 'promo', label: 'Offre', pill: 'danger' },
]
const CIBLES = [
  { id: 'tous', label: 'Tous' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'educateurs', label: 'Éducateurs' },
  { id: 'joueurs', label: 'Joueurs' },
]
// Valeurs de profiles.plan (cf. Register.jsx) couvertes par chaque cible —
// mêmes familles que TYPE_FAMILIES (constants.js), sans recruteurs/dirigeants,
// hors périmètre des communications plateforme pour l'instant.
const CIBLE_PLANS = {
  clubs: ['club'],
  educateurs: ['educateur'],
  joueurs: ['joueur_starter', 'joueur_pro'],
}

export default function Communication({ adminId }) {
  const { c, fonts, rgba } = useCoachTheme()
  const [notifs, setNotifs] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', type: 'info', cible: 'tous', envoyer_email: false, actif: true })
  const [publication, setPublication] = useState(false)
  const [resultEnvoi, setResultEnvoi] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const charger = async () => {
    const { data, error } = await supabase.from('notifications_plateforme').select('*').order('created_at', { ascending: false })
    if (error) { console.error('Erreur chargement communications :', error); setNotifs([]); return }
    setNotifs(data || [])
  }
  useEffect(() => { charger() }, [])

  const publier = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) return
    setPublication(true)
    setResultEnvoi(null)
    try {
      const { data: notif, error } = await supabase.from('notifications_plateforme').insert({
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        type: form.type,
        cible: form.cible,
        envoye_email: form.envoyer_email,
        actif: form.actif,
        auteur_id: adminId,
      }).select().single()
      if (error) throw error

      if (form.envoyer_email && notif) {
        let query = supabase.from('profiles').select('email, prenom, nom')
        const plans = CIBLE_PLANS[form.cible]
        if (plans) query = query.in('plan', plans)
        const { data: membres } = await query.not('email', 'is', null)
        const destinataires = (membres || []).map(m => ({ email: m.email, nom: `${m.prenom || ''} ${m.nom || ''}`.trim() }))
        if (destinataires.length > 0) {
          const { data: result } = await supabase.functions.invoke('send-notification-plateforme', {
            body: { notification_id: notif.id, titre: notif.titre, contenu: notif.contenu, destinataires },
          })
          setResultEnvoi(result)
        }
      }

      setShowForm(false)
      setForm({ titre: '', contenu: '', type: 'info', cible: 'tous', envoyer_email: false, actif: true })
      await charger()
    } catch (e) {
      console.error('Erreur publication communication :', e)
      alert('La publication a échoué.')
    } finally {
      setPublication(false)
    }
  }

  const toggleActif = async (notif) => {
    setTogglingId(notif.id)
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, actif: !n.actif } : n))
    const { error } = await supabase.from('notifications_plateforme').update({ actif: !notif.actif }).eq('id', notif.id)
    setTogglingId(null)
    if (error) {
      alert('Erreur : ' + error.message)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, actif: notif.actif } : n))
    }
  }

  if (!notifs) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)
  const stats = [
    { label: 'Total publiées', value: notifs.length },
    { label: 'Actives (in-app)', value: notifs.filter(n => n.actif).length, accent: c.success },
    { label: 'Envoyées par email', value: notifs.filter(n => n.envoye_email).length, accent: c.accent },
    { label: 'Ce mois-ci', value: notifs.filter(n => new Date(n.created_at) >= debutMois).length, accent: c.warn },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, color: c.textMuted, fontSize: '13px' }}>Notifiez tous les utilisateurs de la plateforme — in-app et par email.</p>
        <button onClick={() => setShowForm(true)}
          style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Nouvelle communication
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />)}
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 16px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>Nouvelle communication</p>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textMuted }}>Type</p>
            <FilterBar toggles={TYPES.map(ty => ({ key: ty.id, label: ty.label, active: form.type === ty.id, onClick: () => setForm(f => ({ ...f, type: ty.id })) }))} />
          </div>

          <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
            placeholder="Titre de la communication"
            style={{ width: '100%', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 12px', color: c.text, fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />

          <textarea value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
            placeholder="Contenu du message..." rows={5}
            style={{ width: '100%', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 12px', color: c.text, fontSize: '13px', resize: 'vertical', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'inherit' }} />

          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textMuted }}>Destinataires</p>
              <FilterBar toggles={CIBLES.map(cb => ({ key: cb.id, label: cb.label, active: form.cible === cb.id, onClick: () => setForm(f => ({ ...f, cible: cb.id })) }))} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'envoyer_email', label: 'Envoyer par email' },
                { key: 'actif', label: "Afficher en bandeau dans l'app" },
              ].map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontSize: '12px', color: c.textMuted, fontWeight: 600 }}>
                  <span onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', background: form[opt.key] ? c.accent : c.border, position: 'relative', flexShrink: 0, transition: 'background 0.15s ease' }}>
                    <span style={{ position: 'absolute', top: '2px', left: form[opt.key] ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease' }} />
                  </span>
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)}
              style={{ background: 'transparent', color: c.textMuted, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Annuler
            </button>
            <button onClick={publier} disabled={!form.titre.trim() || !form.contenu.trim() || publication}
              style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: publication ? 0.6 : 1 }}>
              {publication ? 'Publication...' : form.envoyer_email ? 'Publier & envoyer' : 'Publier'}
            </button>
          </div>

          {resultEnvoi && (
            <div style={{ marginTop: '12px', padding: '9px 14px', background: rgba(c.success, 0.1), border: `1px solid ${rgba(c.success, 0.35)}`, borderRadius: '8px', color: c.success, fontSize: '12px', fontWeight: 600 }}>
              {resultEnvoi.envoyes} email{resultEnvoi.envoyes > 1 ? 's' : ''} envoyé{resultEnvoi.envoyes > 1 ? 's' : ''}
              {resultEnvoi.erreurs > 0 ? ` · ${resultEnvoi.erreurs} erreur${resultEnvoi.erreurs > 1 ? 's' : ''}` : ''}
            </div>
          )}
        </Card>
      )}

      {notifs.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoMegaphone size={40} /></div>
            <p style={{ color: c.textMuted }}>Aucune communication publiée</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifs.map(notif => {
            const typeInfo = TYPES.find(ty => ty.id === notif.type) || TYPES[0]
            const cibleLabel = CIBLES.find(cb => cb.id === notif.cible)?.label || notif.cible
            return (
              <Card key={notif.id}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: c.text, fontWeight: 700, fontSize: '14px' }}>{notif.titre}</span>
                      <Pill variant={typeInfo.pill}>{typeInfo.label}</Pill>
                      <Pill variant="inactive">{cibleLabel}</Pill>
                      {notif.envoye_email && <Pill variant="blue">Email envoyé</Pill>}
                      {!notif.actif && <Pill variant="inactive">Inactive</Pill>}
                    </div>
                    <p style={{ color: c.textMuted, fontSize: '12px', margin: '0 0 6px', lineHeight: '1.5' }}>{notif.contenu}</p>
                    <p style={{ color: c.textMuted, fontSize: '10px', margin: 0, opacity: 0.7 }}>
                      {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => toggleActif(notif)} disabled={togglingId === notif.id}
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 12px', color: c.textMuted, fontSize: '11px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                    {notif.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
