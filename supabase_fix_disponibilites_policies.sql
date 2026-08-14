-- Recrée de façon idempotente les policies RLS + contraintes uniques de
-- disponibilites, au cas où cette table (comme role_permissions et d'autres
-- avant elle dans ce projet) préexistait à supabase_disponibilites.sql — un
-- "create table if not exists" ne l'aurait alors jamais réellement créée
-- avec sa configuration, laissant potentiellement RLS activée sans policy
-- d'écriture fonctionnelle pour le joueur (upsert qui échoue silencieusement
-- côté front, cf. fix sur SondageSemaine.jsx qui affiche enfin l'erreur).
alter table disponibilites enable row level security;

drop policy if exists "joueur_own_dispos" on disponibilites;
drop policy if exists "educateur_read_dispos" on disponibilites;

create policy "joueur_own_dispos" on disponibilites
  for all using (auth.uid() = joueur_id) with check (auth.uid() = joueur_id);

create policy "educateur_read_dispos" on disponibilites
  for select using (
    exists (
      select 1 from equipe_joueurs ej
      where ej.joueur_id = disponibilites.joueur_id
      and ej.educateur_id = auth.uid()
    )
  );

grant select, insert, update, delete on disponibilites to authenticated;

-- Contraintes uniques nécessaires à .upsert(..., { onConflict: 'joueur_id,seance_id' })
-- et 'joueur_id,match_id' (cf. SondageSemaine.jsx) — mêmes ajoutées de façon
-- idempotente, sans jamais dupliquer si déjà présentes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'disponibilites'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(joueur_id, seance_id)%'
  ) then
    alter table disponibilites add constraint disponibilites_joueur_seance_key unique (joueur_id, seance_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'disponibilites'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(joueur_id, match_id)%'
  ) then
    alter table disponibilites add constraint disponibilites_joueur_match_key unique (joueur_id, match_id);
  end if;
end $$;
