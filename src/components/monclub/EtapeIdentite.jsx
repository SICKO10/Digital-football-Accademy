import { useState } from 'react'
import { colors } from '../../tokens'
import { useColors } from '../../lib/theme'
import ApercuCouleurClub from '../ApercuCouleurClub'

// ── Personnalisation visuelle du club (couleurs, photo de fond, logo hero, slogan) ──
// Edite une copie locale des couleurs/slogan (themeEdit), appliquée immédiatement
// sur le hero banner et la nav via sauvegarderTheme (optimistic sur `club`, parent).
// Les uploads (fond/hero) se sauvegardent directement au choix du fichier — pas de
// bouton "Appliquer" séparé pour ceux-là.
const PRESETS_PRINCIPALE = [colors.accent.green, colors.accent.orange, colors.accent.blue, '#f43f5e', colors.accent.amber, colors.accent.purpleLight, colors.accent.cyan, '#ffffff']
const PRESETS_SECONDAIRE = [colors.accent.cyan, colors.accent.green, '#818cf8', colors.accent.orange, '#ec4899', '#34d399', colors.accent.amber, '#94a3b8']

// Une couleur au choix : sélecteur libre (toutes les couleurs possibles), code
// hexadécimal à saisir ou à coller, et pastilles toutes prêtes. Le bouton
// « Appliquer » ne s'active que si la couleur choisie diffère de celle du club.
function ChoixCouleur({ titre, champ, defaut, presets, club, themeEdit, setThemeEdit, sauvegarderTheme, savingTheme, labelStyle }) {
  const colors = useColors()
  const valeur = themeEdit[champ]
  const enregistree = club?.[champ] || defaut
  const [saisie, setSaisie] = useState(null)
  const texte = saisie ?? valeur
  const modifiee = valeur.toLowerCase() !== enregistree.toLowerCase()
  const choisir = (couleur) => { setSaisie(null); setThemeEdit(p => ({ ...p, [champ]: couleur })) }
  const saisir = (brut) => {
    const t = brut.startsWith('#') ? brut : `#${brut}`
    setSaisie(t)
    if (/^#[0-9a-f]{6}$/i.test(t)) setThemeEdit(p => ({ ...p, [champ]: t.toLowerCase() }))
  }
  return (
    <div>
      <label style={labelStyle}>{titre}</label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input type="color" value={valeur} aria-label={`${titre} : choisir une couleur libre`} onChange={e => choisir(e.target.value)}
          style={{ width: '44px', height: '44px', borderRadius: '8px', border: `1px solid ${colors.border.strong}`, cursor: 'pointer', background: 'none', padding: 0 }} />
        <input type="text" value={texte} maxLength={7} spellCheck={false} aria-label={`${titre} : code hexadécimal`} onChange={e => saisir(e.target.value.trim())} onBlur={() => setSaisie(null)}
          style={{ width: '96px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }} />
        <span style={{ fontSize: '12px', color: colors.text.faint }}>Toutes les couleurs sont possibles</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {presets.map(c => (
          <div key={c} onClick={() => choisir(c)} title={c}
            style={{ width: '26px', height: '26px', borderRadius: '6px', background: c, cursor: 'pointer', border: valeur.toLowerCase() === c.toLowerCase() ? '2px solid white' : '2px solid transparent', outline: `1px solid ${colors.border.default}` }} />
        ))}
      </div>
      <button onClick={() => sauvegarderTheme({ [champ]: valeur })} disabled={savingTheme || !modifiee}
        style={{ marginTop: '10px', background: modifiee ? valeur : colors.background.raised, border: modifiee ? 'none' : `1px solid ${colors.border.strong}`, borderRadius: '8px', color: modifiee ? '#fff' : colors.text.faint, padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: modifiee ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', textShadow: modifiee ? '0 1px 2px rgba(0,0,0,0.45)' : 'none' }}>
        {savingTheme ? 'Enregistrement...' : modifiee ? 'Appliquer cette couleur' : 'Couleur appliquée'}
      </button>
    </div>
  )
}

export default function EtapeIdentite({ club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile }) {
  const colors = useColors()
  const [messageSlogan, setMessageSlogan] = useState('')
  const label = { color: colors.text.faint, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const btnFichier = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', color: colors.text.faint, padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {/* Couleurs : choix libre, code hexadécimal ou pastilles */}
        <ChoixCouleur titre="Couleur principale" champ="couleur_principale" defaut={colors.accent.green} presets={PRESETS_PRINCIPALE}
          club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit} sauvegarderTheme={sauvegarderTheme} savingTheme={savingTheme} labelStyle={label} />
        <ChoixCouleur titre="Couleur secondaire" champ="couleur_secondaire" defaut={colors.accent.cyan} presets={PRESETS_SECONDAIRE}
          club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit} sauvegarderTheme={sauvegarderTheme} savingTheme={savingTheme} labelStyle={label} />

        <ApercuCouleurClub couleur={themeEdit.couleur_principale} couleur2={themeEdit.couleur_secondaire} />

        {/* Photo de fond */}
        <div>
          <label style={label}>Photo de fond (stade, terrain, vestiaire…)</label>
          {club?.image_fond_url && (
            <img src={club.image_fond_url} alt="Fond" style={{ width: '100%', maxWidth: '280px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={btnFichier}>
              {themeUploading === 'image_fond_url' ? '⏳ Upload...' : '📷 Choisir une photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!themeUploading}
                onChange={e => e.target.files[0] && uploaderImageTheme(e.target.files[0], 'image_fond_url')} />
            </label>
            {club?.image_fond_url && (
              <button onClick={() => sauvegarderTheme({ image_fond_url: null })}
                style={{ background: 'none', border: `1px solid ${colors.border.strong}`, borderRadius: '6px', color: colors.accent.red, padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Photo hero / logo grand format */}
        <div>
          <label style={label}>Photo / logo du club (grand format, remplace l'avatar dans l'en-tête)</label>
          {club?.image_hero_url && (
            <img src={club.image_hero_url} alt="Hero" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px', display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={btnFichier}>
              {themeUploading === 'image_hero_url' ? '⏳ Upload...' : '🖼️ Choisir logo / photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!themeUploading}
                onChange={e => e.target.files[0] && uploaderImageTheme(e.target.files[0], 'image_hero_url')} />
            </label>
            {club?.image_hero_url && (
              <button onClick={() => sauvegarderTheme({ image_hero_url: null })}
                style={{ background: 'none', border: `1px solid ${colors.border.strong}`, borderRadius: '6px', color: colors.accent.red, padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Slogan */}
        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
          <label style={label}>Slogan du club</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Ex: Ensemble, on va plus loin" value={themeEdit.slogan}
              onChange={e => setThemeEdit(p => ({ ...p, slogan: e.target.value }))}
              style={{ flex: 1, minWidth: '200px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <button onClick={async () => {
              setMessageSlogan('')
              const ok = await sauvegarderTheme({ slogan: themeEdit.slogan.trim() || null })
              if (ok) setMessageSlogan(themeEdit.slogan.trim() ? 'Slogan enregistré, il s\'affiche sur ton Accueil.' : 'Slogan supprimé.')
            }} disabled={savingTheme}
              style={{ background: club?.couleur_principale || colors.accent.green, border: 'none', borderRadius: '8px', color: colors.accent.onBrand, fontWeight: 700, padding: '10px 18px', cursor: savingTheme ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {savingTheme ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
          {messageSlogan && <p role="status" style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 600, color: colors.accent.success }}>{messageSlogan}</p>}
        </div>
      </div>
    </div>
  )
}
