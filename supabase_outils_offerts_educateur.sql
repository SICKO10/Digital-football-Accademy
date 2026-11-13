-- Chantier outils offerts par le club, bloc 8 (PLAN-outils-offerts.md) : un outil
-- fourni à UN éducateur précis, sans le fournir aux autres.
--
-- Contenu :
--   1. Table outils_educateur_fournis (club, éducateur, outil). Voisine de
--      outils_club_ouverts, qu'elle ne modifie pas : une ligne de
--      outils_club_ouverts reste « fourni à tous les éducateurs qui ont une
--      place », une ligne de cette table est « fourni à cet éducateur ».
--      Écriture par api/outils.js seulement (clé service) ; le club et son
--      staff lisent, l'éducateur lit ses propres lignes.
--   2. outils_actifs et a_outil : la source « club » prend aussi ces lignes.
--      Mêmes conditions que la fourniture à tous : un des 7 outils éducateur
--      (outil_offert_par_club), club au nouveau modèle avec forfait actif
--      (club_offre_outils), éducateur affilié accepté qui a une place
--      (educateur_a_place). Les autres sources (outils du compte, `viaClub`)
--      sont recopiées à l'identique.
--   3. prevenir_fin_outils_club (bloc 6) : tient compte des outils fournis à un
--      seul éducateur (le club qui ne fournit que cela doit aussi prévenir ceux
--      qui les perdent). Même déclencheur, recréé à l'identique.
--
-- Règles retenues :
--   - Un éducateur sans place ne reçoit rien, même avec une ligne ici : la
--     limite du forfait passe avant. La ligne reste, elle redevient active si
--     une place se libère.
--   - Une ligne dont l'éducateur n'est plus affilié est sans effet (la
--     jointure exige l'affiliation acceptée) et disparaît avec le compte.
--   - Stages, Projet sportif et CFF4 ne sont pas concernés (ils suivent les
--     outils que le club détient).
--   - outil_ferme (verrou) n'est pas modifié : il appelle a_outil et suit seul.
--   - Le fichier du bloc 6 (supabase_fin_outils_club.sql) n'a pas besoin d'avoir
--     été lancé avant : celui-ci (re)crée la fonction et le déclencheur.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_outils_offerts_educateur_verification.sql.

begin;

-- ── 1. Outils fournis à un éducateur précis ─────────────────────────────────

create table if not exists public.outils_educateur_fournis (
  club_id uuid not null references public.profiles(id) on delete cascade,
  educateur_id uuid not null references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  ouvert_le timestamptz not null default now(),
  primary key (club_id, educateur_id, outil)
);

create index if not exists outils_educateur_fournis_educateur_idx
  on public.outils_educateur_fournis (educateur_id);

alter table public.outils_educateur_fournis enable row level security;

revoke all on public.outils_educateur_fournis from anon, authenticated;
grant select on public.outils_educateur_fournis to authenticated;
grant all on public.outils_educateur_fournis to service_role;

drop policy if exists "outils_educateur_fournis_lecture" on public.outils_educateur_fournis;
create policy "outils_educateur_fournis_lecture" on public.outils_educateur_fournis
  for select to authenticated
  using (public.outils_gere_club(club_id) or educateur_id = auth.uid());

-- ── 2. Outils actifs et accès à un outil ────────────────────────────────────

create or replace function public.outils_actifs(p_compte uuid)
returns table (outil text, source text, fin_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select oc.outil, oc.source, oc.fin_le
  from public.outils_comptes oc
  where oc.compte_id = p_compte
    and (oc.fin_le is null or oc.fin_le > now())
    and (auth.uid() is null or auth.uid() = p_compte or public.outils_gere_club(p_compte))
  union all
  select o.outil, 'club',
    case when bool_or(club_oc.fin_le is null) then null else max(club_oc.fin_le) end
  from public.club_educateurs ce
  join public.profiles club on club.id = ce.club_id and club.abonnement_actif is true
  join public.outils_club_ouverts o on o.club_id = ce.club_id
  join public.outils_comptes club_oc on club_oc.compte_id = ce.club_id and club_oc.outil = o.outil
    and (club_oc.fin_le is null or club_oc.fin_le > now())
  where ce.educateur_id = p_compte and ce.statut = 'accepte'
    and (auth.uid() is null or auth.uid() = p_compte)
  group by o.outil
  union all
  -- Fourni par le club : à tous (outils_club_ouverts) ou à cet éducateur
  -- (outils_educateur_fournis), dans la limite des places.
  select f.outil, 'club', null::timestamptz
  from (
    select o.club_id, o.outil from public.outils_club_ouverts o
    union
    select e.club_id, e.outil from public.outils_educateur_fournis e where e.educateur_id = p_compte
  ) f
  join public.club_educateurs ce on ce.club_id = f.club_id
  where ce.educateur_id = p_compte and ce.statut = 'accepte'
    and public.outil_offert_par_club(f.outil)
    and public.club_offre_outils(ce.club_id)
    and public.educateur_a_place(ce.club_id, p_compte)
    and (auth.uid() is null or auth.uid() = p_compte)
  group by f.outil
$$;

create or replace function public.a_outil(p_compte uuid, p_outil text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.outils_comptes oc
    where oc.compte_id = p_compte and oc.outil = p_outil
      and (oc.fin_le is null or oc.fin_le > now())
  ) or exists (
    select 1
    from public.club_educateurs ce
    join public.profiles club on club.id = ce.club_id and club.abonnement_actif is true
    join public.outils_club_ouverts o on o.club_id = ce.club_id and o.outil = p_outil
    join public.outils_comptes club_oc on club_oc.compte_id = ce.club_id and club_oc.outil = p_outil
      and (club_oc.fin_le is null or club_oc.fin_le > now())
    where ce.educateur_id = p_compte and ce.statut = 'accepte'
  ) or (
    public.outil_offert_par_club(p_outil) and exists (
      select 1
      from public.club_educateurs ce
      where ce.educateur_id = p_compte and ce.statut = 'accepte'
        and (
          exists (select 1 from public.outils_club_ouverts o where o.club_id = ce.club_id and o.outil = p_outil)
          or exists (
            select 1 from public.outils_educateur_fournis e
            where e.club_id = ce.club_id and e.educateur_id = p_compte and e.outil = p_outil
          )
        )
        and public.club_offre_outils(ce.club_id)
        and public.educateur_a_place(ce.club_id, p_compte)
    )
  )
$$;

-- ── 3. Prévenir l'éducateur qui perd ses outils (bloc 6) ────────────────────

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
    from (
      -- Rang de chaque éducateur accepté (même calcul que educateur_a_place).
      select a.educateur_id, row_number() over (order by a.depuis, a.educateur_id) as rang
      from (
        select ce.educateur_id, min(ce.created_at) as depuis
        from public.club_educateurs ce
        where ce.club_id = new.id and ce.statut = 'accepte' and ce.educateur_id is not null
        group by ce.educateur_id
      ) a
    ) r
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

drop trigger if exists trigger_prevenir_fin_outils_club on public.profiles;
create trigger trigger_prevenir_fin_outils_club
  after update of plan, modele_outils, abonnement_actif, palier, quota_equipes on public.profiles
  for each row
  when (old.plan = 'club' and old.modele_outils is true)
  execute function public.prevenir_fin_outils_club();

commit;
