import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'

const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Lundi de la semaine à venir : stable du lundi au dimanche de la semaine en
// cours, et ne bascule sur le lundi suivant qu'à la transition
// dimanche→lundi (même calcul que lundiDeSemaine dans PlanningSemaineWidget,
// avec un décalage fixe de +7 jours pour toujours pointer sur la semaine
// qui n'a pas encore commencé).
const lundiSemaineAVenir = () => {
  const now = new Date()
  const decalage = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalage + 7)
}

const formatPeriode = (jours) => {
  const debut = jours[0], fin = jours[6]
  const optsDebut = { day: 'numeric', month: debut.getMonth() === fin.getMonth() ? undefined : 'long' }
  return `${debut.toLocaleDateString('fr-FR', optsDebut)} au ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

// Sondage hebdomadaire "jours disponibles", indépendant des séances : le
// joueur coche ses jours dispo pour la semaine à venir, l'éducateur voit la
// grille de toute l'équipe avant de créer ses séances.
export default function DispoSemaine({ mode, userId, educateurId, accentColor = colors.accent.green }) {
  const lundi = lundiSemaineAVenir()
  const joursSemaine = Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d })
  const semaineDebutStr = dateStr(lundi)
  const estDimancheAujourdhui = new Date().getDay() === 0

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [joursChoisis, setJoursChoisis] = useState([])
  const [dejaRepondu, setDejaRepondu] = useState(false)

  const [roster, setRoster] = useState([])
  const [reponses, setReponses] = useState([])

  const chargerJoueur = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('dispo_semaine').select('*').eq('joueur_id', userId).eq('semaine_debut', semaineDebutStr).maybeSingle()
    setJoursChoisis(data?.jours || [])
    setDejaRepondu(!!data)
    setLoading(false)
  }, [userId, semaineDebutStr])

  const chargerEducateur = useCallback(async () => {
    setLoading(true)
    const { data: eq } = await supabase.from('equipe_joueurs').select('id, joueur_id, prenom, nom').eq('educateur_id', educateurId).not('joueur_id', 'is', null)
    const list = eq || []
    setRoster(list)
    const ids = list.map(j => j.joueur_id).filter(Boolean)
    if (ids.length) {
      const { data: rep } = await supabase.from('dispo_semaine').select('*').eq('semaine_debut', semaineDebutStr).in('joueur_id', ids)
      setReponses(rep || [])
    } else {
      setReponses([])
    }
    setLoading(false)
  }, [educateurId, semaineDebutStr])

  useEffect(() => {
    if (mode === 'joueur' && userId) chargerJoueur()
    if (mode === 'educateur' && educateurId) chargerEducateur()
  }, [mode, userId, educateurId, chargerJoueur, chargerEducateur])

  const toggleJour = (dStr) => {
    setJoursChoisis(prev => prev.includes(dStr) ? prev.filter(x => x !== dStr) : [...prev, dStr])
  }

  const sauvegarder = async () => {
    setSaving(true)
    const { error } = await supabase.from('dispo_semaine').upsert(
      { joueur_id: userId, semaine_debut: semaineDebutStr, jours: joursChoisis },
      { onConflict: 'joueur_id,semaine_debut' }
    )
    setSaving(false)
    if (!error) setDejaRepondu(true)
  }

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px' }

  if (mode === 'joueur') {
    if (loading) return null
    return (
      <div style={{ ...card, borderColor: estDimancheAujourdhui ? `${accentColor}55` : colors.border.default, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>
              📅 Tes disponibilités — semaine du {formatPeriode(joursSemaine)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>
              {estDimancheAujourdhui
                ? "C'est aujourd'hui : coche les jours où tu peux venir t'entraîner."
                : "Coche les jours où tu es disponible, avant dimanche."}
            </p>
          </div>
          {dejaRepondu && <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor, background: `${accentColor}18`, borderRadius: '20px', padding: '4px 12px', whiteSpace: 'nowrap' }}>✓ Répondu</span>}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {joursSemaine.map((d, i) => {
            const dStr = dateStr(d)
            const actif = joursChoisis.includes(dStr)
            return (
              <button key={dStr} onClick={() => toggleJour(dStr)}
                style={{
                  flex: '1 1 60px', minWidth: '52px', padding: '10px 4px', borderRadius: '10px', cursor: 'pointer',
                  background: actif ? `${accentColor}20` : colors.background.raised,
                  border: `1px solid ${actif ? accentColor : colors.border.default}`,
                  color: actif ? accentColor : colors.text.faint,
                  fontFamily: 'Inter, sans-serif', textAlign: 'center',
                }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{JOURS_COURT[i]}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>{d.getDate()}</div>
              </button>
            )
          })}
        </div>

        <button onClick={sauvegarder} disabled={saving}
          style={{ background: accentColor, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, fontSize: '13px', padding: '10px 20px', cursor: 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
          {saving ? 'Enregistrement…' : dejaRepondu ? 'Mettre à jour' : 'Valider mes disponibilités'}
        </button>
      </div>
    )
  }

  // ─── mode éducateur : grille de toute l'équipe ─────────────────────────
  if (loading) return null
  const parJoueur = (joueurId) => reponses.find(r => r.joueur_id === joueurId)
  const compteParJour = joursSemaine.map(d => {
    const dStr = dateStr(d)
    return reponses.filter(r => (r.jours || []).includes(dStr)).length
  })

  return (
    <div style={{ ...card, marginBottom: '20px', overflowX: 'auto' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>
        📅 Disponibilités de l'équipe — semaine du {formatPeriode(joursSemaine)}
      </p>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint }}>
        {reponses.length}/{roster.length} joueur{roster.length > 1 ? 's' : ''} ont répondu — utile pour placer tes séances aux bons jours.
      </p>

      {roster.length === 0 ? (
        <p style={{ color: colors.text.faint, fontSize: '13px' }}>Aucun joueur affilié pour l'instant.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '520px', fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: colors.text.faint, fontWeight: 700 }}>Joueur</th>
              {joursSemaine.map((d, i) => (
                <th key={i} style={{ padding: '6px 4px', fontSize: '11px', color: colors.text.faint, fontWeight: 700, textAlign: 'center' }}>
                  {JOURS_COURT[i]}<br /><span style={{ color: colors.text.dim }}>{d.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map(j => {
              const rep = parJoueur(j.joueur_id)
              return (
                <tr key={j.id} style={{ borderTop: `1px solid ${colors.border.faint}` }}>
                  <td style={{ padding: '8px 10px', fontSize: '13px', color: colors.text.primary, whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</td>
                  {joursSemaine.map((d, i) => {
                    const dStr = dateStr(d)
                    const dispo = rep?.jours?.includes(dStr)
                    return (
                      <td key={i} style={{ textAlign: 'center', padding: '6px 4px' }}>
                        {!rep ? <span style={{ color: colors.text.ghost }}>—</span> : dispo
                          ? <span style={{ color: colors.accent.green, fontWeight: 800 }}>✓</span>
                          : <span style={{ color: colors.accent.red, opacity: 0.6 }}>✕</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `1px solid ${colors.border.default}` }}>
              <td style={{ padding: '8px 10px', fontSize: '11px', color: colors.text.faint, fontWeight: 700 }}>Total dispo</td>
              {compteParJour.map((n, i) => (
                <td key={i} style={{ textAlign: 'center', padding: '6px 4px', fontSize: '12px', fontWeight: 800, color: n > 0 ? accentColor : colors.text.ghost }}>{n}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
