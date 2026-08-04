import { useState } from "react";

// ─── FAQ RAPIDE ──────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Comment uploader une vidéo ?",
    a: "Va dans ton dashboard → section 'Upload'. Formats acceptés : MP4, MOV. Taille max : 500 Mo.",
  },
  {
    q: "Quand vais-je recevoir mon analyse ?",
    a: "Ton analyse est réalisée par notre équipe et disponible directement dans la rubrique Analyses de ton dashboard. Tu reçois une notification sur la plateforme et un email dès qu'elle est prête.",
  },
  {
    q: "Comment les recruteurs voient mon profil ?",
    a: "Avec l'abonnement Pro, ton profil apparaît dans la recherche des recruteurs. Assure-toi qu'il est bien rempli !",
  },
  {
    q: "Combien d'analyses par mois ?",
    a: "Offre mensuelle : 1 analyse offerte tous les 6 mois. Offre annuelle : 2 analyses offertes dès le paiement. Pour toute analyse supplémentaire : 60€ l'unité, quelle que soit ton offre.",
  },
  {
    q: "Comment changer mon abonnement ?",
    a: "Dans ton profil → 'Abonnement' → 'Modifier'. Le changement prend effet immédiatement.",
  },
];

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  btn: (open) => ({
    position: "fixed",
    bottom: "28px",
    right: "28px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: open ? "#166534" : "linear-gradient(135deg, #4ade80, #22c55e)",
    border: "none",
    cursor: "pointer",
    fontSize: "24px",
    boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
    zIndex: 900,
    transition: "all 0.25s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  panel: (open) => ({
    position: "fixed",
    bottom: "96px",
    right: "28px",
    width: "320px",
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    boxShadow: "0 0 40px rgba(0,0,0,0.6)",
    zIndex: 900,
    overflow: "hidden",
    transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "all" : "none",
    transition: "all 0.25s ease",
    transformOrigin: "bottom right",
  }),
  header: {
    background: "linear-gradient(135deg, #166534, #14532d)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  },
  headerText: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
  },
  headerSub: {
    color: "#86efac",
    fontSize: "12px",
    marginTop: "2px",
  },
  body: {
    padding: "16px",
    maxHeight: "360px",
    overflowY: "auto",
  },
  sectionTitle: {
    color: "#71717a",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },
  faqItem: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  faqQ: {
    color: "#e4e4e7",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "0",
  },
  faqA: {
    color: "#a1a1aa",
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #2a2a2a",
  },
  replayBtn: {
    display: "block",
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    background: "transparent",
    border: "1px solid #4ade80",
    borderRadius: "8px",
    color: "#4ade80",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

// ─── COMPOSANT ───────────────────────────────────────────────────────────────
export default function FloatingHelper({ userId, onReplayOnboarding }) {
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleReplay = () => {
    // Supprime le flag onboarding pour relancer le guide
    const key = userId ? `onboarding_done_${userId}` : "onboarding_done";
    localStorage.removeItem(key);
    setOpen(false);
    if (onReplayOnboarding) onReplayOnboarding();
  };

  return (
    <>
      <style>{`
        .faq-item:hover { border-color: #4ade80 !important; }
        .replay-btn:hover { background: rgba(74,222,128,0.1) !important; }
        .float-btn:hover { transform: scale(1.1); }
        .helper-scroll::-webkit-scrollbar { width: 4px; }
        .helper-scroll::-webkit-scrollbar-track { background: #1a1a1a; }
        .helper-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>

      {/* Panneau d'aide */}
      <div style={S.panel(open)}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerAvatar}>⚽</div>
          <div>
            <div style={S.headerText}>Alex — Ton guide</div>
            <div style={S.headerSub}>Comment puis-je t'aider ?</div>
          </div>
        </div>

        {/* Body */}
        <div style={S.body} className="helper-scroll">
          <p style={S.sectionTitle}>Questions fréquentes</p>

          {FAQ.map((item, i) => (
            <div
              key={i}
              className="faq-item"
              style={S.faqItem}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            >
              <p style={S.faqQ}>{item.q}</p>
              {expandedFaq === i && <p style={S.faqA}>{item.a}</p>}
            </div>
          ))}

          {/* Rejouer le guide */}
          <button
            className="replay-btn"
            style={S.replayBtn}
            onClick={handleReplay}
          >
            ▶ Revoir le guide de démarrage
          </button>
        </div>
      </div>

      {/* Bouton flottant */}
      <button
        className="float-btn"
        style={S.btn(open)}
        onClick={() => setOpen((o) => !o)}
        title="Aide"
      >
        {open ? "✕" : "⚽"}
      </button>
    </>
  );
}
