import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useLocation } from "react-router-dom";

const POSTES = ["Tous", "Attaquant", "Milieu", "Défenseur", "Gardien"];
const CATEGORIES = ["Toutes", "U14", "U15", "U16", "U17", "U18", "U19", "U20", "Senior"];
const PIEDS = ["Tous", "Droit", "Gauche", "Les deux"];
const REGIONS = ["Toutes", "Île-de-France", "Auvergne-Rhône-Alpes", "Occitanie", "Provence-Alpes-Côte d'Azur", "Nouvelle-Aquitaine", "Hauts-de-France", "Grand Est", "Bretagne", "Normandie", "Pays de la Loire", "Bourgogne-Franche-Comté", "Centre-Val de Loire", "Corse", "Martinique", "Guadeloupe", "La Réunion"];

export default function DashboardClub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [recruteur, setRecruteur] = useState(null);
  const [recruteurId, setRecruteurId] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("joueurs");
  const [selectedJoueur, setSelectedJoueur] = useState(null);
  const [favoris, setFavoris] = useState([]); // [{id, user_id, joueur_id, dossier}]
  const [dossierActif, setDossierActif] = useState("Tous");
  const [nouveauDossier, setNouveauDossier] = useState("");
  const [assignDossierJoueur, setAssignDossierJoueur] = useState(null);

  // Messagerie
  const [messageModal, setMessageModal] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [convActive, setConvActive] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [coaches, setCoaches] = useState([]);

  // Filtres
  const [poste, setPoste] = useState("Tous");
  const [categorie, setCategorie] = useState("Toutes");
  const [pied, setPied] = useState("Tous");
  const [region, setRegion] = useState("Toutes");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setRecruteurId(user.id);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || profile.plan !== "recruteur") { navigate("/"); return; }
      setRecruteur(profile);
      const { data: joueursData } = await supabase.from("profiles").select("*").eq("plan", "pro").eq("abonnement_actif", true);
      const { data: coachData } = await supabase.from("profiles").select("*").eq("plan", "coach");
      setJoueurs(joueursData || []);
      setFiltered(joueursData || []);
      setCoaches(coachData || []);
      await chargerConversations(user.id);
      await chargerFavoris(user.id);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Auto-ouvrir la modal de contact si on arrive depuis le Feed
  useEffect(() => {
    if (location.state?.contactJoueur) {
      setMessageModal(location.state.contactJoueur);
      setActiveTab("messages");
    }
  }, [location.state]);

  useEffect(() => {
    let result = [...joueurs];
    if (poste !== "Tous") result = result.filter(j => j.poste === poste);
    if (categorie !== "Toutes") result = result.filter(j => j.categorie === categorie);
    if (pied !== "Tous") result = result.filter(j => j.pied === pied);
    if (region !== "Toutes") result = result.filter(j => j.region === region);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(j => `${j.prenom} ${j.nom}`.toLowerCase().includes(s) || (j.poste && j.poste.toLowerCase().includes(s)));
    }
    setFiltered(result);
  }, [poste, categorie, pied, region, search, joueurs]);

  const chargerFavoris = async (uid) => {
    const { data } = await supabase.from("favoris_recruteur").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setFavoris(data || []);
  };

  const isFavori = (joueurId) => favoris.some(f => f.joueur_id === joueurId);

  const toggleFavori = async (joueurId) => {
    const existing = favoris.find(f => f.joueur_id === joueurId);
    if (existing) {
      await supabase.from("favoris_recruteur").delete().eq("id", existing.id);
      setFavoris(prev => prev.filter(f => f.joueur_id !== joueurId));
    } else {
      const { data } = await supabase.from("favoris_recruteur").insert({ user_id: recruteurId, joueur_id: joueurId, dossier: "Général" }).select().single();
      if (data) setFavoris(prev => [...prev, data]);
    }
  };

  const assignerDossier = async (joueurId, dossier) => {
    const existing = favoris.find(f => f.joueur_id === joueurId);
    if (!existing) return;
    await supabase.from("favoris_recruteur").update({ dossier }).eq("id", existing.id);
    setFavoris(prev => prev.map(f => f.joueur_id === joueurId ? { ...f, dossier } : f));
    setAssignDossierJoueur(null);
  };

  const dossiers = ["Général", ...new Set(favoris.map(f => f.dossier).filter(d => d && d !== "Général"))];

  const chargerConversations = async (uid) => {
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan)")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false });
    if (!data) return;
    const map = {};
    data.forEach(msg => {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id;
      const other = msg.sender_id === uid ? msg.receiver : msg.sender;
      if (!map[otherId]) map[otherId] = { otherId, other, msgs: [], allMsgs: data };
      map[otherId].msgs.push(msg);
    });
    setConversations(Object.values(map));
  };

  const ouvrirConversation = async (conv) => {
    setConvActive(conv);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${recruteurId},receiver_id.eq.${conv.otherId}),and(sender_id.eq.${conv.otherId},receiver_id.eq.${recruteurId})`)
      .order("created_at", { ascending: true });
    setConvMessages(data || []);
  };

  const envoyerMessage = async () => {
    if (!newMessage.trim() || !convActive || !recruteurId) return;
    await supabase.from("messages").insert({
      sender_id: recruteurId,
      receiver_id: convActive.otherId,
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    });
    setNewMessage("");
    await ouvrirConversation(convActive);
    await chargerConversations(recruteurId);
  };

  const toggleFavori = (id) => setFavoris(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  // Envoyer message depuis modal (première prise de contact)
  const handleSendMessage = async () => {
    if (!messageText.trim() || !messageModal || !recruteurId) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: recruteurId,
      receiver_id: messageModal.id,
      content: messageText.trim(),
      created_at: new Date().toISOString()
    });
    setSendingMessage(false);
    if (!error) {
      setMessageSent(true);
      await chargerConversations(recruteurId);
      setTimeout(() => { setMessageModal(null); setMessageText(""); setMessageSent(false); }, 2000);
    }
  };

  // Contacter un coach
  const contacterCoach = async (coach, message) => {
    if (!message.trim() || !recruteurId) return;
    await supabase.from("messages").insert({
      sender_id: recruteurId,
      receiver_id: coach.id,
      content: message.trim(),
      created_at: new Date().toISOString()
    });
    await chargerConversations(recruteurId);
  };

  const posteColor = (p) => {
    const map = { "Attaquant": { bg: "#1a0a00", text: "#f97316" }, "Milieu": { bg: "#001a0a", text: "#4ade80" }, "Défenseur": { bg: "#00061a", text: "#60a5fa" }, "Gardien": { bg: "#1a001a", text: "#a855f7" } };
    return map[p] || { bg: "#1a1a1a", text: "#aaa" };
  };
  const getInitials = (j) => `${(j.prenom || "?")[0]}${(j.nom || "?")[0]}`.toUpperCase();
  const isVeo = (url) => url && url.includes("veo.co");
  const isYoutube = (url) => url && (url.includes("youtube.com") || url.includes("youtu.be"));
  const isCloudinary = (url) => url && url.includes("cloudinary.com");

  const st = {
    page: { background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "Inter, sans-serif" },
    navbar: { background: "#111", borderBottom: "1px solid #222", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" },
    logo: { color: "#4ade80", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "1px" },
    logoutBtn: { background: "transparent", border: "1px solid #333", color: "#aaa", padding: "6px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
    content: { padding: "2rem", maxWidth: "1200px", margin: "0 auto" },
    tabs: { display: "flex", gap: "8px", marginBottom: "2rem", flexWrap: "wrap" },
    tab: (active) => ({ padding: "10px 24px", borderRadius: "8px", border: active ? "none" : "1px solid #333", background: active ? "#4ade80" : "transparent", color: active ? "#000" : "#aaa", fontWeight: active ? 600 : 400, cursor: "pointer", fontSize: "14px" }),
    filterBar: { background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" },
    filterLabel: { fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" },
    select: { background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", padding: "8px 12px", fontSize: "13px" },
    searchInput: { background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", padding: "8px 12px", fontSize: "13px", width: "100%", boxSizing: "border-box" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" },
    card: { background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "1.25rem" },
    avatar: { width: "44px", height: "44px", borderRadius: "50%", background: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: 700, fontSize: "16px" },
    posteBadge: (p) => ({ background: posteColor(p).bg, color: posteColor(p).text, fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: 500 }),
    statsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "12px", borderTop: "1px solid #1e1e1e", paddingTop: "12px" },
    stat: { textAlign: "center" },
    statVal: { fontSize: "18px", fontWeight: 700, color: "#4ade80" },
    statLabel: { fontSize: "10px", color: "#555", textTransform: "uppercase" },
    cardActions: { display: "flex", gap: "8px", marginTop: "12px" },
    btnPrimary: { flex: 1, background: "#4ade80", color: "#000", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
    btnSecondary: { background: "transparent", border: "1px solid #333", color: "#aaa", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "13px" },
    favoriBtnActive: { background: "transparent", border: "1px solid #4ade80", color: "#4ade80", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "13px" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
    modal: { background: "#111", border: "1px solid #333", borderRadius: "16px", padding: "2rem", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto" },
    sectionTitle: { fontSize: "11px", color: "#4ade80", textTransform: "uppercase", letterSpacing: "1px", margin: "1.5rem 0 0.75rem" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" },
    statBox: { background: "#1a1a1a", borderRadius: "8px", padding: "12px", textAlign: "center" },
    statBoxVal: { fontSize: "22px", fontWeight: 700, color: "#4ade80" },
    statBoxLabel: { fontSize: "11px", color: "#555", marginTop: "2px" },
    textarea: { width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", padding: "12px", fontSize: "14px", resize: "vertical", minHeight: "120px", boxSizing: "border-box", marginTop: "8px", fontFamily: "inherit" },
    emptyState: { textAlign: "center", padding: "4rem 2rem", color: "#444" },
    videoBox: { background: "#1a1a1a", borderRadius: "8px", padding: "1rem", marginTop: "8px" },
    msgBubble: (mine) => ({ maxWidth: "70%", padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "#4ade80" : "#1a1a1a", color: mine ? "#000" : "#fff", fontSize: "14px", alignSelf: mine ? "flex-end" : "flex-start", marginBottom: "8px" }),
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (loading) return <div style={{ ...st.page, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#4ade80" }}>Chargement...</div></div>;

  // ── Profil joueur ──────────────────────────────────────────────────────────
  if (selectedJoueur) {
    const j = selectedJoueur;
    const videoUrl = j.clip_url || null;
    return (
      <div style={st.page}>
        <nav style={st.navbar}>
          <span style={st.logo}>⬡ DIGITAL FOOTBALL</span>
          <button style={st.btnSecondary} onClick={() => setSelectedJoueur(null)}>← Retour</button>
        </nav>
        <div style={{ ...st.content, maxWidth: "700px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ ...st.avatar, width: "64px", height: "64px", fontSize: "22px" }}>{getInitials(j)}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{j.prenom} {j.nom}</h1>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {j.poste && <span style={st.posteBadge(j.poste)}>{j.poste}</span>}
                {j.categorie && <span style={{ ...st.posteBadge(""), background: "#1a1a1a", color: "#aaa" }}>{j.categorie}</span>}
                {j.pied && <span style={{ ...st.posteBadge(""), background: "#1a1a1a", color: "#aaa" }}>Pied {j.pied.toLowerCase()}</span>}
                {j.region && <span style={{ ...st.posteBadge(""), background: "#1a1a1a", color: "#aaa" }}>{j.region}</span>}
              </div>
            </div>
          </div>

          <p style={st.sectionTitle}>Statistiques saison</p>
          <div style={st.statsGrid}>
            {[{ label: "Matchs officiels", val: j.matchs_officiel || 0 }, { label: "Matchs amicaux", val: j.matchs_amical || 0 }, { label: "Minutes jouées", val: j.minutes_jouees || 0 }, { label: "Buts total", val: j.buts_total || 0 }, { label: "Passes déc.", val: j.passes_decisives || 0 }, { label: "Clean sheets", val: j.cleansheets || 0 }].map(s => (
              <div key={s.label} style={st.statBox}><div style={st.statBoxVal}>{s.val}</div><div style={st.statBoxLabel}>{s.label}</div></div>
            ))}
          </div>

          <p style={st.sectionTitle}>Détail buts</p>
          <div style={st.statsGrid}>
            {[{ label: "Pied droit", val: j.buts_pied_droit || 0 }, { label: "Pied gauche", val: j.buts_pied_gauche || 0 }, { label: "Tête", val: j.buts_tete || 0 }].map(s => (
              <div key={s.label} style={st.statBox}><div style={st.statBoxVal}>{s.val}</div><div style={st.statBoxLabel}>{s.label}</div></div>
            ))}
          </div>

          {j.niveau_equipe && (
            <>
              <p style={st.sectionTitle}>Club actuel</p>
              <div style={{ background: "#1a1a1a", borderRadius: "8px", padding: "1rem" }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{j.club || "Non renseigné"}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>{j.niveau_equipe}</p>
              </div>
            </>
          )}

          {videoUrl && (
            <>
              <p style={st.sectionTitle}>Vidéo du joueur</p>
              <div style={st.videoBox}>
                {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                  <a href={videoUrl} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#4ade8015", border: "1px solid #4ade8040", color: "#4ade80", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
                    🎬 {isVeo(videoUrl) ? "Ouvrir sur Veo" : "Ouvrir sur YouTube"}
                  </a>
                ) : isCloudinary(videoUrl) ? (
                  <>
                    <video src={videoUrl} controls style={{ width: "100%", borderRadius: "8px", maxHeight: "300px", background: "#000" }} />
                    <a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "8px", color: "#4ade80", fontSize: "12px", textDecoration: "none" }}>
                      🔗 Ouvrir dans un nouvel onglet
                    </a>
                  </>
                ) : (
                  <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: "#4ade80", fontSize: "14px", textDecoration: "none" }}>🎬 Voir la vidéo →</a>
                )}
              </div>
            </>
          )}

          <div style={{ marginTop: "2rem", display: "flex", gap: "12px" }}>
            <button style={st.btnPrimary} onClick={() => setMessageModal(j)}>✉️ Contacter ce joueur</button>
            <button style={isFavori(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>
              {isFavori(j.id) ? "★ Favori" : "☆ Ajouter aux favoris"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard principal ────────────────────────────────────────────────────
  return (
    <div style={st.page}>
      <nav style={st.navbar}>
        <span style={st.logo}>⬡ DIGITAL FOOTBALL</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "13px", color: "#666" }}>{recruteur?.prenom} {recruteur?.nom} — {recruteur?.club || "Recruteur"}</span>
          <button style={st.logoutBtn} onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      <div style={st.content}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem" }}>Espace Recruteur</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Accédez aux profils des joueurs PRO actifs</p>
        </div>

        <div style={st.tabs}>
          {[
            { id: "accueil", label: "🏠 Accueil" },
            { id: "joueurs", label: "🔍 Joueurs" },
            { id: "favoris", label: `★ Favoris (${favoris.length})` },
            { id: "feed", label: "🎬 Vidéos" },
            { id: "messages", label: `✉️ Messages${conversations.length > 0 ? ` (${conversations.length})` : ""}` },
            { id: "coach", label: "🎙️ Coach" },
          ].map(t => (
            <button key={t.id} style={st.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── ACCUEIL ── */}
        {activeTab === "accueil" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "2rem" }}>
              {[
                { label: "Joueurs Pro", val: joueurs.length, sub: "profils actifs" },
                { label: "Favoris", val: favoris.length, sub: "joueurs suivis" },
                { label: "Messages", val: conversations.length, sub: "conversations" },
              ].map(s => (
                <div key={s.label} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "32px", fontWeight: 800, color: "#4ade80", margin: "0 0 4px" }}>{s.val}</p>
                  <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: "12px", color: "#555", margin: "2px 0 0" }}>{s.sub}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button onClick={() => navigate("/jogabonito")}
                style={{ background: "#111", border: "1px solid #f9731640", borderRadius: "12px", padding: "2rem", cursor: "pointer", textAlign: "center", color: "#fff" }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 8px" }}>🎬</p>
                <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>Jogabonito</p>
                <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>Reels courts des joueurs</p>
              </button>
              <button onClick={() => navigate("/feed")}
                style={{ background: "#111", border: "1px solid #4ade8040", borderRadius: "12px", padding: "2rem", cursor: "pointer", textAlign: "center", color: "#fff" }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 8px" }}>📋</p>
                <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>Feed Scout</p>
                <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>Clips + stats des joueurs Pro</p>
              </button>
            </div>
          </div>
        )}

        {/* ── JOUEURS ── */}
        {activeTab === "joueurs" && (
          <>
            <div style={st.filterBar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Recherche</label>
                <input type="text" placeholder="Nom, prénom..." value={search} onChange={e => setSearch(e.target.value)} style={st.searchInput} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Poste</label>
                <select value={poste} onChange={e => setPoste(e.target.value)} style={st.select}>{POSTES.map(p => <option key={p}>{p}</option>)}</select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Catégorie</label>
                <select value={categorie} onChange={e => setCategorie(e.target.value)} style={st.select}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Pied fort</label>
                <select value={pied} onChange={e => setPied(e.target.value)} style={st.select}>{PIEDS.map(p => <option key={p}>{p}</option>)}</select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Région</label>
                <select value={region} onChange={e => setRegion(e.target.value)} style={st.select}>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#666", marginBottom: "1rem" }}>{filtered.length} joueur{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}</p>

            {filtered.length === 0 ? (
              <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>⚽</p><p>Aucun joueur ne correspond à vos filtres.</p></div>
            ) : (
              <div style={st.grid}>
                {filtered.map(j => (
                  <div key={j.id} style={st.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={st.avatar}>{getInitials(j)}</div>
                        <div>
                          <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 2px" }}>{j.prenom} {j.nom}</p>
                          <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{j.categorie || "—"} · {j.region || "—"}</p>
                        </div>
                      </div>
                      {j.poste && <span style={st.posteBadge(j.poste)}>{j.poste}</span>}
                    </div>
                    <div style={st.statsRow}>
                      <div style={st.stat}><div style={st.statVal}>{j.buts_total || 0}</div><div style={st.statLabel}>Buts</div></div>
                      <div style={st.stat}><div style={st.statVal}>{j.passes_decisives || 0}</div><div style={st.statLabel}>Passes déc.</div></div>
                      <div style={st.stat}><div style={st.statVal}>{j.matchs_officiel || 0}</div><div style={st.statLabel}>Matchs</div></div>
                    </div>
                    {j.clip_url && <p style={{ fontSize: "11px", color: "#4ade80", marginTop: "8px", marginBottom: 0 }}>🎬 Vidéo disponible</p>}
                    <div style={st.cardActions}>
                      <button style={st.btnPrimary} onClick={() => setSelectedJoueur(j)}>Voir le profil</button>
                      <button style={isFavori(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>{isFavori(j.id) ? "★" : "☆"}</button>
                      <button style={st.btnSecondary} onClick={() => setMessageModal(j)}>✉️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── FAVORIS ── */}
        {activeTab === "favoris" && (
          <div>
            {/* Créer un dossier */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <input
                value={nouveauDossier}
                onChange={e => setNouveauDossier(e.target.value)}
                placeholder="Nouveau dossier..."
                onKeyDown={e => { if (e.key === "Enter" && nouveauDossier.trim()) { setDossierActif(nouveauDossier.trim()); setNouveauDossier(""); } }}
                style={{ ...st.searchInput, maxWidth: "240px" }}
              />
              <button
                onClick={() => { if (nouveauDossier.trim()) { setDossierActif(nouveauDossier.trim()); setNouveauDossier(""); } }}
                style={{ ...st.btnSecondary, fontSize: "13px", whiteSpace: "nowrap" }}
              >+ Créer</button>
            </div>

            {/* Filtres dossiers */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {["Tous", ...dossiers].map(d => (
                <button key={d} onClick={() => setDossierActif(d)}
                  style={{ padding: "6px 14px", borderRadius: "20px", border: dossierActif === d ? "none" : "1px solid #333", background: dossierActif === d ? "#4ade80" : "transparent", color: dossierActif === d ? "#000" : "#aaa", fontWeight: dossierActif === d ? 600 : 400, cursor: "pointer", fontSize: "13px" }}>
                  {d} {d !== "Tous" ? `(${favoris.filter(f => f.dossier === d).length})` : `(${favoris.length})`}
                </button>
              ))}
            </div>

            {favoris.length === 0 ? (
              <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>☆</p><p>Aucun favori pour l'instant.<br /><span style={{ fontSize: "13px", color: "#444" }}>Cliquez sur ☆ depuis la liste des joueurs.</span></p></div>
            ) : (
              <div style={st.grid}>
                {joueurs.filter(j => isFavori(j.id) && (dossierActif === "Tous" || favoris.find(f => f.joueur_id === j.id)?.dossier === dossierActif)).map(j => {
                  const fav = favoris.find(f => f.joueur_id === j.id);
                  return (
                    <div key={j.id} style={{ ...st.card, border: "1px solid #1a3a1a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <div style={st.avatar}>{getInitials(j)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px" }}>{j.prenom} {j.nom}</p>
                          <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{j.poste}{j.categorie ? ` · ${j.categorie}` : ""}</p>
                        </div>
                        <span style={{ background: "#4ade8020", color: "#4ade80", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>{fav?.dossier || "Général"}</span>
                      </div>

                      {/* Déplacer vers un dossier */}
                      {assignDossierJoueur === j.id ? (
                        <div style={{ marginBottom: "10px" }}>
                          <select onChange={e => { if (e.target.value) assignerDossier(j.id, e.target.value) }} defaultValue=""
                            style={{ ...st.select, width: "100%", marginBottom: "6px" }}>
                            <option value="" disabled>Choisir un dossier...</option>
                            {dossiers.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input placeholder="Nouveau dossier..." style={{ ...st.searchInput, flex: 1, fontSize: "12px" }}
                              onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) assignerDossier(j.id, e.target.value.trim()) }} />
                            <button onClick={() => setAssignDossierJoueur(null)} style={{ ...st.btnSecondary, fontSize: "12px" }}>✕</button>
                          </div>
                        </div>
                      ) : null}

                      <div style={st.cardActions}>
                        <button style={st.btnPrimary} onClick={() => setSelectedJoueur(j)}>Profil</button>
                        <button style={st.btnSecondary} onClick={() => setAssignDossierJoueur(assignDossierJoueur === j.id ? null : j.id)}>📁 Dossier</button>
                        <button style={st.btnSecondary} onClick={() => setMessageModal(j)}>✉️</button>
                        <button style={{ ...st.btnSecondary, color: "#ef4444", borderColor: "#ef444440" }} onClick={() => toggleFavori(j.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FEED ── */}
        {activeTab === "feed" && (
          <div style={{ background: "#111", border: "1px dashed #333", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#555" }}>
            <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>🎬</p>
            <p style={{ fontSize: "1.1rem", color: "#555", margin: "0 0 8px" }}>Feed vidéo joueurs</p>
            <p style={{ fontSize: "13px", color: "#444" }}>Les clips des joueurs PRO apparaîtront ici.</p>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {activeTab === "messages" && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px", minHeight: "500px" }}>
            {/* Sidebar conversations */}
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "1rem", borderBottom: "1px solid #222" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#4ade80", fontSize: "14px" }}>💬 Conversations</p>
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#555", fontSize: "13px" }}>
                  <p>Aucun message.</p>
                  <p style={{ marginTop: "8px" }}>Contactez un joueur depuis son profil.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => ouvrirConversation(conv)}
                    style={{ padding: "12px 1rem", borderBottom: "1px solid #1a1a1a", cursor: "pointer", background: convActive?.otherId === conv.otherId ? "#4ade8010" : "transparent", borderLeft: convActive?.otherId === conv.otherId ? "2px solid #4ade80" : "2px solid transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
                        {(conv.other?.prenom || "?")[0]}{(conv.other?.nom || "?")[0]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.other?.prenom} {conv.other?.nom}</p>
                        <p style={{ margin: "1px 0 0", fontSize: "11px", color: conv.other?.plan === "coach" ? "#f97316" : "#4ade80" }}>
                          {conv.other?.plan === "coach" ? "Coach" : conv.other?.plan === "pro" ? "Joueur PRO" : conv.other?.plan}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Zone de chat */}
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", display: "flex", flexDirection: "column" }}>
              {convActive ? (
                <>
                  <div style={{ padding: "1rem", borderBottom: "1px solid #222", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: 700, fontSize: "13px" }}>
                      {(convActive.other?.prenom || "?")[0]}{(convActive.other?.nom || "?")[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{convActive.other?.prenom} {convActive.other?.nom}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: convActive.other?.plan === "coach" ? "#f97316" : "#4ade80" }}>
                        {convActive.other?.plan === "coach" ? "🎙️ Coach" : "⚽ Joueur PRO"}
                      </p>
                    </div>
                  </div>

                  <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", minHeight: "300px" }}>
                    {convMessages.length === 0 ? (
                      <div style={{ margin: "auto", textAlign: "center", color: "#555" }}>
                        <p>Début de la conversation</p>
                      </div>
                    ) : (
                      convMessages.map((m, i) => (
                        <div key={i} style={st.msgBubble(m.sender_id === recruteurId)}>
                          <p style={{ margin: 0 }}>{m.content}</p>
                          <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.6 }}>
                            {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: "1rem", borderTop: "1px solid #222", display: "flex", gap: "8px" }}>
                    <input
                      style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", outline: "none" }}
                      placeholder="Écrire un message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && envoyerMessage()}
                    />
                    <button onClick={envoyerMessage} style={{ background: "#4ade80", color: "#000", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "2rem" }}>💬</p>
                  <p>Sélectionnez une conversation</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONTACTER LE COACH ── */}
        {activeTab === "coach" && (
          <CoachContact coaches={coaches} recruteurId={recruteurId} contacterCoach={contacterCoach} chargerConversations={chargerConversations} setActiveTab={setActiveTab} ouvrirConversation={ouvrirConversation} conversations={conversations} st={st} />
        )}
      </div>

      {/* Modal message joueur */}
      {messageModal && (
        <div style={st.overlay} onClick={() => setMessageModal(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <button style={{ ...st.btnSecondary, float: "right" }} onClick={() => setMessageModal(null)}>✕</button>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Contacter {messageModal.prenom} {messageModal.nom}</h2>
            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 1.5rem" }}>{messageModal.poste} · {messageModal.categorie}</p>
            {messageSent ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#4ade80" }}><p style={{ fontSize: "2rem" }}>✓</p><p>Message envoyé !</p></div>
            ) : (
              <>
                <label style={st.filterLabel}>Votre message</label>
                <textarea style={st.textarea} placeholder="Bonjour, je suis intéressé par votre profil..." value={messageText} onChange={e => setMessageText(e.target.value)} />
                <div style={{ display: "flex", gap: "12px", marginTop: "1rem" }}>
                  <button style={{ ...st.btnPrimary, opacity: sendingMessage ? 0.7 : 1 }} onClick={handleSendMessage} disabled={sendingMessage}>
                    {sendingMessage ? "Envoi..." : "Envoyer ✉️"}
                  </button>
                  <button style={st.btnSecondary} onClick={() => setMessageModal(null)}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant Contact Coach ─────────────────────────────────────────────────
function CoachContact({ coaches, recruteurId, contacterCoach, chargerConversations, setActiveTab, ouvrirConversation, conversations, st }) {
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !selectedCoach) return;
    setSending(true);
    await contacterCoach(selectedCoach, message);
    await chargerConversations(recruteurId);
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage("");
      // Ouvrir la conv dans l'onglet messages
      setActiveTab("messages");
    }, 1500);
  };

  if (coaches.length === 0) {
    return (
      <div style={{ background: "#111", border: "1px dashed #333", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#555" }}>
        <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>🎙️</p>
        <p style={{ fontSize: "1.1rem", color: "#555" }}>Aucun coach disponible pour l'instant.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700 }}>🎙️ Contacter notre coach expert</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>Posez vos questions sur un joueur ou demandez une collaboration.</p>
      </div>

      {/* Sélection coach */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
        {coaches.map(coach => (
          <div key={coach.id}
            onClick={() => setSelectedCoach(coach)}
            style={{ background: "#111", border: `1px solid ${selectedCoach?.id === coach.id ? "#4ade80" : "#222"}`, borderRadius: "12px", padding: "1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1a1a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
              {(coach.prenom || "C")[0]}{(coach.nom || "")[0]}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{coach.prenom} {coach.nom}</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#f97316" }}>🎙️ Coach Expert</p>
              {coach.club && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666" }}>{coach.club}</p>}
            </div>
            {selectedCoach?.id === coach.id && <span style={{ marginLeft: "auto", color: "#4ade80", fontSize: "18px" }}>✓</span>}
          </div>
        ))}
      </div>

      {/* Message */}
      {selectedCoach && (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "1.5rem" }}>
          <label style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
            Votre message à {selectedCoach.prenom}
          </label>
          {sent ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#4ade80" }}>
              <p style={{ fontSize: "2rem" }}>✓</p>
              <p>Message envoyé ! Redirection vers vos messages...</p>
            </div>
          ) : (
            <>
              <textarea
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff", padding: "12px", fontSize: "14px", resize: "vertical", minHeight: "140px", boxSizing: "border-box", fontFamily: "inherit" }}
                placeholder={`Bonjour ${selectedCoach.prenom}, je souhaitais vous contacter au sujet de...`}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                style={{ marginTop: "12px", width: "100%", background: "#4ade80", color: "#000", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: (sending || !message.trim()) ? 0.6 : 1 }}>
                {sending ? "Envoi en cours..." : `Envoyer à ${selectedCoach.prenom} ✉️`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
