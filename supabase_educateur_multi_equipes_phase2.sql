-- Suite de supabase_educateur_multi_equipes.sql : étend la séparation par
-- équipe (switcher DashboardEducateur.jsx) à la clôture de saison, les
-- rapports d'analyse vidéo, les déplacements, les causeries et la
-- préparation physique — demandé après coup, une fois le switcher en place,
-- pour ne plus mélanger les données des différentes équipes d'un même coach.
-- (Terrains n'a pas besoin de colonne : décision produit de garder la vue
-- club complète, cf. RPC reclamer_creneau_date corrigée côté code/SQL RPC.)
--
-- rapports_analyse, causeries, tactipads, programmes_prep, deplacements
-- n'ont aucun fichier de création tracé dans ce repo (créées directement en
-- base) — on ne peut donc qu'ajouter les colonnes, pas les recréer.

alter table rapports_analyse add column if not exists club_categorie_id uuid references club_categories(id);
alter table causeries        add column if not exists club_categorie_id uuid references club_categories(id);
alter table programmes_prep  add column if not exists club_categorie_id uuid references club_categories(id);
alter table tests_physiques  add column if not exists club_categorie_id uuid references club_categories(id);
alter table deplacements     add column if not exists club_categorie_id uuid references club_categories(id);

-- Backfill : comme pour la phase 1, aucun coach n'a jamais pu avoir plus
-- d'une ligne club_categories avant ce switcher, donc le rattachement par
-- educateur_id est non ambigu pour toutes les lignes existantes.
update rapports_analyse r set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = r.educateur_id and r.club_categorie_id is null;

update causeries c set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = c.educateur_id and c.club_categorie_id is null;

update programmes_prep p set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = p.educateur_id and p.club_categorie_id is null;

update tests_physiques t set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = t.educateur_id and t.club_categorie_id is null;

update deplacements d set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = d.educateur_id and d.club_categorie_id is null;

create index if not exists idx_rapports_analyse_club_categorie_id on rapports_analyse(club_categorie_id);
create index if not exists idx_causeries_club_categorie_id on causeries(club_categorie_id);
create index if not exists idx_programmes_prep_club_categorie_id on programmes_prep(club_categorie_id);
create index if not exists idx_tests_physiques_club_categorie_id on tests_physiques(club_categorie_id);
create index if not exists idx_deplacements_club_categorie_id on deplacements(club_categorie_id);

-- reclamer_creneau_date : reprise EXACTE de la version actuellement live
-- (supabase_planning_terrains_dirigeant_liberer_prendre.sql, la dernière
-- appliquée — v_autorise dirigeant/staff/éducateur affilié inchangé), avec
-- un seul ajout : un paramètre optionnel p_club_categorie_id pour ne plus
-- deviner l'équipe du coach via `limit 1` sur club_categories (ambigu s'il
-- en gère plusieurs) — le front (equipeActiveId) le fournit désormais.
-- Défaut null : comportement inchangé (limit 1) si non fourni.
create or replace function reclamer_creneau_date(p_creneau_id uuid, p_date date, p_club_categorie_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_type text;
  v_equipe text;
  v_autorise boolean;
begin
  select club_id into v_club_id from planning_terrains where id = p_creneau_id;
  if v_club_id is null then
    raise exception 'Créneau introuvable';
  end if;

  select type into v_type from planning_terrains_exceptions
  where creneau_id = p_creneau_id and date_exception = p_date;
  if v_type is null or v_type != 'liberation' then
    raise exception 'Ce créneau n''est plus disponible';
  end if;

  select
    exists (select 1 from club_educateurs ce where ce.club_id = v_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
    or v_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = v_club_id and sc.user_id = auth.uid()
        and (sc.role = 'president' or exists (
          select 1 from role_permissions rp
          where rp.club_id = v_club_id and rp.role = sc.role and rp.section = 'terrains' and rp.can_edit = true
        ))
    )
  into v_autorise;

  if not v_autorise then
    raise exception 'Tu n''es pas affilié à ce club';
  end if;

  select trim(coalesce(cc.nom, '') || ' ' || coalesce(cc.equipe, '')) into v_equipe
  from club_categories cc
  where cc.club_id = v_club_id and cc.educateur_id = auth.uid()
    and (p_club_categorie_id is null or cc.id = p_club_categorie_id)
  limit 1;
  -- Le dirigeant n'a pas de ligne club_categories (il n'est pas éducateur) :
  -- utilise son propre nom de profil plutôt que le "Équipe" par défaut.
  if v_equipe is null or v_equipe = '' then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_equipe from profiles where id = auth.uid();
  end if;

  update planning_terrains_exceptions
  set type = 'remplacement', educateur_id = auth.uid(), equipe_remplacante = coalesce(nullif(v_equipe, ''), 'Équipe')
  where creneau_id = p_creneau_id and date_exception = p_date;
end;
$$;
