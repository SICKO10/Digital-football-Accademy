-- Crée automatiquement la ligne "profiles" dès la création du compte auth,
-- indépendamment de toute session côté client.
--
-- Diagnostic (vérifié directement contre la base, pas une supposition) :
-- le 406 sur `profiles` pour les recruteurs non payés N'EST PAS un problème
-- de RLS — la lecture de `profiles` est déjà largement ouverte (testé avec
-- la seule clé anon, sans session, lecture d'un profil arbitraire réussie).
-- Le 406 vient de PostgREST quand une requête .single() ne trouve AUCUNE
-- ligne (reproduit exactement : erreur PGRST116 "Cannot coerce the result
-- to a single JSON object" → HTTP 406). Autrement dit : à cet instant,
-- aucune ligne profiles n'existe pour ce compte.
--
-- Cause probable : Register.jsx et RegisterRecruteur.jsx appellent
-- supabase.from('profiles').insert({...}) juste après auth.signUp(), sans
-- vérifier l'erreur retournée. Si la confirmation par email est activée sur
-- le projet, signUp() ne fournit aucune session active tant que l'email
-- n'est pas confirmé : l'insert suivant s'exécute donc sans authentification
-- (auth.uid() = null), la policy INSERT (auth.uid() = id) le rejette, et
-- l'échec passe inaperçu car jamais vérifié côté code. Résultat : aucune
-- ligne n'est jamais créée pour ces comptes.
--
-- Le trigger ci-dessous contourne complètement ce problème : il tourne en
-- SECURITY DEFINER (donc sans dépendre de la session/RLS du client) et crée
-- la ligne au moment même de l'insertion dans auth.users, quel que soit
-- l'état de confirmation email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, prenom, nom, plan, club, analyses_restantes, abonnement_actif)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'nom',
    COALESCE(NEW.raw_user_meta_data->>'plan', 'joueur_starter'),
    NEW.raw_user_meta_data->>'club',
    0,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
