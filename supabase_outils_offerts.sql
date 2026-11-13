-- Chantier outils offerts par le club, bloc 1 (PLAN-outils-offerts.md) : la
-- règle en base. Un club du nouveau modèle avec un forfait actif fournit
-- librement les outils éducateur à ses éducateurs affiliés, dans la limite de
-- places de son forfait (profiles.quota_equipes).
--
-- Contenu :
--   1. outil_offert_par_club(outil) : les 7 outils éducateur que le club peut
--      fournir sans les détenir (même liste que src/lib/catalogueOutils.js,
--      outils éducateur sans `viaClub`).
--   2. club_offre_outils(club) : club au nouveau modèle, abonnement actif,
--      forfait choisi.
--   3. educateur_a_place(club, educateur) : l'éducateur fait partie des N
--      premiers affiliés acceptés (N = quota_equipes).
--   4. outils_actifs et a_outil : une troisième source « club » pour ces
--      7 outils. Les deux règles existantes (outils du compte, outils
--      `viaClub` détenus par le club) ne changent pas.
--   5. Règle d'ouverture de outils_club_ouverts : ces 7 outils seulement si
--      club_offre_outils.
--
-- Règles retenues :
--   - Rang d'un éducateur = date de sa première ligne d'affiliation acceptée
--     dans ce club (club_educateurs.created_at, date de la demande et non de
--     l'acceptation), puis son identifiant pour départager.
--   - Forfait sans quota_equipes renseigné = aucune place (prudence).
--   - Stages, Projet sportif et Projet Club CFF4 gardent la règle actuelle :
--     le club doit détenir l'outil, sans limite de places.
--   - Clubs de l'ancien modèle : club_offre_outils est faux, rien ne change.
--   - outil_ferme (verrou) n'est pas modifié : il appelle a_outil et suit seul.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_outils_offerts_verification.sql.

begin;

-- ── 1. Outils que le club peut fournir sans les détenir ─────────────────────

create or replace function public.outil_offert_par_club(p_outil text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_outil in ('suivi_joueurs', 'stats_collectives', 'seances', 'tactique',
                     'bibliotheque', 'prep_physique', 'evaluations_video')
$$;

-- ── 2. Le club peut-il fournir des outils ? ─────────────────────────────────

create or replace function public.club_offre_outils(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select (c.plan = 'club' and c.modele_outils is true and c.abonnement_actif is true
      and c.palier is not null) is true
    from public.profiles c
    where c.id = p_club
  ), false)
$$;

-- ── 3. L'éducateur a-t-il une place dans ce club ? ──────────────────────────

create or replace function public.educateur_a_place(p_club uuid, p_educateur uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with affilies as (
    select ce.educateur_id, min(ce.created_at) as depuis
    from public.club_educateurs ce
    where ce.club_id = p_club and ce.statut = 'accepte' and ce.educateur_id is not null
    group by ce.educateur_id
  ), rangs as (
    select a.educateur_id, row_number() over (order by a.depuis, a.educateur_id) as rang
    from affilies a
  )
  select exists (
    select 1
    from rangs r
    join public.profiles c on c.id = p_club
    where r.educateur_id = p_educateur and r.rang <= coalesce(c.quota_equipes, 0)
  )
$$;

-- ── 4. Outils actifs et accès à un outil ────────────────────────────────────

-- Outils actifs d'un compte : les siens (achat, essai, offre non expirés),
-- ceux reçus de son club parce que le club les détient (`viaClub`), et ceux
-- que son club lui fournit (nouveau modèle, place dans le forfait), ces deux
-- derniers avec la source 'club'. Un outil à la fois payé par l'éducateur et
-- reçu du club apparaît deux fois : c'est voulu, l'appli peut prévenir
-- l'éducateur qu'il peut retirer le sien.
-- Réponse vide si l'utilisateur connecté n'est ni ce compte ni son staff.
-- Les fonctions serveur (clé service, sans utilisateur) lisent tout.
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
  select o.outil, 'club', null::timestamptz
  from public.club_educateurs ce
  join public.outils_club_ouverts o on o.club_id = ce.club_id
  where ce.educateur_id = p_compte and ce.statut = 'accepte'
    and public.outil_offert_par_club(o.outil)
    and public.club_offre_outils(ce.club_id)
    and public.educateur_a_place(ce.club_id, p_compte)
    and (auth.uid() is null or auth.uid() = p_compte)
  group by o.outil
$$;

-- Le compte a-t-il cet outil en ce moment ? Sert au verrou (outil_ferme) et
-- aux fonctions serveur. Ne dépend pas de l'utilisateur connecté : le verrou
-- doit pouvoir demander « le club de cette ligne a-t-il l'outil ».
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
      join public.outils_club_ouverts o on o.club_id = ce.club_id and o.outil = p_outil
      where ce.educateur_id = p_compte and ce.statut = 'accepte'
        and public.club_offre_outils(ce.club_id)
        and public.educateur_a_place(ce.club_id, p_compte)
    )
  )
$$;

revoke all on function public.outil_offert_par_club(text) from public, anon;
revoke all on function public.club_offre_outils(uuid) from public, anon;
revoke all on function public.educateur_a_place(uuid, uuid) from public, anon;
grant execute on function public.outil_offert_par_club(text) to authenticated, service_role;
grant execute on function public.club_offre_outils(uuid) to authenticated, service_role;
grant execute on function public.educateur_a_place(uuid, uuid) to authenticated, service_role;

-- ── 5. Ouverture d'un outil par le club ─────────────────────────────────────

-- Seul le compte club ouvre ses outils ; les 7 outils éducateur seulement s'il
-- peut les fournir. (L'appli passe par api/outils.js, clé service, qui fait
-- ses propres contrôles ; cette règle protège l'écriture directe.)
drop policy if exists "outils_club_ouverts_ouvrir" on public.outils_club_ouverts;
create policy "outils_club_ouverts_ouvrir" on public.outils_club_ouverts
  for insert to authenticated
  with check (
    club_id = auth.uid()
    and (not public.outil_offert_par_club(outil) or public.club_offre_outils(club_id))
  );

commit;
