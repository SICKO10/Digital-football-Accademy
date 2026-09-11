-- CRM sponsoring — Phase 3 (partie 2) : portail partenaire par lien privé,
-- sans compte. Chaque sponsor a un token unique dans son URL (comme un lien
-- de partage classique) ; la sécurité repose sur le fait que le token n'est
-- pas devinable (uuid v4), pas sur une authentification.
--
-- Plutôt qu'ouvrir sponsors en lecture publique (exposerait TOUTES les
-- fiches sponsors de TOUS les clubs à qui a une session, même sans le bon
-- token), deux fonctions SECURITY DEFINER scopent l'accès à la seule ligne
-- correspondant au token fourni.
alter table sponsors
  add column if not exists acces_token uuid not null default gen_random_uuid(),
  add column if not exists demande_renouvellement boolean not null default false,
  add column if not exists documents jsonb not null default '[]'::jsonb;

create unique index if not exists idx_sponsors_acces_token on sponsors(acces_token);

create or replace function get_sponsor_by_token(p_token uuid)
returns setof sponsors
language sql
security definer
set search_path = public
as $$
  select * from sponsors where acces_token = p_token;
$$;

create or replace function demander_renouvellement_sponsor(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update sponsors set demande_renouvellement = true where acces_token = p_token;
$$;

revoke all on function get_sponsor_by_token(uuid) from public;
revoke all on function demander_renouvellement_sponsor(uuid) from public;
grant execute on function get_sponsor_by_token(uuid) to anon, authenticated;
grant execute on function demander_renouvellement_sponsor(uuid) to anon, authenticated;
