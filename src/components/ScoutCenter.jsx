import { useEffect, useState } from "react";
import { supabase, signOutSafe } from "../supabase";
import { useNavigate, useLocation } from "react-router-dom";
import Avatar from "../components/Avatar";
import { notifierJoueur } from "../lib/notifications";
import { CATEGORIES as CATEGORIES_BASE } from "../lib/categories";
import HistoriqueSaisons from "../components/saisons/HistoriqueSaisons";
import { useColors } from "../lib/theme";

const CATEGORIES = ["Toutes", ...CATEGORIES_BASE];
const PIEDS = ["Tous", "Droit", "Gauche", "Les deux"];
const POSTE_PILLS = [
  { val: "Tous",      label: "Tous",  icon: "⚽" },
  { val: "Attaquant", label: "ATT",   icon: "⚡" },
  { val: "Milieu",    label: "MIL",   icon: "🔵" },
  { val: "Défenseur", label: "DEF",   icon: "🛡️" },
  { val: "Gardien",   label: "GDN",   icon: "🧤" },
];

// Génère le thumbnail Cloudinary depuis l'URL vidéo
const getCloudinaryThumb = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  return url
    .replace("/video/upload/", "/video/upload/f_jpg,q_auto,w_400,so_1/")
    .replace(/\.(mp4|mov|webm)(\?.*)?$/, ".jpg");
};

// Radar chart SVG (pentagon)
function RadarChart({ j, size = 180 }) {
  const colors = useColors();
  const stats = [
    { label: "Buts",       value: Math.min((j.buts_total || 0) / 20, 1) },
    { label: "Passes",    value: Math.min((j.passes_decisives || 0) / 15, 1) },
    { label: "Matchs",   value: Math.min((j.matchs_officiel || 0) / 30, 1) },
    { label: "Clean Sheet", value: Math.min((j.cleansheets || 0) / 10, 1) },
  ];
  const n = stats.length;
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const pt = (i, scale) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * scale * Math.cos(a), y: cy + r * scale * Math.sin(a) };
  };
  const poly = (scale) => stats.map((_, i) => { const p = pt(i, scale); return `${p.x},${p.y}`; }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(l => (
        <polygon key={l} points={poly(l)} fill="none" stroke={l === 1 ? colors.border.strong : colors.border.subtle} strokeWidth={l === 1 ? 1 : 0.5} />
      ))}
      {stats.map((_, i) => { const p = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={colors.border.default} strokeWidth="1" />; })}
      <polygon points={stats.map((s, i) => { const p = pt(i, Math.max(s.value, 0.05)); return `${p.x},${p.y}`; }).join(" ")} fill="#f9731625" stroke="#f97316" strokeWidth="1.5" />
      {stats.map((s, i) => { const p = pt(i, Math.max(s.value, 0.05)); return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f97316" />; })}
      {stats.map((s, i) => { const lp = pt(i, 1.28); return <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill={colors.text.faint} fontSize="9" fontFamily="Inter,sans-serif">{s.label}</text>; })}
    </svg>
  );
}

// Toast notification
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: "#f97316", color: "#000", padding: "12px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", zIndex: 9999, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "8px", animation: "slideIn 0.3s ease" }}>
      ✓ {message}
    </div>
  );
}

export default function ScoutCenter({ userId, profil, embedded = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const colors = useColors();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Miroir local de la prop profil, pour refléter immédiatement les mises à jour
  // (sauvegarde du profil, upload avatar) sans attendre un re-fetch du parent.
  const [profilLocal, setProfilLocal] = useState(profil);
  useEffect(() => { setProfilLocal(profil); }, [profil]);
  const [joueurs, setJoueurs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("joueurs");
  const [selectedJoueur, setSelectedJoueur] = useState(null);
  const [joueurParcours, setJoueurParcours] = useState([]);
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
  const [styleDeJeu, setStyleDeJeu] = useState("Tous");
  const [ville, setVille] = useState("");
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState("recent");
  const [modeAffichage, setModeAffichage] = useState("grille");
  const [toast, setToast] = useState(null);
  const [certifications, setCertifications] = useState({}); // { joueur_id: { niveau, saison, statut } }

  // Validation note de saison par le club
  const [validationsClub, setValidationsClub] = useState([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [valSaison, setValSaison] = useState('2024-2025')
  const [valNote, setValNote] = useState(0)
  const [valHover, setValHover] = useState(0)
  const [valJustif, setValJustif] = useState('feuilles') // 'feuilles' | 'licence'
  const [valLicence, setValLicence] = useState('')
  const [valFeuilles, setValFeuilles] = useState(['', '', '', '', ''])
  const [valSending, setValSending] = useState(false)
  const [valLicenceUrl, setValLicenceUrl] = useState('')
  const [valLicenceUploading, setValLicenceUploading] = useState(false)
  const [valFeuillesUploading, setValFeuillesUploading] = useState([false, false, false, false, false])

  // Profil profil
  const [profilEdit, setProfilEdit] = useState({ prenom: '', nom: '', club: '', region: '', type_recruteur: '', description: '', recherche_profil: '' });
  const [savingProfil, setSavingProfil] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const chargerDonnees = async () => {
      if (!userId) return;
      setProfilEdit({ prenom: profil?.prenom || '', nom: profil?.nom || '', club: profil?.club || '', region: profil?.region || '', type_recruteur: profil?.type_recruteur || '', description: profil?.description || '', recherche_profil: profil?.recherche_profil || '' });
      const { data: joueursData } = await supabase.from("profiles").select("*").eq("plan", "joueur_pro").eq("abonnement_actif", true);
      const { data: coachData } = await supabase.from("profiles").select("*").eq("plan", "coach");
      setJoueurs(joueursData || []);
      setFiltered(joueursData || []);
      setCoaches(coachData || []);
      // Charger les certifications validées
      const { data: certifData } = await supabase.from("certifications").select("joueur_id, niveau, saison, statut").eq("statut", "validé");
      const certifMap = {};
      (certifData || []).forEach(c => { certifMap[c.joueur_id] = c; });
      setCertifications(certifMap);
      await chargerConversations(userId);
      await chargerFavoris(userId);
      setLoading(false);
    };
    chargerDonnees();
  }, [userId]);

  // Auto-ouvrir la modal de contact si on arrive depuis le Feed
  useEffect(() => {
    if (location.state?.contactJoueur) {
      setMessageModal(location.state.contactJoueur);
      setActiveTab("messages");
    }
  }, [location.state]);

  // Régions disponibles dérivées des joueurs chargés (dynamique)
  const regionsDisponibles = ["Toutes", ...Array.from(new Set(joueurs.map(j => j.region).filter(Boolean))).sort()];

  const CARACTERISTIQUES_PAR_POSTE = {
    Gardien:   ['Jeu au pied', 'Sortie aérienne', 'Sur sa ligne', 'Penalties', 'Leadership', '1 contre 1', 'Lecture du jeu', 'Anticipation', 'Relance longue', 'Commandement défensif', 'Détente', 'Sang-froid'],
    Défenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1', 'Pressing', 'Marquage', 'Placement', 'Récupération de balle', 'Jeu propre', 'Combativité'],
    Milieu:    ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre', 'Passes courtes', 'Transition rapide', 'Jeu entre les lignes', 'Leadership'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin', 'Décalage', 'Combinaison', 'Mouvement sans ballon', 'Leadership offensif'],
  };

  const stylesDisponibles = poste !== "Tous" && CARACTERISTIQUES_PAR_POSTE[poste]
    ? ["Tous", ...CARACTERISTIQUES_PAR_POSTE[poste]]
    : ["Tous"];

  useEffect(() => {
    let result = [...joueurs];
    if (poste !== "Tous") result = result.filter(j => j.poste === poste);
    if (categorie !== "Toutes") result = result.filter(j => j.categorie === categorie);
    if (pied !== "Tous") result = result.filter(j => j.pied === pied);
    if (region !== "Toutes") result = result.filter(j => j.region === region);
    if (styleDeJeu !== "Tous") result = result.filter(j => (j.points_forts || '').toLowerCase().includes(styleDeJeu.toLowerCase()));
    if (ville) {
      const v = ville.toLowerCase();
      result = result.filter(j => (j.ville && j.ville.toLowerCase().includes(v)) || (j.club && j.club.toLowerCase().includes(v)));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(j =>
        `${j.prenom} ${j.nom}`.toLowerCase().includes(s) ||
        (j.poste && j.poste.toLowerCase().includes(s)) ||
        (j.club && j.club.toLowerCase().includes(s)) ||
        (j.ville && j.ville.toLowerCase().includes(s)) ||
        (j.region && j.region.toLowerCase().includes(s))
      );
    }
    if (tri === "recent") result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (tri === "buts") result.sort((a, b) => (b.buts_total || 0) - (a.buts_total || 0));
    else if (tri === "matchs") result.sort((a, b) => (b.matchs_officiel || 0) - (a.matchs_officiel || 0));
    setFiltered(result);
  }, [poste, categorie, pied, region, styleDeJeu, ville, search, tri, joueurs]);

  const chargerFavoris = async (uid) => {
    const { data } = await supabase.from("favoris_recruteur").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setFavoris(data || []);
  };

  const chargerValidations = async (joueurId) => {
    const { data } = await supabase.from("validations_club")
      .select("*")
      .eq("joueur_id", joueurId)
      .eq("club_id", userId)
      .order("created_at", { ascending: false });
    setValidationsClub(data || []);
  };

  const soumettreValidation = async () => {
    if (!valNote || !valSaison) return;
    const feuillesRemplies = valFeuilles.filter(f => f.trim() !== '');
    if (valJustif === 'feuilles' && feuillesRemplies.length < 5) return;
    if (valJustif === 'licence' && !valLicence.trim() && !valLicenceUrl) return;
    setValSending(true);
    const payload = {
      club_id: userId,
      joueur_id: selectedJoueur.id,
      saison: valSaison,
      note: valNote,
      justif_type: valJustif,
      numero_licence_justif: valJustif === 'licence' ? (valLicence.trim() || null) : null,
      licence_doc_url: valJustif === 'licence' ? (valLicenceUrl || null) : null,
      feuilles_match: valJustif === 'feuilles' ? feuillesRemplies : null,
    };
    await supabase.from("validations_club").upsert(payload, { onConflict: 'club_id,joueur_id,saison' });
    await chargerValidations(selectedJoueur.id);
    setValSending(false);
    setShowValidationModal(false);
    setValNote(0); setValLicence(''); setValFeuilles(['', '', '', '', '']); setValJustif('feuilles'); setValLicenceUrl(''); setValFeuillesUploading([false,false,false,false,false]);
    setToast("Note de saison validée !");
  };

  const uploadLicenceDoc = async (file) => {
    if (!file || !userId) return;
    setValLicenceUploading(true);
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId }) });
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('folder', folder);
      formData.append('public_id', public_id);
      formData.append('api_key', api_key);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) setValLicenceUrl(uploadData.secure_url);
    } catch (e) { console.error(e); }
    setValLicenceUploading(false);
  };

  const uploadFeuille = async (file, index) => {
    if (!file || !userId) return;
    setValFeuillesUploading(prev => { const a = [...prev]; a[index] = true; return a; });
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId }) });
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('folder', folder);
      formData.append('public_id', public_id);
      formData.append('api_key', api_key);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        setValFeuilles(prev => { const a = [...prev]; a[index] = uploadData.secure_url; return a; });
      }
    } catch (e) { console.error(e); }
    setValFeuillesUploading(prev => { const a = [...prev]; a[index] = false; return a; });
  };

  const isFavori = (joueurId) => favoris.some(f => f.joueur_id === joueurId);

  const toggleFavori = async (joueurId) => {
    const existing = favoris.find(f => f.joueur_id === joueurId);
    if (existing) {
      await supabase.from("favoris_recruteur").delete().eq("id", existing.id);
      setFavoris(prev => prev.filter(f => f.joueur_id !== joueurId));
    } else {
      const { data } = await supabase.from("favoris_recruteur").insert({ user_id: userId, joueur_id: joueurId, dossier: "Général" }).select().single();
      if (data) setFavoris(prev => [...prev, data]);
    }
  };

  const assignerDossier = async (joueurId, dossier) => {
    const existing = favoris.find(f => f.joueur_id === joueurId);
    if (!existing) return;
    await supabase.from("favoris_recruteur").update({ dossier }).eq("id", existing.id);
    setAssignDossierJoueur(null);
    await chargerFavoris(userId);
  };

  const dossiers = ["Général", ...new Set(favoris.map(f => f.dossier).filter(d => d && d !== "Général"))];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const isNouveau = (j) => j.created_at && new Date(j.created_at) > sevenDaysAgo;
  const aEteContacte = (joueurId) => conversations.some(c => c.otherId === joueurId);
  const nbNouveaux = joueurs.filter(isNouveau).length;
  const showToast = (msg) => { setToast(msg); };

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

  const handleSaveProfil = async () => {
    if (!userId) return;
    // Optimistic : profil local + toast mis à jour tout de suite, sans
    // attendre la réponse Supabase. Erreur → on revient à l'ancien profil.
    const avant = profilLocal;
    setProfilLocal(prev => ({ ...prev, ...profilEdit }));
    setToast('Profil mis à jour !');
    setSavingProfil(true);
    const { error } = await supabase.from('profiles').update({
      prenom: profilEdit.prenom,
      nom: profilEdit.nom,
      club: profilEdit.club,
      region: profilEdit.region,
      type_recruteur: profilEdit.type_recruteur,
      description: profilEdit.description,
      recherche_profil: profilEdit.recherche_profil,
    }).eq('id', userId);
    setSavingProfil(false);
    if (error) {
      setProfilLocal(avant);
      setToast('Erreur lors de la mise à jour du profil');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId }) });
    const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('public_id', public_id);
    formData.append('api_key', api_key);
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    if (uploadData.secure_url) {
      await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', userId);
      setProfilLocal(prev => ({ ...prev, avatar_url: uploadData.secure_url }));
      setToast('Photo mise à jour !');
    }
    setAvatarUploading(false);
  };

  const ouvrirConversation = async (conv) => {
    setConvActive(conv);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${conv.otherId}),and(sender_id.eq.${conv.otherId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    setConvMessages(data || []);
  };

  const envoyerMessage = async () => {
    if (!newMessage.trim() || !convActive || !userId) return;
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: convActive.otherId,
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    });
    await notifierJoueur({ type: 'message', userId: convActive.otherId, titre: 'Nouveau message', contenu: { auteur: profilLocal?.prenom, texte: newMessage.trim() }, lien: '/dashboard' });
    setNewMessage("");
    await ouvrirConversation(convActive);
    await chargerConversations(userId);
  };

  // Envoyer message depuis modal (première prise de contact)
  const handleSendMessage = async () => {
    if (!messageText.trim() || !messageModal || !userId) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: messageModal.id,
      content: messageText.trim(),
      created_at: new Date().toISOString()
    });
    setSendingMessage(false);
    if (!error) {
      await notifierJoueur({ type: 'message', userId: messageModal.id, titre: 'Nouveau message', contenu: { auteur: profilLocal?.prenom, texte: messageText.trim() }, lien: '/dashboard' });
      setMessageSent(true);
      await chargerConversations(userId);
      setTimeout(() => { setMessageModal(null); setMessageText(""); setMessageSent(false); }, 2000);
    }
  };

  // Contacter un coach
  const contacterCoach = async (coach, message) => {
    if (!message.trim() || !userId) return;
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: coach.id,
      content: message.trim(),
      created_at: new Date().toISOString()
    });
    await chargerConversations(userId);
  };

  const posteColor = (p) => {
    const map = { "Attaquant": { bg: "#f9731615", text: "#f97316" }, "Milieu": { bg: "#f9731615", text: "#f97316" }, "Défenseur": { bg: "#60a5fa15", text: "#60a5fa" }, "Gardien": { bg: "#a855f715", text: "#a855f7" } };
    return map[p] || { bg: colors.background.raised, text: colors.text.secondary };
  };
  const getInitials = (j) => `${(j.prenom || "?")[0]}${(j.nom || "?")[0]}`.toUpperCase();
  const isVeo = (url) => url && url.includes("veo.co");
  const isYoutube = (url) => url && (url.includes("youtube.com") || url.includes("youtu.be"));
  const isCloudinary = (url) => url && url.includes("cloudinary.com");

  const st = {
    page: { background: colors.background.base, minHeight: "100vh", color: colors.text.primary, fontFamily: "Inter, sans-serif" },
    navbar: { background: colors.background.surface, borderBottom: `1px solid ${colors.border.default}`, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" },
    logo: { color: "#f97316", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "1px" },
    logoutBtn: { background: "transparent", border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, padding: "6px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
    content: { padding: isMobile ? "1rem" : "2rem", maxWidth: "1200px", margin: "0 auto" },
    tabs: { display: "flex", gap: "8px", marginBottom: "1.5rem", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: "2px" },
    tab: (active) => ({ padding: isMobile ? "8px 14px" : "10px 24px", borderRadius: "8px", border: active ? "none" : `1px solid ${colors.border.strong}`, background: active ? "#f97316" : "transparent", color: active ? "#000" : colors.text.secondary, fontWeight: active ? 600 : 400, cursor: "pointer", fontSize: isMobile ? "13px" : "14px", whiteSpace: "nowrap", flexShrink: 0 }),
    filterBar: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: "14px", padding: isMobile ? "1rem" : "16px 20px", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" },
    filterLabel: { fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px" },
    select: { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: "10px", color: colors.text.primary, padding: "10px 12px", fontSize: "13px", cursor: "pointer" },
    searchInput: { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: "10px", color: colors.text.primary, padding: "10px 14px", fontSize: "13px", width: "100%", boxSizing: "border-box" },
    grid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", padding: "1.25rem" },
    avatar: { width: "44px", height: "44px", borderRadius: "50%", background: "#f9731615", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 700, fontSize: "16px" },
    posteBadge: (p) => ({ background: posteColor(p).bg, color: posteColor(p).text, fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: 500 }),
    statsRow: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "8px", marginTop: "12px", borderTop: `1px solid ${colors.border.subtle}`, paddingTop: "12px" },
    stat: { textAlign: "center" },
    statVal: { fontSize: "18px", fontWeight: 700, color: "#f97316" },
    statLabel: { fontSize: "10px", color: colors.text.faint, textTransform: "uppercase" },
    cardActions: { display: "flex", gap: "8px", marginTop: "12px" },
    btnPrimary: { flex: 1, background: "#f97316", color: "#000", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" },
    btnSecondary: { background: "transparent", border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "13px" },
    favoriBtnActive: { background: "transparent", border: "1px solid #f97316", color: "#f97316", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "13px" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
    modal: { background: colors.background.surface, border: `1px solid ${colors.border.strong}`, borderRadius: "16px", padding: "2rem", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto" },
    sectionTitle: { fontSize: "11px", color: "#f97316", textTransform: "uppercase", letterSpacing: "1px", margin: "1.5rem 0 0.75rem" },
    statsGrid: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "12px" },
    statBox: { background: colors.background.raised, borderRadius: "8px", padding: "12px", textAlign: "center" },
    statBoxVal: { fontSize: "22px", fontWeight: 700, color: "#f97316" },
    statBoxLabel: { fontSize: "11px", color: colors.text.faint, marginTop: "2px" },
    textarea: { width: "100%", background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: "8px", color: colors.text.primary, padding: "12px", fontSize: "14px", resize: "vertical", minHeight: "120px", boxSizing: "border-box", marginTop: "8px", fontFamily: "inherit" },
    emptyState: { textAlign: "center", padding: "4rem 2rem", color: colors.text.ghost },
    videoBox: { background: colors.background.raised, borderRadius: "8px", padding: "1rem", marginTop: "8px" },
    msgBubble: (mine) => ({ maxWidth: "70%", padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "#f97316" : colors.background.raised, color: mine ? "#000" : colors.text.primary, fontSize: "14px", alignSelf: mine ? "flex-end" : "flex-start", marginBottom: "8px" }),
  };

  const handleLogout = async () => { await signOutSafe(); navigate("/"); };

  const getClubInitials = (name) => {
    const words = (name || '').trim().split(/\s+/).filter(w => !['AS','FC','OC','US','SC','AC','RC','ES','OGC','SM','EA'].includes(w))
    if (words.length === 0) return (name || '?').slice(0, 2).toUpperCase()
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase()
  }
  const getClubColor = (name) => {
    const colors = ['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#f97316','#06b6d4','#ec4899']
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const ouvrirProfilJoueur = async (j) => {
    setSelectedJoueur(j)
    setJoueurParcours([])
    setValidationsClub([])
    const { data } = await supabase.from('parcours').select('*').eq('joueur_id', j.id).order('saison', { ascending: false })
    setJoueurParcours(data || [])
    if (userId) await chargerValidations(j.id)
  }

  if (loading) return <div style={{ ...st.page, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#f97316" }}>Chargement...</div></div>;

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
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <Avatar person={j} size={72} bg="#f9731615" border="2px solid #f9731660" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{j.prenom} {j.nom}</h1>
                <span style={{ background: "#f9731620", color: "#f97316", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>PRO</span>
                {certifications[j.id] && <span style={{ background: "#f0c03020", color: "#f0c030", fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", border: "1px solid #f0c03050" }}>⭐ Certifié {certifications[j.id].niveau} {certifications[j.id].saison}</span>}
                {isNouveau(j) && <span style={{ background: "#f97316", color: "#000", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>NEW</span>}
                {aEteContacte(j.id) && <span style={{ background: "#60a5fa20", color: "#60a5fa", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", border: "1px solid #60a5fa40" }}>✓ Contacté</span>}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {j.poste && <span style={st.posteBadge(j.poste)}>{j.poste}</span>}
                {j.categorie && <span style={{ ...st.posteBadge(""), background: colors.background.raised, color: colors.text.secondary }}>{j.categorie}</span>}
                {j.pied && <span style={{ ...st.posteBadge(""), background: colors.background.raised, color: colors.text.secondary }}>Pied {j.pied.toLowerCase()}</span>}
                {j.region && <span style={{ ...st.posteBadge(""), background: colors.background.raised, color: colors.text.secondary }}>{j.region}</span>}
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "1.5rem", background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: "12px", padding: "1.5rem", flexWrap: "wrap" }}>
            <RadarChart j={j} size={180} />
            <div style={{ flex: 1, minWidth: "160px" }}>
              <p style={{ ...st.sectionTitle, margin: "0 0 1rem" }}>Performance globale</p>
              {[
                { label: "Buts", val: j.buts_total || 0, max: 20, color: "#f97316" },
                { label: "Passes déc.", val: j.passes_decisives || 0, max: 15, color: "#f97316" },
                { label: "Matchs officiels", val: j.matchs_officiel || 0, max: 30, color: "#60a5fa" },
                { label: "Clean sheets", val: j.cleansheets || 0, max: 10, color: "#a855f7" },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", color: colors.text.faint }}>{s.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                  <div style={{ background: colors.background.raised, borderRadius: "4px", height: "5px" }}>
                    <div style={{ background: s.color, width: `${Math.min((s.val / s.max) * 100, 100)}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
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
              <div style={{ background: colors.background.raised, borderRadius: "8px", padding: "1rem" }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{j.club || "Non renseigné"}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.text.faint }}>{j.niveau_equipe}</p>
              </div>
            </>
          )}

          {j.points_forts && (
            <>
              <p style={st.sectionTitle}>Points forts</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                {j.points_forts.split(", ").filter(Boolean).map(tag => (
                  <span key={tag} style={{ background: "#f9731620", color: "#f97316", border: "1px solid #f9731640", fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px" }}>{tag}</span>
                ))}
              </div>
            </>
          )}

          {j.a_ameliorer && (
            <>
              <p style={st.sectionTitle}>Axes de progression</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                {j.a_ameliorer.split(", ").filter(Boolean).map(tag => (
                  <span key={tag} style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b40", fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px" }}>{tag}</span>
                ))}
              </div>
            </>
          )}

          {joueurParcours.length > 0 && (
            <>
              <p style={st.sectionTitle}>Parcours footballistique</p>
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: "12px", padding: "1.25rem" }}>
                {joueurParcours.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", gap: "14px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f97316", marginTop: "5px", flexShrink: 0 }} />
                      {i < joueurParcours.length - 1 && <div style={{ width: "1px", flex: 1, background: colors.border.default, marginTop: "2px" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < joueurParcours.length - 1 ? "18px" : 0, display: "flex", alignItems: "center", gap: "10px" }}>
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.club} style={{ width: "26px", height: "26px", objectFit: "contain", flexShrink: 0 }} />
                        : <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: getClubColor(p.club), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: colors.text.primary, flexShrink: 0 }}>{getClubInitials(p.club)}</div>
                      }
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "14px", margin: 0 }}>{p.club}</p>
                        <p style={{ fontSize: "11px", color: colors.text.faint, margin: "2px 0 4px" }}>{[p.saison, p.niveau_championnat, p.categorie, p.poste].filter(Boolean).join(" · ")}</p>
                        {(p.matchs_joues > 0 || p.buts > 0 || p.passes_decisives > 0 || p.cleansheets > 0) && (
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {p.matchs_joues > 0 && <span style={{ fontSize: "11px", color: "#f97316" }}>⚽ {p.matchs_joues} matchs</span>}
                            {p.buts > 0 && <span style={{ fontSize: "11px", color: "#f97316" }}>🥅 {p.buts} buts</span>}
                            {p.passes_decisives > 0 && <span style={{ fontSize: "11px", color: "#60a5fa" }}>🎯 {p.passes_decisives} passes</span>}
                            {p.cleansheets > 0 && <span style={{ fontSize: "11px", color: "#a855f7" }}>🧤 {p.cleansheets} CS</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <>
            <p style={st.sectionTitle}>📅 Historique saisons</p>
            <HistoriqueSaisons joueurId={j.id} />
          </>

          {j.carte_fifa_url && (
            <>
              <p style={st.sectionTitle}>Carte FIFA</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <img
                  src={j.carte_fifa_url}
                  alt={`Carte FIFA ${j.prenom} ${j.nom}`}
                  style={{ width: "180px", height: "252px", objectFit: "contain", borderRadius: "10px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                />
              </div>
            </>
          )}

          {videoUrl && (
            <>
              <p style={st.sectionTitle}>Vidéo du joueur</p>
              <div style={st.videoBox}>
                {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                  <a href={videoUrl} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f9731615", border: "1px solid #f9731640", color: "#f97316", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
                    🎬 {isVeo(videoUrl) ? "Ouvrir sur Veo" : "Ouvrir sur YouTube"}
                  </a>
                ) : isCloudinary(videoUrl) ? (
                  <>
                    <video src={videoUrl} controls style={{ width: "100%", borderRadius: "8px", maxHeight: "300px", background: "#000" }} />
                    <a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "8px", color: "#f97316", fontSize: "12px", textDecoration: "none" }}>
                      🔗 Ouvrir dans un nouvel onglet
                    </a>
                  </>
                ) : (
                  <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: "#f97316", fontSize: "14px", textDecoration: "none" }}>🎬 Voir la vidéo →</a>
                )}
              </div>
            </>
          )}

          {/* ── Validation note de saison ─────────────────────────────────── */}
          <div style={{ marginTop: "2rem", background: "#f9731608", border: "1px solid #f9731630", borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "#f97316" }}>✅ Notes de saison validées par votre club</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: colors.text.faint }}>Prouvez que le joueur a joué pour vous (5 feuilles de match ou numéro de licence)</p>
              </div>
              <button
                onClick={() => { setValSaison('2024-2025'); setValNote(0); setValJustif('feuilles'); setValLicence(''); setValFeuilles(['','','','','']); setShowValidationModal(true); }}
                style={{ background: "#f97316", color: "#000", border: "none", padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >+ Valider une note</button>
            </div>

            {validationsClub.length === 0 ? (
              <p style={{ margin: "1rem 0 0", fontSize: "13px", color: colors.text.ghost, textAlign: "center" }}>Aucune note validée pour ce joueur</p>
            ) : (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                {validationsClub.map(v => (
                  <div key={v.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>Saison {v.saison}</span>
                      <span style={{ marginLeft: "10px", fontSize: "12px", color: colors.text.faint }}>
                        {v.justif_type === 'licence' ? `🪪 Licence · ${v.numero_licence_justif}` : `📄 ${(v.feuilles_match || []).length} feuilles`}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} style={{ fontSize: "18px", opacity: v.note >= n ? 1 : 0.15 }}>⭐</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "12px" }}>
            <button style={st.btnPrimary} onClick={() => setMessageModal(j)}>✉️ Contacter ce joueur</button>
            <button style={isFavori(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>
              {isFavori(j.id) ? "★ Favori" : "☆ Ajouter aux favoris"}
            </button>
          </div>

          {/* ── Modal validation ──────────────────────────────────────────── */}
          {showValidationModal && (
            <div onClick={() => setShowValidationModal(false)} style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
              <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "16px", padding: "2rem", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800 }}>Valider une note de saison</h3>
                <p style={{ margin: "0 0 1.5rem", fontSize: "13px", color: colors.text.faint }}>{j.prenom} {j.nom}</p>

                {/* Saison */}
                <label style={{ fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "6px" }}>Saison</label>
                <select value={valSaison} onChange={e => setValSaison(e.target.value)} style={{ width: "100%", background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: "8px", color: colors.text.primary, padding: "10px 12px", fontSize: "14px", marginBottom: "1.25rem", boxSizing: "border-box" }}>
                  {["2025-2026","2024-2025","2023-2024","2022-2023","2021-2022","2020-2021"].map(s => <option key={s}>{s}</option>)}
                </select>

                {/* Note */}
                <label style={{ fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "8px" }}>Note pour cette saison</label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem" }}>
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      onClick={() => setValNote(n)}
                      onMouseEnter={() => setValHover(n)}
                      onMouseLeave={() => setValHover(0)}
                      style={{ fontSize: "30px", cursor: "pointer", opacity: (valHover || valNote) >= n ? 1 : 0.2, transition: "opacity 0.1s" }}
                    >⭐</span>
                  ))}
                </div>
                {valNote > 0 && <p style={{ margin: "-0.75rem 0 1.25rem", fontSize: "13px", color: colors.text.faint }}>{['','Très insuffisant','Insuffisant','Bien','Très bien','Excellent'][valNote]}</p>}

                {/* Justification */}
                <label style={{ fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "8px" }}>Justification</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
                  {[{ val: 'feuilles', label: '📄 5 feuilles de match' }, { val: 'licence', label: '🪪 Numéro de licence' }].map(opt => (
                    <button key={opt.val} onClick={() => setValJustif(opt.val)} style={{ flex: 1, background: valJustif === opt.val ? "#f9731615" : colors.background.raised, border: `1px solid ${valJustif === opt.val ? "#f97316" : colors.border.strong}`, color: valJustif === opt.val ? "#f97316" : colors.text.secondary, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {valJustif === 'feuilles' && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <p style={{ margin: "0 0 10px", fontSize: "12px", color: colors.text.faint }}>Upload tes 5 feuilles de match (photo ou PDF)</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {valFeuilles.map((url, i) => (
                        <label key={i} style={{ cursor: "pointer", gridColumn: i === 4 ? "1 / -1" : "auto" }}>
                          <div style={{ border: `2px dashed ${colors.border.default}`, borderRadius: "10px", padding: "14px 10px", textAlign: "center", background: url ? "#f9731608" : colors.background.raised, borderColor: url ? "#f9731660" : colors.border.default, transition: "all 0.2s", minHeight: "80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            {valFeuillesUploading[i] ? (
                              <p style={{ margin: 0, fontSize: "12px", color: "#f97316" }}>⏳ Upload...</p>
                            ) : url ? (
                              <div style={{ width: "100%" }}>
                                {url.match(/\.(jpg|jpeg|png|webp)$/i)
                                  ? <img src={url} alt="" style={{ maxHeight: "70px", maxWidth: "100%", borderRadius: "6px", objectFit: "cover" }} />
                                  : <p style={{ margin: "0 0 4px", fontSize: "20px" }}>📄</p>
                                }
                                <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#f97316", fontWeight: 700 }}>✓ Feuille #{i+1}</p>
                                <p style={{ margin: "2px 0 0", fontSize: "10px", color: colors.text.ghost }}>Changer</p>
                              </div>
                            ) : (
                              <div>
                                <p style={{ margin: "0 0 4px", fontSize: "20px" }}>📋</p>
                                <p style={{ margin: 0, fontSize: "11px", color: colors.text.ghost, fontWeight: 600 }}>Feuille #{i+1}</p>
                                <p style={{ margin: "2px 0 0", fontSize: "10px", color: colors.border.strong }}>JPG · PNG · PDF</p>
                              </div>
                            )}
                          </div>
                          <input type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && uploadFeuille(e.target.files[0], i)} style={{ display: "none" }} />
                        </label>
                      ))}
                    </div>
                    {valFeuilles.filter(f => f.trim()).length < 5 && (
                      <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#f59e0b" }}>⚠️ {5 - valFeuilles.filter(f => f.trim()).length} feuille(s) manquante(s)</p>
                    )}
                  </div>
                )}

                {valJustif === 'licence' && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ fontSize: "12px", color: colors.text.secondary, display: "block", marginBottom: "8px" }}>Document de licence (photo ou PDF)</label>

                    {/* Zone upload */}
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <div style={{ border: `2px dashed ${colors.border.default}`, borderRadius: "10px", padding: "20px", textAlign: "center", background: valLicenceUrl ? "#f9731608" : colors.background.raised, borderColor: valLicenceUrl ? "#f9731660" : colors.border.default, transition: "all 0.2s" }}>
                        {valLicenceUploading ? (
                          <p style={{ margin: 0, fontSize: "13px", color: "#f97316" }}>⏳ Upload en cours...</p>
                        ) : valLicenceUrl ? (
                          <div>
                            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#f97316", fontWeight: 700 }}>✓ Document uploadé</p>
                            {valLicenceUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                              <img src={valLicenceUrl} alt="licence" style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "8px", marginTop: "6px" }} />
                            )}
                            <p style={{ margin: "8px 0 0", fontSize: "11px", color: colors.text.faint }}>Clique pour changer</p>
                          </div>
                        ) : (
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: "22px" }}>📄</p>
                            <p style={{ margin: 0, fontSize: "13px", color: colors.text.faint }}>Clique pour uploader la licence</p>
                            <p style={{ margin: "4px 0 0", fontSize: "11px", color: colors.border.strong }}>JPG, PNG, PDF acceptés</p>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && uploadLicenceDoc(e.target.files[0])} style={{ display: "none" }} />
                    </label>

                    <div style={{ margin: "12px 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "1px", background: colors.border.default }} />
                      <span style={{ fontSize: "11px", color: colors.text.ghost }}>ou renseigne le numéro</span>
                      <div style={{ flex: 1, height: "1px", background: colors.border.default }} />
                    </div>

                    <input
                      value={valLicence}
                      onChange={e => setValLicence(e.target.value)}
                      placeholder="Numéro de licence FFF (ex: 123456789)"
                      style={{ width: "100%", background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: "8px", color: colors.text.primary, padding: "10px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box", marginTop: "4px" }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={soumettreValidation}
                    disabled={valSending || valLicenceUploading || valFeuillesUploading.some(Boolean) || !valNote || (valJustif === 'feuilles' && valFeuilles.filter(f => f.trim()).length < 5) || (valJustif === 'licence' && !valLicence.trim() && !valLicenceUrl)}
                    style={{ flex: 1, background: "#f97316", color: "#000", border: "none", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: (valSending || valLicenceUploading || valFeuillesUploading.some(Boolean) || !valNote || (valJustif === 'feuilles' && valFeuilles.filter(f => f.trim()).length < 5) || (valJustif === 'licence' && !valLicence.trim() && !valLicenceUrl)) ? 0.4 : 1 }}
                  >{valSending ? "Validation..." : "✅ Valider cette note"}</button>
                  <button onClick={() => setShowValidationModal(false)} style={{ background: colors.background.raised, color: colors.text.faint, border: `1px solid ${colors.border.default}`, padding: "12px 20px", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Dashboard principal ────────────────────────────────────────────────────
  return (
    <div style={st.page}>
      <style>{`@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {!embedded && (
        <nav style={st.navbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "#f97316", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⚡</div>
            <div>
              <div style={{ ...st.logo, fontSize: "1rem", letterSpacing: "2px" }}>DIGITAL FOOTBALL</div>
              <div style={{ fontSize: "10px", color: colors.text.faint, letterSpacing: "1px", textTransform: "uppercase" }}>Scout Center</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Cloche notifications */}
            <button onClick={() => setActiveTab("joueurs")} style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }} title={`${nbNouveaux} nouveau${nbNouveaux > 1 ? "x" : ""} joueur${nbNouveaux > 1 ? "s" : ""} cette semaine`}>
              🔔
              {nbNouveaux > 0 && (
                <span style={{ position: "absolute", top: "0", right: "0", background: "#ef4444", color: colors.text.primary, borderRadius: "50%", width: "16px", height: "16px", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{nbNouveaux}</span>
              )}
            </button>
            <span style={{ fontSize: "13px", color: colors.text.faint }}>{profilLocal?.prenom} {profilLocal?.nom}{profilLocal?.club ? ` · ${profilLocal.club}` : ""}</span>
            <button style={st.logoutBtn} onClick={handleLogout}>Déconnexion</button>
          </div>
        </nav>
      )}

      <div style={st.content}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.5px" }}>Scout Center</h1>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
            <span style={{ color: "#f97316", fontWeight: 700, fontSize: "13px" }}>⚽ {joueurs.length} joueur{joueurs.length !== 1 ? "s" : ""}</span>
            <span style={{ color: colors.text.faint, fontSize: "13px" }}>•</span>
            <span style={{ color: "#4ade80", fontWeight: 600, fontSize: "13px" }}>📹 {joueurs.filter(j => j.clip_url).length} avec vidéo</span>
            <span style={{ color: colors.text.faint, fontSize: "13px" }}>•</span>
            <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: "13px" }}>★ {favoris.length} favoris</span>
            {nbNouveaux > 0 && <>
              <span style={{ color: colors.text.faint, fontSize: "13px" }}>•</span>
              <span style={{ color: "#f97316", fontWeight: 600, fontSize: "13px" }}>{nbNouveaux} nouveau{nbNouveaux > 1 ? "x" : ""} cette semaine</span>
            </>}
          </div>
        </div>

        <div style={st.tabs}>
          {[
            { id: "accueil", label: "🏠 Accueil" },
            { id: "joueurs", label: "🔍 Joueurs" },
            { id: "favoris", label: `★ Favoris (${favoris.length})` },
            { id: "feed", label: "🎬 Vidéos" },
            { id: "messages", label: `✉️ Messages${conversations.length > 0 ? ` (${conversations.length})` : ""}` },
            { id: "coach", label: "🎙️ Coach" },
            { id: "profil", label: "👤 Mon Profil" },
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
                <div key={s.label} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "32px", fontWeight: 800, color: "#f97316", margin: "0 0 4px" }}>{s.val}</p>
                  <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: "12px", color: colors.text.faint, margin: "2px 0 0" }}>{s.sub}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button onClick={() => navigate("/jogabonito")}
                style={{ background: colors.background.surface, border: "1px solid #f9731640", borderRadius: "12px", padding: "2rem", cursor: "pointer", textAlign: "center", color: colors.text.primary }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 8px" }}>🎬</p>
                <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>Jogabonito</p>
                <p style={{ fontSize: "13px", color: colors.text.faint, margin: 0 }}>Reels courts des joueurs</p>
              </button>
              <button onClick={() => navigate("/feed")}
                style={{ background: colors.background.surface, border: "1px solid #f9731640", borderRadius: "12px", padding: "2rem", cursor: "pointer", textAlign: "center", color: colors.text.primary }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 8px" }}>📋</p>
                <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>Feed Scout</p>
                <p style={{ fontSize: "13px", color: colors.text.faint, margin: 0 }}>Clips + stats des joueurs Pro</p>
              </button>
            </div>
          </div>
        )}

        {/* ── JOUEURS ── */}
        {activeTab === "joueurs" && (
          <>
            {/* Filtre poste — pills avec icônes */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" }}>
              {POSTE_PILLS.map(p => (
                <button key={p.val} onClick={() => { setPoste(p.val); setStyleDeJeu("Tous"); }}
                  style={{ padding: "7px 14px", borderRadius: "20px", border: poste === p.val ? "none" : `1px solid ${colors.border.strong}`, background: poste === p.val ? posteColor(p.val === "Tous" ? "" : p.val).text : "transparent", color: poste === p.val ? "#000" : colors.text.secondary, fontWeight: poste === p.val ? 700 : 400, cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            <div style={st.filterBar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: isMobile ? "1 1 100%" : "1 1 180px", minWidth: "160px" }}>
                <label style={st.filterLabel}>Recherche</label>
                <input type="text" placeholder="🔍 Nom, club, ville..." value={search} onChange={e => setSearch(e.target.value)} style={st.searchInput} />
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
                <select value={region} onChange={e => setRegion(e.target.value)} style={st.select}>
                  {regionsDisponibles.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {poste !== "Tous" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={st.filterLabel}>Style de jeu</label>
                  <select value={styleDeJeu} onChange={e => setStyleDeJeu(e.target.value)} style={st.select}>
                    {stylesDisponibles.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Ville</label>
                <input type="text" placeholder="Ex : Lyon, Paris..." value={ville} onChange={e => setVille(e.target.value)} style={{ ...st.searchInput, width: "140px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={st.filterLabel}>Trier par</label>
                <select value={tri} onChange={e => setTri(e.target.value)} style={st.select}>
                  <option value="recent">Plus récent</option>
                  <option value="buts">Buts ↓</option>
                  <option value="matchs">Matchs ↓</option>
                </select>
              </div>
            </div>

            {/* Barre résultats + toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <p style={{ fontSize: "13px", color: colors.text.faint, margin: 0 }}>{filtered.length} joueur{filtered.length !== 1 ? "s" : ""}</p>
                {(poste !== "Tous" || categorie !== "Toutes" || pied !== "Tous" || region !== "Toutes" || styleDeJeu !== "Tous" || ville || search) && (
                  <button onClick={() => { setPoste("Tous"); setCategorie("Toutes"); setPied("Tous"); setRegion("Toutes"); setStyleDeJeu("Tous"); setVille(""); setSearch(""); }}
                    style={{ background: "transparent", border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, padding: "3px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                    ✕ Réinitialiser
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {["grille", "liste"].map(m => (
                  <button key={m} onClick={() => setModeAffichage(m)}
                    style={{ background: modeAffichage === m ? "#f97316" : "transparent", border: `1px solid ${colors.border.strong}`, color: modeAffichage === m ? "#000" : colors.text.faint, padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
                    {m === "grille" ? "⊞" : "☰"}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>⚽</p><p>Aucun joueur ne correspond à vos filtres.</p></div>
            ) : modeAffichage === "grille" ? (
              <div style={st.grid}>
                {filtered.map(j => {
                  const pc = posteColor(j.poste);
                  return (
                  <div key={j.id}
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "16px", overflow: "hidden", position: "relative", transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#f9731640"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = colors.background.raised}>

                    {/* Bande colorée en haut selon le poste */}
                    <div style={{ height: "3px", background: pc.text, width: "100%" }} />

                    {/* Badge poste top-right */}
                    {j.poste && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "3px 10px", borderRadius: "8px", background: pc.text + "20", color: pc.text, fontSize: "11px", fontWeight: 700 }}>{j.poste}</div>}

                    {/* Badge vidéo top-left */}
                    {j.clip_url && <div style={{ position: "absolute", top: "12px", left: "12px", padding: "3px 8px", borderRadius: "8px", background: "#f9731620", color: "#f97316", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>📹 Vidéo</div>}

                    <div style={{ padding: "16px" }}>
                      {/* Avatar + nom */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", marginTop: (j.clip_url || j.poste) ? "8px" : "0" }}>
                        <Avatar person={j} size={44} bg="#f9731615" border="2px solid #f9731630" textColor="#f97316" />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <p style={{ fontWeight: 700, color: colors.text.primary, fontSize: "14px", margin: 0 }}>{j.prenom} {j.nom}</p>
                            {isNouveau(j) && <span style={{ background: "#f97316", color: "#000", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "20px" }}>NEW</span>}
                            {aEteContacte(j.id) && <span style={{ background: "#60a5fa20", color: "#60a5fa", fontSize: "10px", padding: "1px 6px", borderRadius: "20px", border: "1px solid #60a5fa40" }}>Contacté</span>}
                            {certifications[j.id] && <span style={{ background: "#f0c03020", color: "#f0c030", fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "20px", border: "1px solid #f0c03050" }}>⭐ Certifié {certifications[j.id].niveau}</span>}
                          </div>
                          <div style={{ color: colors.text.faint, fontSize: "12px" }}>{j.categorie || "—"}{j.region ? ` · ${j.region}` : ""}</div>
                        </div>
                      </div>

                      {/* Style de jeu */}
                      {j.style_de_jeu && (
                        <div style={{ marginBottom: "12px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "6px", background: "#f9731610", color: "#f97316", fontSize: "11px", fontWeight: 600 }}>⚡ {j.style_de_jeu}</span>
                        </div>
                      )}

                      {/* Stats en ligne */}
                      <div style={{ display: "flex", background: colors.background.base, borderRadius: "10px", marginBottom: "14px", overflow: "hidden" }}>
                        {[
                          { label: "Buts", value: j.buts_total || 0 },
                          { label: "Passes", value: j.passes_decisives || 0 },
                          { label: "Matchs", value: j.matchs_officiel || 0 },
                        ].map((s, i) => (
                          <div key={s.label} style={{ flex: 1, padding: "10px 4px", textAlign: "center", borderRight: i < 2 ? `1px solid ${colors.border.default}` : "none" }}>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: s.value > 0 ? "#f97316" : colors.border.strong }}>{s.value}</div>
                            <div style={{ fontSize: "10px", color: colors.text.faint, marginTop: "2px" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => ouvrirProfilJoueur(j)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#f97316", color: colors.text.primary, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                          Profil →
                        </button>
                        <button
                          onClick={() => { toggleFavori(j.id); showToast(isFavori(j.id) ? "Retiré des favoris" : `${j.prenom} ajouté aux favoris`); }}
                          style={{ width: 38, height: 38, borderRadius: "10px", border: `1px solid ${isFavori(j.id) ? "#f97316" : colors.border.default}`, background: isFavori(j.id) ? "#f9731620" : "transparent", color: isFavori(j.id) ? "#f97316" : colors.text.faint, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isFavori(j.id) ? "★" : "☆"}
                        </button>
                        <button onClick={() => setMessageModal(j)} style={{ width: 38, height: 38, borderRadius: "10px", border: `1px solid ${colors.border.default}`, background: "transparent", color: colors.text.faint, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          💬
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              /* Mode liste */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filtered.map(j => (
                  <div key={j.id} style={{ ...st.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <Avatar person={j} size={40} bg="#f9731615" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{j.prenom} {j.nom}</p>
                        {isNouveau(j) && <span style={{ background: "#f97316", color: "#000", fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "20px" }}>NEW</span>}
                        {aEteContacte(j.id) && <span style={{ background: "#60a5fa20", color: "#60a5fa", fontSize: "9px", padding: "1px 5px", borderRadius: "20px", border: "1px solid #60a5fa40" }}>✓</span>}
                      </div>
                      <p style={{ margin: "1px 0 0", fontSize: "11px", color: colors.text.faint }}>{j.poste || "—"} · {j.categorie || "—"} · {j.region || "—"}</p>
                    </div>
                    <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: colors.text.faint }}>
                      <span style={{ color: "#f97316", fontWeight: 700 }}>{j.buts_total || 0} <span style={{ color: colors.text.faint, fontWeight: 400 }}>buts</span></span>
                      <span style={{ color: "#f97316", fontWeight: 700 }}>{j.passes_decisives || 0} <span style={{ color: colors.text.faint, fontWeight: 400 }}>passes</span></span>
                      <span style={{ color: "#60a5fa", fontWeight: 700 }}>{j.matchs_officiel || 0} <span style={{ color: colors.text.faint, fontWeight: 400 }}>matchs</span></span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={{ ...st.btnPrimary, flex: "none", padding: "6px 14px" }} onClick={() => ouvrirProfilJoueur(j)}>Profil</button>
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
            {/* Filtres dossiers */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {["Tous", ...dossiers].map(d => (
                <button key={d} onClick={() => setDossierActif(d)}
                  style={{ padding: "6px 14px", borderRadius: "20px", border: dossierActif === d ? "none" : `1px solid ${colors.border.strong}`, background: dossierActif === d ? "#f97316" : "transparent", color: dossierActif === d ? "#000" : colors.text.secondary, fontWeight: dossierActif === d ? 600 : 400, cursor: "pointer", fontSize: "13px" }}>
                  {d} {d !== "Tous" ? `(${favoris.filter(f => f.dossier === d).length})` : `(${favoris.length})`}
                </button>
              ))}
            </div>

            {favoris.length === 0 ? (
              <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>☆</p><p>Aucun favori pour l'instant.<br /><span style={{ fontSize: "13px", color: colors.text.ghost }}>Cliquez sur ☆ depuis la liste des joueurs.</span></p></div>
            ) : (
              <div style={st.grid}>
                {joueurs.filter(j => isFavori(j.id) && (dossierActif === "Tous" || favoris.find(f => f.joueur_id === j.id)?.dossier === dossierActif)).map(j => {
                  const fav = favoris.find(f => f.joueur_id === j.id);
                  return (
                    <div key={j.id} style={{ ...st.card, border: "1px solid #f9731630" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <Avatar person={j} size={44} bg="#f9731615" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px" }}>{j.prenom} {j.nom}</p>
                          <p style={{ fontSize: "12px", color: colors.text.faint, margin: 0 }}>{j.poste}{j.categorie ? ` · ${j.categorie}` : ""}</p>
                        </div>
                        <span style={{ background: "#f9731620", color: "#f97316", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>{fav?.dossier || "Général"}</span>
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
                        <button style={st.btnPrimary} onClick={() => ouvrirProfilJoueur(j)}>Profil</button>
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
        {activeTab === "feed" && (() => {
          const avecVideo = joueurs.filter(j => j.clip_url);
          return (
            <div>
              <p style={{ fontSize: "13px", color: colors.text.faint, marginBottom: "1.5rem" }}>{avecVideo.length} vidéo{avecVideo.length !== 1 ? "s" : ""} disponible{avecVideo.length !== 1 ? "s" : ""}</p>
              {avecVideo.length === 0 ? (
                <div style={st.emptyState}><p style={{ fontSize: "2rem" }}>🎬</p><p>Aucune vidéo pour l'instant.</p></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {avecVideo.map(j => {
                    const thumb = getCloudinaryThumb(j.clip_url);
                    const isVeoUrl = j.clip_url.includes("veo.co");
                    const isYtUrl = j.clip_url.includes("youtube.com") || j.clip_url.includes("youtu.be");
                    return (
                      <div key={j.id} style={st.card}>
                        {/* Thumbnail */}
                        <div onClick={() => ouvrirProfilJoueur(j)} style={{ borderRadius: "8px", overflow: "hidden", marginBottom: "12px", cursor: "pointer", position: "relative", aspectRatio: "16/9", background: colors.background.raised, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {thumb ? (
                            <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} onError={e => { e.target.style.display = "none"; }} />
                          ) : isVeoUrl ? (
                            <div style={{ textAlign: "center" }}>
                              <p style={{ margin: "0 0 4px", fontSize: "1.8rem" }}>🎥</p>
                              <p style={{ margin: 0, fontSize: "11px", color: "#f97316", fontWeight: 700, letterSpacing: "1px" }}>VEO</p>
                            </div>
                          ) : isYtUrl ? (
                            <div style={{ textAlign: "center" }}>
                              <p style={{ margin: "0 0 4px", fontSize: "1.8rem" }}>▶️</p>
                              <p style={{ margin: 0, fontSize: "11px", color: "#ef4444", fontWeight: 700 }}>YouTube</p>
                            </div>
                          ) : (
                            <p style={{ fontSize: "2rem", margin: 0 }}>🎬</p>
                          )}
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>▶</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <Avatar person={j} size={36} bg="#f9731615" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{j.prenom} {j.nom}</p>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: colors.text.faint }}>{j.poste}{j.categorie ? ` · ${j.categorie}` : ""}</p>
                          </div>
                          <span style={st.posteBadge(j.poste)}>{j.poste}</span>
                        </div>
                        <div style={{ ...st.cardActions, marginTop: "10px" }}>
                          <button style={st.btnPrimary} onClick={() => ouvrirProfilJoueur(j)}>Profil & Vidéo</button>
                          <button style={isFavori(j.id) ? st.favoriBtnActive : st.btnSecondary} onClick={() => toggleFavori(j.id)}>{isFavori(j.id) ? "★" : "☆"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── MESSAGES ── */}
        {activeTab === "messages" && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px", minHeight: "500px" }}>
            {/* Sidebar conversations */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "1rem", borderBottom: `1px solid ${colors.border.default}` }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#f97316", fontSize: "14px" }}>💬 Conversations</p>
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: colors.text.faint, fontSize: "13px" }}>
                  <p>Aucun message.</p>
                  <p style={{ marginTop: "8px" }}>Contactez un joueur depuis son profil.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => ouvrirConversation(conv)}
                    style={{ padding: "12px 1rem", borderBottom: `1px solid ${colors.border.default}`, cursor: "pointer", background: convActive?.otherId === conv.otherId ? "#f9731610" : "transparent", borderLeft: convActive?.otherId === conv.otherId ? "2px solid #f97316" : "2px solid transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#f9731615", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
                        {(conv.other?.prenom || "?")[0]}{(conv.other?.nom || "?")[0]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.other?.prenom} {conv.other?.nom}</p>
                        <p style={{ margin: "1px 0 0", fontSize: "11px", color: conv.other?.plan === "coach" ? "#f97316" : "#f97316" }}>
                          {conv.other?.plan === "coach" ? "Coach" : conv.other?.plan === "joueur_pro" ? "Joueur PRO" : conv.other?.plan}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "12px", color: colors.text.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Zone de chat */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", display: "flex", flexDirection: "column" }}>
              {convActive ? (
                <>
                  <div style={{ padding: "1rem", borderBottom: `1px solid ${colors.border.default}`, display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f9731615", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 700, fontSize: "13px" }}>
                      {(convActive.other?.prenom || "?")[0]}{(convActive.other?.nom || "?")[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{convActive.other?.prenom} {convActive.other?.nom}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: convActive.other?.plan === "coach" ? "#f97316" : "#f97316" }}>
                        {convActive.other?.plan === "coach" ? "🎙️ Coach" : "⚽ Joueur PRO"}
                      </p>
                    </div>
                  </div>

                  <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", minHeight: "300px" }}>
                    {convMessages.length === 0 ? (
                      <div style={{ margin: "auto", textAlign: "center", color: colors.text.faint }}>
                        <p>Début de la conversation</p>
                      </div>
                    ) : (
                      convMessages.map((m, i) => (
                        <div key={i} style={st.msgBubble(m.sender_id === userId)}>
                          <p style={{ margin: 0 }}>{m.content}</p>
                          <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.6 }}>
                            {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: "1rem", borderTop: `1px solid ${colors.border.default}`, display: "flex", gap: "8px" }}>
                    <input
                      style={{ flex: 1, background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: "8px", color: colors.text.primary, padding: "10px 12px", fontSize: "14px", outline: "none" }}
                      placeholder="Écrire un message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && envoyerMessage()}
                    />
                    <button onClick={envoyerMessage} style={{ background: "#f97316", color: "#000", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.text.faint, flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "2rem" }}>💬</p>
                  <p>Sélectionnez une conversation</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONTACTER LE COACH ── */}
        {activeTab === "coach" && (
          <CoachContact coaches={coaches} userId={userId} contacterCoach={contacterCoach} chargerConversations={chargerConversations} setActiveTab={setActiveTab} ouvrirConversation={ouvrirConversation} conversations={conversations} st={st} />
        )}

        {activeTab === "profil" && (
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "6px" }}>Mon Profil</h2>
            <p style={{ fontSize: "13px", color: colors.text.faint, marginBottom: "2rem" }}>Ces informations sont visibles par les joueurs Pro qui reçoivent vos messages.</p>

            {/* Avatar */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "16px", padding: "24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {profilLocal?.avatar_url
                  ? <img src={profilLocal.avatar_url} alt="" style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f9731640" }} />
                  : <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#f9731615", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", fontWeight: 800, color: "#f97316" }}>
                      {(profilEdit.prenom || "?")[0]}{(profilEdit.nom || "?")[0]}
                    </div>
                }
                <label style={{ position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", background: "#f97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: avatarUploading ? "wait" : "pointer", border: `2px solid ${colors.background.base}`, fontSize: "11px" }}>
                  {avatarUploading ? "…" : "✎"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>{profilEdit.prenom} {profilEdit.nom}</p>
                <p style={{ fontSize: "13px", color: "#f97316", margin: 0 }}>{profilEdit.type_recruteur || "Recruteur"} · {profilEdit.club || profilEdit.region || "—"}</p>
              </div>
            </div>

            {/* Formulaire */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Prénom</label>
                  <input value={profilEdit.prenom} onChange={e => setProfilEdit(p => ({ ...p, prenom: e.target.value }))} style={st.searchInput} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Nom</label>
                  <input value={profilEdit.nom} onChange={e => setProfilEdit(p => ({ ...p, nom: e.target.value }))} style={st.searchInput} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Type de profil</label>
                <select value={profilEdit.type_recruteur} onChange={e => setProfilEdit(p => ({ ...p, type_recruteur: e.target.value }))} style={st.select}>
                  <option value="">— Choisir —</option>
                  {["Club professionnel", "Club amateur", "Agent FIFA", "Scout indépendant", "Détecteur", "Centre de formation"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Club / Agence</label>
                  <input value={profilEdit.club} onChange={e => setProfilEdit(p => ({ ...p, club: e.target.value }))} placeholder="Ex : AS Monaco, SL Benfica..." style={st.searchInput} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Région</label>
                  <input value={profilEdit.region} onChange={e => setProfilEdit(p => ({ ...p, region: e.target.value }))} placeholder="Ex : Île-de-France..." style={st.searchInput} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Présentation</label>
                <textarea value={profilEdit.description} onChange={e => setProfilEdit(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Qui êtes-vous ? Depuis combien de temps dans le recrutement..." style={{ ...st.searchInput, resize: "vertical", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }} />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Ce que je recherche</label>
                <textarea value={profilEdit.recherche_profil} onChange={e => setProfilEdit(p => ({ ...p, recherche_profil: e.target.value }))} rows={3} placeholder="Ex : Milieu U20 évoluant en Régional 1, capable de jouer en profondeur..." style={{ ...st.searchInput, resize: "vertical", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }} />
              </div>

              <button onClick={handleSaveProfil} disabled={savingProfil}
                style={{ background: savingProfil ? colors.border.strong : "#f97316", color: savingProfil ? colors.text.faint : "#000", border: "none", padding: "12px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: savingProfil ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                {savingProfil ? "Enregistrement..." : "✓ Sauvegarder"}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Modal message joueur */}
      {messageModal && (
        <div style={st.overlay} onClick={() => setMessageModal(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <button style={{ ...st.btnSecondary, float: "right" }} onClick={() => setMessageModal(null)}>✕</button>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem" }}>Contacter {messageModal.prenom} {messageModal.nom}</h2>
            <p style={{ fontSize: "13px", color: colors.text.faint, margin: "0 0 1.5rem" }}>{messageModal.poste} · {messageModal.categorie}</p>
            {messageSent ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#f97316" }}><p style={{ fontSize: "2rem" }}>✓</p><p>Message envoyé !</p></div>
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
function CoachContact({ coaches, userId, contacterCoach, chargerConversations, setActiveTab, ouvrirConversation, conversations, st }) {
  const colors = useColors();
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !selectedCoach) return;
    setSending(true);
    await contacterCoach(selectedCoach, message);
    await chargerConversations(userId);
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
      <div style={{ background: colors.background.surface, border: `1px dashed ${colors.border.strong}`, borderRadius: "12px", padding: "3rem", textAlign: "center", color: colors.text.faint }}>
        <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>🎙️</p>
        <p style={{ fontSize: "1.1rem", color: colors.text.faint }}>Aucun coach disponible pour l'instant.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700 }}>🎙️ Contacter notre coach expert</h2>
        <p style={{ margin: 0, fontSize: "13px", color: colors.text.faint }}>Posez vos questions sur un joueur ou demandez une collaboration.</p>
      </div>

      {/* Sélection coach */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
        {coaches.map(coach => (
          <div key={coach.id}
            onClick={() => setSelectedCoach(coach)}
            style={{ background: colors.background.surface, border: `1px solid ${selectedCoach?.id === coach.id ? "#f97316" : colors.border.default}`, borderRadius: "12px", padding: "1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#f9731615", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
              {(coach.prenom || "C")[0]}{(coach.nom || "")[0]}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{coach.prenom} {coach.nom}</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#f97316" }}>🎙️ Coach Expert</p>
              {coach.club && <p style={{ margin: "2px 0 0", fontSize: "12px", color: colors.text.faint }}>{coach.club}</p>}
            </div>
            {selectedCoach?.id === coach.id && <span style={{ marginLeft: "auto", color: "#f97316", fontSize: "18px" }}>✓</span>}
          </div>
        ))}
      </div>

      {/* Message */}
      {selectedCoach && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: "12px", padding: "1.5rem" }}>
          <label style={{ fontSize: "11px", color: colors.text.faint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
            Votre message à {selectedCoach.prenom}
          </label>
          {sent ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#f97316" }}>
              <p style={{ fontSize: "2rem" }}>✓</p>
              <p>Message envoyé ! Redirection vers vos messages...</p>
            </div>
          ) : (
            <>
              <textarea
                style={{ width: "100%", background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: "8px", color: colors.text.primary, padding: "12px", fontSize: "14px", resize: "vertical", minHeight: "140px", boxSizing: "border-box", fontFamily: "inherit" }}
                placeholder={`Bonjour ${selectedCoach.prenom}, je souhaitais vous contacter au sujet de...`}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                style={{ marginTop: "12px", width: "100%", background: "#f97316", color: "#000", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: (sending || !message.trim()) ? 0.6 : 1 }}>
                {sending ? "Envoi en cours..." : `Envoyer à ${selectedCoach.prenom} ✉️`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
