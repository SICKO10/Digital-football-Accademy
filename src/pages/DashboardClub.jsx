import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const POSTES = ["Tous", "Attaquant", "Milieu", "Défenseur", "Gardien"];
const CATEGORIES = ["Toutes", "U14", "U15", "U16", "U17", "U18", "U19", "U20", "Senior"];
const PIEDS = ["Tous", "Droit", "Gauche", "Les deux"];
const REGIONS = ["Toutes", "Île-de-France", "Auvergne-Rhône-Alpes", "Occitanie", "Provence-Alpes-Côte d'Azur", "Nouvelle-Aquitaine", "Hauts-de-France", "Grand Est", "Bretagne", "Normandie", "Pays de la Loire", "Bourgogne-Franche-Comté", "Centre-Val de Loire", "Corse", "Martinique", "Guadeloupe", "La Réunion"];

export default function DashboardClub() {
  const navigate = useNavigate();
  const [recruteur, setRecruteur] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("joueurs");
  const [selectedJoueur, setSelectedJoueur] = useState(null);
  const [favoris, setFavoris] = useState([]);
  const [messageModal, setMessageModal] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [poste, setPoste] = useState("Tous");
  const [categorie, setCategorie] = useState("Toutes");
  const [pied, setPied] = useState("Tous");
  const [region, setRegion] = useState("Toutes");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || profile.plan !== "recruteur") { navigate("/"); return; }
      setRecruteur(profile);
      const { data: joueursData } = await supabase.from("profiles").select("*").eq("plan", "pro").eq("abonnement_actif", true);
      setJoueurs(joueursData || []);
      setFiltered(joueursData || []);
      setLoading(false);
    };
    checkAuth();
  }, []);

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

  const toggleFavori = (id) => setFavoris(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setMessageSent(true);
    setTimeout(() => { setMessageModal(null); setMessageText(""); setMessageSent(false); }, 2000);
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
    tabs: { display: "flex", gap: "8px", marginBottom: "2rem" },
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
    comingSoon: { background: "#111", border: "1px dashed #333", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#555" },
    videoBox: { background: "#1a1a1a", borderRadius: "8px", padding: "1rem", marginTop: "8px" },
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

          {/* ── VIDÉO ── */}
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
                  <a href={videoUrl} target="_blank" rel="noreferrer"
                    style={{ color: "#4ade80", fontSize: "14px", textDecoration: "none" }}>
                    🎬 Voir la vidéo →
                  </a>
                )}
              </div>
            </>
          )}

          <div style={{ marginTop: "2rem", display: "flex", gap: "12px" }}>
            <button style={st.btnPrimary} onClick={() => setMessageModal(j)}>✉️ Contacter ce joueur</button>
            <button style={favoris.includes(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>
              {favoris.includes(j.id) ? "★ Favori" : "☆ Ajouter aux favoris"}
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
          {[{ id: "joueurs", label: "🔍 Joueurs" }, { id: "favoris", label: `★ Favoris (${favoris.length})` }, { id: "feed", label: "🎬 Vidéos" }, { id: "messages", label: "✉️ Messages" }].map(t => (
            <button key={t.id} style={st.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

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
                      <button style={favoris.includes(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>{favoris.includes(j.id) ? "★" : "☆"}</button>
                      <button style={st.btnSecondary} onClick={() => setMessageModal(j)}>✉️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "favoris" && (
          favoris.length === 0 ? (
            <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>☆</p><p>Aucun favori pour l'instant.</p></div>
          ) : (
            <div style={st.grid}>
              {joueurs.filter(j => favoris.includes(j.id)).map(j => (
                <div key={j.id} style={{ ...st.card, borderColor: "#1a3a1a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={st.avatar}>{getInitials(j)}</div>
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 2px" }}>{j.prenom} {j.nom}</p>
                      <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{j.poste} · {j.categorie}</p>
                    </div>
                    <span style={{ color: "#4ade80", marginLeft: "auto" }}>★</span>
                  </div>
                  <div style={st.cardActions}>
                    <button style={st.btnPrimary} onClick={() => setSelectedJoueur(j)}>Voir le profil</button>
                    <button style={st.btnSecondary} onClick={() => toggleFavori(j.id)}>Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "feed" && (
          <div style={st.comingSoon}>
            <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>🎬</p>
            <p style={{ fontSize: "1.1rem", color: "#555", margin: "0 0 8px" }}>Feed vidéo joueurs</p>
            <p style={{ fontSize: "13px", color: "#444" }}>Les clips des joueurs PRO apparaîtront ici une fois l'upload vidéo activé.</p>
          </div>
        )}

        {activeTab === "messages" && (
          <div style={st.comingSoon}>
            <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>✉️</p>
            <p style={{ fontSize: "1.1rem", color: "#555", margin: "0 0 8px" }}>Messagerie</p>
            <p style={{ fontSize: "13px", color: "#444" }}>La messagerie complète joueurs ↔ recruteurs sera disponible prochainement.</p>
          </div>
        )}
      </div>

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
                  <button style={st.btnPrimary} onClick={handleSendMessage}>Envoyer ✉️</button>
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