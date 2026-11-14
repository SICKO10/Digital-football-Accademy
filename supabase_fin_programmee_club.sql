-- Chantier « le club offre les outils », suite, bloc 5
-- (PLAN-outils-offerts-suite.md) : quand un club du nouveau modèle résilie, la
-- base garde la date de fin et prévient tout de suite chaque éducateur qui
-- reçoit des outils du club. Cloche seulement, aucun email.
--
-- Contenu :
--   1. Table club_fin_programmee : une ligne par club dont l'abonnement des
--      outils s'arrête à une date connue (résiliation programmée chez Stripe).
--      Écrite seulement par outils_synchroniser_abonnement (webhook). Le club,
--      son staff et ses éducateurs affiliés la lisent (écrans du bloc 6).
--   2. Table club_fin_avis : quel avis a été envoyé à quel éducateur, pour le
--      corriger ou le retirer sans jamais en créer un deuxième. Serveur seul.
--   3. educateurs_prevenus_fin_club(club) : qui perdra quelque chose à la fin
--      (mêmes règles que l'avis « après la fin »). club_nb_educateurs_prevenus :
--      leur nombre, pour la page Mon forfait du club (bloc 6).
--   4. Déclencheur sur club_fin_programmee :
--      - résiliation : avis `outils_club_fin_prochaine` avec la date de fin,
--        un seul par club et par éducateur ;
--      - nouvelle date : l'avis est réécrit (et redevient non lu), sans doublon ;
--      - reprise de l'abonnement : l'avis est retiré ; s'il avait été lu,
--        l'éducateur reçoit « Ton club continue son forfait »
--        (`outils_club_continue`) ;
--      - fin réelle : l'avis est retiré, l'avis « après la fin »
--        (`outils_club_fin`, inchangé) le remplace.
--   5. outils_synchroniser_abonnement : seule la branche club change (résiliation :
--      on garde p_fin ; reprise ou fin réelle : on efface). Branche éducateur,
--      signature et droits inchangés.
--   6. prevenir_fin_outils_club : recopiée de supabase_places_choisies.sql ;
--      en plus, l'avis préalable de chaque éducateur prévenu est retiré, et la
--      fin programmée est effacée quand le club n'offre plus rien.
--
-- Une erreur dans les avis ou dans la fin programmée est avalée (avertissement
-- dans les journaux) : un paiement ne peut jamais échouer à cause d'eux.
-- Clubs de l'ancien modèle : rien ne change (la fonction du webhook les refuse
-- déjà, et club_offre_outils les exclut).
--
-- Garde-fou : le script s'arrête sans rien changer si les deux fonctions
-- remplacées ne sont pas exactement celles des fichiers
-- supabase_outils_a_la_carte_bloc8.sql et supabase_places_choisies.sql, ou
-- s'il a déjà été lancé.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_fin_programmee_club_verification.sql.

begin;

-- ── 0. Garde-fou ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.club_fin_programmee') is not null then
    raise exception 'Déjà en place : rien à refaire. Lance seulement supabase_fin_programmee_club_verification.sql.';
  end if;
  if (select md5(regexp_replace(p.prosrc, '\s', '', 'g')) from pg_proc p
      where p.oid = to_regprocedure('public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)'))
     is distinct from 'ee992dd72478e3df40630180141fd296' then
    raise exception 'outils_synchroniser_abonnement n''est pas la version attendue : rien n''a été changé. Envoie ce message à Claude.';
  end if;
  if (select md5(regexp_replace(p.prosrc, '\s', '', 'g')) from pg_proc p
      where p.oid = to_regprocedure('public.prevenir_fin_outils_club()'))
     is distinct from 'be9ac2ad5d088cd2d49ed53cc543d7df' then
    raise exception 'prevenir_fin_outils_club n''est pas la version attendue : rien n''a été changé. Envoie ce message à Claude.';
  end if;
end $$;

-- ── 1. Fin programmée par club ──────────────────────────────────────────────

create table public.club_fin_programmee (
  club_id uuid primary key references public.profiles(id) on delete cascade,
  fin_le timestamptz not null,
  abonnement_id text not null,
  programme_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

alter table public.club_fin_programmee enable row level security;

revoke all on public.club_fin_programmee from anon, authenticated;
grant select on public.club_fin_programmee to authenticated;
grant all on public.club_fin_programmee to service_role;

create policy "club_fin_programmee_lecture" on public.club_fin_programmee
  for select to authenticated
  using (public.outils_gere_club(club_id) or public.outils_educateur_du_club(club_id));

-- ── 2. Avis envoyés ─────────────────────────────────────────────────────────

-- notification_id en texte : on le compare à notifications.id::text, quel que
-- soit le type de cette colonne.
create table public.club_fin_avis (
  club_id uuid not null references public.profiles(id) on delete cascade,
  educateur_id uuid not null references public.profiles(id) on delete cascade,
  notification_id text not null,
  fin_le timestamptz not null,
  primary key (club_id, educateur_id)
);

alter table public.club_fin_avis enable row level security;

revoke all on public.club_fin_avis from anon, authenticated;
grant all on public.club_fin_avis to service_role;

-- ── 3. Qui sera prévenu ─────────────────────────────────────────────────────

-- « 12 décembre 2026 », heure de Paris.
create or replace function public.date_fin_texte(p_date timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select extract(day from d)::int::text
    || case when extract(day from d) = 1 then 'er' else '' end || ' '
    || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
              'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from d)::int]
    || ' ' || extract(year from d)::int::text
  from (select p_date at time zone 'Europe/Paris' as d) x
$$;

revoke all on function public.date_fin_texte(timestamptz) from public, anon, authenticated;

-- Éducateurs qui perdront quelque chose quand l'abonnement du club s'arrêtera,
-- tant que le club offre ses outils. Mêmes règles que prevenir_fin_outils_club :
-- outil fourni à tous ou à lui seul et une place, ou outil reçu parce que le
-- club le détient (Stages, Projet sportif, CFF4).
create or replace function public.educateurs_prevenus_fin_club(p_club uuid)
returns table (educateur_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select r.educateur_id
  from public.rangs_places_club(p_club) r
  join public.profiles c on c.id = p_club
  join public.profiles e on e.id = r.educateur_id and e.modele_outils is true
  where public.club_offre_outils(p_club)
    and (
      exists (
        select 1 from public.outils_club_ouverts o
        join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
          and (oc.fin_le is null or oc.fin_le > now())
        where o.club_id = p_club and not public.outil_offert_par_club(o.outil)
      )
      or (r.rang <= coalesce(c.quota_equipes, 0) and (
        exists (
          select 1 from public.outils_club_ouverts o
          where o.club_id = p_club and public.outil_offert_par_club(o.outil)
        )
        or exists (
          select 1 from public.outils_educateur_fournis f
          where f.club_id = p_club and f.educateur_id = r.educateur_id
            and public.outil_offert_par_club(f.outil)
        )
      ))
    )
$$;

revoke all on function public.educateurs_prevenus_fin_club(uuid) from public, anon, authenticated;
grant execute on function public.educateurs_prevenus_fin_club(uuid) to service_role;

-- Nombre d'éducateurs prévenus si le club résilie. Réservé au club et à son
-- staff (null pour les autres).
create or replace function public.club_nb_educateurs_prevenus(p_club uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.outils_gere_club(p_club)
    then (select count(*)::int from public.educateurs_prevenus_fin_club(p_club))
  end
$$;

revoke all on function public.club_nb_educateurs_prevenus(uuid) from public, anon;
grant execute on function public.club_nb_educateurs_prevenus(uuid) to authenticated, service_role;

-- ── 4. Avis avant la fin ────────────────────────────────────────────────────

create or replace function public.avertir_fin_programmee_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club uuid := coalesce(new.club_id, old.club_id);
  v_date text;
  v_titre text;
  v_contenu text;
  v_edu uuid;
  v_id text;
begin
  begin
    if tg_op = 'DELETE' then
      -- Le club offre toujours ses outils : il a repris son abonnement. Celui
      -- qui avait lu l'avis apprend que rien ne change (s'il reçoit toujours
      -- quelque chose du club).
      if public.club_offre_outils(old.club_id) then
        insert into public.notifications (user_id, type, titre, contenu, lien, lu)
        select a.educateur_id, 'outils_club_continue', 'Ton club continue son forfait',
          'Ton club a repris son forfait : les outils qu''il te fournit restent ouverts. Rien ne change pour toi.',
          '/educateur', false
        from public.club_fin_avis a
        join public.notifications n on n.id::text = a.notification_id and n.user_id = a.educateur_id
        where a.club_id = old.club_id and n.lu is true
          and a.educateur_id in (select p.educateur_id from public.educateurs_prevenus_fin_club(old.club_id) p);
      end if;
      -- Reprise ou fin réelle : l'avis préalable disparaît (à la fin réelle,
      -- l'avis « après la fin » prend sa place).
      delete from public.notifications n
      using public.club_fin_avis a
      where a.club_id = old.club_id and n.id::text = a.notification_id and n.user_id = a.educateur_id;
      delete from public.club_fin_avis where club_id = old.club_id;
      return null;
    end if;

    v_date := public.date_fin_texte(new.fin_le);
    v_titre := format('Ton club arrête son forfait le %s', v_date);
    v_contenu := format('Ton club a résilié son forfait. Les outils qu''il te fournit restent ouverts '
      'jusqu''au %s, puis tu gardes le socle gratuit. Tes données sont conservées. '
      'Tu pourras reprendre les outils dont tu as besoin avec tes propres offres.', v_date);

    -- Nouvelle date : chaque avis déjà envoyé est réécrit et redevient non lu.
    -- Un avis effacé entre-temps est renvoyé plus bas avec la nouvelle date.
    delete from public.club_fin_avis a
    where a.club_id = new.club_id and public.date_fin_texte(a.fin_le) <> v_date
      and not exists (
        select 1 from public.notifications n
        where n.id::text = a.notification_id and n.user_id = a.educateur_id
      );
    update public.notifications n
    set titre = v_titre, contenu = v_contenu, lu = false, created_at = now()
    from public.club_fin_avis a
    where a.club_id = new.club_id and n.id::text = a.notification_id and n.user_id = a.educateur_id
      and public.date_fin_texte(a.fin_le) <> v_date;
    update public.club_fin_avis set fin_le = new.fin_le
    where club_id = new.club_id and fin_le is distinct from new.fin_le;

    -- Un avis pour chaque éducateur concerné qui n'en a pas encore.
    for v_edu in
      select p.educateur_id from public.educateurs_prevenus_fin_club(new.club_id) p
      where not exists (
        select 1 from public.club_fin_avis a
        where a.club_id = new.club_id and a.educateur_id = p.educateur_id
      )
    loop
      insert into public.notifications (user_id, type, titre, contenu, lien, lu)
      values (v_edu, 'outils_club_fin_prochaine', v_titre, v_contenu, '/educateur', false)
      returning id::text into v_id;
      insert into public.club_fin_avis (club_id, educateur_id, notification_id, fin_le)
      values (new.club_id, v_edu, v_id, new.fin_le);
    end loop;
  exception when others then
    raise warning 'avertir_fin_programmee_club (club %) : %', v_club, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.avertir_fin_programmee_club() from public, anon, authenticated;

create trigger trigger_avertir_fin_programmee_club
  after insert or update or delete on public.club_fin_programmee
  for each row
  execute function public.avertir_fin_programmee_club();

-- ── 5. Webhook Stripe : la branche club garde la date de fin ────────────────

-- Recopiée de supabase_outils_a_la_carte_bloc8.sql ; seule la branche club
-- change (blocs « Fin programmée »).
create or replace function public.outils_synchroniser_abonnement(
  p_evenement text,
  p_type text,
  p_compte uuid,
  p_abonnement text,
  p_lignes jsonb,
  p_taille integer,
  p_palier text,
  p_periodicite text,
  p_fin timestamptz,
  p_resiliation boolean,
  p_termine boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_modele boolean;
  v_note text;
  v_ligne jsonb;
  v_avant integer;
  v_baisse boolean;
  v_outils text[];
begin
  insert into public.outils_stripe_evenements (evenement_id, type, compte_id, abonnement_id)
  values (p_evenement, p_type, p_compte, p_abonnement)
  on conflict (evenement_id) do nothing
  returning evenement_id into v_note;
  if v_note is null then
    return 'deja_traite';
  end if;

  select plan, modele_outils into v_plan, v_modele
  from public.profiles where id = p_compte
  for update;
  if not found then
    raise exception 'outils: compte introuvable %', p_compte;
  end if;
  if v_modele is not true then
    raise exception 'outils: compte % hors du nouveau modèle', p_compte;
  end if;
  if p_abonnement is null or p_abonnement = '' then
    raise exception 'outils: abonnement manquant';
  end if;
  if p_fin is null then
    raise exception 'outils: date de fin manquante';
  end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception 'outils: lignes invalides';
  end if;

  if v_plan = 'educateur' then
    if p_palier is not null then
      raise exception 'outils: forfait réservé aux clubs';
    end if;

    if p_termine is true then
      update public.outils_comptes
      set fin_le = p_fin, maj_le = now()
      where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement
        and (fin_le is null or fin_le > p_fin);
      return 'ok';
    end if;

    if jsonb_array_length(p_lignes) = 0 then
      raise exception 'outils: rien à appliquer';
    end if;

    -- Palier payé jusqu'ici, déduit des outils de cet abonnement encore sans date de fin.
    select count(*) into v_avant
    from public.outils_comptes
    where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement and fin_le is null;
    v_baisse := p_resiliation is true
      or coalesce(p_taille, 0) < (case when v_avant = 0 then 0 when v_avant <= 3 then 3 when v_avant <= 6 then 6 else 9 end);

    select array_agg(l->>'outil') into v_outils from jsonb_array_elements(p_lignes) l;

    for v_ligne in select * from jsonb_array_elements(p_lignes) loop
      if coalesce(v_ligne->>'periodicite', '') not in ('mensuel', 'annuel') then
        raise exception 'outils: périodicité invalide';
      end if;
      insert into public.outils_comptes
        (compte_id, outil, source, fin_le, periodicite, stripe_subscription_id, stripe_item_id, maj_le)
      values
        (p_compte, v_ligne->>'outil', 'achat', case when p_resiliation is true then p_fin end,
         v_ligne->>'periodicite', p_abonnement, v_ligne->>'item', now())
      on conflict (compte_id, outil) do update set
        source = 'achat',
        fin_le = excluded.fin_le,
        periodicite = excluded.periodicite,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_item_id = excluded.stripe_item_id,
        maj_le = now();
    end loop;

    -- Outils retirés de cet abonnement : jusqu'à l'échéance si le prix baisse
    -- (ou si tout est résilié), sinon tout de suite.
    update public.outils_comptes
    set fin_le = case when v_baisse then p_fin else now() end, maj_le = now()
    where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement
      and fin_le is null and not (outil = any(v_outils));

    return 'ok';
  end if;

  if v_plan = 'club' then
    if jsonb_array_length(p_lignes) > 0 then
      raise exception 'outils: outils payés réservés aux éducateurs';
    end if;
    if p_termine is true then
      update public.profiles set abonnement_actif = false where id = p_compte;
      -- Fin programmée : effacée après la fin réelle (son déclencheur retire
      -- les avis préalables, l'avis « après la fin » vient d'être envoyé).
      begin
        delete from public.club_fin_programmee where club_id = p_compte;
      exception when others then
        raise warning 'outils_synchroniser_abonnement : fin programmée du club % non effacée : %', p_compte, sqlerrm;
      end;
      return 'ok';
    end if;
    if p_palier is null or p_palier not in ('c0', 'c100', 'c200', 'c300', 'c400', 'c500') then
      raise exception 'outils: palier inconnu %', p_palier;
    end if;
    if coalesce(p_periodicite, '') not in ('mensuel', 'annuel') then
      raise exception 'outils: périodicité invalide';
    end if;
    -- Le changement de palier recalcule le quota d'équipes (trigger_sync_quota_equipes).
    update public.profiles
    set abonnement_actif = true,
        abonnement_cycle = p_periodicite,
        palier = p_palier
    where id = p_compte;
    -- Fin programmée : gardée pendant une résiliation, effacée à la reprise.
    -- Une panne ici ne bloque jamais le paiement.
    begin
      if p_resiliation is true then
        insert into public.club_fin_programmee (club_id, fin_le, abonnement_id)
        values (p_compte, p_fin, p_abonnement)
        on conflict (club_id) do update set
          fin_le = excluded.fin_le,
          abonnement_id = excluded.abonnement_id,
          maj_le = now();
      else
        delete from public.club_fin_programmee where club_id = p_compte;
      end if;
    exception when others then
      raise warning 'outils_synchroniser_abonnement : fin programmée du club % non enregistrée : %', p_compte, sqlerrm;
    end;
    return 'ok';
  end if;

  raise exception 'outils: compte % (plan %) sans abonnement des outils', p_compte, v_plan;
end;
$$;

revoke all on function public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean) to service_role;

-- ── 6. Avis « après la fin » : il remplace l'avis préalable ────────────────

-- Recopiée de supabase_places_choisies.sql ; changements : l'avis préalable
-- de chaque éducateur prévenu est retiré, et la fin programmée est effacée
-- quand le club n'offre plus ses outils. Le déclencheur n'est pas touché.
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

    if (v_offrait and (v_offerts or v_individuels)) or v_perd_via then
      v_date := to_char(now() at time zone 'Europe/Paris', 'DD/MM');

      with prevenus as (
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
          )
        returning user_id
      ),
      -- L'avis « après la fin » remplace l'avis préalable de ce club.
      remplaces as (
        delete from public.club_fin_avis a
        using prevenus p
        where a.club_id = new.id and a.educateur_id = p.user_id
        returning a.educateur_id, a.notification_id
      )
      delete from public.notifications n
      using remplaces r
      where n.user_id = r.educateur_id and n.id::text = r.notification_id;
    end if;

    -- Le club n'offre plus ses outils : plus de fin programmée (son
    -- déclencheur retire les avis préalables restants).
    if v_offrait and not v_offre then
      delete from public.club_fin_programmee where club_id = new.id;
    end if;
  exception when others then
    raise warning 'prevenir_fin_outils_club (club %) : %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.prevenir_fin_outils_club() from public, anon, authenticated;

commit;
