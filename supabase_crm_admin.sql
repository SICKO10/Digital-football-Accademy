-- CRM commercial de l'administration (onglet "CRM" du dashboard /coach).
-- Réservé aux 2 comptes admin : toutes les règles passent par est_admin_coach()
-- (déjà en base, table admins_coach). Personne d'autre ne peut lire ni écrire.
--
-- 3 tables :
--   crm_admin_fiches   : une fiche par prospect ou client (club, joueur, éducateur),
--                  rattachable à un compte existant (profile_id).
--   crm_admin_echanges : journal des échanges (appel, email, rdv, message, note).
--   crm_admin_tests    : phase test. Remplie AUTOMATIQUEMENT à chaque essai ou offre
--                  d'outil (table outils_comptes) et fermée automatiquement
--                  quand le compte passe en achat. Saisie manuelle possible pour
--                  les essais hors outils (ex. un mois Pro offert à un joueur).
--
-- Prudence paiements : le déclencheur sur outils_comptes ne peut JAMAIS bloquer
-- une écriture de cette table (bloc "exception" : en cas de souci, il ne fait
-- rien et laisse passer l'achat ou l'offre).
begin;

create table if not exists public.crm_admin_fiches (
  id uuid primary key default gen_random_uuid(),
  categorie text not null check (categorie in ('club', 'joueur', 'educateur')),
  nom text not null check (length(btrim(nom)) > 0),
  structure text,
  contact_nom text,
  email text,
  telephone text,
  ville text,
  source text,
  statut text not null default 'nouveau'
    check (statut in ('nouveau', 'contacte', 'echange', 'test', 'converti', 'perdu')),
  offre_visee text,
  prochaine_action text,
  date_relance date,
  motif_perte text,
  responsable text,
  profile_id uuid references public.profiles(id) on delete set null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create table if not exists public.crm_admin_echanges (
  id uuid primary key default gen_random_uuid(),
  fiche_id uuid not null references public.crm_admin_fiches(id) on delete cascade,
  auteur_nom text,
  type text not null default 'note' check (type in ('appel', 'email', 'rdv', 'message', 'note')),
  contenu text not null check (length(btrim(contenu)) > 0),
  cree_le timestamptz not null default now()
);

create table if not exists public.crm_admin_tests (
  id uuid primary key default gen_random_uuid(),
  fiche_id uuid references public.crm_admin_fiches(id) on delete set null,
  compte_id uuid references public.profiles(id) on delete set null,
  categorie text check (categorie in ('club', 'joueur', 'educateur')),
  outil text,
  origine text not null default 'manuel' check (origine in ('essai', 'offre', 'manuel')),
  debut_le timestamptz not null default now(),
  fin_le timestamptz,
  duree_jours integer check (duree_jours is null or duree_jours > 0),
  converti_le timestamptz,
  note text,
  cree_le timestamptz not null default now()
);

create index if not exists crm_admin_fiches_statut_idx on public.crm_admin_fiches (statut);
create index if not exists crm_admin_fiches_profile_idx on public.crm_admin_fiches (profile_id) where profile_id is not null;
create index if not exists crm_admin_echanges_fiche_idx on public.crm_admin_echanges (fiche_id, cree_le desc);
create index if not exists crm_admin_tests_fiche_idx on public.crm_admin_tests (fiche_id);
create index if not exists crm_admin_tests_compte_outil_idx on public.crm_admin_tests (compte_id, outil);

-- maj_le suit chaque modification de fiche
create or replace function public.crm_admin_touch_fiche()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.maj_le := now();
  return new;
end
$$;

drop trigger if exists crm_admin_fiches_touch on public.crm_admin_fiches;
create trigger crm_admin_fiches_touch before update on public.crm_admin_fiches
  for each row execute function public.crm_admin_touch_fiche();

-- ── Remplissage automatique de la phase test ────────────────────────────────

create or replace function public.crm_admin_suivre_outils()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    -- Nouvel essai ou nouvelle offre (ou prolongation / changement d'origine)
    if new.source in ('essai', 'offre')
       and (tg_op = 'INSERT' or old.source is distinct from new.source or old.fin_le is distinct from new.fin_le) then
      insert into public.crm_admin_tests (fiche_id, compte_id, categorie, outil, origine, debut_le, fin_le, duree_jours)
      select
        (select f.id from public.crm_admin_fiches f where f.profile_id = new.compte_id order by f.cree_le limit 1),
        new.compte_id,
        case when p.plan = 'club' then 'club' when p.plan = 'educateur' then 'educateur' else null end,
        new.outil,
        new.source,
        now(),
        new.fin_le,
        greatest(1, ceil(extract(epoch from (new.fin_le - now())) / 86400.0)::integer)
      from public.profiles p
      where p.id = new.compte_id;

      update public.crm_admin_fiches f
         set statut = 'test'
       where f.profile_id = new.compte_id and f.statut in ('nouveau', 'contacte', 'echange');
    end if;

    -- Passage en achat : les essais ouverts de cet outil sont convertis
    if new.source = 'achat' and (tg_op = 'INSERT' or old.source is distinct from 'achat') then
      update public.crm_admin_tests
         set converti_le = now()
       where compte_id = new.compte_id and outil = new.outil and converti_le is null;

      update public.crm_admin_fiches f
         set statut = 'converti'
       where f.profile_id = new.compte_id and f.statut not in ('converti');
    end if;
  exception when others then
    -- Ne jamais bloquer un achat ou une offre à cause du suivi commercial.
    null;
  end;
  return new;
end
$$;

drop trigger if exists crm_admin_suivre_outils on public.outils_comptes;
create trigger crm_admin_suivre_outils
  after insert or update on public.outils_comptes
  for each row execute function public.crm_admin_suivre_outils();

-- Essais et offres déjà en cours au moment de l'installation
insert into public.crm_admin_tests (fiche_id, compte_id, categorie, outil, origine, debut_le, fin_le, duree_jours)
select null, oc.compte_id,
       case when p.plan = 'club' then 'club' when p.plan = 'educateur' then 'educateur' else null end,
       oc.outil, oc.source, oc.cree_le, oc.fin_le,
       greatest(1, ceil(extract(epoch from (oc.fin_le - oc.cree_le)) / 86400.0)::integer)
from public.outils_comptes oc
join public.profiles p on p.id = oc.compte_id
where oc.source in ('essai', 'offre')
  and not exists (select 1 from public.crm_admin_tests t where t.compte_id = oc.compte_id and t.outil = oc.outil);

-- ── Accès : administrateurs seulement ───────────────────────────────────────

alter table public.crm_admin_fiches enable row level security;
alter table public.crm_admin_echanges enable row level security;
alter table public.crm_admin_tests enable row level security;

revoke all on public.crm_admin_fiches, public.crm_admin_echanges, public.crm_admin_tests from anon, authenticated;
grant select, insert, update, delete on public.crm_admin_fiches, public.crm_admin_echanges, public.crm_admin_tests to authenticated;

drop policy if exists "crm_admin_fiches_admin" on public.crm_admin_fiches;
create policy "crm_admin_fiches_admin" on public.crm_admin_fiches
  for all to authenticated
  using (public.est_admin_coach()) with check (public.est_admin_coach());

drop policy if exists "crm_admin_echanges_admin" on public.crm_admin_echanges;
create policy "crm_admin_echanges_admin" on public.crm_admin_echanges
  for all to authenticated
  using (public.est_admin_coach()) with check (public.est_admin_coach());

drop policy if exists "crm_admin_tests_admin" on public.crm_admin_tests;
create policy "crm_admin_tests_admin" on public.crm_admin_tests
  for all to authenticated
  using (public.est_admin_coach()) with check (public.est_admin_coach());

commit;
