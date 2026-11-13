-- ANNULATION du bloc 1 (outils offerts par le club). NE PAS EXÉCUTER sauf
-- décision explicite de revenir en arrière : remet outils_actifs, a_outil et la
-- règle d'ouverture de outils_club_ouverts tels qu'avant le bloc 1
-- (copie de supabase_outils_a_la_carte.sql), puis retire les trois fonctions
-- ajoutées. Aucune donnée n'est touchée. Les outils fournis par un club du
-- nouveau modèle s'éteignent aussitôt chez ses éducateurs.

begin;

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
  )
$$;

drop policy if exists "outils_club_ouverts_ouvrir" on public.outils_club_ouverts;
create policy "outils_club_ouverts_ouvrir" on public.outils_club_ouverts
  for insert to authenticated
  with check (club_id = auth.uid());

drop function if exists public.educateur_a_place(uuid, uuid);
drop function if exists public.club_offre_outils(uuid);
drop function if exists public.outil_offert_par_club(text);

commit;
