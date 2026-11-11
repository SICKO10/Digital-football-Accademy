import { useState } from 'react'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import FilterBar from '../../components/coachAdmin/FilterBar'
import { appelerOutils } from '../../lib/outilsApi'
import { outilsOffrables, DUREES_RAPIDES, dureeValide, DUREE_MAX_JOURS } from '../../lib/offresOutils'

// Offres d'essai (bloc 12) : l'administrateur offre un outil pour une durée choisie
// à un compte (adresse email) ou à tous les comptes d'un rôle. Avant un envoi à un
// groupe, l'aperçu donne le nombre de comptes concernés et demande confirmation.
// Avant la bascule, seuls les comptes du nouveau modèle sont visés.
const ROLES = [{ id: 'educateur', label: 'Éducateurs' }, { id: 'club', label: 'Clubs' }]
const CIBLES = [{ id: 'compte', label: 'Un compte' }, { id: 'groupe', label: 'Tous les comptes' }]

const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`

export default function OffresOutils() {
  const { c, fonts, rgba } = useCoachTheme()
  const [role, setRole] = useState('educateur')
  const [cible, setCible] = useState('compte')
  const [outil, setOutil] = useState(outilsOffrables('educateur')[0].id)
  const [jours, setJours] = useState('30')
  const [email, setEmail] = useState('')
  const [apercu, setApercu] = useState(null) // réponse de l'aperçu, valable pour le formulaire tel qu'il était
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const outils = outilsOffrables(role)
  const nbJours = Number(jours)
  const formulaireOk = dureeValide(nbJours) && (cible === 'groupe' || email.trim().length > 3)

  const modifier = (fn) => { fn(); setApercu(null); setResultat(null); setErreur('') }
  const choisirRole = (r) => modifier(() => { setRole(r); setOutil(outilsOffrables(r)[0].id) })

  const corps = (extra = {}) => ({ role, outil, jours: nbJours, cible, ...(cible === 'compte' ? { email: email.trim() } : {}), ...extra })

  const lancer = async (extra, apresReponse) => {
    setEnvoi(true); setErreur(''); setResultat(null)
    try {
      apresReponse(await appelerOutils('offrir', corps(extra)))
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnvoi(false)
    }
  }

  const compter = () => lancer({ apercu: true }, setApercu)
  const offrir = () => lancer(
    cible === 'groupe' ? { confirme: true, attendu: apercu?.a_offrir } : {},
    (r) => { setResultat(r); setApercu(null) },
  )

  const etiquette = { margin: '0 0 6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textMuted }
  const champ = { background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 12px', color: c.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const bouton = (plein) => ({
    background: plein ? c.accent : 'transparent', color: plein ? '#fff' : c.text, border: plein ? 'none' : `1px solid ${c.border}`,
    borderRadius: '8px', padding: '9px 18px', fontWeight: 700, fontSize: '13px', cursor: envoi ? 'default' : 'pointer', opacity: envoi ? 0.6 : 1,
  })
  const nomOutil = outils.find(o => o.id === outil)?.nom || outil
  const aOffrir = apercu?.a_offrir || 0

  return (
    <>
      <p style={{ color: c.textMuted, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Offre un outil pour la durée de ton choix. Le compte reçoit une notification dans l'appli, aucun email n'est envoyé.
        Seuls les comptes qui utilisent déjà les outils à la carte sont concernés.
      </p>

      <Card>
        <p style={{ margin: '0 0 16px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>Nouvelle offre</p>

        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <div>
            <p style={etiquette}>Pour qui</p>
            <FilterBar toggles={ROLES.map(r => ({ key: r.id, label: r.label, active: role === r.id, onClick: () => choisirRole(r.id) }))} />
          </div>
          <div>
            <p style={etiquette}>Destinataires</p>
            <FilterBar toggles={CIBLES.map(ci => ({ key: ci.id, label: ci.label, active: cible === ci.id, onClick: () => modifier(() => setCible(ci.id)) }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label style={{ flex: '1 1 220px' }}>
            <p style={etiquette}>Outil offert</p>
            <select value={outil} onChange={e => modifier(() => setOutil(e.target.value))} style={{ ...champ, width: '100%' }}>
              {outils.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
            </select>
          </label>
          <label style={{ flex: '0 1 150px' }}>
            <p style={etiquette}>Durée en jours</p>
            <input type="number" inputMode="numeric" min={1} max={DUREE_MAX_JOURS} value={jours}
              onChange={e => modifier(() => setJours(e.target.value))} style={{ ...champ, width: '100%' }} />
          </label>
          {cible === 'compte' && (
            <label style={{ flex: '2 1 260px' }}>
              <p style={etiquette}>Adresse email du compte</p>
              <input type="email" value={email} placeholder="prenom@exemple.fr"
                onChange={e => modifier(() => setEmail(e.target.value))} style={{ ...champ, width: '100%' }} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontSize: '12px', color: c.textMuted }}>Durées courantes :</span>
          {DUREES_RAPIDES.map(d => (
            <button key={d} type="button" onClick={() => modifier(() => setJours(String(d)))}
              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${nbJours === d ? c.accent : c.border}`, background: nbJours === d ? rgba(c.accent, 0.12) : c.surface, color: nbJours === d ? c.accent : c.textMuted }}>
              {d} jours
            </button>
          ))}
        </div>

        {!dureeValide(nbJours) && jours !== '' && (
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: c.warn }}>La durée doit être un nombre entier de jours, de 1 à {DUREE_MAX_JOURS}.</p>
        )}

        {cible === 'compte' ? (
          <button type="button" onClick={offrir} disabled={!formulaireOk || envoi} style={bouton(true)}>
            {envoi ? 'Envoi...' : `Offrir ${nomOutil} pendant ${pluriel(nbJours || 0, 'jour', 'jours')}`}
          </button>
        ) : (
          <button type="button" onClick={compter} disabled={!formulaireOk || envoi} style={bouton(!apercu)}>
            {envoi && !apercu ? 'Calcul...' : 'Voir combien de comptes sont concernés'}
          </button>
        )}

        {erreur && (
          <div role="alert" style={{ marginTop: '14px', padding: '9px 14px', background: rgba(c.danger, 0.1), border: `1px solid ${rgba(c.danger, 0.35)}`, borderRadius: '8px', color: c.danger, fontSize: '12px', fontWeight: 600 }}>
            {erreur}
          </div>
        )}

        {apercu && (
          <div style={{ marginTop: '16px', padding: '14px 16px', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: c.text }}>
              {aOffrir === 0 ? 'Aucun compte à qui offrir' : `${pluriel(aOffrir, 'compte recevra', 'comptes recevront')} l'outil ${nomOutil}`}
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: c.textMuted, lineHeight: 1.6 }}>
              {pluriel(apercu.total, 'compte utilise', 'comptes utilisent')} les outils à la carte.
              {apercu.deja > 0 && ` ${pluriel(apercu.deja, 'a déjà', 'ont déjà')} cet outil pour aussi longtemps : ${apercu.deja > 1 ? 'ils sont laissés' : 'il est laissé'} tel quel.`}
              {apercu.sans_forfait > 0 && ` ${pluriel(apercu.sans_forfait, 'club sans forfait actif écarté', 'clubs sans forfait actif écartés')}.`}
              {aOffrir > 0 && ` L'offre s'arrête le ${dateFr(apercu.fin_le)}.`}
            </p>
            {aOffrir > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button type="button" onClick={offrir} disabled={envoi} style={bouton(true)}>
                  {envoi ? 'Envoi...' : `Confirmer l'offre à ${pluriel(aOffrir, 'compte', 'comptes')}`}
                </button>
                <button type="button" onClick={() => setApercu(null)} disabled={envoi} style={bouton(false)}>Annuler</button>
              </div>
            )}
          </div>
        )}

        {resultat && (
          <div role="status" style={{ marginTop: '16px', padding: '9px 14px', background: rgba(c.success, 0.1), border: `1px solid ${rgba(c.success, 0.35)}`, borderRadius: '8px', color: c.success, fontSize: '12px', fontWeight: 600, lineHeight: 1.6 }}>
            {resultat.offerts === 0
              ? (resultat.sans_forfait > 0 ? 'Ce club n\'a pas de forfait actif : rien n\'a été offert.' : 'Ce compte a déjà cet outil pour aussi longtemps : rien n\'a changé.')
              : `${nomOutil} offert à ${pluriel(resultat.offerts, 'compte', 'comptes')} jusqu'au ${dateFr(resultat.fin_le)}.`}
            {resultat.offerts > 0 && resultat.notifies < resultat.offerts && ' Les notifications n\'ont pas pu partir : les comptes voient l\'outil, mais ne sont pas prévenus.'}
          </div>
        )}
      </Card>
    </>
  )
}
