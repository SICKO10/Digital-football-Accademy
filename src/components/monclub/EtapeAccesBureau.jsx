import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { CATEGORIES as CATEGORIES_STANDARD } from '../../lib/categories'
import { PERMISSION_DEFAULTS } from '../../lib/permissionsClub'
import {
  ROLES_STAFF, PERMISSION_SECTIONS, ACCES_CATEGORIES_DEFAUT, ROLES_ACCES_COMPLET_DEFAUT, ROLES_HORS_ACCES_CATEGORIES,
} from '../../lib/rolesClub'

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

  const cellBtn = (active, color) => ({
    padding: '5px 10px', borderRadius: 6, border: `1px solid ${active ? color : 'transparent'}`, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    background: active ? `${color}20` : colors.background.raised, color: active ? color : colors.text.faint,
  })

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: isMobile ? '16px' : '24px', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
      <h3 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: '16px', fontWeight: 800 }}>Accès du bureau</h3>
      <p style={{ margin: '0 0 6px', fontSize: '13px', lineHeight: 1.5, color: colors.text.muted }}>
        Le président voit et modifie tout, ce n'est pas réglable. Pour les autres rôles : « Voir » affiche l'onglet, « Modifier » autorise les ajouts et suppressions dans cet onglet.
      </p>
      <p style={{ margin: '0 0 18px', fontSize: '13px', lineHeight: 1.5, color: colors.text.muted }}>
        « Mon club » : le rôle coché voit les étapes Identité, Outils du club et Dashboard de mes éducateurs. Cette étape-ci, Accès du bureau, reste réservée au président.
      </p>

      <div style={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${colors.border.subtle}`, borderRadius: '10px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '640px' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: colors.background.surface, textAlign: 'left', padding: '8px 10px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: `1px 0 0 ${colors.border.subtle}` }}>Rôle</th>
              {PERMISSION_SECTIONS.map(s => (
                <th key={s.id} style={{ position: 'sticky', top: 0, zIndex: 2, background: colors.background.surface, textAlign: 'center', padding: '8px 10px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rolesConfigurables.map(role => (
              <tr key={role.val} style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 1, background: colors.background.surface, padding: '10px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: `1px 0 0 ${colors.border.subtle}` }}>{role.label}</td>
                {PERMISSION_SECTIONS.map(section => {
                  const cell = matrice[role.val][section.id]
                  return (
                    <td key={section.id} style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {section.id === SECTION_UN_SEUL_BOUTON ? (
                          <button onClick={() => toggle(role.val, section.id)} aria-pressed={cell.can_view && cell.can_edit} aria-label={`${role.label} : accès à Mon club`}
                            style={cellBtn(cell.can_view && cell.can_edit, accent)}>Accès</button>
                        ) : (
                          <>
                            <button onClick={() => toggle(role.val, section.id, 'can_view')} aria-pressed={cell.can_view} aria-label={`${role.label} : voir ${section.label}`}
                              style={cellBtn(cell.can_view, colors.accent.blue)}>Voir</button>
                            <button onClick={() => toggle(role.val, section.id, 'can_edit')} aria-pressed={cell.can_edit} aria-label={`${role.label} : modifier ${section.label}`}
                              style={cellBtn(cell.can_edit, accent)}>Modifier</button>
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

      <h4 style={{ margin: '24px 0 4px', color: colors.text.primary, fontSize: '14px', fontWeight: 800 }}>Accès par catégorie d'équipe</h4>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: colors.text.muted, lineHeight: 1.5 }}>
        Pour les rôles sans accès complet, limite les catégories d'équipes visibles (ex : U15 à U20 pour un Responsable Formation).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rolesCategorisables.map(role => {
          const cfg = catAccess[role.val]
          return (
            <div key={role.val} style={{ background: colors.background.raised, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{role.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.text.dim, cursor: 'pointer' }}>
                  <input type="checkbox" checked={cfg.acces_complet} onChange={() => toggleAccesComplet(role.val)} />
                  Accès complet (toutes catégories)
                </label>
              </div>
              {!cfg.acces_complet && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {CATEGORIES_STANDARD.map(cat => (
                    <button key={cat} onClick={() => toggleCategorie(role.val, cat)} aria-pressed={cfg.categories.includes(cat)}
                      style={cellBtn(cfg.categories.includes(cat), colors.accent.green)}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button onClick={enregistrer} disabled={saving || !modifie}
          style={{ background: accent, color: colors.accent.onBrand, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: saving || !modifie ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !modifie ? 0.5 : 1 }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={annuler} disabled={saving || !modifie}
          style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.muted, borderRadius: 10, padding: '10px 22px', fontSize: 13, cursor: saving || !modifie ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !modifie ? 0.5 : 1 }}>
          Annuler mes changements
        </button>
        {modifie && !message && <span style={{ fontSize: 12, color: colors.text.faint }}>Changements non enregistrés</span>}
        {message && <span role="status" style={{ fontSize: 12, color: message.ok ? colors.accent.green : colors.accent.red }}>{message.texte}</span>}
      </div>
    </div>
  )
}
