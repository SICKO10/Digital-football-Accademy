-- Outils à la carte, bloc 5 : les outils d'un club sont inclus dans son forfait.
-- Ajoute l'origine « forfait » (sans date de fin) à outils_comptes.
-- Ne touche à aucune donnée : seules deux règles de contrôle sont remplacées,
-- et elles deviennent plus larges (tout ce qui était accepté l'est encore).
-- Sauvegarde conseillée avant : ~/Sauvegardes-DigitalFootball/sauvegarder.sh

begin;

-- Ancienne règle sur la colonne source (son nom automatique est cherché, pas supposé).
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.outils_comptes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
      and pg_get_constraintdef(oid) not ilike '%fin_le%'
  loop
    execute format('alter table public.outils_comptes drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.outils_comptes
  add constraint outils_comptes_source_check
  check (source in ('achat', 'essai', 'offre', 'forfait'));

-- Un essai ou une offre a toujours une date de fin ; un achat ou un forfait non.
alter table public.outils_comptes drop constraint if exists outils_comptes_fin_essai;
alter table public.outils_comptes
  add constraint outils_comptes_fin_essai
  check (source in ('achat', 'forfait') or fin_le is not null);

commit;
