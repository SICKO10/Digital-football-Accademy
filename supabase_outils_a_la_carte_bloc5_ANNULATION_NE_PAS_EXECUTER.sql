-- ANNULATION du bloc 5. NE PAS EXÉCUTER sans en avoir parlé.
-- 1. Remet à zéro les essais de test de l'éducateur de test (pour retester).
-- 2. Retire les lignes « forfait » puis remet les anciennes règles de contrôle.
begin;

delete from public.outils_comptes oc
using auth.users u
where u.id = oc.compte_id and lower(u.email) = 'testfinal@gmail.com' and oc.source = 'essai';

delete from public.outils_essais_utilises e
using auth.users u
where u.id = e.compte_id and lower(u.email) = 'testfinal@gmail.com';

delete from public.outils_comptes where source = 'forfait';

alter table public.outils_comptes drop constraint if exists outils_comptes_source_check;
alter table public.outils_comptes
  add constraint outils_comptes_source_check check (source in ('achat', 'essai', 'offre'));
alter table public.outils_comptes drop constraint if exists outils_comptes_fin_essai;
alter table public.outils_comptes
  add constraint outils_comptes_fin_essai check (source = 'achat' or fin_le is not null);

commit;
