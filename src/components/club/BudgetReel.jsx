import { useColors } from '../../lib/theme'
import { t, localeOf } from '../../lib/translations'

// Suivi réel du budget : le journal des entrées d'argent et des dépenses du club
// (table budget_club, alimenté à la main et par les tournois). Mêmes calculs et
// mêmes textes que l'ancienne vue du dashboard ; seule l'apparence change, dans le
// même style que le budget prévisionnel (BudgetPrevisionnel.jsx).
// Les données et les actions (ajouter, supprimer) restent dans DashboardClub.

const CSS = `
  .br-in:focus-visible, .br-btn:focus-visible, .br-chip:focus-visible { outline: 2px solid var(--br-brand); outline-offset: 2px; }
  .br-kpi { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; }
  .br-main { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
  .br-ligne { transition: background .12s; }
  .br-ligne:hover { background: var(--br-hover); }
  .br-supprimer { opacity: .55; transition: opacity .12s, color .12s; }
  .br-ligne:hover .br-supprimer, .br-supprimer:focus-visible { opacity: 1; }
  @media (max-width: 960px) { .br-main { grid-template-columns: minmax(0, 1fr); } .br-form { order: -1; } .br-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); } .br-hero { grid-column: 1 / -1; } }
  @media (max-width: 520px) { .br-kpi { grid-template-columns: 1fr; } }
`

const Icone = ({ d, size = 16, trait = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={trait} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const ICONES = {
  plus: 'M12 5v14M5 12h14',
  fermer: 'M6 6l12 12M18 6L6 18',
  corbeille: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  haut: 'M12 19V5m0 0l-6 6m6-6l6 6',
  bas: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  egal: 'M5 9h14M5 15h14',
}

export default function BudgetReel({
  entries, periode, setPeriode, formOuvert, setFormOuvert, form, setForm, saving, onAjouter, onSupprimer,
  canEdit, lang, categoriesDepense, categoriesRecette, couleursBudget, couleurPrincipale,
}) {
  const colors = useColors()
  const locale = localeOf(lang)
  const montantFr = (n) => n.toLocaleString(locale, { minimumFractionDigits: 2 })
  const surBrand = colors.accent.onBrand || '#000'
  const succes = colors.accent.success
  const rouge = colors.accent.red

  const maintenant = new Date()
  const entriesFiltrees = entries.filter(e => {
    if (periode === 'tout') return true
    const d = new Date(e.date)
    if (periode === 'mois') return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear()
    if (periode === 'saison') {
      const saison = maintenant.getMonth() >= 6
        ? { start: new Date(maintenant.getFullYear(), 6, 1), end: new Date(maintenant.getFullYear() + 1, 5, 30) }
        : { start: new Date(maintenant.getFullYear() - 1, 6, 1), end: new Date(maintenant.getFullYear(), 5, 30) }
      return d >= saison.start && d <= saison.end
    }
    return true
  })

  const totalRecettes = entriesFiltrees.filter(e => e.type === 'recette').reduce((s, e) => s + parseFloat(e.montant), 0)
  const totalDepenses = entriesFiltrees.filter(e => e.type === 'depense').reduce((s, e) => s + parseFloat(e.montant), 0)
  const solde = totalRecettes - totalDepenses
  const total = totalRecettes + totalDepenses
  const couverture = totalDepenses > 0 ? Math.round((totalRecettes / totalDepenses) * 100) : null
  const couleurCouverture = couverture == null ? colors.border.strong : couverture >= 100 ? succes : couverture >= 60 ? colors.accent.amber : rouge
  const statut = solde > 0 ? { t: 'Excédent', i: ICONES.haut, c: succes } : solde < 0 ? { t: 'Déficit', i: ICONES.bas, c: rouge } : { t: 'À l’équilibre', i: ICONES.egal, c: colors.text.faint }

  const parCategorie = (type, palette) => Object.entries(entriesFiltrees.filter(e => e.type === type)
    .reduce((acc, e) => { acc[e.categorie] = (acc[e.categorie] || 0) + parseFloat(e.montant); return acc }, {}))
    .sort((a, b) => b[1] - a[1])
    .map(([cat, montant], i) => ({ cat, montant, pct: (type === 'depense' ? totalDepenses : totalRecettes) > 0 ? (montant / (type === 'depense' ? totalDepenses : totalRecettes)) * 100 : 0, color: palette[i % palette.length] }))
  const categoriesDepenseArr = parCategorie('depense', [rouge, colors.accent.orange, '#f59e0b', '#fb923c', colors.accent.amber, '#fca5a5', '#fed7aa', '#fde68a', '#fef3c7'])
  const categoriesRecetteArr = parCategorie('recette', couleursBudget)

  // Historique regroupé par mois (l'ordre des entrées est conservé).
  const mois = []
  entriesFiltrees.forEach(e => {
    const cle = String(e.date).slice(0, 7)
    let g = mois.find(x => x.cle === cle)
    if (!g) { g = { cle, entrees: [], net: 0 }; mois.push(g) }
    g.entrees.push(e)
    g.net += (e.type === 'recette' ? 1 : -1) * parseFloat(e.montant)
  })
  const libelleMois = (cle) => {
    const txt = new Date(`${cle}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return txt.charAt(0).toUpperCase() + txt.slice(1)
  }

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.04)' }
  const titreCarte = { margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px', color: colors.text.primary }
  const etiquette = { margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }
  const champ = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 12px', color: colors.text.primary, fontSize: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', width: '100%', minWidth: 0 }
  const peutEnregistrer = !saving && form.libelle.trim() && form.montant && form.categorie
  const couleurType = form.type === 'recette' ? succes : rouge
  const periodes = [['mois', t('club_ce_mois', lang)], ['saison', t('club_cette_saison', lang)], ['tout', t('club_tout', lang)]]

  return (
    <div style={{ '--br-brand': colors.accent.green, '--br-hover': colors.background.raised }}>
      <style>{CSS}</style>

      {/* ── Barre d'outils : période et nouvelle entrée ── */}
      <div style={{ ...carte, padding: 16, marginBottom: 18 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text.faint, lineHeight: 1.5 }}>{t('club_budget_desc', lang)}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Période" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, maxWidth: '100%', overflowX: 'auto' }}>
            {periodes.map(([val, label]) => {
              const actif = periode === val
              return (
                <button key={val} role="tab" aria-selected={actif} onClick={() => setPeriode(val)} className="br-chip"
                  style={{ padding: '8px 20px', minHeight: 38, borderRadius: 999, border: 'none', background: actif ? colors.accent.green : 'transparent', color: actif ? surBrand : colors.text.secondary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {label}
                </button>
              )
            })}
          </div>
          {canEdit && (
            <button onClick={() => setFormOuvert(v => !v)} className="br-btn" aria-expanded={formOuvert}
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', minHeight: 40, borderRadius: 10, border: formOuvert ? `1px solid ${colors.border.strong}` : 'none', background: formOuvert ? colors.background.surface : (couleurPrincipale || colors.accent.green), color: formOuvert ? colors.text.secondary : surBrand, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <Icone d={formOuvert ? ICONES.fermer : ICONES.plus} size={15} trait={2.6} />
              {formOuvert ? t('btn_annuler', lang) : t('club_nouvelle_entree', lang)}
            </button>
          )}
        </div>
      </div>

      {/* ── Chiffres clés ── */}
      <div className="br-kpi" style={{ marginBottom: 18 }}>
        <div className="br-hero" style={{ ...carte, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <p style={etiquette}>{t('club_solde', lang)}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px 4px 8px', borderRadius: 999, background: statut.c + '1c', fontSize: 12, fontWeight: 700, color: colors.text.primary }}>
              <span style={{ display: 'inline-flex', color: statut.c }}><Icone d={statut.i} size={14} trait={2.6} /></span>{statut.t}
            </span>
          </div>
          <p style={{ margin: '10px 0 14px', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>
            {solde >= 0 ? '+' : '−'}{montantFr(Math.abs(solde))} €
          </p>
          {couverture != null ? (
            <>
              <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, couverture)} aria-label="Part des dépenses couverte par les recettes" style={{ height: 8, borderRadius: 999, background: couleurCouverture + '26', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, couverture)}%`, height: '100%', borderRadius: 999, background: couleurCouverture, transition: 'width .3s' }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: colors.text.secondary }}>Les recettes couvrent <strong style={{ color: colors.text.primary }}>{couverture} %</strong> des dépenses.</p>
            </>
          ) : <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>{totalRecettes > 0 ? 'Aucune dépense sur cette période.' : t('club_aucune_donnee', lang)}</p>}
        </div>
        {[[t('club_recettes', lang), totalRecettes, succes, '+', entriesFiltrees.filter(e => e.type === 'recette').length], [t('club_depenses', lang), totalDepenses, rouge, '−', entriesFiltrees.filter(e => e.type === 'depense').length]].map(([label, val, c, signe, nb]) => (
          <div key={label} style={{ ...carte, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
            <p style={{ ...etiquette, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 }} />{label}
            </p>
            <div>
              <p style={{ margin: 0, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{signe}{montantFr(val)} €</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.faint }}>{nb} {nb > 1 ? 'entrées' : 'entrée'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="br-main">
        {/* ── Historique ── */}
        <div style={{ ...carte, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={titreCarte}>{t('jcoach_historique', lang)}</h3>
            <span style={{ minWidth: 28, textAlign: 'center', padding: '3px 10px', borderRadius: 999, background: colors.background.sunken, color: colors.text.secondary, fontSize: 12, fontWeight: 700 }}>{entriesFiltrees.length}</span>
          </div>
          {entriesFiltrees.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', background: colors.accent.green + '1f', color: colors.accent.green, marginBottom: 14 }}>
                <Icone d={ICONES.egal} size={24} />
              </span>
              <p style={{ color: colors.text.primary, fontWeight: 700, margin: 0, fontSize: 15 }}>{t('club_aucune_entree_periode', lang)}</p>
              <p style={{ color: colors.text.faint, margin: '6px auto 0', fontSize: 13, lineHeight: 1.6, maxWidth: 380 }}>{periode !== 'tout' ? 'Essaie « Cette saison » ou « Tout », ou ajoute une entrée.' : 'Enregistre les cotisations, subventions, achats et frais du club pour suivre le solde.'}</p>
            </div>
          ) : mois.map(g => (
            <div key={g.cle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 22px', background: colors.background.sunken, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.secondary }}>{libelleMois(g.cle)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{g.net >= 0 ? '+' : '−'}{montantFr(Math.abs(g.net))} €</span>
              </div>
              {g.entrees.map(e => {
                const recette = e.type === 'recette'
                const c = recette ? succes : rouge
                const couleurCat = (recette ? categoriesRecetteArr : categoriesDepenseArr).find(x => x.cat === e.categorie)?.color || colors.text.faint
                return (
                  <div key={e.id} className="br-ligne" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 12, background: c + '1c', color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icone d={recette ? ICONES.haut : ICONES.bas} size={17} trait={2.5} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{e.libelle}</div>
                      <div style={{ marginTop: 3, fontSize: 12, color: colors.text.faint, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.text.secondary }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: couleurCat, flexShrink: 0 }} />{e.categorie}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(e.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {e.note && <><span aria-hidden="true">·</span><span style={{ fontStyle: 'italic' }}>{e.note}</span></>}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 15, flexShrink: 0, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: c }}>{recette ? '+' : '−'}</span>{montantFr(parseFloat(e.montant))} €
                    </span>
                    {canEdit && (
                      <button onClick={() => onSupprimer(e.id)} className="br-btn br-supprimer" aria-label={`${t('btn_supprimer', lang)} : ${e.libelle}`} title={t('btn_supprimer', lang)}
                        style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.faint, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        onMouseEnter={ev => { ev.currentTarget.style.color = rouge }} onMouseLeave={ev => { ev.currentTarget.style.color = colors.text.faint }}>
                        <Icone d={ICONES.corbeille} size={15} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Formulaire et répartition ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {formOuvert && canEdit && (
            <div className="br-form" style={{ ...carte, padding: 22 }}>
              <h3 style={{ ...titreCarte, marginBottom: 14 }}>{t('club_nouvelle_entree', lang)}</h3>
              <div role="radiogroup" aria-label="Type d’entrée" style={{ display: 'flex', gap: 4, marginBottom: 14, padding: 4, borderRadius: 12, background: colors.background.sunken }}>
                {['depense', 'recette'].map(bt => {
                  const actif = form.type === bt
                  const c = bt === 'recette' ? succes : rouge
                  return (
                    <button key={bt} role="radio" aria-checked={actif} onClick={() => setForm(f => ({ ...f, type: bt, categorie: '' }))} className="br-btn"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', minHeight: 40, borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: actif ? c : 'transparent', color: actif ? (bt === 'recette' ? colors.black : '#fff') : colors.text.secondary }}>
                      <Icone d={bt === 'recette' ? ICONES.haut : ICONES.bas} size={14} trait={2.6} />
                      {bt === 'recette' ? t('club_recette', lang) : t('club_depense', lang)}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="br-in" aria-label="Catégorie"
                  style={{ ...champ, color: form.categorie ? colors.text.primary : colors.text.faint }}>
                  <option value="">{t('club_choisir_pts', lang)}</option>
                  {(form.type === 'recette' ? categoriesRecette : categoriesDepense).map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" step="0.01" placeholder={t('club_montant', lang)} aria-label="Montant" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} className="br-in" style={{ ...champ, paddingRight: 34, fontVariantNumeric: 'tabular-nums' }} />
                  <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: colors.text.faint, fontSize: 14 }}>€</span>
                </div>
                <input type="text" placeholder={t('club_description_placeholder', lang)} aria-label="Description" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} className="br-in" style={champ} />
                <input type="date" aria-label="Date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="br-in" style={champ} />
                <input type="text" placeholder={t('club_note_optionnel_placeholder', lang)} aria-label="Note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="br-in" style={champ} />
                <button onClick={onAjouter} disabled={!peutEnregistrer} className="br-btn"
                  style={{ marginTop: 4, padding: 12, minHeight: 44, borderRadius: 10, border: 'none', background: couleurType, color: form.type === 'recette' ? colors.black : '#fff', fontWeight: 800, fontSize: 14, cursor: peutEnregistrer ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', opacity: peutEnregistrer || saving ? 1 : 0.4 }}>
                  {saving ? t('jp_enregistrement', lang) : t('club_enregistrer', lang)}
                </button>
              </div>
            </div>
          )}

          {/* Répartition */}
          <div style={{ ...carte, padding: 22 }}>
            <h3 style={{ ...titreCarte, marginBottom: 14 }}>{t('club_repartition', lang)}</h3>
            {total === 0 ? (
              <p style={{ color: colors.text.faint, fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>{t('club_aucune_donnee', lang)}</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 2, height: 12 }} role="img" aria-label={`Recettes ${Math.round(totalRecettes / total * 100)} %, dépenses ${Math.round(totalDepenses / total * 100)} %`}>
                  {totalRecettes > 0 && <div style={{ flex: totalRecettes, background: succes, borderRadius: totalDepenses > 0 ? '999px 4px 4px 999px' : 999 }} />}
                  {totalDepenses > 0 && <div style={{ flex: totalDepenses, background: rouge, borderRadius: totalRecettes > 0 ? '4px 999px 999px 4px' : 999 }} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, fontSize: 12, color: colors.text.secondary }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: succes }} />{t('club_recettes', lang)} <strong style={{ color: colors.text.primary }}>{Math.round(totalRecettes / total * 100)} %</strong></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: rouge }} />{t('club_depenses', lang)} <strong style={{ color: colors.text.primary }}>{Math.round(totalDepenses / total * 100)} %</strong></span>
                </div>
                {[['Principales recettes', categoriesRecetteArr], ['Principales dépenses', categoriesDepenseArr]].map(([titre, arr]) => arr.length > 0 && (
                  <div key={titre} style={{ marginTop: 20 }}>
                    <p style={{ ...etiquette, marginBottom: 10 }}>{titre}</p>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {arr.slice(0, 5).map(c => (
                        <div key={c.cat}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13 }}>
                            <span style={{ flex: 1, minWidth: 0, color: colors.text.primary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
                            <span style={{ color: colors.text.primary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.montant.toLocaleString(locale, { maximumFractionDigits: 0 })} €</span>
                            <span style={{ color: colors.text.faint, width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(c.pct)} %</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: c.color + '26', overflow: 'hidden' }}>
                            <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 999, background: c.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
