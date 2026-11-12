import { useState } from 'react'
import { colors as tokens } from '../../tokens'
import { useColors } from '../../lib/theme'
import ApercuCouleurClub from '../ApercuCouleurClub'
import { Icone, EnteteEtape } from './ui'
import { ICONES, stylesMonClub, texteSur } from './uiMonClub'

// ── Personnalisation visuelle du club (couleurs, photo de fond, logo hero, slogan) ──
// Edite une copie locale des couleurs/slogan (themeEdit), appliquée immédiatement
// sur le hero banner et la nav via sauvegarderTheme (optimistic sur `club`, parent).
// Les uploads (fond/hero) se sauvegardent directement au choix du fichier — pas de
// bouton "Appliquer" séparé pour ceux-là.
const PRESETS_PRINCIPALE = [tokens.accent.green, tokens.accent.orange, tokens.accent.blue, '#f43f5e', tokens.accent.amber, tokens.accent.purpleLight, tokens.accent.cyan, '#ffffff']
const PRESETS_SECONDAIRE = [tokens.accent.cyan, tokens.accent.green, '#818cf8', tokens.accent.orange, '#ec4899', '#34d399', tokens.accent.amber, '#94a3b8']

// Une couleur au choix : carré cliquable (toutes les couleurs possibles), code
// hexadécimal à saisir ou à coller, et pastilles toutes prêtes. Le bouton
// « Appliquer » ne s'active que si la couleur choisie diffère de celle du club.
function ChoixCouleur({ titre, aide, champ, defaut, presets, club, themeEdit, setThemeEdit, sauvegarderTheme, savingTheme }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
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
    <div style={{ padding: 18, borderRadius: 16, background: colors.background.sunken, border: `1px solid ${colors.border.subtle}` }}>
      <p style={s.etiquette}>{titre}</p>
      <p style={{ ...s.sousTitre, margin: '4px 0 14px' }}>{aide}</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ position: 'relative', width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: valeur, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.15), 0 4px 14px ${valeur}55` }}>
          <input type="color" value={valeur} aria-label={`${titre} : choisir une couleur libre`} onChange={e => choisir(e.target.value)} className="mc-in"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
        </span>
        <div>
          <input type="text" value={texte} maxLength={7} spellCheck={false} aria-label={`${titre} : code hexadécimal`} onChange={e => saisir(e.target.value.trim())} onBlur={() => setSaisie(null)} className="mc-in"
            style={{ ...s.champ, width: 118, fontFamily: 'monospace', fontWeight: 700 }} />
          <p style={{ margin: '6px 0 0', fontSize: 11, color: colors.text.faint }}>Cliquez le carré : toutes les couleurs sont possibles.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map(c => {
          const actif = valeur.toLowerCase() === c.toLowerCase()
          return (
            <button key={c} type="button" onClick={() => choisir(c)} title={c} aria-label={`Couleur ${c}`} aria-pressed={actif} className="mc-btn"
              style={{ width: 30, height: 30, borderRadius: 999, background: c, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: texteSur(c),
                border: 'none', boxShadow: actif ? `0 0 0 2px ${colors.background.sunken}, 0 0 0 4px ${colors.text.primary}` : `inset 0 0 0 1px rgba(0,0,0,0.18)` }}>
              {actif && <Icone d={ICONES.check} size={14} trait={3} />}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => sauvegarderTheme({ [champ]: valeur })} disabled={savingTheme || !modifiee} className="mc-btn"
        style={{ ...s.bouton(false, savingTheme || !modifiee), marginTop: 16, ...(modifiee ? { background: valeur, color: texteSur(valeur), border: 'none' } : {}) }}>
        {savingTheme ? 'Enregistrement...' : modifiee ? 'Appliquer cette couleur' : <><Icone d={ICONES.check} size={15} trait={2.6} /> Couleur appliquée</>}
      </button>
    </div>
  )
}

// Une image du club : aperçu (ou emplacement vide), choix du fichier, suppression.
function TuileImage({ titre, aide, url, champ, carre, themeUploading, uploaderImageTheme, sauvegarderTheme }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const envoi = themeUploading === champ
  return (
    <div>
      <p style={s.etiquette}>{titre}</p>
      <p style={{ ...s.sousTitre, margin: '4px 0 12px' }}>{aide}</p>
      <div style={{
        width: carre ? 132 : '100%', maxWidth: carre ? 132 : 380, aspectRatio: carre ? '1 / 1' : '16 / 7', borderRadius: carre ? 20 : 16, overflow: 'hidden', marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.background.sunken, border: url ? `1px solid ${colors.border.subtle}` : `2px dashed ${colors.border.strong}`,
      }}>
        {url
          ? <img src={url} alt={titre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: colors.text.faint, fontSize: 12 }}><Icone d={ICONES.image} size={26} />Aucune image</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="mc-btn" style={{ ...s.bouton(false, !!themeUploading), cursor: themeUploading ? 'default' : 'pointer' }}>
          <Icone d={carre ? ICONES.image : ICONES.camera} size={15} />
          {envoi ? 'Envoi en cours...' : (url ? 'Changer' : 'Choisir') + (carre ? ' le logo' : ' la photo')}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!themeUploading}
            onChange={e => e.target.files[0] && uploaderImageTheme(e.target.files[0], champ)} />
        </label>
        {url && (
          <button type="button" onClick={() => sauvegarderTheme({ [champ]: null })} className="mc-btn"
            style={{ ...s.bouton(false), color: colors.accent.red, borderColor: colors.accent.red + '66' }}>
            <Icone d={ICONES.corbeille} size={15} /> Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

export default function EtapeIdentite({ club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const [messageSlogan, setMessageSlogan] = useState('')
  const deux = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }
  const commun = { club, themeEdit, setThemeEdit, sauvegarderTheme, savingTheme }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <EnteteEtape icone={ICONES.identite} titre="Identité du club"
        texte="Couleurs, photos et slogan : ce que voient vos joueurs et vos éducateurs. Chaque réglage s'applique tout de suite." />

      <div style={{ display: 'grid', gap: 20 }}>
        <section style={{ ...s.carte, padding: isMobile ? 18 : 24 }} aria-labelledby="mc-couleurs">
          <h3 id="mc-couleurs" style={s.titreCarte}>Couleurs</h3>
          <p style={{ ...s.sousTitre, margin: '4px 0 18px' }}>Deux couleurs, et un aperçu avant d'enregistrer.</p>
          <div style={deux}>
            <ChoixCouleur {...commun} titre="Couleur principale" aide="Menu, boutons et éléments actifs." champ="couleur_principale" defaut={tokens.accent.green} presets={PRESETS_PRINCIPALE} />
            <ChoixCouleur {...commun} titre="Couleur secondaire" aide="Slogan et petits titres." champ="couleur_secondaire" defaut={tokens.accent.cyan} presets={PRESETS_SECONDAIRE} />
          </div>
          <div style={{ marginTop: 22 }}>
            <p style={{ ...s.etiquette, marginBottom: 10 }}>Aperçu : comme vos joueurs et éducateurs la verront</p>
            <ApercuCouleurClub couleur={themeEdit.couleur_principale} couleur2={themeEdit.couleur_secondaire} sansTitre />
          </div>
        </section>

        <section style={{ ...s.carte, padding: isMobile ? 18 : 24 }} aria-labelledby="mc-images">
          <h3 id="mc-images" style={s.titreCarte}>Images</h3>
          <p style={{ ...s.sousTitre, margin: '4px 0 18px' }}>Elles s'enregistrent dès que vous choisissez le fichier.</p>
          <div style={deux}>
            <TuileImage titre="Photo de fond" aide="Stade, terrain, vestiaire : en bannière sur l'accueil." url={club?.image_fond_url} champ="image_fond_url"
              themeUploading={themeUploading} uploaderImageTheme={uploaderImageTheme} sauvegarderTheme={sauvegarderTheme} />
            <TuileImage titre="Logo ou photo du club" aide="Grand format : remplace l'avatar dans l'en-tête." url={club?.image_hero_url} champ="image_hero_url" carre
              themeUploading={themeUploading} uploaderImageTheme={uploaderImageTheme} sauvegarderTheme={sauvegarderTheme} />
          </div>
        </section>

        <section style={{ ...s.carte, padding: isMobile ? 18 : 24 }} aria-labelledby="mc-slogan">
          <h3 id="mc-slogan" style={s.titreCarte}>Slogan du club</h3>
          <p style={{ ...s.sousTitre, margin: '4px 0 14px' }}>Une phrase courte, affichée sur l'accueil de vos joueurs et de vos éducateurs.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Ex : Ensemble, on va plus loin" value={themeEdit.slogan} aria-label="Slogan du club" className="mc-in"
              onChange={e => setThemeEdit(p => ({ ...p, slogan: e.target.value }))} style={{ ...s.champ, flex: 1, minWidth: 220, padding: '12px 14px', fontSize: 15 }} />
            <button type="button" className="mc-btn" disabled={savingTheme} style={{ ...s.bouton(true, savingTheme), padding: '10px 24px', cursor: savingTheme ? 'wait' : 'pointer' }}
              onClick={async () => {
                setMessageSlogan('')
                const ok = await sauvegarderTheme({ slogan: themeEdit.slogan.trim() || null })
                if (ok) setMessageSlogan(themeEdit.slogan.trim() ? 'Slogan enregistré, il s\'affiche sur ton Accueil.' : 'Slogan supprimé.')
              }}>
              {savingTheme ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
          {messageSlogan && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: colors.accent.success }}>{messageSlogan}</p>}
        </section>
      </div>
    </div>
  )
}
