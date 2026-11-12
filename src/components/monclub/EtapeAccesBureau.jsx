import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { CATEGORIES as CATEGORIES_STANDARD } from '../../lib/categories'
import { PERMISSION_DEFAULTS } from '../../lib/permissionsClub'
import {
  ROLES_STAFF, PERMISSION_SECTIONS, ACCES_CATEGORIES_DEFAUT, ROLES_ACCES_COMPLET_DEFAUT, ROLES_HORS_ACCES_CATEGORIES,
} from '../../lib/rolesClub'
import Interrupteur from '../outils/Interrupteur'
import { Icone, EnteteEtape, Encart } from './ui'
import { ICONES, stylesMonClub, texteSur } from './uiMonClub'

// ── Accès du bureau : ce que chaque rôle du staff peut voir et modifier ──
// Grille : colonnes = PERMISSION_SECTIONS, lignes = ROLES_STAFF (hors président,
// qui a tout et n'apparaît pas ici). Édite une copie locale, ne touche la base
// qu'au clic sur « Enregistrer » via onSave (upsert complet de la matrice, fait
// par DashboardClub). La section « Mon club » n'a qu'un bouton « Accès » : voir
// et modifier vont ensemble, puisque la page n'a pas de mode lecture seule.
const SECTION_UN_SEUL_BOUTON = 'mon_club'

export default function EtapeAccesBureau({ rolePermissions, roleCategoriesAccess, saving, onSave, couleurPrincipale, isMobile }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const rolesConfigurables = ROLES_STAFF.filter(r => r.val !== 'president')
  // 'entraineur'/'educateur' sont exclus de l'accès par catégorie (leur périmètre
  // vient de l'affectation educateur_id existante, pas de cette matrice).
  const rolesCategorisables = rolesConfigurables.filter(r => !ROLES_HORS_ACCES_CATEGORIES.includes(r.val))

  const initMatrice = () => {
    const m = {}
    for (const role of rolesConfigurables) {
      m[role.val] = {}
      for (const section of PERMISSION_SECTIONS) {
        const row = rolePermissions.find(p => p.role === role.val && p.section === section.id)
        const parDefaut = (PERMISSION_DEFAULTS[section.id] || []).includes(role.val)
        m[role.val][section.id] = row
          ? { can_view: row.can_view, can_edit: row.can_edit }
          : { can_view: parDefaut, can_edit: parDefaut }
      }
    }
    return m
  }
  const initCatAccess = () => {
    const m = {}
    for (const role of rolesCategorisables) {
      const row = roleCategoriesAccess.find(r => r.role === role.val)
      m[role.val] = row
        ? { acces_complet: row.acces_complet, categories: row.categories || [] }
        : { acces_complet: ROLES_ACCES_COMPLET_DEFAUT.includes(role.val), categories: ACCES_CATEGORIES_DEFAUT[role.val] || [] }
    }
    return m
  }

  const [matrice, setMatrice] = useState(initMatrice)
  const [catAccess, setCatAccess] = useState(initCatAccess)
  const [modifie, setModifie] = useState(false)
  const [message, setMessage] = useState(null) // { ok: bool, texte }

  const changer = (fn) => { fn(); setModifie(true); setMessage(null) }

  const toggle = (role, section, cle) => changer(() => setMatrice(prev => {
    const cell = prev[role][section]
    let next
    if (section === SECTION_UN_SEUL_BOUTON) {
      const actif = !(cell.can_view && cell.can_edit)
      next = { can_view: actif, can_edit: actif }
    } else {
      next = { ...cell, [cle]: !cell[cle] }
      // Voir désactivé ⇒ Modifier n'a plus de sens ; Modifier activé ⇒ Voir est requis.
      if (cle === 'can_view' && !next.can_view) next.can_edit = false
      if (cle === 'can_edit' && next.can_edit) next.can_view = true
    }
    return { ...prev, [role]: { ...prev[role], [section]: next } }
  }))

  const toggleAccesComplet = (role) => changer(() => setCatAccess(prev => ({ ...prev, [role]: { ...prev[role], acces_complet: !prev[role].acces_complet } })))
  const toggleCategorie = (role, categorie) => changer(() => setCatAccess(prev => {
    const cats = prev[role].categories
    const next = cats.includes(categorie) ? cats.filter(c => c !== categorie) : [...cats, categorie]
    return { ...prev, [role]: { ...prev[role], categories: next } }
  }))

  const enregistrer = async () => {
    const ok = await onSave(matrice, catAccess)
    if (ok) { setModifie(false); setMessage({ ok: true, texte: 'Accès enregistrés.' }) }
    else setMessage({ ok: false, texte: 'Rien n\'a été enregistré. Vos choix sont gardés ici, vous pouvez réessayer.' })
  }
  const annuler = () => { setMatrice(initMatrice()); setCatAccess(initCatAccess()); setModifie(false); setMessage(null) }

  const st = stylesMonClub(colors)
  // Case à cocher en pastille : pleine et cochée quand c'est accordé (pas seulement une couleur).
  const puce = (actif, couleur) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', minHeight: 32, borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
    border: `1px solid ${actif ? couleur : colors.border.default}`, background: actif ? couleur : 'transparent', color: actif ? texteSur(couleur) : colors.text.faint,
  })
  const contenu = (actif) => actif ? <Icone d={ICONES.check} size={13} trait={3} /> : null
  const entete = { position: 'sticky', top: 0, zIndex: 2, background: colors.background.sunken, padding: '12px 10px', fontSize: 11, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 800, whiteSpace: 'nowrap' }
  const nbCases = rolesConfigurables.reduce((n, r) => n + PERMISSION_SECTIONS.filter(sec => matrice[r.val][sec.id].can_view).length, 0)

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: colors.text.primary }}>
      <EnteteEtape icone={ICONES.bureau} titre="Accès du bureau"
        texte="Le président voit et modifie tout, ce n'est pas réglable. Pour les autres rôles : « Voir » affiche l'onglet, « Modifier » autorise les ajouts et suppressions dans cet onglet." />
      <Encart>« Mon club » : le rôle coché voit les étapes Identité, Outils du club et Dashboard de mes éducateurs. Cette étape-ci, Accès du bureau, reste réservée au président.</Encart>

      <section style={{ ...st.carte, padding: isMobile ? 14 : 22, marginBottom: 20 }} aria-labelledby="mc-matrice">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 id="mc-matrice" style={st.titreCarte}>Ce que chaque rôle peut faire</h3>
          <span style={{ fontSize: 12, color: colors.text.faint }}>{nbCases} accès « Voir » accordés</span>
        </div>
        <div style={{ overflow: 'auto', maxHeight: '64vh', border: `1px solid ${colors.border.subtle}`, borderRadius: 14 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...entete, left: 0, zIndex: 3, textAlign: 'left', boxShadow: `1px 0 0 ${colors.border.subtle}` }}>Rôle</th>
                {PERMISSION_SECTIONS.map(sec => <th key={sec.id} style={{ ...entete, textAlign: 'center' }}>{sec.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rolesConfigurables.map(role => (
                <tr key={role.val} className="mc-ligne" style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, background: colors.background.surface, padding: '10px 12px', whiteSpace: 'nowrap', boxShadow: `1px 0 0 ${colors.border.subtle}` }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
                      <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: st.marque + '24', color: colors.text.primary }}>{role.label[0].toUpperCase()}</span>
                      {role.label}
                    </span>
                  </td>
                  {PERMISSION_SECTIONS.map(section => {
                    const cell = matrice[role.val][section.id]
                    return (
                      <td key={section.id} style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {section.id === SECTION_UN_SEUL_BOUTON ? (
                            <button type="button" onClick={() => toggle(role.val, section.id)} aria-pressed={cell.can_view && cell.can_edit} aria-label={`${role.label} : accès à Mon club`} className="mc-btn"
                              style={puce(cell.can_view && cell.can_edit, accent)}>{contenu(cell.can_view && cell.can_edit)}Accès</button>
                          ) : (
                            <>
                              <button type="button" onClick={() => toggle(role.val, section.id, 'can_view')} aria-pressed={cell.can_view} aria-label={`${role.label} : voir ${section.label}`} className="mc-btn"
                                style={puce(cell.can_view, colors.accent.blue)}>{contenu(cell.can_view)}Voir</button>
                              <button type="button" onClick={() => toggle(role.val, section.id, 'can_edit')} aria-pressed={cell.can_edit} aria-label={`${role.label} : modifier ${section.label}`} className="mc-btn"
                                style={puce(cell.can_edit, accent)}>{contenu(cell.can_edit)}Modifier</button>
                            </>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...st.carte, padding: isMobile ? 14 : 22 }} aria-labelledby="mc-categories">
        <h3 id="mc-categories" style={st.titreCarte}>Accès par catégorie d'équipe</h3>
        <p style={{ ...st.sousTitre, margin: '4px 0 16px' }}>Pour les rôles sans accès complet, limite les catégories d'équipes visibles (ex : U15 à U20 pour un Responsable Formation).</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {rolesCategorisables.map(role => {
            const cfg = catAccess[role.val]
            return (
              <div key={role.val} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{role.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, color: colors.text.secondary }}>
                    Accès complet (toutes catégories)
                    <Interrupteur actif={cfg.acces_complet} libelle={`${role.label} : accès complet à toutes les catégories`} onClick={() => toggleAccesComplet(role.val)} />
                  </span>
                </div>
                {!cfg.acces_complet && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {CATEGORIES_STANDARD.map(cat => (
                      <button key={cat} type="button" onClick={() => toggleCategorie(role.val, cat)} aria-pressed={cfg.categories.includes(cat)} className="mc-btn"
                        style={puce(cfg.categories.includes(cat), accent)}>{contenu(cfg.categories.includes(cat))}{cat}</button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div style={{ position: 'sticky', bottom: 12, zIndex: 5, marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 16, background: colors.background.surface, border: `1px solid ${modifie ? accent : colors.border.default}`, boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}>
        <button type="button" onClick={enregistrer} disabled={saving || !modifie} className="mc-btn" style={{ ...st.bouton(true, saving || !modifie), background: accent, color: texteSur(accent) }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={annuler} disabled={saving || !modifie} className="mc-btn" style={st.bouton(false, saving || !modifie)}>
          Annuler mes changements
        </button>
        {modifie && !message && <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary }}>Changements non enregistrés</span>}
        {message && <span role="status" style={{ fontSize: 13, fontWeight: 700, color: message.ok ? colors.accent.success : colors.accent.red }}>{message.texte}</span>}
      </div>
    </div>
  )
}
