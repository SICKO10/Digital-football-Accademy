import { useState, useEffect } from "react";

// ─── ÉTAPES DU GUIDE ────────────────────────────────────────────────────────
// Étapes par défaut (dashboard joueur) — passe une prop `steps` personnalisée
// pour réutiliser ce composant sur un autre dashboard (éducateur, club...).
const DEFAULT_STEPS = [
  {
    id: 1,
    title: "Bienvenue sur Digital Football ! ⚽",
    message:
      "Je suis Cedinho, ton guide personnel. Je vais te montrer comment tirer le meilleur de la plateforme en moins de 2 minutes.",
    targetId: null, // Pas de highlight, c'est le modal d'accueil
    position: "center",
  },
  {
    id: 2,
    title: "Uploade ta vidéo",
    message:
      "C'est ici que tout commence. Envoie ta vidéo de match ou d'entraînement, notre équipe l'analyse pour toi.",
    targetId: "upload-section",
    position: "bottom",
  },
  {
    id: 3,
    title: "Mon Équipe",
    message:
      "Rejoins l'équipe de ton éducateur avec le code qu'il t'a donné : tu accèdes à tes stats de présence et à tes coéquipiers.",
    targetId: "equipe-section",
    position: "bottom",
  },
  {
    id: 4,
    title: "Préparation physique",
    message:
      "Des programmes d'entraînement physique adaptés à ton poste, à faire à ton rythme.",
    targetId: "prep-physique-section",
    position: "bottom",
  },
  {
    id: 5,
    title: "Tes analyses vidéo",
    message:
      "Retrouve ici tes analyses dès qu'elles sont prêtes — tu reçois une notification et un email. Écoute, applique, progresse.",
    targetId: "analyses-section",
    position: "bottom",
  },
  {
    id: 6,
    title: "Coach analyseur",
    message:
      "Discute directement avec un coach pro pour des conseils personnalisés sur ton jeu.",
    targetId: "coach-section",
    position: "bottom",
  },
  {
    id: 7,
    title: "Ton profil joueur",
    message:
      "Ton profil est visible par les recruteurs (abonnement Pro). Remplis-le bien — c'est ta vitrine !",
    targetId: "profile-section",
    position: "bottom",
  },
  {
    id: 8,
    title: "Carte FIFA",
    message:
      "Génère ta propre carte de joueur façon FIFA à partir de tes stats, et partage-la sur les réseaux.",
    targetId: "carte-section",
    position: "bottom",
  },
  {
    id: 9,
    title: "Certification",
    message:
      "Envoie tes feuilles de match pour faire certifier ton niveau réel par notre équipe — ça renforce la crédibilité de ton profil.",
    targetId: "certif-section",
    position: "bottom",
  },
  {
    id: 10,
    title: "Explorer",
    message:
      "Découvre les clubs et recruteurs présents sur la plateforme.",
    targetId: "clubs-section",
    position: "bottom",
  },
  {
    id: 11,
    title: "Messages",
    message:
      "Échange directement avec les recruteurs qui s'intéressent à ton profil.",
    targetId: "messages-section",
    position: "bottom",
  },
  {
    id: 12,
    title: "C'est parti ! 🚀",
    message:
      "Tu es prêt. Si tu as une question, clique sur le ballon en bas à droite — je suis toujours là.",
    targetId: null,
    position: "center",
  },
];

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "420px",
    width: "90%",
    position: "relative",
    boxShadow: "0 0 40px rgba(74,222,128,0.15)",
    animation: "slideUp 0.3s ease",
  },
  avatarWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  avatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4ade80, #22c55e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    boxShadow: "0 0 20px rgba(74,222,128,0.4)",
    animation: "pulse 2s infinite",
  },
  title: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "12px",
  },
  message: {
    color: "#a1a1aa",
    fontSize: "15px",
    lineHeight: "1.6",
    textAlign: "center",
    marginBottom: "28px",
  },
  progressBar: {
    display: "flex",
    gap: "6px",
    justifyContent: "center",
    marginBottom: "24px",
  },
  dot: (active, passed) => ({
    width: active ? "24px" : "8px",
    height: "8px",
    borderRadius: "4px",
    background: active ? "#4ade80" : passed ? "#166534" : "#2a2a2a",
    transition: "all 0.3s ease",
  }),
  btnRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  btnSkip: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    color: "#71717a",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  btnNext: {
    background: "#4ade80",
    border: "none",
    color: "#0a0a0a",
    padding: "10px 28px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    transition: "all 0.2s",
  },
  // Tooltip pour les étapes avec highlight
  tooltip: {
    position: "fixed",
    background: "#141414",
    border: "1px solid #4ade80",
    borderRadius: "12px",
    padding: "20px",
    maxWidth: "300px",
    zIndex: 1001,
    boxShadow: "0 0 30px rgba(74,222,128,0.2)",
    animation: "slideUp 0.2s ease",
  },
  tooltipTitle: {
    color: "#4ade80",
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  tooltipMessage: {
    color: "#d4d4d8",
    fontSize: "13px",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  // Anneau lumineux pulsant autour de l'élément ciblé — purement visuel
  // (pointerEvents: none), le clic passe à travers jusqu'à l'élément réel.
  ring: (color) => ({
    position: "fixed",
    borderRadius: "10px",
    border: `3px solid ${color}`,
    zIndex: 1000,
    transition: "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
    pointerEvents: "none",
    "--onb-ring-color": color,
    animation: "onbSpotlightPulse 1.6s ease-in-out infinite",
  }),
  // Bandes sombres qui masquent tout SAUF le rectangle ciblé — contrairement à
  // un simple overlay plein écran, elles ne recouvrent pas l'élément ciblé, qui
  // reste donc visible sans voile et cliquable normalement.
  mask: {
    position: "fixed",
    background: "rgba(0,0,0,0.75)",
    zIndex: 999,
    cursor: "pointer",
  },
};

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function OnboardingGuide({ userId, steps = DEFAULT_STEPS }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  // Vérifie si l'utilisateur a déjà vu l'onboarding
  useEffect(() => {
    const key = userId ? `onboarding_done_${userId}` : "onboarding_done";
    const done = localStorage.getItem(key);
    if (!done) {
      // Petit délai pour laisser le dashboard se rendre
      setTimeout(() => setVisible(true), 800);
    }
  }, [userId]);

  // Calcule la position du highlight à chaque changement d'étape. Une étape
  // peut cibler un seul élément (targetId) ou plusieurs à la fois (targetIds,
  // ex : l'onglet du menu + la zone de contenu correspondante) — dans ce cas
  // on illumine le rectangle englobant tous les éléments trouvés.
  useEffect(() => {
    const currentStep = steps[step];
    const ids = currentStep?.targetIds || (currentStep?.targetId ? [currentStep.targetId] : []);
    if (ids.length === 0) {
      Promise.resolve().then(() => setHighlightRect(null));
      return;
    }
    const rects = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect());
    if (rects.length === 0) {
      Promise.resolve().then(() => setHighlightRect(null));
      return;
    }
    const top = Math.min(...rects.map((r) => r.top));
    const left = Math.min(...rects.map((r) => r.left));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const right = Math.max(...rects.map((r) => r.right));
    Promise.resolve().then(() => {
      setHighlightRect({
        top: top - 6,
        left: left - 6,
        width: (right - left) + 12,
        height: (bottom - top) + 12,
      });
      // Positionne le tooltip en dessous de la zone illuminée
      setTooltipPos({
        top: bottom + 16,
        left: Math.max(12, left),
      });
    });
    // Scroll vers le premier élément ciblé
    const firstEl = document.getElementById(ids[0]);
    if (firstEl) firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step, steps]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    const key = userId ? `onboarding_done_${userId}` : "onboarding_done";
    localStorage.setItem(key, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const currentStep = steps[step];
  const isCenter = !currentStep.targetId && !currentStep.targetIds;
  const ringColor = currentStep.ringColor || "#4ade80";

  const navButtons = (
    <div style={styles.btnRow}>
      <button className="onb-btn-skip" style={styles.btnSkip} onClick={handleClose}>
        Passer
      </button>
      <button className="onb-btn-next" style={styles.btnNext} onClick={handleNext}>
        {step === steps.length - 1 ? "Commencer !" : "Suivant →"}
      </button>
    </div>
  );

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.4); }
          50%       { box-shadow: 0 0 35px rgba(74,222,128,0.7); }
        }
        @keyframes onbSpotlightPulse {
          0%, 100% { box-shadow: 0 0 0 4px var(--onb-ring-color), 0 0 16px 2px var(--onb-ring-color); }
          50%       { box-shadow: 0 0 0 9px var(--onb-ring-color), 0 0 28px 8px var(--onb-ring-color); }
        }
        .onb-btn-skip:hover { border-color: #4ade80 !important; color: #4ade80 !important; }
        .onb-btn-next:hover  { background: #22c55e !important; transform: scale(1.02); }
      `}</style>

      {isCenter ? (
        /* ── Modal centré (étapes sans target) ── */
        <div style={styles.overlay} onClick={handleClose}>
          <div style={styles.card} onClick={(e) => e.stopPropagation()}>
            <div style={styles.avatarWrapper}>
              <div style={styles.avatar}>⚽</div>
            </div>

            <h2 style={styles.title}>{currentStep.title}</h2>
            <p style={styles.message}>{currentStep.message}</p>

            {/* Barre de progression */}
            <div style={styles.progressBar}>
              {steps.map((s, i) => (
                <div key={s.id} style={styles.dot(i === step, i < step)} />
              ))}
            </div>

            <div style={styles.btnRow}>
              {step === 0 ? (
                <button className="onb-btn-skip" style={styles.btnSkip} onClick={handleClose}>
                  Passer
                </button>
              ) : null}
              <button className="onb-btn-next" style={styles.btnNext} onClick={handleNext}>
                {step === steps.length - 1 ? "Commencer !" : "Suivant →"}
              </button>
            </div>
          </div>
        </div>
      ) : highlightRect ? (
        /* ── Spotlight : 4 bandes sombres autour de la cible, celle-ci reste
           visible et cliquable puisqu'aucune bande ne la recouvre ── */
        <>
          <div
            style={{ ...styles.mask, top: 0, left: 0, right: 0, height: Math.max(highlightRect.top, 0) }}
            onClick={handleClose}
          />
          <div
            style={{ ...styles.mask, top: highlightRect.top + highlightRect.height, left: 0, right: 0, bottom: 0 }}
            onClick={handleClose}
          />
          <div
            style={{ ...styles.mask, top: highlightRect.top, left: 0, width: Math.max(highlightRect.left, 0), height: highlightRect.height }}
            onClick={handleClose}
          />
          <div
            style={{ ...styles.mask, top: highlightRect.top, left: highlightRect.left + highlightRect.width, right: 0, height: highlightRect.height }}
            onClick={handleClose}
          />
          <div style={{ ...styles.ring(ringColor), ...highlightRect }} />

          <div
            style={{ ...styles.tooltip, top: tooltipPos.top, left: tooltipPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={styles.tooltipTitle}>
              Étape {step}/{steps.length - 1} — {currentStep.title}
            </p>
            <p style={styles.tooltipMessage}>{currentStep.message}</p>
            <div style={styles.progressBar}>
              {steps.map((s, i) => (
                <div key={s.id} style={styles.dot(i === step, i < step)} />
              ))}
            </div>
            {navButtons}
          </div>
        </>
      ) : (
        /* ── Cible introuvable (ex : onglet non visible pour ce rôle) —
           on retombe sur un simple overlay pour que le guide reste utilisable ── */
        <div style={styles.overlay} onClick={handleClose}>
          <div
            style={{ ...styles.tooltip, position: "relative", top: 0, left: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={styles.tooltipTitle}>
              Étape {step}/{steps.length - 1} — {currentStep.title}
            </p>
            <p style={styles.tooltipMessage}>{currentStep.message}</p>
            <div style={styles.progressBar}>
              {steps.map((s, i) => (
                <div key={s.id} style={styles.dot(i === step, i < step)} />
              ))}
            </div>
            {navButtons}
          </div>
        </div>
      )}
    </>
  );
}
