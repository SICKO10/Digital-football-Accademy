import { useColors } from '../../lib/theme'
import { t, localeOf } from '../../lib/translations'
import { styleCarte, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, styleLigneCraie, couleurCraie, couleurClub, texteSur, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../../lib/identite'
import { police, forme } from '../../tokens'
import { Icone, Etiquette, Jauge } from '../identite'
import { Plus, X, Trash2, ArrowUp, ArrowDown, Equal, Scale } from 'lucide-react'
import { GroupeChoix, Barre, Statut } from './UiFinance'
import { carteStatut, styleMontant } from '../../lib/identiteFinance'

// Suivi réel du budget : le journal des entrées d'argent et des dépenses du club
// (table budget_club, alimenté à la main et par les tournois). Mêmes calculs et
// mêmes textes que l'ancienne vue du dashboard ; seule l'apparence change (kit
// d'identité : cartes à coins 6 px, chiffres condensés, lignes de craie).
// Les données et les actions (ajouter, supprimer) restent dans DashboardClub.

const CSS = `
  .br-kpi { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; }
  .br-main { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
  .br-ligne:hover { background: var(--br-hover); }
  .br-supprimer { opacity: .7; }
  .br-ligne:hover .br-supprimer, .br-supprimer:focus-visible { opacity: 1; }
  @media (max-width: 960px) { .br-main { grid-template-columns: minmax(0, 1fr); } .br-form { order: -1; } .br-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); } .br-hero { grid-column: 1 / -1; } }
  @media (max-width: 520px) { .br-kpi { grid-template-columns: 1fr; } }
`

export default function BudgetReel({
  entries, periode, setPeriode, formOuvert, setFormOuvert, form, setForm, saving, onAjouter, onSupprimer,
  canEdit, lang, categoriesDepense, categoriesRecette, couleursBudget,
}) {
  const colors = useColors()
  const locale = localeOf(lang)
  const montantFr = (n) => n.toLocaleString(locale, { minimumFractionDigits: 2 })
  const succes = colors.accent.success
  const rouge = colors.accent.red
  const craie = `1px solid ${couleurCraie(colors)}`

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
  const statut = solde > 0 ? { t: 'Excédent', i: ArrowUp, c: succes } : solde < 0 ? { t: 'Déficit', i: ArrowDown, c: rouge } : { t: 'À l’équilibre', i: Equal, c: colors.text.dim }

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

  const carte = styleCarte(colors)
  const titreCarte = { margin: 0, fontFamily: police.titre, fontSize: 20, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: colors.text.primary }
  const champ = { ...styleChamp(colors), minWidth: 0 }
  const peutEnregistrer = !saving && form.libelle.trim() && form.montant && form.categorie
  const couleurType = form.type === 'recette' ? succes : rouge
  const periodes = [['mois', t('club_ce_mois', lang)], ['saison', t('club_cette_saison', lang)], ['tout', t('club_tout', lang)]]

  return (
    <div style={{ '--br-hover': colors.background.raised }}>
      <style>{CSS}</style>

      {/* ── Barre d'outils : période et nouvelle entrée ── */}
      <div style={{ ...carte, marginBottom: 18 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: colors.text.secondary, lineHeight: 1.5 }}>{t('club_budget_desc', lang)}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <GroupeChoix libelle="Période" choix={periodes.map(([id, label]) => ({ id, label }))} valeur={periode} onChoisir={setPeriode} />
          {canEdit && (
            <button type="button" onClick={() => setFormOuvert(v => !v)} aria-expanded={formOuvert}
              className={formOuvert ? CLASSE_BOUTON_SECONDAIRE : CLASSE_BOUTON}
              style={{ ...(formOuvert ? styleBoutonSecondaire(colors) : styleBoutonPrincipal(colors)), marginLeft: 'auto' }}>
              <Icone icone={formOuvert ? X : Plus} />
              {formOuvert ? t('btn_annuler', lang) : t('club_nouvelle_entree', lang)}
            </button>
          )}
        </div>
      </div>

      {/* ── Chiffres clés ── */}
      <div className="br-kpi" style={{ marginBottom: 18 }}>
        <div className="br-hero" style={{ ...carte, padding: 22, boxShadow: `inset ${forme.lisere} 0 0 ${couleurClub(colors)}`, paddingLeft: 25 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <Etiquette as="p">{t('club_solde', lang)}</Etiquette>
            <Statut icone={statut.i} couleur={statut.c}>{statut.t}</Statut>
          </div>
          <p style={{ ...styleMontant(colors, 48), fontSize: 'clamp(36px, 5vw, 52px)', lineHeight: 1, margin: '12px 0 16px' }}>
            {solde >= 0 ? '+' : '−'}{montantFr(Math.abs(solde))} €
          </p>
          {couverture != null ? (
            <>
              <Jauge legende={false} hauteur={6} libelle={undefined}
                segments={[{ libelle: 'Dépenses couvertes par les recettes', valeur: Math.min(100, couverture), couleur: couleurCouverture }, { libelle: 'Reste à couvrir', valeur: Math.max(0, 100 - couverture), couleur: colors.border.default }]} pourcentages />
              <p style={{ margin: '10px 0 0', fontSize: 14, color: colors.text.secondary }}>Les recettes couvrent <strong style={{ color: colors.text.primary }}>{couverture} %</strong> des dépenses.</p>
            </>
          ) : <p style={{ margin: 0, fontSize: 14, color: colors.text.secondary }}>{totalRecettes > 0 ? 'Aucune dépense sur cette période.' : t('club_aucune_donnee', lang)}</p>}
        </div>
        {[[t('club_recettes', lang), totalRecettes, succes, '+', entriesFiltrees.filter(e => e.type === 'recette').length], [t('club_depenses', lang), totalDepenses, rouge, '−', entriesFiltrees.filter(e => e.type === 'depense').length]].map(([label, val, c, signe, nb]) => (
          <div key={label} style={{ ...carteStatut(colors, c), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
            <Etiquette as="p">{label}</Etiquette>
            <div>
              <p style={{ ...styleMontant(colors, 30), margin: 0 }}>{signe}{montantFr(val)} €</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.text.secondary }}>{nb} {nb > 1 ? 'entrées' : 'entrée'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="br-main">
        {/* ── Historique ── */}
        <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: craie, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={titreCarte}>{t('jcoach_historique', lang)}</h3>
            <span style={{ ...styleMontant(colors, 18), minWidth: 28, textAlign: 'center' }}>{entriesFiltrees.length}</span>
          </div>
          {entriesFiltrees.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', color: colors.text.dim, marginBottom: 10 }}><Icone icone={Scale} taille={20} /></span>
              <p style={{ ...titreCarte, fontSize: 20, margin: 0 }}>{t('club_aucune_entree_periode', lang)}</p>
              <p style={{ color: colors.text.secondary, margin: '8px auto 0', fontSize: 14, lineHeight: 1.6, maxWidth: 380 }}>{periode !== 'tout' ? 'Essaie « Cette saison » ou « Tout », ou ajoute une entrée.' : 'Enregistre les cotisations, subventions, achats et frais du club pour suivre le solde.'}</p>
            </div>
          ) : mois.map(g => (
            <div key={g.cle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 20px', background: colors.background.sunken, borderBottom: craie }}>
                <Etiquette>{libelleMois(g.cle)}</Etiquette>
                <span style={{ ...styleMontant(colors, 16, 600), color: colors.text.secondary }}>{g.net >= 0 ? '+' : '−'}{montantFr(Math.abs(g.net))} €</span>
              </div>
              {g.entrees.map(e => {
                const recette = e.type === 'recette'
                const c = recette ? succes : rouge
                const couleurCat = (recette ? categoriesRecetteArr : categoriesDepenseArr).find(x => x.cat === e.categorie)?.color || colors.text.dim
                return (
                  <div key={e.id} className="br-ligne" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: craie, boxShadow: `inset ${forme.lisere} 0 0 ${c}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{e.libelle}</div>
                      <div style={{ marginTop: 3, fontSize: 13, color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 1, background: couleurCat, flexShrink: 0 }} />{e.categorie}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(e.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {e.note && <><span aria-hidden="true">·</span><span style={{ fontStyle: 'italic' }}>{e.note}</span></>}
                      </div>
                    </div>
                    <span style={{ ...styleMontant(colors, 20), flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-flex', color: c }}><Icone icone={recette ? ArrowUp : ArrowDown} taille={16} libelle={recette ? 'Recette' : 'Dépense'} /></span>
                      {recette ? '+' : '−'}{montantFr(parseFloat(e.montant))} €
                    </span>
                    {canEdit && (
                      <button type="button" onClick={() => onSupprimer(e.id)} className={`${CLASSE_BOUTON_SECONDAIRE} br-supprimer`} aria-label={`${t('btn_supprimer', lang)} : ${e.libelle}`} title={t('btn_supprimer', lang)}
                        style={{ ...styleBoutonSecondaire(colors), width: 38, minHeight: 38, padding: 0, flexShrink: 0, color: colors.text.secondary }}>
                        <Icone icone={Trash2} taille={16} />
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
            <div className="br-form" style={{ ...carte, padding: 20 }}>
              <h3 style={{ ...titreCarte, marginBottom: 14 }}>{t('club_nouvelle_entree', lang)}</h3>
              <div role="radiogroup" aria-label="Type d’entrée" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {['depense', 'recette'].map(bt => {
                  const actif = form.type === bt
                  const c = bt === 'recette' ? succes : rouge
                  return (
                    <button key={bt} type="button" role="radio" aria-checked={actif} onClick={() => setForm(f => ({ ...f, type: bt, categorie: '' }))}
                      className={actif ? CLASSE_BOUTON : CLASSE_BOUTON_SECONDAIRE}
                      style={{ ...(actif ? { ...styleBoutonPrincipal(colors), background: c, color: texteSur(c) } : styleBoutonSecondaire(colors)), flex: 1, padding: '0 8px', fontWeight: 700 }}>
                      <Icone icone={bt === 'recette' ? ArrowUp : ArrowDown} taille={16} />
                      {bt === 'recette' ? t('club_recette', lang) : t('club_depense', lang)}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className={CLASSE_CHAMP} aria-label="Catégorie"
                  style={{ ...champ, color: form.categorie ? colors.text.primary : colors.text.secondary }}>
                  <option value="">{t('club_choisir_pts', lang)}</option>
                  {(form.type === 'recette' ? categoriesRecette : categoriesDepense).map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" step="0.01" placeholder={t('club_montant', lang)} aria-label="Montant" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} className={CLASSE_CHAMP} style={{ ...champ, paddingRight: 34, fontVariantNumeric: 'tabular-nums' }} />
                  <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: colors.text.secondary, fontSize: 15 }}>€</span>
                </div>
                <input type="text" placeholder={t('club_description_placeholder', lang)} aria-label="Description" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} className={CLASSE_CHAMP} style={champ} />
                <input type="date" aria-label="Date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={CLASSE_CHAMP} style={champ} />
                <input type="text" placeholder={t('club_note_optionnel_placeholder', lang)} aria-label="Note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={CLASSE_CHAMP} style={champ} />
                <button type="button" onClick={onAjouter} disabled={!peutEnregistrer} className={CLASSE_BOUTON}
                  style={{ ...styleBoutonPrincipal(colors), background: couleurType, color: texteSur(couleurType), marginTop: 4, minHeight: 44, fontWeight: 700 }}>
                  {saving ? t('jp_enregistrement', lang) : t('club_enregistrer', lang)}
                </button>
              </div>
            </div>
          )}

          {/* Répartition */}
          <div style={{ ...carte, padding: 20 }}>
            <h3 style={{ ...titreCarte, marginBottom: 14 }}>{t('club_repartition', lang)}</h3>
            {total === 0 ? (
              <p style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center', padding: '16px 0', margin: 0 }}>{t('club_aucune_donnee', lang)}</p>
            ) : (
              <>
                <Jauge hauteur={10} pourcentages
                  segments={[{ libelle: t('club_recettes', lang), valeur: totalRecettes, couleur: succes }, { libelle: t('club_depenses', lang), valeur: totalDepenses, couleur: rouge }]} />
                {[['Principales recettes', categoriesRecetteArr], ['Principales dépenses', categoriesDepenseArr]].map(([titre, arr]) => arr.length > 0 && (
                  <div key={titre} style={{ marginTop: 20 }}>
                    <div aria-hidden="true" style={{ ...styleLigneCraie(colors), marginBottom: 12 }} />
                    <Etiquette as="p" style={{ marginBottom: 10 }}>{titre}</Etiquette>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {arr.slice(0, 5).map(c => (
                        <div key={c.cat}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, fontSize: 14 }}>
                            <span style={{ flex: 1, minWidth: 0, color: colors.text.primary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
                            <span style={styleMontant(colors, 16)}>{c.montant.toLocaleString(locale, { maximumFractionDigits: 0 })} €</span>
                            <span style={{ ...styleMontant(colors, 15, 600), color: colors.text.secondary, width: 42, textAlign: 'right' }}>{Math.round(c.pct)} %</span>
                          </div>
                          <Barre part={c.pct} couleur={c.color} />
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

