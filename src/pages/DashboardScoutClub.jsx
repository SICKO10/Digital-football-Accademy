import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import ScoutCenter from "../components/ScoutCenter";

export default function DashboardScoutClub() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || profile.plan !== "club") { navigate("/"); return; }
      setUserId(user.id);
      setProfil(profile);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#4ade80" }}>Chargement...</p></div>;

  return <ScoutCenter userId={userId} profil={profil} embedded={false} />;
}
