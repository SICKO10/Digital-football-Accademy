import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useColors } from "../lib/theme";
import { IconGift, IconCheck, IconCopy } from './icones'
import { styleCarte, styleChamp, styleBoutonPrincipal, CLASSE_BOUTON } from "../lib/identite";
import { styleMontant } from "../lib/identiteFinance";
import { police, forme } from "../tokens";

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
    <div style={{ ...styleCarte(colors), padding: "20px 20px 20px 23px", boxShadow: `inset ${forme.lisere} 0 0 ${accentColor}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
        <span style={{ display: "flex", color: colors.text.primary, marginTop: "2px" }}><IconGift size={26} /></span>
        <div>
          <h3 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: "22px", letterSpacing: "0.02em", textTransform: "uppercase", color: colors.text.primary, margin: "0 0 6px" }}>Parraine et gagne</h3>
          <p style={{ color: colors.text.secondary, fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
            3 parrainages = <strong style={{ color: colors.text.primary }}>1 an offert</strong> ·{" "}
            6 = <strong style={{ color: colors.text.primary }}>2 ans offerts</strong> ·{" "}
            9 = <strong style={{ color: colors.text.primary }}>3 ans + 2 vidéos d'analyse</strong>
          </p>
          <p style={{ color: colors.text.secondary, fontSize: "13px", margin: "4px 0 0" }}>Seuls les abonnements annuels comptent.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{
          ...styleChamp(colors), flex: 1, minWidth: 0, width: "auto", display: "flex", alignItems: "center",
          color: colors.text.secondary, fontSize: "13px", fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {lien}
        </div>
        <button type="button" onClick={copier} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      {count !== null && (
        <p style={{ margin: "12px 0 0", fontSize: "14px", color: colors.text.primary, fontWeight: 600 }}>
          <span style={styleMontant(colors, 18)}>{count}/9</span> filleuls annuels{palier > 0 ? ` · Palier ${palier} atteint` : ""}
        </p>
      )}
    </div>
  );
}
