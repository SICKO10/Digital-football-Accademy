-- Chantier outils offerts par le club, bloc 2 (PLAN-outils-offerts.md) : la
-- limite à l'affiliation. Un club du nouveau modèle ne peut pas accepter plus
-- d'éducateurs que son forfait n'a de places (profiles.quota_equipes).
--
-- Le garde-fou est en base pour couvrir tous les chemins qui passent une
-- affiliation à « accepte » : le bouton Accepter du club, l'invitation par
-- email (fonction accepter-invitation) et l'invitation d'un compte déjà
-- existant (fonction envoyer-invitation).
--
-- Règles retenues :
--   - Concerne seulement les clubs `modele_outils` avec un `quota_equipes`
--     renseigné. Ancien modèle, ou forfait sans quota : rien ne change (la
--     limite manuelle `educateurs_inclus` de l'ancien écran reste côté écran).
--   - On compte les éducateurs distincts déjà acceptés dans le club, pas les
--     équipes. Accepter le (N+1)e est refusé.
--   - Seul le passage à « accepte » est contrôlé. Les affiliations déjà
--     acceptées ne sont jamais touchées, même si le club est au-dessus de sa
--     limite (forfait réduit) ; modifier leurs droits reste possible.
--   - Un éducateur déjà accepté dans ce club (ré-invitation, upsert) passe
--     toujours : il est déjà compté.
--   - Deux acceptations simultanées ne peuvent pas dépasser la limite : le
--     profil du club est verrouillé le temps du contrôle.
--
-- Deux objets :
--   - limite_educateurs_atteinte(club, educateur) : renvoie le nombre de places
--     du forfait si accepter cet éducateur dépasserait la limite, sinon null.
--     Réservée au serveur (clé service) : les fonctions d'invitation s'en
--     servent AVANT de créer un compte, pour ne pas laisser un compte à moitié
--     créé quand le club est plein.
--   - le garde-fou (déclencheur) sur club_educateurs, qui applique la même règle.
--
-- Erreur levée (code DF001) : « LIMITE_EDUCATEURS:N », N = places du forfait.
-- L'appli la transforme en message clair.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_limite_educateurs_verification.sql.

begin;

-- Volatile à dessein (pas de `stable`) : chaque requête de la fonction prend
-- une photo fraîche de la base, indispensable après l'attente du verrou.
create or replace function public.limite_educateurs_atteinte(p_club uuid, p_educateur uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select c.quota_equipes
  from public.profiles c
  where c.id = p_club and c.modele_outils is true and c.quota_equipes is not null
    -- déjà accepté dans ce club : déjà compté
    and not exists (
      select 1 from public.club_educateurs ce
      where ce.club_id = p_club and ce.educateur_id = p_educateur and ce.statut = 'accepte'
    )
    and (
      select count(distinct ce.educateur_id) from public.club_educateurs ce
      where ce.club_id = p_club and ce.statut = 'accepte'
        and ce.educateur_id is not null and ce.educateur_id is distinct from p_educateur
    ) >= c.quota_equipes
$$;

revoke execute on function public.limite_educateurs_atteinte(uuid, uuid) from public, anon, authenticated;
grant execute on function public.limite_educateurs_atteinte(uuid, uuid) to service_role;

create or replace function public.limiter_educateurs_du_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quota int;
begin
  if new.statut is distinct from 'accepte' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'accepte' then
    return new;
  end if;

  -- Le verrou évite que deux acceptations simultanées dépassent la limite.
  perform 1 from public.profiles p where p.id = new.club_id for update;

  v_quota := public.limite_educateurs_atteinte(new.club_id, new.educateur_id);
  if v_quota is not null then
    raise exception 'LIMITE_EDUCATEURS:%', v_quota using errcode = 'DF001';
  end if;
  return new;
end
$$;

drop trigger if exists limiter_educateurs_du_club on public.club_educateurs;
create trigger limiter_educateurs_du_club
  before insert or update of statut on public.club_educateurs
  for each row execute function public.limiter_educateurs_du_club();

commit;
