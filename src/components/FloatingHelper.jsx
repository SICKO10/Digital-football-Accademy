import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { useColors } from "../lib/theme";

// ─── FAQ RAPIDE ──────────────────────────────────────────────────────────────
// FAQ par défaut (dashboard joueur) — passe une prop `faq` personnalisée pour
// réutiliser ce composant sur un autre dashboard (éducateur, club...).
const DEFAULT_FAQ = [
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
// Couleurs paramétrées par accentColor (défaut vert) via des fonctions plutôt que
// des valeurs figées — même approche que l'accentColor d'OnboardingGuide.jsx.
// Les neutres (fonds/bordures/texte) sont paramétrés par `colors` (useColors())
// pour suivre le thème clair/sombre de chaque dashboard hôte — buildS() est
// appelé une fois par rendu dans le composant plutôt qu'un objet figé au
// niveau module, puisque colors change selon le thème actif.
const buildS = (colors) => ({
  btn: (open, color) => ({
    position: "fixed",
    bottom: "28px",
    right: "28px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: open ? color : `linear-gradient(135deg, ${color}, ${color}cc)`,
    border: "none",
    cursor: "pointer",
    fontSize: "24px",
    boxShadow: `0 4px 20px ${color}66`,
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
    background: colors.background.raised,
    border: `1px solid ${colors.border.default}`,
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
  header: (color) => ({
    background: `linear-gradient(135deg, ${color}, ${color}99)`,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  }),
  headerAvatar: (color) => ({
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  }),
  // Texte fixe (pas colors.text.primary) : posé sur le dégradé accentColor du
  // header, pas sur une surface neutre — reste blanc quel que soit le thème.
  headerText: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
  },
  headerSub: (color) => ({
    color,
    fontSize: "12px",
    marginTop: "2px",
  }),
  body: {
    padding: "16px",
    maxHeight: "360px",
    overflowY: "auto",
  },
  sectionTitle: {
    color: colors.text.faint,
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },
  faqItem: {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  faqQ: {
    color: colors.text.primary,
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "0",
  },
  faqA: {
    color: colors.text.secondary,
    fontSize: "12px",
    lineHeight: "1.5",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: `1px solid ${colors.border.default}`,
  },
  replayBtn: (color) => ({
    display: "block",
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    background: "transparent",
    border: `1px solid ${color}`,
    borderRadius: "8px",
    color,
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  tabs: {
    display: "flex",
    gap: "6px",
    padding: "12px 16px 0",
  },
  tabBtn: (active, color) => ({
    flex: 1,
    padding: "8px",
    background: active ? `${color}1a` : "transparent",
    border: `1px solid ${active ? color : colors.border.default}`,
    borderRadius: "8px",
    color: active ? color : colors.text.secondary,
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "8px",
    padding: "9px 10px",
    color: colors.text.primary,
    fontSize: "13px",
    marginBottom: "8px",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "8px",
    padding: "9px 10px",
    color: colors.text.primary,
    fontSize: "13px",
    marginBottom: "8px",
    fontFamily: "inherit",
    resize: "vertical",
  },
  // color fixe (pas colors.text.primary) : texte posé directement sur le bouton
  // accentColor, reste sombre quel que soit le thème pour garder le contraste.
  sendBtn: (color) => ({
    display: "block",
    width: "100%",
    padding: "10px",
    background: color,
    border: "none",
    borderRadius: "8px",
    color: "#0a0a0a",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "opacity 0.2s",
  }),
  ticketCard: (clickable) => ({
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "8px",
    cursor: clickable ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }),
  ticketMsg: {
    color: colors.text.secondary,
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "6px 0 0",
  },
  statutBadge: (statut, color) => ({
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "20px",
    whiteSpace: "nowrap",
    color: statut === "resolu" ? "#4ade80" : color,
    background: statut === "resolu" ? "#4ade8015" : `${color}15`,
    border: `1px solid ${statut === "resolu" ? "#4ade8040" : color + "40"}`,
  }),
  unreadDot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  threadHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: colors.text.secondary,
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 4px",
  },
  threadMsgs: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "220px",
    overflowY: "auto",
    marginBottom: "10px",
  },
  // color "mine" fixe (pas colors.text.primary) : texte posé sur la bulle
  // accentColor, reste sombre quel que soit le thème.
  bubble: (mine, color) => ({
    alignSelf: mine ? "flex-end" : "flex-start",
    maxWidth: "80%",
    background: mine ? color : colors.background.surface,
    color: mine ? "#0a0a0a" : colors.text.primary,
    borderRadius: "10px",
    padding: "7px 10px",
    fontSize: "12px",
    lineHeight: 1.5,
    wordBreak: "break-word",
  }),
  threadInputRow: {
    display: "flex",
    gap: "6px",
  },
  threadInput: {
    flex: 1,
    boxSizing: "border-box",
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: "8px",
    padding: "8px 10px",
    color: colors.text.primary,
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "none",
  },
  threadSendBtn: (color) => ({
    background: color,
    border: "none",
    borderRadius: "8px",
    color: "#0a0a0a",
    fontSize: "12px",
    fontWeight: "700",
    padding: "0 12px",
    cursor: "pointer",
  }),
});

// ─── COMPOSANT ───────────────────────────────────────────────────────────────
// accentColor : couleur du dashboard hôte, passée explicitement par chaque
// Dashboard*.jsx (Éducateur #60a5fa, Recruteur #f97316, Joueur/Club #4ade80) —
// même logique que la prop accentColor d'OnboardingGuide.jsx.
// estAccueil : chaque Dashboard*.jsx le calcule à partir de son propre onglet
// actif (ex: activeTab === 'accueil'). Sur mobile/tablette, le bouton flottant
// est masqué en dehors de l'accueil — il chevauche trop souvent le contenu
// (ex: le panel joueurs du Tacticboard) sur les écrans étroits.
export default function FloatingHelper({ userId, onReplayOnboarding, faq = DEFAULT_FAQ, accentColor = "#4ade80", estAccueil = true, masque = false }) {
  const colors = useColors();
  const S = buildS(colors);
  const [mobileOuTablette, setMobileOuTablette] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setMobileOuTablette(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [view, setView] = useState("faq"); // 'faq' | 'support'

  // Support : tickets de l'utilisateur courant uniquement (RLS ne renvoie de
  // toute façon que ses propres lignes, cf. supabase_support_tickets.sql).
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [newSujet, setNewSujet] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fil de conversation d'un ticket ouvert (support_messages, cf.
  // supabase_support_messages.sql) — null = on est sur la liste, pas dans un fil.
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadDraft, setThreadDraft] = useState("");
  const [sendingThreadMsg, setSendingThreadMsg] = useState(false);
  const threadScrollRef = useRef(null);

  const handleReplay = () => {
    // Supprime le flag onboarding pour relancer le guide
    const key = userId ? `onboarding_done_${userId}` : "onboarding_done";
    localStorage.removeItem(key);
    setOpen(false);
    if (onReplayOnboarding) onReplayOnboarding();
  };

  const chargerTickets = async () => {
    if (!userId) return;
    setLoadingTickets(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoadingTickets(false);
  };

  const ouvrirSupport = () => {
    setView("support");
    chargerTickets();
  };

  const envoyerTicket = async () => {
    if (!userId || !newSujet.trim() || !newMessage.trim()) return;
    setSending(true);
    const sujet = newSujet.trim();
    const message = newMessage.trim();
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, sujet, message, dernier_message_at: new Date().toISOString() })
      .select()
      .single();
    if (!error && data) {
      await supabase.from("support_messages").insert({ ticket_id: data.id, sender_id: userId, contenu: message, is_coach: false });
    }
    setSending(false);
    if (error) {
      alert("Erreur lors de l'envoi : " + error.message);
      return;
    }
    setNewSujet("");
    setNewMessage("");
    await chargerTickets();
  };

  const chargerFilMessages = async (ticketId) => {
    const { data, error } = await supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    if (error) { console.error("Erreur chargement fil support :", error); return; }
    setThreadMessages(data || []);
  };

  const ouvrirFil = async (ticket) => {
    setSelectedTicket(ticket);
    await chargerFilMessages(ticket.id);
    supabase.from("support_tickets").update({ lu_par_user_at: new Date().toISOString() }).eq("id", ticket.id).then(() => {});
  };

  useEffect(() => {
    if (!selectedTicket || !open) return;
    const id = setInterval(() => chargerFilMessages(selectedTicket.id), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id, open]);

  useEffect(() => {
    threadScrollRef.current?.scrollTo({ top: threadScrollRef.current.scrollHeight });
  }, [threadMessages]);

  const envoyerMessageFil = async () => {
    const contenu = threadDraft.trim();
    if (!contenu || !selectedTicket || !userId) return;
    setSendingThreadMsg(true);
    const maintenant = new Date().toISOString();
    const { error } = await supabase.from("support_messages").insert({ ticket_id: selectedTicket.id, sender_id: userId, contenu, is_coach: false });
    if (!error) {
      await supabase.from("support_tickets").update({ dernier_message_at: maintenant, lu_par_user_at: maintenant }).eq("id", selectedTicket.id);
      setThreadDraft("");
      await chargerFilMessages(selectedTicket.id);
      await chargerTickets();
    } else {
      alert("Erreur : " + error.message);
    }
    setSendingThreadMsg(false);
  };

  if (mobileOuTablette && !estAccueil) return null;
  // masque : un formulaire hôte (ex: Événements & Projets) a son propre
  // bouton "Enregistrer" en bas de page — le ballon (fixed, zIndex 900)
  // le recouvre sinon dès qu'on scrolle jusqu'à ce bouton.
  if (masque) return null;

  return (
    <>
      <style>{`
        .faq-item:hover { border-color: ${accentColor} !important; }
        .replay-btn:hover { background: ${accentColor}1a !important; }
        .float-btn:hover { transform: scale(1.1); }
        .helper-scroll::-webkit-scrollbar { width: 4px; }
        .helper-scroll::-webkit-scrollbar-track { background: ${colors.background.surface}; }
        .helper-scroll::-webkit-scrollbar-thumb { background: ${colors.border.default}; border-radius: 2px; }
      `}</style>

      {/* Panneau d'aide */}
      <div style={S.panel(open)}>
        {/* Header */}
        <div style={S.header(accentColor)}>
          <div style={S.headerAvatar(accentColor)}>⚽</div>
          <div>
            <div style={S.headerText}>Cedinho — Ton guide</div>
            <div style={S.headerSub(accentColor)}>Comment puis-je t'aider ?</div>
          </div>
        </div>

        {/* Onglets FAQ / Support */}
        <div style={S.tabs}>
          <button style={S.tabBtn(view === "faq", accentColor)} onClick={() => setView("faq")}>
            ❓ FAQ
          </button>
          <button style={S.tabBtn(view === "support", accentColor)} onClick={ouvrirSupport}>
            💬 Support
          </button>
        </div>

        {/* Body */}
        <div style={S.body} className="helper-scroll">
          {view === "faq" ? (
            <>
              <p style={S.sectionTitle}>Questions fréquentes</p>

              {faq.map((item, i) => (
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
                style={S.replayBtn(accentColor)}
                onClick={handleReplay}
              >
                ▶ Revoir le guide de démarrage
              </button>
            </>
          ) : selectedTicket ? (
            <>
              <div style={S.threadHeader}>
                <button style={S.backBtn} onClick={() => setSelectedTicket(null)}>←</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...S.faqQ, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedTicket.sujet}</p>
                </div>
                <span style={S.statutBadge(selectedTicket.statut, accentColor)}>
                  {selectedTicket.statut === "resolu" ? "✓ Résolu" : "⏳ Ouvert"}
                </span>
              </div>

              <div style={S.threadMsgs} ref={threadScrollRef}>
                {threadMessages.length === 0 ? (
                  <p style={S.ticketMsg}>Aucun message</p>
                ) : threadMessages.map((m) => (
                  <div key={m.id} style={S.bubble(!m.is_coach, accentColor)}>
                    {m.contenu}
                  </div>
                ))}
              </div>

              <div style={S.threadInputRow}>
                <textarea
                  style={S.threadInput}
                  rows={1}
                  placeholder="Écrire un message..."
                  value={threadDraft}
                  onChange={(e) => setThreadDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerMessageFil(); } }}
                />
                <button
                  style={{ ...S.threadSendBtn(accentColor), opacity: sendingThreadMsg || !threadDraft.trim() ? 0.5 : 1 }}
                  onClick={envoyerMessageFil}
                  disabled={sendingThreadMsg || !threadDraft.trim()}
                >
                  ➤
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={S.sectionTitle}>Contacter le support</p>
              <input
                style={S.input}
                placeholder="Sujet"
                value={newSujet}
                onChange={(e) => setNewSujet(e.target.value)}
              />
              <textarea
                style={S.textarea}
                placeholder="Décris ta demande..."
                rows={3}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button
                style={{ ...S.sendBtn(accentColor), opacity: sending || !newSujet.trim() || !newMessage.trim() ? 0.5 : 1 }}
                onClick={envoyerTicket}
                disabled={sending || !newSujet.trim() || !newMessage.trim()}
              >
                {sending ? "Envoi..." : "✉️ Envoyer"}
              </button>

              {loadingTickets ? (
                <p style={{ ...S.ticketMsg, marginTop: 14 }}>Chargement...</p>
              ) : tickets.length > 0 && (
                <>
                  <p style={{ ...S.sectionTitle, marginTop: 16 }}>Mes demandes</p>
                  {tickets.map((t) => {
                    const nonLu = t.dernier_message_at && (!t.lu_par_user_at || new Date(t.dernier_message_at) > new Date(t.lu_par_user_at));
                    return (
                      <div key={t.id} style={S.ticketCard(true)} onClick={() => ouvrirFil(t)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <p style={{ ...S.faqQ, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sujet}</p>
                            <span style={S.statutBadge(t.statut, accentColor)}>
                              {t.statut === "resolu" ? "✓ Résolu" : "⏳ Ouvert"}
                            </span>
                          </div>
                        </div>
                        {nonLu && <span style={S.unreadDot(accentColor)} />}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bouton flottant */}
      <button
        className="float-btn"
        style={S.btn(open, accentColor)}
        onClick={() => setOpen((o) => !o)}
        title="Aide"
      >
        {open ? "✕" : "⚽"}
      </button>
    </>
  );
}
