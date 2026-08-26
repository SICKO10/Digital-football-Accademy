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
    <div style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: "14px", padding: "18px 20px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: colors.text.primary }}>Parraine et gagne</p>
      <p style={{ margin: "0 0 12px", fontSize: "12px", color: colors.text.secondary, lineHeight: 1.5 }}>
        3 parrainages annuels = 1 an offert · 6 = 2 ans offerts · 9 = 3 ans offerts + 2 vidéos d'analyse.
        Seuls les abonnements <strong style={{ color: colors.text.primary }}>annuels</strong> comptent.
      </p>
      <div style={{ display: "flex", gap: "8px", marginBottom: count !== null ? "10px" : 0 }}>
        <input
          readOnly
          value={lien}
          onFocus={(e) => e.target.select()}
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "8px", padding: "9px 10px", color: colors.text.primary, fontSize: "12px", fontFamily: "monospace" }}
        />
        <button
          onClick={copier}
          style={{ flexShrink: 0, background: accentColor, border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, padding: "0 14px", cursor: "pointer" }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      {count !== null && (
        <p style={{ margin: 0, fontSize: "12px", color: accentColor, fontWeight: 600 }}>
          {count}/9 filleuls annuels{palier > 0 ? ` · Palier ${palier} atteint` : ""}
        </p>
      )}
    </div>
  );
}
