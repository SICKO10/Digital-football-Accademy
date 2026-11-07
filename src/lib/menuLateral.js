// Look commun du menu de gauche des dashboards (joueur, éducateur, club) : plein
// couleur du club. Les couleurs viennent des variables CSS posées à la racine par
// PorteeThemeClub (--menu-bg, --menu-text, --menu-text-muted, --menu-hover,
// --menu-active-bg, --menu-active-text) ; les valeurs de repli sont le vert par défaut.
// Usage : className="df-menu" sur l'<aside>, <style>{menuLateralCss}</style> dans le
// menu, puis className="df-nav-btn" (+ data-actif, data-locked, data-compact) sur
// chaque entrée et "df-nav-section" sur les titres. Autres classes : df-menu-pastille
// (équipe, data-actif), df-menu-contour (bouton en contour, data-pointille),
// df-menu-chip (drapeau de langue, data-actif).
// Coque mobile commune : df-drawer (+ data-ouvert) sur le menu coulissant avec
// df-menu, df-drawer-backdrop sur le fond qui ferme le menu, df-burger sur le
// bouton qui l'ouvre, df-topbar sur la barre du haut quand le dashboard en a une.
// La couleur d'accent de chaque espace vient de --df-accent (posée par la page).

export const BORDURE_MENU = '1px solid rgba(255,255,255,0.2)'

export const menuLateralCss = `
  .df-menu { background: var(--menu-bg, #1F7A4D); color: var(--menu-text, #FFFFFF); border-right: none; }
  .df-nav-btn { position: relative; width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 12px; margin: 1px 0; border: none; border-radius: 10px; background: transparent; color: var(--menu-text-muted, rgba(255,255,255,0.85)); font-family: Inter, sans-serif; font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
  .df-nav-btn .df-nav-icone { display: flex; flex-shrink: 0; opacity: 0.85; transition: opacity 0.18s ease, transform 0.18s ease; }
  .df-nav-btn:hover { background: var(--menu-hover, rgba(255,255,255,0.12)); color: var(--menu-text, #FFFFFF); }
  .df-nav-btn:hover .df-nav-icone { opacity: 1; transform: scale(1.06); }
  .df-nav-btn:focus-visible, .df-menu-contour:focus-visible, .df-menu-pastille button:focus-visible, .df-menu-chip:focus-visible { outline: 2px solid var(--menu-text, #FFFFFF); outline-offset: -2px; }
  .df-nav-btn[data-locked="true"] { opacity: 0.55; }
  .df-nav-btn[data-compact="true"] { justify-content: center; padding: 10px 0; }
  .df-nav-btn[data-actif="true"] { background: var(--menu-active-bg, #FFFFFF); color: var(--menu-active-text, #1F7A4D); font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.12); }
  .df-nav-btn[data-actif="true"] .df-nav-icone { opacity: 1; }
  .df-nav-btn .df-nav-badge { min-width: 18px; height: 18px; padding: 0 6px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--menu-active-bg, #FFFFFF); color: var(--menu-active-text, #1F7A4D); font-size: 10px; font-weight: 800; }
  .df-nav-btn[data-actif="true"] .df-nav-badge { background: var(--menu-active-text, #1F7A4D); color: var(--menu-active-bg, #FFFFFF); }
  .df-nav-section { display: flex; align-items: center; gap: 8px; margin: 0; padding: 20px 12px 7px; color: var(--menu-text, #FFFFFF); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  .df-nav-section::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.22); }
  .df-menu-entete { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .df-menu-logo { width: 36px; height: 36px; border-radius: 50%; background: #FFFFFF; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--menu-active-text, #1F7A4D); font-size: 13px; font-weight: 800; letter-spacing: -0.5px; }
  .df-menu-logo img { width: 100%; height: 100%; object-fit: cover; }
  .df-menu-titre { font-size: 15px; font-weight: 800; letter-spacing: -0.4px; white-space: nowrap; color: var(--menu-text, #FFFFFF); }
  .df-menu-pastille { display: inline-flex; align-items: center; border-radius: 20px; border: 1px solid rgba(255,255,255,0.7); color: var(--menu-text, #FFFFFF); background: transparent; }
  .df-menu-pastille button { border: none; background: transparent; color: inherit; cursor: pointer; font-family: Inter, sans-serif; font-size: 11px; }
  .df-menu-pastille[data-actif="true"] { background: var(--menu-active-bg, #FFFFFF); color: var(--menu-active-text, #1F7A4D); }
  .df-menu-contour { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.7); background: transparent; color: var(--menu-text, #FFFFFF); font-family: Inter, sans-serif; font-size: 12px; text-align: left; cursor: pointer; transition: background 0.18s ease; }
  .df-menu-contour:hover { background: var(--menu-hover, rgba(255,255,255,0.12)); }
  .df-menu-contour[data-pointille="true"] { width: auto; padding: 4px 10px; border-radius: 20px; border-style: dashed; font-size: 11px; }
  .df-menu-chip { border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--menu-text, #FFFFFF); cursor: pointer; font-size: 15px; line-height: 1.2; padding: 4px 8px; }
  .df-menu-chip:hover { background: var(--menu-hover, rgba(255,255,255,0.12)); }
  .df-menu-chip[data-actif="true"] { border-color: var(--menu-text, #FFFFFF); background: rgba(255,255,255,0.2); }
  .df-drawer { transition: left 0.25s ease, box-shadow 0.25s ease; }
  .df-drawer[data-ouvert="true"] { box-shadow: 8px 0 32px rgba(0,0,0,0.35); }
  .df-drawer-backdrop { background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); animation: df-drawer-fondu 0.2s ease; }
  @keyframes df-drawer-fondu { from { opacity: 0; } to { opacity: 1; } }
  .df-burger { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px; padding: 0; border-radius: 999px; background: var(--df-surface, #FFFFFF); border: 1px solid var(--df-bordure, rgba(0,0,0,0.12)); color: var(--df-texte, #111111); cursor: pointer; transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease; }
  .df-burger:hover { border-color: var(--df-accent, #1F7A4D); }
  .df-burger:active { transform: scale(0.94); }
  .df-burger:focus-visible { outline: 2px solid var(--df-accent, #1F7A4D); outline-offset: 2px; }
  .df-topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--df-surface, #FFFFFF); border-bottom: 1px solid var(--df-bordure, rgba(0,0,0,0.12)); }
  @media (prefers-reduced-motion: reduce) { .df-drawer, .df-burger { transition: none; } .df-drawer-backdrop { animation: none; } }
`

// Bouton soleil/lune (ThemeToggleButton) posé sur le fond couleur du club.
export const MENU_TOGGLE_STYLE = { border: '1px solid rgba(255,255,255,0.7)', color: 'var(--menu-text, #FFFFFF)' }

// Variables de la coque (fond, bordure, texte, accent) à poser en style sur la
// racine du dashboard : chaque espace garde sa couleur d'accent, le reste est commun.
export const coqueVars = (colors, accent) => ({
  '--df-surface': colors.background.surface,
  '--df-bordure': colors.border.subtle,
  '--df-texte': colors.text.primary,
  '--df-accent': accent,
})
