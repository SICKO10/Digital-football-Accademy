import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useColors } from "../lib/theme";

// ─── COMPOSANT ───────────────────────────────────────────────────────────────
// Bloc "Parraine et gagne" — même convention que FloatingHelper.jsx (props
// userId/accentColor, styles inline, pas de dépendance au système de tokens
// du dashboard hôte) pour rester trivialement réutilisable partout.
// Règles : seuls les parrainages d'abonnement ANNUEL comptent — 3 = 1 an
// offert, 6 = 2 ans offerts, 9 = 3 ans offerts + 2 vidéos d'analyse. Le
// comptage passe par le RPC count_filleuls_annuels (cf. supabase_parrainage.sql),
// qui ne renvoie jamais que les filleuls de l'utilisateur courant.
export default function ParrainageWidget({ userId, accentColor = "#4ade80" }) {
  const colors = useColors();
  const [count, setCount] = useState(null);
  const [copied, setCopied] = useState(false);

  const lien = userId ? `${window.location.origin}/register?ref=${userId}` : "";

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("count_filleuls_annuels", { p_parrain_id: userId }).then(({ data, error }) => {
      if (error) { console.error("Erreur comptage filleuls :", error); return; }
      setCount(data ?? 0);
    });
  }, [userId]);

  const copier = async () => {
    if (!lien) return;
    await navigator.clipboard.writeText(lien);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const palier = count >= 9 ? 3 : count >= 6 ? 2 : count >= 3 ? 1 : 0;

  return (
    <div style={{ background: `linear-gradient(135deg, ${accentColor}12 0%, ${colors.background.surface} 100%)`, border: `1px solid ${accentColor}25`, borderRadius: "16px", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
        <span style={{ fontSize: "32px" }}>🎁</span>
        <div>
          <h3 style={{ color: accentColor, fontWeight: 800, fontSize: "17px", margin: "0 0 6px" }}>Parraine et gagne</h3>
          <p style={{ color: colors.text.faint, fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
            3 parrainages = <strong style={{ color: colors.text.primary }}>1 an offert</strong> ·{" "}
            6 = <strong style={{ color: colors.text.primary }}>2 ans offerts</strong> ·{" "}
            9 = <strong style={{ color: colors.text.primary }}>3 ans + 2 vidéos d'analyse</strong>
          </p>
          <p style={{ color: colors.text.disabled, fontSize: "12px", marginTop: "4px" }}>Seuls les abonnements annuels comptent.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{
          flex: 1, minWidth: 0, boxSizing: "border-box", padding: "11px 14px",
          background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: "10px",
          color: colors.text.faint, fontSize: "12px", fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {lien}
        </div>
        <button
          onClick={copier}
          style={{ flexShrink: 0, padding: "11px 18px", borderRadius: "10px", border: "none", background: accentColor, color: "#0a0a0a", fontWeight: 700, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {copied ? "✓ Copié" : "📋 Copier"}
        </button>
      </div>

      {count !== null && (
        <p style={{ margin: "12px 0 0", fontSize: "12px", color: accentColor, fontWeight: 600 }}>
          {count}/9 filleuls annuels{palier > 0 ? ` · Palier ${palier} atteint` : ""}
        </p>
      )}
    </div>
  );
}
