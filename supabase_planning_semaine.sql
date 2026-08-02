-- Planning de la semaine : photo publiée par l'éducateur (profiles.id = auth.uid()),
-- stockée dans Supabase Storage, visible automatiquement chez les joueurs affiliés.

-- 1. Colonne sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS planning_semaine_url TEXT;

-- 2. Bucket de stockage public (si pas déjà créé manuellement dans le dashboard Supabase)
insert into storage.buckets (id, name, public)
values ('planning-semaine', 'planning-semaine', true)
on conflict (id) do nothing;

-- 3. Policies Storage : chaque éducateur ne peut écrire que dans son propre dossier
-- ({user_id}/planning.ext), lecture publique (bucket public).
-- CREATE POLICY ne supporte pas IF NOT EXISTS : DROP puis CREATE (idempotent).
drop policy if exists "planning_semaine_upload_own" on storage.objects;
create policy "planning_semaine_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'planning-semaine' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "planning_semaine_update_own" on storage.objects;
create policy "planning_semaine_update_own"
  on storage.objects for update
  using (bucket_id = 'planning-semaine' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "planning_semaine_lecture_publique" on storage.objects;
create policy "planning_semaine_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'planning-semaine');
