// Look commun du menu de gauche des dashboards (joueur, éducateur, club).
// Chaque dashboard garde sa couleur d'accent et ses entrées : seul l'habillage
// est partagé. Usage : <style>{menuLateralCss(colors)}</style> dans le menu,
// puis className="df-nav-btn" (+ data-actif, data-locked, data-compact et la
// variable --df-accent) sur chaque bouton, "df-nav-section" sur les titres.

export const menuLateralCss = (colors) => `
  .df-nav-btn { position: relative; width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 12px; margin: 1px 0; border: none; border-radius: 10px; background: transparent; color: ${colors.text.muted}; font-family: Inter, sans-serif; font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
  .df-nav-btn .df-nav-icone { display: flex; flex-shrink: 0; opacity: 0.7; transition: opacity 0.18s ease, transform 0.18s ease; }
  .df-nav-btn:hover { background: ${colors.background.raised}; color: ${colors.text.primary}; }
  .df-nav-btn:hover .df-nav-icone { opacity: 1; transform: scale(1.06); }
  .df-nav-btn:focus-visible { outline: 2px solid var(--df-accent); outline-offset: -2px; }
  .df-nav-btn[data-locked="true"] { color: ${colors.border.strong}; }
  .df-nav-btn[data-compact="true"] { justify-content: center; padding: 10px 0; }
  .df-nav-btn[data-actif="true"] { background: color-mix(in srgb, var(--df-accent) 14%, transparent); color: var(--df-accent); font-weight: 700; }
  .df-nav-btn[data-actif="true"] .df-nav-icone { opacity: 1; }
  .df-nav-btn[data-actif="true"]::before { content: ''; position: absolute; left: -10px; top: 50%; width: 4px; height: 18px; transform: translateY(-50%); border-radius: 0 4px 4px 0; background: var(--df-accent); }
  .df-nav-btn .df-nav-badge { min-width: 18px; height: 18px; padding: 0 6px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--df-accent); color: ${colors.black}; font-size: 10px; font-weight: 800; }
  .df-nav-section { display: flex; align-items: center; gap: 8px; margin: 0; padding: 20px 12px 7px; color: ${colors.text.ghost}; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  .df-nav-section::after { content: ''; flex: 1; height: 1px; background: ${colors.border.subtle}; }
`
