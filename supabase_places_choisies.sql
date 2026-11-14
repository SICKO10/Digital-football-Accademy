-- Chantier « places choisies », bloc 1 (PLAN-outils-offerts-suite.md) : le club
-- choisit quels éducateurs ont une place dans son forfait.
--
-- Contenu :
--   1. Table club_places_choisies (club, éducateur, état). « choisi » = place
--      garantie, « retire » = jamais de place, même s'il en reste. Pas de
--      ligne = automatique (règle d'avant). Écriture par api/outils.js
--      seulement (clé service) ; le club et son staff lisent, l'éducateur lit
--      sa propre ligne.
--   2. rangs_places_club(club) : le seul calcul des rangs. Places garanties
--      d'abord, puis automatiques, chacune par ancienneté d'affiliation ;
--      places retirées absentes. Un club sans aucune ligne garde exactement
--      l'ordre d'avant (ancienneté, puis identifiant).
--   3. educateur_a_place : utilise ce rang. outils_actifs, a_outil et
--      outil_ferme l'appellent et suivent sans être réécrits.
--   4. prevenir_fin_outils_club : même rang, le reste recopié à l'identique de
--      supabase_outils_offerts_educateur.sql. Le déclencheur n'est pas touché.
--
-- Règles retenues :
--   - Plus de places garanties que de places au forfait (forfait réduit) : les
--     plus anciennes passent, les autres attendent comme les automatiques.
--   - Une ligne dont l'éducateur n'est plus affilié est sans effet (le rang ne
--     lit que les affiliations acceptées) et disparaît avec le compte.
--   - La limite d'affiliation (supabase_limite_educateurs.sql) n'est pas
--     modifiée : un éducateur dont la place est retirée reste compté.
--   - Clubs de l'ancien modèle : rien ne change (club_offre_outils les exclut
--     déjà en amont).
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_places_choisies_verification.sql.

begin;

-- ── 1. Places choisies par le club ──────────────────────────────────────────

create table if not exists public.club_places_choisies (
  club_id uuid not null references public.profiles(id) on delete cascade,
  educateur_id uuid not null references public.profiles(id) on delete cascade,
  etat text not null check (etat in ('choisi', 'retire')),
  change_le timestamptz not null default now(),
  auteur_id uuid references public.profiles(id) on delete set null,
  primary key (club_id, educateur_id)
);

create index if not exists club_places_choisies_educateur_idx
  on public.club_places_choisies (educateur_id);

alter table public.club_places_choisies enable row level security;

revoke all on public.club_places_choisies from anon, authenticated;
grant select on public.club_places_choisies to authenticated;
grant all on public.club_places_choisies to service_role;

drop policy if exists "club_places_choisies_lecture" on public.club_places_choisies;
create policy "club_places_choisies_lecture" on public.club_places_choisies
  for select to authenticated
  using (public.outils_gere_club(club_id) or educateur_id = auth.uid());

-- ── 2. Rang de chaque éducateur dans les places du club ─────────────────────

-- Rang 1 = premier servi. Les éducateurs dont la place est retirée n'ont pas
-- de rang. Réservée aux fonctions de la base et au serveur (clé service) :
-- la liste des éducateurs d'un club n'est pas exposée au navigateur.
create or replace function public.rangs_places_club(p_club uuid)
returns table (educateur_id uuid, rang bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select a.educateur_id,
    row_number() over (
      order by (pc.etat = 'choisi') is true desc, a.depuis, a.educateur_id
    ) as rang
  from (
    select ce.educateur_id, min(ce.created_at) as depuis
    from public.club_educateurs ce
    where ce.club_id = p_club and ce.statut = 'accepte' and ce.educateur_id is not null
    group by ce.educateur_id
  ) a
  left join public.club_places_choisies pc
    on pc.club_id = p_club and pc.educateur_id = a.educateur_id
  where pc.etat is distinct from 'retire'
$$;

revoke all on function public.rangs_places_club(uuid) from public, anon, authenticated;
grant execute on function public.rangs_places_club(uuid) to service_role;

-- ── 3. L'éducateur a-t-il une place dans ce club ? ──────────────────────────

create or replace function public.educateur_a_place(p_club uuid, p_educateur uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rangs_places_club(p_club) r
    join public.profiles c on c.id = p_club
    where r.educateur_id = p_educateur and r.rang <= coalesce(c.quota_equipes, 0)
  )
$$;

-- ── 4. Prévenir l'éducateur qui perd ses outils ─────────────────────────────

create or replace function public.prevenir_fin_outils_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offrait boolean;
  v_offre boolean;
  v_offerts boolean;
  v_individuels boolean;
  v_perd_via boolean;
  v_date text;
begin
  begin
    -- Même règle que club_offre_outils, avant et après le changement.
    v_offrait := (old.plan = 'club' and old.modele_outils is true and old.abonnement_actif is true
      and old.palier is not null) is true;
    v_offre := (new.plan = 'club' and new.modele_outils is true and new.abonnement_actif is true
      and new.palier is not null) is true;
    -- Outils fournis sans être détenus : à tous les éducateurs, ou à certains.
    v_offerts := exists (
      select 1 from public.outils_club_ouverts o
      where o.club_id = new.id and public.outil_offert_par_club(o.outil)
    );
    v_individuels := exists (
      select 1 from public.outils_educateur_fournis e
      where e.club_id = new.id and public.outil_offert_par_club(e.outil)
    );
    -- Stages, Projet sportif, CFF4 : reçus parce que le club les détient,
    -- perdus quand son abonnement s'arrête (règle `viaClub` de outils_actifs).
    v_perd_via := old.abonnement_actif is true and new.abonnement_actif is not true and exists (
      select 1 from public.outils_club_ouverts o
      join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
        and (oc.fin_le is null or oc.fin_le > now())
      where o.club_id = new.id and not public.outil_offert_par_club(o.outil)
    );
    if not (v_offrait and (v_offerts or v_individuels)) and not v_perd_via then
      return null;
    end if;
    v_date := to_char(now() at time zone 'Europe/Paris', 'DD/MM');

    insert into public.notifications (user_id, type, titre, contenu, lien, lu)
    select r.educateur_id, 'outils_club_fin', 'Ton club ne fournit plus tes outils',
      case when v_offre and not v_perd_via then
        format('Ton club a changé de forfait : il n''a plus de place pour toi depuis le %s. '
          'Tu gardes le socle gratuit et tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      else
        format('Ton club ne fournit plus tes outils depuis le %s. Tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      end,
      '/educateur', false
    -- Rang de chaque éducateur accepté, places retirées exclues (même calcul
    -- que educateur_a_place).
    from public.rangs_places_club(new.id) r
    join public.profiles e on e.id = r.educateur_id and e.modele_outils is true
    where (
        v_perd_via
        or (v_offrait and r.rang <= coalesce(old.quota_equipes, 0)
            and not (v_offre and r.rang <= coalesce(new.quota_equipes, 0))
            -- Il recevait quelque chose : l'outil fourni à tous, ou un outil fourni à lui seul.
            and (v_offerts or exists (
              select 1 from public.outils_educateur_fournis f
              where f.club_id = new.id and f.educateur_id = r.educateur_id
                and public.outil_offert_par_club(f.outil)
            )))
      )
      -- Pas de doublon si plusieurs changements arrivent coup sur coup.
      and not exists (
        select 1 from public.notifications n
        where n.user_id = r.educateur_id and n.type = 'outils_club_fin' and n.lu is not true
          and n.created_at > now() - interval '1 hour'
      );
  exception when others then
    raise warning 'prevenir_fin_outils_club (club %) : %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.prevenir_fin_outils_club() from public, anon, authenticated;

commit;
